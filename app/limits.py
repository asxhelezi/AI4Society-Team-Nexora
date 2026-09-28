from __future__ import annotations

from fastapi import HTTPException, Request
from redis.asyncio import Redis

from .config import get_settings
from .security import client_ip
from .utils import error

settings = get_settings()
redis_client: Redis | None = (
    Redis.from_url(settings.REDIS_URL, decode_responses=True)
    if settings.REDIS_URL
    else None
)


async def rate_limit(
    request: Request, scope: str, limit: int, window_seconds: int
) -> None:
    if redis_client is None:
        if settings.APP_ENV == "production":
            raise error(503, "rate_limit_unavailable", "Rate limiting is unavailable")
        return
    bucket = int(__import__("time").time()) // window_seconds
    key = f"rate:{scope}:{client_ip(request)}:{bucket}"
    try:
        value = await redis_client.incr(key)
        if value == 1:
            await redis_client.expire(key, window_seconds + 5)
        if value > limit:
            raise error(429, "rate_limited", "Too many requests; try again later")
    except HTTPException:
        raise
    except Exception:
        if settings.APP_ENV == "production":
            raise error(503, "rate_limit_unavailable", "Rate limiting is unavailable")


async def close_redis() -> None:
    if redis_client is not None:
        await redis_client.aclose()
