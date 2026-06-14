export default function BillingSuccessPage() {
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
      <div style={{ maxWidth: 560, textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "var(--coral-tint)",
            color: "var(--coral)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg viewBox="0 0 16 16" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.2 3L13 5" />
          </svg>
        </div>
        <span className="mono coral">You&apos;re reserved</span>
        <h1 className="display h3" style={{ margin: "12px 0 14px" }}>
          Card saved - nothing charged yet.
        </h1>
        <p className="lede" style={{ color: "var(--text-2)" }}>
          We&apos;ll <strong>reach out within 3 business days</strong> to schedule your install. We
          set up the workstation in your office, verify everything works, and your free trial starts
          that day — billing only begins when the trial ends.
        </p>
        <a href="/" className="btn-primary" style={{ marginTop: 28 }}>
          Back to site
        </a>
      </div>
    </main>
  );
}
