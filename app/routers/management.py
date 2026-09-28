from __future__ import annotations

import csv
import io
import json
from datetime import UTC, datetime, time as clock_time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import session_dependency
from ..intake import operational_report
from ..schemas import (
    AssistantRequest,
    IndicatorCreate,
    IndicatorUpdate,
    ScheduleCreate,
    TargetPut,
)
from ..security import Principal, require_roles
from ..utils import audit, error, row_dict

router = APIRouter()
manager = require_roles("municipal_authority", "admin")


def period_start(period: str) -> datetime:
    now = datetime.now(UTC)
    return now - {
        "week": timedelta(days=7),
        "month": timedelta(days=30),
        "quarter": timedelta(days=90),
    }.get(period, timedelta(days=30))


@router.get("/v1/management/overview")
async def management_overview(
    _: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
    department_id: str = "",
    period: str = "month",
):
    conditions, params = ["submitted_at>=:start", operational_report("")], {"start": period_start(period)}
    if department_id:
        conditions.append("department_id=:department")
        params["department"] = department_id
    where = " AND ".join(conditions)
    totals = (
        await session.execute(
            text(
                f"""SELECT count(*) AS received,
                count(*) FILTER (WHERE status IN ('resolved','published')) AS resolved,
                count(*) FILTER (WHERE due_at<now() AND status NOT IN ('resolved','published','rejected')) AS sla_breaches,
                round(avg(EXTRACT(EPOCH FROM (first_action_at-submitted_at))/3600)::numeric,2) AS response_avg_hours,
                round(avg(EXTRACT(EPOCH FROM (resolved_at-submitted_at))/3600)::numeric,2) AS resolution_avg_hours
                FROM reports WHERE {where}"""
            ),
            params,
        )
    ).first()
    by_department = (
        await session.execute(
            text(
                f"""SELECT d.id,d.name,count(r.id) AS received,
                count(r.id) FILTER (WHERE r.status IN ('resolved','published')) AS resolved,
                count(r.id) FILTER (WHERE r.due_at<now() AND r.status NOT IN ('resolved','published','rejected')) AS overdue
                FROM departments d LEFT JOIN reports r ON r.department_id=d.id AND {where.replace("department_id", "r.department_id").replace("submitted_at", "r.submitted_at")}
                WHERE d.active=TRUE GROUP BY d.id,d.name ORDER BY received DESC"""
            ),
            params,
        )
    ).all()
    result = row_dict(totals)
    received = result.get("received") or 0
    resolved = result.get("resolved") or 0
    result["resolution_rate_percent"] = round(
        (resolved / received * 100) if received else 0, 2
    )
    result["departments"] = [row_dict(row) for row in by_department]
    result["period"] = period
    return result


