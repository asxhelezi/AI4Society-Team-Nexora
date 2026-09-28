from __future__ import annotations

import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from sqlalchemy import text

from .config import get_settings
from .citizen_media import sync_citizen_images
from .db import SessionLocal, bootstrap_admin, close_database, wait_for_database
from .limits import close_redis, redis_client
from .realtime import hub
from .routers import  appeals, auth_admin, field, files, google_auth, management, public, reports
from .security import websocket_principal

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await wait_for_database()
    await bootstrap_admin()
    async with SessionLocal.begin() as session:
        await sync_citizen_images(session)
    if settings.APP_ENV == "production" and redis_client is not None:
        await redis_client.ping()
    yield
    await close_redis()
    await close_database()


app = FastAPI(
    title="SINJAL Municipal Reporting API",
    version="2.0.0-python",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Tracking-Code",
        "Idempotency-Key",
        "X-Request-ID",
    ],
    expose_headers=["Idempotent-Replay", "X-Request-ID"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Request-ID", secrets.token_hex(12))
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=(self)"
    )
    if settings.APP_ENV == "production":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    if request.url.path.startswith("/v1/reports/track"):
        response.headers["Cache-Control"] = "private, no-store"
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return ORJSONResponse(
            status_code=exc.status_code, content={"error": exc.detail}
        )
    return ORJSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "http_error", "message": str(exc.detail)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return ORJSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "invalid_request",
                "message": "Request validation failed",
                "details": exc.errors(),
            }
        },
    )


@app.get("/healthz")
async def health():
    async with SessionLocal() as session:
        await session.execute(text("SELECT 1"))
    if redis_client is not None:
        await redis_client.ping()
    return {"status": "ok", "runtime": "python-fastapi"}


app.include_router(public.router)
app.include_router(auth_admin.router)
app.include_router(google_auth.router)
app.include_router(reports.router)
app.include_router(files.router)
app.include_router(field.router)
app.include_router(management.router)
app.include_router(appeals.router)


@app.websocket("/v1/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        websocket_principal(websocket)
    except HTTPException:
        await websocket.close(code=4401)
        return
    await hub.connect(websocket)
    try:
        await websocket.send_json({"type": "connected"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(websocket)
