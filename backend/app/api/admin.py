import json
import hmac
import hashlib
import logging
import secrets
from datetime import timedelta, datetime, timezone
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import redis.asyncio as aioredis

from app.core.config import get_settings
from app.core.database import get_master_session
from app.models.master import Tenant, User, AuditLog, DemoRequest, utcnow
from app.services.email import send_email, send_otp_email

settings = get_settings()
logger   = logging.getLogger(__name__)
router   = APIRouter(prefix="/admin", tags=["admin"])

SESSION_COOKIE = "sp_admin_session"
SESSION_TTL    = 60 * 60 * 8
OTP_TTL        = settings.otp_expire_minutes * 60


# ── Redis ─────────────────────────────────────────────────────────────────────

def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_full_url, decode_responses=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()

def _generate_otp() -> str:
    return str(secrets.randbelow(10 ** settings.otp_length)).zfill(settings.otp_length)

def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── Session dependency ────────────────────────────────────────────────────────

async def require_admin(
    sp_admin_session: Annotated[Optional[str], Cookie()] = None,
) -> None:
    if not sp_admin_session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    r = _redis()
    try:
        val = await r.get(f"admin_session:{sp_admin_session}")
    finally:
        await r.aclose()
    if val != "1":
        raise HTTPException(status_code=401, detail="Not authenticated")


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginVerifyPayload(BaseModel):
    code: str

class TenantCreate(BaseModel):
    slug: str
    name: str

class TenantUpdate(BaseModel):
    name:      Optional[str]  = None
    is_active: Optional[bool] = None

class DemoApprove(BaseModel):
    tenant_slug: Optional[str] = None
    tenant_name: Optional[str] = None


# ── POST /admin/login ─────────────────────────────────────────────────────────

@router.post("/login", status_code=202)
async def admin_login(request: Request):
    """Send OTP to admin_email. Always 202 — do not expose whether email exists."""
    code = _generate_otp()
    otp_data = json.dumps({
        "code_hash": _hash_code(code),
        "attempts": 0,
        "expires_at": (utcnow() + timedelta(minutes=settings.otp_expire_minutes)).isoformat(),
    })
    r = _redis()
    try:
        await r.set("admin_otp", otp_data, ex=OTP_TTL)
    finally:
        await r.aclose()

    try:
        await send_otp_email(settings.admin_email, code)
    except Exception as exc:
        logger.error("Admin OTP email failed: %s", exc)

    ip = _client_ip(request)
    logger.info("Admin OTP requested from %s", ip)
    return {"status": "sent"}


# ── POST /admin/login/verify ──────────────────────────────────────────────────

@router.post("/login/verify", status_code=200)
async def admin_login_verify(payload: LoginVerifyPayload, response: Response):
    r = _redis()
    try:
        raw = await r.get("admin_otp")
        if not raw:
            raise HTTPException(status_code=401, detail="Invalid or expired code")

        otp_data = json.loads(raw)
        expires_at = datetime.fromisoformat(otp_data["expires_at"])

        if datetime.now(timezone.utc) > expires_at:
            await r.delete("admin_otp")
            raise HTTPException(status_code=401, detail="Invalid or expired code")

        otp_data["attempts"] += 1
        if otp_data["attempts"] > settings.otp_max_attempts:
            await r.delete("admin_otp")
            raise HTTPException(status_code=401, detail="Invalid or expired code")

        if not hmac.compare_digest(otp_data["code_hash"], _hash_code(payload.code)):
            await r.set("admin_otp", json.dumps(otp_data), ex=OTP_TTL)
            raise HTTPException(status_code=401, detail="Invalid or expired code")

        await r.delete("admin_otp")
        session_id = secrets.token_hex(32)
        await r.set(f"admin_session:{session_id}", "1", ex=SESSION_TTL)
    finally:
        await r.aclose()

    response.set_cookie(
        key=SESSION_COOKIE, value=session_id,
        httponly=True, secure=settings.is_production,
        samesite="lax", max_age=SESSION_TTL,
    )
    return {"status": "ok"}


