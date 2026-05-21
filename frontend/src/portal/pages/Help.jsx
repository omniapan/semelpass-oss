import React, { useState } from 'react'

const C = {
  bg:      '#FDF6EC',
  surface: '#FAF0E2',
  red:     '#C41E3A',
  redLt:   '#F5E8EB',
  text:    '#2C1810',
  muted:   '#7A5C52',
  border:  '#E8D8C8',
  green:   '#2D6A4F',
  greenLt: '#E8F5EF',
  amber:   '#B5451B',
  amberLt: '#FEF3EC',
  codeBg:  '#1C0F0A',
  codeFg:  '#FAF0E2',
}

const F = {
  heading: '"Playfair Display", Georgia, serif',
  body:    'system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", "Fira Code", Consolas, monospace',
}

const s = {
  page: {
    padding: '40px 48px 80px',
    maxWidth: '860px',
    fontFamily: F.body,
    color: C.text,
  },
  pageTitle: {
    fontFamily: F.heading,
    fontSize: '28px',
    fontWeight: '400',
    marginBottom: '6px',
  },
  pageSub: {
    color: C.muted,
    fontSize: '14px',
    marginBottom: '48px',
  },
  section: {
    marginBottom: '48px',
  },
  sectionTitle: {
    fontFamily: F.heading,
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid ' + C.border,
  },
  card: {
    background: C.surface,
    border: '1px solid ' + C.border,
    borderRadius: '10px',
    padding: '20px 24px',
    marginBottom: '12px',
  },
  stepRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  stepNum: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: C.red,
    color: '#fff',
    fontFamily: F.heading,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    marginTop: '1px',
  },
  stepBody: {
    flex: '1',
  },
  stepLabel: {
    fontWeight: '500',
    fontSize: '14px',
    marginBottom: '4px',
  },
  stepDesc: {
    color: C.muted,
    fontSize: '13px',
    lineHeight: '1.6',
  },
  code: {
    background: C.codeBg,
    color: C.codeFg,
    fontFamily: F.mono,
    fontSize: '13px',
    lineHeight: '1.7',
    padding: '16px 20px',
    borderRadius: '8px',
    overflowX: 'auto',
    margin: '12px 0',
    whiteSpace: 'pre',
    display: 'block',
  },
  inlineCode: {
    background: C.redLt,
    color: C.red,
    fontFamily: F.mono,
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  routeBlock: {
    border: '1px solid ' + C.border,
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  routeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: C.surface,
    borderBottom: '1px solid ' + C.border,
  },
  methodBadge: {
    background: C.red,
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: F.mono,
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  routePath: {
    fontFamily: F.mono,
    fontSize: '14px',
    fontWeight: '500',
  },
  routeBody: {
    padding: '16px 20px',
  },
  routeDesc: {
    color: C.muted,
    fontSize: '13px',
    marginBottom: '12px',
    lineHeight: '1.6',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '6px',
    marginTop: '16px',
  },
  errorRow: {
    display: 'grid',
    gridTemplateColumns: '80px 160px 1fr',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid ' + C.border,
    fontSize: '13px',
    alignItems: 'start',
  },
  errorRowHeader: {
    display: 'grid',
    gridTemplateColumns: '80px 160px 1fr',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid ' + C.border,
    fontSize: '11px',
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  faqItem: {
    borderBottom: '1px solid ' + C.border,
    padding: '0',
  },
  faqQ: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    userSelect: 'none',
  },
  faqA: {
    color: C.muted,
    fontSize: '13px',
    lineHeight: '1.7',
    paddingBottom: '14px',
  },
  noteBanner: {
    background: C.amberLt,
    border: '1px solid #E8C4A0',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: C.text,
    marginBottom: '16px',
    display: 'flex',
    gap: '10px',
  },
  successBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    background: C.greenLt,
    color: C.green,
    border: '1px solid #B8DFC9',
    borderRadius: '12px',
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: '500',
  },
}

