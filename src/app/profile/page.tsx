import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileHero } from "@/components/profile/ProfileHero";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Keith Cobb Storybook profile.",
};

function resolveDisplayName(
  profileName: string | null | undefined,
  metaName: unknown,
  email: string | null | undefined
): string {
  const fromProfile = profileName?.trim();
  if (fromProfile) return fromProfile;
  const fromMeta =
    typeof metaName === "string" && metaName.trim() ? metaName.trim() : "";
  if (fromMeta) return fromMeta;
  const local = email?.split("@")[0]?.trim();
  if (local) return local;
  return "Family reader";
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = resolveDisplayName(
    profile?.display_name,
    user.user_metadata?.display_name,
    user.email
  );

  return <ProfileHero displayName={displayName} email={user.email ?? ""} />;
}
