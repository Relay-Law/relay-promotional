// Dev/test helper: override a firm's seat count and subscription status directly
// in Redis, without going through Stripe. Use this to unblock a local server
// bring-up when the real subscription isn't active yet.
//
// ⚠️  This diverges from Stripe — the next webhook event for this customer can
//     overwrite it. For production, set seats via the Stripe subscription
//     quantity (relay-law.com/billing) and let the webhook sync it.
//
// Usage:
//   RELAY_REDIS_URL=... node scripts/set-firm-seats.mjs <licenseKey> <seats> [status]
//   status defaults to "trialing" (valid: active | trialing | past_due | canceled)
//
// The server picks up the change on its next /api/license/validate poll (~12h),
// or immediately if you restart it:
//   sudo launchctl kickstart -k system/com.relay.server

import Redis from "ioredis";

const url = process.env.RELAY_REDIS_URL;
if (!url) {
  console.error("RELAY_REDIS_URL is not set (pull it from Vercel or your .env.local).");
  process.exit(1);
}

const [, , licenseKey, seatsArg, statusArg = "trialing"] = process.argv;
const seats = Number(seatsArg);
if (!licenseKey || !Number.isInteger(seats) || seats < 1) {
  console.error("Usage: node scripts/set-firm-seats.mjs <licenseKey> <seats> [status]");
  process.exit(1);
}
if (!["active", "trialing", "past_due", "canceled"].includes(statusArg)) {
  console.error(`Invalid status "${statusArg}". Use: active | trialing | past_due | canceled`);
  process.exit(1);
}

const redis = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 5000 });
const key = `firm:${licenseKey}`;

const raw = await redis.get(key);
if (!raw) {
  console.error(`No firm record found at ${key} — is the license key correct?`);
  await redis.quit();
  process.exit(1);
}

const firm = JSON.parse(raw);
console.log("Before:", { seats: firm.seats, status: firm.status });

firm.seats = seats;
firm.status = statusArg;
firm.updatedAt = new Date().toISOString();
await redis.set(key, JSON.stringify(firm));

console.log("After: ", { seats: firm.seats, status: firm.status });
console.log("Done. Restart the server to apply now: sudo launchctl kickstart -k system/com.relay.server");
await redis.quit();
