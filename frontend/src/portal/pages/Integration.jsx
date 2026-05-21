// src/portal/pages/Integration.jsx
// semelpass-OSS — Tenant Portal: Integration
// Getting started guide · HMAC signing examples · live test console

import { useState } from "react";
import { C, F } from "../../shared/theme.js";
import { useAuth } from "../App.jsx";

// ---------------------------------------------------------------------------
// Code block component
// ---------------------------------------------------------------------------

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ position: "relative", marginBottom: 24 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#1A1210",
        borderRadius: "8px 8px 0 0",
        padding: "6px 14px",
      }}>
        <span style={{ fontFamily: F.mono, fontSize: 11, color: "#8B7355" }}>{lang}</span>
        <button
          onClick={handleCopy}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8B7355", fontFamily: F.body, fontSize: 11 }}
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: "16px 18px",
        background: "#221510",
        borderRadius: "0 0 8px 8px",
        fontFamily: F.mono,
        fontSize: 13,
        color: "#E8D8C0",
        overflowX: "auto",
        lineHeight: 1.6,
      }}>
        {code}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step header
// ---------------------------------------------------------------------------

function Step({ n, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0 10px" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: C.red, color: "#fff",
        fontFamily: F.body, fontSize: 13, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {n}
      </div>
      <div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.text }}>{title}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function Section({ children }) {
  return (
    <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "28px 0 12px" }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live test console
// ---------------------------------------------------------------------------

function TestConsole() {
  const { tenant } = useAuth();
  const [appId, setAppId]     = useState("");
  const [secret, setSecret]   = useState("");
  const [toEmail, setToEmail] = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Build HMAC signature client-side (demo only — in production never expose secret in browser)
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const msgData = encoder.encode(`${appId}:${toEmail}`);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

      const r = await fetch("/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, email: toEmail, signature: sigHex }),
      });
      const data = await r.json();
      setResult({ status: r.status, data });
    } catch (e) {
      setResult({ status: "error", data: { detail: e.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 24px" }}>
      <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        Live Test Console
      </div>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginBottom: 20 }}>
        Fire a real OTP send. Never use your production secret in a browser — rotate after testing.
      </div>
      {[
        { label: "APP ID", val: appId, setter: setAppId, ph: "your-app-id" },
        { label: "HMAC SECRET", val: secret, setter: setSecret, ph: "your-secret (rotate after test)" },
        { label: "SEND TO EMAIL", val: toEmail, setter: setToEmail, ph: "test@example.com" },
      ].map(({ label, val, setter, ph }) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label style={labelStyle}>{label}</label>
          <input
            value={val}
            onChange={(e) => setter(e.target.value)}
            placeholder={ph}
            style={inputStyle}
          />
        </div>
      ))}
      <button
        onClick={handleSend}
        disabled={loading || !appId || !secret || !toEmail}
        style={{
          padding: "9px 20px",
          background: !loading && appId && secret && toEmail ? C.red : C.border,
          color: !loading && appId && secret && toEmail ? "#fff" : C.muted,
          border: "none",
          borderRadius: 7,
          fontFamily: F.body,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: result ? 16 : 0,
        }}
      >
        {loading ? "Sending…" : "Send OTP"}
      </button>

      {result && (
        <div style={{
          background: result.status === 202 ? `${C.green}10` : `${C.red}10`,
          border: `1px solid ${result.status === 202 ? C.green : C.red}40`,
          borderRadius: 7,
          padding: "12px 14px",
          fontFamily: F.mono,
          fontSize: 12,
          color: C.text,
        }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>HTTP {result.status}</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration page
// ---------------------------------------------------------------------------

export default function Integration() {
  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: F.heading, fontStyle: "italic", fontSize: 26, color: C.text, margin: 0 }}>
          Integration
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
          Add OTP auth to your app in minutes
        </p>
      </div>

      {/* Overview */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>
          How it works
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
          Your backend signs OTP requests with your HMAC secret. semelpass sends the one-time code to your user's email. Your backend verifies the code. No sessions, no passwords — just signed requests.
        </div>
      </div>

      {/* Step 1 */}
      <Step n={1} title="Get your App ID and HMAC secret" />
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 8px" }}>
        Go to <strong>My App</strong> to find your App ID. Use <strong>Rotate Secret</strong> to generate and copy your HMAC secret. Store it in your environment — never in code.
      </p>

      {/* Step 2 */}
      <Step n={2} title="Send an OTP" />
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 8px" }}>
        From your backend, sign <code style={{ fontFamily: F.mono }}>app_id:email</code> with your HMAC secret and POST to <code style={{ fontFamily: F.mono }}>/auth/otp/send</code>.
      </p>

      <Section>Node.js / TypeScript</Section>
      <CodeBlock lang="typescript" code={NODE_SEND} />

      <Section>Python</Section>
      <CodeBlock lang="python" code={PYTHON_SEND} />

      <Section>curl</Section>
      <CodeBlock lang="bash" code={CURL_SEND} />

      {/* Step 3 */}
      <Step n={3} title="Verify the code" />
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 8px" }}>
        When your user submits their 6-digit code, POST to <code style={{ fontFamily: F.mono }}>/auth/otp/verify</code>. A <code style={{ fontFamily: F.mono }}>200</code> means success.
      </p>

      <Section>Node.js / TypeScript</Section>
      <CodeBlock lang="typescript" code={NODE_VERIFY} />

      <Section>Python</Section>
      <CodeBlock lang="python" code={PYTHON_VERIFY} />

      {/* API reference */}
      <Step n={4} title="API reference" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
        {[
          { method: "POST", path: "/auth/otp/send",   desc: "Send OTP to user email. Returns 202." },
          { method: "POST", path: "/auth/otp/verify", desc: "Verify OTP code. Returns 200 on success." },
        ].map(({ method, path, desc }) => (
          <div key={path} style={{ display: "flex", gap: 16, padding: "14px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.red, minWidth: 40 }}>{method}</span>
            <code style={{ fontFamily: F.mono, fontSize: 13, color: C.text, flex: 1 }}>{path}</code>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted, flex: 2 }}>{desc}</span>
          </div>
        ))}
      </div>

      {/* Live test */}
      <Step n={5} title="Test it live" />
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 16px" }}>
        Fire a real OTP to verify your integration. Rotate your secret after any browser test.
      </p>
      <TestConsole />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const NODE_SEND = `import crypto from "crypto";

const APP_ID = process.env.SEMELPASS_APP_ID;
const SECRET = process.env.SEMELPASS_SECRET;
const BASE   = "https://otp.semelpass.ai"; // or your self-hosted URL

async function sendOtp(email: string): Promise<void> {
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(\`\${APP_ID}:\${email}\`)
    .digest("hex");

  const res = await fetch(\`\${BASE}/auth/otp/send\`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ app_id: APP_ID, email, signature: sig }),
  });
  // 202 = OTP on its way
  if (res.status !== 202) throw new Error(\`Unexpected status \${res.status}\`);
}`;

const NODE_VERIFY = `async function verifyOtp(email: string, code: string): Promise<boolean> {
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(\`\${APP_ID}:\${email}:\${code}\`)
    .digest("hex");

  const res = await fetch(\`\${BASE}/auth/otp/verify\`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ app_id: APP_ID, email, code, signature: sig }),
  });
  return res.status === 200; // 200 = verified ✓
}`;

const PYTHON_SEND = `import hmac, hashlib, os, httpx

APP_ID = os.environ["SEMELPASS_APP_ID"]
SECRET = os.environ["SEMELPASS_SECRET"].encode()
BASE   = "https://otp.semelpass.ai"

async def send_otp(email: str) -> None:
    msg = f"{APP_ID}:{email}".encode()
    sig = hmac.new(SECRET, msg, hashlib.sha256).hexdigest()

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE}/auth/otp/send",
            json={"app_id": APP_ID, "email": email, "signature": sig},
        )
    r.raise_for_status()  # 202 expected`;

const PYTHON_VERIFY = `async def verify_otp(email: str, code: str) -> bool:
    msg = f"{APP_ID}:{email}:{code}".encode()
    sig = hmac.new(SECRET, msg, hashlib.sha256).hexdigest()

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE}/auth/otp/verify",
            json={"app_id": APP_ID, "email": email, "code": code, "signature": sig},
        )
    return r.status_code == 200`;

const CURL_SEND = `# Generate signature (bash + openssl)
APP_ID="your-app-id"
SECRET="your-hmac-secret"
EMAIL="user@example.com"

SIG=$(echo -n "\${APP_ID}:\${EMAIL}" \\
  | openssl dgst -sha256 -hmac "\${SECRET}" \\
  | awk '{print $2}')

curl -s -o /dev/null -w "%{http_code}" \\
  -X POST https://otp.semelpass.ai/auth/otp/send \\
  -H "Content-Type: application/json" \\
  -d "{\"app_id\":\"\${APP_ID}\",\"email\":\"\${EMAIL}\",\"signature\":\"\${SIG}\"}"
# expects: 202`;

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const labelStyle = {
  display: "block",
  fontFamily: "system-ui, sans-serif",
  fontSize: 10,
  fontWeight: 600,
  color: "#8B7355",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontSize: 13,
  color: "#2C1810",
  background: "#FDF6EC",
  border: "1px solid #DDD0BB",
  borderRadius: 7,
  outline: "none",
};
