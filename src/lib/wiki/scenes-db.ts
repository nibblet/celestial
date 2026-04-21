/**
 * Read helpers for `sb_chapter_scenes` (proxied to `cel_chapter_scenes`).
 *
 * Two shapes are exposed:
 *
 *   getScenesForChapter(chapterId)         -> rich row (used by AI context
 *                                             blocks and future admin UIs)
 *   getSceneSectionsForChapter(chapterId)  -> `{ id, label }` shape that
 *                                             `StorySceneJump` / `StoryTOC`
 *                                             already accept (used by the
 *                                             reader page in D4)
 *
 * Both use the anon server client, so public reads just work under the RLS
 * policy from migration 027 (`select using (true)`).
 */

import { createClient } from "@/lib/supabase/server";

export type SceneRow = {
  orderIndex: number;
  slug: string;
  title: string;
  goal: string | null;
  conflict: string | null;
  outcome: string | null;
  pov: string | null;
  locationSlug: string | null;
};

export type SceneSection = { id: string; label: string };

type DbSceneRow = {
  order_index: number;
  slug: string;
  title: string;
  goal: string | null;
  conflict: string | null;
  outcome: string | null;
  pov: string | null;
  location_slug: string | null;
};

/** Returns every scene row for the given chapter, ordered by order_index. */
export async function getScenesForChapter(
  chapterId: string,
): Promise<SceneRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sb_chapter_scenes")
    .select(
      "order_index, slug, title, goal, conflict, outcome, pov, location_slug",
    )
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true });

  if (error || !data) return [];

  return (data as DbSceneRow[]).map((r) => ({
    orderIndex: r.order_index,
    slug: r.slug,
    title: r.title,
    goal: r.goal,
    conflict: r.conflict,
    outcome: r.outcome,
    pov: r.pov,
    locationSlug: r.location_slug,
  }));
}

/**
 * Returns scene sections in the shape `StorySceneJump` / `StoryTOC` already
 * expect. `id` is the anchor slug (matches the `<h3 id>` emitted by
 * StoryMarkdown); `label` is the clean scene title.
 */
export async function getSceneSectionsForChapter(
  chapterId: string,
): Promise<SceneSection[]> {
  const rows = await getScenesForChapter(chapterId);
  return rows.map((r) => ({ id: r.slug, label: r.title }));
}
