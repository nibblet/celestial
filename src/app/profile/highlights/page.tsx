import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteHighlightButton } from "./DeleteHighlightButton";

export const metadata: Metadata = { title: "My Passages" };

type HighlightRow = {
  id: string;
  story_id: string;
  story_title: string;
  passage_text: string;
  note: string | null;
  saved_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProfileHighlightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("sb_story_highlights")
    .select("id, story_id, story_title, passage_text, note, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(500);

  const highlights = (data ?? []) as HighlightRow[];

  // Group by story for a reading-journal feel
  const byStory = new Map<string, { title: string; rows: HighlightRow[] }>();
  for (const h of highlights) {
    if (!byStory.has(h.story_id)) {
      byStory.set(h.story_id, {
        title: h.story_title || h.story_id,
        rows: [],
      });
    }
    byStory.get(h.story_id)!.rows.push(h);
  }

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10 md:py-14">
      <Link
        href="/profile"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; Profile
      </Link>
      <h1 className="type-page-title mb-2">My Passages</h1>
      <p className="mb-8 font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
        Paragraphs you&apos;ve saved from Keith&apos;s stories.
      </p>

      {highlights.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-6 text-center">
          <p className="type-ui mb-2 text-ink">No passages saved yet.</p>
          <p className="font-[family-name:var(--font-lora)] text-sm text-ink-muted">
            Select any text while reading a story &mdash; a &ldquo;Save this
            passage&rdquo; button will appear.
          </p>
          <Link
            href="/stories"
            className="type-ui mt-3 inline-block text-sm text-clay hover:text-clay-mid"
          >
            Browse stories &rarr;
          </Link>
        </div>
      )}

      <div className="space-y-10">
        {[...byStory.entries()].map(([storyId, { title, rows }]) => (
          <section key={storyId}>
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <Link
                href={`/stories/${storyId}`}
                className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-ink hover:text-clay"
              >
                {title}
              </Link>
              <span className="type-meta shrink-0 text-ink-ghost">
                {rows.length} passage{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="space-y-4">
              {rows.map((h) => (
                <li
                  key={h.id}
                  className="rounded-xl border border-clay-border bg-gold-pale/30 p-5"
                >
                  <blockquote className="mb-3 border-l-2 border-clay pl-4 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-ink">
                    &ldquo;{h.passage_text}&rdquo;
                  </blockquote>
                  {h.note && (
                    <p className="mb-2 font-[family-name:var(--font-lora)] text-sm text-ink-muted">
                      {h.note}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="type-meta text-ink-ghost">
                      Saved {formatDate(h.saved_at)}
                    </p>
                    <DeleteHighlightButton highlightId={h.id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
