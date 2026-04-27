"use client";

import { useState } from "react";

export type EntityVisual = {
  assetId: string;
  kind: "image" | "video";
  url: string;
  approved: boolean;
  isReference: boolean;
  stylePreset: string;
  width?: number | null;
  height?: number | null;
};

type Props = {
  visuals: EntityVisual[];
  entityName: string;
  /** When true, render delete controls. Server pages pass
   *  `isAuthorSpecialAccess` (keith/admin) so misattached assets can be
   *  cleaned up without a separate admin tool. */
  canEdit?: boolean;
};

/**
 * Hero + thumbnail strip for an entity's approved/reference visuals.
 *
 * Renders the first asset as a large hero (reference uploads sort first;
 * see listEntityVisuals). When 2+ assets exist, a thumbnail strip below
 * lets readers swap which asset is featured. Videos play inline muted.
 *
 * Server pages (characters, artifacts, locations, factions, vaults) fetch
 * via listEntityVisuals and pass the result as `visuals`.
 */
export function EntityVisualsGallery({ visuals, entityName, canEdit = false }: Props) {
  const [items, setItems] = useState(visuals);
  const [activeIdx, setActiveIdx] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (items.length === 0) return null;
  const active = items[Math.min(activeIdx, items.length - 1)];

  async function handleDelete(assetId: string) {
    if (!confirm("Delete this image? This removes the file and the database row.")) return;
    setDeletingId(assetId);
    try {
      const res = await fetch(`/api/visuals/asset/${assetId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      const remaining = items.filter((v) => v.assetId !== assetId);
      setItems(remaining);
      setActiveIdx(0);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mb-8" aria-label={`Visuals for ${entityName}`}>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-warm-white">
        {active.kind === "image" ? (
          <img
            src={active.url}
            alt={`${entityName} — ${labelFor(active)}`}
            className="block w-full"
            loading="eager"
          />
        ) : (
          <video
            src={active.url}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="block w-full"
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-ink-muted">
          <span>{labelFor(active)}</span>
          <div className="flex items-center gap-2">
            {active.isReference && (
              <span className="rounded-full border border-clay-border bg-warm-white-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-clay">
                identity reference
              </span>
            )}
            {canEdit && (
              <button
                onClick={() => handleDelete(active.assetId)}
                disabled={deletingId === active.assetId}
                className="rounded-md border border-[var(--color-border)] bg-warm-white-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted hover:border-burgundy hover:text-burgundy disabled:opacity-50"
                title="Delete this asset"
              >
                {deletingId === active.assetId ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((v, i) => (
            <li key={v.assetId}>
              <button
                onClick={() => setActiveIdx(i)}
                aria-pressed={i === activeIdx}
                className={`block overflow-hidden rounded-md border ${
                  i === activeIdx
                    ? "border-clay"
                    : "border-[var(--color-border)] hover:border-ocean"
                }`}
                title={labelFor(v)}
              >
                {v.kind === "image" ? (
                  <img
                    src={v.url}
                    alt=""
                    aria-hidden
                    className="h-16 w-24 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center bg-warm-white-2 text-[10px] uppercase tracking-wide text-ink-muted">
                    ▶ video
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function labelFor(v: EntityVisual): string {
  if (v.isReference) return "Identity reference";
  const preset = v.stylePreset
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${preset}${v.kind === "video" ? " · video" : ""}`;
}