const SEND_REQUEST = `POST /auth/otp/send HTTP/1.1
Host: semelpass.com
Content-Type: application/json
X-App-Id: your_app_id
X-Timestamp: 1716038400
X-Signature: <hmac-sha256-hex>

{
  "email": "user@example.com"
}`

const SEND_RESPONSE = `HTTP/1.1 202 Accepted

{
  "status": "sent"
}`

const VERIFY_REQUEST = `POST /auth/otp/verify HTTP/1.1
Host: semelpass.com
Content-Type: application/json
X-App-Id: your_app_id
X-Timestamp: 1716038400
X-Signature: <hmac-sha256-hex>

{
  "email": "user@example.com",
  "code":  "482917"
}`

const VERIFY_RESPONSE = `HTTP/1.1 200 OK

{
  "status":  "verified",
  "email":   "user@example.com"
}`

const HMAC_PYTHON = `import hmac, hashlib, time, requests

app_id  = "your_app_id"
secret  = "your_secret"          # from My App → Rotate Secret

def sign(body: str) -> dict:
    ts  = str(int(time.time()))
    sig = hmac.new(
        secret.encode(),
        (ts + body).encode(),
        hashlib.sha256
    ).hexdigest()
    return {
        "X-App-Id":    app_id,
        "X-Timestamp": ts,
        "X-Signature": sig,
        "Content-Type": "application/json",
    }

# Send OTP
body = '{"email":"user@example.com"}'
r = requests.post(
    "https://semelpass.com/auth/otp/send",
    headers=sign(body),
    data=body
)
# 202 → OTP email delivered

# Verify OTP
body = '{"email":"user@example.com","code":"482917"}'
r = requests.post(
    "https://semelpass.com/auth/otp/verify",
    headers=sign(body),
    data=body
)
# 200 → {"status":"verified","email":"user@example.com"}`

const HMAC_JS = `import crypto from "crypto"

const APP_ID = "your_app_id"
const SECRET = "your_secret"    // from My App → Rotate Secret

function sign(body) {
  const ts  = String(Math.floor(Date.now() / 1000))
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(ts + body)
    .digest("hex")
  return {
    "Content-Type": "application/json",
    "X-App-Id":     APP_ID,
    "X-Timestamp":  ts,
    "X-Signature":  sig,
  }
}

// Send OTP
const sendBody = JSON.stringify({ email: "user@example.com" })
await fetch("https://semelpass.com/auth/otp/send", {
  method:  "POST",
  headers: sign(sendBody),
  body:    sendBody,
})

// Verify OTP
const verifyBody = JSON.stringify({ email: "user@example.com", code: "482917" })
const res = await fetch("https://semelpass.com/auth/otp/verify", {
  method:  "POST",
  headers: sign(verifyBody),
  body:    verifyBody,
})
const data = await res.json()
// { status: "verified", email: "user@example.com" }`

const ERRORS = [
  { code: '202', label: 'Accepted',      color: C.green,   desc: 'OTP generated and email queued. Always returned for /send regardless of whether the email exists.' },
  { code: '200', label: 'OK',            color: C.green,   desc: 'OTP verified successfully. /verify only.' },
  { code: '400', label: 'Bad Request',   color: C.amber,   desc: 'Missing or malformed fields in request body. Check email format and code length (6 digits).' },
  { code: '401', label: 'Unauthorized',  color: C.red,     desc: 'Invalid HMAC signature or expired timestamp (±5 min window). Check your secret and clock sync.' },
  { code: '403', label: 'Forbidden',     color: C.red,     desc: 'App ID not found or app is inactive. Verify your X-App-Id header.' },
  { code: '422', label: 'Invalid Code',  color: C.amber,   desc: 'OTP is incorrect, expired (10 min TTL), or already used. Codes are single-use and deleted on first verify attempt.' },
  { code: '429', label: 'Rate Limited',  color: C.amber,   desc: 'Too many requests. Back off and retry after the Retry-After header value.' },
]

