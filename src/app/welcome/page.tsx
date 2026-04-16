import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { ageModeFromAge } from "@/lib/utils/age-mode";
import type { AgeMode } from "@/types";
import { OnboardingStepper } from "./OnboardingStepper";

export const metadata: Metadata = {
  title: "Welcome",
  description: "A quick tour of the Keith Cobb Storybook.",
};

type WelcomePageProps = {
  searchParams: Promise<{ replay?: string }>;
};

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const { user, profile } = await getAuthenticatedProfileContext();

  if (!user) redirect("/login");

  const params = await searchParams;
  const replay = params.replay === "1";

  const ageMode: AgeMode =
    profile?.age_mode ??
    (profile?.age ? ageModeFromAge(profile.age) : "adult");

  const displayName =
    (profile?.display_name?.trim() ||
      (typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : null) ||
      user.email?.split("@")[0] ||
      "").trim();

  return (
    <OnboardingStepper
      ageMode={ageMode}
      displayName={displayName}
      replay={replay}
    />
  );
}
