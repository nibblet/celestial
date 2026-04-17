import { createClient } from "@/lib/supabase/server";

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  const supabase = await createClient();
  const user = await assertAdmin(supabase);
  if (!user) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("sb_story_corrections")
    .select("id, user_id, story_id, story_title, passage_text, status, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return Response.json({ error: "Failed to fetch corrections." }, { status: 500 });
  }

  // Attach reporter emails — join via auth.users is not directly accessible
  // so we look up sb_profiles display_name keyed by user_id
  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  let profileMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("sb_profiles")
      .select("id, display_name")
      .in("id", userIds);

    profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? ""])
    );
  }

  const corrections = (data ?? []).map((row) => ({
    ...row,
    reporter_name: profileMap[row.user_id] ?? "Unknown",
  }));

  return Response.json({ corrections });
}
