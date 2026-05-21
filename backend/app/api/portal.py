# app/api/portal.py
# semelpass-OSS — Tenant Portal API
# Phase 2 Block 4 | Rev 35
# Routes: /portal/login · /portal/login/verify · /portal/logout
#         /portal/me · /portal/stats · /portal/app · /portal/app/rotate-secret
#         /portal/audit-log · /portal/health

import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.config import get_settings
from app.core.database import get_master_session
from app.models.master import Tenant, User, App, AuditLog, utcnow
from app.services.email import send_otp_email

log = logging.getLogger(__name__)
router = APIRouter(prefix="/portal", tags=["portal"])
settings = get_settings()

# ---------------------------------------------------------------------------
# Redis helpers
# ---------------------------------------------------------------------------

def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_full_url, decode_responses=True)


PORTAL_SESSION_TTL = 60 * 60 * 8   # 8 hours
PORTAL_OTP_TTL     = 60 * 10       # 10 minutes

PORTAL_SESSION_PREFIX = "portal_session:"
PORTAL_OTP_PREFIX     = "portal_otp:"


async def _get_portal_session(
    sp_portal_session: str | None = Cookie(default=None),
) -> str:
    """Dependency — validates sp_portal_session cookie, returns tenant_id."""
    if not sp_portal_session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    r = _redis()
    try:
        tenant_id = await r.get(f"{PORTAL_SESSION_PREFIX}{sp_portal_session}")
    finally:
        await r.aclose()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Session expired")
    return tenant_id


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str


class VerifyRequest(BaseModel):
    email: str
    code: str


# ---------------------------------------------------------------------------
# POST /portal/login
# ---------------------------------------------------------------------------

@router.post("/login", status_code=202)
async def portal_login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_master_session),
):
    """
    Send OTP to tenant contact_email.
    Always returns 202 — never reveals whether email is registered.
    OTP stored in Redis (portal has no app_id — not using OTPSession table).
    """
    email = body.email.lower().strip()
    # Rate limit: 20 OTP sends per email per hour (silent — OWASP A04)
    _rl = _redis()
    try:
        rl_key = "ratelimit:otp:" + email
        rl_count = await _rl.incr(rl_key)
        if rl_count == 1:
            await _rl.expire(rl_key, 3600)
        if rl_count > 20:
            return {"detail": "If that address is registered, a code is on its way."}
    finally:
        await _rl.aclose()

    result = await db.execute(
        select(User).join(Tenant).where(
            User.email == email,
            User.is_active == True,
            Tenant.is_active == True,
        )
    )
    user = result.scalar_one_or_none()

    code = str(secrets.randbelow(900000) + 100000)  # 6-digit

    if user:
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        r = _redis()
        try:
            await r.set(f"{PORTAL_OTP_PREFIX}{email}", code_hash, ex=PORTAL_OTP_TTL)
        finally:
            await r.aclose()
        try:
            await send_otp_email(email, code)
        except Exception:
            log.exception("Portal OTP email failed for %s", email)

    return {"detail": "If that address is registered, a code is on its way."}


# ---------------------------------------------------------------------------
# POST /portal/login/verify
# ---------------------------------------------------------------------------

