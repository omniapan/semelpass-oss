// src/portal/App.jsx
// semelpass-OSS — Tenant Portal
// M4 | Rev 41 — Billing tab added, sidebar plan live

import { createContext, useContext, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
} from "react-router-dom";
import { C, F } from "../shared/theme.js";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MyApp from "./pages/MyApp.jsx";
import Integration from "./pages/Integration.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import Help from "./pages/Help.jsx";
import Billing from "./pages/Billing.jsx";

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/portal/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setTenant(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch("/portal/api/logout", { method: "POST", credentials: "include" });
    setTenant(null);
  };

  return (
    <AuthCtx.Provider value={{ tenant, setTenant, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

function Protected({ children }) {
  const { tenant, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!tenant) return <Navigate to="/login" replace />;
  return children;
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14 }}>Loading…</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const NAV = [
  { to: "/dashboard",   label: "Dashboard" },
  { to: "/app",         label: "My App" },
  { to: "/integration", label: "Integration" },
  { to: "/audit-log",   label: "Audit Log" },
  { to: "/billing",     label: "Billing" },
  { to: "/help",        label: "Help" },
];

function Sidebar() {
  const { tenant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "10px 20px",
    textDecoration: "none",
    fontFamily: F.body,
    fontSize: 13,
    fontWeight: 500,
    color: isActive ? C.red : C.text,
    background: isActive ? (C.red + "10") : "transparent",
    borderLeft: isActive ? ("3px solid " + C.red) : "3px solid transparent",
    transition: "all 0.15s",
  });

  // Derive plan label from tenant data — no longer hardcoded
  const planLabel = tenant?.plan
    ? (tenant.plan === "self_hosted" ? "self-hosted"
     : tenant.plan === "managed"    ? "managed"
     : tenant.plan)
    : "free";

  return (
    <div style={{
      width: 220,
      minHeight: "100vh",
      background: C.surface,
      borderRight: "1px solid " + C.border,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid " + C.border }}>
        <div style={{ fontFamily: F.heading, fontStyle: "italic", fontSize: 20, color: C.red, fontWeight: 700 }}>
          semelpass™
        </div>
        <div style={{ fontFamily: F.body, fontSize: 10, color: C.muted, letterSpacing: "0.12em", marginTop: 2, textTransform: "uppercase" }}>
          Tenant Portal
        </div>
        {tenant && (
          <div style={{ marginTop: 10, fontFamily: F.body, fontSize: 12, color: C.text, fontWeight: 600, background: C.bg, borderRadius: 6, padding: "4px 8px" }}>
            {tenant.name}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 12 }}>
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} style={linkStyle}>{label}</NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid " + C.border }}>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginBottom: 10 }}>
          {"plan: " + planLabel}
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "8px 0",
            background: "transparent",
            border: "1px solid " + C.border,
            borderRadius: 6,
            color: C.muted,
            fontFamily: F.body,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/portal">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Protected><Layout><Dashboard /></Layout></Protected>} />
          <Route path="/app"         element={<Protected><Layout><MyApp /></Layout></Protected>} />
          <Route path="/integration" element={<Protected><Layout><Integration /></Layout></Protected>} />
          <Route path="/audit-log"   element={<Protected><Layout><AuditLog /></Layout></Protected>} />
          <Route path="/billing"     element={<Protected><Layout><Billing /></Layout></Protected>} />
          <Route path="/help"        element={<Protected><Layout><Help /></Layout></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
