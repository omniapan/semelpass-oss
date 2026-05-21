import React, { useState, useEffect, useCallback } from 'react'
import { C, F } from '@shared/theme.js'

const arr = d => Array.isArray(d) ? d : (d?.entries ?? d?.events ?? d?.logs ?? [])
const fmt = d => d ? new Date(d).toLocaleString('en-US',{
  month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—'

export default function AuditLog() {
  const [entries, setEntries] = useState(null)
  const [limit,   setLimit  ] = useState(50)
  const [tenant,  setTenant ] = useState('')
  const [event,   setEvent  ] = useState('')

  const load = useCallback(() => {
    const p = new URLSearchParams({ limit })
    if (tenant) p.set('tenant_id', tenant)
    if (event)  p.set('event', event)
    fetch(`/admin/api/audit-log?${p}`, { credentials:'include' })
      .then(r => r.json()).then(d => setEntries(arr(d))).catch(() => setEntries([]))
  }, [limit, tenant, event])

  useEffect(() => { load() }, [load])

  const inp = { padding:'7px 10px', fontSize:12.5, background:C.bg,
                border:`1px solid ${C.border}`, borderRadius:4,
                color:C.text, fontFamily:F.body, outline:'none' }

  return (
    <div style={{ padding:'28px 32px', fontFamily:F.body, color:C.text }}>
      <h1 style={{ fontFamily:F.heading, fontSize:26, fontWeight:700,
                   letterSpacing:'-0.01em', marginBottom:4 }}>Audit Log</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>
        All OTP events, admin actions, and tenant operations
      </p>

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input style={{ ...inp, width:220 }} placeholder="Filter by tenant ID"
          value={tenant} onChange={e => setTenant(e.target.value)} />
        <input style={{ ...inp, width:180 }} placeholder="Filter by event type"
          value={event} onChange={e => setEvent(e.target.value)} />
        <select style={{ ...inp, width:110 }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
          {[25,50,100,250].map(l => <option key={l} value={l}>{l} rows</option>)}
        </select>
        <button onClick={load}
          style={{ padding:'7px 14px', background:C.red, color:C.white, border:'none',
                   borderRadius:4, fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
          Refresh
        </button>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:8, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'160px 200px 1fr 1fr',
                      padding:'10px 20px', borderBottom:`1px solid ${C.border}`,
                      fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {['Timestamp','Event','Tenant','Detail'].map((h,i) => <span key={i}>{h}</span>)}
        </div>
        {!entries ? (
          <div style={{ padding:20, color:C.muted, fontSize:13 }}>Loading…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding:20, color:C.muted, fontSize:13 }}>No entries match your filters.</div>
        ) : entries.map((e,i) => (
          <div key={e.id??i} style={{ display:'grid',
            gridTemplateColumns:'160px 200px 1fr 1fr', padding:'10px 20px', alignItems:'center',
            borderBottom: i < entries.length-1 ? `1px solid ${C.border}` : 'none',
            background: i%2===0 ? 'transparent' : 'rgba(44,24,16,0.015)' }}>
            <span style={{ fontSize:11, fontFamily:F.mono, color:C.muted }}>{fmt(e.created_at)}</span>
            <span style={{ fontSize:12, fontWeight:600, color:C.red, fontFamily:F.mono }}>{e.event??'—'}</span>
            <span style={{ fontSize:12, color:C.textSoft, fontFamily:F.mono }}>{e.tenant_id??'—'}</span>
            <span style={{ fontSize:12, color:C.textSoft }}>{e.detail??e.email??'—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
