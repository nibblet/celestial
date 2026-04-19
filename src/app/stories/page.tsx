import type { StoryCard } from "@/lib/wiki/static-data";
import { getCanonicalStories } from "@/lib/wiki/corpus";
import { createClient } from "@/lib/supabase/server";
import { StoriesPageClient } from "./StoriesPageClient";

export default async function StoriesPage() {
  const stories = await getCanonicalStories();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let readStoryIds: string[] = [];
  if (user) {
    const { data: reads } = await supabase
      .from("sb_story_reads")
      .select("story_id")
      .eq("user_id", user.id);
    readStoryIds = (reads ?? []).map((r) => r.story_id);
  }

  const storyCards: StoryCard[] = stories.map((story) => ({
    storyId: story.storyId,
    slug: story.slug,
    title: story.title,
    summary: story.summary,
    source: story.source,
    sourceDetail: story.sourceDetail,
    lifeStage: story.lifeStage,
    themes: story.themes,
    wordCount: story.wordCount,
    principles: story.principles,
    volume: story.volume,
  }));

  return (
    <StoriesPageClient stories={storyCards} readStoryIds={readStoryIds} />
  );
}
