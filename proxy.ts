import { auth } from "@/lib/auth";

/**
 * Gate the ops dashboard behind a Google session. Everything under /ops and /api/ops requires auth;
 * the public marketing site (apex/www) is untouched because the matcher below scopes this proxy.
 *
 * (Next 16 renamed the "middleware" file convention to "proxy" — same API, default export + matcher.)
 *
 * - /ops/signin is always allowed (it's where we send people to authenticate).
 * - Unauthenticated /api/ops/* → 401 JSON (don't redirect an API call to an HTML page).
 * - Unauthenticated /ops/* page → redirect to /ops/signin with a callbackUrl.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/ops/signin")) return; // allow the sign-in page itself
  if (req.auth) return; // authenticated → allow

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL("/ops/signin", req.nextUrl.origin);
  url.searchParams.set("callbackUrl", pathname);
  return Response.redirect(url);
});

export const config = {
  matcher: ["/ops/:path*", "/api/ops/:path*"],
};
