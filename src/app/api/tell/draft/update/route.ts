import { createClient } from "@/lib/supabase/server";

interface UpdateDraftRequest {
  draftId?: string;
  title?: string;
  body?: string;
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId, title, body } = (await request.json()) as UpdateDraftRequest;

  if (!draftId || !title?.trim() || !body?.trim()) {
    return Response.json(
      { error: "draftId, title, and body required" },
      { status: 400 }
    );
  }

  const { data: draft } = await supabase
    .from("sb_story_drafts")
    .select("id, contributor_id")
    .eq("id", draftId)
    .single();

  if (!draft || draft.contributor_id !== user.id) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("sb_story_drafts")
    .update({
      title: title.trim(),
      body: body.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (error) {
    return Response.json({ error: "Failed to update draft" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
