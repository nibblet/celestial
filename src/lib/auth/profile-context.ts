import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasKeithSpecialAccess } from "@/lib/auth/special-access";
import type { Profile } from "@/types";

export interface AuthenticatedProfileContext {
  user: User | null;
  profile: Profile | null;
  isKeithSpecialAccess: boolean;
}

export async function getAuthenticatedProfileContext(): Promise<AuthenticatedProfileContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      isKeithSpecialAccess: false,
    };
  }

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select(
      "id, display_name, age, age_mode, role, has_onboarded, onboarded_at, created_at, updated_at"
    )
    .eq("id", user.id)
    .single();

  return {
    user,
    profile: profile ?? null,
    isKeithSpecialAccess: hasKeithSpecialAccess(user.email, profile?.role),
  };
}
