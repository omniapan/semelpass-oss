// src/portal/pages/MyApp.jsx
// semelpass-OSS — Tenant Portal: My App(s)
// Stage 1A: multi-app support + tier enforcement + app creation
import { useState, useEffect } from "react";
import { C, F } from "../../shared/theme.js";

function api(path, opts = {}) {
  return fetch(`/portal/api${path}`, { credentials: "include", ...opts });
}

// ---------------------------------------------------------------------------
// Upgrade Banner
// ---------------------------------------------------------------------------
function UpgradeBanner({ feature }) {
  return (
    <div style={{
      background: `${C.amber}15`, border: `1px solid ${C.amber}40`,
      borderRadius: 8, padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
    }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <span style={{ fontFamily: F.body, fontSize: 13, color: C.amber }}>
        <strong>{feature}</strong> is available on commercial plans.{" "}
        <a href="/portal/billing" style={{ color: C.red }}>Upgrade →</a>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add App Modal
// ---------------------------------------------------------------------------
function AddAppModal({ onClose, onCreated }) {
  const [name, setName]       = useState("");
  const [cbUrl, setCbUrl]     = useState("");
  const [domains, setDomains] = useState("");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !cbUrl.trim() || !domains.trim()) {
      setErr("All fields are required."); return;
    }
    setSaving(true); setErr("");
    try {
      const r = await api("/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), callback_url: cbUrl.trim(), allowed_domains: domains.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data?.detail?.message || data?.detail || "Failed to create app.");
        setSaving(false); return;
      }
      onCreated(data);
    } catch (e) {
      setErr("Network error. Try again."); setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "32px 36px", width: 480, maxWidth: "92vw",
      }}>
        <h3 style={{ fontFamily: F.heading, fontStyle: "italic", fontSize: 22, color: C.text, margin: "0 0 24px" }}>
          Add New App
        </h3>
        <Label>App Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Production App" />
        <Label>Callback URL</Label>
        <Input value={cbUrl} onChange={e => setCbUrl(e.target.value)} placeholder="https://app.example.com/auth/callback" />
        <Label>Allowed Domains <span style={{ color: C.muted, fontWeight: 400 }}>(comma-separated)</span></Label>
        <Input value={domains} onChange={e => setDomains(e.target.value)} placeholder="example.com, partner.com" />
        {err && <div style={{ color: C.red, fontFamily: F.body, fontSize: 12, marginBottom: 16 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>
            {saving ? "Creating…" : "Create App"}
          </button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App Card
// ---------------------------------------------------------------------------
function AppCard({ app, onSecretRotated }) {
  const [rotating, setRotating]         = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [secret, setSecret]             = useState(null);
  const [secretCopied, setSecretCopied] = useState(false);

  const handleRotate = async () => {
    setRotating(true); setSecretCopied(false);
    try {
      const r = await api("/app/rotate-secret", { method: "POST" });
      const data = await r.json();
      setSecret(data.secret);
      setConfirmRotate(false);
      if (onSecretRotated) onSecretRotated(app.id);
    } finally { setRotating(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: F.heading, fontStyle: "italic", fontSize: 20, color: C.text }}>{app.name}</div>
          <div style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, marginTop: 2 }}>{app.id}</div>
        </div>
        <div style={{
          background: app.is_active ? `${C.green}20` : `${C.amber}20`,
          color: app.is_active ? C.green : C.amber,
          fontFamily: F.body, fontSize: 11, fontWeight: 600,
          padding: "4px 10px", borderRadius: 20,
        }}>
          {app.is_active ? "Active" : "Inactive"}
        </div>
      </div>

      <Field label="APP ID"       value={app.id}                    mono copyable />
      <Field label="SLUG"         value={app.slug}                  mono />
      <Field label="CREATED"      value={_fmt(app.created_at)} />
      <Field label="OTP CHANNEL"  value="Email OTP" />
      <Field label="HMAC SECRET"  value="•••••••••••••••••••••••••••••••••••••••••••••" mono />

      {secret && (
        <div style={{
          background: `${C.green}10`, border: `1px solid ${C.green}40`,
          borderRadius: 8, padding: "16px 20px", margin: "16px 0",
        }}>
          <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 8 }}>
            ⚠️ New HMAC Secret — copy now, will not be shown again
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: 13, color: C.text,
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "10px 12px", wordBreak: "break-all", marginBottom: 12,
          }}>{secret}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleCopy} style={btnPrimary}>
              {secretCopied ? "Copied ✓" : "Copy Secret"}
            </button>
            <button onClick={() => setSecret(null)} style={btnGhost}>
              I've saved it — dismiss
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginBottom: 12 }}>
          Rotating the secret invalidates all existing sessions for this app.
        </div>
        {!confirmRotate ? (
          <button onClick={() => setConfirmRotate(true)} style={btnDanger}>Rotate Secret</button>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={handleRotate} disabled={rotating} style={btnDanger}>
              {rotating ? "Rotating…" : "Confirm Rotate"}
            </button>
            <button onClick={() => setConfirmRotate(false)} style={btnGhost}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New App Secret Banner (shown once after creation)
// ---------------------------------------------------------------------------
function NewAppSecret({ secret, onDismiss }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      background: `${C.green}10`, border: `1px solid ${C.green}40`,
      borderRadius: 10, padding: "20px 24px", marginBottom: 20,
    }}>
      <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.green, marginBottom: 8 }}>
        ✅ App created — copy your HMAC secret now
      </div>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginBottom: 12 }}>
        This secret will not be shown again. Store it securely before dismissing.
      </div>
      <div style={{
        fontFamily: F.mono, fontSize: 13, color: C.text,
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: "10px 12px", wordBreak: "break-all", marginBottom: 12,
      }}>{secret}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={btnPrimary}>
          {copied ? "Copied ✓" : "Copy Secret"}
        </button>
        <button onClick={onDismiss} style={btnGhost}>I've saved it — dismiss</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MyApp — main page
