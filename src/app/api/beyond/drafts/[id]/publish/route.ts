import { requireKeith } from "@/lib/auth/require-keith";

/**
 * POST /api/beyond/drafts/[id]/publish
 *
 * Keith-scoped publish. Publishes his own Beyond draft — no admin gate
 * required, since Keith is both the author and the approver for his own
 * Volume 2 content. Handles two cases:
 *   1. Revision (draft.story_id is set): supersede any prior published row
 *      sharing that story_id and keep the id stable.
 *   2. New story: mint the next ${volume}_S## id.
 *
 * Only works on drafts owned by the calling user and in contribution_mode
 * "beyond". For other contribution modes (e.g. "tell" submissions), the
 * admin panel at /admin/drafts is still the review path.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params;
  const gate = await requireKeith();
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { data: draft } = await gate.supabase
    .from("sb_story_drafts")
    .select(
      "id, status, session_id, story_id, origin, contribution_mode, contributor_id"
    )
    .eq("id", draftId)
    .single();

  if (!draft) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.contributor_id !== gate.user!.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (draft.contribution_mode !== "beyond") {
    return Response.json(
      {
        error:
          "This draft isn't a Beyond story — publish it from the admin review panel.",
      },
      { status: 400 }
    );
  }

  if (draft.status === "published") {
    return Response.json({ error: "Already published" }, { status: 400 });
  }

  // ── Revision path ──
  if (draft.story_id) {
    const { error: supersedeError } = await gate.supabase
      .from("sb_story_drafts")
      .update({
        status: "superseded",
        updated_at: new Date().toISOString(),
      })
      .eq("story_id", draft.story_id)
      .eq("status", "published")
      .neq("id", draftId);

    if (supersedeError) {
      return Response.json(
        { error: "Failed to supersede prior version" },
        { status: 500 }
      );
    }

    const { error: publishError } = await gate.supabase
      .from("sb_story_drafts")
      .update({
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    if (publishError) {
      return Response.json(
        { error: "Failed to publish revision" },
        { status: 500 }
      );
    }

    if (draft.session_id) {
      await gate.supabase
        .from("sb_story_sessions")
        .update({
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.session_id);
    }

    return Response.json({
      storyId: draft.story_id,
      status: "published",
      revision: true,
    });
  }

  // ── New-story path ──
  let volume = "P2";
  if (draft.session_id) {
    const { data: session } = await gate.supabase
      .from("sb_story_sessions")
      .select("volume, contribution_mode")
      .eq("id", draft.session_id)
      .single();
    volume =
      session?.volume ||
      (session?.contribution_mode === "beyond" ? "P2" : "P4");
  }

  const { data: existing } = await gate.supabase
    .from("sb_story_drafts")
    .select("story_id")
    .like("story_id", `${volume}_%`)
    .not("story_id", "is", null);

  const usedNumbers = (existing || [])
    .map((d) => {
      const match = d.story_id?.match(/_S(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter((n) => n > 0);

  const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
  const storyId = `${volume}_S${String(nextNumber).padStart(2, "0")}`;

  const { error: updateError } = await gate.supabase
    .from("sb_story_drafts")
    .update({
      status: "published",
      story_id: storyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (updateError) {
    return Response.json({ error: "Failed to publish" }, { status: 500 });
  }

  if (draft.session_id) {
    await gate.supabase
      .from("sb_story_sessions")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", draft.session_id);
  }

  return Response.json({ storyId, status: "published", revision: false });
}
