"use client";

import type { PolishSuggestion } from "@/lib/ai/polish-helpers";
export type { PolishSuggestion };

type FieldKey = keyof Omit<PolishSuggestion, "rationale">;

interface CurrentValues {
  title: string;
  body: string;
  life_stage: string;
  year_start: string;
  year_end: string;
  themes: string;
  principles: string;
  quotes: string;
}

interface Props {
  suggestion: PolishSuggestion;
  current: CurrentValues;
  onAcceptField: (field: FieldKey) => void;
  onAcceptAll: () => void;
  onReject: () => void;
}

function truncate(s: string, n = 260): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatSuggested(key: FieldKey, val: unknown): string {
  if (val === null) return "(clear)";
  if (Array.isArray(val)) return val.join(", ") || "(empty)";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") {
    return key === "body" ? truncate(stripHtml(val)) : val;
  }
  return "";
}

function formatCurrent(key: FieldKey, current: CurrentValues): string {
  switch (key) {
    case "title":
      return current.title || "(empty)";
    case "body":
      return truncate(stripHtml(current.body)) || "(empty)";
    case "life_stage":
      return current.life_stage || "(empty)";
    case "year_start":
      return current.year_start || "(empty)";
    case "year_end":
      return current.year_end || "(empty)";
    case "themes":
      return current.themes || "(empty)";
    case "principles":
      return current.principles || "(empty)";
    case "quotes":
      return current.quotes || "(empty)";
  }
}

const FIELD_LABEL: Record<FieldKey, string> = {
  title: "Title",
  body: "Body",
  life_stage: "Life stage",
  year_start: "Year start",
  year_end: "Year end",
  themes: "Themes",
  principles: "Principles",
  quotes: "Quotes",
};

export function AIPolishPanel({
  suggestion,
  current,
  onAcceptField,
  onAcceptAll,
  onReject,
}: Props) {
  const fields = (Object.keys(suggestion) as (keyof PolishSuggestion)[]).filter(
    (k): k is FieldKey => k !== "rationale"
  );

  return (
    <div className="rounded-lg border border-clay-border bg-warm-white-2 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="type-ui text-sm font-semibold text-ink">
            ✨ AI polish suggestions
          </p>
          {suggestion.rationale && (
            <p className="type-ui mt-1 text-xs italic text-ink-muted">
              {suggestion.rationale}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onAcceptAll}
            disabled={fields.length === 0}
            className="type-ui rounded bg-clay px-3 py-1 text-xs font-medium text-warm-white hover:bg-clay-mid disabled:opacity-50"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={onReject}
            className="type-ui rounded border border-[var(--color-border)] bg-warm-white px-3 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Reject all
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="type-ui text-xs text-ink-ghost">
          All suggestions applied — nice work.
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field) => (
            <li
              key={field}
              className="rounded-md border border-[var(--color-border)] bg-warm-white p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="type-ui text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {FIELD_LABEL[field]}
                </p>
                <button
                  type="button"
                  onClick={() => onAcceptField(field)}
                  className="type-ui rounded bg-clay px-2.5 py-0.5 text-[11px] font-medium text-warm-white hover:bg-clay-mid"
                >
                  Accept
                </button>
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <p className="type-ui mb-0.5 text-[10px] uppercase tracking-wide text-ink-ghost">
                    Current
                  </p>
                  <p className="type-ui text-ink-muted">
                    {formatCurrent(field, current)}
                  </p>
                </div>
                <div>
                  <p className="type-ui mb-0.5 text-[10px] uppercase tracking-wide text-clay">
                    Suggested
                  </p>
                  <p className="type-ui text-ink">
                    {formatSuggested(field, suggestion[field])}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
