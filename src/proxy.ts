import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { withCelTablePrefix } from "@/lib/supabase/table-prefix";
import {
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_MAX_AGE,
  isOnboardingAllowlisted,
} from "@/lib/auth/onboarding";

export async function proxy(request: NextRequest) {
  // 1. Run the existing Supabase session refresh + auth redirects. If this
  //    returns a redirect (e.g. unauthed user → /login, or logged-in user
  //    hitting /login → /), honor it and skip the onboarding gate.
  const sessionResponse = await updateSession(request);
  if (sessionResponse.status >= 300 && sessionResponse.status < 400) {
    return sessionResponse;
  }

  const { pathname } = request.nextUrl;

  // 2. Skip onboarding gate entirely for allowlisted paths (welcome, auth,
  //    api, static) so we never redirect-loop or interrupt API calls.
  if (isOnboardingAllowlisted(pathname)) {
    return sessionResponse;
  }

  // 3. Cookie fast-path: if the user has completed onboarding before, the
  //    cel_onboarded cookie is set and we can let them through without a DB
  //    round-trip. This is the steady-state path for 99% of requests.
  if (request.cookies.get(ONBOARDED_COOKIE)?.value === "1") {
    return sessionResponse;
  }

  // 4. Check auth. If there's no user, updateSession would have redirected
  //    already (step 1), so reaching here means we have a user — but rebuild
  //    the client to verify and to query the profile row.
  const rawSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op: session refresh already happened in updateSession.
        },
      },
    }
  );

  const supabase = withCelTablePrefix(rawSupabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return sessionResponse;
  }

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("has_onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.has_onboarded) {
    // Already onboarded per DB — set the cookie so future requests skip
    // this check entirely.
    sessionResponse.cookies.set(ONBOARDED_COOKIE, "1", {
      path: "/",
      maxAge: ONBOARDED_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return sessionResponse;
  }

  // 5. Not onboarded — redirect to /welcome.
  const welcomeUrl = request.nextUrl.clone();
  welcomeUrl.pathname = "/welcome";
  welcomeUrl.search = "";
  return NextResponse.redirect(welcomeUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
