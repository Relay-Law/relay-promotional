import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { generateLicenseKey, saveFirm } from "@/lib/store";
import { clientIp, enforce, LIMITS } from "@/lib/ratelimit";

/**
 * Signup step. Because Relay is hardware-gated and on-prem, we do NOT start the trial or any
 * billing here — the clock starts at activation (after we install & verify in their office).
 *
 * So at signup we only:
 *   1. create a Stripe customer + a "pending" firm record + the license key (paste this into
 *      their server during install),
 *   2. open a Checkout in `setup` mode to capture a card (no charge), saved for later billing.
 *
 * The trialing subscription is created later by POST /api/admin/activate.
 *
 * Body: { seats?: number, email?: string }
 */
export async function POST(request: NextRequest) {
  const limited = await enforce(`stripe:checkout:ip:${clientIp(request)}`, LIMITS.stripeIp);
  if (limited) return limited;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  let seats = 1;
  let email: string | undefined;
  let hardwareChoice: string | undefined;
  try {
    const body = await request.json();
    if (body.seats != null) seats = Math.max(1, Math.floor(Number(body.seats)));
    if (typeof body.email === "string" && body.email.includes("@")) {
      email = body.email.trim().toLowerCase();
    }
    if (typeof body.hardwareChoice === "string") hardwareChoice = body.hardwareChoice;
  } catch {
    // Empty/invalid body → default to 1 seat, no prefilled email.
  }

  const stripe = getStripe();
  const licenseKey = generateLicenseKey();

  try {
    // licenseKey lives on the customer metadata too, so ops can read it from the Stripe dashboard
    // when configuring the server at install time.
    const customer = await stripe.customers.create({
      email,
      metadata: { licenseKey, seats: String(seats), hardwareChoice: hardwareChoice ?? "" },
    });

    await saveFirm({
      licenseKey,
      stripeCustomerId: customer.id,
      seats,
      status: "pending",
      currentPeriodEnd: 0,
      email,
      hardwareChoice,
      activatedAt: null,
      updatedAt: new Date().toISOString(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      currency: "usd", // required by Stripe for setup-mode sessions
      customer: customer.id,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error:", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
