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

export async function GET() {
  const gate = await gateBeyondAuthor();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const { data, error } = await gate.supabase
    .from("sb_story_drafts")
    .select(
      "id, title, body, life_stage, year_start, year_end, themes, principles, quotes, status, story_id, origin, updated_at, created_at"
    )
    .eq("contributor_id", gate.user!.id)
    .eq("contribution_mode", "beyond")
    .order("updated_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ drafts: data ?? [] });
}

export async function POST(request: Request) {
  const gate = await gateBeyondAuthor();
  if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    life_stage?: string | null;
    year_start?: number | null;
    year_end?: number | null;
    themes?: string[];
    principles?: string[];
    quotes?: string[];
    origin?: "write" | "edit";
    mentions?: { id: string }[];
  };

  const origin = body.origin === "edit" ? "edit" : "write";

  const { data, error } = await gate.supabase
    .from("sb_story_drafts")
    .insert({
      session_id: null,
      contributor_id: gate.user!.id,
      title: (body.title ?? "").trim() || "Untitled",
      body: body.body ?? "",
      life_stage: body.life_stage ?? null,
      year_start: body.year_start ?? null,
      year_end: body.year_end ?? null,
      themes: body.themes ?? [],
      principles: body.principles ?? [],
      quotes: body.quotes ?? [],
      status: "draft",
      contribution_mode: "beyond",
      origin,
    })
    .select(
      "id, title, body, life_stage, year_start, year_end, themes, principles, quotes, status, origin, updated_at"
    )
    .single();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Failed to create draft" },
      { status: 500 }
    );
  }

  await syncDraftMentions(gate.supabase, data.id, body.mentions);

  return Response.json({ draft: data });
}
