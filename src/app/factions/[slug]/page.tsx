import { notFound } from "next/navigation";
import { FictionEntityDetailPage } from "@/components/entities/FictionEntityViews";
import { getFactionBySlug } from "@/lib/wiki/parser";

export default async function FactionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const faction = getFactionBySlug(slug);
  if (!faction) notFound();
  return (
    <FictionEntityDetailPage
      entity={faction}
      heading="Factions"
      basePath="/factions"
    />
  );
}
