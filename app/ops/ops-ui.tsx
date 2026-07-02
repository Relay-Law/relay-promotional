"use client";

import { signOut } from "next-auth/react";
import type { FirmRecord } from "@/lib/store";

/** A firm counts as "deployed" once its Stripe subscription exists (regardless of exact status). */
export function isDeployed(f: Pick<FirmRecord, "subscriptionId" | "status">): boolean {
  return Boolean(f.subscriptionId) || ["trialing", "active", "past_due"].includes(f.status);
}

/** Online if it checked in within the last 30 minutes. */
export function isOnline(f: Pick<FirmRecord, "lastSeenAt">): boolean {
  if (!f.lastSeenAt) return false;
  return Date.now() - new Date(f.lastSeenAt).getTime() < 30 * 60_000;
}

/**
 * Best-effort semver compare: <0 if a<b, 0 if equal, >0 if a>b. Non-numeric versions (e.g. "dev")
 * fall back to a string compare, so a real release always reads as newer than a dev build.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, "").split("-")[0].split(".").map((n) => parseInt(n, 10));
  const pa = parse(a);
  const pb = parse(b);
  if (pa.some(Number.isNaN) || pb.some(Number.isNaN)) return a === b ? 0 : a < b ? -1 : 1;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** True when `current` is a real version strictly older than the promoted `latest`. */
export function updateAvailable(current?: string, latest?: string | null): boolean {
  if (!current || !latest) return false;
  return compareVersions(current, latest) < 0;
}

/** Show the prefix + last 4 so a key is recognizable without exposing the whole thing on screen. */
export function maskKey(key: string): string {
  if (key.length <= 16) return key;
  return `${key.slice(0, 11)}…${key.slice(-4)}`;
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function badgeStyle(kind: "ok" | "muted" | "warn"): React.CSSProperties {
  const map = {
    ok: { color: "var(--ok)", border: "rgba(80,200,120,0.4)", bg: "rgba(80,200,120,0.1)" },
    muted: { color: "var(--text-3)", border: "var(--line-strong)", bg: "transparent" },
    warn: { color: "var(--coral)", border: "var(--line-coral)", bg: "var(--coral-tint)" },
  }[kind];
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: "var(--mono)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: map.color,
    border: `1px solid ${map.border}`,
    background: map.bg,
  };
}

export function OpsNav() {
  return (
    <nav className="nav">
      <div className="nav-inner" style={{ maxWidth: 1180 }}>
        <a className="brand" href="/ops" style={{ fontSize: 22 }}>
          <img src="/relay-logos/white_relay.svg" alt="Relay" style={{ height: 32, width: "auto" }} />
          <span className="mono" style={{ marginLeft: 4, color: "var(--coral)" }}>Ops</span>
        </a>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/" className="btn-ghost" style={{ padding: "9px 16px", fontSize: 11 }}>
            ← Site
          </a>
          <button
            className="btn-ghost"
            style={{ padding: "9px 16px", fontSize: 11 }}
            onClick={() => signOut({ callbackUrl: "/ops/signin" })}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
