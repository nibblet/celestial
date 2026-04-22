import { notFound } from "next/navigation";
import { FictionEntityDetailPage } from "@/components/entities/FictionEntityViews";
import { getVaultBySlug } from "@/lib/wiki/parser";

export default async function VaultDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entity = getVaultBySlug(slug);
  if (!entity) notFound();
  return (
    <FictionEntityDetailPage
      entity={entity}
      heading="Vaults"
      basePath="/vaults"
    />
  );
}
