import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { storiesData } from "@/lib/wiki/static-data";
import {
  computeInputSignature,
  generateReflection,
  shouldRegenerateReflection,
  type CachedReflection,
  type ReflectionCorpus,
} from "@/lib/analytics/profile-reflection";

export type GalleryDialogueItem = {
  id: string;
  question: string;
  answerText: string | null;
  askedAt: string;
  answered: boolean;
};

export type ProfileGalleryData = {
  readStats: {
    readCount: number;
    firstReadAt: string | null;
    mostRecentReadAt: string | null;
  };
  topThemes: { name: string; count: number }[];
  topPrinciples: { text: string; count: number }[];
  featuredPassage:
    | { id: string; text: string; storyId: string; storyTitle: string; savedAt: string }
    | null;
  savedPassageCount: number;
  favorites: {
    top: { storyId: string; storyTitle: string; favoritedAt: string }[];
    totalCount: number;
  };
  dialogue: {
    recent: GalleryDialogueItem[];
    askedCount: number;
    answeredCount: number;
  };
  reflection: { text: string; refreshedAt: string } | null;
};

type StoryMeta = { title: string; themes: string[]; principles: string[] };

function buildStaticStoryMap(): Map<string, StoryMeta> {
  return new Map(
    storiesData.map((s) => [
      s.storyId,
      { title: s.title, themes: s.themes, principles: s.principles },
    ])
  );
}

async function appendPublishedStoryMeta(map: Map<string, StoryMeta>): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sb_story_drafts")
      .select("story_id, title, themes, principles")
      .eq("status", "published")
      .not("story_id", "is", null);
    for (const s of data || []) {
      if (!s.story_id) continue;
      map.set(s.story_id, {
        title: s.title,
        themes: s.themes || [],
        principles: s.principles || [],
      });
    }
  } catch {
    // Static stories remain; published metadata is additive.
  }
}

