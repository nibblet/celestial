import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonBySlug, getStoryById } from "@/lib/wiki/parser";
import { StoryMarkdown } from "@/components/story/StoryMarkdown";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { PersonEditDrawer } from "@/components/people/PersonEditDrawer";
import { PersonMediaPanel } from "@/components/people/PersonMediaPanel";
import { TIER_SHORT_LABEL } from "@/lib/wiki/people-tiers";
import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";
import { EntityLoreCard } from "@/components/entities/EntityLoreCard";
import { EntityDossier } from "@/components/entities/EntityDossier";
import { CanonDossierCard } from "@/components/entities/CanonDossierCard";
import { extractAuthoredBody, renderWikilinks } from "@/lib/wiki/authored-body";
import { resolveWikiSlug } from "@/lib/wiki/slug-resolver";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) notFound();

  const supabase = await createClient();
  const { data: dbPerson } = await supabase
    .from("sb_people")
    .select("id, slug, display_name, relationship, bio_md, birth_year, death_year, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  const { isAuthorSpecialAccess } = await getAuthenticatedProfileContext();
  const progress = await getReaderProgress();

  const refCount =
    person.memoirStoryIds.length + person.interviewStoryIds.length;

  const memoirHeading =
    person.wikiSource === "characters" ? "Appearances" : "Memoir stories";
  const interviewHeading =
    person.wikiSource === "characters"
      ? "Additional appearances"
      : "Interview stories";

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href="/characters"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All characters
      </Link>

      <div className="mb-2 flex items-start justify-between gap-4">
        <h1 className="type-page-title">{dbPerson?.display_name || person.name}</h1>
        {isAuthorSpecialAccess && dbPerson && (
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
              title={`Inventory tier ${t}: ${TIER_SHORT_LABEL[t] ?? ""}`}
            >
              {TIER_SHORT_LABEL[t] ?? `Tier ${t}`}
            </span>
          ))}
        </div>
      )}

      {person.canonDossier && <CanonDossierCard dossier={person.canonDossier} />}
      {person.lore && <EntityLoreCard lore={person.lore} />}
      {person.dossier && <EntityDossier dossier={person.dossier} />}
      {(() => {
        const authored = extractAuthoredBody(person.body ?? "");
        if (!authored) return null;
        const rendered = renderWikilinks(authored, resolveWikiSlug);
        return (
          <section className="prose prose-story mb-6 max-w-none" aria-label="Authored detail">
            <StoryMarkdown content={rendered} />
          </section>
        );
      })()}

      <p className="type-ui mb-6 text-ink-muted">
        Appears in {refCount} {refCount === 1 ? "story" : "stories"}
        .
      </p>

      {dbPerson && (
        <div className="mb-6">
          <PersonMediaPanel
            personId={dbPerson.id}
            canEdit={isAuthorSpecialAccess}
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
                  AI-generated from memoir &amp; interview passages
                  {person.aiDraftGeneratedAt ? ` · ${person.aiDraftGeneratedAt}` : ""}{" "}
                  · awaiting author review
                </span>
              </div>
            )}
            <article className="prose prose-story max-w-none">
              <StoryMarkdown content={person.aiDraft} />
            </article>
          </section>
        )
      )}

      {person.memoirStoryIds.length > 0 && (
        <div className="mb-6">
          <h2 className="type-meta mb-3 text-ink">{memoirHeading}</h2>
          <div className="space-y-2">
            {person.memoirStoryIds.filter((id) => isStoryUnlocked(id, progress)).map((id) => {
              const story = getStoryById(id);
              if (!story) {
                return (
                  <div
                    key={id}
                    className="rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2"
                  >
                    <span className="type-ui block font-mono text-sm text-ink">
                      {id}
                    </span>
                    <span className="mt-0.5 block font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                      Wiki reference — no matching story page in{" "}
                      <code className="rounded bg-warm-white px-1">
                        content/wiki/stories/
                      </code>{" "}
                      yet.
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={id}
                  href={`/stories/${id}`}
                  className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
                >
                  <span className="type-ui block text-ink">{story.title}</span>
                  <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                    {story.summary}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {person.interviewStoryIds.length > 0 && (
        <div className="mb-6">
          <h2 className="type-meta mb-3 text-ink">{interviewHeading}</h2>
          <div className="space-y-2">
            {person.interviewStoryIds.filter((id) => isStoryUnlocked(id, progress)).map((id) => {
              const story = getStoryById(id);
              if (!story) {
                return (
                  <div
                    key={id}
                    className="rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2"
                  >
                    <span className="type-ui block font-mono text-sm text-ink">
                      {id}
                    </span>
                    <span className="mt-0.5 block font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                      Wiki reference — no matching story page yet.
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={id}
                  href={`/stories/${id}`}
                  className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
                >
                  <span className="type-ui block text-ink">{story.title}</span>
                  <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                    {story.summary}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
