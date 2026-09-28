"""Apelimi i refuzimeve automatike te AI-se.

Kur AI-ja refuzon nje raport si spam (confidence shume i larte), qytetari mund ta apelojne
NJE HERE me kodin e gjurmimit. Raporti kalon ne "Ne shqyrtim" dhe e vendos stafi.
Refuzimet e bera nga stafi NUK apelohen ketu: ato jane tashme vendim njerezor.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..citizen_catalog import STATUS_LABELS
from ..db import session_dependency
from ..limits import rate_limit
from ..realtime import hub
from ..security import client_ip
from ..utils import audit, error
from .public import _normalize_code

router = APIRouter(tags=["appeals"])


class AppealRequest(BaseModel):
    message: str = Field(default="", max_length=500)


def appeal_block_reason(status: str, ai_analysis: dict | None) -> str | None:
    """Kthen arsyen pse s'lejohet apelimi, ose None nese lejohet."""
    if status != "rejected":
        return "Vetëm raportet e refuzuara mund të apelohen."
    decision = (ai_analysis or {}).get("decision") or {}
    if decision.get("action") != "rejected":
        return "Ky refuzim u vendos nga stafi dhe nuk apelohet këtu."
    if (ai_analysis or {}).get("appeal"):
        return "Ky raport është apeluar tashmë një herë."
    return None


@router.post("/v1/reports/track/{code}/appeal")
async def appeal_report(
    code: str,
    payload: AppealRequest,
    request: Request,
    session: AsyncSession = Depends(session_dependency),
):
    await rate_limit(request, "appeal", 5, 3600)
    tracking_code = _normalize_code(code)
    message = payload.message.strip()
    async with session.begin():
        row = (
            await session.execute(
                text("SELECT id,status,ai_analysis FROM reports WHERE tracking_code=:code FOR UPDATE"),
                {"code": tracking_code},
            )
        ).first()
        if row is None:
            raise error(404, "not_found", "Report was not found")
        analysis = row.ai_analysis if isinstance(row.ai_analysis, dict) else json.loads(row.ai_analysis or "{}")
        reason = appeal_block_reason(row.status, analysis)
        if reason:
            raise error(409, "not_appealable", reason)
        analysis["appeal"] = {"message": message}
        await session.execute(
            text(
                """UPDATE reports SET status='under_review',resolution_note=NULL,
                ai_analysis=CAST(:analysis AS jsonb),updated_at=now() WHERE id=:id"""
            ),
            {"id": row.id, "analysis": json.dumps(analysis, ensure_ascii=False)},
        )
        await session.execute(
            text(
                """INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by)
                VALUES(:id,'rejected','under_review',:note,NULL)"""
            ),
            {"id": row.id, "note": f"[APELIM] Qytetari apeloi refuzimin automatik të AI-së. {message}".strip()},
        )
        await audit(session, "", "report.appeal", "report", str(row.id),
                    ip_address=client_ip(request), metadata={"has_message": bool(message)})
    await hub.publish({"type": "report.updated", "report_id": str(row.id), "status": "under_review"})
    return {"tracking_code": tracking_code, "status": "under_review",
            "status_label": STATUS_LABELS.get("under_review", "under_review")}