"use client";

import { createClient } from "@/lib/supabase/client";

type ProfileHeroProps = {
  displayName: string;
  email: string;
};

export function ProfileHero({ displayName, email }: ProfileHeroProps) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <section className="relative flex min-h-[70vh] flex-col justify-center overflow-hidden md:min-h-[78vh]">
      <div className="absolute inset-0 bg-[#2c1810]">
        <div
          className="absolute inset-0 bg-cover bg-[center_35%] bg-no-repeat opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(44,28,16,0.35), rgba(44,28,16,0.35)), url(/images/red-clay-road.jpg)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[rgba(44,28,16,0.92)] via-[rgba(44,28,16,0.5)] to-[rgba(44,28,16,0.2)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(165deg,#5c3d2e_0%,#8b4513_22%,#3d6b35_50%,#d4a843_82%,#f0e8d5_100%)] opacity-[0.82] mix-blend-multiply"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-wide px-[var(--page-padding-x)] pb-16 pt-20 text-center md:pb-20 md:pt-24">
        <p className="type-era-label mb-4 text-[rgba(240,232,213,0.65)]">
          Your corner of the storybook
        </p>
        <h1 className="mb-4 font-[family-name:var(--font-playfair)] text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.08] tracking-tight text-[#f0e8d5]">
          {displayName}
        </h1>
        {email ? (
          <p className="mb-10 font-[family-name:var(--font-inter)] text-sm font-medium tracking-wide text-[rgba(240,232,213,0.78)]">
            {email}
          </p>
        ) : (
          <div className="mb-10" />
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-[rgba(240,232,213,0.55)] bg-[rgba(240,232,213,0.12)] px-8 py-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold tracking-wide text-[#f7f3ed] transition-[background-color,border-color] duration-[var(--duration-normal)] hover:border-[#f0e8d5] hover:bg-[rgba(240,232,213,0.22)]"
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
