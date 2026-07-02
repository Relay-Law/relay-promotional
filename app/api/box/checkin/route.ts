import { NextRequest, NextResponse } from "next/server";
import { FirmRecord, setFirmTelemetry } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/box/checkin — the firm's relay-api calls this daily to (1) report telemetry and
 * (2) learn whether the ops team wants it running a different version.
 *
 *   Request:  { license_key, server_version?, hostname?, active_seats?, health?,
 *               update_status?, update_error? }
 *   Response: { targetVersion: string | null, updateStatus }
 *
 * Auth is the license key itself (same trust anchor as /api/license/validate). Entitlement is
 * intentionally NOT handled here — that stays on /api/license/validate so version telemetry and
 * licensing evolve independently. Unknown key → 404; a store failure → 503 the box can retry.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const licenseKey = String(body.license_key ?? "").trim();
  if (!licenseKey) {
    return NextResponse.json({ error: "license_key required" }, { status: 400 });
  }

  // Build the telemetry patch from only the fields the box actually sent, so a sparse check-in
  // never blanks out previously-reported values.
  const patch: Partial<FirmRecord> = { lastSeenAt: new Date().toISOString() };
  if (typeof body.server_version === "string" && body.server_version.trim()) {
    patch.relayVersion = body.server_version.trim();
  }
  if (typeof body.hostname === "string" && body.hostname.trim()) {
    patch.hostname = body.hostname.trim();
  }
  if (typeof body.active_seats === "number" && Number.isFinite(body.active_seats)) {
    patch.activeSeats = body.active_seats;
  }
  if (body.health === "ok" || body.health === "degraded" || body.health === "failing") {
    patch.boxHealth = body.health;
  }
  // The box reports its own update lifecycle once the updater exists (Phase 3); accept it if present.
  const st = body.update_status;
  if (st === "idle" || st === "pending" || st === "updating" || st === "updated" || st === "failed") {
    patch.updateStatus = st;
  }
  if (typeof body.update_error === "string") {
    patch.updateError = body.update_error;
  }

  let firm;
  try {
    firm = await setFirmTelemetry(licenseKey, patch);
  } catch (err) {
    console.error("[box/checkin] store write failed:", err);
    return NextResponse.json({ error: "telemetry store unavailable" }, { status: 503 });
  }

  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }

  // Update directive: the version ops wants this box on. The box compares it against its own running
  // version and (Phase 3) applies it in its maintenance window. Phase 2 adds artifact URL + sha256 +
  // signature to this response.
  return NextResponse.json({
    targetVersion: firm.targetVersion ?? null,
    updateStatus: firm.updateStatus ?? "idle",
  });
}
