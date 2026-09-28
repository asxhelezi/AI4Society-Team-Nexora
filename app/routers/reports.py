from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import session_dependency
from ..integrations import analyze_with_ai
from ..intake import operational_report
from ..realtime import hub
from ..schemas import AssignRequest, ReviewRequest, StatusRequest
from ..security import Principal, current_principal, require_roles
from ..utils import REPORT_SELECT, audit, error, row_dict

router = APIRouter()


def access_filter(principal: Principal, alias: str = "r") -> tuple[str, dict]:
    visible = operational_report(alias)
    if principal.role == "department_authority":
        if not principal.department_id:
            raise error(
                403,
                "department_required",
                "Your account is not assigned to a department",
            )
        return f"{visible} AND {alias}.department_id=:access_department", {
            "access_department": principal.department_id
        }
    if principal.role == "operative_staff":
        return f"{visible} AND {alias}.assigned_to=:access_user", {"access_user": principal.subject}
    return visible, {}


async def get_accessible_report(
    session: AsyncSession, report_id: str, principal: Principal
) -> dict:
    condition, params = access_filter(principal)
    params["id"] = report_id
    row = (
        await session.execute(
            text(REPORT_SELECT + f" WHERE r.id=:id AND {condition}"), params
        )
    ).first()
    if row is None:
        raise error(404, "not_found", "Report was not found")
    return row_dict(row)


