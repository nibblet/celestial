import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const { draftId } = (await request.json()) as { draftId: string };
  if (!draftId) {
    return Response.json({ error: "draftId required" }, { status: 400 });
  }

  // Get the draft
  const { data: draft } = await supabase
    .from("sb_story_drafts")
    .select("id, status, session_id, story_id, origin")
    .eq("id", draftId)
    .single();

  if (!draft) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.status === "published") {
    return Response.json(
      { error: "Already published" },
      { status: 400 }
    );
  }

  // ── Revision path ──
  // If the draft already has a story_id (created via from-story or referencing
  // an existing published story), publish it in place: supersede any prior
  // published row with that story_id and keep the id stable.
  if (draft.story_id) {
    const { error: supersedeError } = await supabase
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

    const { error: publishError } = await supabase
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
      await supabase
        .from("sb_story_sessions")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", draft.session_id);
    }

    return Response.json({
      storyId: draft.story_id,
      status: "published",
      revision: true,
    });
  }

  // ── New-story path ──
  // Get the session to determine volume
  const { data: session } = await supabase
    .from("sb_story_sessions")
    .select("volume, contribution_mode")
    .eq("id", draft.session_id)
    .single();

  const volume =
    session?.volume || (session?.contribution_mode === "beyond" ? "P2" : "P4");

  // Find next available story ID for this volume
  const { data: existing } = await supabase
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

  // Update draft as published with assigned story ID
  const { error: updateError } = await supabase
    .from("sb_story_drafts")
    .update({
      status: "published",
      story_id: storyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (updateError) {
    return Response.json(
      { error: "Failed to publish" },
      { status: 500 }
    );
  }

  // Update session status
  await supabase
    .from("sb_story_sessions")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", draft.session_id);

  return Response.json({ storyId, status: "published" });
}
