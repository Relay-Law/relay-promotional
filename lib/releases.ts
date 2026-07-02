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
  const token = process.env.RELEASES_GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Cap GitHub calls to at most once per 5 min regardless of dashboard traffic.
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
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
