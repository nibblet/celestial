"use client";

import { book } from "@/config/book";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CompanionDashboard } from "@/components/profile/CompanionDashboard";
import type { CompanionDashboardData } from "@/lib/analytics/companion-dashboard";

type CompanionProfileHeroProps = {
  displayName: string;
  email: string;
  pendingQuestionCount?: number;
  dashboard: CompanionDashboardData;
};

export function CompanionProfileHero({
  displayName,
  email,
  pendingQuestionCount = 0,
  dashboard,
}: CompanionProfileHeroProps) {
  const badge =
    pendingQuestionCount > 0
      ? `${pendingQuestionCount} reader question${
          pendingQuestionCount === 1 ? "" : "s"
        }`
      : undefined;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[#0d141c] text-[#f2eee4]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(127,231,225,0.2),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(168,242,240,0.16),transparent_24%),radial-gradient(ellipse_at_bottom,rgba(182,90,54,0.2),transparent_50%),linear-gradient(180deg,rgba(7,11,17,0.9),rgba(13,20,28,0.98))]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(242,238,228,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(242,238,228,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-wide px-[var(--page-padding-x)] py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="type-era-label mb-4 text-[rgba(242,238,228,0.68)]">
              {`${book.author} · story workspace`}
            </p>
            <h1 className="mb-4 font-[family-name:var(--font-playfair)] text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-tight text-[#f2eee4]">
              Welcome back, {displayName}.
            </h1>
            <p className="max-w-2xl font-[family-name:var(--font-lora)] text-lg leading-relaxed text-[rgba(242,238,228,0.82)]">
              Beyond is the launch point for shaping untold stories into new
              stories for the collection. Turn memories, scenes, and
              reflections into additions to the family library.
            </p>
            <p className="type-ui mt-4 text-sm !text-[rgba(242,238,228,0.65)]">
              Signed in as {email}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <Link
              href="/beyond"
              className="sci-panel sci-card-link group p-6 transition-[background-color] duration-[var(--duration-normal)] hover:bg-[#1d303a]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="type-ui text-base font-semibold !text-[#f2eee4]">
                  Enter Beyond
                </p>
                {badge && (
                  <span className="type-ui rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-[#0d141c]">
                    {badge}
                  </span>
                )}
              </div>
              <p className="mt-2 font-[family-name:var(--font-lora)] text-sm leading-relaxed text-[rgba(242,238,228,0.75)]">
                Capture expansions aligned with {book.shortName}&apos;s narrative
                voice for the collection.
              </p>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="type-ui inline-flex min-h-[46px] items-center justify-center self-start rounded-full border border-[rgba(242,238,228,0.2)] px-6 py-2.5 text-sm font-semibold !text-[rgba(242,238,228,0.9)] transition-colors duration-[var(--duration-normal)] hover:!text-[#f2eee4]"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <CompanionDashboard {...dashboard} />
    </>
  );
}
