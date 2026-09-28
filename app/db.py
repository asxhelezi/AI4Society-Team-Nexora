from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator

import bcrypt
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()
engine = create_async_engine(
    settings.DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def session_dependency() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def wait_for_database(attempts: int = 30) -> None:
    for attempt in range(1, attempts + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return
        except (OperationalError, OSError):
            if attempt == attempts:
                raise
            await asyncio.sleep(min(attempt, 5))


async def bootstrap_admin() -> None:
    password_hash = bcrypt.hashpw(
        settings.BOOTSTRAP_ADMIN_PASSWORD.encode(), bcrypt.gensalt(rounds=12)
    ).decode()
    async with SessionLocal.begin() as session:
        await session.execute(
            text(
                """
                INSERT INTO users(email,full_name,password_hash,role,active)
                SELECT :email,:name,:password,'admin',TRUE
                WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin')
                """
            ),
            {
                "email": settings.BOOTSTRAP_ADMIN_EMAIL.lower().strip(),
                "name": settings.BOOTSTRAP_ADMIN_NAME.strip(),
                "password": password_hash,
            },
        )


async def close_database() -> None:
    await engine.dispose()
