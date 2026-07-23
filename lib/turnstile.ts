/**
 * Server-side verification for Cloudflare Turnstile (invisible/managed CAPTCHA).
 *
 * Graceful degradation, matching the Resend pattern in lib/email.ts: if TURNSTILE_SECRET_KEY is
 * unset, verification is a NO-OP that returns true. So the site works untouched until you provision
 * a Turnstile widget, then flips on the moment the secret is set — no code change.
 *
 * Setup: create a Turnstile widget at https://dash.cloudflare.com → Turnstile. Put the SITE key in
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY (public, ships to the browser) and the SECRET key in
 * TURNSTILE_SECRET_KEY (server-only).
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when a secret is configured — i.e. when verification is actually enforced. */
export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a client token. Returns true if the challenge passed (or if Turnstile is not configured).
 * `remoteIp` is optional but recommended (Cloudflare cross-checks it).
 */
export async function verifyTurnstile(token: string | undefined, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → don't block

  if (!token) return false; // configured but no token → fail closed

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    // Network error talking to Cloudflare. Fail CLOSED here: if you've turned Turnstile on, a
    // verification you can't complete shouldn't be waved through. (Contrast with the rate limiter,
    // which fails open — different trade-off, because that's abuse control, not a human gate.)
    console.error("[turnstile] verify failed:", err);
    return false;
  }
}
