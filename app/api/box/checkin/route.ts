import { NextRequest, NextResponse } from "next/server";
import { FirmRecord, FirmUser, setFirmTelemetry } from "@/lib/store";
import { getSignedManifest } from "@/lib/releases";

/** Never mirror an unbounded roster into the control plane, even if the box misbehaves. */
const MAX_USERS = 500;

/**
 * Coerce the box-reported `users` payload (snake_case, untrusted) into the stored FirmUser shape.
 * Drops entries without an email, caps the count, and stringifies every field defensively.
 */
function parseUsers(raw: unknown): FirmUser[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const users: FirmUser[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const u = entry as Record<string, unknown>;
    const email = typeof u.email === "string" ? u.email.trim() : "";
    if (!email) continue;
    users.push({
      email,
      displayName: typeof u.display_name === "string" ? u.display_name : undefined,
      role: typeof u.role === "string" ? u.role : undefined,
      seatStatus: typeof u.seat_status === "string" ? u.seat_status : undefined,
      createdAt: typeof u.created_at === "string" ? u.created_at : undefined,
    });
    if (users.length >= MAX_USERS) break;
  }
  return users;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/box/checkin — the firm's relay-api calls this daily to (1) report telemetry and
 * (2) learn whether the ops team wants it running a different version.
 *
 *   Request:  { license_key, firm_name?, server_version?, hostname?, active_seats?, health?,
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
  // The box reports the firm name baked in at provisioning (relay.env RELAY_FIRM_NAME). This is the
  // only channel that carries it to the control plane, so the ops dashboard stays blank without it.
  if (typeof body.firm_name === "string" && body.firm_name.trim()) {
    patch.firmName = body.firm_name.trim();
  }
  if (typeof body.server_version === "string" && body.server_version.trim()) {
    patch.relayVersion = body.server_version.trim();
  }
  if (typeof body.hostname === "string" && body.hostname.trim()) {
    patch.hostname = body.hostname.trim();
  }
  if (typeof body.active_seats === "number" && Number.isFinite(body.active_seats)) {
    patch.activeSeats = body.active_seats;
  }
  // Optional member roster (PII). Only overwrite when the box actually sent an array, so a sparse
  // check-in from an older box never blanks a previously-reported roster.
  const users = parseUsers(body.users);
  if (users) {
    patch.users = users;
  }
  if (body.health === "ok" || body.health === "degraded" || body.health === "failing") {
    patch.boxHealth = body.health;
  }
  // The box reports its own update lifecycle once the updater exists (Phase 3); accept it if present.
  const st = body.update_status;
  if (st === "idle" || st === "pending" || st === "updating" || st === "updated" || st === "failed") {
    patch.updateStatus = st;
    // On a confirmed successful update, stamp when it landed and record the box's new floor.
    if (st === "updated") {
      patch.lastUpdatedAt = new Date().toISOString();
      if (typeof body.server_version === "string" && body.server_version.trim()) {
        patch.lastKnownGoodVersion = body.server_version.trim();
      }
    }
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

  // Update directive: the version ops wants this box on. When the box is actually behind that target,
  // attach the SIGNED manifest (raw bytes + signature) so the box can verify it against its baked-in
  // key and pull each artifact through /api/box/artifact. Omitted (Phase 1 behavior) when there's no
  // target, the box is already current, or no verified manifest exists (e.g. releases unconfigured).
  const target = firm.targetVersion ?? null;
  const reported = patch.relayVersion;
  let update: { version: string; manifestRaw: string; manifestSig: string } | undefined;
  if (target && reported && target !== reported) {
    try {
      const signed = await getSignedManifest(target);
      if (signed) {
        update = { version: target, manifestRaw: signed.manifestRaw, manifestSig: signed.signatureB64 };
      }
    } catch (err) {
      console.error("[box/checkin] manifest lookup failed:", err);
      // Non-fatal: fall back to the bare targetVersion; the box just won't update this cycle.
    }
  }

  return NextResponse.json({
    targetVersion: target,
    updateStatus: firm.updateStatus ?? "idle",
    ...(update ? { update } : {}),
  });
}
