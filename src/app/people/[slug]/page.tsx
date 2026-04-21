import { permanentRedirect } from "next/navigation";

/** @deprecated Use `/characters/[slug]` — kept for bookmarks and external links. */
export default async function PeopleSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/characters/${slug}`);
}
