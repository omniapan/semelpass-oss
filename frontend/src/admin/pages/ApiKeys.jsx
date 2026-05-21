import React from 'react'
import { C, F } from '@shared/theme.js'

export default function ApiKeys() {
  return (
    <div style={{ padding:'28px 32px', fontFamily:F.body, color:C.text }}>
      <h1 style={{ fontFamily:F.heading, fontSize:26, fontWeight:700,
                   letterSpacing:'-0.01em', marginBottom:4 }}>API Keys</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Per-tenant HMAC key management</p>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
                    padding:'48px 32px', textAlign:'center' }}>
        <div style={{ fontFamily:F.heading, fontSize:20, fontWeight:600,
                      color:C.text, marginBottom:12 }}>Coming in the next sprint</div>
        <p style={{ fontSize:13, color:C.textSoft, maxWidth:440, margin:'0 auto', lineHeight:1.7 }}>
          Per-tenant HMAC secret management — issue, revoke, rotate, and show-once
          display. Backend routes are defined; this screen is queued for Phase 2 Block 3 completion.
        </p>
        <p style={{ fontSize:11, color:C.muted, marginTop:20, fontFamily:F.mono }}>
          interim: manage apps via Tenants screen or direct DB access
        </p>
      </div>
    </div>
  )
}
