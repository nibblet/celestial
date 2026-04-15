import { createClient } from "@/lib/supabase/server";
import type { ContributionMode } from "@/types";

type SessionRow = {
  id: string;
  updated_at: string;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const contributionMode = (url.searchParams.get("mode") ?? "tell") as ContributionMode;

  if (contributionMode !== "tell" && contributionMode !== "beyond") {
    return Response.json({ error: "Invalid contribution mode" }, { status: 400 });
  }

  let query = supabase
    .from("sb_story_sessions")
    .select("id, updated_at")
    .eq("contributor_id", user.id)
    .eq("status", "gathering")
    .order("updated_at", { ascending: false });

  if (contributionMode === "beyond") {
    query = query.eq("contribution_mode", "beyond");
  } else {
    query = query.or("contribution_mode.eq.tell,contribution_mode.is.null");
  }

  const { data: sessions, error: sessionsError } = await query.limit(3);

  if (sessionsError) {
    return Response.json({ error: "Failed to load sessions" }, { status: 500 });
  }

  const enriched = await Promise.all(
    ((sessions || []) as SessionRow[]).map(async (session) => {
      const { data: firstMessage } = await supabase
        .from("sb_story_messages")
        .select("content")
        .eq("session_id", session.id)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        id: session.id,
        updatedAt: session.updated_at,
        preview: firstMessage?.content?.slice(0, 80) || "Untitled story",
      };
    })
  );

  return Response.json({ sessions: enriched });
}
