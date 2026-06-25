"use client";

import { signOut } from "next-auth/react";
import type { FirmRecord } from "@/lib/store";

/** A firm counts as "deployed" once its Stripe subscription exists (regardless of exact status). */
export function isDeployed(f: Pick<FirmRecord, "subscriptionId" | "status">): boolean {
  return Boolean(f.subscriptionId) || ["trialing", "active", "past_due"].includes(f.status);
}

/** Online if it polled within the last 30 minutes. */
export function isOnline(f: Pick<FirmRecord, "lastHeartbeat">): boolean {
  if (!f.lastHeartbeat) return false;
  return Date.now() - new Date(f.lastHeartbeat).getTime() < 30 * 60_000;
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
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
              <circle cx="15" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
            </svg>
          </span>
          <span>Relay</span>
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
