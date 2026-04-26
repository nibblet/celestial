import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllCharacterArcs,
  getCharacterArcBySlug,
} from "@/lib/wiki/character-arcs";
import { StoryMarkdown } from "@/components/story/StoryMarkdown";

export function generateStaticParams() {
  return getAllCharacterArcs().map((arc) => ({ slug: arc.slug }));
}

export default async function ArcDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const arc = getCharacterArcBySlug(slug);
  if (!arc) notFound();

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mb-4 flex flex-wrap gap-4">
        <Link
          href="/arcs"
          className="type-ui text-ink-ghost no-underline transition-colors hover:text-ocean"
        >
          &larr; All arcs
        </Link>
        <Link
          href={`/characters/${arc.slug}`}
          className="type-ui text-ink-ghost no-underline transition-colors hover:text-ocean"
        >
          View character &rarr;
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <span className="type-meta rounded-full border border-clay-border bg-warm-white px-2 py-0.5 normal-case tracking-normal text-ink-muted">
          {arc.scope}
        </span>
        <span className="type-meta rounded-full border border-[var(--color-border)] bg-warm-white px-2 py-0.5 normal-case tracking-normal text-ink-ghost">
          {arc.canonRank || "derived_inference"}
        </span>
        <span className="type-meta rounded-full border border-[var(--color-border)] bg-warm-white px-2 py-0.5 normal-case tracking-normal text-ink-ghost">
          {arc.reviewStatus || "draft"}
        </span>
      </div>

      <article className="prose prose-story max-w-none">
        <StoryMarkdown content={arc.markdown} />
      </article>
    </div>
  );
}
