# Dev Plan: [IDEA-125] Completion Stamp on Profile
**Theme:** post-read-world

## What This Does

For `show_all_content=true` readers, adds a tilted CSS ink-stamp seal reading "MISSION COMPLETE · DIRECTIVE-14 · VALKYRIE-1" to the `/profile` page header. A small, satisfying signal that the reader has finished the book — the profile page acknowledges the achievement. Zero AI, zero DB, zero npm. Five lines of JSX, one file.

## User Stories

- As a first-time reader (show_all_content = false): Profile page looks identical to today — no stamp, no layout shift.
- As a re-reader (show_all_content = true): The profile header displays the rotated ink-stamp seal.
- As a guest: No auth, no `readerProgress`, no stamp.
- As the author: No impact — the stamp is reader-facing only, gated by the profile flag.

## Implementation

### Phase 1: Single File Change

1. Open `src/app/profile/page.tsx` (server component).

2. Locate the `readerProgress` fetch — the profile page already calls `getReaderProgress()` to display reading stats and navigate sections. Confirm `readerProgress?.showAllContent` is accessible in the server component's scope.

3. Find the `<h1>` or top-level page header element (approximately the first 30–50 lines of the return JSX). Below the reader's name or profile heading, add:

```tsx
{progress?.showAllContent && (
  <div
    className="inline-block mt-2 rotate-[-8deg] border-4 border-[var(--color-ocean)] rounded-sm px-3 py-1 text-xs font-mono tracking-widest text-[var(--color-ocean)] opacity-70 select-none pointer-events-none"
    aria-label="Mission complete"
  >
    MISSION COMPLETE · DIRECTIVE-14 · VALKYRIE-1
  </div>
)}
```

The `rotate-[-8deg]` gives the ink-stamp tilt. `select-none pointer-events-none` makes it purely decorative. `opacity-70` gives it the faded-stamp look.

**Checkpoint:** With `show_all_content = false`, profile page unchanged. With `show_all_content = true`, stamp appears.

### Phase 2: Verify

4. Run `npx next build`.
5. Run `npm run lint`.
6. Manual verification:
   - Visit `/profile` as a non-`show_all_content` reader: no stamp visible, layout identical.
   - Visit `/profile` as a `show_all_content` reader: stamp appears in the header area, tilted, ocean-colored, faded.
   - Visit `/profile` as an unauthenticated guest: no stamp (no `readerProgress`).

## Content Considerations

None. No wiki files, no markdown, no content pipeline.

## Spoiler & Gating Impact

**No spoiler concern.** The stamp is triggered by `show_all_content`, which is the author-set signal for "reader has finished the book." The stamp text ("MISSION COMPLETE · DIRECTIVE-14 · VALKYRIE-1") contains the mission name already present in story content accessible to all readers under companion-first — it reveals nothing narrative.

- Locked first-time reader: `show_all_content = false` → no stamp.
- Guest: `getReaderProgress()` returns null → no stamp.
- Re-reader: `show_all_content = true` → stamp renders.
- Partial-completion edge case: `show_all_content` is the sole gate — server-side, no client-bypass possible.

## Theme-Specific Requirements (post-read-world)

1. **Degradation for locked/guest readers:** Complete — stamp block not rendered without `show_all_content`.
2. **Integration with show_all_content:** Direct dependency — `progress?.showAllContent` is the JSX conditional.
3. **Partial-completion edge cases:** `show_all_content` is the sole gate; partial readers without that flag see no stamp.

## Testing

- [ ] `npx next build` passes
- [ ] `npm run lint` passes (0 errors, ≤ 4 existing warnings)
- [ ] `npm test` passes (192 tests, 0 regressions)
- [ ] Non-`show_all_content` reader: no stamp, profile layout unchanged
- [ ] `show_all_content = true` reader: stamp visible in header, tilted, styled correctly
- [ ] Guest (unauthenticated): no stamp

## Dependencies

None. Standalone 1-file change. The profile page already fetches `getReaderProgress()` — no new data fetch needed.

## Files Modified

- `src/app/profile/page.tsx` — add ~5 lines of conditional JSX in the header section

## New Files

None.

## Database Changes

None.

## Estimated Total: 10 minutes
