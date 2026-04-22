import { redirect } from "next/navigation";

export default async function PrincipleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  redirect("/principles");
}
