"use client";

import { useState } from "react";

const SEAT_PRICE = 50; // $/seat/month (demo)
const HARDWARE_PRICE = 800; // reference workstation
const LEASE_MONTHS = 6;
const LEASE_RATE = 0.1;
const LEASE_MONTHLY = Math.round((HARDWARE_PRICE * (1 + LEASE_RATE)) / LEASE_MONTHS);

type Hardware = "finance" | "buy_spec" | "byo";

const HARDWARE_OPTIONS: { id: Hardware; title: string; line: string; sub: string }[] = [
  {
    id: "finance",
    title: "Finance through us",
    line: `$${LEASE_MONTHLY}/mo × ${LEASE_MONTHS} months`,
    sub: "We front the workstation and bring it to you fast — no $800 upfront, no procurement.",
  },
  {
    id: "buy_spec",
    title: "Buy your own",
    line: "≈ $800, you purchase",
    sub: "We send you a validated spec / purchase link. You buy it; we set it up.",
  },
  {
    id: "byo",
    title: "I already have a machine",
    line: "No hardware needed",
    sub: "You have a workstation that meets the spec. We just deploy onto it.",
  },
];

export default function BillingPage() {
  const [email, setEmail] = useState("");
  const [seats, setSeats] = useState(1);
  const [hardware, setHardware] = useState<Hardware>("finance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const softwareMonthly = seats * SEAT_PRICE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid work email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), seats, hardwareChoice: hardware }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="rl" style={{ minHeight: "100vh" }}>
      {/* Top bar */}
      <div className="rl-topbar">
        <div className="rl-wrap">
          <div className="rl-topbar-inner">
            <a href="/" className="rl-brand" style={{ color: "var(--ink)" }}>
              <img
                src="/relay-logos/black_relay.svg"
                alt="Relay"
                style={{ height: 24, width: "auto", display: "block" }}
              />
            </a>
            <a href="/" className="rl-price-alt" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              ← Back to site
            </a>
          </div>
        </div>
      </div>

      <section style={{ padding: "clamp(48px,7vw,84px) 0 96px" }}>
        <div className="rl-wrap" style={{ maxWidth: 1060 }}>
          <div className="rl-kicker" />
          <span className="rl-eyebrow">§ &nbsp; Get started</span>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 340,
              fontSize: "clamp(34px,5vw,60px)",
              lineHeight: 1,
              letterSpacing: "-.025em",
              margin: "18px 0 0",
              color: "var(--ink)",
            }}
          >
            Set up Relay for <em style={{ fontStyle: "italic", color: "var(--coral)" }}>your firm.</em>
          </h1>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 17,
              lineHeight: 1.66,
              color: "var(--ink-65)",
              maxWidth: "58ch",
              margin: "24px 0 0",
            }}
          >
            Save a card to reserve your setup — <strong className="rl-mark">no charge today</strong>. We
            install Relay in your office, and your free trial starts the day it&apos;s live.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
              gap: 24,
              marginTop: 44,
              alignItems: "start",
            }}
          >
            {/* Left: configurator */}
            <div style={{ display: "grid", gap: 20 }}>
              {/* Email */}
              <div className="rl-card">
                <label className="rl-label">Work email</label>
                <p className="rl-help">
                  The firm&apos;s billing contact. We&apos;ll reach out here to schedule install.
                </p>
                <input
                  className="rl-input"
                  type="email"
                  required
                  placeholder="you@yourfirm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Seats */}
              <div className="rl-card">
                <label className="rl-label">Seats</label>
                <p className="rl-help">
                  One per attorney or staff member. ${SEAT_PRICE}/seat/month. Change anytime.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Stepper value={seats} onChange={(n) => setSeats(Math.max(1, n))} />
                  <span style={{ color: "var(--ink-65)", fontSize: 14 }}>
                    = <strong style={{ color: "var(--ink)", fontWeight: 500 }}>${softwareMonthly}</strong>/mo
                    after trial
                  </span>
                </div>
              </div>

              {/* Hardware */}
              <div className="rl-card">
                <label className="rl-label">Hardware</label>
                <p className="rl-help">
                  Relay runs on a workstation in your office. Pick how you want to get one.
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  {HARDWARE_OPTIONS.map((opt) => {
                    const active = hardware === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setHardware(opt.id)}
                        className={`rl-opt${active ? " active" : ""}`}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "baseline",
                          }}
                        >
                          <span style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 14.5, color: "var(--ink)" }}>
                            {opt.title}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--sans)",
                              fontSize: 13,
                              color: active ? "var(--coral)" : "var(--ink-45)",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {opt.line}
                          </span>
                        </div>
                        <p style={{ margin: "5px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-45)" }}>
                          {opt.sub}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {hardware === "finance" && (
                  <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--ink-45)" }}>
                    Financing ({LEASE_RATE * 100}% over {LEASE_MONTHS} months) is finalized during
                    onboarding, on a separate agreement. Today only saves your card.
                  </p>
                )}
              </div>
            </div>

            {/* Right: summary + CTA */}
            <aside className="rl-card" style={{ position: "sticky", top: 96 }}>
              <h3 style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 360, fontSize: 22, margin: "0 0 16px", color: "var(--ink)" }}>
                Summary
              </h3>
              <Row label={`Relay software · ${seats} seat${seats > 1 ? "s" : ""}`} value={`$${softwareMonthly}/mo`} />
              <Row
                label="Workstation"
                value={
                  hardware === "finance"
                    ? `$${LEASE_MONTHLY}/mo`
                    : hardware === "buy_spec"
                      ? "you buy"
                      : "—"
                }
              />
              <div style={{ borderTop: "1px solid var(--line)", margin: "16px 0" }} />
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-45)", margin: "0 0 18px" }}>
                Charged after your trial. The software trial starts when Relay is live in your office —
                not today.
              </p>

              {error && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--coral)",
                    background: "color-mix(in srgb, var(--coral) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--coral) 30%, transparent)",
                    padding: "9px 12px",
                    borderRadius: 4,
                    margin: "0 0 14px",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="rl-btn"
                disabled={loading}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? "Starting…" : <>Save card &amp; reserve setup <span className="arr">→</span></>}
              </button>
              <p style={{ fontSize: 11, fontFamily: "var(--sans)", letterSpacing: ".04em", color: "var(--ink-30)", textAlign: "center", margin: "12px 0 0" }}>
                Secure checkout by Stripe · no charge today
              </p>

              {/* What happens next */}
              <div style={{ borderTop: "1px solid var(--line)", margin: "22px 0 0", paddingTop: 20 }}>
                <span className="rl-eyebrow">What happens next</span>
                <ol
                  style={{
                    margin: "14px 0 0",
                    paddingLeft: 18,
                    fontSize: 13.5,
                    color: "var(--ink-65)",
                    lineHeight: 1.6,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <li>
                    We <strong style={{ color: "var(--ink)", fontWeight: 500 }}>reach out within 3 business days</strong> to
                    schedule your install.
                  </li>
                  <li>We deliver &amp; set up the workstation in your office and verify it works.</li>
                  <li>
                    Your free trial starts <strong style={{ color: "var(--ink)", fontWeight: 500 }}>that day</strong> — then
                    per-seat billing begins when the trial ends.
                  </li>
                </ol>
              </div>
            </aside>
          </form>
        </div>
      </section>
    </main>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" className="rl-step" onClick={() => onChange(value - 1)} aria-label="Fewer seats">
        −
      </button>
      <span style={{ minWidth: 28, textAlign: "center", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>
        {value}
      </span>
      <button type="button" className="rl-step" onClick={() => onChange(value + 1)} aria-label="More seats">
        +
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, padding: "6px 0" }}>
      <span style={{ color: "var(--ink-65)" }}>{label}</span>
      <span style={{ fontWeight: 500, color: "var(--ink)" }}>{value}</span>
    </div>
  );
}
