import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UnpinButton } from "./UnpinButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your threads" };

type Thread = { id: string; title: string | null; pinned_at: string };

export default async function ThreadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let threads: Thread[] = [];
  let failed = false;
  if (user) {
    const { data, error } = await supabase
      .from("cel_conversations")
      .select("id, title, pinned_at")
      .eq("user_id", user.id)
      .not("pinned_at", "is", null)
      .order("pinned_at", { ascending: false });
    if (error) {
      console.error("[threads] list failed", error);
      failed = true;
    } else {
      threads = (data ?? []) as Thread[];
    }
  }

  return (
    <div className="mx-auto w-full max-w-content px-[var(--page-padding-x)] py-8">
      <h1 className="type-page-title text-3xl">Your threads</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Questions you pinned from a conversation with the archive. Open one to
        pick it up where you left it.
      </p>

      {failed ? (
        <p className="notice-error mt-6 rounded-lg p-3 text-sm" role="alert">
          Your threads could not be loaded just now.
        </p>
      ) : threads.length === 0 ? (
        <div className="sci-panel mt-6 p-5">
          <p className="font-[family-name:var(--font-lora)] text-base text-ink-muted">
            Nothing pinned yet. Ask the archive something, then choose “Pin as
            a thread” under the answer.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-clay px-4 text-sm font-medium text-warm-white no-underline hover:bg-clay-mid"
          >
            Ask the archive
          </Link>
        </div>
      ) : (
        <ul className="mt-6 list-none space-y-3">
          {threads.map((thread) => (
            <li
              key={thread.id}
              className="flex items-stretch gap-2 rounded-xl border border-[var(--color-border)] bg-warm-white"
            >
              <Link
                href={`/ask?c=${thread.id}`}
                className="min-w-0 flex-1 px-4 py-3 no-underline"
              >
                <span className="block font-[family-name:var(--font-lora)] text-[1.0625rem] text-burgundy">
                  {thread.title?.trim() || "Untitled thread"}
                </span>
                <span className="mt-1 block text-xs text-ink-ghost">
                  Pinned{" "}
                  {new Date(thread.pinned_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </Link>
              <UnpinButton conversationId={thread.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
