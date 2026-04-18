"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaItem {
  id: string;
  owner_type: "story" | "person";
  owner_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  content_type: string | null;
  url: string;
  thumb_url: string;
  display_url: string;
  created_at?: string;
}

interface Props {
  ownerType: "story" | "person";
  ownerId: string | null | undefined;
  canEdit: boolean;
  /** Called when the uploader has room to insert into the editor. */
  onInsertIntoEditor?: (item: MediaItem) => void;
}

type Status = "idle" | "uploading" | "error";

export function MediaGallery({
  ownerType,
  ownerId,
  canEdit,
  onInsertIntoEditor,
}: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!ownerId) {
      setItems([]);
      return;
    }
    const res = await fetch(
      `/api/beyond/media?owner_type=${ownerType}&owner_id=${encodeURIComponent(ownerId)}`
    );
    if (!res.ok) return;
    const data = (await res.json()) as { media: MediaItem[] };
    setItems(data.media);
  }, [ownerType, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    if (!ownerId) {
      setError("Save the draft first — photos attach to a saved story.");
      return;
    }
    setStatus("uploading");
    setError(null);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("owner_type", ownerType);
      form.append("owner_id", ownerId);
      try {
        const res = await fetch("/api/beyond/media", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "upload failed");
        }
        const data = (await res.json()) as { media: MediaItem };
        setItems((prev) => [...prev, data.media]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    }
    setStatus("idle");
  }

  async function updateCaption(item: MediaItem, caption: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, caption } : i))
    );
    await fetch(`/api/beyond/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption }),
    });
  }

  async function removeItem(item: MediaItem) {
    if (!confirm("Remove this photo? This can be recovered by an admin.")) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`/api/beyond/media/${item.id}`, { method: "DELETE" });
    if (lightboxIndex !== null) setLightboxIndex(null);
  }

  async function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    // Persist — each row gets its new index.
    await Promise.all(
      next.map((item, idx) =>
        fetch(`/api/beyond/media/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: idx }),
        })
      )
    );
  }

  const dragFromRef = useRef<number | null>(null);

  return (
    <div className="space-y-2">
      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-sm transition-colors ${
            dragOver
              ? "border-clay bg-clay-pale text-clay"
              : "border-[var(--color-border)] bg-warm-white text-ink-muted hover:border-clay-border"
          }`}
        >
          {status === "uploading" ? (
            <span>Uploading…</span>
          ) : (
            <span>
              {ownerId
                ? "Drop photos here or click to upload"
                : "Save the draft first, then attach photos"}
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      )}

      {error && (
        <p className="type-ui text-xs text-red-800">{error}</p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((item, i) => (
            <figure
              key={item.id}
              draggable={canEdit}
              onDragStart={() => {
                dragFromRef.current = i;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = dragFromRef.current;
                dragFromRef.current = null;
                if (from !== null) reorder(from, i);
              }}
              className="group relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-warm-white"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="block h-24 w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb_url}
                  alt={item.caption ?? ""}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
              {canEdit && onInsertIntoEditor && ownerType === "story" && (
                <button
                  type="button"
                  onClick={() => onInsertIntoEditor(item)}
                  className="type-ui absolute left-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] text-warm-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Insert into story body"
                >
                  Inline
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="type-ui absolute right-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] text-warm-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Remove
                </button>
              )}
            </figure>
          ))}
        </div>
      )}

      {lightboxIndex !== null && items[lightboxIndex] && (
        <Lightbox
          item={items[lightboxIndex]}
          canEdit={canEdit}
          onClose={() => setLightboxIndex(null)}
          onPrev={
            lightboxIndex > 0
              ? () => setLightboxIndex(lightboxIndex - 1)
              : undefined
          }
          onNext={
            lightboxIndex < items.length - 1
              ? () => setLightboxIndex(lightboxIndex + 1)
              : undefined
          }
          onCaption={(c) => updateCaption(items[lightboxIndex], c)}
          onDelete={() => removeItem(items[lightboxIndex])}
        />
      )}
    </div>
  );
}

function Lightbox({
  item,
  canEdit,
  onClose,
  onPrev,
  onNext,
  onCaption,
  onDelete,
}: {
  item: MediaItem;
  canEdit: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onCaption: (caption: string) => void;
  onDelete: () => void;
}) {
  const [caption, setCaption] = useState(item.caption ?? "");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCaption(item.caption ?? ""), [item]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full max-w-4xl flex-col gap-3"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.display_url}
          alt={item.caption ?? ""}
          className="max-h-[70vh] w-full rounded-lg object-contain"
        />
        {canEdit ? (
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => onCaption(caption)}
            placeholder="Add a caption"
            className="type-ui rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-sm text-ink"
          />
        ) : item.caption ? (
          <p className="type-ui text-center text-sm text-warm-white">
            {item.caption}
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              className="type-ui rounded bg-warm-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className="type-ui rounded bg-warm-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={onDelete}
                className="type-ui rounded bg-red-100 px-3 py-1.5 text-sm text-red-800"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="type-ui rounded bg-warm-white px-3 py-1.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
