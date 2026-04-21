import { GhostTile } from "./GhostTile";

type Props = {
  firstReadAt: string | null;
  readCount: number;
  mostRecentReadAt: string | null;
  className?: string;
};

function formatMonthYear(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ReaderSinceTile({
  firstReadAt,
  readCount,
  mostRecentReadAt,
  className = "",
}: Props) {
  if (readCount === 0) {
    return (
      <GhostTile
        label="Reading since"
        body="Start reading and this will fill in."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.58)]">Reading since</p>
      <p className="mt-3 font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#f0e8d5]">
        {formatMonthYear(firstReadAt)}
      </p>
      <p className="mt-2 font-[family-name:var(--font-inter)] text-xs text-[rgba(240,232,213,0.62)]">
        {readCount} {readCount === 1 ? "story" : "stories"} · most recent{" "}
        {formatRelative(mostRecentReadAt)}
      </p>
    </section>
  );
}
