import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/ops/firms/:licenseKey — full firm record plus a LIVE Stripe subscription read.
 *
 * Billing/account detail is read straight from Stripe here (same call as /api/subscription),
 * not via the box — the dashboard runs in the promo app, which holds the Stripe key.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ licenseKey: string }> },
) {
  const { licenseKey } = await params;
  const key = decodeURIComponent(licenseKey).trim();

  let firm;
  try {
    firm = await getFirmByLicenseKey(key);
  } catch (err) {
    console.error("[ops/firms/:key] store lookup failed:", err);
    return NextResponse.json({ error: "fleet store unavailable" }, { status: 503 });
  }
  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }

  // Best-effort live billing read. Stripe being down shouldn't blank the whole page.
  let billing: Record<string, unknown> | null = null;
  if (firm.subscriptionId) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(firm.subscriptionId, {
        expand: ["items.data"],
      });
      const item = subscription.items.data[0];
      billing = {
        status: subscription.status,
        seats: item?.quantity ?? firm.seats,
        current_period_end: item?.current_period_end ?? null,
        trial_end: subscription.trial_end ?? null,
        cancel_at_period_end: subscription.cancel_at_period_end,
      };
    } catch (err) {
      console.error("[ops/firms/:key] Stripe read failed:", err);
    }
  }

  return NextResponse.json({ firm, billing });
}
