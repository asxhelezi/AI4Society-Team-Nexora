from __future__ import annotations

import asyncio
import os
import secrets
import time
from pathlib import Path

import httpx

from .config import get_settings
from .utils import error

settings = get_settings()
_download_slots = asyncio.Semaphore(2)


def valid_tile_coordinates(zoom: int, x: int, y: int) -> bool:
    if zoom < 0 or zoom > 19:
        return False
    limit = 1 << zoom
    return 0 <= x < limit and 0 <= y < limit


async def cached_map_tile(zoom: int, x: int, y: int) -> Path:
    if not valid_tile_coordinates(zoom, x, y):
        raise error(404, "tile_not_found", "Map tile was not found")

    target = settings.UPLOAD_DIR / "map_tiles" / str(zoom) / str(x) / f"{y}.png"
    fresh_after = time.time() - settings.MAP_CACHE_TTL_SECONDS
    if target.is_file() and target.stat().st_mtime >= fresh_after:
        return target

    async with _download_slots:
        if target.is_file() and target.stat().st_mtime >= fresh_after:
            return target
        url = f"{settings.MAP_TILE_PROVIDER_URL.rstrip('/')}/{zoom}/{x}/{y}.png"
        try:
            async with httpx.AsyncClient(
                timeout=15,
                follow_redirects=True,
                trust_env=False,
                headers={
                    "User-Agent": settings.MAP_USER_AGENT,
                    "Accept": "image/png,image/*;q=0.8",
                },
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").lower()
                data = response.content
            if (
                not content_type.startswith("image/")
                or not data
                or len(data) > 2_000_000
            ):
                raise ValueError("Unexpected tile response")
        except (httpx.HTTPError, ValueError) as exc:
            if target.is_file():
                return target
            raise error(
                502,
                "map_tile_unavailable",
                "The map tile provider is temporarily unavailable",
            ) from exc

        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(f".{target.name}.{secrets.token_hex(6)}.tmp")
        try:
            temporary.write_bytes(data)
            os.replace(temporary, target)
        finally:
            temporary.unlink(missing_ok=True)
        return target
