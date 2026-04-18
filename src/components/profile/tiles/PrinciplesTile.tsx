import { GhostTile } from "./GhostTile";

type Props = {
  principles: { text: string; count: number }[];
  className?: string;
};

export function PrinciplesTile({ principles, className = "" }: Props) {
  if (principles.length === 0) {
    return (
      <GhostTile
        label="Principles showing up"
        body="Ideas you encounter will collect here as you read."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.58)]">
        Principles showing up
      </p>
      <ul className="mt-4 space-y-3">
        {principles.map((p) => (
          <li
            key={p.text}
            className="font-[family-name:var(--font-lora)] text-sm italic leading-relaxed text-[rgba(240,232,213,0.92)]"
          >
            &ldquo;{p.text}&rdquo;
          </li>
        ))}
      </ul>
    </section>
  );
}
