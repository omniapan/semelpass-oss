import hashlib
import hmac
import secrets
import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.database import get_master_session
from app.models.master import App, OTPSession, AuditLog, utcnow
from app.services.email import send_otp_email

settings = get_settings()
logger   = logging.getLogger(__name__)
router   = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class OTPSendRequest(BaseModel):
    email:  str
    app_id: str

class OTPVerifyRequest(BaseModel):
    email:  str
    app_id: str
    code:   str


# ── Internal helpers ──────────────────────────────────────────────────────────

def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()

def _verify_sig(body: bytes, secret: str, signature: str) -> bool:
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def _generate_otp() -> str:
    return str(secrets.randbelow(10 ** settings.otp_length)).zfill(settings.otp_length)

def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

async def _resolve_app(app_id: str, db: AsyncSession) -> App:
    result = await db.execute(
        select(App).where(App.id == app_id, App.is_active == True)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return app

async def _audit(db: AsyncSession, tenant_id: str, app_id: str,
                 event: str, detail: str, ip: str, ua: str) -> None:
    db.add(AuditLog(
        tenant_id=tenant_id, app_id=app_id,
        event=event, ip_address=ip, user_agent=ua, detail=detail,
    ))


# ── POST /auth/otp/send ───────────────────────────────────────────────────────

@router.post("/otp/send", status_code=202)
async def otp_send(
    request: Request,
    payload: OTPSendRequest,
    x_semelpass_sig: Annotated[str, Header()],
    db: AsyncSession = Depends(get_master_session),
):
    """
    Send OTP to email. Authenticated via HMAC-SHA256 of request body.
    Always returns 202 — never exposes email existence or rate limit state (OWASP A04).
    """
    body = await request.body()
    app  = await _resolve_app(payload.app_id, db)

    if not _verify_sig(body, app.hmac_secret, x_semelpass_sig):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    now = utcnow()
    ip  = _client_ip(request)
    ua  = request.headers.get("user-agent", "")

    # Rate limit: max otp_max_attempts sends per email+app within expiry window
    window_start = now - timedelta(minutes=settings.otp_expire_minutes)
    rate_result  = await db.execute(
        select(OTPSession).where(
            OTPSession.app_id     == app.id,
            OTPSession.email      == payload.email,
            OTPSession.created_at >= window_start,
        )
    )
    if len(rate_result.scalars().all()) >= settings.otp_max_attempts:
        await _audit(db, app.tenant_id, app.id, "otp.send.rate_limited",
                     payload.email, ip, ua)
        return {"status": "sent"}  # Silent — do not expose throttle state

    # Burn any existing active session for this email+app
    await db.execute(
        update(OTPSession)
        .where(
            OTPSession.app_id  == app.id,
            OTPSession.email   == payload.email,
            OTPSession.used_at.is_(None),
        )
        .values(used_at=now)
    )

    code       = _generate_otp()
    expires_at = now + timedelta(minutes=settings.otp_expire_minutes)

    db.add(OTPSession(
        tenant_id  = app.tenant_id,
        app_id     = app.id,
        email      = payload.email,
        code_hash  = _hash_code(code),
        expires_at = expires_at,
    ))
    await _audit(db, app.tenant_id, app.id, "otp.send", payload.email, ip, ua)
    await db.commit()  # Persist before network call

    try:
        await send_otp_email(payload.email, code)
    except Exception as exc:
        logger.error("OTP email failed app=%s: %s", app.id, exc)
        # Silent — session committed, audit logged, caller gets 202

    return {"status": "sent"}


# ── POST /auth/otp/verify ─────────────────────────────────────────────────────

@router.post("/otp/verify", status_code=200)
async def otp_verify(
    request: Request,
    payload: OTPVerifyRequest,
    x_semelpass_sig: Annotated[str, Header()],
    db: AsyncSession = Depends(get_master_session),
):
    """
    Verify OTP code. All failure paths return identical 401 — never reveal
    which check failed (OWASP A01).
    """
    body = await request.body()
    app  = await _resolve_app(payload.app_id, db)

    if not _verify_sig(body, app.hmac_secret, x_semelpass_sig):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    now = utcnow()
    ip  = _client_ip(request)
    ua  = request.headers.get("user-agent", "")

    result = await db.execute(
        select(OTPSession).where(
            OTPSession.app_id     == app.id,
            OTPSession.email      == payload.email,
            OTPSession.expires_at >  now,
            OTPSession.used_at.is_(None),
        ).order_by(OTPSession.created_at.desc()).limit(1)
    )
    session = result.scalar_one_or_none()

    if not session:
        await _audit(db, app.tenant_id, app.id, "otp.verify.fail",
                     payload.email, ip, ua)
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    session.attempts += 1

    if session.attempts > settings.otp_max_attempts:
        session.used_at = now
        await _audit(db, app.tenant_id, app.id, "otp.verify.fail.maxed",
                     payload.email, ip, ua)
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    if not hmac.compare_digest(session.code_hash, _hash_code(payload.code)):
        await _audit(db, app.tenant_id, app.id, "otp.verify.fail",
                     payload.email, ip, ua)
        raise HTTPException(status_code=401, detail="Invalid or expired code")

    session.used_at = now
    await _audit(db, app.tenant_id, app.id, "otp.verify.success",
                 payload.email, ip, ua)

    return {"status": "verified", "email": payload.email, "tenant_id": app.tenant_id}
