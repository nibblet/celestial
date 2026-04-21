import { createClient } from "@/lib/supabase/server";
import { hasAuthorSpecialAccess } from "@/lib/auth/special-access";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!hasAuthorSpecialAccess(user.email, profile?.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("sb_chapter_questions")
    .select("id, story_id, question, category, age_mode, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to list pending questions:", error);
    return Response.json({ questions: [] });
  }

  return Response.json({ questions: data ?? [] });
}
