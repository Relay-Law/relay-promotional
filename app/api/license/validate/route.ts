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

	const firm = await getFirmByLicenseKey(licenseKey);
	if (!firm) {
		return NextResponse.json({ error: "unknown license key" }, { status: 404 });
	}

	try {
		const token = await signLicense({
			firmId: firm.stripeCustomerId,
			seats: firm.seats,
			status: mapStripeStatus(firm.status),
		});
		return NextResponse.json({ token });
	} catch (error) {
		console.error("Error signing license:", error);
		return NextResponse.json(
			{ error: "issue signing license" },
			{ status: 500 },
		);
	}
}
