import { NextRequest, NextResponse } from "next/server";
import { getChannelVersion, listReleases, resolveAssetDownloadUrl } from "@/lib/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/client-updates/<name>
 *
 * Public electron-updater feed for the desktop client. The source repo (relay-app) is PRIVATE, so
 * clients can't read its GitHub Releases directly (electron-updater's github provider would 404
 * without an embedded token — which we must never ship). Instead the client points its `generic`
 * provider here, and we broker each request to the matching release asset with a short-lived GitHub
 * CDN redirect — the GitHub token stays on the server, exactly like /api/box/artifact does for the
 * server updater.
 *
 * electron-updater requests, relative to the feed base URL:
 *   latest.yml | latest-mac.yml | latest-linux.yml   — the channel manifest (version + sha512 + path)
 *   <installer/zip/blockmap>                          — the artifact named in that manifest
 * We serve whichever release the "stable" channel points at (ops-gated rollout, same as the fleet);
 * if nothing is promoted we fall back to the newest published release so updates still flow.
 */

// Only client artifacts are brokerable here — never the server .pkg/.exe (those go through the
// license-gated /api/box/artifact). Keeps this public endpoint from leaking server installers.
const ALLOWED = /^(latest(-mac|-linux)?\.yml|Relay-Setup-.*\.exe(\.blockmap)?|Relay-.*\.(zip|dmg)(\.blockmap)?|Relay-.*\.AppImage)$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const name = (path ?? []).join("/");

  // Flat asset names only — reject anything path-ish or not a known client artifact.
  if (!name || name.includes("/") || name.includes("..") || !ALLOWED.test(name)) {
    return NextResponse.json({ error: "not a client update asset" }, { status: 404 });
  }

  let version: string | null;
  try {
    version = await getChannelVersion("stable");
    if (!version) {
      const releases = await listReleases();
      version = releases[0]?.version ?? null;
    }
  } catch (err) {
    console.error("[client-updates] version resolve failed:", err);
    return NextResponse.json({ error: "update feed unavailable" }, { status: 503 });
  }
  if (!version) {
    return NextResponse.json({ error: "no releases available" }, { status: 404 });
  }

  const location = await resolveAssetDownloadUrl(version, name);
  if (!location) {
    // A manifest with no matching artifact (or vice-versa) — 404 so electron-updater backs off
    // quietly rather than treating it as a corrupt download.
    return NextResponse.json({ error: `asset ${name} not found in ${version}` }, { status: 404 });
  }
  return NextResponse.redirect(location, 302);
}
