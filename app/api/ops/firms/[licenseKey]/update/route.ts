import { NextResponse } from "next/server";
import { setFirmTarget } from "@/lib/store";

export const runtime = "nodejs";

/**
 * POST /api/ops/firms/:licenseKey/update  Body: { version: string }
 *
 * Records the target version the team wants this box to run (sets updateStatus="pending").
 * NOTE: the box-side updater that actually pulls + installs the target is Part C, deferred — for
 * now this only stores intent; no box acts on it yet.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ licenseKey: string }> },
) {
  const { licenseKey } = await params;
  let version = "";
  try {
    const body = await request.json();
    version = (body?.version ?? "").trim();
  } catch {
    // fall through to validation below
  }
  if (!version) {
    return NextResponse.json({ error: "version required" }, { status: 400 });
  }

  const firm = await setFirmTarget(decodeURIComponent(licenseKey), version);
  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, targetVersion: firm.targetVersion, updateStatus: firm.updateStatus });
}