# ── POST /admin/logout ────────────────────────────────────────────────────────

@router.post("/logout", dependencies=[Depends(require_admin)])
async def admin_logout(
    response: Response,
    sp_admin_session: Annotated[Optional[str], Cookie()] = None,
):
    r = _redis()
    try:
        if sp_admin_session:
            await r.delete(f"admin_session:{sp_admin_session}")
    finally:
        await r.aclose()
    response.delete_cookie(SESSION_COOKIE)
    return {"status": "ok"}


# ── GET /admin/tenants ────────────────────────────────────────────────────────

@router.get("/tenants", dependencies=[Depends(require_admin)])
async def list_tenants(db: AsyncSession = Depends(get_master_session)):
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()
    return [
        {
            "id": t.id, "slug": t.slug, "name": t.name,
            "contact_email": t.contact_email,
            "is_active": t.is_active,
            "created_at": t.created_at.isoformat(),
        }
        for t in tenants
    ]


# ── POST /admin/tenants ───────────────────────────────────────────────────────

@router.post("/tenants", status_code=201, dependencies=[Depends(require_admin)])
async def create_tenant(
    payload: TenantCreate,
    db: AsyncSession = Depends(get_master_session),
):
    existing = await db.execute(select(Tenant).where(Tenant.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug already exists")

    tenant = Tenant(slug=payload.slug, name=payload.name)
    db.add(tenant)
    await db.flush()  # populate tenant.id
    db.add(AuditLog(
        tenant_id=tenant.id, event="tenant.created",
        detail=f"slug={payload.slug} name={payload.name}",
    ))
    return {"id": tenant.id, "slug": tenant.slug, "name": tenant.name}


# ── PATCH /admin/tenants/{tenant_id} ─────────────────────────────────────────

@router.patch("/tenants/{tenant_id}", dependencies=[Depends(require_admin)])
async def update_tenant(
    tenant_id: str,
    payload: TenantUpdate,
    db: AsyncSession = Depends(get_master_session),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if payload.name      is not None: tenant.name      = payload.name
    if payload.is_active is not None: tenant.is_active = payload.is_active

    db.add(AuditLog(
        tenant_id=tenant.id, event="tenant.updated",
        detail=f"name={payload.name} is_active={payload.is_active}",
    ))
    return {
        "id": tenant.id, "slug": tenant.slug,
        "name": tenant.name, "is_active": tenant.is_active,
    }


# ── GET /admin/demo-requests ──────────────────────────────────────────────────

@router.get("/demo-requests", dependencies=[Depends(require_admin)])
async def list_demo_requests(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_master_session),
):
    q = select(DemoRequest).order_by(DemoRequest.created_at.desc())
    if status:
        q = q.where(DemoRequest.status == status)
    result = await db.execute(q)
    return [
        {
            "id": r.id, "name": r.name, "email": r.email,
            "company": r.company, "use_case": r.use_case,
            "status": r.status, "created_at": r.created_at.isoformat(),
        }
        for r in result.scalars().all()
    ]


# ── POST /admin/demo-requests/{id}/approve ────────────────────────────────────

@router.post("/demo-requests/{request_id}/approve", dependencies=[Depends(require_admin)])
async def approve_demo_request(
    request_id: str,
    payload: DemoApprove,
    db: AsyncSession = Depends(get_master_session),
):
    result = await db.execute(
        select(DemoRequest).where(
            DemoRequest.id == request_id, DemoRequest.status == "pending"
        )
    )
    demo = result.scalar_one_or_none()
    if not demo:
        raise HTTPException(status_code=404, detail="Not found or already processed")

    slug = (payload.tenant_slug or
            demo.email.split("@")[0].lower().replace(".", "-")[:64])
    name = payload.tenant_name or demo.company or demo.name

    # Ensure slug is unique
    clash = await db.execute(select(Tenant).where(Tenant.slug == slug))
    if clash.scalar_one_or_none():
        slug = f"{slug}-{request_id[:8]}"

    tenant = Tenant(slug=slug, name=name, contact_email=demo.email)
    db.add(tenant)

    await db.flush()  # populate tenant.id before use
    user = User(tenant_id=tenant.id, email=demo.email, is_active=True, is_admin=True)
    db.add(user)

    demo.status      = "approved"
    demo.approved_at = utcnow()

    db.add(AuditLog(
        tenant_id=tenant.id, event="tenant.provisioned_from_demo",
        detail=f"request_id={request_id} email={demo.email}",
    ))
    await db.commit()

    try:
        await send_email(
            demo.email,
            "Welcome to semelpass",
            f"Your semelpass tenant has been provisioned.\n\nTenant: {name}\nSlug: {slug}\n\nWe will be in touch with next steps.",
            f"""<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#FDF6EC;padding:32px;border-radius:4px;">
<h2 style="color:#111;font-family:Georgia,serif;">Welcome to semelpass</h2>
<p style="color:#333;">Your tenant has been provisioned.</p>
<p style="color:#333;"><strong>Tenant:</strong> {name}<br><strong>Slug:</strong> {slug}</p>
<p style="color:#333;">You can now sign in to your tenant portal:</p><p style="margin:16px 0;"><a href="https://semelpass.com/portal/login" style="background:#C41E3A;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-family:Georgia,serif;">Sign in to Portal &rarr;</a></p><p style="color:#555;font-size:13px;">Your integration guide is waiting inside — most teams are live the same day.</p>
<p style="color:#C41E3A;font-size:11px;margin-top:24px;">semelpass &mdash; sovereign authentication</p>
</div>""",
        )
    except Exception as exc:
        logger.error("Welcome email failed: %s", exc)

    return {"status": "approved", "tenant_id": tenant.id, "slug": slug}


# ── POST /admin/demo-requests/{id}/reject ─────────────────────────────────────

@router.post("/demo-requests/{request_id}/reject", dependencies=[Depends(require_admin)])
async def reject_demo_request(
    request_id: str,
    db: AsyncSession = Depends(get_master_session),
):
    result = await db.execute(
        select(DemoRequest).where(
            DemoRequest.id == request_id, DemoRequest.status == "pending"
        )
    )
    demo = result.scalar_one_or_none()
    if not demo:
        raise HTTPException(status_code=404, detail="Not found or already processed")
    demo.status = "rejected"
    return {"status": "rejected"}




# ── GET /admin/integrity ──────────────────────────────────────────────────────

@router.get("/integrity", dependencies=[Depends(require_admin)])
async def admin_integrity_status():
    """Return page integrity check status from Redis."""
    r = _redis()
    try:
        raw = await r.get("semelpass:integrity:status")
    finally:
        await r.aclose()

    if not raw:
        return {
            "status":           "no_data",
            "message":          "No integrity check has run yet.",
            "last_checked":     None,
            "baseline_created": None,
            "pages":            [],
        }

    try:
        return json.loads(raw)
    except Exception:
        return {"status": "error", "message": "Could not parse integrity data", "pages": []}

# ── GET /admin/audit-log ──────────────────────────────────────────────────────

@router.get("/audit-log", dependencies=[Depends(require_admin)])
async def get_audit_log(
    tenant_id: Optional[str] = None,
    event:     Optional[str] = None,
    limit:     int            = 100,
    db: AsyncSession = Depends(get_master_session),
):
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 500))
    if tenant_id: q = q.where(AuditLog.tenant_id == tenant_id)
    if event:     q = q.where(AuditLog.event     == event)
    result = await db.execute(q)
    return [
        {
            "id": l.id, "tenant_id": l.tenant_id,
            "event": l.event, "detail": l.detail,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat(),
        }
        for l in result.scalars().all()
    ]