@router.post("/login/verify")
async def portal_login_verify(
    body: VerifyRequest,
    response: Response,
    db: AsyncSession = Depends(get_master_session),
):
    """Verify OTP from Redis → set sp_portal_session cookie."""
    INVALID = HTTPException(status_code=401, detail="Invalid or expired code")

    email = body.email.lower().strip()

    result = await db.execute(
        select(User).join(Tenant).where(
            User.email == email,
            User.is_active == True,
            Tenant.is_active == True,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise INVALID

    r = _redis()
    try:
        stored_hash = await r.get(f"{PORTAL_OTP_PREFIX}{email}")
        if not stored_hash:
            raise INVALID

        submitted_hash = hashlib.sha256(body.code.strip().encode()).hexdigest()
        if not hmac.compare_digest(stored_hash, submitted_hash):
            raise INVALID

        # Consume OTP — one use only
        await r.delete(f"{PORTAL_OTP_PREFIX}{email}")

        # Create portal session
        token = secrets.token_hex(32)
        await r.set(
            f"{PORTAL_SESSION_PREFIX}{token}",
            str(user.tenant_id),
            ex=PORTAL_SESSION_TTL,
        )
    finally:
        await r.aclose()

    # Audit
    db.add(AuditLog(
        tenant_id=str(user.tenant_id),
        event="portal_login",
        detail=f"Portal session created for {email}",
    ))
    await db.commit()

    response.set_cookie(
        key="sp_portal_session",
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=PORTAL_SESSION_TTL,
    )
    return {"detail": "ok"}


# ---------------------------------------------------------------------------
# POST /portal/logout
# ---------------------------------------------------------------------------

@router.post("/logout")
async def portal_logout(
    response: Response,
    sp_portal_session: str | None = Cookie(default=None),
):
    """Delete Redis session + clear cookie."""
    if sp_portal_session:
        r = _redis()
        try:
            await r.delete(f"{PORTAL_SESSION_PREFIX}{sp_portal_session}")
        finally:
            await r.aclose()
    response.delete_cookie("sp_portal_session")
    return {"detail": "logged out"}


# ---------------------------------------------------------------------------
# GET /portal/me
# ---------------------------------------------------------------------------

@router.get("/me")
async def portal_me(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "id":            str(tenant.id),
        "name":          tenant.name,
        "slug":          tenant.slug,
        "contact_email": tenant.contact_email,
        "is_active":     tenant.is_active,
        "plan":               tenant.subscription_tier or "free",
        "subscription_status": tenant.subscription_status or "none",
        "created_at":          tenant.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# GET /portal/stats
# ---------------------------------------------------------------------------

@router.get("/stats")
async def portal_stats(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    now = datetime.now(timezone.utc)

    async def _count(event: str, days: int) -> int:
        since = now - timedelta(days=days)
        r = await db.execute(
            select(func.count()).where(
                and_(
                    AuditLog.tenant_id == tenant_id,
                    AuditLog.event == event,
                    AuditLog.created_at >= since,
                )
            )
        )
        return r.scalar() or 0

    sent_24h     = await _count("otp_sent",     1)
    sent_7d      = await _count("otp_sent",     7)
    sent_30d     = await _count("otp_sent",     30)
    verified_24h = await _count("otp_verified", 1)
    verified_7d  = await _count("otp_verified", 7)
    verified_30d = await _count("otp_verified", 30)

    def _rate(sent: int, verified: int) -> float:
        return round(verified / sent * 100, 1) if sent else 0.0

    apps_r = await db.execute(
        select(func.count()).where(
            App.tenant_id == tenant_id,
            App.is_active == True,
        )
    )
    active_apps = apps_r.scalar() or 0

    return {
        "otp_volume": {
            "sent_24h": sent_24h,
            "sent_7d":  sent_7d,
            "sent_30d": sent_30d,
        },
        "success_rate": {
            "rate_24h": _rate(sent_24h, verified_24h),
            "rate_7d":  _rate(sent_7d,  verified_7d),
            "rate_30d": _rate(sent_30d, verified_30d),
        },
        "active_apps": active_apps,
    }


# ---------------------------------------------------------------------------
# GET /portal/app
# ---------------------------------------------------------------------------

@router.get("/app")
async def portal_app(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    """Single app for tenant. Secret not returned — use rotate-secret to reveal."""
    result = await db.execute(
        select(App)
        .where(App.tenant_id == tenant_id)
        .order_by(App.created_at.asc())
        .limit(1)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="No app found for this tenant")

    return {
        "id":        str(app.id),
        "name":      app.name,
        "slug":      app.slug,
        "is_active": app.is_active,
        "created_at": app.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# POST /portal/app/rotate-secret
# ---------------------------------------------------------------------------

@router.post("/app/rotate-secret")
async def portal_app_rotate_secret(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    """Generate new HMAC secret. Returned ONCE — never stored in plaintext."""
    result = await db.execute(
        select(App)
        .where(App.tenant_id == tenant_id)
        .order_by(App.created_at.asc())
        .limit(1)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="No app found")

    new_secret = secrets.token_hex(32)
    app.hmac_secret = new_secret
    await db.commit()

    db.add(AuditLog(
        tenant_id=tenant_id,
        event="app_secret_rotated",
        detail=f"HMAC secret rotated for app {app.id}",
    ))
    await db.commit()

    return {
        "app_id":  str(app.id),
        "secret":  new_secret,
        "warning": "Store this secret now. It will not be shown again.",
    }



# ---------------------------------------------------------------------------
# GET /portal/apps  — list all apps (commercial: multiple, free: one)
# ---------------------------------------------------------------------------
@router.get("/apps")
async def portal_apps_list(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    result = await db.execute(
        select(App)
        .where(App.tenant_id == tenant_id)
        .where(App.is_active == True)
        .order_by(App.created_at.asc())
    )
    apps = result.scalars().all()
    return [
        {"id": str(a.id), "name": a.name, "slug": a.slug,
         "is_active": a.is_active, "created_at": a.created_at.isoformat()}
        for a in apps
    ]

# ---------------------------------------------------------------------------
# POST /portal/app  — create app with tier enforcement
# ---------------------------------------------------------------------------
class CreateAppBody(BaseModel):
    name:            str
    callback_url:    str
    allowed_domains: str

@router.post("/app", status_code=201)
async def portal_create_app(
    body: CreateAppBody,
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    from sqlalchemy import func as _func
    import re as _re

    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Tier enforcement: free = 1 app max
    if not tenant.subscription_tier:
        count_result = await db.execute(
            select(_func.count()).select_from(App)
            .where(App.tenant_id == tenant_id)
            .where(App.is_active == True)
        )
        if (count_result.scalar() or 0) >= 1:
            raise HTTPException(status_code=403, detail={
                "code":        "tier_limit_reached",
                "message":     "Free plan is limited to 1 app. Upgrade to add more.",
                "upgrade_url": "/portal/billing",
            })

    # Generate unique slug
    base_slug = _re.sub(r"[^a-z0-9\-]", "", body.name.lower().strip().replace(" ", "-"))[:50] or "app"
    existing_slugs = (await db.execute(select(App.slug).where(App.tenant_id == tenant_id))).scalars().all()
    slug, i = base_slug, 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{i}"; i += 1

    new_secret = secrets.token_hex(32)
    app = App(
        tenant_id=tenant_id, name=body.name.strip()[:255], slug=slug,
        callback_url=body.callback_url.strip(),
        allowed_domains=body.allowed_domains.strip(),
        hmac_secret=new_secret, is_active=True,
    )
    db.add(app)
    await db.flush()
    db.add(AuditLog(tenant_id=tenant_id, app_id=str(app.id),
                    event="app.created", detail=f"App '{app.name}' created via portal"))
    await db.commit()

    return {
        "id": str(app.id), "name": app.name, "slug": app.slug,
        "is_active": app.is_active, "created_at": app.created_at.isoformat(),
        "secret":  new_secret,
        "warning": "Store this secret now — it will not be shown again.",
    }

# ---------------------------------------------------------------------------
# GET /portal/audit-log
# ---------------------------------------------------------------------------

@router.get("/audit-log")
async def portal_audit_log(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
    event: str | None = None,
    limit: int = 50,
):
    """Tenant-scoped audit log. Free gate: 30-day retention."""
    limit = min(max(limit, 1), 250)
    since = datetime.now(timezone.utc) - timedelta(days=30)

    filters = [
        AuditLog.tenant_id == tenant_id,
        AuditLog.created_at >= since,
    ]
    if event:
        filters.append(AuditLog.event == event)

    result = await db.execute(
        select(AuditLog)
        .where(and_(*filters))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()

    return {
        "retention_days": 30,
        "plan": "free",
        "rows": [
            {
                "id":         str(r.id),
                "event":      r.event,
                "detail":     r.detail,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# GET /portal/health
# ---------------------------------------------------------------------------

@router.get("/health")
async def portal_health(
    tenant_id: str = Depends(_get_portal_session),
):
    """Authenticated health ping — confirms portal session is valid."""
    return {"status": "ok", "tenant_id": tenant_id}


# ---------------------------------------------------------------------------
# Billing schemas
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    tier: str
    billing_cycle: str


# ---------------------------------------------------------------------------
# GET /portal/billing
# ---------------------------------------------------------------------------

@router.get("/billing")
async def portal_billing_status(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    """Return current subscription status for tenant."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "subscription_tier":   tenant.subscription_tier,
        "billing_cycle":       tenant.billing_cycle,
        "subscription_status": tenant.subscription_status or "none",
        "has_subscription":    bool(tenant.stripe_subscription_id),
    }


# ---------------------------------------------------------------------------
# POST /portal/billing/checkout
# ---------------------------------------------------------------------------

@router.post("/billing/checkout")
async def portal_billing_checkout(
    body: CheckoutRequest,
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    """
    Create Stripe Checkout Session for new subscription.
    Returns {checkout_url} — frontend redirects to it.
    Stripe collects payment method — no card data touches our server.
    """
    import stripe as _stripe
    from app.services.billing_service import get_price_id, _ensure_stripe_customer, _get_tenant

    try:
        price_id = get_price_id(body.tier, body.billing_cycle)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    tenant = await _get_tenant(db, tenant_id)

    if tenant.stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail="Already subscribed — use Manage Billing to make changes",
        )

    customer_id = await _ensure_stripe_customer(tenant)
    await db.commit()

    session = _stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url="https://semelpass.com/portal/billing?checkout=success",
        cancel_url="https://semelpass.com/portal/billing?checkout=cancelled",
        metadata={
            "tenant_id":     tenant_id,
            "tenant_slug":   tenant.slug,
            "tier":          body.tier,
            "billing_cycle": body.billing_cycle,
        },
    )

    return {"checkout_url": session.url}


# ---------------------------------------------------------------------------
# POST /portal/billing/customer-portal
# ---------------------------------------------------------------------------

@router.post("/billing/customer-portal")
async def portal_billing_customer_portal(
    tenant_id: str = Depends(_get_portal_session),
    db: AsyncSession = Depends(get_master_session),
):
    """
    Create Stripe Customer Portal session for existing subscribers.
    Returns {portal_url} — frontend redirects to it.
    Handles: invoices, payment method, cancel, upgrade/downgrade.
    NOTE: Stripe Customer Portal must be enabled in Stripe Dashboard
          → Settings → Billing → Customer Portal
    """
    import stripe as _stripe

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant or not tenant.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    portal_session = _stripe.billing_portal.Session.create(
        customer=tenant.stripe_customer_id,
        return_url="https://semelpass.com/portal/billing",
    )

    return {"portal_url": portal_session.url}
