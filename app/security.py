from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text

from .config import get_settings
from .db import SessionLocal

settings = get_settings()
bearer = HTTPBearer(auto_error=False)


@dataclass(slots=True)
class Principal:
    subject: str
    email: str
    full_name: str
    role: str
    department_id: str | None


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def create_token(principal: Principal) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": principal.subject,
        "email": principal.email,
        "name": principal.full_name,
        "role": principal.role,
        "department_id": principal.department_id,
        "iat": now,
        "exp": now + timedelta(hours=settings.JWT_TTL_HOURS),
        "iss": "sinjal-api",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> Principal:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=["HS256"], issuer="sinjal-api"
        )
        return Principal(
            subject=str(payload["sub"]),
            email=str(payload.get("email", "")),
            full_name=str(payload.get("name", "")),
            role=str(payload["role"]),
            department_id=payload.get("department_id"),
        )
    except (jwt.PyJWTError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_token", "message": "Invalid or expired token"},
        ) from exc


async def current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Authentication required"},
        )
    principal = decode_token(credentials.credentials)
    # Read the current account metadata: a signed token may outlive a role,
    # email, or department change made by an administrator.
    async with SessionLocal() as auth_session:
        row = (
            await auth_session.execute(
                text("SELECT email,full_name,role,department_id,active FROM users WHERE id=:id"),
                {"id": principal.subject},
            )
        ).first()
    if row is None or not row.active:
        raise HTTPException(
            status_code=401,
            detail={"code": "inactive_user", "message": "Account is inactive"},
        )
    return Principal(
        principal.subject, row.email, row.full_name, row.role,
        str(row.department_id) if row.department_id else None,
    )


def require_roles(*roles: str):
    async def dependency(
        principal: Annotated[Principal, Depends(current_principal)],
    ) -> Principal:
        if principal.role not in roles:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "forbidden",
                    "message": "Your role cannot perform this action",
                },
            )
        return principal

    return dependency


def websocket_principal(websocket: WebSocket) -> Principal:
    token = websocket.query_params.get("token", "")
    if not token:
        header = websocket.headers.get("authorization", "")
        token = header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    return decode_token(token)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return forwarded or (request.client.host if request.client else "")
