"""Keep every shipped citizen image in PostgreSQL as well as at its existing URL."""

from __future__ import annotations

import hashlib
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings

IMAGE_MIMES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
    ".svg": "image/svg+xml", ".ico": "image/x-icon", ".bmp": "image/bmp",
}


def shipped_images(base: Path) -> list[tuple[str, str, str, bytes, str]]:
    assets: list[tuple[str, str, str, bytes, str]] = []
    directories = {
        "react": base / "react" if (base / "react").is_dir() else base / "sinjal-citizen-react/public",
        "legacy": base / "legacy" if (base / "legacy").is_dir() else base / "sinjal-citizen",
    }
    for source, directory in directories.items():
        if not directory.is_dir():
            raise RuntimeError(f"Citizen image directory is missing: {directory}")
        for path in sorted(directory.rglob("*")):
            mime = IMAGE_MIMES.get(path.suffix.lower())
            if not mime or not path.is_file():
                continue
            if path.is_symlink():
                raise RuntimeError(f"Citizen image cannot be a symlink: {path}")
            data = path.read_bytes()
            if not data:
                raise RuntimeError(f"Citizen image is empty: {path}")
            relative = path.relative_to(directory).as_posix()
            assets.append((source, relative, hashlib.sha256(data).hexdigest(), data, mime))
        if not any(item[0] == source for item in assets):
            raise RuntimeError(f"Citizen image directory has no images: {directory}")
    return assets


async def sync_citizen_images(session: AsyncSession) -> tuple[int, int]:
    """Upsert new/changed images atomically; file URLs and UI remain intact."""
    assets = shipped_images(get_settings().CITIZEN_ASSETS_DIR)
    known_blobs = set((await session.execute(text("SELECT sha256 FROM citizen_media_blobs"))).scalars())
    known_paths = {
        (row.source, row.path): row.sha256
        for row in (await session.execute(
            text("SELECT source,path,sha256 FROM citizen_media_assets")
        )).all()
    }
    for source, path, digest, data, mime in assets:
        if digest not in known_blobs:
            await session.execute(
                text("""INSERT INTO citizen_media_blobs(sha256,content,content_type)
                        VALUES(:sha,:content,:mime) ON CONFLICT (sha256) DO NOTHING"""),
                {"sha": digest, "content": data, "mime": mime},
            )
            known_blobs.add(digest)
        if known_paths.get((source, path)) != digest:
            await session.execute(
                text("""INSERT INTO citizen_media_assets(source,path,sha256)
                        VALUES(:source,:path,:sha)
                        ON CONFLICT (source,path) DO UPDATE SET sha256=EXCLUDED.sha256"""),
                {"source": source, "path": path, "sha": digest},
            )
    return len(assets), len({item[2] for item in assets})
