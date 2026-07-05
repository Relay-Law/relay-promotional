# Relay Billing & Licensing

How "pay in the browser" becomes "unlocked in the software" — the **system and the why**. For the
exact step-by-step (deploy, install a firm's server, get the first admin on, invite attorneys),
see **[README.md](../README.md)**.

## Model in one paragraph

One firm = one `relay-api` server = one Stripe subscription = **N seats**. Relay is hardware-gated
and on-prem, so **nothing bills at signup** — signup only captures a card and mints the **license
key**. We install the server, verify it works, then call the **activation hook**, which starts the
trialing subscription as of that day. The firm's `relay-api` calls `/api/license/validate` with the
key and gets a **signed license JWT** (verified locally, cached ~24h); it enforces seat count
against the verified `Tailscale-User-Login` identities. Billing self-service happens in Stripe's
hosted **Customer Portal**. Desktop apps never touch money; 2FA is handled by Tailscale + the firm's
SSO.

### Lifecycle: signup → install → activation
1. **Signup** (`POST /api/stripe/checkout`) — creates the Stripe customer + a **pending** firm
   record + license key, and opens a `setup`-mode Checkout that **captures a card with no charge**.
2. **Install** — paste the license key (`RELAY_LICENSE_KEY`) into their server. Pre-activation the
   firm status is `pending`, so the license server withholds entitlement (test in LAN/dev mode).
3. **Activation** (`POST /api/admin/activate`, internal) — once it works, we start the trialing
   subscription. The trial clock begins **now**, not at signup. The server's next license poll
   returns `trialing` and users come online.

### Keys — what they are and when each is created

Two kinds of "key" live in this system — don't confuse them:

```
ONE-TIME  (created once, ever, at initial product setup)
  • RS256 license-signing keypair
        private → promo site env   LICENSE_SIGNING_KEY
        public  → relay-api image  /app/keys/license_public.pem
  • ADMIN_API_KEY → promo site env (guards /api/admin/activate)

PER FIRM  (one license key per firm — born at SIGNUP, then only ever used)

  SIGNUP                 INSTALL                ACTIVATION             LIVE
  ──────                 ───────                ──────────             ────
  POST /api/stripe/      paste key into the     POST /api/admin/       relay-api polls
  checkout               server .env as         activate {licenseKey}  /api/license/validate
  │                      RELAY_LICENSE_KEY      (x-admin-key)          │
  ├─ Stripe customer                            │                      ├─ gets RS256 token
  ├─ ★ LICENSE KEY  ───────────────────────────┤                      │   {seats, trialing}
  │    created HERE  ────────────────────────►  ├─ trialing sub        ├─ seats enforced vs
  ├─ pending firm saved                         │   created (trial      │   Tailscale logins
  ├─ card captured (no charge)                  │   starts TODAY)      └─ attorneys online
  └─ key on customer.metadata                   ├─ status → trialing
                                                └─ activatedAt set
```

The ★ is the only moment a per-firm key is created: **signup**. Install and activation just *use*
that same key — nothing downstream mints a new one.

## API routes (this repo)

| Route | Purpose |
|---|---|
| `POST /api/stripe/checkout` | **Signup.** Creates customer + pending firm + license key; `setup`-mode Checkout captures a card (no charge, no trial). Body: `{ seats?, email?, hardwareChoice? }`. |
| `POST /api/admin/activate` | **Internal.** Auth `x-admin-key`. Starts the trialing subscription for a firm (trial begins today). Body: `{ licenseKey }`. |
| `POST /api/hardware/lease` | Start financed-hardware checkout. Body: `{ hardwareCents?, months?, email?, customerId? }`. Returns `{ url, quote }`. |
| `GET /api/billing-portal` | `relay-api` admin panel → us. `?license_key=…` → `{ url }` for the Stripe Customer Portal. |
| `POST /api/stripe/portal` | Same as above but `POST { licenseKey }` (for our own UI). |
| `POST /api/stripe/webhook` | Stripe → us. Verifies signature; saves card on setup, upserts firm on subscription events. |
| `POST /api/license/validate` | `relay-api` → us. Body: `{ "license_key": "..." }`. Returns `{ "token": "<RS256 JWT>" }` for any known key. |

Shared code: [lib/stripe.ts](lib/stripe.ts), [lib/store.ts](lib/store.ts) (Redis firm records),
[lib/license.ts](lib/license.ts) (RS256 sign/verify + Stripe-status mapping).

> **The `/api/license/validate` contract is fixed by relay-api** — see
> `src/backend/app/licensing.py` and `config.py` in the main repo. It POSTs `{license_key}`, reads
> `data.token`, and verifies an **RS256** JWT with claims `{ firm_id, seats, status, exp }` using a
> public key at `/app/keys/license_public.pem`. We return a token even for `past_due`/`canceled`
> (encoding the real status) so relay-api's `require_seat()` can show the right message.

> **Setup, env vars, and the local/Stripe-CLI test recipe** live in
> [README.md](../README.md) (§1) and [.env.local.example](../.env.local.example).

## Hardware financing (lease)

We front a workstation and the firm repays it over `HARDWARE_LEASE_MONTHS` (default 6) at a flat
`HARDWARE_LEASE_RATE` (default 0.10). It's a speed/convenience play — the rate ≈ Stripe fees +
capital cost, not profit. Hardware lives in [lib/hardware.ts](lib/hardware.ts) and is **fully
separate from software/licensing**: a lease never mints a license key.

Flow:
1. `POST /api/hardware/lease` creates a Checkout subscription with an **inline monthly price**
   (`financedTotal / months`), tagged `metadata.type = "hardware_lease"` on both session and
   subscription. Machine cost is dynamic (`hardwareCents`), so an $800 box → $147/mo at 10%/6mo.
2. On `checkout.session.completed`, the webhook converts that open-ended subscription into a
   **Subscription Schedule** capped via `duration: { interval: "month", interval_count: months }`
   with `end_behavior: "cancel"` — so the firm is charged **exactly N times then it stops**. The
   conversion is idempotent (guarded by the stored `scheduleId`).
3. The lease is stored as a `LeaseRecord` (`lease:{subscriptionId}` in Redis), refreshed on
   subscription lifecycle events. The other option — **BYO hardware** — is just a published spec
   sheet + purchase link; nothing to bill.

> The "6-month contract" and the right to reclaim the machine on default are a **legal** document,
> not a Stripe feature — Stripe only executes the N charges. Test the exact charge count with a
> Stripe **test clock** before going live.

## relay-api side (already implemented in the main repo)

The client half already exists — **you do not need to build it**, only feed it:
- `src/backend/app/licensing.py` — POSTs `{license_key}` to `RELAY_LICENSE_URL` every 12h, verifies
  the RS256 token, caches it in `app_settings`, exposes `current_entitlement()`.
- `src/backend/app/auth.py` — `require_seat()` enforces `db_count_active_seats() <= seats` and maps
  `past_due`/`canceled`/`unreachable` to 402/503.
- `src/backend/app/config.py` — `RELAY_LICENSE_KEY`, `RELAY_LICENSE_URL`
  (defaults to `https://relay-law.com/api/license/validate`), `RELAY_LICENSE_PUBKEY_PATH`.

So the remaining main-repo work is just operational: **drop the public key** at
`/app/keys/license_public.pem` in the image, and **set `RELAY_LICENSE_KEY`** during server install
(empty key = LAN/dev mode, unlimited seats).

### License refresh cadence (why activation takes effect fast)
relay-api's 12h poll is only the **steady-state background** refresh. It *also* refreshes **on
startup** and **synchronously when its cached token is missing/expired** — so after activation, a
`docker compose restart relay-api` makes the new entitlement live in seconds (no 12h wait). The
deploy runbook installs the server in dev mode *first* precisely so it never caches a pre-activation
"denied" token that a plain restart wouldn't re-fetch. Step-by-step in [README.md](../README.md) §5–6.
> Future nicety: a "refresh license now" command on relay-api (or short-TTL pre-activation tokens)
> would remove even the restart.

## Notes / follow-ups
- **Storage** is Upstash Redis (reuses `RELAY_REDIS_URL`). Move to Postgres only if seat/reporting
  queries grow complex.
- **Tailnet binding** (optional hardening): bind a license key to one tailnet so it can't be reused
  on another server. The store already has a `tailnetId` field, but relay-api's current request only
  sends `{license_key}` — it'd need to also send its tailnet id for us to enforce this.
- **Setup fee** is deferred — activation starts only the software trial. Add it later as a one-time
  invoice item at activation, waived for demoers.
