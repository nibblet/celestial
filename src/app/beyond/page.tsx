import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BeyondShell } from "@/components/beyond/BeyondShell";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";

export const metadata: Metadata = {
  title: "Beyond",
  description:
    "Keith's dedicated space for shaping untold stories into new stories for the collection.",
};

export default async function BeyondPage() {
  const { user, isKeithSpecialAccess } = await getAuthenticatedProfileContext();

  if (!user) redirect("/login");
  if (!isKeithSpecialAccess) redirect("/tell");

  return <BeyondShell />;
}
