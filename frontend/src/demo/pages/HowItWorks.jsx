import React from 'react'

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
  codeBg:  '#1C0F0A',
  codeFg:  '#FAF0E2',
}

const F = {
  heading: '"Playfair Display", Georgia, serif',
  body:    'system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", "Fira Code", Consolas, monospace',
}

const STEPS = [
  {
    n:     '1',
    title: 'Enter your email',
    desc:  'No account needed. No password. Just type your email address on the gate screen and click Send Code.',
    note:  'semelpass generates a secure 6-digit code and stores it with a 10-minute expiry. Your email is never stored — only a one-way hash of the OTP.',
  },
  {
    n:     '2',
    title: 'Check your inbox',
    desc:  'Within seconds you\'ll receive an email with your 6-digit code. Check spam if it doesn\'t arrive — it comes from noreply@semelpass.com.',
    note:  null,
  },
  {
    n:     '3',
    title: 'Enter the code',
    desc:  'Type the 6-digit code into the gate screen and click Verify Code. The code is single-use — it is deleted the moment it is verified.',
    note:  'Verification uses a timing-safe comparison to prevent side-channel attacks. The Redis key is deleted immediately on first use, successful or not.',
  },
  {
    n:     '4',
    title: 'You\'re in',
    desc:  'You\'re automatically redirected to the protected application — fully authenticated. No username. No password. No account.',
    note:  null,
  },
]

export default function HowItWorks({ onBack }) {
  return (
    <div style={{
      minHeight:   '100vh',
      background:  C.bg,
      fontFamily:  F.body,
      color:       C.text,
      display:     'flex',
      flexDirection: 'column',
    }}>

      {/* Top nav */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '16px 32px',
        borderBottom:   '1px solid ' + C.border,
        background:     C.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="22" fill={C.red}/>
            <text x="28" y="34" textAnchor="middle" fill="white"
              fontFamily="Playfair Display, serif" fontSize="18" fontWeight="600">S</text>
          </svg>
          <span style={{ fontFamily: F.heading, fontSize: '15px', fontWeight: '600' }}>semelpass</span>
        </div>
        <button
          onClick={onBack}
          style={{
            background:  'none',
            border:      '1px solid ' + C.border,
            borderRadius: '6px',
            padding:     '7px 16px',
            fontSize:    '13px',
            color:       C.muted,
            cursor:      'pointer',
            fontFamily:  F.body,
          }}
        >
          ← Back to demo
        </button>
      </div>

      {/* Body */}
      <div style={{
        maxWidth: '680px',
        margin:   '0 auto',
        padding:  '56px 32px 80px',
        width:    '100%',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h1 style={{
            fontFamily:   F.heading,
            fontSize:     '34px',
            fontWeight:   '400',
            marginBottom: '12px',
            lineHeight:   '1.2',
          }}>
            How <em style={{ fontStyle: 'italic', color: C.red }}>semelpass</em> works.
          </h1>
          <p style={{ color: C.muted, fontSize: '15px', fontWeight: '300', maxWidth: '440px', margin: '0 auto' }}>
            Passwordless OTP authentication in four steps — from email to authenticated app in under two minutes.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STEPS.map((step, i) => (
            <div key={step.n} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0 20px' }}>

              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width:          '32px',
                  height:         '32px',
                  borderRadius:   '50%',
                  background:     C.red,
                  color:          '#fff',
                  fontFamily:     F.heading,
                  fontSize:       '15px',
                  fontWeight:     '600',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     '0',
                }}>
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    width:      '1px',
                    flex:       '1',
                    minHeight:  '24px',
                    background: C.border,
                    margin:     '6px 0',
                  }} />
                )}
              </div>

              {/* Right column */}
              <div style={{ paddingBottom: i < STEPS.length - 1 ? '36px' : '0', paddingTop: '4px' }}>
                <h2 style={{
                  fontFamily:   F.heading,
                  fontSize:     '18px',
                  fontWeight:   '600',
                  marginBottom: '8px',
                }}>
                  {step.title}
                </h2>
                <p style={{
                  color:        C.muted,
                  fontSize:     '14px',
                  lineHeight:   '1.65',
                  fontWeight:   '300',
                  marginBottom: step.note ? '12px' : '0',
                }}>
                  {step.desc}
                </p>
                {step.note && (
                  <div style={{
                    background:  C.redLt,
                    borderLeft:  '3px solid ' + C.red,
                    borderRadius: '0 6px 6px 0',
                    padding:     '10px 14px',
                    fontSize:    '12px',
                    color:       C.muted,
                    lineHeight:  '1.6',
                  }}>
                    {step.note}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>

        {/* Why no password section */}
        <div style={{
          background:   C.surface,
          border:       '1px solid ' + C.border,
          borderRadius: '12px',
          padding:      '28px 32px',
          marginTop:    '48px',
        }}>
          <h2 style={{
            fontFamily:   F.heading,
            fontSize:     '18px',
            fontWeight:   '600',
            marginBottom: '12px',
            fontStyle:    'italic',
          }}>
            Why no password?
          </h2>
          <p style={{ color: C.muted, fontSize: '14px', lineHeight: '1.7', fontWeight: '300', marginBottom: '16px' }}>
            Passwords get reused, leaked, and phished. A one-time code sent to your inbox is only valid for 10 minutes and only works once — there is nothing to steal, nothing to remember, and nothing to rotate.
          </p>
          <p style={{ color: C.muted, fontSize: '14px', lineHeight: '1.7', fontWeight: '300' }}>
            semelpass integrates into any backend in minutes. Your users get a frictionless login experience. You get cryptographically sound authentication without managing a password database.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px', fontWeight: '300' }}>
            Ready to protect your own application?
          </p>
          <a
            href="https://semelpass.com"
            style={{
              display:        'inline-block',
              background:     C.red,
              color:          '#fff',
              textDecoration: 'none',
              padding:        '12px 28px',
              borderRadius:   '6px',
              fontSize:       '14px',
              fontWeight:     '500',
              fontFamily:     F.body,
              marginBottom:   '16px',
            }}
          >
            Request access → semelpass.com
          </a>
          <div>
            <button
              onClick={onBack}
              style={{
                background:  'none',
                border:      'none',
                color:       C.red,
                fontSize:    '13px',
                cursor:      'pointer',
                fontFamily:  F.body,
              }}
            >
              ← Try the demo now
            </button>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{
        textAlign:    'center',
        padding:      '20px',
        fontSize:     '12px',
        color:        C.muted,
        fontWeight:   '300',
        borderTop:    '1px solid ' + C.border,
        marginTop:    'auto',
      }}>
        Protected by semelpass · © 2026 Omniapan AI Inc.
      </div>

    </div>
  )
}