const FAQ = [
  {
    q: 'How long is the OTP valid?',
    a: 'Each code expires after 10 minutes. If the user does not enter it in time, they can request a new code from your UI — just call /auth/otp/send again with their email.',
  },
  {
    q: 'What if the user enters the wrong code?',
    a: 'The code is deleted on the first failed verify attempt. The user must request a new OTP. This is intentional — it prevents brute-force enumeration of codes.',
  },
  {
    q: 'Is the /send endpoint safe to call even if the email does not exist in my system?',
    a: 'Yes. /auth/otp/send always returns 202 regardless of whether the email maps to a real user. This prevents email enumeration. Your backend should do its own user lookup after a successful /verify.',
  },
  {
    q: 'Can I use semelpass for admin or high-trust flows?',
    a: 'Yes. OTP-only auth is appropriate for any flow where you control the email delivery and trust the inbox. For step-up auth on sensitive actions (wire transfers, account deletion, etc.) you can call /auth/otp/send mid-session and gate the action behind a successful /verify.',
  },
  {
    q: 'How do I rotate my secret without downtime?',
    a: 'Go to My App → Rotate Secret. Copy the new secret immediately — it is shown exactly once. Update your signing code before navigating away. The old secret is invalidated immediately on rotation.',
  },
]

function CodeTab({ tabs }) {
  const [active, setActive] = useState(tabs[0].label)
  const current = tabs.find(t => t.label === active)
  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
        {tabs.map(t => (
          <button
            key={t.label}
            onClick={() => setActive(t.label)}
            style={{
              background:   active === t.label ? C.codeBg : C.surface,
              color:        active === t.label ? C.codeFg : C.muted,
              border:       '1px solid ' + C.border,
              borderBottom: active === t.label ? '1px solid ' + C.codeBg : '1px solid ' + C.border,
              borderRadius: '6px 6px 0 0',
              padding:      '6px 14px',
              fontSize:     '12px',
              fontFamily:   F.mono,
              cursor:       'pointer',
              marginBottom: '-1px',
              position:     'relative',
              zIndex:       active === t.label ? '1' : '0',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre style={s.code}>{current.code}</pre>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={s.faqItem}>
      <div style={s.faqQ} onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span style={{ color: C.red, fontSize: '18px', lineHeight: '1' }}>{open ? '−' : '+'}</span>
      </div>
      {open && <div style={s.faqA}>{a}</div>}
    </div>
  )
}

export default function Help() {
  return (
    <div style={s.page}>

      <h1 style={s.pageTitle}>Integration Guide</h1>
      <p style={s.pageSub}>Everything you need to add passwordless OTP auth to your application.</p>

      {/* Quick Start */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Quick Start</h2>

        <div style={s.stepRow}>
          <div style={s.stepNum}>1</div>
          <div style={s.stepBody}>
            <div style={s.stepLabel}>Get your credentials</div>
            <div style={s.stepDesc}>
              Go to <strong>My App</strong> in the left nav. Copy your App ID. Click <em>Rotate Secret</em> to generate your HMAC signing secret — it is shown exactly once, store it securely.
            </div>
          </div>
        </div>

        <div style={s.stepRow}>
          <div style={s.stepNum}>2</div>
          <div style={s.stepBody}>
            <div style={s.stepLabel}>Send an OTP to your user</div>
            <div style={s.stepDesc}>
              When your user wants to sign in, call <code style={s.inlineCode}>POST /auth/otp/send</code> with their email. semelpass generates a 6-digit code, stores it in Redis with a 10-minute TTL, and delivers the email.
            </div>
          </div>
        </div>

        <div style={s.stepRow}>
          <div style={s.stepNum}>3</div>
          <div style={s.stepBody}>
            <div style={s.stepLabel}>Verify the code</div>
            <div style={s.stepDesc}>
              Collect the 6-digit code from your UI and call <code style={s.inlineCode}>POST /auth/otp/verify</code>. On success, issue your own session token or JWT. semelpass deletes the code immediately — it cannot be reused.
            </div>
          </div>
        </div>
      </div>

      {/* Authentication */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Request Authentication</h2>

        <div style={s.noteBanner}>
          <span style={{ fontSize: '16px' }}>⚠</span>
          <span>Every request to <code style={s.inlineCode}>/auth/</code> routes must be signed with HMAC-SHA256. Unsigned or incorrectly signed requests return <strong>401</strong>.</span>
        </div>

        <div style={s.card}>
          <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px', lineHeight: '1.7' }}>
            Include these three headers on every request. The signature is computed over the concatenation of the Unix timestamp and the raw request body string.
          </div>
          <div style={s.fieldLabel}>Required Headers</div>
          <pre style={s.code}>{
'X-App-Id:    your_app_id\n' +
'X-Timestamp: 1716038400          # Unix epoch seconds — must be within ±5 min of server time\n' +
'X-Signature: <hmac-sha256-hex>   # hmac_sha256(secret, timestamp + raw_body_string)'
          }</pre>
        </div>

        <div style={s.fieldLabel}>Code Examples</div>
        <CodeTab tabs={[
          { label: 'Python',     code: HMAC_PYTHON },
          { label: 'JavaScript', code: HMAC_JS },
        ]} />
      </div>

      {/* API Reference */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>API Reference</h2>

        <div style={s.routeBlock}>
          <div style={s.routeHeader}>
            <span style={s.methodBadge}>POST</span>
            <span style={s.routePath}>/auth/otp/send</span>
            <span style={{ marginLeft: 'auto', ...s.successBadge }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green, display: 'inline-block' }}></span>
              Public (HMAC signed)
            </span>
          </div>
          <div style={s.routeBody}>
            <div style={s.routeDesc}>
              Generates a 6-digit OTP for the given email and delivers it. Always returns 202 regardless of whether the email maps to a user in your system — this prevents email enumeration.
            </div>
            <div style={s.fieldLabel}>Request</div>
            <pre style={s.code}>{SEND_REQUEST}</pre>
            <div style={s.fieldLabel}>Response</div>
            <pre style={s.code}>{SEND_RESPONSE}</pre>
          </div>
        </div>

        <div style={s.routeBlock}>
          <div style={s.routeHeader}>
            <span style={s.methodBadge}>POST</span>
            <span style={s.routePath}>/auth/otp/verify</span>
            <span style={{ marginLeft: 'auto', ...s.successBadge }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green, display: 'inline-block' }}></span>
              Public (HMAC signed)
            </span>
          </div>
          <div style={s.routeBody}>
            <div style={s.routeDesc}>
              Verifies the submitted code using a timing-safe comparison. On success, deletes the code immediately (single-use). On failure, also deletes — the user must request a new OTP.
            </div>
            <div style={s.fieldLabel}>Request</div>
            <pre style={s.code}>{VERIFY_REQUEST}</pre>
            <div style={s.fieldLabel}>Response</div>
            <pre style={s.code}>{VERIFY_RESPONSE}</pre>
          </div>
        </div>
      </div>

      {/* Error Codes */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Error Codes</h2>
        <div style={s.card}>
          <div style={s.errorRowHeader}>
            <span>Code</span>
            <span>Status</span>
            <span>Meaning</span>
          </div>
          {ERRORS.map(e => (
            <div key={e.code} style={s.errorRow}>
              <span style={{ fontFamily: F.mono, fontWeight: '600', color: e.color }}>{e.code}</span>
              <span style={{ fontFamily: F.mono, fontSize: '12px', color: C.muted }}>{e.label}</span>
              <span style={{ color: C.muted, lineHeight: '1.5' }}>{e.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>FAQ</h2>
        <div style={{ border: '1px solid ' + C.border, borderRadius: '10px', padding: '0 20px', background: C.surface }}>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: C.muted, paddingTop: '16px', borderTop: '1px solid ' + C.border }}>
        Protected by semelpass · © 2026 Omniapan AI Inc.
      </div>

    </div>
  )
}
