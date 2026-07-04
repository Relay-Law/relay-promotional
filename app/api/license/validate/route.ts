import { mapStripeStatus, signLicense } from "@/lib/license";
import { getFirmByLicenseKey } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * The firm's relay-api calls this at startup and every 12h (see licensing.py).
 *
 * Contract is dictated by relay-api:
 *   Request:  POST { "license_key": "relay_live_..." }
 *   Response: { "token": "<RS256 JWT { firm_id, seats, status, exp }>" }
 *
 * We return a signed token for ANY known key — including past_due/canceled — and encode
 * the real status. relay-api's require_seat() decides what to do per status (402/403/etc),
 * so we must NOT hide an inactive subscription behind an HTTP error here.
 * Unknown keys get 404 (no token).
 */
export async function POST(request: NextRequest) {
	let licenseKey: string;
	try {
		const body = await request.json();
		licenseKey = (body.license_key ?? "").trim();
	} catch {
		return NextResponse.json(
			{ error: "invalid request body" },
			{ status: 400 },
		);
	}

	if (!licenseKey) {
		return NextResponse.json(
			{ error: "license_key required" },
			{ status: 400 },
		);
	}

  // Redis lookup. A connection/config failure here (e.g. a bad RELAY_REDIS_URL)
  // must surface as a 503 the firm server can retry — not an opaque 500.
  let firm;
  try {
    firm = await getFirmByLicenseKey(licenseKey);
  } catch (err) {
    console.error("[license/validate] store lookup failed:", err);
    return NextResponse.json({ error: "license store unavailable" }, { status: 503 });
  }

  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }

  // Signing failure means a misconfigured LICENSE_SIGNING_KEY (unset or not a
  // valid PKCS8 PEM). Log it so the cause is visible instead of a bare 500.
  try {
    const token = await signLicense({
      firmId: firm.stripeCustomerId,
      seats: firm.seats,
      status: mapStripeStatus(firm.status),
    });
    return NextResponse.json({ token });
  } catch (err) {
    console.error("[license/validate] signing failed:", err);
    return NextResponse.json({ error: "license signing misconfigured" }, { status: 500 });
  }
}