@router.get("/v1/reports")
async def list_reports(
    principal: Annotated[Principal, Depends(current_principal)],
    session: AsyncSession = Depends(session_dependency),
    status: str = "",
    priority: str = "",
    department_id: str = "",
    q: str = "",
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    access, params = access_filter(principal)
    conditions = [access]
    if status:
        conditions.append("r.status=:status")
        params["status"] = status
    if priority:
        conditions.append("r.priority=:priority")
        params["priority"] = priority
    if department_id and principal.role not in {
        "department_authority",
        "operative_staff",
    }:
        conditions.append("r.department_id=:department")
        params["department"] = department_id
    if q:
        conditions.append(
            "(r.tracking_code ILIKE :q OR r.title ILIKE :q OR r.address ILIKE :q)"
        )
        params["q"] = f"%{q.strip()}%"
    params.update(limit=limit, offset=offset)
    rows = (
        await session.execute(
            text(
                REPORT_SELECT
                + " WHERE "
                + " AND ".join(conditions)
                + " ORDER BY r.submitted_at DESC LIMIT :limit OFFSET :offset"
            ),
            params,
        )
    ).all()
    return {"items": [row_dict(row) for row in rows], "limit": limit, "offset": offset}


@router.get("/v1/reports/{report_id}")
async def get_report(
    report_id: str,
    principal: Annotated[Principal, Depends(current_principal)],
    session: AsyncSession = Depends(session_dependency),
):
    report = await get_accessible_report(session, report_id, principal)
    files = (
        await session.execute(
            text(
                "SELECT id,kind,original_name,content_type,size_bytes,created_at FROM report_files WHERE report_id=:id ORDER BY created_at"
            ),
            {"id": report_id},
        )
    ).all()
    history = (
        await session.execute(
            text(
                """SELECT h.old_status,h.new_status,h.note,h.changed_by,u.full_name AS changed_name,h.created_at
                   FROM report_status_history h LEFT JOIN users u ON u.id=h.changed_by
                   WHERE h.report_id=:id ORDER BY h.created_at"""
            ),
            {"id": report_id},
        )
    ).all()
    report["files"] = [{**row_dict(row), "url": f"/v1/files/{row.id}"} for row in files]
    report["status_history"] = [row_dict(row) for row in history]
    return report


@router.patch("/v1/reports/{report_id}/review")
async def review_report(
    report_id: str,
    payload: ReviewRequest,
    principal: Annotated[
        Principal, Depends(require_roles("clerk", "municipal_authority", "admin"))
    ],
    session: AsyncSession = Depends(session_dependency),
):
    if payload.decision == "accepted" and not payload.department_id:
        raise error(
            400,
            "department_required",
            "An accepted report must be routed to a department",
        )
    async with session.begin():
        old_status = await session.scalar(
            text("SELECT status FROM reports WHERE id=:id AND " + operational_report("") + " FOR UPDATE"),
            {"id": report_id},
        )
        if old_status is None:
            raise error(404, "not_found", "Report was not found")
        if old_status not in {"submitted", "under_review"}:
            raise error(
                409,
                "invalid_transition",
                "Only submitted or under-review reports can be reviewed",
            )
        await session.execute(
            text(
                """UPDATE reports SET status=:decision,priority=:priority,department_id=NULLIF(:department,'')::uuid,
                duplicate_of=NULLIF(:duplicate,'')::uuid,accepted_at=CASE WHEN :decision='accepted' THEN now() ELSE accepted_at END,
                first_action_at=COALESCE(first_action_at,now()),
                due_at=CASE WHEN :decision='accepted' THEN submitted_at + CASE :priority
                    WHEN 'urgent' THEN interval '24 hours' WHEN 'high' THEN interval '72 hours'
                    WHEN 'normal' THEN interval '120 hours' ELSE interval '168 hours' END ELSE due_at END,
                resolution_note=CASE WHEN :decision='rejected' THEN NULLIF(:note,'') ELSE resolution_note END,updated_at=now()
                WHERE id=:id"""
            ),
            {
                "id": report_id,
                "decision": payload.decision,
                "priority": payload.priority,
                "department": payload.department_id,
                "duplicate": payload.duplicate_of,
                "note": payload.note,
            },
        )
        await session.execute(
            text(
                "INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by) VALUES(:id,:old,:new,NULLIF(:note,''),:actor)"
            ),
            {
                "id": report_id,
                "old": old_status,
                "new": payload.decision,
                "note": payload.note,
                "actor": principal.subject,
            },
        )
        await audit(
            session,
            principal.subject,
            "report.review",
            "report",
            report_id,
            metadata={"decision": payload.decision},
        )
    await hub.publish(
        {"type": "report.updated", "report_id": report_id, "status": payload.decision}
    )
    return {"id": report_id, "status": payload.decision}


@router.patch("/v1/reports/{report_id}/assign")
async def assign_report(
    report_id: str,
    payload: AssignRequest,
    principal: Annotated[
        Principal,
        Depends(require_roles("municipal_authority", "department_authority", "admin")),
    ],
    session: AsyncSession = Depends(session_dependency),
):
    department_id = (
        principal.department_id
        if principal.role == "department_authority"
        else payload.department_id
    )
    if not department_id:
        raise error(400, "department_required", "Department is required")
    async with session.begin():
        if payload.assigned_to:
            valid = await session.scalar(
                text(
                    "SELECT EXISTS(SELECT 1 FROM users WHERE id=:user AND role='operative_staff' AND department_id=:department AND active=TRUE)"
                ),
                {"user": payload.assigned_to, "department": department_id},
            )
            if not valid:
                raise error(
                    400,
                    "invalid_assignee",
                    "Assignee must be active field staff in the selected department",
                )
        old_status = await session.scalar(
            text("SELECT status FROM reports WHERE id=:id AND " + operational_report("") + " FOR UPDATE"),
            {"id": report_id},
        )
        if old_status is None:
            raise error(404, "not_found", "Report was not found")
        if old_status not in {"accepted", "assigned", "blocked"}:
            raise error(
                409, "invalid_transition", "Report must be accepted before assignment"
            )
        new_status = "assigned" if payload.assigned_to else "accepted"
        await session.execute(
            text(
                """UPDATE reports SET department_id=:department,assigned_to=NULLIF(:assignee,'')::uuid,status=:status,
                assigned_at=CASE WHEN :assignee<>'' THEN COALESCE(assigned_at,now()) ELSE assigned_at END,updated_at=now() WHERE id=:id"""
            ),
            {
                "id": report_id,
                "department": department_id,
                "assignee": payload.assigned_to,
                "status": new_status,
            },
        )
        await session.execute(
            text(
                "INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by) VALUES(:id,:old,:new,NULLIF(:note,''),:actor)"
            ),
            {
                "id": report_id,
                "old": old_status,
                "new": new_status,
                "note": payload.note,
                "actor": principal.subject,
            },
        )
        if payload.assigned_to:
            await session.execute(
                text(
                    "INSERT INTO notifications(user_id,channel,title,body) VALUES(:user,'in_app','Detyrë e re',:body)"
                ),
                {
                    "user": payload.assigned_to,
                    "body": f"Ju është caktuar raporti {report_id}",
                },
            )
        await audit(
            session,
            principal.subject,
            "report.assign",
            "report",
            report_id,
            metadata={
                "department_id": department_id,
                "assigned_to": payload.assigned_to,
            },
        )
    await hub.publish(
        {"type": "report.assigned", "report_id": report_id, "status": new_status}
    )
    return {"id": report_id, "status": new_status}


@router.patch("/v1/reports/{report_id}/status")
async def change_status(
    report_id: str,
    payload: StatusRequest,
    principal: Annotated[
        Principal,
        Depends(
            require_roles(
                "operative_staff",
                "department_authority",
                "municipal_authority",
                "admin",
            )
        ),
    ],
    session: AsyncSession = Depends(session_dependency),
):
    allowed = {
        "assigned": {"in_progress", "blocked"},
        "in_progress": {"blocked", "resolved"},
        "blocked": {"in_progress", "resolved"},
    }
    if payload.status == "resolved" and not payload.note.strip():
        raise error(400, "resolution_required", "A resolution note is required")
    async with session.begin():
        row = (
            await session.execute(
                text(
                    "SELECT status,department_id,assigned_to FROM reports WHERE id=:id AND "
                    + operational_report("") + " FOR UPDATE"
                ),
                {"id": report_id},
            )
        ).first()
        if row is None:
            raise error(404, "not_found", "Report was not found")
        if (
            principal.role == "operative_staff"
            and str(row.assigned_to or "") != principal.subject
        ):
            raise error(403, "not_assigned", "This report is not assigned to you")
        if principal.role == "department_authority" and str(
            row.department_id or ""
        ) != str(principal.department_id or ""):
            raise error(
                403, "wrong_department", "This report belongs to another department"
            )
        if payload.status not in allowed.get(row.status, set()):
            raise error(
                409, "invalid_transition", "This status transition is not allowed"
            )
        await session.execute(
            text(
                """UPDATE reports SET status=:new,
                first_action_at=CASE WHEN :new IN ('in_progress','blocked','resolved') THEN COALESCE(first_action_at,now()) ELSE first_action_at END,
                started_at=CASE WHEN :new='in_progress' THEN COALESCE(started_at,now()) ELSE started_at END,
                resolved_at=CASE WHEN :new='resolved' THEN now() ELSE resolved_at END,
                resolution_note=CASE WHEN :new='resolved' THEN :note ELSE resolution_note END,updated_at=now() WHERE id=:id"""
            ),
            {"id": report_id, "new": payload.status, "note": payload.note},
        )
        await session.execute(
            text(
                "INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by) VALUES(:id,:old,:new,NULLIF(:note,''),:actor)"
            ),
            {
                "id": report_id,
                "old": row.status,
                "new": payload.status,
                "note": payload.note,
                "actor": principal.subject,
            },
        )
        await audit(
            session,
            principal.subject,
            "report.status",
            "report",
            report_id,
            metadata={"from": row.status, "to": payload.status},
        )
    await hub.publish(
        {
            "type": "report.status_changed",
            "report_id": report_id,
            "status": payload.status,
        }
    )
    return {"id": report_id, "status": payload.status}


@router.post("/v1/reports/{report_id}/publish")
async def publish_report(
    report_id: str,
    principal: Annotated[
        Principal, Depends(require_roles("clerk", "municipal_authority", "admin"))
    ],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        old_status = await session.scalar(
            text("SELECT status FROM reports WHERE id=:id AND " + operational_report("") + " FOR UPDATE"),
            {"id": report_id},
        )
        if old_status is None:
            raise error(404, "not_found", "Report was not found")
        if old_status not in {"resolved", "published"}:
            raise error(409, "not_resolved", "Only resolved reports can be published")
        await session.execute(
            text(
                "UPDATE reports SET status='published',public_visible=TRUE,published_at=COALESCE(published_at,now()),updated_at=now() WHERE id=:id"
            ),
            {"id": report_id},
        )
        if old_status != "published":
            await session.execute(
                text(
                    "INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by) VALUES(:id,:old,'published','Published on the public map',:actor)"
                ),
                {"id": report_id, "old": old_status, "actor": principal.subject},
            )
        await audit(session, principal.subject, "report.publish", "report", report_id)
    await hub.publish(
        {"type": "report.published", "report_id": report_id, "status": "published"}
    )
    return {"id": report_id, "status": "published", "public_visible": True}


@router.post("/v1/reports/{report_id}/ai-analysis")
async def analyze_report(
    report_id: str,
    principal: Annotated[
        Principal, Depends(require_roles("clerk", "municipal_authority", "admin"))
    ],
    session: AsyncSession = Depends(session_dependency),
):
    report = await get_accessible_report(session, report_id, principal)
    analysis = await analyze_with_ai(
        {
            key: report[key]
            for key in (
                "id",
                "title",
                "description",
                "category",
                "address",
                "latitude",
                "longitude",
            )
        }
    )
    if analysis is None:
        raise error(503, "ai_not_configured", "AI service is not configured")
    await session.execute(
        text(
            "UPDATE reports SET ai_analysis=CAST(:analysis AS jsonb),updated_at=now() WHERE id=:id"
        ),
        {"id": report_id, "analysis": json.dumps(analysis)},
    )
    await audit(session, principal.subject, "report.ai_analysis", "report", report_id)
    await session.commit()
    return analysis
