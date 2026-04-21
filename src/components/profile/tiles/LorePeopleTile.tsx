type Props = { className?: string };

export function LorePeopleTile({ className = "" }: Props) {
  return (
    <section
      className={`rounded-[20px] border border-dashed border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.015)] p-5 ${className}`}
      aria-label="Characters you’ve met — coming soon"
    >
      <p className="type-era-label text-[rgba(240,232,213,0.42)]">
        People you&apos;ve met in the story
      </p>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-sm italic text-[rgba(240,232,213,0.5)]">
        Coming once people pages ship.
      </p>
    </section>
  );
}
