// src/portal/pages/AuditLog.jsx
// semelpass-OSS — Tenant Portal: Audit Log
// Tenant-scoped · 30-day retention (free gate) · filterable

import { useState, useEffect } from "react";
import { C, F } from "../../shared/theme.js";

function api(path) {
  return fetch(`/portal/api${path}`, { credentials: "include" });
}

const EVENT_TYPES = [
  "",
  "otp_sent",
  "otp_verified",
  "otp_failed",
  "app_secret_rotated",
  "portal_login",
];

const LIMITS = [25, 50, 100, 250];

function Badge({ text }) {
  const color = {
    otp_sent:             { bg: `${C.green}15`,  text: C.green },
    otp_verified:         { bg: `${C.green}25`,  text: C.green },
    otp_failed:           { bg: `${C.red}15`,    text: C.red   },
    app_secret_rotated:   { bg: `${C.amber}15`,  text: C.amber },
    portal_login:         { bg: `${C.red}10`,    text: C.red   },
  }[text] || { bg: `${C.border}`, text: C.muted };

  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 12,
      background: color.bg,
      color: color.text,
      fontFamily: F.mono,
      fontSize: 11,
      fontWeight: 600,
    }}>
      {text}
    </span>
  );
}

export default function AuditLog() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [event, setEvent]   = useState("");
  const [limit, setLimit]   = useState(50);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit });
    if (event) params.set("event", event);
    api(`/audit-log?${params}`)
      .then((r) => r.ok ? r.json() : { rows: [] })
      .then((data) => { setRows(data.rows || []); setLoading(false); });
  };

  useEffect(load, []);  // initial load

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: F.heading, fontStyle: "italic", fontSize: 26, color: C.text, margin: 0 }}>
          Audit Log
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
          Your tenant activity · 30-day retention · scoped to your account only
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-end",
        marginBottom: 16,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 20px",
      }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Event Type</label>
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            style={selectStyle}
          >
            <option value="">All events</option>
            {EVENT_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Rows</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={selectStyle}
          >
            {LIMITS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button onClick={load} style={refreshBtn}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Retention notice */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: F.body,
        fontSize: 12,
        color: C.amber,
        marginBottom: 16,
      }}>
        <span>🔒</span>
        <span>30-day retention on free plan. <a href="mailto:hello@semelpass.ai" style={{ color: C.red }}>Upgrade for 90+ days →</a></span>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "28px 20px", fontFamily: F.body, fontSize: 13, color: C.muted }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "28px 20px", fontFamily: F.body, fontSize: 13, color: C.muted }}>
            No events found{event ? ` for event type "${event}"` : ""}.
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
              {rows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? C.surface : C.bg }}>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", color: C.muted, fontSize: 12 }}>
                    {_fmt(row.created_at)}
                  </td>
                  <td style={tdStyle}>
                    <Badge text={row.event} />
                  </td>
                  <td style={{ ...tdStyle, color: C.muted, fontSize: 12 }}>
                    {row.detail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && rows.length > 0 && (
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 10, textAlign: "right" }}>
          {rows.length} row{rows.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function _fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const labelStyle = {
  display: "block",
  fontFamily: "system-ui, sans-serif",
  fontSize: 10,
  fontWeight: 600,
  color: "#8B7355",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 5,
};

const selectStyle = {
  padding: "8px 10px",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  color: "#2C1810",
  background: "#FDF6EC",
  border: "1px solid #DDD0BB",
  borderRadius: 7,
  outline: "none",
  minWidth: 160,
};

const refreshBtn = {
  padding: "8px 18px",
  background: "#C41E3A",
  color: "#fff",
  border: "none",
  borderRadius: 7,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  alignSelf: "flex-end",
};

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
