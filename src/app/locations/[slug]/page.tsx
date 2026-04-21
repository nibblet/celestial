import { notFound } from "next/navigation";
import { FictionEntityDetailPage } from "@/components/entities/FictionEntityViews";
import { getLocationBySlug } from "@/lib/wiki/parser";

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const location = getLocationBySlug(slug);
  if (!location) notFound();
  return (
    <FictionEntityDetailPage
      entity={location}
      heading="Locations"
      basePath="/locations"
    />
  );
}
