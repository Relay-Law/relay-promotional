"use client";

import { useEffect, useState } from "react";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 24,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 9,
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--text-1)",
  fontSize: 15,
  outline: "none",
  fontFamily: "var(--font-mono)",
};

const STORAGE_KEY = "relay_admin_key";

type ActivateResult = {
  ok?: boolean;
  alreadyActive?: boolean;
  subscriptionId?: string;
  status?: string;
  trialEnd?: number | null;
  seats?: number;
  error?: string;
};

export default function AdminPage() {
  // The admin key is the "login" — once present we show the activation tool.
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);

  // Restore a previously pasted key for this browser session.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAdminKey(saved);
      setAuthed(true);
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const key = adminKey.trim();
    if (!key) return;
    sessionStorage.setItem(STORAGE_KEY, key);
    setAdminKey(key);
    setAuthed(true);
  }

  function handleSignOut() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAdminKey("");
    setAuthed(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
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
          {authed ? (
            <button onClick={handleSignOut} className="btn-ghost" style={{ padding: "9px 16px", fontSize: 13.5 }}>
              Sign out
            </button>
          ) : (
            <a href="/" className="btn-ghost" style={{ padding: "9px 16px", fontSize: 13.5 }}>
              ← Back to site
            </a>
          )}
        </div>
      </nav>

      <div className="wrap-narrow" style={{ padding: "56px 32px 96px", maxWidth: 560 }}>
        <span className="mono coral">Admin</span>
        <h1 className="display h2" style={{ margin: "12px 0 14px" }}>
          {authed ? "Activate a firm." : "Sign in."}
        </h1>

        {!authed ? (
          <LoginForm adminKey={adminKey} setAdminKey={setAdminKey} onSubmit={handleLogin} />
        ) : (
          <ActivateForm adminKey={adminKey} onUnauthorized={handleSignOut} />
        )}
      </div>
    </main>
  );
}

function LoginForm({
  adminKey,
  setAdminKey,
  onSubmit,
}: {
  adminKey: string;
  setAdminKey: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <p className="lede" style={{ color: "var(--text-2)", margin: "0 0 28px" }}>
        Paste the admin key to manage firm activations.
      </p>
      <form onSubmit={onSubmit} style={card}>
        <label style={{ fontWeight: 500, fontSize: 15 }}>Admin key</label>
        <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 12px" }}>
          The internal <code>ADMIN_API_KEY</code>. Stored only for this browser session.
        </p>
        <input
          type="password"
          autoFocus
          placeholder="••••••••••••••••"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          style={input}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!adminKey.trim()}
          style={{ width: "100%", justifyContent: "center", marginTop: 16, opacity: adminKey.trim() ? 1 : 0.6 }}
        >
          Continue
        </button>
      </form>
    </>
  );
}

function ActivateForm({ adminKey, onUnauthorized }: { adminKey: string; onUnauthorized: () => void }) {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActivateResult | null>(null);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const key = licenseKey.trim();
    if (!key) {
      setError("Paste a license key.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ licenseKey: key }),
      });
      const data: ActivateResult = await res.json();
      if (res.status === 401) {
        setError("Admin key rejected. Sign in again.");
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Activation failed.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="lede" style={{ color: "var(--text-2)", margin: "0 0 28px" }}>
        Paste a firm&apos;s license key to start its trialing subscription. Run this the day their
        server is installed and verified.
      </p>
      <form onSubmit={handleActivate} style={card}>
        <label style={{ fontWeight: 500, fontSize: 15 }}>License key</label>
        <p style={{ color: "var(--text-3)", fontSize: 13, margin: "4px 0 12px" }}>
          The key generated at signup and pasted into the firm&apos;s server.
        </p>
        <input
          type="text"
          autoFocus
          placeholder="relay_live_…"
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          style={input}
        />

        {error && (
          <p
            style={{
              fontSize: 13,
              color: "var(--coral-deep)",
              background: "var(--coral-tint)",
              padding: "8px 12px",
              borderRadius: 8,
              margin: "14px 0 0",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", marginTop: 16, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Activating…" : "Activate firm"}
        </button>
      </form>

      {result && (
        <div style={{ ...card, marginTop: 20, borderColor: "var(--coral)" }}>
          <span className="mono coral" style={{ fontSize: 11 }}>
            {result.alreadyActive ? "Already active" : "Activated"}
          </span>
          <dl style={{ margin: "12px 0 0", fontSize: 14, display: "grid", gap: 8 }}>
            <ResultRow label="Subscription" value={result.subscriptionId ?? "—"} mono />
            <ResultRow label="Status" value={result.status ?? "—"} />
            {typeof result.seats === "number" && <ResultRow label="Seats" value={String(result.seats)} />}
            {result.trialEnd ? (
              <ResultRow label="Trial ends" value={new Date(result.trialEnd * 1000).toLocaleDateString()} />
            ) : null}
          </dl>
        </div>
      )}
    </>
  );
}

function ResultRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <dt style={{ color: "var(--text-2)" }}>{label}</dt>
      <dd
        style={{
          margin: 0,
          fontWeight: 500,
          fontFamily: mono ? "var(--font-mono)" : undefined,
          fontSize: mono ? 13 : 14,
          wordBreak: "break-all",
          textAlign: "right",
        }}
      >
        {value}
      </dd>
    </div>
  );
}