@router.get("/v1/management/targets")
async def list_targets(
    _: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
    department_id: str = "",
):
    rows = (
        await session.execute(
            text(
                "SELECT id,metric_key,department_id,target_value,created_at,updated_at FROM management_targets WHERE department_id IS NOT DISTINCT FROM NULLIF(:department,'')::uuid ORDER BY metric_key"
            ),
            {"department": department_id},
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.put("/v1/management/targets/{metric}")
async def put_target(
    metric: str,
    payload: TargetPut,
    principal: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
):
    allowed = {
        "response_avg_hours",
        "assignment_avg_hours",
        "resolution_avg_hours",
        "sla_percent",
        "resolution_rate_percent",
        "reappearance_rate_percent",
        "reopen_rate_percent",
        "verified_rate_percent",
    }
    if metric not in allowed:
        raise error(400, "invalid_metric", "Unknown management metric")
    async with session.begin():
        row = (
            await session.execute(
                text(
                    """UPDATE management_targets
                    SET target_value=:value,updated_at=now()
                    WHERE metric_key=:metric
                      AND department_id IS NOT DISTINCT FROM NULLIF(:department,'')::uuid
                    RETURNING id,metric_key,department_id,target_value,created_at,updated_at"""
                ),
                {
                    "metric": metric,
                    "department": payload.department_id,
                    "value": payload.target_value,
                },
            )
        ).first()
        if row is None:
            row = (
                await session.execute(
                    text(
                        """INSERT INTO management_targets(metric_key,department_id,target_value,created_by)
                        VALUES(:metric,NULLIF(:department,'')::uuid,:value,CAST(:user AS uuid))
                        RETURNING id,metric_key,department_id,target_value,created_at,updated_at"""
                    ),
                    {
                        "metric": metric,
                        "department": payload.department_id,
                        "value": payload.target_value,
                        "user": principal.subject,
                    },
                )
            ).first()
        await audit(
            session,
            principal.subject,
            "management.target",
            "management_target",
            str(row.id),
        )
    return row_dict(row)


@router.get("/v1/management/indicators")
async def list_indicators(
    principal: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
):
    rows = (
        await session.execute(
            text(
                "SELECT * FROM management_indicators WHERE created_by=:user OR created_by IS NULL ORDER BY pinned DESC,created_at"
            ),
            {"user": principal.subject},
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.post("/v1/management/indicators", status_code=201)
async def create_indicator(
    payload: IndicatorCreate,
    principal: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        row = (
            await session.execute(
                text(
                    """INSERT INTO management_indicators(name,numerator,denominator,department_id,period,comparison,display,pinned,created_by)
                    VALUES(:name,:numerator,:denominator,NULLIF(:department,'')::uuid,:period,:comparison,:display,:pinned,:user) RETURNING *"""
                ),
                {
                    **payload.model_dump(),
                    "department": payload.department_id,
                    "user": principal.subject,
                },
            )
        ).first()
        await audit(
            session,
            principal.subject,
            "management.indicator_create",
            "management_indicator",
            str(row.id),
        )
    return row_dict(row)


@router.patch("/v1/management/indicators/{indicator_id}")
async def update_indicator(
    indicator_id: str,
    payload: IndicatorUpdate,
    principal: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
):
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return {"id": indicator_id}
    assignments, params = [], {"id": indicator_id, "user": principal.subject}
    for key, value in values.items():
        if key == "department_id":
            assignments.append("department_id=NULLIF(:department_id,'')::uuid")
        else:
            assignments.append(f"{key}=:{key}")
        params[key] = (value or "") if key == "department_id" else value
    async with session.begin():
        result = await session.execute(
            text(
                "UPDATE management_indicators SET "
                + ",".join(assignments)
                + ",updated_at=now() WHERE id=:id AND created_by=:user"
            ),
            params,
        )
        if result.rowcount != 1:
            raise error(404, "not_found", "Indicator was not found")
        await audit(
            session,
            principal.subject,
            "management.indicator_update",
            "management_indicator",
            indicator_id,
        )
    return {"id": indicator_id}


@router.delete("/v1/management/indicators/{indicator_id}", status_code=204)
async def delete_indicator(
    indicator_id: str,
    principal: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        result = await session.execute(
            text("DELETE FROM management_indicators WHERE id=:id AND created_by=:user"),
            {"id": indicator_id, "user": principal.subject},
        )
        if result.rowcount != 1:
            raise error(404, "not_found", "Indicator was not found")


@router.post("/v1/management/assistant")
async def assistant(
    payload: AssistantRequest,
    principal: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
):
    summary = (
        await session.execute(
            text(
                "SELECT count(*) AS total,count(*) FILTER (WHERE status IN ('resolved','published')) AS resolved,count(*) FILTER (WHERE due_at<now() AND status NOT IN ('resolved','published','rejected')) AS overdue FROM reports WHERE "
                + operational_report("")
            )
        )
    ).first()
    answer = {
        "question": payload.question,
        "summary": row_dict(summary),
        "message": "Ky është një përmbledhje nga të dhënat aktuale të sistemit.",
    }
    await session.execute(
        text(
            "INSERT INTO assistant_queries(user_id,question,answer) VALUES(:user,:question,CAST(:answer AS jsonb))"
        ),
        {
            "user": principal.subject,
            "question": payload.question,
            "answer": json.dumps(answer),
        },
    )
    await session.commit()
    return answer


@router.get("/v1/management/export.csv")
async def export_csv(
    _: Annotated[Principal, Depends(manager)],
    session: AsyncSession = Depends(session_dependency),
    limit: int = Query(default=5000, ge=1, le=10000),
):
    rows = (
        await session.execute(
            text(
                "SELECT tracking_code,title,category,address,status,priority,submitted_at,resolved_at FROM reports WHERE "
                + operational_report("") + " ORDER BY submitted_at DESC LIMIT :limit"
            ),
            {"limit": limit},
        )
    ).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "tracking_code",
            "title",
            "category",
            "address",
            "status",
            "priority",
            "submitted_at",
            "resolved_at",
        ]
    )
    for row in rows:
        writer.writerow(list(row))
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sinjal-reports.csv"},
    )


def next_run(payload: ScheduleCreate) -> datetime:
    now = datetime.now(UTC)
    run_time = clock_time.fromisoformat(payload.run_time)
    candidate = now.replace(
        hour=run_time.hour, minute=run_time.minute, second=0, microsecond=0
    )
    if candidate <= now:
        candidate += timedelta(days=1)
    if payload.frequency == "weekly" and payload.day_of_week:
        candidate += timedelta(days=(payload.day_of_week - candidate.isoweekday()) % 7)
    if payload.frequency == "monthly" and payload.day_of_month:
        candidate = candidate.replace(day=min(payload.day_of_month, 28))
        if candidate <= now:
            candidate = (candidate.replace(day=28) + timedelta(days=4)).replace(
                day=min(payload.day_of_month, 28)
            )
    return candidate


schedule_manager = require_roles("municipal_authority", "admin")


@router.get("/v1/management/schedules")
async def schedules(
    _: Annotated[Principal, Depends(schedule_manager)],
    session: AsyncSession = Depends(session_dependency),
):
    rows = (
        await session.execute(
            text("SELECT * FROM report_schedules ORDER BY created_at DESC")
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.post("/v1/management/schedules", status_code=201)
async def create_schedule(
    payload: ScheduleCreate,
    principal: Annotated[Principal, Depends(schedule_manager)],
    session: AsyncSession = Depends(session_dependency),
):
    try:
        run_at = next_run(payload)
        database_time = clock_time.fromisoformat(payload.run_time)
    except Exception as exc:
        raise error(400, "invalid_time", "run_time must use HH:MM") from exc
    async with session.begin():
        row = (
            await session.execute(
                text(
                    """INSERT INTO report_schedules(name,frequency,run_time,day_of_week,day_of_month,recipients,formats,filters,enabled,timezone,next_run_at,created_by)
                    VALUES(:name,:frequency,CAST(:run_time AS time),:day_of_week,:day_of_month,CAST(:recipients AS jsonb),:formats,CAST(:filters AS jsonb),:enabled,:timezone,:next_run,:user) RETURNING *"""
                ),
                {
                    **payload.model_dump(),
                    "run_time": database_time,
                    "recipients": json.dumps(payload.recipients),
                    "filters": json.dumps(payload.filters),
                    "next_run": run_at,
                    "user": principal.subject,
                },
            )
        ).first()
    return row_dict(row)


@router.patch("/v1/management/schedules/{schedule_id}")
async def update_schedule(
    schedule_id: str,
    payload: ScheduleCreate,
    principal: Annotated[Principal, Depends(schedule_manager)],
    session: AsyncSession = Depends(session_dependency),
):
    try:
        run_at = next_run(payload)
        database_time = clock_time.fromisoformat(payload.run_time)
    except Exception as exc:
        raise error(400, "invalid_time", "run_time must use HH:MM") from exc
    async with session.begin():
        result = await session.execute(
            text(
                "UPDATE report_schedules SET name=:name,frequency=:frequency,run_time=CAST(:run_time AS time),day_of_week=:day_of_week,day_of_month=:day_of_month,recipients=CAST(:recipients AS jsonb),formats=:formats,filters=CAST(:filters AS jsonb),enabled=:enabled,timezone=:timezone,next_run_at=:next_run,updated_at=now() WHERE id=:id"
            ),
            {
                **payload.model_dump(),
                "run_time": database_time,
                "id": schedule_id,
                "recipients": json.dumps(payload.recipients),
                "filters": json.dumps(payload.filters),
                "next_run": run_at,
            },
        )
        if result.rowcount != 1:
            raise error(404, "not_found", "Schedule was not found")
    return {"id": schedule_id, "next_run_at": run_at.isoformat()}


@router.delete("/v1/management/schedules/{schedule_id}", status_code=204)
async def delete_schedule(
    schedule_id: str,
    _: Annotated[Principal, Depends(schedule_manager)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        result = await session.execute(
            text("DELETE FROM report_schedules WHERE id=:id"), {"id": schedule_id}
        )
        if result.rowcount != 1:
            raise error(404, "not_found", "Schedule was not found")
