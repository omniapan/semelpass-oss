"""
api/billing.py
semelpass-oss — Stripe webhook endpoint

POST /v1/billing/webhook
  Unauthenticated — Stripe calls this directly.
  Signature verified via whsec_ secret (stripe.Webhook.construct_event).
  Returns 200 {received: true} on success.
  Returns 400 on bad signature.
"""

import stripe
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_master_session
from app.services.billing_service import handle_webhook

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_master_session),
):
    """
    Stripe webhook receiver.
    Verifies signature — rejects anything without valid whsec_ signature.
    """
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = await handle_webhook(db, payload, sig_header)
        return result
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook — invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError as e:
        logger.error("Webhook handler ValueError: %s", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Webhook handler unexpected error: %s", str(e))
        raise HTTPException(status_code=500, detail="Webhook processing error")
