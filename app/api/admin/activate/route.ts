import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey, saveFirm } from "@/lib/store";

export const runtime = "nodejs";

/**
 * INTERNAL admin hook — only WE call this, by hand, the day a firm's server is installed and
 * verified working. It starts the trialing software subscription for that firm, which begins
 * the free-trial clock as of today (not at signup). The webhook then keeps the firm record in
 * sync; their server picks up the new entitlement on its next /api/license/validate poll.
 *
 * Auth: `x-admin-key: <ADMIN_API_KEY>`.
 * Body: { licenseKey: string }  — the key generated at signup and pasted into their server.
 */
function authorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY ?? "";
  const presented = request.headers.get("x-admin-key") ?? "";
  if (!expected || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "STRIPE_PRICE_ID not configured" }, { status: 500 });
  }

  let licenseKey: string;
  try {
    const body = await request.json();
    licenseKey = (body.licenseKey ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  if (!licenseKey) {
    return NextResponse.json({ error: "licenseKey required" }, { status: 400 });
  }

  const firm = await getFirmByLicenseKey(licenseKey);
  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }

  // Idempotent: if already activated, just report the existing subscription.
  if (firm.subscriptionId) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      subscriptionId: firm.subscriptionId,
      status: firm.status,
    });
  }

  const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? "14");

  try {
    const subscription = await getStripe().subscriptions.create({
      customer: firm.stripeCustomerId,
      items: [{ price: priceId, quantity: firm.seats }],
      trial_period_days: trialDays > 0 ? trialDays : undefined,
      // licenseKey lets the webhook merge this back into the existing firm record.
      metadata: { licenseKey },
      // If the card ever fails after the trial, cancel rather than dunning forever.
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    });

    const item = subscription.items.data[0];
    await saveFirm({
      ...firm,
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: item?.current_period_end ?? 0,
      activatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end,
      seats: firm.seats,
    });
  } catch (err) {
    console.error("[activate] Stripe error:", err);
    return NextResponse.json({ error: "Could not activate subscription" }, { status: 502 });
  }
}
