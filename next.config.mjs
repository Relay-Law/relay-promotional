/** @type {import('next').NextConfig} */

/**
 * Baseline security response headers, applied to every route.
 *
 * This is the "safe set" — headers that harden the site with ~zero risk of breaking rendering.
 * A full Content-Security-Policy is deliberately NOT enforced here yet (Next's inline hydration
 * scripts make a strict CSP easy to get wrong and hard to verify without a browser). See
 * docs/EDGE-SECURITY.md for the CSP to enable once you can test it in a preview deploy.
 */
const securityHeaders = [
  // Force HTTPS for 2 years. No `preload` yet — that's a hard-to-reverse commitment; add it via
  // hstspreload.org only once you're sure every subdomain is HTTPS-only.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Don't let browsers MIME-sniff a response into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: this site should never be embedded in a frame.
  { key: "X-Frame-Options", value: "DENY" },
  // Don't leak full URLs (which can carry tokens/ids) to third parties in the Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop powerful browser features we never use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
