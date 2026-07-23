import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey } from "@/lib/store";
import { clientIp, enforce, LIMITS } from "@/lib/ratelimit";

/**
 * Create a Stripe Customer Portal session and return its hosted URL. This IS the firm
 * admin's billing dashboard — update card, change seat count, download invoices, cancel.
 * We host none of it.
 *
 * Body: { licenseKey: string }  (the key identifies the firm -> its Stripe customer)
 */
export async function POST(request: NextRequest) {
  const limited = await enforce(`stripe:portal:ip:${clientIp(request)}`, LIMITS.stripeIp);
  if (limited) return limited;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  let licenseKey: string;
  try {
    const body = await request.json();
    licenseKey = (body.licenseKey ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!licenseKey) {
    return NextResponse.json({ error: "licenseKey required" }, { status: 400 });
  }

  const firm = await getFirmByLicenseKey(licenseKey);
  if (!firm) {
    return NextResponse.json({ error: "Unknown license key" }, { status: 404 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: firm.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[portal] Stripe error:", err);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 502 });
  }
}
