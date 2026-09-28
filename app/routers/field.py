from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import session_dependency
from ..intake import operational_report
from ..realtime import hub
from ..schemas import (
    CommentRequest,
    CompleteRequest,
    HazardRequest,
    HazardUpdateRequest,
    LocationRequest,
    SyncRequest,
    UnableRequest,
)
from ..security import Principal, require_roles
from ..utils import REPORT_SELECT, audit, error, row_dict

router = APIRouter()
field_user = require_roles("operative_staff")


async def lock_task(session: AsyncSession, report_id: str, principal: Principal):
    row = (
        await session.execute(
            text(
                "SELECT id,status FROM reports WHERE id=:id AND assigned_to=:user AND "
                + operational_report("") + " FOR UPDATE"
            ),
            {"id": report_id, "user": principal.subject},
        )
    ).first()
    if row is None:
        raise error(404, "not_found", "Assigned task was not found")
    return row


@router.get("/v1/field/tasks")
async def field_tasks(
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
    status: str = "",
    limit: int = Query(default=100, ge=1, le=200),
):
    condition, params = (
        "r.assigned_to=:user AND " + operational_report(),
        {"user": principal.subject, "limit": limit},
    )
    if status:
        condition += " AND r.status=:status"
        params["status"] = status
    rows = (
        await session.execute(
            text(
                REPORT_SELECT
                + f" WHERE {condition} ORDER BY r.due_at NULLS LAST,r.submitted_at LIMIT :limit"
            ),
            params,
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.get("/v1/field/tasks/{report_id}")
async def field_task(
    report_id: str,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    row = (
        await session.execute(
            text(REPORT_SELECT + " WHERE r.id=:id AND r.assigned_to=:user AND " + operational_report()),
            {"id": report_id, "user": principal.subject},
        )
    ).first()
    if row is None:
        raise error(404, "not_found", "Assigned task was not found")
    item = row_dict(row)
    comments = (
        await session.execute(
            text(
                "SELECT c.id,c.body,c.created_at,c.author_id,u.full_name AS author_name FROM report_comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.report_id=:id ORDER BY c.created_at"
            ),
            {"id": report_id},
        )
    ).all()
    item["comments"] = [row_dict(value) for value in comments]
    return item


@router.post("/v1/field/tasks/{report_id}/start")
async def start_task(
    report_id: str,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        row = await lock_task(session, report_id, principal)
        if row.status not in {"assigned", "blocked", "in_progress"}:
            raise error(
                409,
                "invalid_transition",
                "Task cannot be started from its current status",
            )
        if row.status != "in_progress":
            await session.execute(
                text(
                    "UPDATE reports SET status='in_progress',started_at=COALESCE(started_at,now()),first_action_at=COALESCE(first_action_at,now()),updated_at=now() WHERE id=:id"
                ),
                {"id": report_id},
            )
            await session.execute(
                text(
                    "INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by) VALUES(:id,:old,'in_progress','Field work started',:user)"
                ),
                {"id": report_id, "old": row.status, "user": principal.subject},
            )
        await audit(session, principal.subject, "field.start", "report", report_id)
    await hub.publish(
        {"type": "field.task_started", "report_id": report_id, "status": "in_progress"}
    )
    return {"id": report_id, "status": "in_progress"}


@router.post("/v1/field/tasks/{report_id}/comments", status_code=201)
async def add_comment(
    report_id: str,
    payload: CommentRequest,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        await lock_task(session, report_id, principal)
        comment_id = await session.scalar(
            text(
                "INSERT INTO report_comments(report_id,author_id,body) VALUES(:report,:user,:body) RETURNING id"
            ),
            {
                "report": report_id,
                "user": principal.subject,
                "body": payload.body.strip(),
            },
        )
    await hub.publish({"type": "field.comment_added", "report_id": report_id})
    return {"id": str(comment_id), "report_id": report_id, "body": payload.body.strip()}


@router.post("/v1/field/tasks/{report_id}/location", status_code=201)
async def update_location(
    report_id: str,
    payload: LocationRequest,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        await lock_task(session, report_id, principal)
        location_id = await session.scalar(
            text(
                "INSERT INTO report_location_updates(report_id,user_id,latitude,longitude,accuracy_meters,recorded_at) VALUES(:report,:user,:lat,:lon,:accuracy,COALESCE(:recorded,now())) RETURNING id"
            ),
            {
                "report": report_id,
                "user": principal.subject,
                "lat": payload.latitude,
                "lon": payload.longitude,
                "accuracy": payload.accuracy_meters,
                "recorded": payload.recorded_at,
            },
        )
    return {"id": str(location_id), "report_id": report_id}


@router.post("/v1/field/tasks/{report_id}/complete")
async def complete_task(
    report_id: str,
    payload: CompleteRequest,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        row = await lock_task(session, report_id, principal)
        if row.status not in {"in_progress", "blocked"}:
            raise error(
                409, "invalid_transition", "Task must be in progress before completion"
            )
        await session.execute(
            text(
                "UPDATE reports SET status='resolved',resolution_note=:note,completion_tags=:tags,resolved_at=now(),updated_at=now() WHERE id=:id"
            ),
            {"id": report_id, "note": payload.note.strip(), "tags": payload.tags},
        )
        await session.execute(
            text(
                "INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by) VALUES(:id,:old,'resolved',:note,:user)"
            ),
            {
                "id": report_id,
                "old": row.status,
                "note": payload.note.strip(),
                "user": principal.subject,
            },
        )
        if payload.latitude is not None and payload.longitude is not None:
            await session.execute(
                text(
                    "INSERT INTO report_location_updates(report_id,user_id,latitude,longitude) VALUES(:id,:user,:lat,:lon)"
                ),
                {
                    "id": report_id,
                    "user": principal.subject,
                    "lat": payload.latitude,
                    "lon": payload.longitude,
                },
            )
        await audit(
            session,
            principal.subject,
            "field.complete",
            "report",
            report_id,
            metadata={"tags": payload.tags},
        )
    await hub.publish(
        {"type": "field.task_completed", "report_id": report_id, "status": "resolved"}
    )
    return {"id": report_id, "status": "resolved"}


@router.post("/v1/field/tasks/{report_id}/unable", status_code=201)
async def unable_task(
    report_id: str,
    payload: UnableRequest,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        row = await lock_task(session, report_id, principal)
        if row.status not in {"assigned", "in_progress", "blocked"}:
            raise error(
                409,
                "invalid_transition",
                "Task cannot be blocked from its current status",
            )
        blocker_id = await session.scalar(
            text(
                "INSERT INTO field_blockers(report_id,reported_by,reason,note,photo_file_id) VALUES(:report,:user,:reason,NULLIF(:note,''),NULLIF(:photo,'')::uuid) RETURNING id"
            ),
            {
                "report": report_id,
                "user": principal.subject,
                "reason": payload.reason,
                "note": payload.note,
                "photo": payload.photo_file_id,
            },
        )
        await session.execute(
            text(
                "UPDATE reports SET status='blocked',first_action_at=COALESCE(first_action_at,now()),updated_at=now() WHERE id=:id"
            ),
            {"id": report_id},
        )
        await session.execute(
            text(
                "INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by) VALUES(:id,:old,'blocked',:note,:user)"
            ),
            {
                "id": report_id,
                "old": row.status,
                "note": payload.note or payload.reason,
                "user": principal.subject,
            },
        )
        await audit(
            session,
            principal.subject,
            "field.blocked",
            "report",
            report_id,
            metadata={"reason": payload.reason},
        )
    await hub.publish(
        {"type": "field.task_blocked", "report_id": report_id, "status": "blocked"}
    )
    return {"id": str(blocker_id), "report_id": report_id, "status": "blocked"}


@router.post("/v1/field/tasks/{report_id}/hazards", status_code=201)
async def create_hazard(
    report_id: str,
    payload: HazardRequest,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        await lock_task(session, report_id, principal)
        hazard_id = await session.scalar(
            text(
                "INSERT INTO hazard_reports(report_id,reported_by,category,note,photo_file_id,latitude,longitude) VALUES(:report,:user,:category,NULLIF(:note,''),NULLIF(:photo,'')::uuid,:lat,:lon) RETURNING id"
            ),
            {
                "report": report_id,
                "user": principal.subject,
                "category": payload.category,
                "note": payload.note,
                "photo": payload.photo_file_id,
                "lat": payload.latitude,
                "lon": payload.longitude,
            },
        )
        await audit(
            session,
            principal.subject,
            "field.hazard",
            "report",
            report_id,
            metadata={"hazard_id": str(hazard_id), "category": payload.category},
        )
    await hub.publish(
        {"type": "field.hazard_reported", "report_id": report_id, "status": "open"}
    )
    return {"id": str(hazard_id), "report_id": report_id, "status": "open"}


@router.get("/v1/field/hazards")
async def list_hazards(
    _: Annotated[
        Principal,
        Depends(require_roles("department_authority", "municipal_authority", "admin")),
    ],
    session: AsyncSession = Depends(session_dependency),
    status: str = "",
):
    condition, params = (
        ("h.status=:status", {"status": status}) if status else ("TRUE", {})
    )
    rows = (
        await session.execute(
            text(
                "SELECT h.*,r.tracking_code,r.title,u.full_name AS reported_by_name FROM hazard_reports h JOIN reports r ON r.id=h.report_id JOIN users u ON u.id=h.reported_by WHERE "
                + condition + " AND " + operational_report()
                + " ORDER BY h.created_at DESC"
            ),
            params,
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.patch("/v1/field/hazards/{hazard_id}")
async def update_hazard(
    hazard_id: str,
    payload: HazardUpdateRequest,
    principal: Annotated[
        Principal,
        Depends(require_roles("department_authority", "municipal_authority", "admin")),
    ],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        result = await session.execute(
            text(
                "UPDATE hazard_reports SET status=:status,acknowledged_by=CASE WHEN :status='acknowledged' THEN :user ELSE acknowledged_by END,acknowledged_at=CASE WHEN :status='acknowledged' THEN now() ELSE acknowledged_at END,resolved_at=CASE WHEN :status='resolved' THEN now() ELSE resolved_at END WHERE id=:id"
            ),
            {"id": hazard_id, "status": payload.status, "user": principal.subject},
        )
        if result.rowcount != 1:
            raise error(404, "not_found", "Hazard was not found")
        await audit(
            session,
            principal.subject,
            "field.hazard_status",
            "hazard",
            hazard_id,
            metadata={"status": payload.status},
        )
    return {"id": hazard_id, "status": payload.status}


@router.post("/v1/field/sync")
async def sync_operations(
    payload: SyncRequest,
    principal: Annotated[Principal, Depends(field_user)],
    session: AsyncSession = Depends(session_dependency),
):
    results = []
    for operation in payload.operations:
        existing = (
            await session.execute(
                text(
                    "SELECT status,result FROM field_sync_operations WHERE user_id=:user AND client_operation_id=:client"
                ),
                {"user": principal.subject, "client": operation.client_operation_id},
            )
        ).first()
        if existing:
            results.append(
                {
                    "client_operation_id": operation.client_operation_id,
                    "status": existing.status,
                    "result": existing.result,
                    "duplicate": True,
                }
            )
            continue
        result = {
            "accepted": True,
            "operation_type": operation.operation_type,
            "report_id": operation.report_id,
        }
        await session.execute(
            text(
                "INSERT INTO field_sync_operations(user_id,client_operation_id,operation_type,report_id,payload,status,result) VALUES(:user,:client,:type,NULLIF(:report,'')::uuid,CAST(:payload AS jsonb),'applied',CAST(:result AS jsonb))"
            ),
            {
                "user": principal.subject,
                "client": operation.client_operation_id,
                "type": operation.operation_type,
                "report": operation.report_id,
                "payload": json.dumps(operation.payload),
                "result": json.dumps(result),
            },
        )
        await session.commit()
        results.append(
            {
                "client_operation_id": operation.client_operation_id,
                "status": "applied",
                "result": result,
                "duplicate": False,
            }
        )
    return {"items": results}
