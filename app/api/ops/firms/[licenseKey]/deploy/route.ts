import { NextResponse } from "next/server";
import { ActivateError, activateFirm } from "@/lib/activate";

export const runtime = "nodejs";

/**
 * POST /api/ops/firms/:licenseKey/deploy — "Deploy" the firm by starting its Stripe subscription.
 * Reuses the same activateFirm() logic as the internal admin hook. Idempotent.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ licenseKey: string }> },
) {
  const { licenseKey } = await params;
  try {
    const result = await activateFirm(decodeURIComponent(licenseKey));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ActivateError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[ops/deploy] unexpected error:", err);
    return NextResponse.json({ error: "Could not deploy firm" }, { status: 502 });
  }
}
