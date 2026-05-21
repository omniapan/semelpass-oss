import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { C, F } from '@shared/theme.js'
import Login        from './pages/Login.jsx'
import Dashboard    from './pages/Dashboard.jsx'
import Tenants      from './pages/Tenants.jsx'
import DemoRequests from './pages/DemoRequests.jsx'
import ApiKeys      from './pages/ApiKeys.jsx'
import AuditLog     from './pages/AuditLog.jsx'
import System       from './pages/System.jsx'

export const AuthCtx = createContext(null)

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  height:'100vh', background:C.bg }}>
      <div style={{ width:32, height:32, borderRadius:'50%',
                    border:`3px solid ${C.border}`, borderTopColor:C.red,
                    animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

const NAV = [
  { to:'/dashboard',     label:'Dashboard'      },
  { to:'/tenants',       label:'Tenants'        },
  { to:'/demo-requests', label:'Demo Requests'  },
  { to:'/api-keys',      label:'API Keys'       },
  { to:'/audit-log',     label:'Audit Log'      },
  { to:'/system',        label:'System'         },
]

function Layout({ children }) {
  const { logout } = useContext(AuthCtx)
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.bg,
                  fontFamily:F.body, color:C.text }}>
      <aside style={{ width:204, background:C.surface, borderRight:`1px solid ${C.border}`,
                      display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 16px 14px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:F.heading, fontSize:21, fontWeight:700, color:C.red }}>semelpass™</div>
          <div style={{ fontSize:10, color:C.muted, marginTop:3, letterSpacing:'0.1em',
                        textTransform:'uppercase' }}>Admin Portal</div>
        </div>
        <nav style={{ flex:1, padding:'8px 0' }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
              display:'block', padding:'9px 16px 9px 14px', textDecoration:'none',
              fontSize:13.5, fontWeight: isActive ? 600 : 400,
              color: isActive ? C.red : C.textSoft,
              background: isActive ? C.redLight : 'transparent',
              borderLeft:`3px solid ${isActive ? C.red : 'transparent'}`,
              transition:'all 0.12s',
            })}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:'0.06em',
                        textTransform:'uppercase', marginBottom:8 }}>v26.05.1.0</div>
          <button onClick={logout} style={{ width:'100%', padding:'7px 0', background:'transparent',
            border:`1px solid ${C.border}`, borderRadius:4, cursor:'pointer',
            fontSize:12.5, color:C.textSoft, fontFamily:F.body }}>
            Sign Out
          </button>
        </div>
      </aside>
      <main style={{ flex:1, overflow:'auto' }}>{children}</main>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    fetch('/admin/api/tenants', { credentials:'include' })
      .then(r => setAuthed(r.ok))
      .catch(() => setAuthed(false))
  }, [])

  const logout = () =>
    fetch('/admin/api/logout', { method:'POST', credentials:'include' })
      .finally(() => setAuthed(false))

  if (authed === null) return <Spinner />

  return (
    <AuthCtx.Provider value={{ authed, setAuthed, logout }}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={
            authed ? <Navigate to="/dashboard" replace />
                   : <Login onLogin={() => setAuthed(true)} />
          } />
          {authed ? (
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/dashboard"    element={<Dashboard />}    />
                  <Route path="/tenants"       element={<Tenants />}      />
                  <Route path="/demo-requests" element={<DemoRequests />} />
                  <Route path="/api-keys"      element={<ApiKeys />}      />
                  <Route path="/audit-log"     element={<AuditLog />}     />
                  <Route path="/system"        element={<System />}       />
                  <Route path="/"             element={<Navigate to="/dashboard" replace />} />
                  <Route path="*"             element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            } />
          ) : (
            <Route path="/*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
