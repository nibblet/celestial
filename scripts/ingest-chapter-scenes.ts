/**
 * ingest-chapter-scenes.ts
 *
 * Walks every story markdown file under `content/wiki/stories/`, parses
 * its `### Scene N: Title` headings with `parseChapterScenes`, and upserts
 * the result into `sb_chapter_scenes` (remapped to `cel_chapter_scenes`
 * by `withCelTablePrefix`).
 *
 * Content-hash aware: scenes whose body is unchanged since the last run
 * are skipped, so re-running this is cheap and safe after every edit.
 *
 * Run:
 *   npm run ingest:scenes
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient } from "@supabase/supabase-js";
import { getAllStories } from "@/lib/wiki/parser";
import { parseChapterScenes } from "@/lib/wiki/scene-parser";
import { withCelTablePrefix } from "@/lib/supabase/table-prefix";

type Counters = { inserted: number; updated: number; unchanged: number };

async function ingestSceneRow(
  supabase: ReturnType<typeof makeClient>,
  chapterId: string,
  scene: ReturnType<typeof parseChapterScenes>[number],
  counters: Counters,
): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("sb_chapter_scenes")
    .select("id, content_hash, order_index, title")
    .eq("chapter_id", chapterId)
    .eq("slug", scene.slug)
    .maybeSingle();

  if (selectError) {
    console.error(
      `[ingest:scenes] select failed for ${chapterId}/${scene.slug}:`,
      selectError.message,
    );
    return;
  }

  if (existing && existing.content_hash === scene.contentHash) {
    // Body unchanged — only nudge order_index/title if they drifted
    // (e.g. renumbering or pure-whitespace title tweak). Still cheap.
    if (
      existing.order_index !== scene.orderIndex ||
      existing.title !== scene.title
    ) {
      const { error } = await supabase
        .from("sb_chapter_scenes")
        .update({
          order_index: scene.orderIndex,
          title: scene.title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) {
        console.error(
          `[ingest:scenes] metadata update failed for ${chapterId}/${scene.slug}:`,
          error.message,
        );
        return;
      }
      counters.updated += 1;
      return;
    }
    counters.unchanged += 1;
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from("sb_chapter_scenes")
      .update({
        order_index: scene.orderIndex,
        title: scene.title,
        word_count: scene.wordCount,
        content_hash: scene.contentHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) {
      console.error(
        `[ingest:scenes] update failed for ${chapterId}/${scene.slug}:`,
        error.message,
      );
      return;
    }
    counters.updated += 1;
    return;
  }

  const { error } = await supabase.from("sb_chapter_scenes").insert({
    chapter_id: chapterId,
    order_index: scene.orderIndex,
    slug: scene.slug,
    title: scene.title,
    word_count: scene.wordCount,
    content_hash: scene.contentHash,
  });
  if (error) {
    console.error(
      `[ingest:scenes] insert failed for ${chapterId}/${scene.slug}:`,
      error.message,
    );
    return;
  }
  counters.inserted += 1;
}

function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "ingest:scenes requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  const raw = createClient(url, key, {
    auth: { persistSession: false },
  });
  // Remap `sb_*` -> `cel_*` so this script can use the same table names
  // as the rest of the TypeScript codebase.
  return withCelTablePrefix(raw);
}

async function main() {
  const supabase = makeClient();
  const stories = getAllStories();
  const chapterStories = stories.filter((s) => /^CH\d/i.test(s.storyId));

  const counters: Counters = { inserted: 0, updated: 0, unchanged: 0 };
  let chaptersWithScenes = 0;
  let chaptersWithoutScenes = 0;

  for (const story of chapterStories) {
    const parsed = parseChapterScenes(story.fullText);
    if (parsed.length === 0) {
      chaptersWithoutScenes += 1;
      console.warn(
        `[ingest:scenes] ${story.storyId} has no parseable scenes (no ## Full Text? no ### Scene headings?)`,
      );
      continue;
    }
    chaptersWithScenes += 1;
    for (const scene of parsed) {
      await ingestSceneRow(supabase, story.storyId, scene, counters);
    }
  }

  console.log(
    `[ingest:scenes] chapters processed: ${chaptersWithScenes} (${chaptersWithoutScenes} skipped)`,
  );
  console.log(
    `[ingest:scenes] inserted=${counters.inserted} updated=${counters.updated} unchanged=${counters.unchanged}`,
  );
}

main().catch((err) => {
  console.error("[ingest:scenes] fatal:", err);
  process.exit(1);
});
