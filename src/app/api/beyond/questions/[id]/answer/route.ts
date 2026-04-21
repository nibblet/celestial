import { createClient } from "@/lib/supabase/server";
import { hasAuthorSpecialAccess } from "@/lib/auth/special-access";
import type { ChapterAnswerVisibility } from "@/types";

const MAX_ANSWER_LENGTH = 5000;
const VALID_VISIBILITY: ChapterAnswerVisibility[] = ["public", "private"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  if (!questionId) {
    return Response.json({ error: "Invalid question id" }, { status: 400 });
  }

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { answer_text, visibility = "public" } = body as {
    answer_text?: unknown;
    visibility?: unknown;
  };

  if (
    typeof answer_text !== "string" ||
    !answer_text.trim() ||
    answer_text.length > MAX_ANSWER_LENGTH
  ) {
    return Response.json(
      { error: "Answer is required and must be under 5000 characters." },
      { status: 400 }
    );
  }

  if (
    typeof visibility !== "string" ||
    !VALID_VISIBILITY.includes(visibility as ChapterAnswerVisibility)
  ) {
    return Response.json({ error: "Invalid visibility" }, { status: 400 });
  }

  // Verify the question exists and is still pending.
  const { data: question } = await supabase
    .from("sb_chapter_questions")
    .select("id, status")
    .eq("id", questionId)
    .single();

  if (!question) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }

  if (question.status !== "pending") {
    return Response.json(
      { error: "Question has already been handled." },
      { status: 409 }
    );
  }

  const { data: answer, error: answerError } = await supabase
    .from("sb_chapter_answers")
    .insert({
      question_id: questionId,
      answerer_id: user.id,
      answer_text: answer_text.trim(),
      visibility,
    })
    .select("id")
    .single();

  if (answerError || !answer) {
    console.error("Failed to save chapter answer:", answerError);
    return Response.json(
      { error: "Could not save the answer." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("sb_chapter_questions")
    .update({ status: "answered", updated_at: new Date().toISOString() })
    .eq("id", questionId);

  if (updateError) {
    console.error("Failed to mark question answered:", updateError);
    // Answer row exists; the status fix can be retried but we still report success.
  }

  return Response.json({ answer_id: answer.id, status: "answered" });
}
