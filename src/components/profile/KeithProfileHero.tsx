"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { KeithDashboard } from "@/components/profile/KeithDashboard";
import type { KeithDashboardData } from "@/lib/analytics/keith-dashboard";

type KeithProfileHeroProps = {
  displayName: string;
  email: string;
  pendingQuestionCount?: number;
  dashboard: KeithDashboardData;
};

export function KeithProfileHero({
  displayName,
  email,
  pendingQuestionCount = 0,
  dashboard,
}: KeithProfileHeroProps) {
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
      <section className="relative overflow-hidden bg-[#1d130d] text-[#f7f3ed]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,168,67,0.24),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(74,127,160,0.22),transparent_28%),linear-gradient(180deg,rgba(15,9,6,0.84),rgba(29,19,13,0.96))]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,243,237,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(247,243,237,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-wide px-[var(--page-padding-x)] py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="type-era-label mb-4 text-[rgba(247,243,237,0.68)]">
              Keith&apos;s story workshop
            </p>
            <h1 className="mb-4 font-[family-name:var(--font-playfair)] text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-tight text-[#f7f3ed]">
              Welcome back, {displayName}.
            </h1>
            <p className="max-w-2xl font-[family-name:var(--font-lora)] text-lg leading-relaxed text-[rgba(247,243,237,0.82)]">
              Beyond is the launch point for shaping untold stories into new
              stories for the collection. Turn memories, scenes, and
              reflections into additions to the family library.
            </p>
            <p className="type-ui mt-4 text-sm !text-[rgba(247,243,237,0.65)]">
              Signed in as {email}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <Link
              href="/beyond"
              className="group rounded-[24px] border border-[rgba(247,243,237,0.18)] bg-[#1e3a4a] p-6 transition-[transform,border-color,background-color] duration-[var(--duration-normal)] hover:-translate-y-1 hover:border-[rgba(247,243,237,0.36)] hover:bg-[#26475a]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="type-ui text-base font-semibold !text-[#f7f3ed]">
                  Enter Beyond
                </p>
                {badge && (
                  <span className="type-ui rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-[#2c1c10]">
                    {badge}
                  </span>
                )}
              </div>
              <p className="mt-2 font-[family-name:var(--font-lora)] text-sm leading-relaxed text-[rgba(247,243,237,0.75)]">
                Capture untold stories in Keith&apos;s storytelling voice for
                the collection.
              </p>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="type-ui inline-flex min-h-[46px] items-center justify-center self-start rounded-full border border-[rgba(247,243,237,0.2)] px-6 py-2.5 text-sm font-semibold !text-[rgba(247,243,237,0.9)] transition-colors duration-[var(--duration-normal)] hover:!text-[#f7f3ed]"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <KeithDashboard {...dashboard} />
    </>
  );
}
