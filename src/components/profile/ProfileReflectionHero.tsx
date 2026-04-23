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
      <div className="absolute inset-0 bg-[#0d141c]">
        <div
          className="absolute inset-0 bg-cover bg-[center_35%] bg-no-repeat opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(13,20,28,0.62), rgba(13,20,28,0.62)), url(/images/red-clay-road.jpg)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[rgba(7,11,17,0.94)] via-[rgba(13,28,36,0.66)] to-[rgba(13,20,28,0.32)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(127,231,225,0.2),transparent_22%),linear-gradient(165deg,rgba(10,17,24,0.95)_0%,rgba(19,52,61,0.7)_42%,rgba(182,90,54,0.42)_82%,rgba(239,232,218,0.16)_100%)] opacity-[0.9] mix-blend-screen"
          aria-hidden
        />
      </div>

      <ProfileUtilityIcons isAdmin={isAdmin} />

      <div className="relative z-10 mx-auto max-w-wide px-[var(--page-padding-x)] pb-16 pt-20 text-center md:pb-20 md:pt-24">
        <p className="type-era-label mb-4 text-[rgba(242,238,228,0.65)]">
          Your corner of the storybook
        </p>
        <h1 className="mb-8 font-[family-name:var(--font-playfair)] text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.08] tracking-tight text-[#f2eee4]">
          {displayName}
        </h1>

        {reflection ? (
          <>
            <p
              className="mx-auto max-w-[640px] font-[family-name:var(--font-lora)] text-[clamp(1.125rem,1.75vw,1.5rem)] font-normal italic leading-[1.55] text-[rgba(242,238,228,0.92)]"
            >
              {reflection.text}
            </p>
            <p className="mt-6 font-[family-name:var(--font-inter)] text-[11px] font-medium tracking-[0.18em] text-[rgba(242,238,228,0.42)] uppercase">
              Reflection refreshed {formatRelative(reflection.refreshedAt)}
            </p>
          </>
        ) : hasAnyActivity ? (
          <p className="mx-auto max-w-[640px] font-[family-name:var(--font-lora)] text-lg italic leading-[1.55] text-[rgba(242,238,228,0.75)]">
            Your portrait is quietly forming — a reflection will appear as your reading deepens.
          </p>
        ) : (
          <>
            <p className="mx-auto max-w-[560px] font-[family-name:var(--font-lora)] text-lg italic leading-[1.55] text-[rgba(242,238,228,0.85)]">
              Your portrait is just beginning.{" "}
              <Link href="/stories" className="text-[#f2eee4] underline-offset-4 hover:underline">
                Start with a story.
              </Link>
            </p>
            <p className="mt-6 font-[family-name:var(--font-inter)] text-[11px] font-medium tracking-[0.18em] text-[rgba(242,238,228,0.42)] uppercase">
              Your reading trail starts here
            </p>
          </>
        )}
      </div>
    </section>
  );
}
