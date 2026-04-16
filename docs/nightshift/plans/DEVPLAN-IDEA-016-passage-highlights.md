# Dev Plan: [IDEA-016] Save a Passage — Highlighted Text from Stories

## What This Does
Lets family members select any passage of text in a story and save it with a single click.
A small floating "Save passage" button appears near the selection the moment text is
highlighted — no modal, no friction. Saved passages are collected in a "My Passages" page
accessible from the profile, displayed as personal quotes with a link back to the story.

This creates a personal reading journal inside the storybook. A teenager might save a
paragraph that hit them about leadership. A grandchild might clip a funny memory. Over
time, the passages section of their profile becomes a curated reflection of what Keith's
stories mean to them personally.

## User Stories
- As a family member, I want to highlight a moving paragraph in a story so I can keep it
  and return to it easily.
- As a grandchild, I want my profile to show the passages I've saved so the storybook
  feels personally mine.
- As a reader, I want saving a passage to feel instant and frictionless — select, click,
  done.

---

## Implementation

### Phase 1: Database — Migration 012

Create `supabase/migrations/012_story_highlights.sql`:

```sql
-- Saved story passages per user (personal reading highlights)
create table public.sb_story_highlights (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  story_id     text        not null,
  story_title  text        not null default '',
  passage_text text        not null check (char_length(passage_text) between 10 and 1000),
  note         text        check (note is null or char_length(note) <= 500),
  saved_at     timestamptz not null default now()
);

-- No unique constraint — a user can save multiple passages from the same story.
create index idx_sb_story_highlights_user_id
  on public.sb_story_highlights (user_id, saved_at desc);

alter table public.sb_story_highlights enable row level security;

create policy "Users read own highlights"
  on public.sb_story_highlights for select
  using (auth.uid() = user_id);

create policy "Users insert own highlights"
  on public.sb_story_highlights for insert
  with check (auth.uid() = user_id);

create policy "Users delete own highlights"
  on public.sb_story_highlights for delete
  using (auth.uid() = user_id);
```

**Checkpoint:** Table exists in Supabase, RLS enabled.

---

### Phase 2: API Routes

**`src/app/api/stories/[storyId]/highlights/route.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_PASSAGE = 1000;
const MIN_PASSAGE = 10;
const MAX_NOTE = 500;
const MAX_STORY_ID_LENGTH = 64;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  if (!storyId || storyId.length > MAX_STORY_ID_LENGTH) {
    return Response.json({ error: "Invalid story id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = checkRateLimit(`${user.id}:highlight`, 30, 60_000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many saves — try again in a moment." }, { status: 429 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { passage_text, story_title, note } = body as {
    passage_text?: unknown;
    story_title?: unknown;
    note?: unknown;
  };

  if (
    typeof passage_text !== "string" ||
    passage_text.trim().length < MIN_PASSAGE ||
    passage_text.trim().length > MAX_PASSAGE
  ) {
    return Response.json(
      { error: `Passage must be ${MIN_PASSAGE}–${MAX_PASSAGE} characters.` },
      { status: 400 }
    );
  }

  const normalizedNote =
    typeof note === "string" && note.trim()
      ? note.trim().slice(0, MAX_NOTE)
      : null;

  const normalizedTitle =
    typeof story_title === "string" ? story_title.trim().slice(0, 200) : "";

  const { data, error } = await supabase
    .from("sb_story_highlights")
    .insert({
      user_id: user.id,
      story_id: storyId,
      story_title: normalizedTitle,
      passage_text: passage_text.trim(),
      note: normalizedNote,
    })
    .select("id, saved_at")
    .single();

  if (error || !data) {
    console.error("Failed to save highlight:", error);
    return Response.json({ error: "Could not save the passage." }, { status: 500 });
  }

  return Response.json({ id: data.id, saved_at: data.saved_at });
}
```

