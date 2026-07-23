"use client";

import { useCallback, useEffect, useState } from "react";
import type { FirmRecord } from "@/lib/store";
import { OpsNav, badgeStyle, compareVersions, isDeployed, isOnline, maskKey, timeAgo, updateAvailable } from "@/app/ops/ops-ui";

interface ReleaseInfo {
  version: string;
  publishedAt?: string;
}

export default function FleetPage() {
  const [firms, setFirms] = useState<FirmRecord[] | null>(null);
  const [stable, setStable] = useState<string | null>(null);
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [promoteVal, setPromoteVal] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [firmsRes, relRes] = await Promise.all([
        fetch("/api/ops/firms", { cache: "no-store" }),
        fetch("/api/ops/releases", { cache: "no-store" }),
      ]);
      const data = await firmsRes.json();
      if (!firmsRes.ok) throw new Error(data.error ?? "Failed to load fleet");
      setFirms(data.firms as FirmRecord[]);
      if (relRes.ok) {
        const rel = await relRes.json();
        setStable((rel.stable as string | null) ?? null);
        setReleases((rel.releases as ReleaseInfo[] | undefined) ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleet");
      setFirms([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function dev(action: "reindex") {
    setBusy(true);
    try {
      await fetch(`/api/ops/${action}`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  /** One-click: point a firm at the promoted stable version. */
  async function update(licenseKey: string, version: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/firms/${encodeURIComponent(licenseKey)}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function promote(explicit?: string) {
    const version = (explicit ?? promoteVal).trim();
    if (!version) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/releases/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Promote failed");
      setPromoteVal("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Promote failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
      <OpsNav />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 32px 96px" }}>
        {/* Stable channel — the version the fleet's one-click "Update" targets. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
            STABLE CHANNEL
          </span>
          <span style={badgeStyle(stable ? "ok" : "muted")}>{stable ?? "none promoted"}</span>
          <input
            value={promoteVal}
            onChange={(e) => setPromoteVal(e.target.value)}
            placeholder="e.g. 0.4.0"
            style={{ padding: "8px 11px", borderRadius: 8, border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--text-1)", fontSize: 13, width: 120, fontFamily: "var(--mono)" }}
          />
          <button className="btn-ghost" style={smallBtn} disabled={busy || !promoteVal.trim()} onClick={() => promote()}>
            Promote to stable
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="btn-ghost" style={smallBtn} disabled={busy} onClick={() => dev("reindex")}>
              Reindex
            </button>
            <button className="btn-ghost" style={smallBtn} disabled={busy} onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {/* Latest published release vs. what's promoted — the "a new build is ready" signal. */}
        {(() => {
          const latest = releases[0];
          if (!latest) return null;
          const unpromoted = !stable || compareVersions(latest.version, stable) > 0;
          return (
            <div
              style={{
                marginTop: 20,
                border: `1px solid ${unpromoted ? "var(--line-coral)" : "var(--line)"}`,
                background: unpromoted ? "var(--coral-tint)" : "var(--surface)",
                borderRadius: 14,
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={badgeStyle(unpromoted ? "warn" : "ok")}>
                  {unpromoted ? "New release ready" : "Up to date"}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600 }}>
                  v{latest.version}
                </span>
                {latest.publishedAt && (
                  <span style={{ color: "var(--text-3)", fontSize: 12.5 }}>
                    published {timeAgo(latest.publishedAt)}
                  </span>
                )}
                {unpromoted && (
                  <button
                    className="btn-ghost"
                    style={{ ...smallBtn, marginLeft: "auto", color: "var(--coral)", borderColor: "var(--line-coral)" }}
                    disabled={busy}
                    onClick={() => promote(latest.version)}
                  >
                    Promote v{latest.version} to stable
                  </button>
                )}
              </div>

              {/* Release history — every tag CI has published, newest first. */}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>
                  RELEASE HISTORY
                </span>
                {releases.map((r) => (
                  <div
                    key={r.version}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "7px 0",
                      borderTop: "1px solid var(--line)",
                      fontSize: 13.5,
                    }}
                  >
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600, minWidth: 70 }}>v{r.version}</span>
                    {r.version === stable && <span style={badgeStyle("ok")}>stable</span>}
                    {r === latest && r.version !== stable && <span style={badgeStyle("muted")}>latest</span>}
                    <span style={{ color: "var(--text-3)", fontSize: 12.5, marginLeft: "auto" }}>
                      {r.publishedAt ? timeAgo(r.publishedAt) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
                      <td style={td}>
                        <div>{f.relayVersion ?? <span style={{ color: "var(--text-4)" }}>—</span>}</div>
                        {f.lastUpdatedAt && (
                          <div style={{ color: "var(--text-4)", fontSize: 11.5 }}>updated {timeAgo(f.lastUpdatedAt)}</div>
                        )}
                      </td>
                      <td style={td}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "var(--ok)" : "var(--text-4)" }} />
                          <span style={{ color: "var(--text-3)", fontSize: 12.5 }}>
                            {f.lastSeenAt ? timeAgo(f.lastSeenAt) : "never"}
                          </span>
                        </span>
                      </td>
                      <td style={{ ...td, fontFamily: "var(--mono)", fontSize: 12 }}>{maskKey(f.licenseKey)}</td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        {/* A box mid-update is the one live state worth surfacing over version truth. */}
                        {f.updateStatus === "updating" ? (
                          <span style={badgeStyle("warn")}>updating</span>
                        ) : f.relayVersion && stable && !updateAvailable(f.relayVersion, stable) ? (
                          // Box already reports a version at/after stable — it's current, even if a
                          // stale "pending" lingers from before it checked in. Truth beats the badge.
                          <span style={{ color: "var(--ok)", fontSize: 12.5 }}>up to date</span>
                        ) : f.updateStatus === "pending" ? (
                          <span style={badgeStyle("warn")}>pending</span>
                        ) : updateAvailable(f.relayVersion, stable) ? (
                          <button
                            className="btn-ghost"
                            style={{ ...smallBtn, color: "var(--coral)", borderColor: "var(--line-coral)" }}
                            disabled={busy}
                            onClick={() => update(f.licenseKey, stable!)}
                          >
                            Update → {stable}
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-3)", fontSize: 12.5 }}>{f.updateStatus ?? "idle"}</span>
                        )}
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
