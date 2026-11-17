"use client";

import { useState } from "react";

interface PersonRow {
  id: string;
  slug: string;
  display_name: string;
  relationship: string | null;
  bio_md: string | null;
  birth_year: number | null;
  death_year: number | null;
}

export function PersonEditDrawer({
  person,
  aiDraftFallback,
}: {
  person: PersonRow;
  /** Pre-fill the bio with AI-generated content when no DB edit exists yet. */
  aiDraftFallback?: string;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(person.display_name);
  const [relationship, setRelationship] = useState(person.relationship ?? "");
  const [bio, setBio] = useState(person.bio_md ?? aiDraftFallback ?? "");
  const [birthYear, setBirthYear] = useState(
    person.birth_year ? String(person.birth_year) : ""
  );
  const [deathYear, setDeathYear] = useState(
    person.death_year ? String(person.death_year) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${person.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          relationship: relationship.trim() || null,
          bio_md: bio,
          birth_year: birthYear ? Number(birthYear) : null,
          death_year: deathYear ? Number(deathYear) : null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setOpen(false);
      // Refresh the server component data with a hard reload — cheaper than
      // wiring router.refresh here and guarantees the updated bio renders.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="type-ui shrink-0 rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-clay-border hover:text-clay"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-ink/30">
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-warm-white shadow-xl">
        <div className="flex items-center border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="type-display text-lg font-semibold text-ink">
            Edit person
          </h2>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-4 py-4">
          <label className="type-ui flex flex-col gap-1 text-xs text-ink-muted">
            Name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="type-ui flex flex-col gap-1 text-xs text-ink-muted">
            Relationship
            <input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. father, mentor, friend"
              className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <div className="flex gap-2">
            <label className="type-ui flex flex-1 flex-col gap-1 text-xs text-ink-muted">
              Birth year
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <label className="type-ui flex flex-1 flex-col gap-1 text-xs text-ink-muted">
              Death year
              <input
                type="number"
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1.5 text-sm text-ink"
              />
            </label>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="type-ui text-xs text-ink-muted">Bio</span>
              {!person.bio_md && aiDraftFallback && (
                <span className="type-ui text-[10px] text-clay">
                  AI draft · edit freely
                </span>
              )}
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[320px] flex-1 rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-2 font-serif text-sm leading-relaxed text-ink"
            />
          </div>
          {error && (
            <p className="type-ui text-sm text-[#f6c7bd]">{error}</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-[var(--color-border)] bg-warm-white px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="type-ui flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="type-ui flex-1 rounded-lg bg-clay px-4 py-2 text-sm font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
