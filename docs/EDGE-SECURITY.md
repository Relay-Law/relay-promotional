# Edge security (Phase 0)

The app-layer rate limiter (`lib/ratelimit.ts`) protects individual endpoints. This document covers
the **layer in front of the app** — the CDN/WAF that absorbs volumetric attacks and blocks bad
traffic *before* it ever runs a serverless function (and before you pay for the invocation).

Order of rings, outermost first:

```
Internet → CDN/WAF (this doc) → Next.js function → lib/ratelimit.ts → route auth
```

## Why this matters more than app code

- **Volumetric / DDoS floods** can't be stopped inside your function — by the time your code runs,
  you've already paid for the invocation. Only the edge can drop them cheaply.
- **`lib/ratelimit.ts` keys on `x-forwarded-for`.** That header is trustworthy *only* if every
  request is forced through the edge. If an attacker can reach the origin directly, they can spoof
  the IP and evade the limiter. The WAF + "only allow traffic from the CDN" is what makes IP-keying
  real.

---

## Option A — Vercel (if hosting on Vercel)

1. **Enable the Vercel Firewall / WAF** (Project → Firewall). Turn on **Attack Challenge Mode** as a
   one-click switch you can flip during an active attack.
2. **Add managed rate-limit rules** at the edge for the hot paths, as a coarse backstop to the
   fine-grained app limiter:
   - `/api/waitlist`, `/api/stripe/*`, `/api/hardware/*`, `/api/billing-portal` — challenge or block
     IPs exceeding e.g. 60 req/min.
   - `/api/license/validate`, `/api/box/*` — higher ceilings (machine traffic), but still capped.
3. **Verify marketing pages are static & cached.** The homepage should be served from the CDN cache,
   never waking a function. Check the `x-vercel-cache: HIT` response header in prod.
4. **Confirm `x-forwarded-for` is set by Vercel** (it is by default) and that the origin isn't
   reachable except through Vercel.

## Option B — Cloudflare in front (works regardless of host)

1. Put the domain behind Cloudflare (orange-cloud the DNS records).
2. **WAF → Managed Rules**: enable the Cloudflare OWASP core ruleset.
3. **Security → Bots**: enable Bot Fight Mode (free) or Super Bot Fight Mode (paid).
4. **Rate limiting rules**: same per-path ceilings as above.
5. **Caching**: cache the static marketing routes; bypass cache for `/api/*` and `/ops/*`.
6. **Lock the origin**: only allow inbound traffic from Cloudflare IP ranges (Authenticated Origin
   Pulls or an allowlist), so nobody can hit the origin directly and spoof `x-forwarded-for`.

---

## Content-Security-Policy (enable after testing)

Not enforced in `next.config.mjs` yet because a wrong CSP silently breaks rendering and must be
verified in a real browser. To enable: deploy this as **`Content-Security-Policy-Report-Only`**
first, watch the browser console on a preview deploy for violations, then switch the header name to
`Content-Security-Policy` once clean.

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.stripe.com;
style-src 'self' 'unsafe-inline';
frame-src https://challenges.cloudflare.com https://js.stripe.com;
connect-src 'self' https://challenges.cloudflare.com;
img-src 'self' data:;
font-src 'self' data:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Notes:
- The `challenges.cloudflare.com` entries are for **Turnstile** (Phase 2). Drop them if you don't
  enable Turnstile.
- `js.stripe.com` is only needed if you embed Stripe.js on the page (not required for redirect-based
  Checkout). Drop it otherwise.
- `'unsafe-inline'` on `script-src` is a pragmatic concession to Next's inline hydration. Removing it
  requires per-request nonces (a larger change) — worthwhile later, not blocking.

---

## Quick verification

After deploying, check headers from Phase 0:

```bash
curl -sI https://relay-law.com | grep -iE "strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy"
```

And confirm the marketing page is cached (Vercel):

```bash
curl -sI https://relay-law.com | grep -i x-vercel-cache   # want: HIT
```
