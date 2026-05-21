from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import os

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="semelpass-OSS",
    version=os.getenv("APP_VERSION", "26.05.1.0"),
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# ── Security headers middleware ───────────────────────────────────────────────
# OWASP A05 — Security Misconfiguration
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "frame-ancestors 'none';"
    )
    # Remove server fingerprint
    try:
        del response.headers["server"]
    except KeyError:
        pass
    try:
        del response.headers["x-powered-by"]
    except KeyError:
        pass
    return response

# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    process_time = time.time() - start
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))
    return response

# ── CORS — strict origin allowlist ───────────────────────────────────────────
# OWASP A05 — no wildcard origins
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api import auth, admin, demo, portal, billing
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(demo.router)
app.include_router(portal.router)
app.include_router(billing.router)
# app.include_router(health.router)


# ── Startup — create missing tables (idempotent, safe to replay) ──────────────
from app.core.database import get_master_engine, Base
from app.models import master as _master_models  # registers all models on Base

@app.on_event("startup")
async def on_startup():
    async with get_master_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}

# ── 404 — no stack trace exposure ────────────────────────────────────────────
@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})

# ── 500 — never expose internals ─────────────────────────────────────────────
@app.exception_handler(500)
async def server_error(request: Request, exc):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
