"""Blur faces locally with YuNet, with Haar as a fallback; also blur detected plates."""

from __future__ import annotations

import hashlib
import io
import logging
from pathlib import Path

from PIL import Image, ImageFilter

log = logging.getLogger("sinjal-privacy")

_FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
_cascades = None
_FACE_MODEL = Path(__file__).resolve().parent / "models" / "face_detection_yunet_2023mar.onnx"
_PLATE_MODEL = Path(__file__).resolve().parent / "models" / "license_plate_yolov8.onnx"


def _detect_plates(rgb) -> list[tuple[int, int, int, int]]:
    """Run a local one-class YOLOv8 plate model; return image pixel boxes."""
    import cv2
    import numpy as np

    height, width = rgb.shape[:2]
    scale = min(640 / width, 640 / height)
    resized = cv2.resize(rgb, (round(width * scale), round(height * scale)))
    top = (640 - resized.shape[0]) // 2
    left = (640 - resized.shape[1]) // 2
    canvas = np.full((640, 640, 3), 114, dtype=np.uint8)
    canvas[top:top + resized.shape[0], left:left + resized.shape[1]] = resized

    net = cv2.dnn.readNetFromONNX(str(_PLATE_MODEL))
    net.setInput(cv2.dnn.blobFromImage(canvas, scalefactor=1 / 255, size=(640, 640)))
    raw = np.squeeze(net.forward())
    # Standard one-class YOLOv8: [cx,cy,w,h,confidence] x N.
    if raw.ndim != 2 or 5 not in raw.shape:
        raise ValueError(f"unexpected plate detector output shape: {raw.shape}")
    proposals = raw.T if raw.shape[0] == 5 else raw
    boxes, scores = [], []
    for cx, cy, w, h, confidence in proposals:
        if confidence < 0.25:
            continue
        x = int((cx - w / 2 - left) / scale)
        y = int((cy - h / 2 - top) / scale)
        right = int((cx + w / 2 - left) / scale)
        bottom = int((cy + h / 2 - top) / scale)
        x, y = max(0, x), max(0, y)
        right, bottom = min(width, right), min(height, bottom)
        if right > x and bottom > y:
            boxes.append((x, y, right - x, bottom - y))
            scores.append(float(confidence))
    if not boxes:
        return []
    indices = cv2.dnn.NMSBoxes(boxes, scores, 0.25, 0.45)
    return [boxes[int(index)] for index in np.asarray(indices).reshape(-1)]


def _load_cascades():
    global _cascades
    if _cascades is None:
        import cv2

        base = cv2.data.haarcascades
        _cascades = [
            cv2.CascadeClassifier(base + "haarcascade_frontalface_default.xml"),
            cv2.CascadeClassifier(base + "haarcascade_russian_plate_number.xml"),
        ]
    return _cascades


def detect_regions(image: Image.Image) -> list[tuple[int, int, int, int]]:
    import cv2
    import numpy as np

    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    min_side = max(24, min(gray.shape) // 40)
    boxes = []
    if _FACE_MODEL.is_file():
        # Instantiate per image: setInputSize/detect mutate detector state and
        # uploads can be processed concurrently by multiple worker threads.
        detector = cv2.FaceDetectorYN.create(
            str(_FACE_MODEL), "", (image.width, image.height),
            score_threshold=0.35, nms_threshold=0.3,
        )
        _, faces = detector.detect(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
        if faces is not None:
            boxes.extend(tuple(int(value) for value in face[:4]) for face in faces)
    for cascade in _load_cascades():
        for x, y, w, h in cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_side, min_side)
        ):
            boxes.append((int(x), int(y), int(w), int(h)))
    if _PLATE_MODEL.is_file():
        try:
            boxes.extend(_detect_plates(rgb))
        except Exception:  # noqa: BLE001
            log.exception("plate detection failed; retaining detected face regions")
    return boxes


def blur_sensitive(
    data: bytes, content_type: str, *,
    extra_regions: list[tuple[int, int, int, int]] | None = None,
) -> tuple[bytes, str, int]:
    """Kthen (bytes, sha256, numri_i_zonave_te_blurra)."""
    try:
        with Image.open(io.BytesIO(data)) as source:
            image = source.convert("RGB")
        try:
            boxes = detect_regions(image)
        except Exception:
            if not extra_regions:
                raise
            log.warning("automatic privacy detection failed; blurring provided regions")
            boxes = []
    except Exception as exc:  # noqa: BLE001
        # Mos e blloko raportin nëse blur dështon; logo dhe vazhdo.
        log.warning("privacy blur skipped: %s", type(exc).__name__)
        return data, hashlib.sha256(data).hexdigest(), 0
    boxes.extend(extra_regions or [])
    if not boxes:
        return data, hashlib.sha256(data).hexdigest(), 0
    for x, y, w, h in boxes:
        if w <= 0 or h <= 0:
            continue
        pad = int(0.15 * max(w, h))
        area = (max(0, x - pad), max(0, y - pad),
                min(image.width, x + w + pad), min(image.height, y + h + pad))
        radius = max(8, (area[2] - area[0]) // 6)
        image.paste(image.crop(area).filter(ImageFilter.GaussianBlur(radius)), area)
    output = io.BytesIO()
    fmt = _FORMATS.get(content_type, "JPEG")
    image.save(output, fmt, **({"quality": 90} if fmt != "PNG" else {}))
    result = output.getvalue()
    return result, hashlib.sha256(result).hexdigest(), len(boxes)


# ===== Testi i shpejte: python -m app.privacy_blur rruga\e\fotos.jpg =====
if __name__ == "__main__":
    import sys
    from pathlib import Path

    cascades = _load_cascades()
    print("Detektoret u ngarkuan:", all(not c.empty() for c in cascades))
    if len(sys.argv) < 2:
        print("Perdorimi: python -m app.privacy_blur foto.jpg [x,y,gjeresia,lartesia ...]")
        sys.exit(0)
    source = Path(sys.argv[1])
    types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    content_type = types.get(source.suffix.lower(), "image/jpeg")
    regions = [tuple(map(int, item.split(","))) for item in sys.argv[2:]]
    if any(len(item) != 4 for item in regions):
        raise SystemExit("Zona duhet te jete x,y,gjeresia,lartesia")
    result, _, count = blur_sensitive(source.read_bytes(), content_type, extra_regions=regions)
    target = source.with_name(source.stem + "_blurred" + source.suffix)
    target.write_bytes(result)
    print(f"Zona te zbuluara (fytyra/targa): {count}")
    print(f"U ruajt: {target}")
