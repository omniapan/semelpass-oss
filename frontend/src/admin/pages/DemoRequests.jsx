import React, { useState, useEffect } from 'react'
import { C, F } from '@shared/theme.js'

const api = (path, opts={}) => fetch(`/admin/api${path}`, { credentials:'include', ...opts })
const arr = d => Array.isArray(d) ? d : (d?.demo_requests ?? d?.requests ?? [])
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'
const TABS = ['pending','all','approved','rejected']

function StatusBadge({ status }) {
  const s = status==='approved' ? {bg:C.greenLight,c:C.green}
          : status==='rejected' ? {bg:'rgba(44,24,16,0.07)',c:C.muted}
          : {bg:C.amberLight,c:C.amber}
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                   background:s.bg, color:s.c, textTransform:'capitalize' }}>
      {status}
    </span>
  )
}

export default function DemoRequests() {
  const [tab,     setTab    ] = useState('pending')
  const [items,   setItems  ] = useState(null)
  const [working, setWorking] = useState(null)

  const load = t => {
    const qs = t !== 'all' ? `?status=${t}` : ''
    api(`/demo-requests${qs}`).then(r => r.json()).then(d => setItems(arr(d)))
  }
  useEffect(() => { load(tab) }, [tab])

  const act = async (id, action) => {
    setWorking(id)
    await api(`/demo-requests/${id}/${action}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })
    setWorking(null)
    load(tab)
  }

  return (
    <div style={{ padding:'28px 32px', fontFamily:F.body, color:C.text }}>
      <h1 style={{ fontFamily:F.heading, fontSize:26, fontWeight:700,
                   letterSpacing:'-0.01em', marginBottom:4 }}>Demo Requests</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>
        Approve to provision tenant + trigger welcome email
      </p>

      <div style={{ display:'flex', gap:2, marginBottom:20, background:C.surface,
                    border:`1px solid ${C.border}`, borderRadius:6, padding:4,
                    width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'6px 16px', fontSize:12.5, fontWeight:tab===t?600:400,
            background:tab===t?C.red:'transparent',
            color:tab===t?C.white:C.textSoft,
            border:'none', borderRadius:4, cursor:'pointer',
            textTransform:'capitalize', fontFamily:F.body }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:8, overflow:'hidden' }}>
        {!items ? (
          <div style={{ padding:20, color:C.muted, fontSize:13 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding:24, color:C.muted, fontSize:13, textAlign:'center' }}>
            No {tab==='all'?'':tab} requests.
          </div>
        ) : items.map((r,i) => (
          <div key={r.id} style={{ padding:'16px 20px',
            borderBottom: i < items.length-1 ? `1px solid ${C.border}` : 'none',
            display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:600 }}>{r.company||r.company_name||'—'}</span>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ fontSize:12, color:C.textSoft }}>{r.email}</div>
              {r.use_case && <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{r.use_case}</div>}
              <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>Submitted: {fmtDate(r.created_at)}</div>
            </div>
            {r.status==='pending' && (
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button onClick={() => act(r.id,'approve')} disabled={working===r.id}
                  style={{ padding:'7px 14px', background:C.green, color:C.white,
                           border:'none', borderRadius:4, fontSize:12, fontWeight:600,
                           cursor:working===r.id?'not-allowed':'pointer' }}>
                  {working===r.id?'…':'Approve'}
                </button>
                <button onClick={() => act(r.id,'reject')} disabled={working===r.id}
                  style={{ padding:'7px 14px', background:'transparent', color:C.textSoft,
                           border:`1px solid ${C.border}`, borderRadius:4, fontSize:12,
                           cursor:working===r.id?'not-allowed':'pointer' }}>
                  Reject
                </button>
              </div>
            )}
            {r.status==='approved' && r.approved_at && (
              <div style={{ fontSize:11, color:C.green, flexShrink:0 }}>
                Approved {fmtDate(r.approved_at)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
