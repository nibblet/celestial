import { requireAuthor } from "@/lib/auth/require-author";
import { getCanonicalStories } from "@/lib/wiki/corpus";

/**
 * GET /api/beyond/published-stories — list every published story from the
 * wiki (memoir + interviews + family) so Keith can pick one to revise in
 * Edit mode. Keith-gated because this powers an authoring surface.
 */
export async function GET() {
  const gate = await requireAuthor();
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const stories = (await getCanonicalStories()).map((s) => ({
    storyId: s.storyId,
    title: s.title,
    volume: s.volume,
    source: s.source,
    lifeStage: s.lifeStage,
    summary: s.summary,
    wordCount: s.wordCount,
  }));

  // Sort by storyId (P1_S01 … P4_Sn) for a predictable order in the picker.
  stories.sort((a, b) => a.storyId.localeCompare(b.storyId));

  return Response.json({ stories });
}
