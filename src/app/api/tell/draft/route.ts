import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildTellSystemPrompt } from "@/lib/ai/tell-prompts";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasAuthorSpecialAccess } from "@/lib/auth/special-access";
import { getContributorPersonaName } from "@/lib/tell/contribution";
import { getCanonicalWikiSummaries } from "@/lib/wiki/corpus";
import type { ContributionMode } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${user.id}:draft`, 5, 60_000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Please wait before generating another draft." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      }
    );
  }

  const { sessionId, contributionMode = "tell" } = (await request.json()) as {
    sessionId: string;
    contributionMode?: ContributionMode;
  };

  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  if (contributionMode !== "tell" && contributionMode !== "beyond") {
    return Response.json(
      { error: "Invalid contribution mode" },
      { status: 400 }
    );
  }

  // Get contributor name and role — role is consulted for Keith Special Access.
  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const isAuthorSpecialAccess = hasAuthorSpecialAccess(
    user.email,
    profile?.role
  );
  if (contributionMode === "beyond" && !isAuthorSpecialAccess) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify session belongs to this user
  const { data: session } = await supabase
    .from("sb_story_sessions")
    .select("id, contributor_id, contribution_mode, from_question_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.contributor_id !== user.id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if ((session.contribution_mode ?? "tell") !== contributionMode) {
    return Response.json(
      { error: "Session belongs to a different workspace" },
      { status: 400 }
    );
  }

  const displayName = profile?.display_name || "Family Member";
  const contributorName = getContributorPersonaName(
    contributionMode,
    displayName
  );

  // Load full conversation history
  const { data: history } = await supabase
    .from("sb_story_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!history || history.length === 0) {
    return Response.json(
      { error: "No conversation to draft from" },
      { status: 400 }
    );
  }

  const messages: { role: "user" | "assistant"; content: string }[] =
    history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Add a final user message requesting the draft
  messages.push({
    role: "user",
    content: "Please compose this into a story for the library now.",
  });

  const wikiSummaries = await getCanonicalWikiSummaries();
  const systemPrompt = buildTellSystemPrompt(
    contributorName,
    "drafting",
    contributionMode,
    wikiSummaries
  );

  // Non-streaming — we need the full JSON response
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse the JSON response
  let draft;
  try {
    draft = JSON.parse(rawText);
  } catch {
    // Try to extract JSON from markdown fences
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      draft = JSON.parse(fenced[1]);
    } else {
      console.error(
        "[tell/draft] Failed to parse Claude response:",
        rawText.slice(0, 200)
      );
      return Response.json(
        { error: "Failed to compose story draft — please try again." },
        { status: 500 }
      );
    }
  }

  // Update session status
  await supabase
    .from("sb_story_sessions")
    .update({ status: "drafting", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  // Save draft to database
  const { data: savedDraft, error: draftError } = await supabase
    .from("sb_story_drafts")
    .insert({
      session_id: sessionId,
      contributor_id: user.id,
      title: draft.title || "Untitled Story",
      body: draft.body || "",
      life_stage: draft.life_stage || null,
      year_start: draft.year_start || null,
      year_end: draft.year_end || null,
      themes: draft.themes || [],
      principles: draft.principles || [],
      quotes: draft.quotes || [],
      status: "draft",
      contribution_mode: contributionMode,
    })
    .select("id")
    .single();

  if (draftError || !savedDraft) {
    return Response.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }

  // If this Beyond session was seeded from a reader question, publish the
  // draft as a public answer to that question and mark it answered.
  const fromQuestionId = (session as { from_question_id?: string | null })
    ?.from_question_id;
  if (fromQuestionId) {
    const { error: answerError } = await supabase
      .from("sb_chapter_answers")
      .insert({
        question_id: fromQuestionId,
        answerer_id: user.id,
        linked_draft_id: savedDraft.id,
        visibility: "public",
      });
    if (answerError) {
      console.error(
        "[tell/draft] Failed to link answer to question:",
        answerError
      );
    } else {
      await supabase
        .from("sb_chapter_questions")
        .update({ status: "answered", updated_at: new Date().toISOString() })
        .eq("id", fromQuestionId);
    }
  }

  return Response.json({
    draftId: savedDraft.id,
    title: draft.title,
    body: draft.body,
    lifeStage: draft.life_stage,
    yearStart: draft.year_start,
    yearEnd: draft.year_end,
    themes: draft.themes,
    principles: draft.principles,
    quotes: draft.quotes,
  });
}