**`src/app/api/profile/highlights/route.ts`** (list user's highlights):

```ts
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("sb_story_highlights")
    .select("id, story_id, story_title, passage_text, note, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(500);

  return Response.json({ highlights: data ?? [] });
}
```

**`src/app/api/profile/highlights/[id]/route.ts`** (delete):

```ts
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // RLS guarantees users can only delete their own rows.
  const { error } = await supabase
    .from("sb_story_highlights")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: "Could not delete." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
```

**Checkpoint:** POST to `/api/stories/P1_S01/highlights` with a passage saves a row;
GET `/api/profile/highlights` lists it; DELETE removes it.

---

### Phase 3: PassageSaver Client Component

This component wraps the story body and listens for text selection events. It renders
a small floating button near the selection when text is highlighted within the story.

Create `src/components/story/PassageSaver.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SaveState {
  status: "idle" | "visible" | "saving" | "saved" | "error";
  text: string;
  x: number;
  y: number;
}

interface PassageSaverProps {
  storyId: string;
  storyTitle: string;
}

const MIN_CHARS = 10;
const MAX_CHARS = 1000;

export function PassageSaver({ storyId, storyTitle }: PassageSaverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [saveState, setSaveState] = useState<SaveState>({
    status: "idle",
    text: "",
    x: 0,
    y: 0,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimeout_() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSaveState((s) => (s.status === "visible" ? { ...s, status: "idle" } : s));
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < MIN_CHARS || selectedText.length > MAX_CHARS) {
      setSaveState((s) => (s.status === "visible" ? { ...s, status: "idle" } : s));
      return;
    }

    // Confirm the selection is inside our story body container
    if (!containerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    // Position the button above the selection
    const rect = range.getBoundingClientRect();
    const scrollY = window.scrollY;
    setSaveState({
      status: "visible",
      text: selectedText,
      x: rect.left + rect.width / 2,
      y: rect.top + scrollY - 8, // 8px gap above selection
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  async function handleSave() {
    if (saveState.status !== "visible") return;
    setSaveState((s) => ({ ...s, status: "saving" }));
    clearTimeout_();

    try {
      const res = await fetch(`/api/stories/${storyId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage_text: saveState.text,
          story_title: storyTitle,
        }),
      });

      if (res.ok) {
        setSaveState((s) => ({ ...s, status: "saved" }));
        window.getSelection()?.removeAllRanges();
        timeoutRef.current = setTimeout(() => {
          setSaveState((s) => ({ ...s, status: "idle" }));
        }, 2000);
      } else {
        setSaveState((s) => ({ ...s, status: "error" }));
        timeoutRef.current = setTimeout(() => {
          setSaveState((s) => ({ ...s, status: "idle" }));
        }, 2500);
      }
    } catch {
      setSaveState((s) => ({ ...s, status: "error" }));
      timeoutRef.current = setTimeout(() => {
        setSaveState((s) => ({ ...s, status: "idle" }));
      }, 2500);
    }
  }

  const showButton =
    saveState.status === "visible" ||
    saveState.status === "saving" ||
    saveState.status === "saved" ||
    saveState.status === "error";

  return (
    <>
      {/* Story body wrapper — ref used to constrain selection to story text */}
      <div ref={containerRef} className="story-body-wrapper">
        {/* Children rendered by parent — see Phase 4 */}
      </div>

      {/* Floating save button — fixed position relative to viewport + scroll */}
      {showButton && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: `${saveState.x}px`,
            top: `${saveState.y}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 50,
            pointerEvents: saveState.status === "visible" ? "auto" : "none",
          }}
          className="pointer-events-auto"
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState.status !== "visible"}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-md transition-colors ${
              saveState.status === "saved"
                ? "bg-green text-warm-white"
                : saveState.status === "error"
                ? "bg-red-500 text-white"
                : "bg-clay text-warm-white hover:bg-clay-mid"
            }`}
          >
            {saveState.status === "saving"
              ? "Saving…"
              : saveState.status === "saved"
              ? "✓ Saved"
              : saveState.status === "error"
              ? "Couldn't save"
              : "Save passage"}
          </button>
        </div>
      )}
    </>
  );
}
```

**Note on the wrapper:** The `PassageSaver` component needs to wrap the prose body so the
`containerRef` constrains selection detection. Implement it as a wrapper pattern — see Phase 4.

---

### Phase 4: Integrate PassageSaver into Story Detail Page

The story body in `src/app/stories/[storyId]/page.tsx` is a server component but the
`PassageSaver` is a client component. Use a simple wrapper pattern:

Create `src/components/story/StoryBodyWithHighlighting.tsx`:

```tsx
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface StoryBodyWithHighlightingProps {
  storyId: string;
  storyTitle: string;
  fullText: string;
}

const MIN_CHARS = 10;
const MAX_CHARS = 1000;

type SaveStatus = "idle" | "visible" | "saving" | "saved" | "error";

