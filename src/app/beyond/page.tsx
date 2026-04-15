import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoryContributionWorkspace } from "@/components/tell/StoryContributionWorkspace";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";

export const metadata: Metadata = {
  title: "Beyond",
  description: "Keith's dedicated space for shaping untold stories into Volume 2.",
};

export default async function BeyondPage() {
  const { user, isKeithSpecialAccess } = await getAuthenticatedProfileContext();

  if (!user) redirect("/login");
  if (!isKeithSpecialAccess) redirect("/tell");

  return <StoryContributionWorkspace contributionMode="beyond" />;
}
