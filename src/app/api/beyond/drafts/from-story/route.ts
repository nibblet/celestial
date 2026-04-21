import { requireAuthor } from "@/lib/auth/require-author";
import { getCanonicalStoryById } from "@/lib/wiki/corpus";

/**
 * POST /api/beyond/drafts/from-story
 *
 * Body: { storyId: "P1_S06" }
 *
 * Creates a revision draft seeded from a published story. If a non-published
 * revision already exists for this storyId by this user, returns it so Keith
 * lands back in the same draft instead of spawning duplicates.
 */
export async function POST(request: Request) {
  const gate = await requireAuthor();
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const { storyId } = (await request.json().catch(() => ({}))) as {
    storyId?: string;
  };
  if (!storyId) {
    return Response.json({ error: "storyId required" }, { status: 400 });
  }

  const source = await getCanonicalStoryById(storyId);
  if (!source) {
    return Response.json(
      { error: `No published story with id ${storyId}` },
      { status: 404 }
    );
  }

  // Resume an in-flight revision if one already exists.
  const { data: existing } = await gate.supabase
    .from("sb_story_drafts")
    .select(
      "id, title, body, life_stage, year_start, year_end, themes, principles, quotes, status, origin, story_id, updated_at"
    )
    .eq("contributor_id", gate.user!.id)
    .eq("story_id", storyId)
    .eq("origin", "edit")
    .in("status", ["draft", "approved"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return Response.json({ draft: existing, resumed: true });
  }

  const { data, error } = await gate.supabase
    .from("sb_story_drafts")
    .insert({
      session_id: null,
      contributor_id: gate.user!.id,
      title: source.title,
      body: source.fullText,
      life_stage: source.lifeStage || null,
      year_start: null,
      year_end: null,
      themes: source.themes ?? [],
      principles: source.principles ?? [],
      quotes: source.quotes ?? [],
      status: "draft",
      contribution_mode: "beyond",
      origin: "edit",
      story_id: storyId,
    })
    .select(
      "id, title, body, life_stage, year_start, year_end, themes, principles, quotes, status, origin, story_id, updated_at"
    )
    .single();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Failed to create revision" },
      { status: 500 }
    );
  }
  return Response.json({ draft: data, resumed: false });
}
