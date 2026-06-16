# Relay — Deployment & Operations Runbook

The **exact steps** to stand up the billing/licensing system, deploy a firm's server, test it
end-to-end, get the first admin online, promote an admin, and invite another attorney to the
tailnet.

> For *how the system works* (the architecture, the signed-license contract, the lease design),
> see **[BILLING.md](BILLING.md)**. This file is the *do-this* guide.

The system has two halves:
- **License/promo site** — this repo (Next.js on Vercel). Hosts the marketing site, `/billing`
  signup, Stripe webhooks, and the license endpoints.
- **Firm server** — the `relay-api` + `ollama` + `tailscale` stack, installed on a workstation in
  each firm's office via `deploy/server/install.sh` (in the main `relay` repo).

---

## 0. Prerequisites (one-time)

| Need | For |
|---|---|
| **Stripe** account | payments, subscriptions, customer portal |
| **Upstash** (or any) Redis | firm/license/lease records (`RELAY_REDIS_URL`) |
| **Vercel** account + domain (`relay-law.com`) | hosting the license/promo site |
| **GitHub Container Registry** (or any registry) | hosting the `relay-api` Docker image |
| **Tailscale** (per firm) | the firm's private network + identity/2FA |
| Local tools | `node`, `openssl`, the `stripe` CLI, `docker` |

---

## 1. Deploy the license/promo site (this repo) to Vercel

### 1a. Generate the RS256 license-signing keypair (once, ever)
```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out license_private.pem
openssl rsa -in license_private.pem -pubout -out license_public.pem
```
- `license_private.pem` → `LICENSE_SIGNING_KEY` (this site). **Secret — never commit.**
- `license_public.pem` → baked into the `relay-api` image in step 2.

### 1b. Stripe dashboard (use **Test mode** first)
1. **Product + Price** → create "Relay", add a **recurring monthly** price billed **per unit**
   ($50/seat for demo). Copy the price id (`price_…`) → `STRIPE_PRICE_ID`.
2. **API key** → Developers → API keys → Secret key (`sk_test_…`) → `STRIPE_SECRET_KEY`.
3. **Customer Portal** → Settings → Billing → Customer portal → enable; allow updating quantity
   (seats), payment method, cancellation.
4. **Webhook** (do after first deploy, when you know the URL) → Developers → Webhooks → add
   `https://relay-law.com/api/stripe/webhook`, events: `checkout.session.completed`,
   `customer.subscription.created/updated/deleted`. Copy the signing secret (`whsec_…`) →
   `STRIPE_WEBHOOK_SECRET`.

### 1c. Set Vercel environment variables
```
NEXT_PUBLIC_APP_URL      = https://relay-law.com
RELAY_REDIS_URL          = <upstash redis URL>
STRIPE_SECRET_KEY        = sk_…
STRIPE_WEBHOOK_SECRET    = whsec_…
STRIPE_PRICE_ID          = price_…
STRIPE_TRIAL_DAYS        = 14
ADMIN_API_KEY            = <long random string>   # guards /api/admin/activate
LICENSE_SIGNING_KEY      = <contents of license_private.pem>
HARDWARE_DEFAULT_CENTS   = 80000                  # optional, $800 reference box
HARDWARE_LEASE_MONTHS    = 6
HARDWARE_LEASE_RATE      = 0.10
```

### 1d. Deploy & smoke-test
```bash
# deploy (git push to the connected branch, or `vercel --prod`)

# 1) Signup captures a card (open the URL, use test card 4242 4242 4242 4242):
curl -X POST https://relay-law.com/api/stripe/checkout \
  -H 'content-type: application/json' -d '{"email":"test@firm.com","seats":3}'
#    → mints a pending firm + license key (see it on the Stripe customer metadata)

# 2) Pre-activation, the license is withheld:
curl -X POST https://relay-law.com/api/license/validate \
  -H 'content-type: application/json' -d '{"license_key":"relay_live_…"}'

# 3) Activate, then validate again → status flips to trialing:
curl -X POST https://relay-law.com/api/admin/activate \
  -H "x-admin-key: $ADMIN_API_KEY" -H 'content-type: application/json' \
  -d '{"licenseKey":"relay_live_…"}'
```

---

## 2. Bake the public key into `relay-api` and publish the image

