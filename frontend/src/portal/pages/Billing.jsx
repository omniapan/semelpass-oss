// src/portal/pages/Billing.jsx
// semelpass-OSS — Tenant Portal — Billing
// M4 | Rev 41

import { useState, useEffect } from "react";
import { C, F } from "../../shared/theme.js";

const TIERS = {
  self_hosted: {
    label: "Self-Hosted",
    description: "You run it on your own infrastructure. Removes AGPL v3 obligation.",
    prices: {
      monthly: { label: "Monthly",   amount: "$149/mo"    },
      annual:  { label: "Annual",    amount: "$1,490/yr"  },
      "2year": { label: "2-Year",    amount: "$2,682/2yr" },
      "3year": { label: "3-Year",    amount: "$3,576/3yr" },
    },
  },
  managed: {
    label: "Managed",
    description: "We run it for you on semelpass.com. Zero infrastructure work on your end.",
    prices: {
      monthly: { label: "Monthly",   amount: "$349/mo"    },
      annual:  { label: "Annual",    amount: "$3,490/yr"  },
      "2year": { label: "2-Year",    amount: "$6,282/2yr" },
      "3year": { label: "3-Year",    amount: "$8,376/3yr" },
    },
  },
};

const CYCLE_ORDER = ["monthly", "annual", "2year", "3year"];

const STATUS_COLORS = {
  active:     C.green  || "#2d8c4e",
  cancelling: C.amber  || "#c07a00",
  past_due:   C.red,
  cancelled:  C.muted,
  none:       C.muted,
};

