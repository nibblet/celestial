import { createClient } from "@/lib/supabase/server";
import {
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_MAX_AGE,
} from "@/lib/auth/onboarding";

/**
 * POST /api/profile/onboarding
 *
 * Body: { replay?: boolean }
 *   replay=false (default) — marks the tour complete: flips has_onboarded
 *                            to true, stamps onboarded_at, and sets the
 *                            sb_onboarded cookie so the proxy doesn't need
 *                            to hit the DB again.
 *   replay=true            — no-op for users re-watching the tour from
 *                            /profile. Returns {ok:true} without touching
 *                            the DB flag or the cookie.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { replay?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }

  if (body.replay === true) {
    return Response.json({ ok: true, replay: true });
  }

  const { error } = await supabase
    .from("sb_profiles")
    .update({
      has_onboarded: true,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${ONBOARDED_COOKIE}=1; Path=/; Max-Age=${ONBOARDED_COOKIE_MAX_AGE}; SameSite=Lax`
  );
  return response;
}
