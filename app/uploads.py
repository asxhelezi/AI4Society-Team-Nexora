from __future__ import annotations

import hashlib
import io
from pathlib import Path

from PIL import Image, UnidentifiedImageError


IMAGE_TYPES = {
    "image/jpeg": ("JPEG", ".jpg"),
    "image/png": ("PNG", ".png"),
    "image/webp": ("WEBP", ".webp"),
}


def safe_original_name(value: str | None) -> str:
    return Path(value or "upload").name[:255] or "upload"


def sanitize_image(
    data: bytes, declared_type: str, max_pixels: int
) -> tuple[bytes, str, str, str]:
    if declared_type not in IMAGE_TYPES:
        raise ValueError("Only JPEG, PNG, and WebP images are accepted")
    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.width * source.height > max_pixels:
                raise ValueError("Image dimensions are too large")
            source.verify()
        with Image.open(io.BytesIO(data)) as source:
            if source.width * source.height > max_pixels:
                raise ValueError("Image dimensions are too large")
            detected = (source.format or "").upper()
            expected, extension = IMAGE_TYPES[declared_type]
            if detected != expected:
                raise ValueError("File content does not match its declared type")
            output = io.BytesIO()
            if expected == "JPEG":
                source.convert("RGB").save(output, "JPEG", quality=90, optimize=True)
            elif expected == "PNG":
                source.save(output, "PNG", optimize=True)
            else:
                source.convert("RGB").save(output, "WEBP", quality=90, method=6)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("The uploaded file is not a valid image") from exc
    sanitized = output.getvalue()
    return sanitized, declared_type, extension, hashlib.sha256(sanitized).hexdigest()


def validate_pdf(data: bytes) -> tuple[bytes, str, str, str]:
    if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-2048:]:
        raise ValueError("The uploaded file is not a valid PDF")
    return data, "application/pdf", ".pdf", hashlib.sha256(data).hexdigest()
