import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (next-auth v5) config for the internal ops dashboard.
 *
 * Sign-in is Google-only and restricted to the team. Access is granted ONLY when the Google account's
 * verified email matches OPS_ALLOWED_DOMAIN (e.g. "relay-law.com") or is listed in OPS_ALLOWED_EMAILS
 * (comma-separated). If NEITHER is configured, every sign-in is denied — fail closed, never open.
 *
 * No database adapter → JWT sessions, which keeps the whole thing Edge-safe so middleware.ts can call
 * auth() to gate /ops and /api/ops.
 */
const allowedDomain = (process.env.OPS_ALLOWED_DOMAIN ?? "").trim().toLowerCase();
const allowedEmails = (process.env.OPS_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowed(email: string | undefined | null, emailVerified: boolean): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (allowedEmails.includes(e)) return true;
  if (allowedDomain && emailVerified && e.endsWith(`@${allowedDomain}`)) return true;
  return false; // fail closed
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the host header so this works on localhost and the future ops.* subdomain alike.
  trustHost: true,
  providers: [Google], // reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from env
  pages: {
    signIn: "/ops/signin",
    error: "/ops/signin",
  },
  callbacks: {
    async signIn({ profile, user }) {
      const email = profile?.email ?? user?.email ?? null;
      // Google sets email_verified; require it for the domain match.
      const verified = Boolean((profile as { email_verified?: boolean } | undefined)?.email_verified);
      return isAllowed(email, verified);
    },
  },
});
