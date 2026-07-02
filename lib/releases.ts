import crypto from "crypto";
import { getRedis } from "@/lib/store";

/**
 * Release registry for the fleet updater.
 *
 * Two concepts, kept separate on purpose:
 *  - **Available releases** — every version CI has published (enumerated from GitHub Releases when
 *    configured, cached in Redis so the dashboard still renders if GitHub is unreachable). This is
 *    what the "pin an exact version" dropdown offers.
 *  - **Channel pointer** — the version ops has *promoted* to a channel (e.g. "stable"). This is what
 *    the one-click "Update to latest" button targets. Promotion is deliberately a separate, manual
 *    step from tagging so a new build never rolls out to the fleet until ops says so (staged rollout).
 */

export type Channel = "stable" | "beta";

export interface ReleaseInfo {
  /** Semver without a leading "v" (e.g. "0.4.0"). */
  version: string;
  publishedAt?: string;
  // Phase 2b: signed manifest — artifact URLs, per-file sha256, RS256 signature.
}

const channelKey = (c: string) => `release:channel:${c}`;
const RELEASES_CACHE = "releases:cache"; // JSON array of ReleaseInfo, newest first

/** The version ops has promoted to a channel — what "Update to latest" targets. Null until promoted. */
export async function getChannelVersion(channel: Channel = "stable"): Promise<string | null> {
  return getRedis().get(channelKey(channel));
}

/** Promote a version to a channel. Validated by the caller against the known release list. */
export async function promoteVersion(channel: Channel, version: string): Promise<void> {
  await getRedis().set(channelKey(channel), version);
}

/**
 * All releases available to pin or promote, newest first. Refreshes from GitHub Releases when
 * RELEASES_GITHUB_REPO is set (cached to Redis), else falls back to the last cache — so a missing
 * token or a GitHub outage degrades to stale data rather than an empty dashboard.
 */
export async function listReleases(): Promise<ReleaseInfo[]> {
  const refreshed = await refreshFromGitHub().catch(() => null);
  if (refreshed) return refreshed;
  const raw = await getRedis().get(RELEASES_CACHE);
  return raw ? (JSON.parse(raw) as ReleaseInfo[]) : [];
}

async function refreshFromGitHub(): Promise<ReleaseInfo[] | null> {
  const repo = process.env.RELEASES_GITHUB_REPO; // e.g. "relay-law/relay"
  if (!repo) return null;
  const res = await ghFetch(`/repos/${repo}/releases?per_page=20`, {
    // Cap GitHub calls to at most once per 5 min regardless of dashboard traffic.
    revalidate: 300,
  });
  if (!res || !res.ok) return null;
  const data = (await res.json()) as Array<{
    tag_name: string;
    published_at: string;
    draft: boolean;
  }>;
  const releases: ReleaseInfo[] = data
    .filter((r) => !r.draft)
    .map((r) => ({ version: r.tag_name.replace(/^v/, ""), publishedAt: r.published_at }));
  await getRedis().set(RELEASES_CACHE, JSON.stringify(releases));
  return releases;
}

// ── Signed manifests + brokered downloads (Phase 2b) ─────────────────────────

/** Allow PEMs stored single-line with literal "\n" escapes (as in .env / dashboards). */
function normalizePem(pem: string): string {
  return pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
}

/**
 * The RSA public key used to verify release manifests — the SAME keypair that mints license JWTs
 * (its public half is baked into every box). Prefer LICENSE_PUBLIC_KEY; otherwise derive the public
 * half from LICENSE_SIGNING_KEY so a separate public PEM isn't required.
 */
function releasePublicKey(): crypto.KeyObject {
  const pub = process.env.LICENSE_PUBLIC_KEY;
  if (pub) return crypto.createPublicKey(normalizePem(pub));
  const priv = process.env.LICENSE_SIGNING_KEY;
  if (priv) return crypto.createPublicKey(crypto.createPrivateKey(normalizePem(priv)));
  throw new Error("no LICENSE_PUBLIC_KEY or LICENSE_SIGNING_KEY to verify manifests");
}

/**
 * Verify a signed manifest over its EXACT bytes (never a re-serialized copy). Matches
 * packaging/backend/sign-manifest.sh (openssl RSASSA-PKCS1v15 + SHA-256) and the box verifier.
 */
