import { NextRequest, NextResponse } from "next/server";
import { getFirmByLicenseKey } from "@/lib/store";
import { resolveAssetDownloadUrl } from "@/lib/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/box/artifact?key=<license>&version=<x.y.z>&name=<asset>
 *
 * Brokered release download. The box authenticates with its license key; we resolve the release
 * asset to a short-lived GitHub CDN URL and redirect the box there — so the GitHub token stays on
 * the server and never ships to customer hardware. Integrity is the box's job: it verifies the
 * sha256 (from the signed manifest) after downloading.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const key = (url.searchParams.get("key") ?? "").trim();
  const version = (url.searchParams.get("version") ?? "").trim();
  const name = (url.searchParams.get("name") ?? "").trim();

  if (!key || !version || !name) {
    return NextResponse.json({ error: "key, version and name are required" }, { status: 400 });
  }

  // Reject path-ish asset names outright — we only ever serve a flat release asset by exact name.
  if (name.includes("/") || name.includes("..")) {
    return NextResponse.json({ error: "invalid asset name" }, { status: 400 });
  }

  let firm;
  try {
    firm = await getFirmByLicenseKey(key);
  } catch (err) {
    console.error("[box/artifact] store lookup failed:", err);
    return NextResponse.json({ error: "store unavailable" }, { status: 503 });
  }
  if (!firm) {
    return NextResponse.json({ error: "unknown license key" }, { status: 403 });
  }

  const location = await resolveAssetDownloadUrl(version, name);
  if (!location) {
    return NextResponse.json({ error: "artifact not found" }, { status: 404 });
  }
  return NextResponse.redirect(location, 302);
}
