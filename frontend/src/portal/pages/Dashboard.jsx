// src/portal/pages/Dashboard.jsx
// semelpass-OSS — Tenant Portal Dashboard
// OTP volume 24h/7d/30d · success rate · active apps · recent activity

import { useState, useEffect } from "react";
import { C, F } from "../../shared/theme.js";
import { useAuth } from "../App.jsx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function api(path) {
  return fetch(`/portal/api${path}`, { credentials: "include" });
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "20px 22px",
      flex: 1,
    }}>
      <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: F.heading, fontSize: 28, fontWeight: 700, color: accent || C.text }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { tenant } = useAuth();
  const [stats, setStats]       = useState(null);
  const [log, setLog]           = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api("/stats").then((r) => r.ok ? r.json() : null),
      api("/audit-log?limit=8").then((r) => r.ok ? r.json() : null),
    ]).then(([s, l]) => {
      setStats(s);
      setLog(l?.rows || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <Placeholder />;

  const vol = stats?.otp_volume || {};
  const rate = stats?.success_rate || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: F.heading, fontStyle: "italic", fontSize: 26, color: C.text, margin: 0 }}>
          Dashboard
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
          {tenant?.name} · {tenant?.slug}
        </p>
      </div>

      {/* Stat cards — row 1: volume */}
      <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
        OTP Volume
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <StatCard label="Last 24h" value={vol.sent_24h ?? "—"} sub="OTPs sent" />
        <StatCard label="Last 7 days" value={vol.sent_7d ?? "—"} sub="OTPs sent" />
        <StatCard label="Last 30 days" value={vol.sent_30d ?? "—"} sub="OTPs sent" />
      </div>

      {/* Stat cards — row 2: success rate */}
      <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
        Success Rate
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard
          label="24h rate"
          value={rate.rate_24h != null ? `${rate.rate_24h}%` : "—"}
          accent={_rateColor(rate.rate_24h)}
        />
        <StatCard
          label="7-day rate"
          value={rate.rate_7d != null ? `${rate.rate_7d}%` : "—"}
          accent={_rateColor(rate.rate_7d)}
        />
        <StatCard
          label="30-day rate"
          value={rate.rate_30d != null ? `${rate.rate_30d}%` : "—"}
          accent={_rateColor(rate.rate_30d)}
        />
      </div>

      {/* Recent activity */}
      <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
        Recent Activity
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {log.length === 0 ? (
          <div style={{ padding: "24px 20px", fontFamily: F.body, fontSize: 13, color: C.muted }}>
            No activity yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["Timestamp", "Event", "Detail"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? C.surface : C.bg }}>
                  <td style={tdStyle}>{_fmt(row.created_at)}</td>
                  <td style={tdStyle}><code style={{ fontFamily: F.mono, fontSize: 12 }}>{row.event}</code></td>
                  <td style={tdStyle}>{row.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, paddingTop: 40 }}>
      Loading dashboard…
    </div>
  );
}

function _fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function _rateColor(rate) {
  if (rate == null) return C.text;
  if (rate >= 80) return C.green;
  if (rate >= 50) return C.amber;
  return C.red;
}

const thStyle = {
  fontFamily: "system-ui, sans-serif",
  fontSize: 10,
  fontWeight: 600,
  color: "#8B7355",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "10px 16px",
  textAlign: "left",
};

const tdStyle = {
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  color: "#2C1810",
  padding: "10px 16px",
  borderTop: "1px solid #E8DCC8",
};