function rankNamed(items: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function rankText(items: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

export async function getProfileGalleryData(
  userId: string
): Promise<ProfileGalleryData> {
  const supabase = await createClient();
  const storyMap = buildStaticStoryMap();
  await appendPublishedStoryMeta(storyMap);

  const [
    readsRes,
    highlightsRes,
    highlightCountRes,
    favoritesRes,
    favoritesCountRes,
    questionsRes,
    askedCountRes,
    answeredCountRes,
    cachedReflectionRes,
  ] = await Promise.all([
    supabase
      .from("sb_story_reads")
      .select("story_id, read_at")
      .eq("user_id", userId)
      .order("read_at", { ascending: false }),
    supabase
      .from("sb_story_highlights")
      .select("id, story_id, story_title, passage_text, saved_at")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false })
      .limit(1),
    supabase
      .from("sb_story_highlights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("sb_story_favorites")
      .select("story_id, story_title, favorited_at")
      .eq("user_id", userId)
      .order("favorited_at", { ascending: false })
      .limit(2),
    supabase
      .from("sb_story_favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("sb_chapter_questions")
      .select(
        "id, question, created_at, status, sb_chapter_answers(answer_text, visibility)"
      )
      .eq("asker_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sb_chapter_questions")
      .select("id", { count: "exact", head: true })
      .eq("asker_id", userId),
    supabase
      .from("sb_chapter_questions")
      .select("id", { count: "exact", head: true })
      .eq("asker_id", userId)
      .eq("status", "answered"),
    supabase
      .from("sb_profile_reflections")
      .select("reflection_text, generated_at, input_signature, model_slug")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const reads = readsRes.data ?? [];
  const themeHits: string[] = [];
  const principleHits: string[] = [];
  for (const r of reads) {
    const s = storyMap.get(r.story_id);
    if (!s) continue;
    themeHits.push(...s.themes);
    principleHits.push(...s.principles);
  }

  const highlight = highlightsRes.data?.[0] ?? null;
  const highlightCount = highlightCountRes.count ?? 0;

  const favTop = (favoritesRes.data ?? []).map((f) => ({
    storyId: f.story_id,
    storyTitle: f.story_title,
    favoritedAt: f.favorited_at,
  }));
  const favTotal = favoritesCountRes.count ?? 0;

  const questionRows = questionsRes.data ?? [];
  const dialogueRecent: GalleryDialogueItem[] = questionRows
    .slice(0, 2)
    .map((q) => {
      const answers = Array.isArray(q.sb_chapter_answers)
        ? q.sb_chapter_answers
        : q.sb_chapter_answers
          ? [q.sb_chapter_answers]
          : [];
      const first = answers[0];
      return {
        id: q.id,
        question: q.question,
        answerText: first?.answer_text ?? null,
        askedAt: q.created_at,
        answered: q.status === "answered" && Boolean(first?.answer_text),
      };
    });
  const askedCount = askedCountRes.count ?? 0;
  const answeredCount = answeredCountRes.count ?? 0;

  const cachedRow = cachedReflectionRes.data;
  const cached: CachedReflection | null = cachedRow
    ? {
        reflectionText: cachedRow.reflection_text,
        generatedAt: new Date(cachedRow.generated_at),
        inputSignature: cachedRow.input_signature,
        modelSlug: cachedRow.model_slug,
      }
    : null;

  const inputs = {
    readCount: reads.length,
    savedCount: highlightCount,
    askedCount: askedCount,
  };
  const decision = shouldRegenerateReflection({ inputs, cached, now: new Date() });

  let reflection: ProfileGalleryData["reflection"] = cached
    ? { text: cached.reflectionText, refreshedAt: cached.generatedAt.toISOString() }
    : null;

  // Short-circuit the "generate" branch when no API key is configured. Without
  // this, every render re-enters the branch (cooldown is keyed on generated_at,
  // which never advances without a successful call) and re-runs the extra
  // highlights query — cheap, but wasted work. Graceful degradation keeps the
  // cached reflection (if any) visible.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (decision === "generate" && apiKey) {
    const { data: allHighlights } = await supabase
      .from("sb_story_highlights")
      .select("story_title, passage_text")
      .eq("user_id", userId)
      .order("saved_at", { ascending: true });
    const corpus: ReflectionCorpus = {
      reads: reads.map((r) => {
        const s = storyMap.get(r.story_id);
        return {
          title: s?.title ?? r.story_id,
          themes: s?.themes ?? [],
          principles: s?.principles ?? [],
        };
      }),
      savedPassages: (allHighlights ?? []).map((h) => ({
        storyTitle: h.story_title,
        text: h.passage_text,
      })),
      askedQuestions: questionRows.map((q) => q.question),
    };

    const anthropic = new Anthropic({ apiKey });
    const generated = await generateReflection(corpus, anthropic);
    if (generated) {
      const admin = createAdminClient();
      const signature = computeInputSignature(inputs);
      const now = new Date();
      await admin.from("sb_profile_reflections").upsert(
        {
          user_id: userId,
          reflection_text: generated.text,
          generated_at: now.toISOString(),
          input_signature: signature,
          model_slug: generated.modelSlug,
        },
        { onConflict: "user_id" }
      );
      reflection = { text: generated.text, refreshedAt: now.toISOString() };
    }
  }

  if (decision === "none") reflection = null;

  return {
    readStats: {
      readCount: reads.length,
      firstReadAt: reads[reads.length - 1]?.read_at ?? null,
      mostRecentReadAt: reads[0]?.read_at ?? null,
    },
    topThemes: rankNamed(themeHits, 5),
    topPrinciples: rankText(principleHits, 3),
    featuredPassage: highlight
      ? {
          id: highlight.id,
          text: highlight.passage_text,
          storyId: highlight.story_id,
          storyTitle: highlight.story_title,
          savedAt: highlight.saved_at,
        }
      : null,
    savedPassageCount: highlightCount,
    favorites: { top: favTop, totalCount: favTotal },
    dialogue: {
      recent: dialogueRecent,
      askedCount,
      answeredCount,
    },
    reflection,
  };
}
