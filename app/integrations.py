from __future__ import annotations

import hashlib
import json
from typing import Any

import httpx
from fastapi import HTTPException

from . import ai_service
from .config import get_settings
from .limits import redis_client
from .utils import error

settings = get_settings()


async def verify_turnstile(token: str, remote_ip: str) -> bool:
    if settings.APP_ENV == "development" and not settings.TURNSTILE_SECRET:
        return True
    if not token or not settings.TURNSTILE_SECRET:
        return False
    try:
        async with httpx.AsyncClient(timeout=10, trust_env=False) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": settings.TURNSTILE_SECRET,
                    "response": token,
                    "remoteip": remote_ip,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise error(
            503,
            "captcha_unavailable",
            "CAPTCHA verification is temporarily unavailable",
        ) from exc
    if not payload.get("success"):
        return False
    if settings.TURNSTILE_ACTION and payload.get("action") != settings.TURNSTILE_ACTION:
        return False
    if settings.TURNSTILE_HOSTNAMES and payload.get("hostname", "").lower() not in {
        item.lower() for item in settings.TURNSTILE_HOSTNAMES
    }:
        return False
    return True


async def nominatim(path: str, params: dict[str, Any]) -> Any:
    params = {**params, "email": settings.MAP_CONTACT_EMAIL}
    cache_key = (
        "map:"
        + hashlib.sha256(
            (path + json.dumps(params, sort_keys=True)).encode()
        ).hexdigest()
    )
    if redis_client is not None:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass
    if redis_client is not None:
        try:
            permitted = await redis_client.set(
                "map:provider:global", "1", ex=1, nx=True
            )
            if not permitted:
                raise error(
                    429,
                    "map_provider_busy",
                    "Map search is busy; try again in a moment",
                )
        except HTTPException:
            raise
        except Exception:
            if settings.APP_ENV == "production":
                raise error(
                    503,
                    "map_rate_limit_unavailable",
                    "Map search is temporarily unavailable",
                )
    try:
        async with httpx.AsyncClient(
            timeout=15,
            trust_env=False,
            headers={
                "User-Agent": settings.MAP_USER_AGENT,
                "Accept": "application/json",
            },
        ) as client:
            response = await client.get(
                f"{settings.MAP_PROVIDER_URL.rstrip('/')}/{path}", params=params
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise error(
            502,
            "map_provider_unavailable",
            "The map search provider is temporarily unavailable",
        ) from exc
    if redis_client is not None:
        try:
            await redis_client.setex(
                cache_key, settings.MAP_CACHE_TTL_SECONDS, json.dumps(payload)
            )
        except Exception:
            pass
    return payload


async def analyze_with_ai(payload: dict[str, Any]) -> Any:
    # SINJAL AI: OpenAI i hackathon-it, ose mock falas me AI_MOCK=1
    if ai_service.is_enabled():
        return await ai_service.analyze_report(
            payload.get("title", ""),
            payload.get("description", ""),
            payload.get("category", ""),
        )
    if not settings.AI_SERVICE_URL:
        return None
    headers = {"Content-Type": "application/json"}
    if settings.AI_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {settings.AI_SERVICE_TOKEN}"
    async with httpx.AsyncClient(timeout=30, trust_env=False) as client:
        response = await client.post(
            settings.AI_SERVICE_URL, json=payload, headers=headers
        )
        response.raise_for_status()
        return response.json()