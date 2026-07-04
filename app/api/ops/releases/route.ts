import { NextResponse } from "next/server";
import { getChannelVersion, listReleases } from "@/lib/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ops/releases — what the fleet dashboard needs to drive updates:
 *   { stable: <promoted version|null>, releases: [{ version, publishedAt }] }
 *
 * `stable` is the version ops promoted (what "Update to latest" targets); `releases` is every
 * version available to pin. Auth is handled by the /api/ops proxy (Google SSO).
 */
export async function GET() {
  try {
    const [stable, releases] = await Promise.all([getChannelVersion("stable"), listReleases()]);
    return NextResponse.json({ stable: stable ?? null, releases });
  } catch (err) {
    console.error("[ops/releases] failed:", err);
    return NextResponse.json({ error: "could not load releases" }, { status: 502 });
  }
}
