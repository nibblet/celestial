import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { KeithProfileHero } from "@/components/profile/KeithProfileHero";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";

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
    return (
      <KeithProfileHero displayName={displayName} email={user.email ?? ""} />
    );
  }

  return <ProfileHero displayName={displayName} email={user.email ?? ""} />;
}
