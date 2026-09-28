"""Kontroll LOKAL nese nje foto duket e gjeneruar nga AI. Pa API, pa kosto, foto s'del nga serveri.

Lexon metadatat e fotos PARA se sanitize_image t'i fshije:
  - etiketa C2PA / IPTC "trainedAlgorithmicMedia" (vendosen nga OpenAI, Adobe Firefly etj.)
  - emra gjeneruesish AI ne metadata (Midjourney, Stable Diffusion, DALL-E ...)
  - parametrat e gjenerimit qe Stable Diffusion ruan ne PNG ("Steps:", "Sampler:")
  - te dhenat e kameres (marka, modeli, ora e fotos) - mungesa e tyre eshte sinjal i DOBET

Fotot 4K (te pakten 3840x2160, edhe ne orientim vertikal) i nenshtrohen
politikes se filtrimit te raporteve. Rezolucioni vetem nuk provon origjinen AI.
Shenjat e tjera vazhdojne te jene sinjale per stafin.
Kufizim: nuk kap foto AI te bera screenshot apo te riderguara neper aplikacione qe fshijne metadatat.
"""

from __future__ import annotations

import io
import logging
import struct

from PIL import Image

log = logging.getLogger("sinjal-photo-check")

# Shenja te forta qe fotoja u krijua nga AI (kerkohen ne bytes, pa dallim shkronjash)
AI_MARKERS = {
    b"trainedalgorithmicmedia": "Etiketë IPTC: media e gjeneruar nga AI",
    b"c2pa": "Etiketë C2PA (Content Credentials)",
    b"dall-e": "Gjeneruesi: DALL-E",
    b"gpt-image": "Gjeneruesi: OpenAI gpt-image",
    b"midjourney": "Gjeneruesi: Midjourney",
    b"stable diffusion": "Gjeneruesi: Stable Diffusion",
    b"stablediffusion": "Gjeneruesi: Stable Diffusion",
    b"adobe firefly": "Gjeneruesi: Adobe Firefly",
    b"novelai": "Gjeneruesi: NovelAI",
    b"comfyui": "Gjeneruesi: ComfyUI",
    b"invokeai": "Gjeneruesi: InvokeAI",
    b"ideogram": "Gjeneruesi: Ideogram",
    b"leonardo.ai": "Gjeneruesi: Leonardo.ai",
    b"black forest labs": "Gjeneruesi: FLUX (Black Forest Labs)",
}

EXIF_MAKE, EXIF_MODEL, EXIF_IFD, EXIF_DATETIME_ORIGINAL = 271, 272, 0x8769, 36867
UHD_LONG_SIDE, UHD_SHORT_SIDE = 3840, 2160


def check_photo(raw: bytes, content_type: str = "") -> dict:
    """Kontrollon shenjat AI dhe rezolucionin origjinal para perpunimit."""
    try:
        # Kerkojme VETEM ne metadata, jo ne pikselat e fotos (perndryshe "c2pa" mund te
        # shfaqej rastesisht ne te dhenat e kompresuara te nje fotoje te vertete).
        lower = _metadata_bytes(raw).lower()
        signals = [label for marker, label in AI_MARKERS.items() if marker in lower]
        if b"steps:" in lower and b"sampler:" in lower:
            signals.append("Parametra gjenerimi (Stable Diffusion) brenda skedarit")
        camera, width, height = _camera_info(raw)
        resolution_4k = (max(width, height) >= UHD_LONG_SIDE
                         and min(width, height) >= UHD_SHORT_SIDE)
        if resolution_4k:
            signals.append("Rezolucion 4K ose më i lartë (rregull filtrimi, jo provë e AI)")
        if signals:
            verdict = "ai_label"
        elif camera:
            verdict = "camera_photo"
        else:
            verdict = "no_camera_data"
        return {"verdict": verdict, "signals": sorted(set(signals)),
                "camera": camera, "width": width, "height": height,
                "resolution_4k": resolution_4k}
    except Exception as exc:  # noqa: BLE001
        # Kontrolli nuk duhet te bllokoje kurre ngarkimin e fotos.
        log.warning("photo check skipped: %s", type(exc).__name__)
        return {"verdict": "unknown", "signals": [], "camera": None,
                "resolution_4k": False}


def _camera_info(raw: bytes) -> tuple[str | None, int, int]:
    with Image.open(io.BytesIO(raw)) as image:
        width, height = image.size
        exif = image.getexif()
        make = str(exif.get(EXIF_MAKE, "")).strip("\x00 ")
        model = str(exif.get(EXIF_MODEL, "")).strip("\x00 ")
        taken = str(exif.get_ifd(EXIF_IFD).get(EXIF_DATETIME_ORIGINAL, "")).strip("\x00 ")
    if not (make or model):
        return None, width, height
    return " ".join(part for part in (make, model, f"({taken})" if taken else "") if part), width, height


def _metadata_bytes(raw: bytes) -> bytes:
    """Kthen vetem pjeset e skedarit qe mbajne metadata (pa te dhenat e pikselave)."""
    if raw[:2] == b"\xff\xd8":  # JPEG: segmentet APPn/COM para fillimit te imazhit (SOS)
        parts, pos = [], 2
        while pos + 4 <= len(raw) and raw[pos] == 0xFF:
            marker = raw[pos + 1]
            if marker == 0xDA:  # Start of Scan: fillojne pikselat
                break
            length = struct.unpack(">H", raw[pos + 2:pos + 4])[0]
            parts.append(raw[pos + 4:pos + 2 + length])
            pos += 2 + length
        return b"".join(parts)
    if raw[:8] == b"\x89PNG\r\n\x1a\n":  # PNG: te gjitha chunk-et pervec pikselave (IDAT)
        parts, pos = [], 8
        while pos + 8 <= len(raw):
            length = struct.unpack(">I", raw[pos:pos + 4])[0]
            kind = raw[pos + 4:pos + 8]
            if kind != b"IDAT":
                parts.append(kind + raw[pos + 8:pos + 8 + length])
            pos += 12 + length
        return b"".join(parts)
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":  # WebP: chunk-et e metadatave
        parts, pos = [], 12
        while pos + 8 <= len(raw):
            kind = raw[pos:pos + 4]
            length = struct.unpack("<I", raw[pos + 4:pos + 8])[0]
            if kind not in {b"VP8 ", b"VP8L", b"ALPH", b"ANMF"}:
                parts.append(kind + raw[pos + 8:pos + 8 + length])
            pos += 8 + length + (length & 1)
        return b"".join(parts)
    return raw[:65536]
