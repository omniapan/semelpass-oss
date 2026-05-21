"""
billing_service.py
semelpass-oss — Stripe billing service
Handles subscription lifecycle: self_hosted + managed tiers.

Tiers:
  self_hosted — customer runs it, flat license fee, removes AGPL obligation
  managed     — semelpass.com runs it for the customer

RECON → BACKUP → VERIFY → EXECUTE → VALIDATE
"""

import stripe
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import get_settings
from app.models.master import Tenant

logger   = logging.getLogger(__name__)
settings = get_settings()

# ── configure stripe ──────────────────────────────────────────────────────────
stripe.api_key = settings.stripe_secret_key

# ── price map — tier × billing_cycle ─────────────────────────────────────────
STRIPE_PRICE_MAP: dict[str, dict[str, str]] = {
    "self_hosted": {
        "monthly": settings.stripe_price_self_hosted_monthly,
        "annual":  settings.stripe_price_self_hosted_annual,
        "2year":   settings.stripe_price_self_hosted_2year,
        "3year":   settings.stripe_price_self_hosted_3year,
    },
    "managed": {
        "monthly": settings.stripe_price_managed_monthly,
        "annual":  settings.stripe_price_managed_annual,
        "2year":   settings.stripe_price_managed_2year,
        "3year":   settings.stripe_price_managed_3year,
    },
}

VALID_TIERS  = {"self_hosted", "managed"}
VALID_CYCLES = {"monthly", "annual", "2year", "3year"}


# ── helpers ───────────────────────────────────────────────────────────────────

def get_price_id(tier: str, billing_cycle: str) -> str:
    """Return Stripe price_id for tier + billing_cycle. Raises ValueError on bad input."""
    if tier not in VALID_TIERS:
        raise ValueError(f"Invalid tier: {tier!r}. Must be one of {VALID_TIERS}")
    if billing_cycle not in VALID_CYCLES:
        raise ValueError(f"Invalid billing_cycle: {billing_cycle!r}. Must be one of {VALID_CYCLES}")
    return STRIPE_PRICE_MAP[tier][billing_cycle]


