import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";

/**
 * The signed license is a tamper-proof "hall pass". This site mints it with a private key;
 * the firm's relay-api verifies it locally with the baked-in public key (no call back to us),
 * and caches it. Only we can mint a valid license; anyone can verify one.
 *
 * Contract is fixed by relay-api (src/backend/app/licensing.py):
 *   - Algorithm: RS256 (RSASSA-PKCS1-v1_5 + SHA-256).
 *   - Claims: { firm_id, seats, status, exp }.
 *   - relay-api reads data.token from the /api/license/validate response.
 *
 * Generate the keypair with:
 *   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out license_private.pem
 *   openssl rsa -in license_private.pem -pubout -out license_public.pem
 * Put the PKCS8 private PEM in LICENSE_SIGNING_KEY (this site) and the public PEM in relay-api
 * at /app/keys/license_public.pem (RELAY_LICENSE_PUBKEY_PATH).
 */
const ALG = "RS256";

/** Default license lifetime. Long enough to ride out brief license-server/internet outages. */
const DEFAULT_TTL = "48h";

/** The four statuses relay-api understands (Entitlement.status). */
export type LicenseStatus = "active" | "trialing" | "past_due" | "canceled";

/** Collapse Stripe's subscription statuses into the four relay-api recognizes. */
export function mapStripeStatus(stripeStatus: string): LicenseStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    default:
      return "canceled";
  }
}

export interface LicenseClaims {
  firmId: string;
  seats: number;
  status: LicenseStatus;
}

/** Allow PEMs stored on a single line with literal "\n" escapes (common in .env / dashboards). */
function normalizePem(pem: string): string {
  return pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
}

async function signingKey() {
  const pem = process.env.LICENSE_SIGNING_KEY;
  if (!pem) throw new Error("LICENSE_SIGNING_KEY is not set");
  return importPKCS8(normalizePem(pem), ALG);
}

export async function signLicense(claims: LicenseClaims, ttl: string = DEFAULT_TTL): Promise<string> {
  return new SignJWT({
    firm_id: claims.firmId,
    seats: claims.seats,
    status: claims.status,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(await signingKey());
}

/**
 * Verify a license JWT. Mirrors what relay-api does — exposed here mainly for tests.
 * Requires LICENSE_PUBLIC_KEY (the public PEM).
 */
export async function verifyLicense(token: string): Promise<LicenseClaims & { exp: number }> {
  const pem = process.env.LICENSE_PUBLIC_KEY;
  if (!pem) throw new Error("LICENSE_PUBLIC_KEY is not set");
  const publicKey = await importSPKI(normalizePem(pem), ALG);
  const { payload } = await jwtVerify(token, publicKey);
  return {
    firmId: String(payload.firm_id),
    seats: Number(payload.seats),
    status: payload.status as LicenseStatus,
    exp: Number(payload.exp),
  };
}
