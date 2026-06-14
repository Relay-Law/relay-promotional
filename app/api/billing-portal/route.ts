import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getFirmByLicenseKey } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Stripe Customer Portal link for a firm. This is the endpoint relay-api's admin panel calls
 * (GET https://relay-law.com/api/billing-portal?license_key=… — see routes/admin.py), so a firm
 * admin can manage billing from inside Relay. Returns { url }.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  const licenseKey = request.nextUrl.searchParams.get("license_key")?.trim() ?? "";
  if (!licenseKey) {
    return NextResponse.json({ error: "license_key required" }, { status: 400 });
  }

  const firm = await getFirmByLicenseKey(licenseKey);
  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: firm.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing-portal] Stripe error:", err);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 502 });
  }
}