export function StoryBodyWithHighlighting({
  storyId,
  storyTitle,
  fullText,
}: StoryBodyWithHighlightingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [selText, setSelText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setStatus((s) => (s === "visible" ? "idle" : s));
      return;
    }
    const text = sel.toString().trim();
    if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
      setStatus((s) => (s === "visible" ? "idle" : s));
      return;
    }
    if (!containerRef.current) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    setSelText(text);
    setPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 8 });
    setStatus("visible");
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onSelectionChange]);

  async function save() {
    if (status !== "visible" || !selText) return;
    setStatus("saving");
    try {
      const res = await fetch(`/api/stories/${storyId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage_text: selText, story_title: storyTitle }),
      });
      setStatus(res.ok ? "saved" : "error");
      window.getSelection()?.removeAllRanges();
      timerRef.current = setTimeout(() => setStatus("idle"), res.ok ? 2000 : 2500);
    } catch {
      setStatus("error");
      timerRef.current = setTimeout(() => setStatus("idle"), 2500);
    }
  }

  const showBtn = status !== "idle";

  return (
    <div className="relative">
      {/* Prose body — ref constrains selection scope */}
      <div
        ref={containerRef}
        className="prose prose-lg max-w-none font-[family-name:var(--font-lora)] prose-headings:font-[family-name:var(--font-playfair)] prose-p:text-ink prose-headings:text-ink"
      >
        <ReactMarkdown>{fullText}</ReactMarkdown>
      </div>

      {/* Floating save button */}
      {showBtn && (
        <div
          style={{
            position: "absolute",
            left: `${pos.x}px`,
            top: `${pos.y - (containerRef.current?.getBoundingClientRect().top ?? 0) - window.scrollY}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 50,
          }}
        >
          <button
            type="button"
            onClick={save}
            disabled={status !== "visible"}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg transition-colors ${
              status === "saved"
                ? "bg-green text-warm-white"
                : status === "error"
                ? "bg-red-500 text-white"
                : "cursor-pointer bg-clay text-warm-white hover:bg-clay-mid disabled:opacity-50"
            }`}
          >
            {status === "saving"
              ? "Saving…"
              : status === "saved"
              ? "✓ Saved to your passages"
              : status === "error"
              ? "Couldn't save — try again"
              : "Save this passage"}
          </button>
        </div>
      )}
    </div>
  );
}
```

In `src/app/stories/[storyId]/page.tsx`, replace the `<ReactMarkdown>` block and its
wrapping `<article>` prose div with:

```tsx
<StoryBodyWithHighlighting
  storyId={storyId}
  storyTitle={story.title}
  fullText={story.fullText}
/>
```

Import at the top:
```ts
import { StoryBodyWithHighlighting } from "@/components/story/StoryBodyWithHighlighting";
```

Remove the direct `ReactMarkdown` import from the story detail page (it moves into the component).

**Checkpoint:** Highlight 2+ words in a story body → floating clay button appears → click
→ "✓ Saved to your passages" → button fades. Highlight less than 10 chars → no button.

---

### Phase 5: Profile — Passages Page

Create `src/app/profile/highlights/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Passages" };

type HighlightRow = {
  id: string;
  story_id: string;
  story_title: string;
  passage_text: string;
  note: string | null;
  saved_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProfileHighlightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("sb_story_highlights")
    .select("id, story_id, story_title, passage_text, note, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(500);

  const highlights = (data ?? []) as HighlightRow[];

  // Group by story for a reading-journal feel
  const byStory = new Map<string, { title: string; rows: HighlightRow[] }>();
  for (const h of highlights) {
    if (!byStory.has(h.story_id)) {
      byStory.set(h.story_id, {
        title: h.story_title || h.story_id,
        rows: [],
      });
    }
    byStory.get(h.story_id)!.rows.push(h);
  }

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10 md:py-14">
      <Link
        href="/profile"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; Profile
      </Link>
      <h1 className="type-page-title mb-2">My Passages</h1>
      <p className="mb-8 font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
        Paragraphs you&apos;ve saved from Keith&apos;s stories.
      </p>

      {highlights.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-6 text-center">
          <p className="type-ui mb-2 text-ink">No passages saved yet.</p>
          <p className="font-[family-name:var(--font-lora)] text-sm text-ink-muted">
            Select any text while reading a story — a &ldquo;Save this passage&rdquo; button will appear.
          </p>
          <Link
            href="/stories"
            className="type-ui mt-3 inline-block text-sm text-clay hover:text-clay-mid"
          >
            Browse stories →
          </Link>
        </div>
      )}

      <div className="space-y-10">
        {[...byStory.entries()].map(([storyId, { title, rows }]) => (
          <section key={storyId}>
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <Link
                href={`/stories/${storyId}`}
                className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-ink hover:text-clay"
              >
                {title}
              </Link>
              <span className="type-meta shrink-0 text-ink-ghost">
                {rows.length} passage{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="space-y-4">
              {rows.map((h) => (
                <HighlightCard key={h.id} highlight={h} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function HighlightCard({ highlight }: { highlight: HighlightRow }) {
  return (
    <li className="rounded-xl border border-clay-border bg-gold-pale/30 p-5">
      <blockquote className="mb-3 border-l-2 border-clay pl-4 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-ink">
        &ldquo;{highlight.passage_text}&rdquo;
      </blockquote>
      {highlight.note && (
        <p className="mb-2 font-[family-name:var(--font-lora)] text-sm text-ink-muted">
          {highlight.note}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="type-meta text-ink-ghost">
          Saved {formatDate(highlight.saved_at)}
        </p>
        <DeleteHighlightButton highlightId={highlight.id} />
      </div>
    </li>
  );
}
```

Because the delete button needs client-side interactivity, create a small companion:

**`src/app/profile/highlights/DeleteHighlightButton.tsx`**:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteHighlightButton({ highlightId }: { highlightId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/profile/highlights/${highlightId}`, { method: "DELETE" });
    router.refresh(); // Re-fetch server component data
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="type-ui text-xs text-ink-ghost transition-colors hover:text-clay disabled:opacity-40"
    >
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
```

Import `DeleteHighlightButton` into the highlights page.

**Checkpoint:** Save a passage → visit `/profile/highlights` → it appears, grouped by story,
in blockquote style. Click "Remove" → passage disappears (page refreshes via `router.refresh()`).

---

### Phase 6: Add "My Passages" Link to ProfileHero

Open `src/components/profile/ProfileHero.tsx`.

Add alongside the existing "My questions" and "My favorites" buttons:

```tsx
<Link
  href="/profile/highlights"
  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-[rgba(240,232,213,0.55)] bg-[rgba(240,232,213,0.12)] px-6 py-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold tracking-wide text-[#f7f3ed] transition-[background-color,border-color] duration-[var(--duration-normal)] hover:border-[#f0e8d5] hover:bg-[rgba(240,232,213,0.22)]"
>
  ✎ My passages
</Link>
```

---

## Files Modified
- `src/app/stories/[storyId]/page.tsx` — replace ReactMarkdown block with StoryBodyWithHighlighting
- `src/components/profile/ProfileHero.tsx` — add "My passages" link button

## New Files
- `supabase/migrations/012_story_highlights.sql` — DB migration
- `src/app/api/stories/[storyId]/highlights/route.ts` — save highlight
- `src/app/api/profile/highlights/route.ts` — list highlights
- `src/app/api/profile/highlights/[id]/route.ts` — delete highlight
- `src/components/story/StoryBodyWithHighlighting.tsx` — prose body + floating save button
- `src/app/profile/highlights/page.tsx` — passages page
- `src/app/profile/highlights/DeleteHighlightButton.tsx` — client delete button

## Database Changes
See migration above — `sb_story_highlights` with RLS. No migration conflict risk.

## Content Considerations
No wiki or markdown changes. `fullText` is already on every story object.

## Age-Mode Impact
- `young_reader`: floating button works the same; they may not highlight long passages but
  the feature doesn't break. Consider larger touch target on mobile.
- `teen` + `adult`: natural use case — highlighting meaningful paragraphs.

## Implementation Notes
- The floating button is positioned using `absolute` within a `relative` container.
  The `getBoundingClientRect()` math accounts for scroll position.
- `selectionchange` fires continuously while the user is dragging — the `status` guard
  (`s === "visible" ? "idle" : s`) prevents resetting an in-progress or completed save.
- The 10-character minimum prevents saving single words. 1000-char max matches the DB check.
- `router.refresh()` on delete re-fetches the server component without a full page reload.
- Rate limit: 30 saves/minute per user is generous and prevents API abuse.

## Testing
- [ ] Migration applies cleanly
- [ ] Build passes
- [ ] Select 2+ words in story body → "Save this passage" button appears above selection
- [ ] Select < 10 chars → no button
- [ ] Select > 1000 chars → no button
- [ ] Select text outside story body (e.g., theme tags) → no button
- [ ] Click "Save this passage" → "✓ Saved to your passages" → fades after 2s
- [ ] Visit `/profile/highlights` → passage appears, grouped under story name
- [ ] Click "Remove" → passage disappears, no full page reload
- [ ] Profile page shows "My passages" button → routes correctly
- [ ] Works on mobile (touch-select triggers the button)

## Estimated Total: 2–2.5 hours
