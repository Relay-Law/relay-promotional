import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ActivateError, activateFirm } from "@/lib/activate";

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

  let licenseKey: string;
  try {
    const body = await request.json();
    licenseKey = (body.licenseKey ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  try {
    const result = await activateFirm(licenseKey);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ActivateError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[activate] unexpected error:", err);
    return NextResponse.json({ error: "Could not activate subscription" }, { status: 502 });
  }
}
