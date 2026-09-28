from __future__ import annotations

import hashlib
import json
import re
import secrets

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.responses import FileResponse
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..citizen_catalog import STATUS_LABELS, public_catalog, resolve_category
from ..config import get_settings
from ..db import session_dependency
from ..integrations import nominatim, verify_turnstile
from ..limits import rate_limit
from ..map_tiles import cached_map_tile
from ..schemas import ReportCreate, TrackBatchRequest
from ..security import client_ip
from ..utils import audit, error, row_dict

router = APIRouter()
settings = get_settings()
TRACKING_RE = re.compile(r"^SNJ-[0-9A-F]{12}$")


def _normalize_code(code: str) -> str:
    normalized = code.upper().strip()
    if not TRACKING_RE.fullmatch(normalized):
        raise error(404, "not_found", "Report was not found")
    return normalized


def _inside_service_area(latitude: float, longitude: float) -> bool:
    if not settings.SERVICE_AREA_BOUNDS:
        return True
    south, west, north, east = settings.SERVICE_AREA_BOUNDS
    return south <= latitude <= north and west <= longitude <= east


def _status_history(history: list) -> list[dict]:
    return [
        {
            "status": row.new_status,
            "label": STATUS_LABELS.get(row.new_status, row.new_status),
            "at": row.created_at.isoformat(),
        }
        for row in history
    ]


def _timeline(history: list) -> list[dict]:
    """Backward-compatible raw status-history helper used by existing backend tests/clients."""
    return _status_history(history)


def _citizen_timeline(history: list, submitted_at) -> dict[str, str]:
    """Return the date each citizen-facing stage was first reached."""
    stage_for_status = {
        "submitted": "derguar",
        "under_review": "verifikuar",
        "accepted": "verifikuar",
        "assigned": "ne_proces",
        "in_progress": "ne_proces",
        "blocked": "ne_proces",
        "resolved": "perfunduar",
        "published": "perfunduar",
        "rejected": "refuzuar",
    }
    timeline: dict[str, str] = {}
    if submitted_at is not None:
        timeline["derguar"] = submitted_at.isoformat()
    for row in history:
        stage = stage_for_status.get(row.new_status)
        if stage and stage not in timeline:
            timeline[stage] = row.created_at.isoformat()
    return timeline


async def _tracking_result(session: AsyncSession, code: str) -> dict | None:
    row = (
        await session.execute(
            text("""SELECT id,tracking_code,title,description,category,category_code,subcategory,address,status,
        resolution_note,submitted_at,updated_at,resolved_at,published_at,screened_out FROM reports WHERE tracking_code=:code"""),
            {"code": code},
        )
    ).first()
    if row is None:
        return None
    history = (
        await session.execute(
            text(
                "SELECT new_status,note,created_at FROM report_status_history WHERE report_id=:id ORDER BY created_at,id"
            ),
            {"id": row.id},
        )
    ).all()
    if row.screened_out:
        # A late-screened report may have passed through an earlier staff state.
        # Its citizen receipt and timeline remain at the submitted stage.
        history = [item for item in history if item.new_status == "submitted"][:1]
    result = row_dict(row)
    result.pop("screened_out", None)
    result["status_label"] = STATUS_LABELS.get(row.status, row.status)
    # React citizen tracking expects a stage->timestamp object. Keep the raw
    # status history as an additive field for diagnostics/other clients.
    result["timeline"] = _citizen_timeline(history, row.submitted_at)
    result["status_history"] = _status_history(history)
    result.pop("id", None)
    return result


@router.get("/v1/public/config")
async def public_config():
    return {
        "categories": public_catalog(),
        "statuses": STATUS_LABELS,
        "turnstile_site_key": settings.TURNSTILE_SITE_KEY,
        "max_upload_mb": settings.MAX_UPLOAD_MB,
        "max_photos": 10,
        "map_country_codes": settings.MAP_COUNTRY_CODES,
        "service_area_bounds": settings.SERVICE_AREA_BOUNDS,
    }


