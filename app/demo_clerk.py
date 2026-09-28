"""Manually provision one local clerk for a presentation (never runs at startup)."""

from __future__ import annotations

import asyncio
from getpass import getpass

from sqlalchemy import text

from .config import get_settings
from .db import SessionLocal
from .security import hash_password

EMAIL = "demo.staff@sinjal.local"
USERNAME = "demo.staff"


async def create_demo_clerk(password: str) -> None:
    if get_settings().APP_ENV != "development":
        raise SystemExit("Demo account creation is available only in development.")
    if not 8 <= len(password) <= 512:
        raise SystemExit("Choose a password with 8 to 512 characters.")

    async with SessionLocal.begin() as session:
        existing = await session.scalar(
            text("SELECT 1 FROM users WHERE lower(email)=:email OR username=:username"),
            {"email": EMAIL, "username": USERNAME},
        )
        if existing:
            raise SystemExit("The demo clerk already exists; its password was not changed.")
        await session.execute(
            text("""INSERT INTO users(email,username,full_name,password_hash,role,active)
                    VALUES(:email,:username,:name,:password,'clerk',TRUE)"""),
            {"email": EMAIL, "username": USERNAME, "name": "Demo Staff",
             "password": hash_password(password)},
        )


if __name__ == "__main__":
    asyncio.run(create_demo_clerk(getpass("Password for demo.staff@sinjal.local: ")))
    print(f"Created clerk account: {EMAIL} (username: {USERNAME})")
