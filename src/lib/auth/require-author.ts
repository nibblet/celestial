import { createClient } from "@/lib/supabase/server";
import { hasAuthorSpecialAccess } from "@/lib/auth/special-access";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthorGate {
  supabase: SupabaseClient;
  user: User | null;
  role: string | null;
  ok: boolean;
  status: number;
  error: "Unauthorized" | "Forbidden" | null;
}

/**
 * Shared auth gate for Beyond / people write routes.
 * Grants access when profile role is `author` or `admin`, or email allowlist matches.
 */
export async function requireAuthor(): Promise<AuthorGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      role: null,
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? null;
  const allowed =
    hasAuthorSpecialAccess(user.email, role) || role === "admin";

  if (!allowed) {
    return { supabase, user, role, ok: false, status: 403, error: "Forbidden" };
  }
  return { supabase, user, role, ok: true, status: 200, error: null };
}
