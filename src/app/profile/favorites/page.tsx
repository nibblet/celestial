import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Favorites" };

export default async function ProfileFavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("sb_story_favorites")
    .select("id, story_id, story_title, favorited_at")
    .eq("user_id", user.id)
    .order("favorited_at", { ascending: false })
    .limit(200);

  const favorites = data ?? [];

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10 md:py-14">
      <Link
        href="/profile"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; Profile
      </Link>
      <h1 className="type-page-title mb-2">My Favorites</h1>
      <p className="mb-8 font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
        Stories you&apos;ve saved for easy return.
      </p>

      {favorites.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-6 text-center">
          <p className="type-ui mb-2 text-ink">No favorites yet.</p>
          <p className="font-[family-name:var(--font-lora)] text-sm text-ink-muted">
            Tap the heart on any story to save it here.
          </p>
          <Link
            href="/stories"
            className="type-ui mt-3 inline-block text-sm text-clay hover:text-clay-mid"
          >
            Browse chapters &rarr;
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {favorites.map((fav) => (
          <li key={fav.id}>
            <Link
              href={`/stories/${fav.story_id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-warm-white p-4 transition-[border-color,background-color] hover:border-clay-border hover:bg-gold-pale/30"
            >
              <div>
                <p className="font-[family-name:var(--font-lora)] text-base text-ink">
                  {fav.story_title || fav.story_id}
                </p>
                <p className="type-meta mt-0.5 text-ink-ghost">
                  {fav.story_id}
                </p>
              </div>
              <span className="text-xl text-clay" aria-hidden>
                &#9829;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
