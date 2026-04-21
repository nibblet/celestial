import { createClient } from "@/lib/supabase/server";
import { hasAuthorSpecialAccess } from "@/lib/auth/special-access";
import { syncDraftMentions } from "@/lib/beyond/sync-mentions";

async function gateBeyondAuthor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401, supabase, user: null };

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!hasAuthorSpecialAccess(user.email, profile?.role)) {
    return { error: "Forbidden" as const, status: 403, supabase, user };
  }
  return { error: null, status: 200, supabase, user };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await gateBeyondAuthor();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const { data, error } = await gate.supabase
    .from("sb_story_drafts")
    .select(
      "id, title, body, life_stage, year_start, year_end, themes, principles, quotes, status, story_id, origin, contribution_mode, contributor_id, updated_at, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
  if (data.contributor_id !== gate.user!.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json({ draft: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await gateBeyondAuthor();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const patch = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    life_stage?: string | null;
    year_start?: number | null;
    year_end?: number | null;
    themes?: string[];
    principles?: string[];
    quotes?: string[];
    status?: "draft" | "approved" | "published";
    mentions?: { id: string }[];
  };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title.trim() || "Untitled";
  if (patch.body !== undefined) update.body = patch.body;
  if (patch.life_stage !== undefined) update.life_stage = patch.life_stage;
  if (patch.year_start !== undefined) update.year_start = patch.year_start;
  if (patch.year_end !== undefined) update.year_end = patch.year_end;
  if (patch.themes !== undefined) update.themes = patch.themes;
  if (patch.principles !== undefined) update.principles = patch.principles;
  if (patch.quotes !== undefined) update.quotes = patch.quotes;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await gate.supabase
    .from("sb_story_drafts")
    .update(update)
    .eq("id", id)
    .eq("contributor_id", gate.user!.id)
    .select(
      "id, title, body, life_stage, year_start, year_end, themes, principles, quotes, status, origin, updated_at"
    )
    .single();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Failed to update draft" },
      { status: 500 }
    );
  }

  if (patch.mentions !== undefined) {
    await syncDraftMentions(gate.supabase, data.id, patch.mentions);
  }

  return Response.json({ draft: data });
}
