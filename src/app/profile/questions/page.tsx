import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  AgeMode,
  ChapterAnswerVisibility,
  ChapterQuestionCategory,
  ChapterQuestionStatus,
} from "@/types";

export const metadata: Metadata = {
  title: "My questions",
  description:
    "Questions you've asked about Keith's stories and the answers you've received.",
};

type QuestionRow = {
  id: string;
  story_id: string;
  question: string;
  category: ChapterQuestionCategory | null;
  age_mode: AgeMode | null;
  status: ChapterQuestionStatus;
  asker_seen: boolean;
  created_at: string;
  sb_chapter_answers: {
    answer_text: string | null;
    linked_draft_id: string | null;
    visibility: ChapterAnswerVisibility;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProfileQuestionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("sb_chapter_questions")
    .select(
      "id, story_id, question, category, age_mode, status, asker_seen, created_at, sb_chapter_answers(answer_text, linked_draft_id, visibility, created_at)"
    )
    .eq("asker_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as QuestionRow[];

  // Flip asker_seen for any answered questions not yet marked. This is
  // how the nav unread-dot clears.
  const unseenAnswered = rows
    .filter((r) => r.status === "answered" && !r.asker_seen)
    .map((r) => r.id);
  if (unseenAnswered.length > 0) {
    await supabase
      .from("sb_chapter_questions")
      .update({ asker_seen: true, updated_at: new Date().toISOString() })
      .in("id", unseenAnswered);
  }

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10 md:py-14">
      <Link
        href="/profile"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; Profile
      </Link>

      <h1 className="type-page-title mb-2">My questions</h1>
      <p className="mb-8 font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
        Questions you&apos;ve asked about Keith&apos;s stories, and the
        answers that come back from the library.
      </p>

      {rows.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-6 text-center">
          <p className="type-ui mb-2 text-ink">
            You haven&apos;t asked any questions yet.
          </p>
          <p className="font-[family-name:var(--font-lora)] text-sm text-ink-muted">
            At the bottom of any chapter you can ask a question about
            Keith&apos;s stories — it will show up here when an answer is ready.
          </p>
        </div>
      )}

      <ul className="space-y-6">
        {rows.map((row) => {
          const publicAnswer = row.sb_chapter_answers.find(
            (a) => a.visibility === "public" && a.answer_text
          );
          const privateAnswer = row.sb_chapter_answers.find(
            (a) => a.visibility === "private" && a.answer_text
          );
          const chapterAnswer = row.sb_chapter_answers.find(
            (a) => a.linked_draft_id
          );
          const primaryAnswer = publicAnswer || privateAnswer;

          return (
            <li
              key={row.id}
              className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5"
            >
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={`/stories/${row.story_id}`}
                  className="type-ui text-sm font-semibold text-clay hover:text-clay-mid"
                >
                  {row.story_id}
                </Link>
                {row.category && (
                  <span className="type-meta text-ink-ghost">
                    {CATEGORY_LABEL[row.category]}
                  </span>
                )}
                <span className="type-meta ml-auto text-ink-ghost">
                  Asked {formatDate(row.created_at)}
                </span>
              </div>

              <p className="mb-4 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-ink">
                &ldquo;{row.question}&rdquo;
              </p>

              {row.status === "pending" && (
                <p className="type-ui text-sm text-ink-ghost">
                  Waiting for a story-based answer…
                </p>
              )}

              {primaryAnswer && (
                <div className="rounded-lg border border-clay-border bg-gold-pale/40 p-4">
                  <p className="type-meta mb-2 text-clay">
                    Answer ready
                    {privateAnswer && !publicAnswer
                      ? " (just for you)"
                      : ""}
                  </p>
                  <p className="font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink">
                    {primaryAnswer.answer_text}
                  </p>
                </div>
              )}

              {chapterAnswer && !primaryAnswer && (
                <div className="rounded-lg border border-clay-border bg-gold-pale/40 p-4">
                  <p className="type-meta mb-2 text-clay">
                    Keith turned this into a story
                  </p>
                  <p className="font-[family-name:var(--font-lora)] text-sm text-ink-muted">
                    Your question inspired a new chapter. It&apos;ll appear in
                    the library once it&apos;s published.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
