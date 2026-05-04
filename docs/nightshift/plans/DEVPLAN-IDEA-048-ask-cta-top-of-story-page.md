# Dev Plan: [IDEA-048] Ask Companion CTA Near Top of Story Page
**Theme:** ask-forward

## What This Does

Adds a prominent "Ask the companion about this chapter →" link-button directly below the
chapter summary paragraph and above scene navigation on every story detail page
(`/stories/[storyId]`). This is the first interactive element most readers encounter after
reading the summary — visible on first scroll, before they commit to diving into the full
chapter text.

The bottom-of-page CTA (IDEA-040, shipped, line 317 of `stories/[storyId]/page.tsx`)
is a great bookend but requires reaching the end of a long page. This adds a second entry
point at the natural decision point: "I've read the summary — should I dive in or ask
something first?"

## User Stories

- As a first-time reader arriving at CH05: I see the summary, decide I have a question
  about what I just read in CH04, and can click the Ask link immediately — without
  scrolling past scenes, quotes, mission logs, and the full story body.
- As a re-reader (show_all_content on): I arrive at CH09 for a second read and want to
  probe deeper lore before re-reading. The top CTA is the fastest path to Ask.
- As the author: Checking chapter consistency, I can quickly jump from the chapter
  summary into the Ask companion to probe narrative grounding questions.

## Implementation

### Phase 1: Insert top CTA

**File:** `src/app/stories/[storyId]/page.tsx`

`Link` is already imported at line 8. `storyId` is in scope from `params`. No new
imports needed.

1. Open `src/app/stories/[storyId]/page.tsx`
2. Locate the summary paragraph at **lines 164–166**:
   ```tsx
   <p className="mb-5 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-ink-muted">
     {story.summary}
   </p>
   ```
3. Locate `<StorySceneJump sections={sceneSections} />` at **line 168** (immediately
   after the summary).
4. Insert the following block between the closing `</p>` of the summary and
   `<StorySceneJump>`:
   ```tsx
   <div className="mb-5">
     <Link
       href={`/ask?story=${encodeURIComponent(storyId)}`}
       className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-warm-white px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-ocean hover:text-ocean"
     >
       Ask the companion about this chapter →
     </Link>
   </div>
   ```
5. **Checkpoint:** Visit `/stories/CH01`. A pill-style link button appears below the
   italic summary paragraph and above the scene jump navigation. Click → navigates to
   `/ask?story=CH01-...` with chapter context loaded.

**No other files modified.** The bottom CTA (line 317) stays — it serves as a paired
"what next?" action after reading the full chapter.

### Phase 2 (optional): Add pre-seeded prompt

If Paul wants the click to land with a starter question already filled in:
```tsx
href={`/ask?story=${encodeURIComponent(storyId)}&prompt=${encodeURIComponent("What happened in this chapter?")}`}
```
`prefilledPrompt` is already read by `ask/page.tsx` (`searchParams.get("prompt")`).
Optional — context loading alone is high value. Decide after Phase 1 ships.

## Content Considerations

No wiki content changes. No new markdown. No brain_lab changes.

## Spoiler & Gating Impact

No spoiler risk. With companion-first defaults (commit `0e60b8c`), `isStoryUnlocked()`
returns `true` for all stories for all users. The CTA is a navigation link — it does not
render any content. The `/ask` page's own Reader Progress Gate prompt instruction still
applies, keeping answers contextualised to the chapter without spoiling future chapters.

## Theme-Specific Requirements (ask-forward)

- **Placement:** Directly below summary paragraph, above `<StorySceneJump>` — visible on
  first scroll, no scrolling required on desktop viewports.
- **Latency budget:** Zero — navigation link only, no network call until `/ask` loads.
- **Conversation memory:** N/A — this is a navigation shortcut.
- **Voice/TTS:** N/A.
- **Prompt seeding:** `?story=` param pre-loads chapter context into the Ask orchestrator
  (already supported; used by bottom CTA). Phase 2 optionally adds `?prompt=`.

## Testing

- [ ] `node_modules/.bin/next build` — build passes
- [ ] `npm run lint` — 0 errors, ≤4 warnings (unchanged)
- [ ] `npm test` — 192/192 pass (no test files touched)
- [ ] Locked-reader path: unauthenticated guest on `/stories/CH03` → button renders below
  summary → click → `/ask?story=...` loads correctly
- [ ] Unlocked / re-reader path: authenticated user → same behavior
- [ ] Guest-cookie path: cookie-only guest → same behavior
- [ ] Button does not appear in the locked-chapter fallback branch (lines 42–62) —
  that branch returns early before the summary section; no change needed there
- [ ] Bottom CTA at line 317 is untouched and still visible at page end

## Dependencies

- No new packages
- No DB migrations
- `Link` already imported at line 8 of `stories/[storyId]/page.tsx`
- `storyId` already in scope
- Ask page `?story=` param support confirmed (line 242 of `ask/page.tsx`)

## Estimated Total: 0.25 hours

Phase 1 is ~6 lines of JSX at one insertion point in one file.
