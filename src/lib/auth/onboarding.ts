/**
 * Onboarding gate helpers shared by the proxy and the completion API.
 *
 * The cookie is a hot-path signal so the proxy doesn't hit Supabase on every
 * request. It mirrors `cel_profiles.has_onboarded` and is the source of truth
 * for middleware routing; the DB column is the source of truth for "did this
 * user ever finish the tour" and is what gets checked on cache miss.
 */

export const ONBOARDED_COOKIE = "cel_onboarded";
export const ONBOARDED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Paths that should never redirect to /welcome, even for users who haven't
 * completed onboarding. Keeps the welcome flow, auth flow, API routes, and
 * static assets reachable.
 */
export function isOnboardingAllowlisted(pathname: string): boolean {
  return (
    pathname === "/welcome" ||
    pathname.startsWith("/welcome/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}