export default function Billing() {
  const [billing, setBilling]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [selectedTier, setTier]     = useState("self_hosted");
  const [selectedCycle, setCycle]   = useState("annual");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash]           = useState(null);

  // ── check for checkout return ─────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setFlash({ type: "success", msg: "Subscription activated — welcome aboard! 🎉" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "cancelled") {
      setFlash({ type: "info", msg: "Checkout cancelled — no charges made." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── fetch billing status ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/portal/api/billing", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => { setBilling(data); setLoading(false); })
      .catch(() => { setError("Failed to load billing status."); setLoading(false); });
  }, []);

  // ── subscribe → Stripe Checkout ──────────────────────────────────────────
  const handleSubscribe = async () => {
    setSubmitting(true);
    setFlash(null);
    try {
      const r = await fetch("/portal/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier, billing_cycle: selectedCycle }),
      });
      const data = await r.json();
      if (!r.ok) {
        setFlash({ type: "error", msg: data.detail || "Checkout failed." });
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      setFlash({ type: "error", msg: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── manage → Stripe Customer Portal ──────────────────────────────────────
  const handleManage = async () => {
    setSubmitting(true);
    setFlash(null);
    try {
      const r = await fetch("/portal/api/billing/customer-portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (!r.ok) {
        setFlash({ type: "error", msg: data.detail || "Could not open billing portal." });
        return;
      }
      window.location.href = data.portal_url;
    } catch {
      setFlash({ type: "error", msg: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── styles ────────────────────────────────────────────────────────────────
  const card = {
    background: C.surface,
    border: "1px solid " + C.border,
    borderRadius: 10,
    padding: "24px 28px",
    marginBottom: 20,
  };

  const label = {
    fontFamily: F.body,
    fontSize: 11,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 4,
  };

  const value = {
    fontFamily: F.body,
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
  };

  const btnPrimary = {
    padding: "10px 22px",
    background: C.red,
    color: "#fff",
    border: "none",
    borderRadius: 7,
    fontFamily: F.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: submitting ? "not-allowed" : "pointer",
    opacity: submitting ? 0.7 : 1,
  };

  const btnSecondary = {
    padding: "10px 22px",
    background: "transparent",
    color: C.text,
    border: "1px solid " + C.border,
    borderRadius: 7,
    fontFamily: F.body,
    fontSize: 13,
    fontWeight: 500,
    cursor: submitting ? "not-allowed" : "pointer",
    opacity: submitting ? 0.7 : 1,
  };

  const tierBtn = (t) => ({
    flex: 1,
    padding: "12px 0",
    background: selectedTier === t ? C.red : "transparent",
    color: selectedTier === t ? "#fff" : C.text,
    border: "1px solid " + (selectedTier === t ? C.red : C.border),
    borderRadius: 7,
    fontFamily: F.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  const cycleBtn = (cy) => ({
    padding: "8px 16px",
    background: selectedCycle === cy ? C.red : "transparent",
    color: selectedCycle === cy ? "#fff" : C.text,
    border: "1px solid " + (selectedCycle === cy ? C.red : C.border),
    borderRadius: 6,
    fontFamily: F.body,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ fontFamily: F.body, color: C.muted, fontSize: 14 }}>Loading billing…</div>
  );

  if (error) return (
    <div style={{ fontFamily: F.body, color: C.red, fontSize: 14 }}>{error}</div>
  );

  const hasSubscription = billing?.has_subscription;
  const status          = billing?.subscription_status || "none";
  const tier            = billing?.subscription_tier;
  const cycle           = billing?.billing_cycle;

  return (
    <div style={{ maxWidth: 640 }}>

      {/* Page title */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: F.heading, fontSize: 22, fontWeight: 700, color: C.text }}>
          Billing
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 4 }}>
          Manage your semelpass-oss license
        </div>
      </div>

      {/* Flash message */}
      {flash && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 20,
          fontFamily: F.body,
          fontSize: 13,
          background: flash.type === "success" ? "#e8f5ee"
                    : flash.type === "error"   ? "#fdecea"
                    : "#fef8ec",
          color: flash.type === "success" ? "#2d8c4e"
               : flash.type === "error"   ? C.red
               : "#7a5500",
          border: "1px solid " + (
            flash.type === "success" ? "#b8dfc9"
          : flash.type === "error"   ? "#f5c6c1"
          : "#f0dfa0"),
        }}>
          {flash.msg}
        </div>
      )}

      {/* Current plan */}
      <div style={card}>
        <div style={{ fontFamily: F.heading, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
          Current Plan
        </div>

        {hasSubscription ? (
          <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={label}>Plan</div>
              <div style={value}>
                {tier === "self_hosted" ? "Self-Hosted" : tier === "managed" ? "Managed" : tier}
              </div>
            </div>
            <div>
              <div style={label}>Billing</div>
              <div style={value}>{cycle || "—"}</div>
            </div>
            <div>
              <div style={label}>Status</div>
              <div style={{ ...value, color: STATUS_COLORS[status] || C.text }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted }}>
            No active subscription — you are on the <strong>Free</strong> plan.
          </div>
        )}

        {/* Manage button for existing subscribers */}
        {hasSubscription && (
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button style={btnPrimary} onClick={handleManage} disabled={submitting}>
              {submitting ? "Redirecting…" : "Manage Billing"}
            </button>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, alignSelf: "center" }}>
              Update payment method, view invoices, cancel or change plan
            </div>
          </div>
        )}
      </div>

      {/* Subscribe — only shown if no active subscription */}
      {!hasSubscription && (
        <div style={card}>
          <div style={{ fontFamily: F.heading, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            Choose a Plan
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginBottom: 20 }}>
            Flat fee — unlimited users, no per-MAU pricing.
          </div>

          {/* Tier selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={label}>License Type</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {Object.entries(TIERS).map(([t, info]) => (
                <button key={t} style={tierBtn(t)} onClick={() => setTier(t)}>
                  {info.label}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 8 }}>
              {TIERS[selectedTier].description}
            </div>
          </div>

          {/* Cycle selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={label}>Billing Cycle</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {CYCLE_ORDER.map((cy) => (
                <button key={cy} style={cycleBtn(cy)} onClick={() => setCycle(cy)}>
                  {TIERS[selectedTier].prices[cy].label}
                  <span style={{ marginLeft: 6, opacity: 0.75 }}>
                    {TIERS[selectedTier].prices[cy].amount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Subscribe CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button style={btnPrimary} onClick={handleSubscribe} disabled={submitting}>
              {submitting ? "Redirecting to Stripe…" : "Subscribe →"}
            </button>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted }}>
              Secure checkout via Stripe. Cancel anytime.
            </div>
          </div>
        </div>
      )}

      {/* Free tier info */}
      <div style={{ ...card, background: "transparent", borderStyle: "dashed" }}>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>
          <strong style={{ color: C.text }}>Free (AGPL v3)</strong> — unlimited self-hosting, forever.
          Commercial license removes the AGPL obligation for proprietary integrations.
          Questions? Email <span style={{ color: C.red }}>welcome@semelpass.com</span>
        </div>
      </div>

    </div>
  );
}
