type Props = {
  label: string;
  body: string;
  className?: string;
};

export function GhostTile({ label, body, className = "" }: Props) {
  return (
    <div
      className={`rounded-[20px] border border-dashed border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.015)] p-5 ${className}`}
      aria-label={body}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.42)]">{label}</p>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-sm italic text-[rgba(240,232,213,0.5)]">
        {body}
      </p>
    </div>
  );
}
