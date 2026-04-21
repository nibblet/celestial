import { notFound } from "next/navigation";
import { FictionEntityDetailPage } from "@/components/entities/FictionEntityViews";
import { getArtifactBySlug } from "@/lib/wiki/parser";

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = getArtifactBySlug(slug);
  if (!artifact) notFound();
  return (
    <FictionEntityDetailPage
      entity={artifact}
      heading="Artifacts"
      basePath="/artifacts"
    />
  );
}