async def _get_tenant(db: AsyncSession, tenant_id: str) -> Tenant:
    """Fetch tenant by ID. Raises ValueError if not found."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise ValueError(f"Tenant not found: {tenant_id}")
    return tenant


async def _ensure_stripe_customer(tenant: Tenant) -> str:
    """
    Return existing stripe_customer_id or create a new Stripe customer.
    Does NOT commit — caller must commit.
    """
    if tenant.stripe_customer_id:
        return tenant.stripe_customer_id

    customer = stripe.Customer.create(
        email=tenant.contact_email or "",
        name=tenant.name,
        metadata={
            "tenant_id":   tenant.id,
            "tenant_slug": tenant.slug,
            "product":     "semelpass-oss",
        },
    )
    tenant.stripe_customer_id = customer.id
    logger.info("Created Stripe customer %s for tenant %s", customer.id, tenant.id)
    return customer.id


# ── public API ────────────────────────────────────────────────────────────────

async def create_tenant_subscription(
    db: AsyncSession,
    tenant_id: str,
    tier: str,
    billing_cycle: str,
) -> dict:
    """
    Create a Stripe subscription for a tenant.
    Returns {subscription_id, status, tier, billing_cycle}.
    Raises ValueError if tenant already has a subscription.
    """
    price_id = get_price_id(tier, billing_cycle)
    tenant   = await _get_tenant(db, tenant_id)

    if tenant.stripe_subscription_id:
        raise ValueError(
            f"Tenant {tenant_id} already has subscription "
            f"{tenant.stripe_subscription_id} — cancel first or use update."
        )

    customer_id = await _ensure_stripe_customer(tenant)

    subscription = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        metadata={
            "tenant_id":     tenant_id,
            "tenant_slug":   tenant.slug,
            "tier":          tier,
            "billing_cycle": billing_cycle,
        },
    )

    tenant.stripe_subscription_id = subscription.id
    tenant.subscription_tier       = tier
    tenant.billing_cycle           = billing_cycle
    tenant.subscription_status     = subscription.status

    await db.commit()
    logger.info(
        "Created subscription %s (%s/%s) for tenant %s",
        subscription.id, tier, billing_cycle, tenant_id,
    )
    return {
        "subscription_id": subscription.id,
        "status":          subscription.status,
        "tier":            tier,
        "billing_cycle":   billing_cycle,
    }


async def cancel_subscription(db: AsyncSession, tenant_id: str) -> dict:
    """
    Schedule subscription cancellation at period end (not immediate).
    Returns {subscription_id, status: 'cancelling'}.
    """
    tenant = await _get_tenant(db, tenant_id)

    if not tenant.stripe_subscription_id:
        raise ValueError(f"Tenant {tenant_id} has no active subscription")

    subscription = stripe.Subscription.modify(
        tenant.stripe_subscription_id,
        cancel_at_period_end=True,
    )

    tenant.subscription_status = "cancelling"
    await db.commit()
    logger.info(
        "Scheduled cancellation for subscription %s tenant %s",
        subscription.id, tenant_id,
    )
    return {
        "subscription_id": subscription.id,
        "status":          "cancelling",
    }


async def update_subscription(
    db: AsyncSession,
    tenant_id: str,
    new_tier: str,
    billing_cycle: str,
) -> dict:
    """
    Upgrade or downgrade tier/cycle with proration.
    Returns {subscription_id, status, tier, billing_cycle}.
    """
    price_id = get_price_id(new_tier, billing_cycle)
    tenant   = await _get_tenant(db, tenant_id)

    if not tenant.stripe_subscription_id:
        raise ValueError(f"Tenant {tenant_id} has no active subscription to update")

    subscription = stripe.Subscription.retrieve(tenant.stripe_subscription_id)
    item_id      = subscription["items"]["data"][0]["id"]

    updated = stripe.Subscription.modify(
        tenant.stripe_subscription_id,
        items=[{"id": item_id, "price": price_id}],
        proration_behavior="create_prorations",
        metadata={
            "tier":          new_tier,
            "billing_cycle": billing_cycle,
        },
    )

    tenant.subscription_tier   = new_tier
    tenant.billing_cycle       = billing_cycle
    tenant.subscription_status = updated.status

    await db.commit()
    logger.info(
        "Updated subscription %s → %s/%s for tenant %s",
        updated.id, new_tier, billing_cycle, tenant_id,
    )
    return {
        "subscription_id": updated.id,
        "status":          updated.status,
        "tier":            new_tier,
        "billing_cycle":   billing_cycle,
    }


# ── webhook event handlers ────────────────────────────────────────────────────

async def _handle_subscription_created(db: AsyncSession, subscription: dict) -> None:
    tenant_id = subscription.get("metadata", {}).get("tenant_id")
    if not tenant_id:
        logger.warning("subscription.created — no tenant_id in metadata, skipping")
        return
    tenant = await _get_tenant(db, tenant_id)
    tenant.stripe_subscription_id = subscription["id"]
    tenant.subscription_status    = subscription["status"]
    tenant.subscription_tier      = subscription.get("metadata", {}).get("tier") or tenant.subscription_tier
    tenant.billing_cycle           = subscription.get("metadata", {}).get("billing_cycle") or tenant.billing_cycle
    await db.commit()
    logger.info("subscription.created handled for tenant %s", tenant_id)


async def _handle_subscription_updated(db: AsyncSession, subscription: dict) -> None:
    tenant_id = subscription.get("metadata", {}).get("tenant_id")
    if not tenant_id:
        logger.warning("subscription.updated — no tenant_id in metadata, skipping")
        return
    tenant = await _get_tenant(db, tenant_id)
    # cancel_at_period_end → show as cancelling in our system
    if subscription.get("cancel_at_period_end"):
        tenant.subscription_status = "cancelling"
    else:
        tenant.subscription_status = subscription["status"]
    await db.commit()
    logger.info(
        "subscription.updated handled for tenant %s status=%s",
        tenant_id, tenant.subscription_status,
    )


async def _handle_subscription_deleted(db: AsyncSession, subscription: dict) -> None:
    tenant_id = subscription.get("metadata", {}).get("tenant_id")
    if not tenant_id:
        logger.warning("subscription.deleted — no tenant_id in metadata, skipping")
        return
    tenant = await _get_tenant(db, tenant_id)
    tenant.stripe_subscription_id = None
    tenant.subscription_status    = "cancelled"
    tenant.subscription_tier      = None
    tenant.billing_cycle           = None
    await db.commit()
    logger.info("subscription.deleted — tenant %s downgraded to free", tenant_id)


async def _handle_payment_succeeded(db: AsyncSession, invoice: dict) -> None:
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    result = await db.execute(
        select(Tenant).where(Tenant.stripe_subscription_id == sub_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        logger.warning("invoice.payment_succeeded — no tenant for sub %s", sub_id)
        return
    tenant.subscription_status = "active"
    await db.commit()
    logger.info("invoice.payment_succeeded — tenant %s status=active", tenant.id)


async def _handle_payment_failed(db: AsyncSession, invoice: dict) -> None:
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    result = await db.execute(
        select(Tenant).where(Tenant.stripe_subscription_id == sub_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        logger.warning("invoice.payment_failed — no tenant for sub %s", sub_id)
        return
    tenant.subscription_status = "past_due"
    await db.commit()
    logger.info("invoice.payment_failed — tenant %s status=past_due", tenant.id)


# ── webhook dispatcher ────────────────────────────────────────────────────────

async def handle_webhook(db: AsyncSession, payload: bytes, sig_header: str) -> dict:
    """
    Verify Stripe signature + dispatch to handler.
    Raises stripe.error.SignatureVerificationError on bad sig.
    Returns {received: True} on success.
    """
    event = stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )

    handlers = {
        "customer.subscription.created": _handle_subscription_created,
        "customer.subscription.updated": _handle_subscription_updated,
        "customer.subscription.deleted": _handle_subscription_deleted,
        "invoice.payment_succeeded":     _handle_payment_succeeded,
        "invoice.payment_failed":        _handle_payment_failed,
    }

    handler = handlers.get(event["type"])
    if handler:
        await handler(db, event["data"]["object"])
    else:
        logger.debug("Unhandled webhook event: %s", event["type"])

    return {"received": True}
