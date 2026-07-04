import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey, saveFirm } from "@/lib/store";

export const runtime = "nodejs";

/**
 * POST /api/ops/firms/:licenseKey/cancel  Body: { resume?: boolean }
 * Sets (or clears) cancel_at_period_end on the firm's subscription — mirrors /api/subscription/cancel.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ licenseKey: string }> },
) {
  const { licenseKey } = await params;
  const key = decodeURIComponent(licenseKey).trim();

  let resume = false;
  try {
    const body = await request.json();
    resume = Boolean(body?.resume);
  } catch {
    // empty body → treat as cancel
  }

  const firm = await getFirmByLicenseKey(key);
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

    await saveFirm({ ...firm, cancelAtPeriodEnd: subscription.cancel_at_period_end });

    return NextResponse.json({
      status: subscription.status,
      current_period_end: item?.current_period_end ?? null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (err) {
    console.error("[ops/cancel] Stripe error:", err);
    return NextResponse.json({ error: "Could not update subscription" }, { status: 502 });
  }
}