In the **main `relay` repo**:
1. Place `license_public.pem` so the image copies it to `/app/keys/license_public.pem`
   (this is `RELAY_LICENSE_PUBKEY_PATH`'s default). Add to the backend Dockerfile:
   `COPY keys/license_public.pem /app/keys/license_public.pem`.
2. Build & push:
   ```bash
   docker build -t ghcr.io/relay-law/relay-api:latest src/backend
   docker push ghcr.io/relay-law/relay-api:latest
   ```
The image now verifies licenses offline against your public key.

---

## 3. Provision a firm (get a license key)

Two ways:
- **Self-serve** — the firm fills out `https://relay-law.com/billing` (seats, email, hardware) and
  saves a card. A **pending firm + license key** is created.
- **You create it** — run the `curl` from step 1d-1 on their behalf.

Either way, **grab the license key** (`relay_live_…`) from the Stripe **customer metadata**
(`metadata.licenseKey`) or the Redis `firm:*` record. You'll paste it into their server.

---

## 4. Set up the firm's Tailscale tailnet

1. The firm needs a **tailnet** tied to their identity provider (Google Workspace / Microsoft 365 /
   Okta) — this is where attorney accounts and **2FA** live. Create/confirm it during onboarding.
2. **Server join key:** Tailscale admin → Settings → Keys → generate an **auth key** for the
   server. You'll pass it to the installer as `--ts-authkey`.
3. **(Optional) In-app invites:** to let the firm admin invite attorneys from inside Relay, create
   a Tailscale **OAuth client** (Settings → OAuth clients, scope `auth_keys` write). You'll set
   `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_CLIENT_SECRET`, `TS_TAILNET` on the server (step 6). Without
   these, admins invite attorneys manually from the Tailscale console instead.

---

## 5. Install + provision the server (native macOS, one script)

> **Deployment is the native macOS `.pkg`, not Docker/Linux.** The firm server is
> a Mac (Ollama runs on the Metal GPU). The full vendor runbook lives in the main
> repo at [documents/ONBOARDING.md](../relay/documents/ONBOARDING.md); the
> essentials:

```bash
# On the firm's Mac, after transferring the .pkg:
sudo installer -pkg ~/Downloads/Relay-Server-<ver>.pkg -target /
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
sudo /usr/local/relay-server/relay-provision.sh   # interactive, pauses at each step
```

`relay-provision.sh` collects every value once (license key, admin email,
Tailscale OAuth + auth key + tailnet, Resend key, your `ADMIN_API_KEY`), then —
confirming before each step — installs deps, writes `relay.env`, joins Tailscale
and serves HTTPS (auto-setting `RELAY_API_KEY` + `RELAY_SERVER_URL`), waits for
health, **activates the subscription**, and **emails the admin their one-click
invite**.

**Prerequisite (browser, once):** enable **MagicDNS** and **HTTPS Certificates**
at [login.tailscale.com/admin/dns](https://login.tailscale.com/admin/dns) — the
script will not proceed until you confirm you've done this.

---

## 6. Activation (handled by the script, or by hand)

Step 6 of `relay-provision.sh` calls this for you. To run it standalone:

```bash
curl -X POST https://relay-law.com/api/admin/activate \
  -H "x-admin-key: $ADMIN_API_KEY" -H 'content-type: application/json' \
  -d '{"licenseKey":"relay_live_…"}'
#   → { ok: true, status: "trialing", trialEnd: … }
```

Because relay-api boots with **no cached token**, the next service restart fetches
the live `trialing` license in seconds (no 12h wait). The script does
`launchctl kickstart -k system/com.relay.server` for you. Verify:
```bash
tail -n 50 "/Library/Application Support/Relay/logs/server.err.log" | grep -i license
#   → "License refreshed: … status=trialing"
```

---

## 7. The first admin comes online by email (no manual tailnet join)

The firm admin is **whoever you set as `RELAY_ADMIN_EMAIL`** — not whoever connects
first. `db_seed_admin()` makes that email an `admin` at startup, and the
first-to-connect fallback is disabled whenever the var is set, so your test traffic
can't claim it.

`relay-provision.sh` Step 7 gets them onto the network: it mints a single-use
Tailscale auth key for the admin and **emails them the same one-click invite every
attorney gets**. The admin:

1. Opens the email → installs the **Relay** app.
2. Clicks **“Open in Relay”** (or pastes the invite code). The app installs/launches
   Tailscale if needed, joins the tailnet with the embedded key, and self-configures
   the server URL + access key.
3. Lands in the app **already as admin** (their email == `RELAY_ADMIN_EMAIL`).

Confirm from their app's Admin panel, or:
```bash
curl https://relay-backend.<tailnet>.ts.net/api/admin/entitlement \
  -H "Authorization: Bearer $RELAY_API_KEY"
#   → { seats: N, status: "trialing", active_seats: 1, is_valid: true }
```

---

## 8. Promote another user to admin (optional)

An existing admin can promote a teammate (after that teammate has signed in at least once, so their
user row exists). Via the Relay app's Admin panel, or:
```bash
curl -X PATCH "https://relay-backend.<tailnet>.ts.net/api/admin/seats/teammate@firm.com/role" \
  -H "Authorization: Bearer $RELAY_API_KEY" \
  -H 'content-type: application/json' -d '{"role":"admin"}'
```
> Admin calls must originate from a **tailnet device authenticated as an existing admin** — the
> server trusts the Tailscale-injected identity, not just the bearer token.

---

## 9. Invite another attorney (email only)

The admin opens **Admin panel → Invite attorney**, types the colleague's **email**, and hits
**Send invite**. The server mints a single-use Tailscale auth key, packages it with the server URL +
access key, and emails a one-click `relay://invite` link. Equivalent API call:
```bash
curl -X POST "https://relay-backend.<tailnet>.ts.net/api/admin/invite" \
  -H "Authorization: Bearer $RELAY_API_KEY" \
  -H 'content-type: application/json' -d '{"email":"attorney@firm.com"}'
#   → { ok: true, email: "attorney@firm.com", message: "Invite sent…" }
```
Then the **new attorney**: opens the email → installs **Relay** → clicks **“Open in Relay”** (or
pastes the invite code). The app installs/launches Tailscale if missing, joins the tailnet with the
embedded key, and self-configures. They appear in the seat list as a `member`; one seat is consumed.
**No keys, URLs, or terminal on their end.**

**Requirements (all enforced):** `/api/admin/invite` returns `501` unless `TS_OAUTH_CLIENT_ID/SECRET`
+ `TS_TAILNET` **and** `RESEND_API_KEY` + `RELAY_SERVER_URL` are set — `relay-provision.sh` collects
them.

**Seat enforcement:** the endpoint refuses to mint a key once `active_seats >= seats`, and
`require_seat` blocks the (N+1)th login — both point the admin to `relay-law.com/billing` to add
seats. Adding seats in the Stripe portal raises the cap on the next license refresh.

---

## 10. End-to-end test checklist

- [ ] `POST /api/stripe/checkout` → pending firm + license key on the Stripe customer.
- [ ] `POST /api/admin/activate` → `status: trialing`.
- [ ] `POST /api/license/validate` → token with `status: trialing, seats: N`.
- [ ] Server log (`/Library/Application Support/Relay/logs/server.err.log`) shows `License refreshed: … status=trialing`.
- [ ] Admin (== `RELAY_ADMIN_EMAIL`) opens their emailed invite → lands as `admin`.
- [ ] Admin emails a second attorney → they click the invite → appear as `member`, `active_seats` increments.
- [ ] Exceed seats → invite/login blocked with a clear "add seats" message.
- [ ] In the Stripe **test clock**, advance past the trial → first invoice charges the saved card.

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `401 Missing/Invalid bearer token` | Wrong `RELAY_API_KEY` in the desktop app (Settings → Network). |
| `402 subscription_inactive` | Firm not activated, or `past_due`/`canceled`. Run step 6a; check Stripe. |
| `403 seat_limit_exceeded` | All seats in use. Add seats in the Stripe portal, then wait for refresh. |
| `503 license_unreachable` | Server can't reach `relay-law.com` and cache expired. Check connectivity. |
| License stuck on old status | Server cached a token. `docker compose restart relay-api` (see BILLING.md note). |
| Webhook signature errors | `STRIPE_WEBHOOK_SECRET` mismatch, or body was parsed before verify. |
| Invite returns `501` | `TS_OAUTH_*`/`TS_TAILNET` not set — invite manually from the Tailscale console. |
| Admin call returns `403 Admin role required` | Caller isn't an admin, or isn't coming through Tailscale as that user. |
| Checkout returns `Could not start checkout` | A `try`-step failed — check the dev terminal. Common: `RELAY_REDIS_URL` unset, or dev server not restarted after editing `.env.local`. |

---

## Appendix — Quick local test (be the firm yourself, one machine)

Run the whole flow on a single machine, **no Tailscale needed**. Two systems are involved: the
**license site** (this repo) and the **app** (the `relay` repo).

**A. License/billing side (this repo)**
1. License site running: `npm run dev` (`:3000`).
2. Webhook listener (separate terminal — needed for card-save + confirmation email):
   ```powershell
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Put the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.
3. **Sign up** at `http://localhost:3000/billing` → finish checkout with test card `4242 4242 4242 4242`.
   Grab the key from **Stripe → Customers → [customer] → Metadata → `licenseKey`**.
4. **Validate the registration / start the trial** (PowerShell — `Invoke-RestMethod`, not bash curl):
   ```powershell
   Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/activate `
     -Headers @{ "x-admin-key" = "<ADMIN_API_KEY>" } -ContentType "application/json" `
     -Body '{"licenseKey":"relay_live_…"}'
   ```
   Stripe → **Subscriptions** now shows a **trialing** sub. That's the registration validated.

**B. App side (the `relay` repo)** — run it and you become the first admin:
```powershell
# Backend (one terminal). Leave RELAY_LICENSE_KEY blank → unlimited dev mode.
cd C:\Users\matth\VSC\LawyerApp\relay\deploy\backend   # ensure .env has RELAY_API_KEY=test
docker compose -f docker-compose.backend.yml up -d

# Frontend (another terminal)
cd C:\Users\matth\VSC\LawyerApp\relay\src\frontend
npm install
npm run dev
```
The Electron app opens at the dev backend (`localhost:8000`). In dev there's no Tailscale, so the
backend uses the `attorney_default` identity — **the first user to use the app is auto-promoted to
admin. That's you.** No invite, no tailnet join needed locally.

> The tailnet + `/api/admin/invite` only matter in **production**, when real attorneys on separate
> machines join. The *first* admin is never invited — being first = admin.
>
> Section B runs in **dev mode** (no license enforcement). For the real gated flow, see the
> production-flow section directly below.

---

## Appendix — Full production flow locally (real license enforcement)

Section B above leaves `RELAY_LICENSE_KEY` blank (unlimited dev mode). To run the **real** flow
where the license actually gates the app and seats are enforced:

1. **Site has a signing key.** Generate the RS256 keypair and set `LICENSE_SIGNING_KEY` on the site
   (single line — see §1a). Without it, `/api/license/validate` can't mint a token. Restart
   `npm run dev`.
2. **Activate** (start the trial) — §6a / Appendix A-4. Confirms `status: trialing`.
3. **Confirm the token mints:**
   ```powershell
   Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/license/validate `
     -ContentType "application/json" -Body '{"license_key":"relay_live_…"}'
   #   → { token: "eyJ…" }
   ```
4. **Point the backend at the license** — in `relay/deploy/backend/.env`:
   ```
   RELAY_LICENSE_KEY=relay_live_…
   RELAY_LICENSE_URL=http://host.docker.internal:3000/api/license/validate
   ```
   (Optional, for real signature checking: mount `license_public.pem` at
   `/app/keys/license_public.pem`. If absent, the backend accepts the token unverified — fine for
   local testing.) Restart relay-api.
5. **Verify enforcement.** Seats come from signup (sign up with >1 to test multi-user). Distinct
   identities need Tailscale, so locally simulate users with the `X-Relay-User` header:
   ```powershell
   Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/admin/entitlement `
     -Headers @{ "Authorization" = "Bearer test"; "X-Relay-User" = "alice@firm.com" }
   # repeat for bob@, carol@ … active_seats climbs; exceeding seats → 403 seat_limit_exceeded
   ```

### How a non-paying firm gets cut off (automatic — no manual step)
There's **no "turn off" command**. Enforcement is automatic:
```
Firm stops paying → Stripe moves the sub active → past_due → canceled
  → webhook updates the firm record's status
  → backend's next license refresh (≤12h) gets "past_due"/"canceled"
  → require_seat() returns 402 → users blocked
```
The backend caches the license up to ~48h and refreshes every 12h, so a lapsed firm loses access on
the next refresh. Going **offline** doesn't help them — the cached token expires and the backend
**fails closed** (`503 license_unreachable`). To cut a firm off immediately-ish, cancel their
subscription in Stripe; it flows through on the next refresh.

### What the relay side actually does (runtime)
The whole client half lives in `relay/src/backend/app/licensing.py` + `auth.py`:
- **On startup** (`start_background_refresh`): loads the last-known token from the DB, refreshes if
  missing/expiring, and starts a thread that re-checks every **12h**.
- **`_fetch_token()`**: POSTs `{license_key}` to `RELAY_LICENSE_URL`, gets back `{token}`.
- **`_parse_entitlement()`**: verifies the RS256 JWT with the baked-in public key and decodes
  `{ firm_id, seats, status, exp }` into an `Entitlement`, cached in memory + the DB.
- **`current_entitlement()`**: returns the cached entitlement (no network call per request); only
  re-fetches if the cache is missing/expired. Returns `unreachable` if it can't get a token.
- **`require_seat()`** (a dependency on protected routes): the actual gate — reads
  `current_entitlement()`, returns **402** for `past_due`/`canceled`, **503** for `unreachable`, and
  **403** when `db_count_active_seats() > seats`. This is what "turns the app off" when unpaid.

So calling **activate** (on the site) creates the trialing subscription; everything after is the
backend *pulling* that status on its 12h cycle and `require_seat` enforcing it on every request.
