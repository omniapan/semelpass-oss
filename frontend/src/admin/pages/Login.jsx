import React, { useState } from 'react'
import { C, F } from '@shared/theme.js'

const api = (path, body) => fetch(`/admin/api${path}`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body ?? {})
})

export default function Login({ onLogin }) {
  const [step,    setStep   ] = useState('send')
  const [email,   setEmail  ] = useState('')
  const [code,    setCode   ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState('')

  const sendCode = async () => {
    setLoading(true); setError('')
    try {
      const r = await api('/login', { email })
      if (r.status === 202) { setStep('verify') }
      else { setError('Could not send code. Check server logs.') }
    } catch { setError('Connection error.') }
    finally  { setLoading(false) }
  }

  const verify = async () => {
    setLoading(true); setError('')
    try {
      const r = await api('/login/verify', { code })
      if (r.ok) { onLogin() }
      else { setError('Invalid or expired code. Try again.') }
    } catch { setError('Connection error.') }
    finally  { setLoading(false) }
  }

  const inp = {
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: `1px solid ${C.border}`, borderRadius: 4,
    background: C.bg, color: C.text, fontFamily: F.body, outline: 'none',
  }
  const btn = (dis) => ({
    width: '100%', padding: '12px 0', marginTop: 14,
    background: dis ? C.surfaceAlt : C.red,
    color: dis ? C.muted : C.white,
    border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600,
    cursor: dis ? 'not-allowed' : 'pointer', fontFamily: F.body,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.body, padding: 20,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '40px 40px 28px', width: 420, maxWidth: '100%',
        boxShadow: '0 8px 40px rgba(44,24,16,0.10)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/admin/logo.png" alt="semelpass"
               width="90" height="90"
               style={{ display: 'block', margin: '0 auto 10px', mixBlendMode: 'multiply' }} />
          <div style={{ fontFamily: F.heading, fontSize: 22, fontWeight: 700,
                        color: C.red, letterSpacing: '-0.01em' }}>semelpass</div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginTop: 2 }}>SEM-el-pass</div>
        </div>

        {/* Divider + heading */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24,
                      textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: 10 }}>
            Admin Portal
          </div>
          <h1 style={{ fontFamily: F.heading, fontSize: 30, fontWeight: 400,
                       fontStyle: 'italic', color: C.text, margin: '0 0 10px' }}>
            Welcome.
          </h1>
          <p style={{ fontSize: 13.5, color: C.textSoft, lineHeight: 1.6, margin: 0 }}>
            {step === 'send'
              ? 'Enter your email to receive a one-time code.'
              : 'Enter the 6-digit code sent to your email.'}
          </p>
        </div>

        {/* Form */}
        {step === 'send' ? (<>
          <label style={{ display: 'block', fontSize: 11, color: C.muted,
                          letterSpacing: '0.07em', textTransform: 'uppercase',
                          marginBottom: 6 }}>
            Email Address
          </label>
          <input
            style={inp} type="email" value={email} autoFocus
            placeholder="you@example.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email.trim() && sendCode()}
          />
          {error && <p style={{ fontSize: 12, color: C.red, margin: '8px 0 0' }}>{error}</p>}
          <button style={btn(!email.trim() || loading)}
            onClick={sendCode} disabled={!email.trim() || loading}>
            {loading ? 'Sending…' : 'Send Code'}
          </button>
        </>) : (<>
          <input
            style={{ ...inp, fontSize: 26, letterSpacing: '0.3em',
                     textAlign: 'center', fontFamily: F.mono }}
            type="text" value={code} maxLength={6} autoFocus
            placeholder="000000"
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()}
          />
          {error && <p style={{ fontSize: 12, color: C.red, margin: '8px 0 0' }}>{error}</p>}
          <button style={btn(code.length !== 6 || loading)}
            onClick={verify} disabled={code.length !== 6 || loading}>
            {loading ? 'Verifying…' : 'Sign In'}
          </button>
          <button onClick={() => { setStep('send'); setCode(''); setError('') }}
            style={{ width: '100%', marginTop: 8, padding: '8px 0', background: 'transparent',
                     border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer',
                     fontFamily: F.body }}>
            ← Resend code
          </button>
        </>)}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16,
                      borderTop: `1px solid ${C.border}`,
                      fontSize: 11, color: C.muted }}>
          protected by semelpass — omniapan ai, inc.
        </div>
      </div>
    </div>
  )
}
