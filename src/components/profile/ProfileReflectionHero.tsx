import Link from "next/link";
import { ProfileUtilityIcons } from "./ProfileUtilityIcons";

type Props = {
  displayName: string;
  isAdmin: boolean;
  reflection: { text: string; refreshedAt: string } | null;
  hasAnyActivity: boolean;
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileReflectionHero({
  displayName,
  isAdmin,
  reflection,
  hasAnyActivity,
}: Props) {
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

      <ProfileUtilityIcons isAdmin={isAdmin} />

      <div className="relative z-10 mx-auto max-w-wide px-[var(--page-padding-x)] pb-16 pt-20 text-center md:pb-20 md:pt-24">
        <p className="type-era-label mb-4 text-[rgba(240,232,213,0.65)]">
          Your corner of the storybook
        </p>
        <h1 className="mb-8 font-[family-name:var(--font-playfair)] text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.08] tracking-tight text-[#f0e8d5]">
          {displayName}
        </h1>

        {reflection ? (
          <>
            <p
              className="mx-auto max-w-[640px] font-[family-name:var(--font-lora)] text-[clamp(1.125rem,1.75vw,1.5rem)] font-normal italic leading-[1.55] text-[rgba(240,232,213,0.92)]"
            >
              {reflection.text}
            </p>
            <p className="mt-6 font-[family-name:var(--font-inter)] text-[11px] font-medium tracking-[0.18em] text-[rgba(240,232,213,0.42)] uppercase">
              Reflection refreshed {formatRelative(reflection.refreshedAt)}
            </p>
          </>
        ) : hasAnyActivity ? (
          <p className="mx-auto max-w-[640px] font-[family-name:var(--font-lora)] text-lg italic leading-[1.55] text-[rgba(240,232,213,0.75)]">
            Your portrait is quietly forming — a reflection will appear as your reading deepens.
          </p>
        ) : (
          <>
            <p className="mx-auto max-w-[560px] font-[family-name:var(--font-lora)] text-lg italic leading-[1.55] text-[rgba(240,232,213,0.85)]">
              Your portrait is just beginning.{" "}
              <Link href="/stories" className="text-[#f0e8d5] underline-offset-4 hover:underline">
                Start with a story.
              </Link>
            </p>
            <p className="mt-6 font-[family-name:var(--font-inter)] text-[11px] font-medium tracking-[0.18em] text-[rgba(240,232,213,0.42)] uppercase">
              Your reading trail starts here
            </p>
          </>
        )}
      </div>
    </section>
  );
}
