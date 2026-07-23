import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { sendWaitlistConfirmation } from "@/lib/email";
import { clientIp, enforce, LIMITS } from "@/lib/ratelimit";
import { BodyTooLargeError, readJson } from "@/lib/http";
import { verifyTurnstile } from "@/lib/turnstile";

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
  // Per-IP cap first — cheapest rejection, before we parse or touch the body.
  const ipLimited = await enforce(`waitlist:ip:${clientIp(request)}`, LIMITS.waitlistIp);
  if (ipLimited) return ipLimited;

  let email: string;
  let turnstileToken: string | undefined;

  try {
    const body = await readJson<{ email?: unknown; turnstileToken?: unknown }>(request);
    email = String(body.email ?? "").trim().toLowerCase();
    turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Bot check. No-ops (returns true) unless TURNSTILE_SECRET_KEY is set — see lib/turnstile.ts.
  if (!(await verifyTurnstile(turnstileToken, clientIp(request)))) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
  }

  // Per-email cap — stops the same address being re-submitted to mail-bomb it or spam the list.
  const emailLimited = await enforce(`waitlist:email:${email}`, LIMITS.waitlistEmail);
  if (emailLimited) return emailLimited;

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
