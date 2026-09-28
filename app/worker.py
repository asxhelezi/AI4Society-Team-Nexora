from __future__ import annotations

import asyncio
import json
import logging

from sqlalchemy import text

from .ai_worker import process_ai_analysis
from .config import get_settings
from .db import SessionLocal, close_database, wait_for_database
from .intake import operational_report
from .realtime import hub

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
log = logging.getLogger("sinjal-worker")
settings = get_settings()


async def process_internal_alert() -> None:
    async with SessionLocal.begin() as session:
        row = (
            await session.execute(
                text(
                    """SELECT id,title FROM notifications
                    WHERE delivered_at IS NULL AND channel='in_app'
                    ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1"""
                )
            )
        ).first()
        if row is None:
            return
        await session.execute(
            text("UPDATE notifications SET delivered_at=now() WHERE id=:id"),
            {"id": row.id},
        )
        log.info("internal alert delivered id=%s title=%s", row.id, row.title)


async def release_intake_reports() -> None:
    """Announce reports after the upload window, without announcing screened reports."""
    async with SessionLocal.begin() as session:
        rows = (
            await session.execute(text("""
                UPDATE reports SET intake_announced_at=now()
                WHERE id IN (
                    SELECT id FROM reports WHERE screened_out=FALSE
                    AND intake_ready_at<=now() AND intake_announced_at IS NULL
                    ORDER BY intake_ready_at FOR UPDATE SKIP LOCKED LIMIT 20
                ) RETURNING id
            """))
        ).all()
    for row in rows:
        await hub.publish({"type": "report.created", "report_id": str(row.id), "status": "submitted"})


async def process_schedule() -> None:
    async with SessionLocal.begin() as session:
        schedule = (
            await session.execute(
                text(
                    """SELECT id,name,frequency,recipients,formats FROM report_schedules
                    WHERE enabled=TRUE AND next_run_at<=now()
                    ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 1"""
                )
            )
        ).first()
        if schedule is None:
            return
        totals = (
            await session.execute(
                text(
                    """SELECT count(*) AS total,
                    count(*) FILTER (WHERE status IN ('submitted','under_review','accepted','assigned','in_progress','blocked')) AS active,
                    count(*) FILTER (WHERE resolved_at>=now()-interval '30 days') AS resolved_last_30_days FROM reports WHERE """
                    + operational_report("")
                )
            )
        ).first()
        summary = {
            "name": schedule.name,
            "total_reports": totals.total,
            "active_reports": totals.active,
            "resolved_last_30_days": totals.resolved_last_30_days,
            "recipients": schedule.recipients,
            "formats": schedule.formats,
        }
        await session.execute(
            text(
                "INSERT INTO report_schedule_runs(schedule_id,status,summary,completed_at) VALUES(:id,'completed',CAST(:summary AS jsonb),now())"
            ),
            {"id": schedule.id, "summary": json.dumps(summary)},
        )
        interval = {"daily": "1 day", "weekly": "7 days", "monthly": "1 month"}[
            schedule.frequency
        ]
        await session.execute(
            text(
                f"UPDATE report_schedules SET next_run_at=greatest(next_run_at,now())+interval '{interval}',updated_at=now() WHERE id=:id"
            ),
            {"id": schedule.id},
        )
        # This application deliberately has no email or SMS delivery. Scheduled
        # summaries remain available in the database for staff dashboards.
        log.info("scheduled summary generated id=%s", schedule.id)


async def cleanup_expired_submission_keys() -> None:
    async with SessionLocal.begin() as session:
        await session.execute(
            text(
                "DELETE FROM citizen_submission_keys WHERE created_at < now() - make_interval(hours => :hours)"
            ),
            {"hours": settings.IDEMPOTENCY_TTL_HOURS},
        )


async def main() -> None:
    await wait_for_database()
    log.info("SINJAL background worker started")
    try:
        loops = 0
        while True:
            await process_internal_alert()
            await process_schedule()
            await release_intake_reports()
            await process_ai_analysis()
            if loops % 1200 == 0:
                await cleanup_expired_submission_keys()
            loops += 1
            await asyncio.sleep(3)
    finally:
        await close_database()


if __name__ == "__main__":
    asyncio.run(main())
