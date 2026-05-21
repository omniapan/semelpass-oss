import React, { useState, useEffect } from 'react'
import { C, F } from '@shared/theme.js'

const api = (path, opts={}) => fetch(`/admin/api${path}`, { credentials:'include', ...opts })
const arr = d => Array.isArray(d) ? d : (d?.tenants ?? [])

function Badge({ ok, label }) {
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                   background: ok ? C.greenLight : C.amberLight,
                   color: ok ? C.green : C.amber }}>
      {label}
    </span>
  )
}

export default function Tenants() {
  const [tenants,  setTenants ] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm    ] = useState({ name:'', slug:'', contact_email:'' })
  const [saving,   setSaving  ] = useState(false)
  const [err,      setErr     ] = useState('')

  const load = () => api('/tenants').then(r => r.json()).then(d => setTenants(arr(d)))
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name || !form.slug) { setErr('Name and slug are required.'); return }
    setSaving(true); setErr('')
    const r = await api('/tenants', { method:'POST',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { setShowForm(false); setForm({name:'',slug:'',contact_email:''}); load() }
    else { const d = await r.json().catch(()=>{}); setErr(d?.detail || 'Error creating tenant.') }
  }

  const toggle = async t => {
    await api(`/tenants/${t.id}`, { method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ is_active: !t.is_active }) })
    load()
  }

  const inp = { padding:'8px 10px', fontSize:13, background:C.bg,
                border:`1px solid ${C.border}`, borderRadius:4,
                color:C.text, fontFamily:F.body, outline:'none' }
  const th = { fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em' }

  return (
    <div style={{ padding:'28px 32px', fontFamily:F.body, color:C.text }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:F.heading, fontSize:26, fontWeight:700, letterSpacing:'-0.01em' }}>Tenants</h1>
          <p style={{ fontSize:13, color:C.muted, marginTop:4 }}>
            {tenants ? `${tenants.length} provisioned` : 'Loading…'}
          </p>
        </div>
        <button onClick={() => { setShowForm(v=>!v); setErr('') }}
          style={{ padding:'9px 16px', background:showForm?C.surfaceAlt:C.red,
                   color:showForm?C.textSoft:C.white, border:`1px solid ${showForm?C.border:'transparent'}`,
                   borderRadius:4, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          {showForm ? 'Cancel' : '+ New Tenant'}
        </button>
      </div>

      {showForm && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`,
                      borderRadius:8, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Create Tenant</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <input style={{ ...inp, flex:'1 1 160px' }} placeholder="Company name *"
              value={form.name} onChange={e => setForm(v=>({...v, name:e.target.value}))} />
            <input style={{ ...inp, flex:'1 1 130px' }} placeholder="slug * (e.g. acme)"
              value={form.slug}
              onChange={e => setForm(v=>({...v, slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} />
            <input style={{ ...inp, flex:'1 1 200px' }} placeholder="contact@company.com"
              value={form.contact_email} onChange={e => setForm(v=>({...v, contact_email:e.target.value}))} />
            <button onClick={create} disabled={saving}
              style={{ padding:'8px 18px', background:saving?C.surfaceAlt:C.red,
                       color:saving?C.muted:C.white, border:'none', borderRadius:4,
                       fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
          {err && <p style={{ fontSize:12, color:C.red, marginTop:8 }}>{err}</p>}
        </div>
      )}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 1fr 110px 90px',
                      padding:'10px 20px', borderBottom:`1px solid ${C.border}` }}>
          {['Name / Slug','Status','Contact','Created',''].map((h,i) =>
            <span key={i} style={th}>{h}</span>)}
        </div>
        {!tenants ? (
          <div style={{ padding:20, color:C.muted, fontSize:13 }}>Loading…</div>
        ) : tenants.length === 0 ? (
          <div style={{ padding:20, color:C.muted, fontSize:13 }}>No tenants provisioned yet.</div>
        ) : tenants.map((t,i) => (
          <div key={t.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px 1fr 110px 90px',
            padding:'12px 20px', alignItems:'center',
            borderBottom: i < tenants.length-1 ? `1px solid ${C.border}` : 'none',
            background: i%2===0 ? 'transparent' : 'rgba(44,24,16,0.015)' }}>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600 }}>{t.name || t.slug}</div>
              <div style={{ fontSize:11, color:C.muted, fontFamily:F.mono, marginTop:1 }}>{t.slug}</div>
            </div>
            <div><Badge ok={t.is_active!==false} label={t.is_active===false?'Inactive':'Active'} /></div>
            <div style={{ fontSize:12, color:C.textSoft }}>{t.contact_email || '—'}</div>
            <div style={{ fontSize:11, color:C.muted }}>
              {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
            </div>
            <div>
              <button onClick={() => toggle(t)}
                style={{ padding:'5px 10px', fontSize:11, cursor:'pointer', background:'transparent',
                         border:`1px solid ${C.border}`, borderRadius:4, color:C.textSoft }}>
                {t.is_active===false ? 'Activate' : 'Suspend'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
