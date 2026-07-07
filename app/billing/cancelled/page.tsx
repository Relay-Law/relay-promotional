export default function BillingCancelledPage() {
  return (
    <main
      className="rl"
      style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}
    >
      <div style={{ maxWidth: 540, textAlign: "center" }}>
        <div className="rl-kicker center" />
        <span className="rl-eyebrow">§ &nbsp; Checkout cancelled</span>
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
          No problem — <em style={{ fontStyle: "italic", color: "var(--coral)" }}>nothing was charged.</em>
        </h1>
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: 17,
            lineHeight: 1.66,
            color: "var(--ink-65)",
            margin: "22px auto 0",
            maxWidth: "50ch",
          }}
        >
          Your card wasn&apos;t saved and no firm was created. You can pick up where you left off
          whenever you&apos;re ready.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
          <a href="/billing" className="rl-btn">
            Back to setup <span className="arr">→</span>
          </a>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontFamily: "var(--sans)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              padding: "15px 22px",
              borderRadius: 2,
              border: "1px solid var(--line)",
              color: "var(--ink-65)",
            }}
          >
            Return home
          </a>
        </div>
      </div>
    </main>
  );
}
