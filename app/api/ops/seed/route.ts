import { NextResponse } from "next/server";
import { FirmRecord, generateLicenseKey, saveFirm } from "@/lib/store";

export const runtime = "nodejs";

/**
 * POST /api/ops/seed — DEV ONLY. Drops a few fake firms into Redis so the dashboard has something
 * to render before real boxes are polling. Disabled in production.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "seed disabled in production" }, { status: 403 });
  }

  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

  const samples: FirmRecord[] = [
    {
      licenseKey: generateLicenseKey(),
      stripeCustomerId: "cus_demo_pending",
      seats: 3,
      status: "pending",
      currentPeriodEnd: 0,
      email: "intake@harlowpartners.com",
      firmName: "Harlow & Partners",
      hardwareChoice: "finance",
      updatedAt: iso(5 * 60_000),
    },
    {
      licenseKey: generateLicenseKey(),
      stripeCustomerId: "cus_demo_live",
      subscriptionId: "sub_demo_live",
      seats: 6,
      status: "trialing",
      currentPeriodEnd: Math.floor((now + 12 * 86_400_000) / 1000),
      email: "ops@meridianlaw.com",
      firmName: "Meridian Law Group",
      hardwareChoice: "byo",
      activatedAt: iso(2 * 86_400_000),
      relayVersion: "0.3.1",
      activeSeats: 4,
      hostname: "meridian-box.local",
      lastHeartbeat: iso(4 * 60_000),
      updateStatus: "idle",
      updatedAt: iso(4 * 60_000),
    },
    {
      licenseKey: generateLicenseKey(),
      stripeCustomerId: "cus_demo_stale",
      subscriptionId: "sub_demo_stale",
      seats: 2,
      status: "active",
      currentPeriodEnd: Math.floor((now + 20 * 86_400_000) / 1000),
      email: "admin@quillberg.com",
      firmName: "Quillberg LLP",
      hardwareChoice: "buy_spec",
      activatedAt: iso(40 * 86_400_000),
      relayVersion: "0.2.0",
      activeSeats: 2,
      hostname: "quillberg-mini.local",
      lastHeartbeat: iso(3 * 86_400_000), // offline (> 30 min)
      cancelAtPeriodEnd: true,
      updateStatus: "idle",
      updatedAt: iso(3 * 86_400_000),
    },
  ];

  await Promise.all(samples.map(saveFirm));
  return NextResponse.json({ ok: true, seeded: samples.map((s) => s.licenseKey) });
}
