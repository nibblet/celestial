import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { book } from "@/config/book";
import { getProfileGalleryData } from "@/lib/analytics/profile-gallery-data";
import { ProfileReflectionHero } from "@/components/profile/ProfileReflectionHero";
import { ProfileGallery } from "@/components/profile/ProfileGallery";
import { storiesData } from "@/lib/wiki/static-data";
import { CompanionProfileHero } from "@/components/profile/CompanionProfileHero";
import { getCompanionDashboardData } from "@/lib/analytics/companion-dashboard";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { createClient } from "@/lib/supabase/server";
import { getReaderProgress } from "@/lib/progress/reader-progress";
import { ShowAllContentToggle } from "@/components/profile/ShowAllContentToggle";
import { ReaderChapterProgressActions } from "@/components/profile/ReaderChapterProgressActions";

export const metadata: Metadata = {
  title: "Profile",
  description: `Your reader profile — ${book.title}.`,
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
  const { user, profile, isAuthorSpecialAccess } =
    await getAuthenticatedProfileContext();

  if (!user) redirect("/login");

  const displayName = resolveDisplayName(
    profile?.display_name,
    user.user_metadata?.display_name,
    user.email
  );

  if (isAuthorSpecialAccess) {
    const supabase = await createClient();
    const { count: pendingQuestionCount } = await supabase
      .from("sb_chapter_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const dashboard = await getCompanionDashboardData();

    return (
      <CompanionProfileHero
        displayName={displayName}
        email={user.email ?? ""}
        pendingQuestionCount={pendingQuestionCount ?? 0}
        dashboard={dashboard}
      />
    );
  }

  const data = await getProfileGalleryData(user.id);
  const progress = await getReaderProgress();
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
      <div className="mx-auto mt-6 flex max-w-content flex-col gap-4 px-[var(--page-padding-x)]">
        <ShowAllContentToggle initialValue={progress.showAllContent} />
        <ReaderChapterProgressActions />
      </div>
      <ProfileGallery data={data} totalStories={storiesData.length} />
    </>
  );
}
