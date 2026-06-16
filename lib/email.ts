import { Resend } from "resend";

/**
 * Transactional email via Resend. Stripe sends billing/receipt emails (once enabled in the
 * dashboard), but the friendly "thanks, we'll reach out" signup confirmation is on us — there's
 * no charge at signup, so Stripe sends nothing.
 *
 * Gracefully no-ops when RESEND_API_KEY is unset, so it never breaks the signup flow in dev.
 */
let resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

/** "From" address. Must be a Resend-verified domain in prod; resend.dev works for testing. */
const FROM = process.env.EMAIL_FROM ?? "Relay <onboarding@resend.dev>";

/**
 * Reply-To address. Lets you send *from* a verified domain while replies route to a real inbox
 * (e.g. relaydevteam@gmail.com — which you can't legitimately send *from*, only reply *to*).
 * Optional: omit EMAIL_REPLY_TO and replies just go to the From address.
 */
const REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

export async function sendSignupConfirmation(to: string, opts: { seats?: number } = {}): Promise<void> {
  const client = getResend();
  if (!client || !to) return; // not configured / no recipient → skip silently

  const seatLine = opts.seats
    ? `<p style="margin:0 0 16px;color:#50545e">Reserved: <strong>${opts.seats} seat${opts.seats > 1 ? "s" : ""}</strong> at $50/seat/month — billed only after your free trial begins.</p>`
    : "";

  try {
    await client.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject: "Welcome to Relay — we'll be in touch",
      html: `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1a1d24;line-height:1.55">
  <h1 style="font-size:22px;font-weight:600;margin:0 0 16px">You're reserved 🎉</h1>
  <p style="margin:0 0 16px;color:#50545e">Thanks for signing up for Relay. Your card is saved and <strong>nothing has been charged</strong>.</p>
  ${seatLine}
  <p style="margin:0 0 12px;color:#50545e"><strong>What happens next:</strong></p>
  <ol style="margin:0 0 16px;padding-left:20px;color:#50545e">
    <li>We'll <strong>reach out within 3 business days</strong> to schedule your install.</li>
    <li>We set up the workstation in your office and verify everything works.</li>
    <li>Your free trial starts that day — per-seat billing begins only when the trial ends.</li>
  </ol>
  <p style="margin:0;color:#82858d;font-size:13px">Questions? Just reply to this email.</p>
</div>`.trim(),
    });
  } catch (err) {
    // Never let an email failure break the signup webhook.
    console.error("[email] signup confirmation failed:", err);
  }
}

/**
 * Waitlist confirmation — sent when someone joins the waitlist (app/api/waitlist/route.ts).
 * Distinct from sendSignupConfirmation: no card, no seats, no billing — just "you're on the list".
 * Also no-ops silently when RESEND_API_KEY is unset, so it never breaks the waitlist flow.
 */
export async function sendWaitlistConfirmation(to: string): Promise<void> {
  const client = getResend();
  if (!client || !to) return; // not configured / no recipient → skip silently

  try {
    await client.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject: "You're on the Relay waitlist",
      html: `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1a1d24;line-height:1.55">
  <h1 style="font-size:22px;font-weight:600;margin:0 0 16px">You're on the list 🎉</h1>
  <p style="margin:0 0 16px;color:#50545e">Thanks for your interest in Relay. We've added you to the waitlist and will reach out as soon as we're ready to get you set up.</p>
  <p style="margin:0;color:#82858d;font-size:13px">Questions? Just reply to this email.</p>
</div>`.trim(),
    });
  } catch (err) {
    // Never let an email failure break the waitlist signup.
    console.error("[email] waitlist confirmation failed:", err);
  }
}
