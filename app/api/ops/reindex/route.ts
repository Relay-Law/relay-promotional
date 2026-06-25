import { NextResponse } from "next/server";
import { reindexFirms } from "@/lib/store";

export const runtime = "nodejs";

/**
 * POST /api/ops/reindex — one-time backfill of `firms:index` from existing `firm:*` keys that
 * predate the index. Safe to run repeatedly.
 */
export async function POST() {
  try {
    const count = await reindexFirms();
    return NextResponse.json({ ok: true, indexed: count });
  } catch (err) {
    console.error("[ops/reindex] failed:", err);
    return NextResponse.json({ error: "reindex failed" }, { status: 503 });
  }
}
