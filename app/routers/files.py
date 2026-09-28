from __future__ import annotations

import asyncio
import json
import secrets
from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, Query, Request, UploadFile
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials
from PIL import Image, UnidentifiedImageError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import session_dependency
from ..limits import rate_limit
from ..photo_check import check_photo
from ..privacy_blur import blur_sensitive
from ..realtime import hub
from ..security import Principal, bearer, decode_token
from ..uploads import IMAGE_TYPES, safe_original_name, sanitize_image, validate_pdf
from ..utils import audit, error, row_dict

router = APIRouter()
settings = get_settings()
ALLOWED_KINDS = {"citizen_photo", "before_photo", "after_photo", "attachment"}
CITIZEN_UPLOAD_STATUSES = {"submitted", "under_review", "accepted"}
SCREENED_UPLOAD_MAX_MB = 64


def optional_principal(
    credentials: HTTPAuthorizationCredentials | None,
) -> Principal | None:
    return decode_token(credentials.credentials) if credentials else None


def parse_uuid(value: str, entity: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as exc:
        raise error(404, "not_found", f"{entity} was not found") from exc


def staff_can_access(row, principal: Principal) -> bool:
    if row.screened_out or not row.intake_ready:
        return False
    if principal.role == "department_authority":
        return str(row.department_id or "") == str(principal.department_id or "")
    if principal.role == "operative_staff":
        return str(row.assigned_to or "") == principal.subject
    return True


def inspect_image(file: UploadFile, content_type: str) -> tuple[int, int, int]:
    """Read original dimensions without loading the pixels or storing oversized bytes."""
    expected = IMAGE_TYPES.get(content_type)
    if expected is None:
        raise ValueError("Only JPEG, PNG, and WebP images are accepted")
    source_file = file.file
    source_file.seek(0, 2)
    size = source_file.tell()
    source_file.seek(0)
    if size <= 0 or size > SCREENED_UPLOAD_MAX_MB * 1024 * 1024:
        raise ValueError(f"Image must be between 1 byte and {SCREENED_UPLOAD_MAX_MB} MB")
    try:
        with Image.open(source_file) as image:
            if (image.format or "").upper() != expected[0]:
                raise ValueError("File content does not match its declared type")
            width, height = image.size
            if max(width, height) >= 3840 and min(width, height) >= 2160:
                image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("The uploaded file is not a valid image") from exc
    finally:
        source_file.seek(0)
    return size, width, height


@router.post("/v1/reports/{report_id}/files", status_code=201)
async def upload_file(
    report_id: str,
    request: Request,
    file: UploadFile = File(...),
    kind: str = Query(default="citizen_photo"),
    tracking_code: str = Header(default="", alias="X-Tracking-Code"),
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)] = None,
    session: AsyncSession = Depends(session_dependency),
):
    await rate_limit(request, "upload", 20, 600)
    report_uuid = parse_uuid(report_id, "Report")
    if kind not in ALLOWED_KINDS:
        raise error(400, "invalid_kind", "Unsupported file kind")
    principal = optional_principal(credentials)
    content_type = (file.content_type or "application/octet-stream").lower()
    screened_photo = False
    photo_check = None
    try:
        if kind == "citizen_photo" and content_type != "application/pdf":
            original_size, width, height = await asyncio.to_thread(inspect_image, file, content_type)
            screened_photo = max(width, height) >= 3840 and min(width, height) >= 2160
        if screened_photo:
            # Metadata-only receipt: no large image bytes enter PostgreSQL.
            sample = await file.read(min(original_size, 1024 * 1024))
            photo_check = check_photo(sample, content_type)
            photo_check.update(width=width, height=height, resolution_4k=True,
                               verdict="ai_label")
            photo_check["signals"] = sorted(set(photo_check.get("signals", [])) | {
                "Rezolucion 4K ose më i lartë (rregull filtrimi, jo provë e AI)"})
            data, extension, digest = None, IMAGE_TYPES[content_type][1], None
            stored_size = original_size
        else:
            raw = await file.read(settings.MAX_UPLOAD_MB * 1024 * 1024 + 1)
            if not raw or len(raw) > settings.MAX_UPLOAD_MB * 1024 * 1024:
                raise error(400, "invalid_file_size",
                            f"File must be between 1 byte and {settings.MAX_UPLOAD_MB} MB")
        if not screened_photo and content_type == "application/pdf":
            if principal is None or kind != "attachment":
                raise error(
                    400,
                    "invalid_file_type",
                    "Citizen uploads must be JPEG, PNG, or WebP images",
                )
            data, content_type, extension, digest = validate_pdf(raw)
        elif not screened_photo:
            # SINJAL AI: kontroll lokal per foto AI, PARA se sanitize_image te fshije metadatat
            photo_check = check_photo(raw, content_type)
            data, content_type, extension, digest = sanitize_image(
                raw, content_type, settings.UPLOAD_MAX_PIXELS
            )
            # SINJAL AI #7: blur lokal i fytyrave/targave para ruajtjes (foto s'del nga serveri)
            data, digest, _ = await asyncio.to_thread(blur_sensitive, data, content_type)
    except ValueError as exc:
        raise error(400, "invalid_file", str(exc)) from exc
    if not screened_photo and len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise error(
            400, "invalid_file_size", "The processed file exceeds the upload limit"
        )
    if not screened_photo:
        stored_size = len(data)

    try:
        report = (
            await session.execute(
                text(
                    "SELECT tracking_code,status,department_id,assigned_to,screened_out,"
                    "intake_announced_at,"
                    "intake_ready_at<=now() AS intake_ready FROM reports WHERE id=:id FOR UPDATE"
                ),
                {"id": report_uuid},
            )
        ).first()
        if report is None:
            raise error(404, "not_found", "Report was not found")
        if principal is None:
            if (
                not tracking_code
                or tracking_code.upper().strip() != report.tracking_code
            ):
                raise error(403, "forbidden", "A valid tracking code is required")
            if kind != "citizen_photo":
                raise error(403, "forbidden", "Citizen uploads must be citizen photos")
            if report.status not in CITIZEN_UPLOAD_STATUSES:
                raise error(
                    409,
                    "uploads_closed",
                    "Citizen uploads are closed after field work begins",
                )
            count = await session.scalar(
                text(
                    "SELECT count(*) FROM report_files WHERE report_id=:id AND kind='citizen_photo'"
                ),
                {"id": report_uuid},
            )
            if count >= 10:
                raise error(
                    409, "photo_limit", "A report can have at most 10 citizen photos"
                )
        elif not staff_can_access(report, principal):
            raise error(403, "forbidden", "You cannot upload a file to this report")

        stored_name = secrets.token_hex(24) + extension
        row = (
            await session.execute(
                text("""INSERT INTO report_files(report_id,kind,original_name,stored_name,content_type,size_bytes,sha256,uploaded_by,content,ai_photo_check)
            VALUES(:report,:kind,:name,:stored,:content_type,:size,:sha256,NULLIF(:user,'')::uuid,:content,CAST(:photo_check AS jsonb))
            RETURNING id,kind,original_name,content_type,size_bytes,sha256,created_at"""),
                {
                    "report": report_uuid,
                    "kind": kind,
                    "name": safe_original_name(file.filename),
                    "stored": stored_name,
                    "content_type": content_type,
                    "size": stored_size,
                    "sha256": digest,
                    "user": principal.subject if principal else "",
                    "content": data,
                    "photo_check": json.dumps(photo_check, ensure_ascii=False) if photo_check else None,
                },
            )
        ).first()
        if kind == "citizen_photo" and photo_check:
            if photo_check.get("resolution_4k"):
                # Keep the public receipt and tracking status as submitted. Remove any
                # operational assignment if a late upload reached an older report.
                await session.execute(
                    text("""UPDATE reports SET screened_out=TRUE,status='submitted',
                    department_id=NULL,assigned_to=NULL,public_visible=FALSE,
                    resolution_note=NULL,ai_analysis=COALESCE(ai_analysis,'{}'::jsonb)
                        || '{"photo_ai_flag": true, "screening": "4k_resolution"}'::jsonb,
                    updated_at=now() WHERE id=:id"""),
                    {"id": report_uuid},
                )
                if not report.screened_out:
                    await audit(session, None, "report.screened_by_4k", "report", report_id,
                                metadata={"file_id": str(row.id),
                                          "width": photo_check["width"],
                                          "height": photo_check["height"]})
            elif not report.screened_out:
                # Photos are uploaded sequentially; wait for the last one to arrive.
                await session.execute(
                    text("""UPDATE reports SET intake_ready_at=GREATEST(intake_ready_at,
                    now()+interval '1 minute') WHERE id=:id AND intake_announced_at IS NULL"""),
                    {"id": report_uuid},
                )
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    result = row_dict(row)
    result["url"] = None if screened_photo else f"/v1/files/{row.id}"
    if kind == "citizen_photo" and photo_check and photo_check.get("resolution_4k") \
            and report.intake_announced_at is not None and not report.screened_out:
        # A late upload can remove a report that was already displayed.
        await hub.publish({"type": "report.updated", "report_id": report_id,
                           "status": "submitted"})
    return result


