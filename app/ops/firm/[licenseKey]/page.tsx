"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { FirmRecord, FirmUser } from "@/lib/store";
import { OpsNav, badgeStyle, isDeployed, isOnline, timeAgo } from "@/app/ops/ops-ui";

interface Billing {
  status: string;
  seats: number;
  current_period_end: number | null;
  trial_end: number | null;
  cancel_at_period_end: boolean;
}

export default function FirmDetailPage() {
  const params = useParams<{ licenseKey: string }>();
  const licenseKey = decodeURIComponent(params.licenseKey);

  const [firm, setFirm] = useState<FirmRecord | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetVersion, setTargetVersion] = useState("");
  const [releases, setReleases] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [firmRes, relRes] = await Promise.all([
        fetch(`/api/ops/firms/${encodeURIComponent(licenseKey)}`, { cache: "no-store" }),
        fetch(`/api/ops/releases`, { cache: "no-store" }),
      ]);
      const data = await firmRes.json();
      if (!firmRes.ok) throw new Error(data.error ?? "Failed to load firm");
      setFirm(data.firm as FirmRecord);
      setBilling(data.billing as Billing | null);
      if (relRes.ok) {
        const rel = await relRes.json();
        setReleases((rel.releases as { version: string }[] | undefined)?.map((r) => r.version) ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load firm");
    }
  }, [licenseKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(path: string, body?: unknown, label?: string) {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch(`/api/ops/firms/${encodeURIComponent(licenseKey)}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setNote(label ? `${label} ✓` : "Done ✓");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !firm) {
    return (
      <main style={page}>
        <OpsNav />
        <div style={wrap}>
          <a href="/ops" style={back}>← Fleet</a>
          <p style={{ marginTop: 24, color: "var(--coral-deep)" }}>{error}</p>
        </div>
      </main>
    );
  }
  if (!firm) {
    return (
      <main style={page}>
        <OpsNav />
        <div style={wrap}><p style={{ color: "var(--text-3)" }}>Loading…</p></div>
      </main>
    );
  }

  const deployed = isDeployed(firm);
  const online = isOnline(firm);

  return (
    <main style={page}>
      <OpsNav />
      <div style={wrap}>
        <a href="/ops" style={back}>← Fleet</a>

        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
          <h1 className="display h3" style={{ margin: 0 }}>{firm.firmName ?? "Unnamed firm"}</h1>
          <span style={badgeStyle(deployed ? "ok" : "muted")}>{deployed ? "Deployed" : "Pending"}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-3)", fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "var(--ok)" : "var(--text-4)" }} />
            {firm.lastSeenAt ? `seen ${timeAgo(firm.lastSeenAt)}` : "never seen"}
          </span>
        </div>
        <p style={{ color: "var(--text-3)", margin: "6px 0 0", fontSize: 14 }}>{firm.email ?? "no billing email"}</p>

        {(error || note) && (
          <p style={{ marginTop: 16, fontSize: 13.5, color: error ? "var(--coral-deep)" : "var(--ok)", background: error ? "var(--coral-tint)" : "transparent", padding: error ? "10px 14px" : 0, borderRadius: 8 }}>
            {error ?? note}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 28 }}>
          {/* Telemetry (box-reported) */}
          <section style={card}>
            <h2 style={cardTitle}>Telemetry</h2>
            <Field label="Backend version" value={firm.relayVersion ?? "—"} />
            <Field label="Health" value={firm.boxHealth ?? "—"} />
            <Field label="Active seats" value={firm.activeSeats != null ? `${firm.activeSeats} / ${firm.seats}` : `— / ${firm.seats}`} />
            <Field label="Hostname" value={firm.hostname ?? "—"} />
            <Field label="Last seen" value={firm.lastSeenAt ? timeAgo(firm.lastSeenAt) : "never"} />
            <Field label="Target version" value={firm.targetVersion ?? "—"} />
            <Field label="Update status" value={firm.updateStatus ?? "idle"} />
            {firm.updateError && <Field label="Update error" value={firm.updateError} />}
          </section>

          {/* Billing (live from Stripe) */}
          <section style={card}>
            <h2 style={cardTitle}>Billing <span style={{ fontWeight: 400, color: "var(--text-4)", fontSize: 12 }}>· live from Stripe</span></h2>
            {billing ? (
              <>
                <Field label="Status" value={billing.status} />
                <Field label="Seats" value={String(billing.seats)} />
                <Field label="Current period end" value={fmtDate(billing.current_period_end)} />
                <Field label="Trial end" value={fmtDate(billing.trial_end)} />
                <Field label="Cancels at period end" value={billing.cancel_at_period_end ? "yes" : "no"} />
              </>
            ) : (
              <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: 0 }}>
                {firm.subscriptionId ? "Stripe read unavailable (or test sub)." : "No subscription yet — deploy to start one."}
              </p>
            )}
            <Field label="Hardware" value={firm.hardwareChoice ?? "—"} />
            <Field label="Customer" value={firm.stripeCustomerId} mono />
            <Field label="Subscription" value={firm.subscriptionId ?? "—"} mono />
            <Field label="License key" value={firm.licenseKey} mono />
          </section>
        </div>

        {/* Members & invites (box-reported roster) */}
        <Roster users={firm.users} />

        {/* Actions */}
        <section style={{ ...card, marginTop: 20 }}>
          <h2 style={cardTitle}>Actions</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {!deployed && (
              <button className="btn-primary" style={{ padding: "12px 18px" }} disabled={busy} onClick={() => action("deploy", undefined, "Deployed")}>
                Deploy
              </button>
            )}
            {firm.subscriptionId && (
              firm.cancelAtPeriodEnd ? (
                <button className="btn-ghost" disabled={busy} onClick={() => action("cancel", { resume: true }, "Resumed")}>
                  Resume subscription
                </button>
              ) : (
                <button className="btn-ghost" disabled={busy} onClick={() => action("cancel", { resume: false }, "Cancel scheduled")}>
                  Cancel at period end
                </button>
              )
            )}
          </div>

          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            <span className="mono" style={{ fontSize: 11 }}>Pin an exact version <span style={{ color: "var(--text-4)" }}>(advanced)</span></span>
            <p style={{ color: "var(--text-4)", fontSize: 12, margin: "6px 0 10px" }}>
              For canarying a firm ahead of the stable channel, or rolling back to an older release. Most
              updates should use the one-click <strong>Update</strong> button on the Fleet page.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                list="release-versions"
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                placeholder="e.g. 0.3.2"
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--text-1)", fontSize: 14, width: 160, fontFamily: "var(--mono)" }}
              />
              <datalist id="release-versions">
                {releases.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <button className="btn-ghost" disabled={busy || !targetVersion.trim()} onClick={() => action("update", { version: targetVersion.trim() }, "Target set")}>
                Set target
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: "right", fontFamily: mono ? "var(--mono)" : "inherit", fontSize: mono ? 12 : 13.5, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function fmtDate(unixSecs: number | null): string {
  if (!unixSecs) return "—";
  return new Date(unixSecs * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Parse a SQLite "YYYY-MM-DD HH:MM:SS" (UTC) timestamp into a local date string. */
function fmtJoined(ts?: string): string {
  if (!ts) return "—";
  const d = new Date(ts.includes("T") ? ts : `${ts.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const SEAT_BADGE: Record<string, "ok" | "warn" | "muted"> = {
  active: "ok",
  invited: "warn",
  disabled: "muted",
};

/**
 * Members & invites, mirrored from the box's local user table on its last check-in. Sorted so
 * pending invites surface at the top; "invited" rows are the people who've been added but haven't
 * signed in yet (which is why they don't count toward active seats).
 */
function Roster({ users }: { users?: FirmUser[] }) {
  const rows = [...(users ?? [])].sort((a, b) => rank(a.seatStatus) - rank(b.seatStatus));
  const pending = rows.filter((u) => u.seatStatus === "invited").length;

  return (
    <section style={{ ...card, marginTop: 20 }}>
      <h2 style={cardTitle}>
        Members &amp; invites{" "}
        <span style={{ fontWeight: 400, color: "var(--text-4)", fontSize: 12 }}>
          · roster as of last check-in{pending > 0 ? ` · ${pending} pending` : ""}
        </span>
      </h2>
      {rows.length === 0 ? (
        <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: 0 }}>
          No roster reported yet — the box sends this on its daily check-in (needs an updated backend).
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                {["Member", "Role", "Status", "Joined"].map((h) => (
                  <th key={h} style={rosterTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.email} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={rosterTd}>
                    <div style={{ fontWeight: 500 }}>{u.displayName || u.email}</div>
                    {u.displayName && (
                      <div style={{ color: "var(--text-3)", fontSize: 12.5 }}>{u.email}</div>
                    )}
                  </td>
                  <td style={rosterTd}>
                    {u.role === "admin" ? (
                      <span style={{ fontWeight: 600 }}>Admin</span>
                    ) : (
                      <span style={{ color: "var(--text-3)" }}>{u.role ?? "member"}</span>
                    )}
                  </td>
                  <td style={rosterTd}>
                    <span style={badgeStyle(SEAT_BADGE[u.seatStatus ?? ""] ?? "muted")}>
                      {u.seatStatus === "invited" ? "pending" : u.seatStatus ?? "—"}
                    </span>
                  </td>
                  <td style={{ ...rosterTd, color: "var(--text-3)" }}>{fmtJoined(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Sort order for the roster: pending invites first, then active, then disabled. */
function rank(seatStatus?: string): number {
  return seatStatus === "invited" ? 0 : seatStatus === "active" ? 1 : 2;
}

const page: React.CSSProperties = { minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" };
const wrap: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: "40px 32px 96px" };
const back: React.CSSProperties = { color: "var(--text-3)", fontSize: 13, fontFamily: "var(--mono)" };
const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 22 };
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 500, margin: "0 0 14px" };
const rosterTh: React.CSSProperties = {
  padding: "8px 10px",
  fontFamily: "var(--mono)",
  fontSize: 10.5,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  fontWeight: 600,
};
const rosterTd: React.CSSProperties = { padding: "10px 10px", verticalAlign: "middle" };
