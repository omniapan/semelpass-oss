// src/portal/pages/Login.jsx
// semelpass-OSS — Tenant Portal Login
// OTP flow: email → code → sp_portal_session cookie

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { C, F } from "../../shared/theme.js";

export default function Login() {
  const [step, setStep]       = useState("email"); // "email" | "code"
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const { setTenant }         = useAuth();
  const navigate              = useNavigate();

  // Step 1 — send OTP
  const handleEmailSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/portal/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always 202 — move to code step regardless
      setStep("code");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify code
  const handleCodeSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/portal/api/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      if (!r.ok) {
        setError("Invalid or expired code. Check your inbox and try again.");
        return;
      }
      // Fetch tenant info and set context
      const me = await fetch("/portal/api/me", { credentials: "include" });
      if (me.ok) {
        setTenant(await me.json());
        navigate("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Input handler for 6-digit code — auto-submit at 6 digits
  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    if (val.length === 6) {
      setTimeout(() => handleCodeSubmit(), 0);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Logo */}
      <img
        src="/portal/color-logo.png"
        alt="semelpass"
        style={{ width: 72, height: 72, marginBottom: 20, mixBlendMode: "multiply" }}
        onError={(e) => { e.target.style.display = "none"; }}
      />

      {/* Heading */}
      <h1 style={{ fontFamily: F.heading, fontStyle: "italic", fontSize: 32, color: C.text, margin: "0 0 8px" }}>
        Welcome.
      </h1>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, margin: "0 0 32px" }}>
        Tenant Portal — sign in with your contact email
      </p>

      {/* Card */}
      <div style={{
        width: 360,
        background: C.surface,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: "32px 28px",
      }}>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit}>
            <label style={labelStyle}>EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
              placeholder="you@yourcompany.com"
              autoFocus
              style={inputStyle}
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" disabled={loading || !email.trim()} style={btnStyle(loading || !email.trim())}>
              {loading ? "Sending…" : "Send Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit}>
            <label style={labelStyle}>6-DIGIT CODE</label>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.muted, margin: "0 0 12px" }}>
              Sent to <strong>{email}</strong>
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              autoFocus
              style={{ ...inputStyle, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.3em", textAlign: "center" }}
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" disabled={loading || code.length < 6} style={btnStyle(loading || code.length < 6)}>
              {loading ? "Verifying…" : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              style={{ display: "block", width: "100%", marginTop: 8, padding: "9px 0", background: "transparent", border: "none", color: C.muted, fontFamily: F.body, fontSize: 12, cursor: "pointer" }}
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <p style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 28 }}>
        protected by semelpass — omniapan ai, inc.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const labelStyle = {
  display: "block",
  fontFamily: "system-ui, sans-serif",
  fontSize: 10,
  fontWeight: 600,
  color: "#8B7355",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
  color: "#2C1810",
  background: "#FDF6EC",
  border: "1px solid #DDD0BB",
  borderRadius: 8,
  outline: "none",
  marginBottom: 16,
};

const btnStyle = (disabled) => ({
  display: "block",
  width: "100%",
  padding: "11px 0",
  background: disabled ? "#DDD0BB" : "#C41E3A",
  color: disabled ? "#8B7355" : "#fff",
  border: "none",
  borderRadius: 8,
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "background 0.15s",
});

const errorStyle = {
  fontFamily: "system-ui, sans-serif",
  fontSize: 12,
  color: "#C41E3A",
  marginBottom: 12,
};
