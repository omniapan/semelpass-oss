import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, F } from '@shared/theme.js'

const api = p => fetch(`/admin/api${p}`, { credentials:'include' }).then(r => r.ok ? r.json() : null)
const arr = (d, ...keys) => { if (!d) return []; if (Array.isArray(d)) return d; for (const k of keys) if (Array.isArray(d[k])) return d[k]; return [] }
const fmt = d => d ? new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{ flex:1, minWidth:140, background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:8, padding:'18px 22px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase',
                    letterSpacing:'0.08em', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:700, fontFamily:F.heading,
                    color:color||C.text, lineHeight:1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [tenants, setTenants] = useState(null)
  const [demos,   setDemos  ] = useState(null)
  const [log,     setLog    ] = useState(null)
  const [health,  setHealth ] = useState(null)

  useEffect(() => {
    api('/tenants').then(d => setTenants(arr(d,'tenants')))
    api('/demo-requests').then(d => setDemos(arr(d,'demo_requests','requests')))
    api('/audit-log?limit=8').then(d => setLog(arr(d,'entries','events','logs')))
    fetch('/health').then(r => r.json()).then(setHealth).catch(() => {})
  }, [])

  const navigate = useNavigate()
  const active  = tenants ? tenants.filter(t => t.is_active !== false).length : null
  const pending = demos   ? demos.filter(d => d.status === 'pending').length   : null
  const ok      = health?.status === 'ok'

  return (
    <div style={{ padding:'28px 32px', fontFamily:F.body, color:C.text }}>
      <h1 style={{ fontFamily:F.heading, fontSize:26, fontWeight:700,
                   letterSpacing:'-0.01em', marginBottom:4 }}>Dashboard</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Platform overview — semelpass-OSS</p>

      <div style={{ display:'flex', gap:14, marginBottom:28, flexWrap:'wrap' }}>
        <StatCard label="Active Tenants"  value={active}  sub="provisioned + active" color={C.green} onClick={() => navigate('/tenants')} />
        <StatCard label="Total Tenants"   value={tenants?.length ?? null} sub="all records" onClick={() => navigate('/tenants')} />
        <StatCard label="Pending Demos"   value={pending}
          sub="awaiting approval" color={pending > 0 ? C.amber : C.text} onClick={() => navigate('/demo-requests')} />
        <StatCard label="System"
          value={health === null ? '…' : ok ? '●' : '○'}
          sub={health?.status ?? 'checking'}
          color={ok ? C.green : C.amber} onClick={() => navigate('/system')} />
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`,
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Recent Activity</span>
          <span style={{ fontSize:11, color:C.muted }}>last 8 events</span>
        </div>
        {!log ? (
          <div style={{ padding:20, color:C.muted, fontSize:13 }}>Loading…</div>
        ) : log.length === 0 ? (
          <div style={{ padding:20, color:C.muted, fontSize:13 }}>No events yet.</div>
        ) : log.map((e,i) => (
          <div key={e.id??i} style={{ display:'flex', gap:12, padding:'10px 20px',
            borderBottom: i < log.length-1 ? `1px solid ${C.border}` : 'none', alignItems:'center' }}>
            <span style={{ fontSize:11, color:C.muted, minWidth:148, fontFamily:F.mono }}>{fmt(e.created_at)}</span>
            <span style={{ fontSize:12, fontWeight:600, color:C.red, minWidth:180, fontFamily:F.mono }}>{e.event??'—'}</span>
            <span style={{ fontSize:12, color:C.textSoft }}>{e.tenant_id??e.detail??''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
