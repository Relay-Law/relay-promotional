import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/subscription?license_key=…
 *
 * Returns live subscription details for the firm. Called by relay-api's
 * GET /api/admin/subscription, which proxies it to the admin Settings panel.
 * Returns { status, seats, current_period_end, trial_end, cancel_at_period_end }.
 */
export async function GET(request: NextRequest) {
  const licenseKey = request.nextUrl.searchParams.get("license_key")?.trim() ?? "";
  if (!licenseKey) {
    return NextResponse.json({ error: "license_key required" }, { status: 400 });
  }

  const firm = await getFirmByLicenseKey(licenseKey);
  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }

  if (!firm.subscriptionId) {
    return NextResponse.json({
      status: firm.status,
      seats: firm.seats,
      current_period_end: firm.currentPeriodEnd ?? null,
      trial_end: null,
      cancel_at_period_end: firm.cancelAtPeriodEnd ?? false,
    });
  }

  try {
    const subscription = await getStripe().subscriptions.retrieve(firm.subscriptionId, {
      expand: ["items.data"],
    });
    const item = subscription.items.data[0];
    return NextResponse.json({
      status: subscription.status,
      seats: item?.quantity ?? firm.seats,
      current_period_end: item?.current_period_end ?? null,
      trial_end: subscription.trial_end ?? null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (err) {
    console.error("[subscription] Stripe error:", err);
    return NextResponse.json({ error: "Could not fetch subscription" }, { status: 502 });
  }
}
