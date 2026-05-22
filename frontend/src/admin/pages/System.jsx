import React, { useState, useEffect } from 'react'
import { C, F } from '@shared/theme.js'

const CONTAINERS = [
  { name:'semelpass-caddy',    image:'caddy:2-alpine',         role:'Reverse proxy + TLS'  },
  { name:'semelpass-backend',  image:'semelpass-oss-backend',  role:'FastAPI auth engine'   },
  { name:'semelpass-postgres', image:'postgres:16-alpine',     role:'Master database'       },
  { name:'semelpass-redis',    image:'redis:7-alpine',         role:'Sessions + OTP TTL'    },
  { name:'semelpass-postfix',  image:'boky/postfix',           role:'OTP email relay'       },
]

export default function System() {
  const [health, setHealth] = useState(null)
  const [failed, setFailed] = useState(false)
  const [integrity, setIntegrity] = useState(null)

  useEffect(() => {
    fetch('/admin/api/integrity')
      .then(r => r.ok ? r.json() : null)
      .then(d => setIntegrity(d || { status: 'no_data' }))
      .catch(() => setIntegrity({ status: 'no_data' }))
  }, [])

  useEffect(() => {
    fetch('/health').then(r => r.json()).then(setHealth).catch(() => setFailed(true))
  }, [])

  const ok = health?.status === 'ok'

  return (
    <div style={{ padding:'28px 32px', fontFamily:F.body, color:C.text }}>
      <h1 style={{ fontFamily:F.heading, fontSize:26, fontWeight:700,
                   letterSpacing:'-0.01em', marginBottom:4 }}>System</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>
        semelpass-OSS · 5.78.214.203 · CPX21 (3 vCPU / 4GB / 80GB)
      </p>

      <div style={{ background:C.surface, border:`1px solid ${failed?C.amber:C.border}`,
                    borderRadius:8, padding:'20px 24px', marginBottom:20,
                    display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:12, height:12, borderRadius:'50%', flexShrink:0,
                      background: failed ? C.amber : ok ? C.green : C.border }} />
        <div>
          <div style={{ fontSize:14, fontWeight:600 }}>
            {failed ? 'Health check failed' : health === null ? 'Checking…' : 'System healthy'}
          </div>
          {health && (
            <div style={{ fontSize:12, color:C.muted, marginTop:2, fontFamily:F.mono }}>
              {health.product} · v{health.version} · {health.status}
            </div>
          )}
        </div>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`,
                      fontSize:13, fontWeight:600 }}>Containers</div>
        <div style={{ display:'grid', gridTemplateColumns:'210px 200px 1fr 80px',
                      padding:'10px 20px', borderBottom:`1px solid ${C.border}`,
                      fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {['Container','Image','Role','Status'].map((h,i) => <span key={i}>{h}</span>)}
        </div>
        {CONTAINERS.map((c,i) => (
          <div key={c.name} style={{ display:'grid', gridTemplateColumns:'210px 200px 1fr 80px',
            padding:'12px 20px', alignItems:'center',
            borderBottom: i < CONTAINERS.length-1 ? `1px solid ${C.border}` : 'none',
            background: i%2===0 ? 'transparent' : 'rgba(44,24,16,0.015)' }}>
            <span style={{ fontSize:12.5, fontWeight:600, fontFamily:F.mono }}>{c.name}</span>
            <span style={{ fontSize:12, color:C.textSoft, fontFamily:F.mono }}>{c.image}</span>
            <span style={{ fontSize:12, color:C.textSoft }}>{c.role}</span>
            <span style={{ fontSize:11, fontWeight:600, color: ok ? C.green : C.muted }}>
              {ok ? 'healthy' : '—'}
            </span>
          </div>
        ))}
      </div>
      <div style={{ background:C.surface,
                    border:`1px solid ${integrity?.status === 'tampered' ? C.amber : C.border}`,
                    borderRadius:8, overflow:'hidden', marginTop:20 }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`,
                      fontSize:13, fontWeight:600,
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Page Integrity</span>
          {integrity?.last_checked && (
            <span style={{ fontSize:11, color:C.muted, fontFamily:F.mono }}>
              Last checked: {integrity.last_checked}
            </span>
          )}
        </div>
        {!integrity ? (
          <div style={{ padding:'16px 20px', fontSize:13, color:C.muted }}>Loading…</div>
        ) : integrity.status === 'no_data' ? (
          <div style={{ padding:'16px 20px', fontSize:13, color:C.muted }}>
            No integrity data yet — cron job has not run.
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 180px',
                          padding:'10px 20px', borderBottom:`1px solid ${C.border}`,
                          fontSize:11, color:C.muted,
                          textTransform:'uppercase', letterSpacing:'0.07em' }}>
              {['Page','Status','SHA-256'].map((h,i) => <span key={i}>{h}</span>)}
            </div>
            {(integrity.pages || []).map((p, i) => (
              <div key={p.url}
                   style={{ display:'grid', gridTemplateColumns:'1fr 80px 180px',
                            padding:'12px 20px', alignItems:'center',
                            borderBottom: i < (integrity.pages.length - 1)
                              ? `1px solid ${C.border}` : 'none',
                            background: i%2===0 ? 'transparent' : 'rgba(44,24,16,0.015)' }}>
                <span style={{ fontSize:12.5, fontFamily:F.mono }}>
                  {p.url.replace('https://semelpass.com','')}
                </span>
                <span style={{ fontSize:11, fontWeight:600,
                               color: p.match ? C.green : C.amber }}>
                  {p.match ? 'ok' : 'ALERT'}
                </span>
                <span style={{ fontSize:11, fontFamily:F.mono, color:C.muted }}>
                  {p.hash ? p.hash.slice(0,16) + '…' : '—'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <p style={{ fontSize:11, color:C.muted, marginTop:14, lineHeight:1.7 }}>
        Container health derived from /health endpoint. For real-time stats:
        <code style={{ fontFamily:F.mono, fontSize:11, marginLeft:4 }}>docker ps</code> via SSH.
      </p>
    </div>
  )
}
