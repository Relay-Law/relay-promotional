import Redis from "ioredis";
import { randomBytes } from "crypto";

// Singleton — same pattern as app/api/waitlist/route.ts.
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.RELAY_REDIS_URL;
    if (!url) throw new Error("RELAY_REDIS_URL is not set");
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    redis.on("error", (err) => console.error("[store] Redis error:", err));
  }
  return redis;
}

/**
 * One firm = one relay-api server = one Stripe subscription = N seats.
 * Keyed by an opaque license key the firm pastes into their server at setup.
 */
export interface FirmRecord {
  licenseKey: string;
  stripeCustomerId: string;
  /** Empty until activation — the subscription isn't created until the box is installed & working. */
  subscriptionId?: string;
  seats: number;
  /** "pending" before activation, then the Stripe status: trialing | active | past_due | canceled. */
  status: string;
  /** Unix seconds — end of the current paid period. */
  currentPeriodEnd: number;
  /** Billing contact captured at signup. */
  email?: string;
  /** Hardware path chosen at signup: "finance" | "buy_spec" | "byo". For ops, not billing. */
  hardwareChoice?: string;
  /** ISO timestamp set by the admin activate hook once setup is verified. Null until then. */
  activatedAt?: string | null;
  /** Optional: bind the license to a specific tailnet so a key can't be reused elsewhere. */
  tailnetId?: string;
  /** Mirrors Stripe's cancel_at_period_end — true when the firm has scheduled a cancel. */
  cancelAtPeriodEnd?: boolean;

  // ── Ops telemetry (all optional; written by the box's license poll) ──────────
  /** Human-friendly firm name shown in the ops dashboard. */
  firmName?: string;
  /** Backend version the box last reported (e.g. "0.3.1"). */
  relayVersion?: string;
  /** Seats actually in use, as counted by the box (vs. the licensed `seats`). */
  activeSeats?: number;
  /** Hostname the box reported — helps identify which machine. */
  hostname?: string;
  /** ISO timestamp of the box's last poll. Drives the "online" indicator. */
  lastHeartbeat?: string;
  /** Version the team wants this box to update to (set from the dashboard). */
  targetVersion?: string;
  /** Lifecycle of an in-flight remote update. */
  updateStatus?: "idle" | "pending" | "updating" | "updated" | "failed";
  /** Last update error, if updateStatus === "failed". */
  updateError?: string;

  updatedAt: string;
}

const firmKey = (licenseKey: string) => `firm:${licenseKey}`;
const keyBySub = (subscriptionId: string) => `firmKeyBySub:${subscriptionId}`;
const keyByCustomer = (customerId: string) => `firmKeyByCustomer:${customerId}`;
const leaseKey = (subscriptionId: string) => `lease:${subscriptionId}`;

/** Set of every firm's license key — lets the ops dashboard enumerate the fleet. */
const FIRMS_INDEX = "firms:index";

/**
 * A hardware financing plan. Separate from FirmRecord on purpose — a lease is a finite
 * installment (N payments then done), not an entitlement, and never mints a license.
 */
export interface LeaseRecord {
  subscriptionId: string;
  /** Set once the webhook converts the subscription into a capped Subscription Schedule. */
  scheduleId?: string;
  stripeCustomerId: string;
  hardwareCents: number;
  monthlyCents: number;
  months: number;
  rate: number;
  status: string;
  updatedAt: string;
}

export async function getLease(subscriptionId: string): Promise<LeaseRecord | null> {
  const raw = await getRedis().get(leaseKey(subscriptionId));
  return raw ? (JSON.parse(raw) as LeaseRecord) : null;
}

export async function saveLease(record: LeaseRecord): Promise<void> {
  const value = JSON.stringify({ ...record, updatedAt: new Date().toISOString() });
  await getRedis().set(leaseKey(record.subscriptionId), value);
}

/** A short, human-pasteable, hard-to-guess license key. */
export function generateLicenseKey(): string {
  return `relay_live_${randomBytes(24).toString("hex")}`;
}

export async function getFirmByLicenseKey(licenseKey: string): Promise<FirmRecord | null> {
  const raw = await getRedis().get(firmKey(licenseKey));
  return raw ? (JSON.parse(raw) as FirmRecord) : null;
}

export async function getLicenseKeyBySubscription(subscriptionId: string): Promise<string | null> {
  return getRedis().get(keyBySub(subscriptionId));
}

export async function getLicenseKeyByCustomer(customerId: string): Promise<string | null> {
  return getRedis().get(keyByCustomer(customerId));
}

/** Upsert the firm record and its reverse indexes (subscription/customer -> license key). */
export async function saveFirm(record: FirmRecord): Promise<void> {
  const client = getRedis();
  const value = JSON.stringify({ ...record, updatedAt: new Date().toISOString() });
  const writes: Promise<unknown>[] = [
    client.set(firmKey(record.licenseKey), value),
    client.set(keyByCustomer(record.stripeCustomerId), record.licenseKey),
    // Fleet index — so the ops dashboard can enumerate firms (Redis is keyed per license key).
    client.sadd(FIRMS_INDEX, record.licenseKey),
  ];
  // The subscription index only exists once a subscription does (i.e. after activation).
  if (record.subscriptionId) {
    writes.push(client.set(keyBySub(record.subscriptionId), record.licenseKey));
  }
  await Promise.all(writes);
}

/** Every firm in the fleet, newest-updated first. Backed by the `firms:index` set. */
export async function listFirms(): Promise<FirmRecord[]> {
  const client = getRedis();
  const keys = await client.smembers(FIRMS_INDEX);
  if (keys.length === 0) return [];
  const raws = await client.mget(keys.map(firmKey));
  const firms = raws
    .filter((r): r is string => Boolean(r))
    .map((r) => JSON.parse(r) as FirmRecord);
  return firms.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

/**
 * Merge a partial telemetry patch into a firm record (written by the box's poll).
 * No-op if the key is unknown. Always refreshes `updatedAt`.
 */
export async function setFirmTelemetry(
  licenseKey: string,
  patch: Partial<FirmRecord>,
): Promise<FirmRecord | null> {
  const firm = await getFirmByLicenseKey(licenseKey);
  if (!firm) return null;
  const merged: FirmRecord = { ...firm, ...patch, licenseKey };
  await saveFirm(merged);
  return merged;
}

/** Set the version the team wants a box to update to. */
export async function setFirmTarget(licenseKey: string, version: string): Promise<FirmRecord | null> {
  return setFirmTelemetry(licenseKey, { targetVersion: version, updateStatus: "pending" });
}

/**
 * One-time backfill: seed `firms:index` from any existing `firm:*` keys that predate the index.
 * Safe to run repeatedly. Returns the number of keys indexed.
 */
export async function reindexFirms(): Promise<number> {
  const client = getRedis();
  const prefix = "firm:";
  let cursor = "0";
  const licenseKeys: string[] = [];
  do {
    const [next, batch] = await client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200);
    cursor = next;
    for (const k of batch) licenseKeys.push(k.slice(prefix.length));
  } while (cursor !== "0");
  if (licenseKeys.length > 0) await client.sadd(FIRMS_INDEX, ...licenseKeys);
  return licenseKeys.length;
}
