import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfileGalleryData } from "@/lib/analytics/profile-gallery-data";
import { ProfileReflectionHero } from "@/components/profile/ProfileReflectionHero";
import { ProfileGallery } from "@/components/profile/ProfileGallery";
import { storiesData } from "@/lib/wiki/static-data";
import { KeithProfileHero } from "@/components/profile/KeithProfileHero";
import { getKeithDashboardData } from "@/lib/analytics/keith-dashboard";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { createClient } from "@/lib/supabase/server";

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
  const { user, profile, isKeithSpecialAccess } =
    await getAuthenticatedProfileContext();

  if (!user) redirect("/login");

  const displayName = resolveDisplayName(
    profile?.display_name,
    user.user_metadata?.display_name,
    user.email
  );

  if (isKeithSpecialAccess) {
    const supabase = await createClient();
    const { count: pendingQuestionCount } = await supabase
      .from("sb_chapter_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const dashboard = await getKeithDashboardData();

    return (
      <KeithProfileHero
        displayName={displayName}
        email={user.email ?? ""}
        pendingQuestionCount={pendingQuestionCount ?? 0}
        dashboard={dashboard}
      />
    );
  }

  const data = await getProfileGalleryData(user.id);
  const hasAnyActivity =
    data.readStats.readCount > 0 ||
    data.savedPassageCount > 0 ||
    data.dialogue.askedCount > 0 ||
    data.favorites.totalCount > 0;

  return (
    <>
      <ProfileReflectionHero
        displayName={displayName}
        isAdmin={profile?.role === "admin"}
        reflection={data.reflection}
        hasAnyActivity={hasAnyActivity}
      />
      <ProfileGallery data={data} totalStories={storiesData.length} />
    </>
  );
}
