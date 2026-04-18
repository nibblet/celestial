import Link from "next/link";
import { GhostTile } from "./GhostTile";

type Props = {
  themes: { name: string; count: number }[];
  className?: string;
};

export function ThemesTile({ themes, className = "" }: Props) {
  if (themes.length === 0) {
    return (
      <GhostTile
        label="Themes you return to"
        body="Themes will start to emerge after you read a few stories."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.58)]">
        Themes you return to
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {themes.map((t) => (
          <Link
            key={t.name}
            href={`/themes/${t.name.toLowerCase().replace(/\s+/g, "-")}`}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(122,179,201,0.28)] bg-[rgba(74,127,160,0.16)] px-3 py-1.5 font-[family-name:var(--font-inter)] text-sm font-medium text-[#e8f4f8] transition-colors hover:bg-[rgba(74,127,160,0.26)]"
          >
            <span>{t.name}</span>
            <span className="rounded-full bg-[rgba(240,232,213,0.12)] px-2 py-0.5 text-xs text-[#f0e8d5]">
              {t.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
