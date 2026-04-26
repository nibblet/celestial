import Link from "next/link";
import { getAllCharacterArcs } from "@/lib/wiki/character-arcs";

function excerpt(markdown: string): string {
  return markdown
    .replace(/^[-*]\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !line.startsWith(">"))
    ?.slice(0, 180) ?? "";
}

export default function ArcsPage() {
  const arcs = getAllCharacterArcs();

  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">Character Arcs</h1>
        <p className="type-ui mb-6 max-w-2xl text-ink-muted">
          Canon-grounded ledgers that track how major characters change across
          chapters, where the text leaves open questions, and how ASK should
          answer safely.
        </p>

        <p className="type-meta mb-8 text-ink-ghost">
          {arcs.length} {arcs.length === 1 ? "ledger" : "ledgers"}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {arcs.map((arc) => (
            <Link
              key={arc.slug}
              href={`/arcs/${arc.slug}`}
              className="sci-panel sci-card-link group flex flex-col gap-4 p-5"
            >
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="type-meta rounded-full border border-clay-border bg-warm-white px-2 py-0.5 normal-case tracking-normal text-ink-muted">
                    {arc.scope}
                  </span>
                  <span className="type-meta rounded-full border border-[var(--color-border)] bg-warm-white px-2 py-0.5 normal-case tracking-normal text-ink-ghost">
                    {arc.reviewStatus || "draft"}
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-burgundy">
                  {arc.character}
                </h2>
              </div>
              <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                {excerpt(arc.startingState)}
              </p>
              <span className="type-ui mt-auto text-sm font-medium text-burgundy">
                Read arc ledger &rarr;
              </span>
            </Link>
          ))}
        </div>

        {arcs.length === 0 && (
          <div className="sci-panel p-5 md:p-6">
            <p className="font-[family-name:var(--font-lora)] text-base text-ink">
              No character arc ledgers have been authored yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
