import { createClient } from "@/lib/supabase/server";
import { hasAuthorSpecialAccess } from "@/lib/auth/special-access";

const AGE_MODE_COPY: Record<string, string> = {
  young_reader: "A young reader",
  teen: "A teenage reader",
  adult: "A reader",
};

function buildSeedMessage(params: {
  question: string;
  storyId: string;
  category: string | null;
  ageMode: string | null;
}): string {
  const askerPhrase = params.ageMode
    ? AGE_MODE_COPY[params.ageMode] || "A reader"
    : "A reader";
  const categoryPhrase = params.category ? ` (about a ${params.category})` : "";
  return [
    `${askerPhrase} asked a question about ${params.storyId}${categoryPhrase}:`,
    "",
    `"${params.question}"`,
    "",
    "Walk Keith through answering this. If the answer opens up a new chapter worth keeping, we'll capture it as a new story for the collection. Where would you like to start?",
  ].join("\n");
}

export async function POST(
  _request: Request,
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

  const { data: question } = await supabase
    .from("sb_chapter_questions")
    .select("id, story_id, question, category, age_mode, status")
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

  const { data: session, error: sessionError } = await supabase
    .from("sb_story_sessions")
    .insert({
      contributor_id: user.id,
      status: "gathering",
      volume: "P2",
      contribution_mode: "beyond",
      from_question_id: questionId,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("Failed to seed Beyond session:", sessionError);
    return Response.json(
      { error: "Could not start a new Beyond session." },
      { status: 500 }
    );
  }

  const seedMessage = buildSeedMessage({
    question: question.question,
    storyId: question.story_id,
    category: question.category,
    ageMode: question.age_mode,
  });

  const { error: msgError } = await supabase
    .from("sb_story_messages")
    .insert({
      session_id: session.id,
      role: "assistant",
      content: seedMessage,
    });

  if (msgError) {
    console.error("Failed to seed message:", msgError);
    return Response.json(
      { error: "Session created but seed message failed." },
      { status: 500 }
    );
  }

  // Mark the question as in_progress so it stops appearing in the pending
  // Q&A list while Keith works the chapter. It will move to "answered" when
  // a formal answer is posted (or the resulting chapter is published).
  const { error: questionUpdateError } = await supabase
    .from("sb_chapter_questions")
    .update({
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);

  if (questionUpdateError) {
    // Non-fatal: the session exists, we just couldn't update status.
    console.error(
      "Warning: failed to mark question in_progress:",
      questionUpdateError
    );
  }

  return Response.json({
    sessionId: session.id,
    messages: [{ role: "assistant", content: seedMessage }],
  });
}
