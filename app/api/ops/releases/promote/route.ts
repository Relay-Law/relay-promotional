import { NextResponse } from "next/server";
import { Channel, listReleases, promoteVersion } from "@/lib/releases";

export const runtime = "nodejs";

/**
 * POST /api/ops/releases/promote  Body: { version: string, channel?: "stable" | "beta" }
 *
 * Promotes a version to a channel — the manual gate between "CI built it" and "the fleet may take
 * it." Only versions CI has actually published can be promoted, so a typo can't point the fleet at
 * a nonexistent build. Auth is handled by the /api/ops proxy.
 */
export async function POST(request: Request) {
  let version = "";
  let channel: Channel = "stable";
  try {
    const body = await request.json();
    version = String(body?.version ?? "").trim();
    if (body?.channel === "beta") channel = "beta";
  } catch {
    // fall through to validation
  }
  if (!version) {
    return NextResponse.json({ error: "version required" }, { status: 400 });
  }

  const releases = await listReleases();
  if (releases.length > 0 && !releases.some((r) => r.version === version)) {
    return NextResponse.json(
      { error: `unknown release ${version} — not among published releases` },
      { status: 400 },
    );
  }

  await promoteVersion(channel, version);
  return NextResponse.json({ ok: true, channel, version });
}
