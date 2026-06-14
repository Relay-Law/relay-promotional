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

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 24,
};

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
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
                <circle cx="15" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
              </svg>
            </span>
            <span>Relay</span>
          </a>
          <a href="/" className="btn-ghost" style={{ padding: "9px 16px", fontSize: 13.5 }}>
            ← Back to site
          </a>
        </div>
      </nav>

      <div className="wrap-narrow" style={{ padding: "56px 32px 96px" }}>
        <span className="mono coral">Get started</span>
        <h1 className="display h2" style={{ margin: "12px 0 14px" }}>
          Set up Relay for your firm.
        </h1>
        <p className="lede" style={{ color: "var(--text-2)", maxWidth: 620 }}>
          Save a card to reserve your setup — <strong>no charge today</strong>. We install Relay in
          your office, and your free trial starts the day it&apos;s live.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
            gap: 24,
            marginTop: 40,
            alignItems: "start",
          }}
        >
          {/* Left: configurator */}
          <div style={{ display: "grid", gap: 20 }}>
            {/* Email */}
            <div style={card}>
              <label style={{ fontWeight: 500, fontSize: 15 }}>Work email</label>
              <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 12px" }}>
                The firm&apos;s billing contact. We&apos;ll reach out here to schedule install.
              </p>
              <input
                type="email"
                required
                placeholder="you@yourfirm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 9,
                  border: "1px solid var(--line-strong)",
                  background: "var(--bg)",
                  color: "var(--text-1)",
                  fontSize: 15,
                  outline: "none",
                }}
              />
            </div>

            {/* Seats */}
            <div style={card}>
              <label style={{ fontWeight: 500, fontSize: 15 }}>Seats</label>
              <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 14px" }}>
                One per attorney or staff member. ${SEAT_PRICE}/seat/month. Change anytime.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Stepper value={seats} onChange={(n) => setSeats(Math.max(1, n))} />
                <span style={{ color: "var(--text-2)", fontSize: 14 }}>
                  = <strong style={{ color: "var(--text-1)" }}>${softwareMonthly}</strong>/mo after
                  trial
                </span>
              </div>
            </div>

            {/* Hardware */}
            <div style={card}>
              <label style={{ fontWeight: 500, fontSize: 15 }}>Hardware</label>
              <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 14px" }}>
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
                      style={{
                        textAlign: "left",
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: `1.5px solid ${active ? "var(--coral)" : "var(--line-strong)"}`,
                        background: active ? "var(--coral-tint)" : "transparent",
                        transition: "border-color 150ms, background 150ms",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "baseline",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: 14.5 }}>{opt.title}</span>
                        <span
                          style={{
                            fontSize: 13,
                            color: active ? "var(--coral-deep)" : "var(--text-2)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {opt.line}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-3)" }}>
                        {opt.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
              {hardware === "finance" && (
                <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-3)" }}>
                  Financing ({LEASE_RATE * 100}% over {LEASE_MONTHS} months) is finalized during
                  onboarding, on a separate agreement. Today only saves your card.
                </p>
              )}
            </div>
          </div>

          {/* Right: summary + CTA */}
          <aside style={{ ...card, position: "sticky", top: 88 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 14px" }}>Summary</h3>
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
            <div style={{ borderTop: "1px solid var(--line)", margin: "14px 0" }} />
            <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "0 0 18px" }}>
              Charged after your trial. The software trial starts when Relay is live in your office —
              not today.
            </p>

            {error && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--coral-deep)",
                  background: "var(--coral-tint)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  margin: "0 0 14px",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Starting…" : "Save card & reserve setup"}
            </button>
            <p style={{ fontSize: 11.5, color: "var(--text-4)", textAlign: "center", margin: "10px 0 0" }}>
              Secure checkout by Stripe · no charge today
            </p>

            {/* What happens next */}
            <div style={{ borderTop: "1px solid var(--line)", margin: "20px 0 0", paddingTop: 18 }}>
              <span className="mono" style={{ fontSize: 11 }}>
                What happens next
              </span>
              <ol style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
                <li>
                  We <strong>reach out within 3 business days</strong> to schedule your install.
                </li>
                <li>We deliver &amp; set up the workstation in your office and verify it works.</li>
                <li>
                  Your free trial starts <strong>that day</strong> — then per-seat billing begins
                  when the trial ends.
                </li>
              </ol>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 9,
    border: "1px solid var(--line-strong)",
    background: "var(--bg)",
    color: "var(--text-1)",
    fontSize: 20,
    lineHeight: 1,
    display: "grid",
    placeItems: "center",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" style={btn} onClick={() => onChange(value - 1)} aria-label="Fewer seats">
        −
      </button>
      <span style={{ minWidth: 28, textAlign: "center", fontSize: 18, fontWeight: 500 }}>{value}</span>
      <button type="button" style={btn} onClick={() => onChange(value + 1)} aria-label="More seats">
        +
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, padding: "5px 0" }}>
      <span style={{ color: "var(--text-2)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
