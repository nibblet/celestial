/**
 * Parked route: retained for a possible future reader-reflection workflow.
 * It intentionally remains unlinked from the main navigation.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoryContributionWorkspace } from "@/components/tell/StoryContributionWorkspace";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";

export const metadata: Metadata = {
  title: "Tell a Story",
  description: "Parked route for possible future reader reflections.",
};

export default async function TellPage() {
  const { user, isAuthorSpecialAccess } = await getAuthenticatedProfileContext();

  if (!user) redirect("/login");
  if (isAuthorSpecialAccess) redirect("/beyond");

  return <StoryContributionWorkspace contributionMode="tell" />;
}