@router.get("/v1/files/{file_id}")
async def download_file(
    file_id: str,
    tracking_code: str = Header(default="", alias="X-Tracking-Code"),
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)] = None,
    session: AsyncSession = Depends(session_dependency),
):
    file_uuid = parse_uuid(file_id, "File")
    row = (
        await session.execute(
            text("""SELECT f.id,f.report_id,f.kind,f.original_name,f.content_type,
        r.tracking_code,r.public_visible,r.status,r.department_id,r.assigned_to,
        r.screened_out,r.intake_ready_at<=now() AS intake_ready
        FROM report_files f JOIN reports r ON r.id=f.report_id WHERE f.id=:id"""),
            {"id": file_uuid},
        )
    ).first()
    if row is None:
        raise error(404, "not_found", "File was not found")
    principal = optional_principal(credentials)
    public_file = (
        row.kind in {"before_photo", "after_photo"}
        and row.public_visible
        and row.status in {"resolved", "published"}
    )
    # A tracking code appears on the public map after publication, so it must
    # stop acting as evidence-file authorization once the report is public.
    owner_file = (
        row.kind == "citizen_photo"
        and not row.public_visible
        and tracking_code
        and tracking_code.upper().strip() == row.tracking_code
    )
    staff_file = principal is not None and staff_can_access(row, principal)
    if not (public_file or owner_file or staff_file):
        raise error(403, "forbidden", "You cannot access this file")
    data = await session.scalar(
        text("SELECT content FROM report_files WHERE id=:id"), {"id": file_uuid}
    )
    if data is None:
        raise error(404, "not_found", "File was not found")
    headers = {
        "Cache-Control": "public, max-age=3600" if public_file else "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if row.content_type == "application/pdf":
        headers["Content-Disposition"] = (
            f"attachment; filename*=utf-8''{quote(row.original_name, safe='')}"
        )
    return Response(
        content=bytes(data),
        media_type=row.content_type,
        headers=headers,
    )
