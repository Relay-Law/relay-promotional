import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey, saveFirm } from "@/lib/store";

export const runtime = "nodejs";

/**
 * POST /api/subscription/cancel
 * Body: { license_key: string, resume?: boolean }
 *
 * Sets (or clears) cancel_at_period_end on the firm's Stripe subscription.
 * Proxied by relay-api's POST /api/admin/billing/cancel.
 * Returns { status, current_period_end, cancel_at_period_end }.
 */
export async function POST(request: NextRequest) {
  let licenseKey: string;
  let resume: boolean;
  try {
    const body = await request.json();
    licenseKey = (body.license_key ?? "").trim();
    resume = Boolean(body.resume);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!licenseKey) {
    return NextResponse.json({ error: "license_key required" }, { status: 400 });
  }

  const firm = await getFirmByLicenseKey(licenseKey);
  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }
  if (!firm.subscriptionId) {
    return NextResponse.json({ error: "no active subscription" }, { status: 409 });
  }

  try {
    const subscription = await getStripe().subscriptions.update(firm.subscriptionId, {
      cancel_at_period_end: !resume,
    });
    const item = subscription.items.data[0];

    // Keep the stored record in sync so it reflects the change before the webhook fires.
    await saveFirm({
      ...firm,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    return NextResponse.json({
      status: subscription.status,
      current_period_end: item?.current_period_end ?? null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (err) {
    console.error("[subscription/cancel] Stripe error:", err);
    return NextResponse.json({ error: "Could not update subscription" }, { status: 502 });
  }
}
