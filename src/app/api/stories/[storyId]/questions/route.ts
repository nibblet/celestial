import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import type {
  AgeMode,
  ChapterQuestionCategory,
} from "@/types";

const VALID_CATEGORIES: ChapterQuestionCategory[] = [
  "person",
  "place",
  "object",
  "timeline",
  "other",
];

const VALID_AGE_MODES: AgeMode[] = ["young_reader", "teen", "adult"];

const MAX_QUESTION_LENGTH = 1000;
const MAX_EXCERPT_LENGTH = 2000;
const MAX_STORY_ID_LENGTH = 64;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;

  if (!storyId || storyId.length > MAX_STORY_ID_LENGTH) {
    return Response.json({ error: "Invalid story id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${user.id}:question`, 10, 60 * 60_000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "You've asked a lot of questions — try again in a bit." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    question,
    category,
    context_excerpt,
    age_mode,
  } = body as {
    question?: unknown;
    category?: unknown;
    context_excerpt?: unknown;
    age_mode?: unknown;
  };

  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > MAX_QUESTION_LENGTH
  ) {
    return Response.json(
      { error: "Question is required and must be under 1000 characters." },
      { status: 400 }
    );
  }

  let normalizedCategory: ChapterQuestionCategory | null = null;
  if (category !== undefined && category !== null && category !== "") {
    if (
      typeof category !== "string" ||
      !VALID_CATEGORIES.includes(category as ChapterQuestionCategory)
    ) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }
    normalizedCategory = category as ChapterQuestionCategory;
  }

  let normalizedExcerpt: string | null = null;
  if (
    context_excerpt !== undefined &&
    context_excerpt !== null &&
    context_excerpt !== ""
  ) {
    if (
      typeof context_excerpt !== "string" ||
      context_excerpt.length > MAX_EXCERPT_LENGTH
    ) {
      return Response.json({ error: "Invalid excerpt" }, { status: 400 });
    }
    normalizedExcerpt = context_excerpt;
  }

  let normalizedAgeMode: AgeMode | null = null;
  if (age_mode !== undefined && age_mode !== null && age_mode !== "") {
    if (
      typeof age_mode !== "string" ||
      !VALID_AGE_MODES.includes(age_mode as AgeMode)
    ) {
      return Response.json({ error: "Invalid age mode" }, { status: 400 });
    }
    normalizedAgeMode = age_mode as AgeMode;
  }

  const { data: inserted, error } = await supabase
    .from("sb_chapter_questions")
    .insert({
      asker_id: user.id,
      story_id: storyId,
      question: question.trim(),
      category: normalizedCategory,
      context_excerpt: normalizedExcerpt,
      age_mode: normalizedAgeMode,
    })
    .select("id, created_at")
    .single();

  if (error || !inserted) {
    console.error("Failed to submit chapter question:", error);
    return Response.json(
      {
        error:
          "Could not save your question. Have you run migration 006_chapter_questions.sql?",
      },
      { status: 500 }
    );
  }

  return Response.json({ id: inserted.id, created_at: inserted.created_at });
}

type PublicQuestionRow = {
  id: string;
  story_id: string;
  question: string;
  category: ChapterQuestionCategory | null;
  age_mode: AgeMode | null;
  created_at: string;
  sb_chapter_answers: {
    id: string;
    answer_text: string | null;
    linked_draft_id: string | null;
    visibility: string;
    created_at: string;
  }[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;

  if (!storyId || storyId.length > MAX_STORY_ID_LENGTH) {
    return Response.json({ error: "Invalid story id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // RLS requires auth; short-circuit with empty list so public pages render.
    return Response.json({ questions: [] });
  }

  const { data, error } = await supabase
    .from("sb_chapter_questions")
    .select(
      "id, story_id, question, category, age_mode, created_at, sb_chapter_answers(id, answer_text, linked_draft_id, visibility, created_at)"
    )
    .eq("story_id", storyId)
    .eq("status", "answered")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to list chapter questions:", error);
    return Response.json({ questions: [] });
  }

  const rows = (data ?? []) as PublicQuestionRow[];
  const questions = rows
    .map((row) => {
      const publicAnswer = row.sb_chapter_answers.find(
        (a) => a.visibility === "public"
      );
      if (!publicAnswer) return null;
      return {
        id: row.id,
        question: row.question,
        category: row.category,
        age_mode: row.age_mode,
        asked_at: row.created_at,
        answer: {
          text: publicAnswer.answer_text,
          linked_draft_id: publicAnswer.linked_draft_id,
          answered_at: publicAnswer.created_at,
        },
      };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  return Response.json({ questions });
}
