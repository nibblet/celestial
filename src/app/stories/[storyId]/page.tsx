import {
  getStoryById,
  getPeopleByStoryId,
  getMissionLogInventory,
} from "@/lib/wiki/parser";
import { addPeopleLinks } from "@/lib/wiki/link-people";
import { getCanonicalStoryById } from "@/lib/wiki/corpus";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadingProgressBar } from "@/components/story/ReadingProgressBar";
import { ReadTracker } from "@/components/story/ReadTracker";
import { FavoriteButton } from "@/components/story/FavoriteButton";
import { ReadBadgeAgeAware } from "@/components/story/ReadBadgeAgeAware";
import { StoryAudioControls } from "@/components/story/StoryAudioControls";
import { StoryMarkdown } from "@/components/story/StoryMarkdown";
import { StoryBodyWithHighlighting } from "@/components/story/StoryBodyWithHighlighting";
import { StoryDetailsDisclosure } from "@/components/story/StoryDetailsDisclosure";
import { StoryTOC, type StoryTOCSection } from "@/components/story/StoryTOC";
import { StorySceneJump } from "@/components/story/StorySceneJump";
import { enrichLegacyStorySource } from "@/lib/wiki/taxonomy";
import { getChapterTags } from "@/lib/wiki/chapter-tags";
import { extractSceneSectionsFromChapterBody } from "@/lib/wiki/markdown-headings";
import { getSceneSectionsForChapter } from "@/lib/wiki/scenes-db";
import { lifeStageToEraAccent } from "@/lib/design/era";
import { createClient } from "@/lib/supabase/server";
import {
  canOpenChapter,
  getLastChapterNumber,
  getReaderProgress,
  nextChapterId,
} from "@/lib/progress/reader-progress";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";
import { isFreeChapter } from "@/lib/auth/public-paths";
import { CODEX_KINDS, getCodexEntriesIntroducedIn } from "@/lib/wiki/codex";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const story = await getCanonicalStoryById(storyId);

  if (!story) notFound();
  const progress = await getReaderProgress();
  const unlocked = canOpenChapter(storyId, progress);

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10">
        <Link
          href="/stories"
          className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
        >
          &larr; All chapters
        </Link>
        <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-6">
          <h1 className="type-story-title">{story.title}</h1>
          <p className="mt-3 text-sm text-ink-muted">
            You haven&apos;t reached this chapter yet. It opens when you finish
            the one before it.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/stories/${nextChapterId(progress)}`}
              className="rounded-lg bg-clay px-4 py-2.5 text-sm font-medium text-warm-white no-underline transition-colors hover:bg-clay-mid"
            >
              Go to my next chapter
            </Link>
            <Link
              href="/welcome?replay=1"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-ink no-underline transition-colors hover:border-clay-border"
            >
              I&apos;m further along — move my bookmark
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const peopleInStory = getPeopleByStoryId(storyId);
  const linkedFullText = addPeopleLinks(story.fullText, peopleInStory);
  const chapterMeta = enrichLegacyStorySource(storyId, story.source);
  const chapterTags = getChapterTags(storyId);
  // Prefer DB-backed scenes (`sb_chapter_scenes` via scenes-db), fall back
  // to live markdown parsing for chapters that haven't been ingested yet.
  // Anchor ids are identical between both sources, so clicks never break.
  const dbSceneSections = await getSceneSectionsForChapter(storyId);
  const sceneSections =
    dbSceneSections.length > 0
      ? dbSceneSections
      : extractSceneSectionsFromChapterBody(story.fullText);

  const era = lifeStageToEraAccent(story.lifeStage);
  const supportsListenMode =
    story.source === "memoir" || story.source === "interview";

  // Check if current user has favorited this story
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialFavorited = false;
  let initialRead = false;
  if (user) {
    const { data } = await supabase
      .from("sb_story_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("story_id", storyId)
      .single();
    initialFavorited = !!data;

    const { data: readRow } = await supabase
      .from("sb_story_reads")
      .select("id")
      .eq("user_id", user.id)
      .eq("story_id", storyId)
      .maybeSingle();
    initialRead = !!readRow;
  }

  const tocSections: StoryTOCSection[] = [{ id: "story-body", label: "Chapter" }];
  if (story.principles.length > 0)
    tocSections.push({ id: "shows", label: "What this chapter shows" });
  if (story.quotes.length > 0)
    tocSections.push({ id: "quotes", label: "Key Quotes" });
  // Never surface a chapter the reader has not reached, even as a link title.
  const relatedIds = story.relatedStoryIds.filter((relId) =>
    canOpenChapter(relId, progress)
  );
  if (relatedIds.length > 0)
    tocSections.push({ id: "related", label: "Related chapters" });
  const relatedStories = await Promise.all(
    relatedIds.map(async (relId) => ({
      relId,
      story: (await getCanonicalStoryById(relId)) || getStoryById(relId),
    }))
  );
  const chapterNumber = chapterNumberFromStoryId(storyId);
  const lastChapter = getLastChapterNumber();
  const prevId =
    chapterNumber !== null && chapterNumber > 1
      ? `CH${String(chapterNumber - 1).padStart(2, "0")}`
      : null;
  const nextId =
    chapterNumber !== null && chapterNumber < lastChapter
      ? `CH${String(chapterNumber + 1).padStart(2, "0")}`
      : null;
  const [prevStory, nextStory] = await Promise.all([
    prevId ? getCanonicalStoryById(prevId) : null,
    nextId ? getCanonicalStoryById(nextId) : null,
  ]);
  const nextNeedsAccount = Boolean(nextId) && !user && !isFreeChapter(nextId!);
  const isLastChapter = chapterNumber !== null && chapterNumber >= lastChapter;

  // "Who you met": codex entries this chapter introduces. Shown after the
  // text, so it never runs ahead of what the reader has just read.
  const introduced =
    chapterNumber !== null ? getCodexEntriesIntroducedIn(chapterNumber) : [];
  const introducedByKind = CODEX_KINDS.map((k) => ({
    ...k,
    entries: introduced.filter((e) => e.kind === k.kind),
  })).filter((k) => k.entries.length > 0);

  const inventory = getMissionLogInventory();
  const missionLogs = inventory
    ? inventory.missionLogs.filter((row) => row.chapterId === storyId)
    : [];

  return (
    <>
      <ReadingProgressBar />
      <div className="mx-auto max-w-6xl px-[var(--page-padding-x)] py-6 md:py-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-10">
          <div className="min-w-0 max-w-story">
            <Link
              href="/stories"
              className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
            >
              &larr; All chapters
            </Link>

            <div className={`mb-3 border-l-4 pl-4 ${era.accentBorder}`}>
              <h1 className="type-story-title text-balance">{story.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {story.sourceDetail && (
                  <p className="type-meta text-ink-ghost">
                    {story.sourceDetail}
                  </p>
                )}
                {user && (
                  <div className="flex flex-wrap items-center gap-2">
                    {initialRead && <ReadBadgeAgeAware />}
                    <FavoriteButton
                      storyId={storyId}
                      storyTitle={story.title}
                      initialFavorited={initialFavorited}
                    />
                  </div>
                )}
              </div>
            </div>

            <p className="mb-5 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-ink-muted">
              {story.summary}
            </p>

            <StorySceneJump sections={sceneSections} />

            {supportsListenMode && (
              <StoryAudioControls
                storyId={storyId}
                title={story.title}
                fullText={story.fullText}
                wordCount={story.wordCount}
              />
            )}

            <StoryDetailsDisclosure
              source={story.source}
              sourceType={chapterMeta.sourceType}
              lifeStage={story.lifeStage}
              themes={story.themes}
              chapterTags={chapterTags}
            />

            <div id="story-body">
              {user ? (
                <StoryBodyWithHighlighting
                  storyId={storyId}
                  storyTitle={story.title}
                  fullText={linkedFullText}
                />
              ) : (
                <article className="story-body prose prose-story prose-lg max-w-none pb-8">
                  <StoryMarkdown content={linkedFullText} />
                </article>
              )}
              <ReadTracker storyId={storyId} />
            </div>

            {story.principles.length > 0 && (
              <div
                id="shows"
                className="mb-4 scroll-mt-20 rounded-xl border border-[var(--color-border)] bg-warm-white p-5"
              >
                <h2 className="type-meta mb-3 text-ink">
                  What this chapter shows
                </h2>
                <ul className="space-y-2">
                  {story.principles.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-2 font-[family-name:var(--font-lora)] text-sm text-ink-muted"
                    >
                      <span className="mt-0.5 text-clay">&#9679;</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {story.quotes.length > 0 && (
              <div id="quotes" className="mb-6 scroll-mt-20">
                <h2 className="type-meta mb-3 text-ink">Key Quotes</h2>
                <div className="space-y-3">
                  {story.quotes.map((q, i) => (
                    <blockquote
                      key={i}
                      className="type-pullquote border-l-[3px] border-clay-mid pl-4 text-base not-italic text-ink-muted"
                    >
                      {q}
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

            {relatedIds.length > 0 && (
              <div id="related" className="mb-6 scroll-mt-20">
                <h2 className="type-meta mb-3 text-ink">Related chapters</h2>
                <div className="space-y-2">
                  {relatedStories.map(({ relId, story: rel }) => {
                    if (!rel) return null;
                    return (
                      <Link
                        key={relId}
                        href={`/stories/${relId}`}
                        className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
                      >
                        <span className="type-ui block text-ink">
                          {rel.title}
                        </span>
                        <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                          {rel.summary}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {introducedByKind.length > 0 && (
              <section
                id="new-in-chapter"
                aria-labelledby="new-in-chapter-heading"
                className="sci-panel mb-6 scroll-mt-20 p-5"
              >
                <h2
                  id="new-in-chapter-heading"
                  className="type-meta mb-1 text-ink"
                >
                  New in this chapter
                </h2>
                <p className="mb-4 text-sm text-ink-muted">
                  {user
                    ? "Now in your codex."
                    : "With a free account, these open in your codex as you read."}
                </p>
                <dl className="space-y-3">
                  {introducedByKind.map((group) => (
                    <div key={group.kind}>
                      <dt className="type-meta mb-1.5 text-ink-ghost">
                        {group.label}
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {group.entries.map((e) =>
                          user ? (
                            <Link
                              key={e.slug}
                              href={e.href}
                              className="sci-chip bg-warm-white px-2.5 py-1 text-sm text-ink no-underline ring-1 ring-[var(--color-border)] transition-colors hover:ring-clay-border"
                            >
                              {e.name}
                            </Link>
                          ) : (
                            <span
                              key={e.slug}
                              className="sci-chip bg-warm-white px-2.5 py-1 text-sm text-ink-muted ring-1 ring-[var(--color-border)]"
                            >
                              {e.name}
                            </span>
                          )
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {missionLogs.length > 0 && (
              <div className="mb-6">
                <h2 className="type-meta mb-3 text-ink">
                  Mission logs from this chapter
                </h2>
                <div className="space-y-2">
                  {missionLogs.map((log) => (
                    <Link
                      key={log.logId}
                      href={`/mission-logs/${encodeURIComponent(log.logId)}`}
                      className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
                    >
                      <span className="type-ui block text-ink">
                        {log.summary || log.logId}
                      </span>
                      <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                        {[log.author, log.logType].filter(Boolean).join(" · ") ||
                          log.logId}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <nav
              aria-label="Chapter navigation"
              className="mt-8 border-t border-[var(--color-divider)] pt-6"
            >
              {nextId && nextStory && !nextNeedsAccount && (
                <Link
                  href={`/stories/${nextId}`}
                  className="sci-panel sci-card-link group mb-3 block p-5 no-underline"
                >
                  <span className="type-meta block text-ink-ghost">
                    Next chapter
                  </span>
                  <span className="type-story-title mt-1 block text-xl transition-colors group-hover:text-burgundy">
                    {nextStory.title} &rarr;
                  </span>
                </Link>
              )}
              {nextNeedsAccount && (
                <div className="sci-panel mb-3 p-5">
                  <span className="type-meta block text-ink-ghost">
                    Keep reading
                  </span>
                  <p className="mt-1 font-[family-name:var(--font-lora)] text-base text-ink">
                    The rest of the book is free with an account, which also
                    keeps your place and unlocks the companion as you read.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/signup"
                      className="rounded-lg bg-clay px-4 py-2.5 text-sm font-medium text-warm-white no-underline transition-colors hover:bg-clay-mid"
                    >
                      Create a free account
                    </Link>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/stories/${nextId}`)}`}
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-ink no-underline transition-colors hover:border-clay-border"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              )}
              {isLastChapter && (
                <div className="sci-panel mb-3 p-5">
                  <span className="type-meta block text-ink-ghost">
                    End of the book
                  </span>
                  <p className="mt-1 font-[family-name:var(--font-lora)] text-base text-ink">
                    You&apos;ve reached the last chapter. The whole companion
                    is open to you now.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                {prevId && prevStory && (
                  <Link
                    href={`/stories/${prevId}`}
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white px-4 py-2.5 text-sm font-medium text-ink no-underline transition-colors hover:border-clay-border"
                  >
                    &larr; {prevStory.title}
                  </Link>
                )}
                {user && (
                  <Link
                    href={`/ask?story=${storyId}`}
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white px-4 py-2.5 text-center text-sm font-medium text-ink no-underline transition-colors hover:border-clay-border"
                  >
                    Ask about this chapter
                  </Link>
                )}
                <Link
                  href="/stories"
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white px-4 py-2.5 text-center text-sm font-medium text-ink no-underline transition-colors hover:border-clay-border"
                >
                  All chapters
                </Link>
              </div>
            </nav>
          </div>

          <StoryTOC sections={tocSections} sceneSections={sceneSections} />
        </div>
      </div>
    </>
  );
}
