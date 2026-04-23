type Props = {
  label: string;
  body: string;
  className?: string;
};

export function GhostTile({ label, body, className = "" }: Props) {
  return (
    <div
      className={`sci-panel p-5 ${className}`}
      aria-label={body}
    >
      <p className="type-era-label text-[rgba(242,238,228,0.42)]">{label}</p>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-sm italic text-[rgba(242,238,228,0.5)]">
        {body}
      </p>
    </div>
  );
}
