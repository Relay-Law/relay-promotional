import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { sendWaitlistConfirmation } from "@/lib/email";

// Singleton — reused across warm invocations of the same serverless instance
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.RELAY_REDIS_URL!, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    redis.on("error", (err) => console.error("[waitlist] Redis error:", err));
  }
  return redis;
}

export async function POST(request: NextRequest) {
  let email: string;

  try {
    const body = await request.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const entry = JSON.stringify({ email, joinedAt: new Date().toISOString() });

  if (process.env.RELAY_REDIS_URL) {
    try {
      const client = getRedis();
      const len = await client.lpush("relay:waitlist", entry);
      console.log(`[waitlist] Stored ${email} — list length: ${len}`);
    } catch (err) {
      console.error("[waitlist] Redis write failed:", err);
    }
  } else {
    console.warn("[waitlist] RELAY_REDIS_URL not set — skipping Redis write. Signup:", email);
  }

  // Confirmation email — no-ops silently if RESEND_API_KEY is unset; never blocks the response.
  await sendWaitlistConfirmation(email);

  return NextResponse.json({ success: true });
}
