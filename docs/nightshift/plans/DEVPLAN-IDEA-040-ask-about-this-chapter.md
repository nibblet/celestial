# Dev Plan: [IDEA-040] "Ask About This Chapter" Quick-Action on Story Detail Pages
**Theme:** ask-forward

## What This Does

Adds a prominent "Ask about this chapter" CTA button on every story detail page (`/stories/[storyId]`) that navigates the reader to the Ask companion (`/ask`) with the chapter's story slug pre-loaded as context. The Ask page already accepts a `?story=` query param that pre-loads chapter metadata and scene data into the companion context — this feature simply surfaces that entry point from the most natural place: directly on the chapter the reader just finished.

Currently, readers must (1) navigate away from the chapter, (2) go to `/ask`, (3) manually understand they should tie their question to a chapter. A single button eliminates all three friction points.

## User Stories

- As a first-time reader who just finished CH05: I want to ask the companion "What just happened with ALARA in this chapter?" and I can click a button directly on the chapter page to do so, landing on Ask with CH05 context already loaded.
- As a re-reader (show_all_content on): I want to revisit a chapter and ask the companion deeper lore questions; the button is always present regardless of re-reader state.
- As the author: I use Ask to probe story consistency; the per-chapter entry point saves me the extra navigation step.

## Implementation

### Phase 1: Add CTA button to story detail page

**File:** `src/app/stories/[storyId]/page.tsx`

The story detail page already has `storyId` in scope. The Ask page reads `?story=` from query params (line 242 of `ask/page.tsx`: `searchParams.get("story")`). No Ask-page changes needed.

1. Open `src/app/stories/[storyId]/page.tsx`
2. Locate the summary paragraph block (around line 165, `<p className="mb-5 font-[family-name:var(--font-lora)]...">{story.summary}</p>`)
3. After that paragraph (and before `<StorySceneJump>` or the audio controls), insert an Ask CTA button:

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

`Link` is already imported in the file. `encodeURIComponent` is a built-in. No new imports needed.

4. **Checkpoint:** Visit `/stories/CH01`. Button renders below the summary, above scene navigation. Click → lands on `/ask` with CH01 context loaded (story title appears in the Ask header or the first response is contextualized to CH01).

### Phase 2 (optional): Pre-seed a prompt

If Paul wants a pre-filled question as well as context:
```
href={`/ask?story=${encodeURIComponent(storyId)}&prompt=${encodeURIComponent("What happened in this chapter?")}`}
```
`prefilledPrompt` is already read by Ask page at line 244 (`searchParams.get("prompt")`). This is optional — context-loading alone is high value.

### Phase 3 (optional): Update AskAboutStory copy

The `src/components/stories/AskAboutStory.tsx` component (rendered in the `#ask` TOC section) is a legacy "Write to Keith" author Q&A form. Its copy says "Keith will see it" — this is FIX-028 scope. Phase 3 would update that copy to match the Celestial author persona. Handled separately; does not block Phase 1.

## Content Considerations

No wiki content changes needed. No new markdown, no brain_lab changes, no unlock markers.

## Spoiler & Gating Impact

No spoiler risk. With the companion-first product direction shift (commit `0e60b8c`), `getReaderProgress()` defaults all users to max chapter. `isStoryUnlocked()` returns `true` for all stories for all users. The `?story=` param passes the storyId to the Ask orchestrator, which uses it to build a chapter-specific context pack — but since all content is now accessible to all users, there is no gating concern.

The Ask page's own spoiler gate (prompt-level "Reader Progress Gate" instruction in system prompt) still applies — it will contextualise answers to what's in the chapter, not spoil future chapters. This is correct behavior.

## Theme-Specific Requirements (ask-forward)

- **Placement:** CTA button on chapter detail page, below summary, above scene navigation — visible on first scroll without needing to reach page bottom.
- **Latency budget:** Navigation link only — zero latency. No network requests until the user lands on `/ask`.
- **Conversation memory:** Not applicable — this feature is a navigation shortcut, not a new memory mechanism.
- **Voice/TTS:** Not applicable.
- **Prompt seeding:** Phase 1 seeds chapter context via `?story=` (already supported). Phase 2 optionally adds `?prompt=` for a starter question.

## Testing

- [ ] `npx next build` — build passes
- [ ] `npm run lint` — 0 errors
- [ ] `npm test` — 192/192 pass (no test files touched)
- [ ] Locked-reader path: unauthenticated user on `/stories/CH01` → button visible → `/ask?story=CH01-...` loads correctly
- [ ] Unlocked / re-reader path: authenticated user with `show_all_content=true` → same behavior
- [ ] Guest-cookie path: guest user → same behavior (Ask handles no-user gracefully)
- [ ] Button href encodes storyId correctly for slugs with hyphens and numbers (e.g., `CH11-gravity-of-the-situation`)

## Dependencies

- No new packages
- No DB migrations
- Ask page `?story=` param support already confirmed (line 242 of `ask/page.tsx`)
- `Link` already imported in story detail page

## Estimated Total: 0.25 hours

Phase 1 is ~8 lines of JSX in one file. Phase 2 adds 1 template literal change. Phase 3 is FIX-028 scope (separate task).
