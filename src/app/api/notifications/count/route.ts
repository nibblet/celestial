import { createClient } from "@/lib/supabase/server";
import { hasAuthorSpecialAccess } from "@/lib/auth/special-access";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({
      unreadAnswers: 0,
      pendingQuestions: 0,
      isAuthor: false,
    });
  }

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAuthor = hasAuthorSpecialAccess(user.email, profile?.role);

  const { count: unreadAnswersCount } = await supabase
    .from("sb_chapter_questions")
    .select("id", { count: "exact", head: true })
    .eq("asker_id", user.id)
    .eq("status", "answered")
    .eq("asker_seen", false);

  let pendingQuestionsCount = 0;
  if (isAuthor) {
    const { count } = await supabase
      .from("sb_chapter_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingQuestionsCount = count ?? 0;
  }

  return Response.json({
    unreadAnswers: unreadAnswersCount ?? 0,
    pendingQuestions: pendingQuestionsCount,
    isAuthor,
  });
}
