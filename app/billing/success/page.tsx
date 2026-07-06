export default function BillingSuccessPage() {
  return (
    <main
      className="rl"
      style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}
    >
      <div style={{ maxWidth: 580, textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 26px",
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--coral) 12%, transparent)",
            color: "var(--coral)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg viewBox="0 0 16 16" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.2 3L13 5" />
          </svg>
        </div>
        <div className="rl-kicker center" />
        <span className="rl-eyebrow">§ &nbsp; You&apos;re reserved</span>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontWeight: 340,
            fontSize: "clamp(30px,4.4vw,48px)",
            lineHeight: 1.02,
            letterSpacing: "-.025em",
            margin: "16px 0 0",
            color: "var(--ink)",
          }}
        >
          Card saved — <em style={{ fontStyle: "italic", color: "var(--coral)" }}>nothing charged yet.</em>
        </h1>
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: 17,
            lineHeight: 1.66,
            color: "var(--ink-65)",
            margin: "22px auto 0",
            maxWidth: "54ch",
          }}
        >
          We&apos;ll <strong className="rl-mark">reach out within 3 business days</strong> to schedule
          your install. We set up the workstation in your office, verify everything works, and your
          free trial starts that day — billing only begins when the trial ends.
        </p>
        <a href="/" className="rl-btn" style={{ marginTop: 30 }}>
          Back to site <span className="arr">→</span>
        </a>
      </div>
    </main>
  );
}
