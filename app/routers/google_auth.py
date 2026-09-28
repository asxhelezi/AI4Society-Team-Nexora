from __future__ import annotations

import asyncio
import base64
import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import ORJSONResponse, RedirectResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import session_dependency
from ..limits import rate_limit
from ..security import Principal, create_token
from ..utils import error

router = APIRouter()
settings = get_settings()
log = logging.getLogger(__name__)
STATE_COOKIE = "sinjal_google_state"
RESULT_COOKIE = "sinjal_google_result"
STAFF_ROLES = {"admin", "clerk", "department_authority", "municipal_authority", "operative_staff"}


def _cookie_options(path: str, age: int) -> dict:
    return {
        "path": path,
        "max_age": age,
        "secure": settings.APP_ENV == "production",
        "httponly": True,
        "samesite": "lax",
    }


def _encoded(values: dict, audience: str, seconds: int) -> str:
    return jwt.encode(
        {**values, "iss": "sinjal-api", "aud": audience,
         "exp": datetime.now(UTC) + timedelta(seconds=seconds)},
        settings.JWT_SECRET, algorithm="HS256",
    )


def _decoded(value: str, audience: str) -> dict:
    try:
        return jwt.decode(value, settings.JWT_SECRET, algorithms=["HS256"],
                          issuer="sinjal-api", audience=audience)
    except jwt.PyJWTError as exc:
        raise error(401, "invalid_google_session", "Google sign-in expired; try again") from exc


def _back(reason: str) -> RedirectResponse:
    response = RedirectResponse("/login/?" + urlencode({"google_error": reason}), status_code=303)
    response.delete_cookie(STATE_COOKIE, path="/v1/auth/google")
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/v1/auth/google/start")
async def start(request: Request):
    await rate_limit(request, "google_login", 10, 60)
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and settings.GOOGLE_REDIRECT_URI):
        return _back("unavailable")
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    response = RedirectResponse(
        "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params), status_code=302
    )
    response.set_cookie(
        STATE_COOKIE,
        _encoded({"state": state, "nonce": nonce, "verifier": verifier}, "sinjal-google-state", 600),
        **_cookie_options("/v1/auth/google", 600),
    )
    response.headers["Cache-Control"] = "no-store"
    return response


async def _account_for_google(session: AsyncSession, info: dict) -> Principal:
    sub = str(info.get("sub", ""))
    email = str(info.get("email", "")).strip().lower()
    if not sub or not email or info.get("email_verified") is not True:
        raise error(401, "google_identity_invalid", "Google account could not be verified")

    async with session.begin():
        linked = (
            await session.execute(
                text("""SELECT u.id,u.email,u.full_name,u.role,u.department_id,u.active
                        FROM google_identities g JOIN users u ON u.id=g.user_id
                        WHERE g.google_sub=:sub"""), {"sub": sub}
            )
        ).first()
        if linked:
            row = linked
        else:
            # Google is authoritative for Gmail and Workspace addresses. For other
            # domains a verified email alone is insufficient for automatic linking.
            if email.rsplit("@", 1)[-1] not in {"gmail.com", "googlemail.com"} and not info.get("hd"):
                raise error(403, "google_account_unlinked", "Google account is not authorized")
            row = (
                await session.execute(
                    text("""SELECT id,email,full_name,role,department_id,active
                            FROM users WHERE lower(email)=:email FOR UPDATE"""), {"email": email}
                )
            ).first()
            if not row or not row.active or row.role not in STAFF_ROLES:
                raise error(403, "google_account_unlinked", "Google account is not authorized")
            # UNIQUE(user_id) prevents a second Google account from taking over an
            # already linked user even if that account later obtains the same email.
            await session.execute(
                text("INSERT INTO google_identities(google_sub,user_id) VALUES(:sub,:id)"),
                {"sub": sub, "id": str(row.id)},
            )
        if not row.active or row.role not in STAFF_ROLES:
            raise error(403, "google_account_unlinked", "Google account is not authorized")
    return Principal(str(row.id), row.email, row.full_name, row.role,
                     str(row.department_id) if row.department_id else None)


@router.get("/v1/auth/google/callback")
async def callback(request: Request, session: AsyncSession = Depends(session_dependency)):
    await rate_limit(request, "google_callback", 20, 60)
    if request.query_params.get("error"):
        return _back("cancelled")
    try:
        state_info = _decoded(request.cookies.get(STATE_COOKIE, ""), "sinjal-google-state")
        if not secrets.compare_digest(request.query_params.get("state", ""), state_info["state"]):
            return _back("invalid_state")
        code = request.query_params.get("code", "")
        if not code:
            return _back("invalid_code")
        async with httpx.AsyncClient(timeout=10) as client:
            exchange = await client.post("https://oauth2.googleapis.com/token", data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
                "code_verifier": state_info["verifier"],
            })
        exchange.raise_for_status()
        identity_token = exchange.json()["id_token"]
        info = await asyncio.to_thread(google_id_token.verify_oauth2_token,
                                       identity_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        if not secrets.compare_digest(str(info.get("nonce", "")), state_info["nonce"]):
            return _back("invalid_state")
        principal = await _account_for_google(session, info)
    except HTTPException:
        return _back("unauthorized")
    except (httpx.HTTPError, KeyError, ValueError, jwt.PyJWTError, IntegrityError):
        return _back("failed")
    except Exception:
        log.exception("Google sign-in failed")
        return _back("failed")
    user = {"id": principal.subject, "email": principal.email,
            "full_name": principal.full_name, "role": principal.role,
            "department_id": principal.department_id}
    response = RedirectResponse("/login/?google=complete", status_code=303)
    response.delete_cookie(STATE_COOKIE, path="/v1/auth/google")
    response.set_cookie(
        RESULT_COOKIE,
        _encoded({"access_token": create_token(principal), "user": user}, "sinjal-google-result", 60),
        **_cookie_options("/v1/auth/google/complete", 60),
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/v1/auth/google/complete")
async def complete(request: Request):
    data = _decoded(request.cookies.get(RESULT_COOKIE, ""), "sinjal-google-result")
    response = ORJSONResponse({"access_token": data["access_token"], "user": data["user"]})
    response.delete_cookie(RESULT_COOKIE, path="/v1/auth/google/complete")
    response.headers["Cache-Control"] = "no-store"
    return response
