"use client";

import { useCallback, useEffect, useState } from "react";
import type { FirmRecord } from "@/lib/store";
import { OpsNav, badgeStyle, isDeployed, isOnline, maskKey, timeAgo } from "@/app/ops/ops-ui";

export default function FleetPage() {
  const [firms, setFirms] = useState<FirmRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/ops/firms", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load fleet");
      setFirms(data.firms as FirmRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleet");
      setFirms([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function dev(action: "seed" | "reindex") {
    setBusy(true);
    try {
      await fetch(`/api/ops/${action}`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
      <OpsNav />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 32px 96px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
          <div>
            <span className="mono coral">Management</span>
            <h1 className="display h3" style={{ margin: "10px 0 0" }}>
              Computer Fleet
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" style={smallBtn} disabled={busy} onClick={() => dev("reindex")}>
              Reindex
            </button>
            <button className="btn-ghost" style={smallBtn} disabled={busy} onClick={() => dev("seed")}>
              Seed demo data
            </button>
            <button className="btn-ghost" style={smallBtn} disabled={busy} onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <p style={{ marginTop: 20, color: "var(--coral-deep)", background: "var(--coral-tint)", padding: "10px 14px", borderRadius: 8, fontSize: 13.5 }}>
            {error}
          </p>
        )}

        {firms === null ? (
          <p style={{ marginTop: 40, color: "var(--text-3)" }}>Loading fleet…</p>
        ) : firms.length === 0 ? (
          <div style={{ marginTop: 40, padding: 40, textAlign: "center", border: "1px dashed var(--line-strong)", borderRadius: 14, color: "var(--text-3)" }}>
            <p style={{ margin: 0 }}>No firms yet.</p>
            <p style={{ margin: "8px 0 0", fontSize: 13.5 }}>
              Click <strong>Seed demo data</strong> to populate dev, or <strong>Reindex</strong> if firms exist but aren&apos;t listed.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 28, border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--surface)", textAlign: "left" }}>
                  {["Firm", "Status", "Seats", "Version", "Online", "License key", "Update"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {firms.map((f) => {
                  const deployed = isDeployed(f);
                  const online = isOnline(f);
                  return (
                    <tr
                      key={f.licenseKey}
                      style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
                      onClick={() => {
                        window.location.href = `/ops/firm/${encodeURIComponent(f.licenseKey)}`;
                      }}
                    >
                      <td style={td}>
                        <div style={{ fontWeight: 500 }}>{f.firmName ?? "—"}</div>
                        <div style={{ color: "var(--text-3)", fontSize: 12.5 }}>{f.email ?? "no email"}</div>
                      </td>
                      <td style={td}>
                        <span style={badgeStyle(deployed ? "ok" : "muted")}>
                          {deployed ? "Deployed" : "Pending"}
                        </span>
                      </td>
                      <td style={td}>
                        {f.activeSeats != null ? `${f.activeSeats}/${f.seats}` : f.seats}
                      </td>
                      <td style={td}>{f.relayVersion ?? <span style={{ color: "var(--text-4)" }}>—</span>}</td>
                      <td style={td}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "var(--ok)" : "var(--text-4)" }} />
                          <span style={{ color: "var(--text-3)", fontSize: 12.5 }}>
                            {f.lastSeenAt ? timeAgo(f.lastSeenAt) : "never"}
                          </span>
                        </span>
                      </td>
                      <td style={{ ...td, fontFamily: "var(--mono)", fontSize: 12 }}>{maskKey(f.licenseKey)}</td>
                      <td style={td}>
                        <span style={{ color: "var(--text-3)", fontSize: 12.5 }}>{f.updateStatus ?? "idle"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

const th: React.CSSProperties = {
  padding: "12px 16px",
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  fontWeight: 600,
};
const td: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle" };
const smallBtn: React.CSSProperties = { padding: "9px 14px", fontSize: 11 };
