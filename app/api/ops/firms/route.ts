import { NextResponse } from "next/server";
import { listFirms } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/ops/firms — the whole fleet for the ops dashboard.
 *
 * NOTE: not yet auth-gated. Google SSO + the ops.* subdomain middleware is a follow-up (Part B1);
 * for now this is intended for local dev only.
 */
export async function GET() {
  try {
    const firms = await listFirms();
    return NextResponse.json({ firms });
  } catch (err) {
    console.error("[ops/firms] list failed:", err);
    return NextResponse.json({ error: "fleet store unavailable" }, { status: 503 });
  }
}
