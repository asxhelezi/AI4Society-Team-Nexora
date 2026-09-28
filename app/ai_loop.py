"""Vetem pipeline-i AI, per databazen Supabase: python -m app.ai_loop

worker.py ben edhe njoftimet, raportet e planifikuara dhe pastrimin, qe kerkojne tabelat e
backend-it. Kur qytetari dhe stafi punojne me Supabase (supabase/README.md), mjafton ky proces:
cdo 3 sekonda merr nje raport te ri dhe shkruan reports.ai_analysis, qe stafi e sheh menjehere.

Mjedisi: DATABASE_URL (lidhja Postgres e Supabase, me fjalekalimin e databazes),
AI_API_KEY, AI_BASE_URL, AI_MODEL (ose AI_MOCK=1). Shih .env.example.
"""

from __future__ import annotations

import asyncio
import logging
import os
import secrets

# Ky proces nuk leshon token-e, por config.py e kerkon JWT_SECRET: nje vlere e rastesishme mjafton.
os.environ.setdefault("JWT_SECRET", secrets.token_hex(32))

from .ai_worker import process_ai_analysis  # noqa: E402
from .db import close_database, wait_for_database  # noqa: E402

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
log = logging.getLogger("sinjal-ai-loop")


async def main() -> None:
    await wait_for_database()
    log.info("SINJAL AI loop started")
    try:
        while True:
            try:
                await process_ai_analysis()
            except Exception:  # noqa: BLE001
                # Nje gabim lidhjeje nuk duhet ta ndaloje procesin; provohet perseri.
                log.exception("AI loop iteration failed")
            await asyncio.sleep(3)
    finally:
        await close_database()


if __name__ == "__main__":
    asyncio.run(main())
