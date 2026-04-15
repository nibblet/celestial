import { createClient } from "@/lib/supabase/server";
import type { AgeMode, ChapterQuestionCategory } from "@/types";

type AnsweredQuestionRow = {
  id: string;
  question: string;
  category: ChapterQuestionCategory | null;
  age_mode: AgeMode | null;
  created_at: string;
  sb_chapter_answers: {
    answer_text: string | null;
    linked_draft_id: string | null;
    visibility: string;
    created_at: string;
  }[];
};

const CATEGORY_LABEL: Record<ChapterQuestionCategory, string> = {
  person: "About a person",
  place: "About a place",
  object: "About something in the story",
  timeline: "About when it happened",
  other: "Other",
};

export async function AnsweredQuestionsList({ storyId }: { storyId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("sb_chapter_questions")
    .select(
      "id, question, category, age_mode, created_at, sb_chapter_answers(answer_text, linked_draft_id, visibility, created_at)"
    )
    .eq("story_id", storyId)
    .eq("status", "answered")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as AnsweredQuestionRow[];
  const answered = rows
    .map((row) => {
      const publicAnswer = row.sb_chapter_answers.find(
        (a) => a.visibility === "public" && a.answer_text
      );
      if (!publicAnswer) return null;
      return {
        id: row.id,
        question: row.question,
        category: row.category,
        answerText: publicAnswer.answer_text as string,
      };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  if (answered.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
      <h2 className="type-meta mb-3 text-ink">Readers asked</h2>
      <ul className="space-y-5">
        {answered.map((q) => (
          <li
            key={q.id}
            className="border-b border-[var(--color-divider)] pb-5 last:border-b-0 last:pb-0"
          >
            {q.category && (
              <p className="type-meta mb-1 text-ink-ghost">
                {CATEGORY_LABEL[q.category]}
              </p>
            )}
            <p className="mb-2 font-[family-name:var(--font-lora)] text-sm italic text-ink-muted">
              &ldquo;{q.question}&rdquo;
            </p>
            <p className="font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink">
              {q.answerText}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
