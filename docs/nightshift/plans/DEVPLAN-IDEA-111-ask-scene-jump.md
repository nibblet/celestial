# Dev Plan: [IDEA-111] Ask Scene Jump — Inline Story Navigation from Answer Bubbles
**Theme:** ask-forward

## What This Does

When the Ask companion's streamed response cites one or more story chapters via links in `linksInAnswer`, a compact "Jump to scene: [Chapter Title] →" link row appears below the assistant answer bubble. Clicking navigates directly to `/stories/CH01` (or whichever chapter was cited). Makes Ask a two-way navigation layer: readers get an answer grounded in a chapter, then jump to that chapter in one click without leaving to search for it.

## User Stories

- As a first-time reader who asked "What happens at the Resonant Pad?" and received an answer citing Chapter 6, I see a "Jump to scene: CH06 →" link below the answer — one click takes me there.
- As a re-reader (show_all_content on), same experience — quick navigation from any Ask answer back to the source chapter.
- As the author, this feature requires zero new API routes, zero DB changes, and zero AI cost — it's a pure display layer on data already returned.

## Implementation

### Phase 1: Story-Jump Link Row in ask/page.tsx (~15 lines)

The `done` SSE event already returns `linksInAnswer: { href: string; text: string }[]` in client state. Story chapter links follow the pattern `/stories/CH01` through `/stories/CH17`. The `/stories/timeline` route is NOT a chapter page and must be excluded.

1. Open `src/app/ask/page.tsx`

2. Locate the assistant message render block — the `<div>` with `border border-[var(--color-border)]` for assistant messages (around line 698–712). This block contains:
   - The markdown content `<div>`
   - `<AskSourcesDisclosure>` (citations accordion)

3. Between the markdown div and `<AskSourcesDisclosure>`, insert the story-jump row:

```tsx
{/* Story chapter jump links — from linksInAnswer */}
{(() => {
  const storyLinks = (msg.evidence?.linksInAnswer ?? [])
    .filter(
      (l) =>
        l.href.startsWith("/stories/") &&
        !l.href.includes("/stories/timeline") &&
        !l.href.includes("/stories/timeline")
    )
    .filter(
      (l, i, arr) => arr.findIndex((x) => x.href === l.href) === i // dedupe
    )
    .slice(0, 2);
  if (!storyLinks.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {storyLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-ocean)] hover:bg-[var(--color-sci-panel)] transition-colors"
        >
          ↗ Jump to scene: {l.text}
        </Link>
      ))}
    </div>
  );
})()}
```

4. Verify `Link` is already imported from `'next/link'` at the top of the file — it should be (the existing `ASSISTANT_MARKDOWN_COMPONENTS.a` renderer uses `<Link>` for internal hrefs). If for any reason it isn't, add:
   ```tsx
   import Link from "next/link";
   ```

5. Run `npx next build` (or `npm run build`)

6. Run `npm run lint`

7. **Manual verification:**
   - Ask a question that cites a specific chapter: "What happens in Chapter 3?" or "Describe the Command Dome scene."
   - Confirm: a "↗ Jump to scene: CH03 →" (or similar) link row appears below the answer bubble after streaming completes.
   - Ask a question that produces only wiki entity links (no story links): "Who is ALARA?"
   - Confirm: NO jump row appears (entity links filtered out correctly).
   - Ask a question that cites two different chapters: confirm at most 2 links appear (slice(0,2)).
   - Verify `/stories/timeline` links are excluded.

**Checkpoint:** Build passes, lint clean, story-jump links render on chapter-citing answers only.

## Files Modified

- `src/app/ask/page.tsx` — add story-jump row between markdown div and `AskSourcesDisclosure` in the assistant message render block (~15 lines, IIFE pattern consistent with surrounding code)

## New Files

None.

## Database Changes

None.

## Verify

- [ ] `npx next build` passes
- [ ] `npm run lint` — 0 errors, ≤4 existing `<img>` warnings
- [ ] Answer citing a story chapter shows "↗ Jump to scene" link
- [ ] Answer with only wiki entity links shows NO jump row
- [ ] `/stories/timeline` href is excluded from jump links
- [ ] Duplicate chapter hrefs deduplicated (filter + slice)
- [ ] Maximum 2 links rendered per answer
- [ ] Guest path: no auth required, works for unauthenticated users
- [ ] Companion-first: all chapter links valid for all users

## Synergies

- **IDEA-078** (Confidence Ring): same assistant bubble post-stream area. If both ship, the jump row and confidence ring left-border accent coexist cleanly — ring is on the bubble wrapper, jump row is inside the bubble content.
- **IDEA-087** (Source Deep-Dive): `AskSourcesDisclosure` shows entity citations. The jump row surfaces chapter citations — complementary, not duplicated.
- **IDEA-096** (Live Context Band): the context band shows the active story context above the input; the jump row shows which chapters the *answer* references. Together they make the Ask navigation layer legible from both directions.

## Estimated Total: 30 minutes
