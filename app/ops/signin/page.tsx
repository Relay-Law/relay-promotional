"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function SignInInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/ops";
  const error = params.get("error");

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)", display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          margin: "0 24px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div className="brand" style={{ justifyContent: "center", fontSize: 24, marginBottom: 4 }}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
              <circle cx="15" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
            </svg>
          </span>
          <span>Relay</span>
          <span className="mono" style={{ marginLeft: 4, color: "var(--coral)" }}>Ops</span>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 13.5, margin: "8px 0 24px" }}>
          Internal dashboard — team access only.
        </p>

        {error && (
          <p
            style={{
              fontSize: 13,
              color: "var(--coral-deep)",
              background: "var(--coral-tint)",
              padding: "10px 12px",
              borderRadius: 8,
              margin: "0 0 16px",
            }}
          >
            {error === "AccessDenied"
              ? "That account isn't allowed. Use your Relay team Google account."
              : "Sign-in failed. Please try again."}
          </p>
        )}

        <button
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
