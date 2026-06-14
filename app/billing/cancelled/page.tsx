export default function BillingCancelledPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-1)",
        display: "grid",
        placeItems: "center",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <span className="mono">Checkout cancelled</span>
        <h1 className="display h3" style={{ margin: "12px 0 14px" }}>
          No problem — nothing was charged.
        </h1>
        <p className="lede" style={{ color: "var(--text-2)" }}>
          Your card wasn&apos;t saved and no firm was created. You can pick up where you left off
          whenever you&apos;re ready.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
          <a href="/billing" className="btn-primary">
            Back to setup
          </a>
          <a href="/" className="btn-ghost">
            Return home
          </a>
        </div>
      </div>
    </main>
  );
}
