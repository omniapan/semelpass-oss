# app/api/demo.py
# semelpass-OSS — Demo API
# Phase 3 | Rev 36
# Routes: /demo/request · /demo/gate/send · /demo/gate/verify
import hashlib
import hmac
import logging
import secrets
from typing import Optional

import httpx
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_master_session
from app.models.master import DemoRequest
from app.services.email import send_email, send_otp_email

settings = get_settings()
logger   = logging.getLogger(__name__)
router   = APIRouter(prefix="/demo", tags=["demo"])

DEMO_OTP_TTL    = 60 * 10
DEMO_OTP_PREFIX = "demo_otp:"

def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_full_url, decode_responses=True)


class DemoRequestBody(BaseModel):
    name:     str
    email:    str
    company:  Optional[str] = None
    use_case: Optional[str] = None

class DemoGateSendBody(BaseModel):
    email: str

class DemoGateVerifyBody(BaseModel):
    email: str
    code:  str


@router.post("/request", status_code=202)
async def submit_demo_request(
    request: Request,
    payload: DemoRequestBody,
    db: AsyncSession = Depends(get_master_session),
):
    """Public — no auth. Store request, notify admin."""
    ip = request.client.host if request.client else "unknown"
    demo = DemoRequest(
        name=payload.name, email=payload.email,
        company=payload.company, use_case=payload.use_case,
        ip_address=ip,
    )
    db.add(demo)
    await db.commit()
    try:
        await send_email(
            settings.admin_email,
            f"semelpass demo request — {payload.company or payload.name}",
            f"New demo request.\n\nName: {payload.name}\nEmail: {payload.email}\nCompany: {payload.company or 'N/A'}\nUse case: {payload.use_case or 'N/A'}\n\nReview: https://semelpass.com/admin/demo-requests",
            (
                '<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;background:#FDF6EC;padding:24px;border-radius:4px;">'
                '<h2 style="color:#C41E3A;margin-top:0;">New Demo Request</h2>'
                f'<p style="font-size:15px;color:#2C1810;margin:0 0 6px;"><b>Name:</b> {payload.name}</p>'
                f'<p style="font-size:15px;color:#2C1810;margin:0 0 6px;"><b>Email:</b> {payload.email}</p>'
                f'<p style="font-size:15px;color:#2C1810;margin:0 0 6px;"><b>Company:</b> {payload.company or "N/A"}</p>'
                f'<p style="font-size:15px;color:#2C1810;margin:0 0 20px;"><b>Use case:</b> {payload.use_case or "N/A"}</p>'
                '<a href="https://semelpass.com/admin/demo-requests" '
                'style="display:block;background:#C41E3A;color:#fff;text-align:center;'
                'padding:16px;text-decoration:none;border-radius:4px;'
                'font-family:Georgia,serif;font-size:16px;">Review &amp; Approve &#8594;</a>'
                '<p style="color:#7A5C52;font-size:11px;text-align:center;margin-top:16px;">'
                'semelpass &#8212; sovereign authentication</p></div>'
            ),
        )
    except Exception as exc:
        logger.error("Demo request admin notify failed: %s", exc)
    return {"status": "received"}


@router.post("/gate/send", status_code=202)
async def demo_gate_send(payload: DemoGateSendBody):
    """Public — no auth. Send OTP for Juice Shop demo gate."""
    r = _redis()
    try:
        # Rate limit: 20 OTP sends per email per hour (silent — OWASP A04)
        rl_key = "ratelimit:otp:" + payload.email.lower()
        rl_count = await r.incr(rl_key)
        if rl_count == 1:
            await r.expire(rl_key, 3600)
        if rl_count > 20:
            return {"status": "sent"}
        code      = "".join([str(secrets.randbelow(10)) for _ in range(settings.otp_length)])
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        await r.setex(f"{DEMO_OTP_PREFIX}{payload.email}", DEMO_OTP_TTL, code_hash)
    finally:
        await r.aclose()
    try:
        await send_otp_email(payload.email, code)
    except Exception as exc:
        logger.error("Demo gate OTP send failed: %s", exc)
    return {"status": "sent"}


@router.post("/gate/verify", status_code=200)
async def demo_gate_verify(payload: DemoGateVerifyBody):
    """Public — no auth. Verify OTP, return Juice Shop JWT."""
    r = _redis()
    try:
        stored_hash = await r.get(f"{DEMO_OTP_PREFIX}{payload.email}")
        if not stored_hash:
            raise HTTPException(status_code=400, detail="OTP expired or not found")
        candidate_hash = hashlib.sha256(payload.code.encode()).hexdigest()
        if not hmac.compare_digest(stored_hash, candidate_hash):
            raise HTTPException(status_code=400, detail="Invalid OTP")
        await r.delete(f"{DEMO_OTP_PREFIX}{payload.email}")
    finally:
        await r.aclose()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://semelpass-juiceshop:3000/rest/user/login",
                json={"email": settings.juice_demo_email, "password": settings.juice_demo_password},
                timeout=10.0,
            )
            resp.raise_for_status()
            token = resp.json()["authentication"]["token"]
    except Exception as exc:
        logger.error("Juice Shop auth fetch failed: %s", exc)
        raise HTTPException(status_code=503, detail="Demo unavailable")
    return {"token": token}
