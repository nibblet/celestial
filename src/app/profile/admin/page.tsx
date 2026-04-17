import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CorrectionActions } from "./CorrectionActions";

export const metadata: Metadata = { title: "Admin — Story Corrections" };

type CorrectionRow = {
  id: string;
  user_id: string;
  story_id: string;
  story_title: string;
  passage_text: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at: string | null;
  reporter_name: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Best-guess filesystem path for a story. Volume 1 stories live in
 * content/wiki/stories/<id>.md. Volume 2+ are Supabase-only.
 */
function guessSourcePath(storyId: string): string {
  return `content/wiki/stories/${storyId}.md`;
}

export default async function AdminCorrectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate on admin role
  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/profile");

  // Fetch all corrections newest-first
  const { data: rawData } = await supabase
    .from("sb_story_corrections")
    .select(
      "id, user_id, story_id, story_title, passage_text, status, created_at, resolved_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = rawData ?? [];

  // Attach reporter display names
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("sb_profiles")
      .select("id, display_name")
      .in("id", userIds);
    profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? "Unknown"])
    );
  }

  const corrections: CorrectionRow[] = rows.map((r) => ({
    ...r,
    status: r.status as "open" | "resolved",
    reporter_name: profileMap[r.user_id] ?? "Unknown",
  }));

  const open = corrections.filter((c) => c.status === "open");
  const resolved = corrections.filter((c) => c.status === "resolved");

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10 md:py-14">
      <Link
        href="/profile"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; Profile
      </Link>

      <div className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="type-page-title">Story Corrections</h1>
        <span className="type-meta text-ink-ghost">
          {open.length} open · {resolved.length} resolved
        </span>
      </div>

      {/* ── Open ── */}
      {open.length === 0 ? (
        <div className="mb-10 rounded-xl border border-[var(--color-border)] bg-warm-white p-6 text-center">
          <p className="type-ui text-ink">No open reports.</p>
          <p className="mt-1 font-[family-name:var(--font-lora)] text-sm text-ink-muted">
            All caught up — nice work.
          </p>
        </div>
      ) : (
        <section className="mb-12">
          <h2 className="type-meta mb-4 text-ink">Open</h2>
          <ul className="space-y-4">
            {open.map((c) => (
              <CorrectionCard key={c.id} correction={c} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Resolved ── */}
      {resolved.length > 0 && (
        <section>
          <h2 className="type-meta mb-4 text-ink-ghost">Resolved</h2>
          <ul className="space-y-4 opacity-70">
            {resolved.map((c) => (
              <CorrectionCard key={c.id} correction={c} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CorrectionCard({ correction: c }: { correction: CorrectionRow }) {
  const sourcePath = guessSourcePath(c.story_id);

  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
      {/* Story title + link */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/stories/${c.story_id}`}
          className="font-[family-name:var(--font-playfair)] text-base font-semibold text-ink hover:text-clay"
        >
          {c.story_title || c.story_id}
        </Link>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            c.status === "open"
              ? "bg-gold-pale text-clay"
              : "bg-[var(--color-border)] text-ink-ghost"
          }`}
        >
          {c.status}
        </span>
      </div>

      {/* Flagged passage */}
      <blockquote className="mb-3 border-l-2 border-red-300 pl-4 font-[family-name:var(--font-lora)] text-sm italic leading-relaxed text-ink">
        &ldquo;{c.passage_text}&rdquo;
      </blockquote>

      {/* Source path hint */}
      <div className="mb-3 flex items-center gap-2">
        <span className="type-meta text-ink-ghost">Source file:</span>
        <code className="select-all rounded bg-[var(--color-border)]/40 px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
          {sourcePath}
        </code>
      </div>

      {/* Meta + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-meta text-ink-ghost">
          Reported by {c.reporter_name} &middot; {formatDate(c.created_at)}
          {c.resolved_at && (
            <span> &middot; Resolved {formatDate(c.resolved_at)}</span>
          )}
        </p>
        <CorrectionActions
          correctionId={c.id}
          currentStatus={c.status}
        />
      </div>
    </li>
  );
}
