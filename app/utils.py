from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if isinstance(value, dict):
        return {key: json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_value(item) for item in value]
    return value


def row_dict(row) -> dict:
    return json_value(dict(row._mapping))


def error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code, detail={"code": code, "message": message}
    )


async def audit(
    session: AsyncSession,
    actor_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str,
    ip_address: str = "",
    metadata: dict | None = None,
) -> None:
    await session.execute(
        text(
            """INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,ip_address,metadata)
               VALUES(NULLIF(:actor,'')::uuid,:action,:entity_type,:entity_id,NULLIF(:ip,''),CAST(:metadata AS jsonb))"""
        ),
        {
            "actor": actor_id or "",
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "ip": ip_address,
            "metadata": json.dumps(metadata or {}),
        },
    )


REPORT_SELECT = """
SELECT r.id,r.tracking_code,r.anonymous,r.reporter_email,r.title,r.description,r.category,r.category_code,r.subcategory,r.source,
       r.address,r.latitude,r.longitude,r.status,r.priority,r.department_id,d.name AS department_name,
       r.zone_id,z.name AS zone_name,r.assigned_to,u.full_name AS assigned_to_name,r.duplicate_of,
       r.reopened_from,r.ai_analysis,r.resolution_note,r.completion_tags,r.public_visible,
       r.submitted_at,r.accepted_at,r.assigned_at,r.first_action_at,r.started_at,r.due_at,
       r.resolved_at,r.verified_at,r.published_at,r.updated_at
FROM reports r
LEFT JOIN departments d ON d.id=r.department_id
LEFT JOIN zones z ON z.id=r.zone_id
LEFT JOIN users u ON u.id=r.assigned_to
"""
