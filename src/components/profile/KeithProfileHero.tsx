"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type KeithProfileHeroProps = {
  displayName: string;
  email: string;
};

const quickLinks = [
  {
    href: "/beyond",
    label: "Enter Beyond",
    description:
      "Capture untold stories in Keith's voice and continue the archive.",
  },
  {
    href: "/stories",
    label: "Read the Library",
    description:
      "Move between the memoir and newly added stories as one living collection.",
  },
  {
    href: "/timeline",
    label: "Walk the Timeline",
    description:
      "Use the chronology to surface memories, eras, and moments worth expanding.",
  },
];

export function KeithProfileHero({
  displayName,
  email,
}: KeithProfileHeroProps) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
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
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <p className="type-era-label mb-4 text-[rgba(247,243,237,0.68)]">
              Keith&apos;s story workshop
            </p>
            <h1 className="mb-4 font-[family-name:var(--font-playfair)] text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-tight text-[#f7f3ed]">
              Welcome back, {displayName}.
            </h1>
            <p className="max-w-2xl font-[family-name:var(--font-lora)] text-lg leading-relaxed text-[rgba(247,243,237,0.82)]">
              This is the launch point for the next volume. Use Beyond to turn
              memories, scenes, and reflections into new Keith Cobb stories that
              can join the family library.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/beyond"
                className="type-ui inline-flex min-h-[46px] items-center justify-center rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#2c1c10] transition-transform duration-[var(--duration-normal)] hover:-translate-y-0.5"
              >
                Open Beyond
              </Link>
              <Link
                href="/stories"
                className="type-ui inline-flex min-h-[46px] items-center justify-center rounded-full border border-[rgba(247,243,237,0.32)] bg-[rgba(247,243,237,0.08)] px-6 py-2.5 text-sm font-semibold text-[#f7f3ed] transition-colors duration-[var(--duration-normal)] hover:bg-[rgba(247,243,237,0.16)]"
              >
                Browse stories
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="type-ui inline-flex min-h-[46px] items-center justify-center rounded-full border border-[rgba(247,243,237,0.2)] px-6 py-2.5 text-sm font-semibold text-[rgba(247,243,237,0.8)] transition-colors duration-[var(--duration-normal)] hover:text-[#f7f3ed]"
              >
                Sign out
              </button>
            </div>
            <p className="type-ui mt-4 text-sm text-[rgba(247,243,237,0.58)]">
              Signed in as {email}
            </p>
          </div>

          <div className="rounded-[28px] border border-[rgba(247,243,237,0.16)] bg-[rgba(247,243,237,0.06)] p-6 backdrop-blur-sm">
            <p className="type-era-label mb-3 text-[rgba(247,243,237,0.6)]">
              Next chapter
            </p>
            <p className="font-[family-name:var(--font-lora)] text-base leading-relaxed text-[rgba(247,243,237,0.86)]">
              Beyond is where untold stories become Volume 2. The rest of the
              family keeps using Tell for shorter memories and perspectives.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-[24px] border border-[rgba(247,243,237,0.14)] bg-[rgba(247,243,237,0.04)] p-5 transition-[transform,border-color,background-color] duration-[var(--duration-normal)] hover:-translate-y-1 hover:border-[rgba(247,243,237,0.3)] hover:bg-[rgba(247,243,237,0.08)]"
            >
              <p className="type-ui text-sm font-semibold text-[#f7f3ed]">
                {link.label}
              </p>
              <p className="mt-2 font-[family-name:var(--font-lora)] text-sm leading-relaxed text-[rgba(247,243,237,0.7)]">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
