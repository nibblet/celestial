import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  // Fetch all drafts with contributor info
  const { data: drafts, error } = await supabase
    .from("sb_story_drafts")
    .select(
      "id, session_id, title, body, life_stage, year_start, year_end, themes, principles, quotes, status, story_id, created_at, contributor_id, contribution_mode"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: "Failed to fetch drafts" },
      { status: 500 }
    );
  }

  // Get contributor names
  const contributorIds = [
    ...new Set((drafts || []).map((d) => d.contributor_id)),
  ];
  const { data: profiles } =
    contributorIds.length > 0
      ? await supabase
          .from("sb_profiles")
          .select("id, display_name")
          .in("id", contributorIds)
      : { data: [] as { id: string; display_name: string }[] };

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p.display_name])
  );

  const sessionIds = [...new Set((drafts || []).map((draft) => draft.session_id))];
  const { data: sessions } =
    sessionIds.length > 0
      ? await supabase
          .from("sb_story_sessions")
          .select("id, volume, contribution_mode")
          .in("id", sessionIds)
      : { data: [] as { id: string; volume: string; contribution_mode: string }[] };

  const sessionMap = new Map(
    (sessions || []).map((session) => [
      session.id,
      {
        volume: session.volume,
        contribution_mode: session.contribution_mode,
      },
    ])
  );

  const enriched = (drafts || []).map((d) => ({
    ...d,
    volume: sessionMap.get(d.session_id)?.volume || "P4",
    contribution_mode:
      d.contribution_mode ||
      sessionMap.get(d.session_id)?.contribution_mode ||
      "tell",
    contributor: {
      display_name: profileMap.get(d.contributor_id) || "Unknown",
    },
  }));

  return Response.json({ drafts: enriched });
}
