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

  // Update, then insert if there was no row: nothing creates a cel_profiles
  // row at sign-up, so a new reader's first visit here is what creates it.
  // (Not an upsert — readers have no UPDATE grant on `id`, which a merging
  // upsert would need.)
  const now = new Date().toISOString();
  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  const flags = { has_onboarded: true, onboarded_at: now, updated_at: now };

  const { data: updated, error: updateError } = await supabase
    .from("cel_profiles")
    .update(flags)
    .eq("id", user.id)
    .select("id");
  let error = updateError;
  if (!error && (updated ?? []).length === 0) {
    ({ error } = await supabase.from("cel_profiles").insert({
      id: user.id,
      ...(displayName ? { display_name: displayName } : {}),
      ...flags,
    }));
  }

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
