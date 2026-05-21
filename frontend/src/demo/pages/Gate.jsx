import React, { useState } from 'react'

const C = {
  bg:      '#FDF6EC',
  surface: '#FAF0E2',
  red:     '#C41E3A',
  text:    '#2C1810',
  muted:   '#7A5C4F',
  border:  '#E8D5C0',
}
const F = {
  heading: '"Playfair Display", Georgia, serif',
  body:    'system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", "Fira Code", Consolas, monospace',
}

export default function Gate({ onHowItWorks }) {
  const [step,  setStep]  = useState('email')
  const [email, setEmail] = useState('')
  const [code,  setCode]  = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  async function handleSend(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/gate/api/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Failed to send code')
      setStep('otp')
    } catch {
      setError('Could not send code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    if (code.length !== 6 || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/gate/api/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Invalid code')
      }
      const { token } = await res.json()
      localStorage.setItem('token', token)
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
      setBusy(false)
    }
  }

  function handleCodeChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
    setCode(val)
  }

  const cardStyle = {
    background: C.surface,
    border: '1px solid ' + C.border,
    borderRadius: 12,
    padding: '48px 40px',
    width: '100%', maxWidth: 400,
    textAlign: 'center',
    boxSizing: 'border-box',
    margin: '0 16px',
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', marginBottom: 14,
    borderRadius: 6, border: '1px solid ' + C.border,
    background: C.bg, color: C.text, fontSize: 15, outline: 'none',
  }

  const otpInputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '14px', marginBottom: 14,
    borderRadius: 6, border: '1px solid ' + C.border,
    background: C.bg, color: C.text,
    fontSize: 32, letterSpacing: '0.35em', textAlign: 'center',
    fontFamily: F.mono, outline: 'none',
  }

  function btnStyle(disabled) {
    return {
      width: '100%', padding: '12px',
      background: disabled ? C.muted : C.red,
      color: '#fff', border: 'none', borderRadius: 6,
      fontSize: 15, fontFamily: F.heading, fontStyle: 'italic',
      cursor: disabled ? 'default' : 'pointer',
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.body,
    }}>
      <div style={cardStyle}>
        <img
          src="/gate/color-logo.png"
          alt="semelpass"
          style={{ width: 72, height: 72, marginBottom: 24, mixBlendMode: 'multiply' }}
        />

        <h1 style={{
          fontFamily: F.heading,
          fontSize: 26, fontWeight: 400, fontStyle: 'italic',
          color: C.text, margin: '0 0 8px',
        }}>
          {step === 'email' ? 'Try semelpass live.' : 'Check your email.'}
        </h1>

        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
          {step === 'email'
            ? 'Enter your email — you\'ll receive a one-time code and be authenticated into a live protected application. No password. No account.'
            : React.createElement('span', null,
                'Code sent to ',
                React.createElement('strong', { style: { color: C.text } }, email),
                '. Enter it to access the demo app.'
              )
          }
        </p>

        {error && (
          <div style={{
            background: 'rgba(196,30,58,0.08)', color: C.red,
            borderRadius: 6, padding: '10px 14px',
            fontSize: 13, marginBottom: 20, textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSend}>
            <input
              type="email" placeholder="you@company.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus style={inputStyle}
            />
            <button type="submit" disabled={busy || !email} style={btnStyle(busy || !email)}>
              {busy ? 'Sending...' : 'Send code ->'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify}>
            <input
              type="text" inputMode="numeric"
              placeholder="000000"
              value={code} onChange={handleCodeChange}
              autoFocus style={otpInputStyle}
            />
            <button type="submit" disabled={busy || code.length !== 6}
              style={btnStyle(busy || code.length !== 6)}>
              {busy ? 'Verifying...' : 'Enter Juice Shop ->'}
            </button>
            <button type="button"
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              style={{
                background: 'none', border: 'none', color: C.muted,
                fontSize: 13, cursor: 'pointer',
                textDecoration: 'underline', display: 'block', margin: '14px auto 0',
              }}>
              Use a different email
            </button>
          </form>
        )}

        {step === 'email' && (
          <p style={{ color: C.muted, fontSize: 12, marginTop: 16,
                       marginBottom: 0, textAlign: 'center', lineHeight: '1.7' }}>
            You'll land in a real e-commerce demo app
            — browsing products, fully authenticated,
            no password ever created.
          </p>
        )}
        <p style={{ marginTop: 24, marginBottom: 0, textAlign: 'center' }}>
          <button
            onClick={onHowItWorks}
            style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, cursor: 'pointer',
              textDecoration: 'underline', fontFamily: F.body,
            }}
          >
            How does this work?
          </button>
        </p>
        <p style={{ color: C.muted, fontSize: 12, marginTop: 16, marginBottom: 0 }}>
          Protected by{' '}
          <a href="https://semelpass.com" target="_blank" rel="noopener noreferrer"
             style={{ color: C.red, textDecoration: 'none' }}>
            semelpass
          </a>
          {' · © 2026 Omniapan AI Inc.'}
        </p>
      </div>
    </div>
  )
}
