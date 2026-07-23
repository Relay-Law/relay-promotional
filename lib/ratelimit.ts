import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getRedis } from "./store";

/**
 * Sliding-window rate limiting built on the SAME ioredis connection the rest of the app uses
 * (RELAY_REDIS_URL — see lib/store.ts). No extra dependency, no extra env var, no second Redis.
 *
 * Why a sorted-set sliding window (not a fixed-window INCR): a fixed window lets an attacker send
 * `limit` requests at 0:59 and another `limit` at 1:00 — a 2x burst across the boundary. The log
 * below counts only the requests within the trailing `windowMs`, so the limit is honest.
 *
 * Design choices:
 *  - FAIL-OPEN. If Redis is unreachable/misconfigured, we ALLOW the request (and log). A limiter
 *    outage must never take down checkout or the firm fleet. The real auth gates (license key,
 *    Stripe signature, admin key) still stand on their own — this layer is abuse control, not authz.
 *  - One atomic Lua script per check, so the read-modify-write can't race under concurrency.
 */

// KEYS[1]=bucket  ARGV[1]=now(ms)  ARGV[2]=window(ms)  ARGV[3]=limit  ARGV[4]=unique member
// Returns { allowed(0|1), remaining, resetMs }.
const SLIDING_WINDOW_LUA = `
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local member = ARGV[4]

-- Drop entries older than the trailing window.
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)
local allowed = 0
if count < limit then
  redis.call('ZADD', key, now, member)
  allowed = 1
  count = count + 1
end

-- Let the key expire on its own once the window has fully elapsed (self-cleaning).
redis.call('PEXPIRE', key, window)

-- Reset = when the oldest in-window request ages out.
local reset = window
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
if oldest[2] then
  reset = (tonumber(oldest[2]) + window) - now
end

return { allowed, limit - count, reset }
`;

export interface RateLimitResult {
  ok: boolean;
  /** The configured ceiling for this window. */
  limit: number;
  /** Requests remaining in the current window (never negative). */
  remaining: number;
  /** Milliseconds until the window frees up a slot. */
  resetMs: number;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

/**
 * Consume one token for `key`. `key` should already encode the dimension you're limiting on
 * (e.g. `waitlist:ip:1.2.3.4`). Fails open on any backend error.
 */
export async function rateLimit(key: string, cfg: RateLimitConfig): Promise<RateLimitResult> {
  const { limit, windowMs } = cfg;
  try {
    const now = Date.now();
    const member = `${now}-${randomUUID()}`; // unique so same-ms requests don't collide in the set
    const raw = (await getRedis().eval(
      SLIDING_WINDOW_LUA,
      1,
      `rl:${key}`,
      String(now),
      String(windowMs),
      String(limit),
      member,
    )) as [number, number, number];

    const [allowed, remaining, resetMs] = raw;
    return {
      ok: allowed === 1,
      limit,
      remaining: Math.max(0, remaining),
      resetMs: Math.max(0, resetMs),
    };
  } catch (err) {
    // Fail-open: never let the limiter itself become the outage.
    console.error(`[ratelimit] backend error for "${key}" — allowing request:`, err);
    return { ok: true, limit, remaining: limit, resetMs: 0 };
  }
}

/** Best-effort client IP. On Vercel, `x-forwarded-for` is set by the edge (leftmost = client). */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 with Retry-After + IETF RateLimit-* headers. */
export function tooManyRequests(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil(result.resetMs / 1000));
  return NextResponse.json(
    { error: "rate_limited", message: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": String(result.remaining),
        "RateLimit-Reset": String(retryAfterSec),
      },
    },
  );
}

/**
 * One-liner guard for route handlers: returns a 429 Response to return early, or null if allowed.
 *
 *   const limited = await enforce(`waitlist:ip:${clientIp(req)}`, LIMITS.waitlistIp);
 *   if (limited) return limited;
 */
export async function enforce(key: string, cfg: RateLimitConfig): Promise<NextResponse | null> {
  const result = await rateLimit(key, cfg);
  return result.ok ? null : tooManyRequests(result);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Central place to tune limits. Numbers reflect real usage:
 *  - Boxes poll license/validate every 12h and check in daily, so legit machine traffic is tiny;
 *    the caps below only bite scanners/abusers.
 *  - Human forms (waitlist, Stripe checkout) get room for a fumbling-but-honest user.
 */
export const LIMITS = {
  /** Waitlist signups per source IP. */
  waitlistIp: { limit: 5, windowMs: HOUR },
  /** Same email address can't be re-submitted repeatedly (spam/mail-bomb control). */
  waitlistEmail: { limit: 3, windowMs: DAY },
  /** license/validate: enumeration cap per IP. A real box hits this ~2x/day; a scanner floods it. */
  licenseValidateIp: { limit: 60, windowMs: MINUTE },
  /** box/checkin: per license key. Legit boxes check in daily. */
  boxCheckinKey: { limit: 10, windowMs: HOUR },
  /** admin/activate: brute-force cap on the admin key, per IP. */
  adminIp: { limit: 10, windowMs: MINUTE },
  /** Any Stripe-object-creating route, per IP (denial-of-wallet control). */
  stripeIp: { limit: 10, windowMs: HOUR },
} as const;