export function verifyManifest(manifestBytes: Buffer, signatureB64: string): boolean {
  try {
    return crypto.verify(
      "RSA-SHA256",
      manifestBytes,
      releasePublicKey(),
      Buffer.from(signatureB64, "base64"),
    );
  } catch {
    return false;
  }
}

interface GhAsset {
  id: number;
  name: string;
}
interface GhRelease {
  tag_name: string;
  assets: GhAsset[];
}

/** Authenticated GitHub API fetch. Returns null when RELEASES_GITHUB_REPO is unset. */
async function ghFetch(
  path: string,
  opts: { accept?: string; revalidate?: number; redirect?: RequestRedirect } = {},
): Promise<Response | null> {
  const token = process.env.RELEASES_GITHUB_TOKEN;
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      Accept: opts.accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    redirect: opts.redirect ?? "follow",
  };
  if (opts.revalidate != null) init.next = { revalidate: opts.revalidate };
  else init.cache = "no-store";
  return fetch(`https://api.github.com${path}`, init);
}

async function getReleaseByTag(version: string): Promise<GhRelease | null> {
  const repo = process.env.RELEASES_GITHUB_REPO;
  if (!repo) return null;
  const res = await ghFetch(`/repos/${repo}/releases/tags/v${version}`, { revalidate: 300 });
  if (!res || !res.ok) return null;
  return (await res.json()) as GhRelease;
}

async function fetchAssetBytes(repo: string, assetId: number): Promise<Buffer | null> {
  // Accept: octet-stream makes the asset API return the file bytes (following GitHub's 302 for us).
  const res = await ghFetch(`/repos/${repo}/releases/assets/${assetId}`, {
    accept: "application/octet-stream",
  });
  if (!res || !res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

export interface SignedManifest {
  /** Exact manifest bytes as a UTF-8 string — the box must verify the signature over THIS. */
  manifestRaw: string;
  manifest: { version: string; artifacts: Array<{ name: string; sha256: string; platform: string }> };
  signatureB64: string;
}

/**
 * Fetch + verify the signed manifest for a version. Cached in Redis once verified. Returns null if
 * unconfigured, missing, or the signature does not validate — so a bad manifest is never handed to a
 * box, and the check-in simply omits the update payload rather than pushing something unsigned.
 */
export async function getSignedManifest(version: string): Promise<SignedManifest | null> {
  const repo = process.env.RELEASES_GITHUB_REPO;
  if (!repo) return null;

  const cacheKey = `manifest:${version}`;
  const cached = await getRedis().get(cacheKey);
  if (cached) return JSON.parse(cached) as SignedManifest;

  const rel = await getReleaseByTag(version);
  if (!rel) return null;
  const manAsset = rel.assets.find((a) => a.name === `relay-release-${version}.json`);
  const sigAsset = rel.assets.find((a) => a.name === `relay-release-${version}.json.sig`);
  if (!manAsset || !sigAsset) return null;

  const [mb, sb] = await Promise.all([
    fetchAssetBytes(repo, manAsset.id),
    fetchAssetBytes(repo, sigAsset.id),
  ]);
  if (!mb || !sb) return null;

  const signatureB64 = sb.toString("utf8").trim();
  if (!verifyManifest(mb, signatureB64)) {
    console.error(`[releases] manifest signature invalid for ${version} — refusing to serve`);
    return null;
  }

  const signed: SignedManifest = {
    manifestRaw: mb.toString("utf8"),
    manifest: JSON.parse(mb.toString("utf8")),
    signatureB64,
  };
  await getRedis().set(cacheKey, JSON.stringify(signed), "EX", 3600);
  return signed;
}

/**
 * Resolve a release asset to a short-lived signed download URL (GitHub's CDN), so the box downloads
 * directly without ever holding a GitHub token. Returns null if unconfigured or not found.
 */
export async function resolveAssetDownloadUrl(version: string, name: string): Promise<string | null> {
  const repo = process.env.RELEASES_GITHUB_REPO;
  if (!repo) return null;
  const rel = await getReleaseByTag(version);
  if (!rel) return null;
  const asset = rel.assets.find((a) => a.name === name);
  if (!asset) return null;
  const res = await ghFetch(`/repos/${repo}/releases/assets/${asset.id}`, {
    accept: "application/octet-stream",
    redirect: "manual",
  });
  if (!res) return null;
  return res.headers.get("location");
}