// ---------------------------------------------------------------------------
export default function MyApp() {
  const [apps, setApps]           = useState([]);
  const [plan, setPlan]           = useState("free");
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSecret, setNewSecret] = useState(null);

  const isCommercial = plan === "self_hosted" || plan === "managed";

  useEffect(() => {
    Promise.all([
      api("/apps").then(r => r.ok ? r.json() : []),
      api("/me").then(r => r.ok ? r.json() : {}),
    ]).then(([appList, me]) => {
      setApps(appList);
      setPlan(me.plan || "free");
      setLoading(false);
    });
  }, []);

  const handleCreated = (data) => {
    setApps(prev => [...prev, data]);
    setNewSecret(data.secret);
    setShowModal(false);
  };

  if (loading) {
    return <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, paddingTop: 40 }}>Loading…</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={pageHeading}>My Apps</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{
              fontFamily: F.body, fontSize: 11, fontWeight: 700,
              padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em",
              background: isCommercial ? `${C.green}20` : `${C.amber}15`,
              color: isCommercial ? C.green : C.amber,
            }}>
              {plan === "managed" ? "MANAGED" : plan === "self_hosted" ? "SELF-HOSTED" : "FREE"}
            </span>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>
              {isCommercial ? "Unlimited apps" : `${apps.length} / 1 app`}
            </span>
          </div>
        </div>

        {(isCommercial || apps.length < 1) ? (
          <button onClick={() => setShowModal(true)} style={btnPrimary}>
            {apps.length < 1 ? "Add Your App" : "+ Add App"}
          </button>
        ) : (
          <a href="/portal/billing" style={{
            ...btnPrimary, textDecoration: "none", display: "inline-block",
            background: "transparent", color: C.red, border: `1px solid ${C.red}`,
          }}>Upgrade to add more →</a>
        )}
      </div>

      {/* New app secret banner */}
      {newSecret && <NewAppSecret secret={newSecret} onDismiss={() => setNewSecret(null)} />}

      {/* App cards */}
      {apps.length === 0 ? (
        <div style={{
          background: C.surface, border: `1px dashed ${C.border}`,
          borderRadius: 10, padding: "40px 24px", textAlign: "center",
        }}>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.muted }}>
            No apps yet. Contact support to get started.
          </div>
        </div>
      ) : (
        apps.map(app => <AppCard key={app.id} app={app} />)
      )}

      {/* Commercial upgrade banners (free only) */}
      {!isCommercial && (
        <div style={{ marginTop: 24 }}>
          <UpgradeBanner feature="Multiple apps" />
          <UpgradeBanner feature="Auto-schedule secret rotation" />
          <UpgradeBanner feature="Webhooks" />
          <UpgradeBanner feature="White label branding" />
          <UpgradeBanner feature="Extended audit log (SOC2-ready)" />
        </div>
      )}

      {showModal && <AddAppModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------
function Field({ label, value, mono, copyable }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontFamily: mono ? F.mono : F.body, fontSize: mono ? 13 : 14, color: C.text }}>
          {value}
        </div>
        {copyable && (
          <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: F.body, fontSize: 11, padding: "2px 6px" }}>
            {copied ? "✓" : "copy"}
          </button>
        )}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>{children}</div>;
}

function Input({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} style={{
      width: "100%", boxSizing: "border-box",
      fontFamily: F.body, fontSize: 13, color: C.text,
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 7, padding: "9px 12px", marginBottom: 16, outline: "none",
    }} />
  );
}

function _fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const pageHeading = { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: 26, color: "#2C1810", margin: 0 };
const btnPrimary  = { padding: "9px 18px", background: "#C41E3A", color: "#fff", border: "none", borderRadius: 7, fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnDanger   = { padding: "9px 18px", background: "transparent", color: "#C41E3A", border: "1px solid #C41E3A", borderRadius: 7, fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnGhost    = { padding: "9px 18px", background: "transparent", color: "#8B7355", border: "1px solid #DDD0BB", borderRadius: 7, fontFamily: "system-ui, sans-serif", fontSize: 13, cursor: "pointer" };
