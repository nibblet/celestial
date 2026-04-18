import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonBySlug, getStoryById } from "@/lib/wiki/parser";
import { StoryMarkdown } from "@/components/story/StoryMarkdown";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { PersonEditDrawer } from "@/components/people/PersonEditDrawer";
import { PersonMediaPanel } from "@/components/people/PersonMediaPanel";

const TIER_LABEL: Record<string, string> = {
  A: "Dedicated story",
  B: "Recurring in memoir",
  C: "Curated",
  D: "Across memoir & interviews",
};

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) notFound();

  // DB-backed person row: preferred source for bio_md and the edit target.
  const supabase = await createClient();
  const { data: dbPerson } = await supabase
    .from("sb_people")
    .select("id, slug, display_name, relationship, bio_md, birth_year, death_year, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  const { isKeithSpecialAccess } = await getAuthenticatedProfileContext();

  const memoirStories = person.memoirStoryIds
    .map((id) => ({ id, story: getStoryById(id) }))
    .filter((x) => x.story);
  const interviewStories = person.interviewStoryIds
    .map((id) => ({ id, story: getStoryById(id) }))
    .filter((x) => x.story);

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href="/people"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All People
      </Link>

      <div className="mb-2 flex items-start justify-between gap-4">
        <h1 className="type-page-title">{dbPerson?.display_name || person.name}</h1>
        {isKeithSpecialAccess && dbPerson && (
          <PersonEditDrawer
            person={dbPerson}
            aiDraftFallback={person.aiDraft || undefined}
          />
        )}
      </div>

      {person.tiers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {person.tiers.map((t) => (
            <span
              key={t}
              className="type-meta rounded-full border border-clay-border bg-warm-white px-2 py-0.5 normal-case tracking-normal text-ink-muted"
              title={TIER_LABEL[t]}
            >
              Tier {t}
            </span>
          ))}
        </div>
      )}

      <p className="type-ui mb-6 text-ink-muted">
        Appears in {memoirStories.length + interviewStories.length}{" "}
        {memoirStories.length + interviewStories.length === 1
          ? "story"
          : "stories"}
        .
      </p>

      {dbPerson && (
        <div className="mb-6">
          <PersonMediaPanel
            personId={dbPerson.id}
            canEdit={isKeithSpecialAccess}
          />
        </div>
      )}

      {dbPerson?.bio_md ? (
        <section className="mb-8">
          <article className="prose prose-story max-w-none">
            <StoryMarkdown content={dbPerson.bio_md} />
          </article>
        </section>
      ) : (
        person.aiDraft && (
          <section className="mb-8">
            {person.aiDraftStatus === "draft" && (
              <div className="mb-2 flex items-center gap-2 rounded-md border border-clay-border bg-[rgba(200,130,70,0.08)] px-3 py-2">
                <span className="type-meta normal-case tracking-normal text-clay">
                  Draft
                </span>
                <span className="type-meta normal-case tracking-normal text-ink-ghost">
                  AI-generated from memoir &amp; interview passages{person.aiDraftGeneratedAt ? ` · ${person.aiDraftGeneratedAt}` : ""} · awaiting Keith&apos;s review
                </span>
              </div>
            )}
            <article className="prose prose-story max-w-none">
              <StoryMarkdown content={person.aiDraft} />
            </article>
          </section>
        )
      )}

      {memoirStories.length > 0 && (
        <div className="mb-6">
          <h2 className="type-meta mb-3 text-ink">Memoir stories</h2>
          <div className="space-y-2">
            {memoirStories.map(({ id, story }) => (
              <Link
                key={id}
                href={`/stories/${id}`}
                className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
              >
                <span className="type-ui block text-ink">{story!.title}</span>
                <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                  {story!.summary}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {interviewStories.length > 0 && (
        <div className="mb-6">
          <h2 className="type-meta mb-3 text-ink">Interview stories</h2>
          <div className="space-y-2">
            {interviewStories.map(({ id, story }) => (
              <Link
                key={id}
                href={`/stories/${id}`}
                className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
              >
                <span className="type-ui block text-ink">{story!.title}</span>
                <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                  {story!.summary}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