@router.get("/v1/public/zones")
async def public_zones(session: AsyncSession = Depends(session_dependency)):
    rows = (
        await session.execute(
            text("SELECT code,name FROM zones WHERE active=TRUE ORDER BY name")
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.post("/v1/reports", status_code=201)
async def create_report(
    payload: ReportCreate,
    request: Request,
    response: Response,
    idempotency_key: str = Header(default="", alias="Idempotency-Key"),
    session: AsyncSession = Depends(session_dependency),
):
    await rate_limit(request, "report", 5, 600)
    try:
        category_code, category_label, subcategory = resolve_category(
            payload.category, payload.category_code, payload.subcategory
        )
    except ValueError as exc:
        raise error(400, "invalid_category", str(exc)) from exc
    if not _inside_service_area(payload.latitude, payload.longitude):
        raise error(
            400,
            "outside_service_area",
            "The selected location is outside the supported service area",
        )
    reporter_email = ""
    if not payload.anonymous:
        if not payload.reporter_email:
            raise error(
                400,
                "email_required",
                "Reporter email is required for a non-anonymous report",
            )
        try:
            reporter_email = str(
                TypeAdapter(EmailStr).validate_python(payload.reporter_email)
            ).lower()
        except ValidationError as exc:
            raise error(400, "invalid_email", "Reporter email is invalid") from exc
    if idempotency_key and not 8 <= len(idempotency_key) <= 200:
        raise error(
            400,
            "invalid_idempotency_key",
            "Idempotency-Key must contain 8 to 200 characters",
        )
    canonical = payload.model_dump(exclude={"turnstile_token"}) | {
        "reporter_email": reporter_email,
        "category": category_label,
        "category_code": category_code,
        "subcategory": subcategory,
    }
    request_hash = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    key_hash = (
        hashlib.sha256(idempotency_key.encode()).hexdigest() if idempotency_key else ""
    )
    if not key_hash and not await verify_turnstile(
        payload.turnstile_token, client_ip(request)
    ):
        raise error(400, "captcha_failed", "CAPTCHA verification failed")
    code = "SNJ-" + secrets.token_hex(6).upper()
    report_id = None
    report_status = "submitted"
    replay = False
    async with session.begin():
        if key_hash:
            await session.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": key_hash}
            )
            existing = (
                await session.execute(
                    text(
                        """SELECT k.request_hash,k.report_id,r.tracking_code,r.status
                           FROM citizen_submission_keys k JOIN reports r ON r.id=k.report_id
                           WHERE k.key_hash=:key"""
                    ),
                    {"key": key_hash},
                )
            ).first()
            if existing:
                if existing.request_hash != request_hash:
                    raise error(
                        409,
                        "idempotency_conflict",
                        "This Idempotency-Key was used for a different request",
                    )
                replay = True
                report_id = existing.report_id
                code = existing.tracking_code
                report_status = existing.status
        if not replay:
            if key_hash and not await verify_turnstile(
                payload.turnstile_token, client_ip(request)
            ):
                raise error(400, "captcha_failed", "CAPTCHA verification failed")
            zone_id = None
            if payload.zone_code:
                zone_id = await session.scalar(
                    text("SELECT id FROM zones WHERE code=:code AND active=TRUE"),
                    {"code": payload.zone_code.lower()},
                )
                if zone_id is None:
                    raise error(
                        400, "invalid_zone", "The selected zone is not available"
                    )
            report_id = await session.scalar(
                text("""INSERT INTO reports(tracking_code,anonymous,reporter_email,title,description,category,
                category_code,subcategory,source,address,latitude,longitude,zone_id,due_at,intake_ready_at)
                VALUES(:code,:anonymous,NULLIF(:email,''),:title,:description,:category,:category_code,NULLIF(:subcategory,''),
                'citizen_web',:address,:latitude,:longitude,:zone_id,now()+interval '120 hours',now()+interval '2 minutes') RETURNING id"""),
                {
                    "code": code,
                    "anonymous": payload.anonymous,
                    "email": reporter_email,
                    "title": payload.title,
                    "description": payload.description,
                    "category": category_label,
                    "category_code": category_code,
                    "subcategory": subcategory,
                    "address": payload.address,
                    "latitude": payload.latitude,
                    "longitude": payload.longitude,
                    "zone_id": zone_id,
                },
            )
            await session.execute(
                text(
                    "INSERT INTO report_status_history(report_id,new_status,note) VALUES(:id,'submitted','Report submitted by citizen')"
                ),
                {"id": report_id},
            )
            if key_hash:
                await session.execute(
                    text(
                        "INSERT INTO citizen_submission_keys(key_hash,request_hash,report_id) VALUES(:key,:request,:report)"
                    ),
                    {"key": key_hash, "request": request_hash, "report": report_id},
                )
            await audit(
                session,
                None,
                "citizen.report_created",
                "report",
                str(report_id),
                client_ip(request),
                {"anonymous": payload.anonymous, "category_code": category_code},
            )
    if replay:
        response.headers["Idempotent-Replay"] = "true"
    # The worker announces new reports only after photos have had time to upload.
    return {
        "id": str(report_id),
        "tracking_code": code,
        "status": report_status,
        "status_label": STATUS_LABELS.get(report_status, report_status),
    }


@router.get("/v1/reports/track/{code}")
async def track_report(
    code: str, request: Request, session: AsyncSession = Depends(session_dependency)
):
    await rate_limit(request, "track", 30, 60)
    result = await _tracking_result(session, _normalize_code(code))
    if result is None:
        raise error(404, "not_found", "Report was not found")
    return result


@router.post("/v1/reports/track")
async def track_reports(
    payload: TrackBatchRequest,
    request: Request,
    session: AsyncSession = Depends(session_dependency),
):
    await rate_limit(request, "track-batch", 10, 60)
    items = []
    for raw_code in payload.codes:
        if not TRACKING_RE.fullmatch(raw_code):
            continue
        result = await _tracking_result(session, raw_code)
        if result:
            items.append(result)
    return {"items": items}


@router.get("/v1/public/reports")
async def public_reports(
    status: str = Query(default="published"),
    category_code: str = Query(default=""),
    limit: int = Query(default=100, ge=1, le=settings.PUBLIC_MAP_MAX_RESULTS),
    offset: int = Query(default=0, ge=0, le=10000),
    session: AsyncSession = Depends(session_dependency),
):
    if status not in {"published", "resolved"}:
        raise error(
            400,
            "invalid_status",
            "Only resolved or published public reports can be requested",
        )
    rows = (
        await session.execute(
            text("""SELECT id,tracking_code,title,category,category_code,subcategory,address,latitude,longitude,
        status,resolution_note,submitted_at,resolved_at,published_at,updated_at FROM reports
        WHERE public_visible=TRUE AND status=:status AND (:category='' OR category_code=:category)
        ORDER BY COALESCE(published_at,resolved_at,updated_at) DESC LIMIT :limit OFFSET :offset"""),
            {
                "status": status,
                "category": category_code,
                "limit": limit,
                "offset": offset,
            },
        )
    ).all()
    items = [row_dict(row) for row in rows]
    if rows:
        report_ids = [row.id for row in rows]
        file_rows = (
            await session.execute(
                text("""SELECT id,report_id,kind,created_at FROM report_files
                WHERE report_id = ANY(CAST(:report_ids AS uuid[])) AND kind IN ('before_photo','after_photo')
                ORDER BY created_at,id"""),
                {"report_ids": report_ids},
            )
        ).all()
        photos_by_report: dict[str, dict[str, str]] = {}
        for file_row in file_rows:
            key = str(file_row.report_id)
            photos = photos_by_report.setdefault(key, {})
            slot = "before" if file_row.kind == "before_photo" else "after"
            photos.setdefault(slot, f"/v1/files/{file_row.id}")
        for row, item in zip(rows, items):
            photos = photos_by_report.get(str(row.id))
            if photos:
                item["photos"] = photos
    return {"items": items, "limit": limit, "offset": offset}


@router.get("/v1/public/reports/{code}")
async def public_report(code: str, session: AsyncSession = Depends(session_dependency)):
    row = (
        await session.execute(
            text("""SELECT id,tracking_code,title,category,category_code,subcategory,address,latitude,longitude,
        status,resolution_note,submitted_at,resolved_at,published_at,updated_at FROM reports
        WHERE tracking_code=:code AND public_visible=TRUE AND status IN ('resolved','published')"""),
            {"code": _normalize_code(code)},
        )
    ).first()
    if row is None:
        raise error(404, "not_found", "Public report was not found")
    files = (
        await session.execute(
            text(
                "SELECT id,kind,content_type,created_at FROM report_files WHERE report_id=:id AND kind IN ('before_photo','after_photo') ORDER BY created_at"
            ),
            {"id": row.id},
        )
    ).all()
    result = row_dict(row)
    result["files"] = [
        {**row_dict(item), "url": f"/v1/files/{item.id}"} for item in files
    ]
    result.pop("id", None)
    return result


@router.get("/v1/public/stats")
async def public_stats(session: AsyncSession = Depends(session_dependency)):
    summary = (
        await session.execute(
            text("""SELECT count(*) FILTER (WHERE status='published' AND public_visible) AS published,
        count(*) FILTER (WHERE status IN ('resolved','published')) AS resolved,
        count(*) FILTER (WHERE screened_out=FALSE AND intake_ready_at<=now()
        AND submitted_at >= date_trunc('month',now())) AS submitted_this_month FROM reports""")
        )
    ).first()
    categories = (
        await session.execute(
            text(
                "SELECT category_code,count(*) AS count FROM reports WHERE public_visible=TRUE AND status='published' GROUP BY category_code ORDER BY count DESC"
            )
        )
    ).all()
    return {**row_dict(summary), "categories": [row_dict(row) for row in categories]}


@router.get("/v1/map/reverse")
async def reverse_geocode(
    request: Request,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
):
    await rate_limit(request, "map", 30, 60)
    if not _inside_service_area(lat, lon):
        raise error(
            400,
            "outside_service_area",
            "The selected location is outside the supported service area",
        )
    return await nominatim(
        "reverse",
        {"format": "jsonv2", "lat": lat, "lon": lon, "zoom": 18, "addressdetails": 1},
    )


@router.get("/v1/map/tiles/{zoom}/{x}/{y}.png")
async def map_tile(
    zoom: int,
    x: int,
    y: int,
    request: Request,
):
    await rate_limit(request, "map-tile", 600, 600)
    path = await cached_map_tile(zoom, x, y)
    return FileResponse(
        path,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=604800, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/v1/map/search")
async def search_locations(
    request: Request,
    q: str = Query(min_length=2, max_length=200),
    limit: int = Query(default=5, ge=1, le=10),
):
    await rate_limit(request, "map", 30, 60)
    params: dict = {
        "format": "jsonv2",
        "q": q,
        "limit": limit,
        "addressdetails": 1,
        "countrycodes": settings.MAP_COUNTRY_CODES,
    }
    if settings.SERVICE_AREA_BOUNDS:
        south, west, north, east = settings.SERVICE_AREA_BOUNDS
        params.update({"viewbox": f"{west},{north},{east},{south}", "bounded": 1})
    return await nominatim("search", params)
