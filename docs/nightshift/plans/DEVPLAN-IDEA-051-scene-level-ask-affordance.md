# Dev Plan: [IDEA-051] Scene-Level "Ask About This Scene" Quick-Action
**Theme:** ask-forward

## What This Does

Adds a small inline "Ask →" affordance next to each `### Scene` heading in the chapter body. The link appears on hover and navigates to `/ask?story={storyId}&highlight={scene-slug}`, opening the Ask companion pre-seeded with that scene's context. Complements the chapter-level CTA (IDEA-048) with per-scene granularity — readers can invoke Ask immediately after finishing a scene without scrolling to the bottom of the page.

## User Stories

- **As a first-time reader** who just finished an intense scene, I hover over the scene heading (or see the affordance on mobile), click "Ask →", and the companion opens already primed with that scene's context so I can ask questions without re-typing anything.
- **As a re-reader (show_all_content on):** Same experience — all scenes are visible, all headings show the affordance.
- **As the author:** Scene Ask links appear in the chapter body as small, unobtrusive hover-visible anchors that don't distract from the prose.

## Implementation

### Phase 1: Extend StoryMarkdown to Accept storyId

1. Open `src/components/story/StoryMarkdown.tsx` line 33.

2. Change the props type from `{ content: string }` to:
   ```ts
   { content: string; storyId?: string }
   ```
   Update the function signature:
   ```ts
   export function StoryMarkdown({ content, storyId }: { content: string; storyId?: string }) {
   ```

3. **Checkpoint:** TypeScript compiles cleanly (`npm run build`). `StoryMarkdown` still renders normally since `storyId` is optional and unused yet.

### Phase 2: Add Ask Link to h3 Renderer

4. In `StoryMarkdown.tsx`, locate the `h3` custom renderer block (lines 76-85):
   ```tsx
   h3: ({ children }) => {
     const text = flattenText(children);
     const slug = slugifyHeading(text);
     const id = slug ? `scene-${slug}` : undefined;
     return (
       <h3 id={id} className="scroll-mt-24">
         {children}
       </h3>
     );
   },
   ```

5. Replace with:
   ```tsx
   h3: ({ children }) => {
     const text = flattenText(children);
     const slug = slugifyHeading(text);
     const id = slug ? `scene-${slug}` : undefined;
     return (
       <h3 id={id} className="scroll-mt-24 group relative">
         {children}
         {storyId && slug && (
           <a
             href={`/ask?story=${storyId}&highlight=${slug}`}
             className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-normal text-ink-ghost hover:text-ocean no-underline align-middle"
             title="Ask the companion about this scene"
             aria-label="Ask companion about this scene"
           >
             Ask →
           </a>
         )}
       </h3>
     );
   },
   ```

   **Tailwind classes explained:**
   - `group relative` on `<h3>` — enables the `group-hover` selector for the child link
   - `opacity-0 group-hover:opacity-100` — link is invisible until the reader hovers the heading
   - `transition-opacity` — smooth fade-in on hover
   - `text-xs font-normal` — visually subordinate to the heading text
   - `text-ink-ghost hover:text-ocean` — matches the app's muted/accent color tokens
   - `no-underline` — clean, non-disruptive link style

6. **Checkpoint:** Open any chapter page in dev mode, hover over a `### Scene` heading — confirm "Ask →" appears. Click it — confirm Ask page opens with `?story={storyId}&highlight={scene-slug}` in the URL.

### Phase 3: Wire storyId Through StoryBodyWithHighlighting

7. Open `src/components/story/StoryBodyWithHighlighting.tsx`.

8. The props interface (lines ~7-10) already includes `storyId: string`. Find the `<StoryMarkdown content={fullText} />` call inside the return JSX (near the bottom of the component, after the highlight overlay logic).

9. Change it to:
   ```tsx
   <StoryMarkdown content={fullText} storyId={storyId} />
   ```

10. **Checkpoint:** No TypeScript errors. `StoryBodyWithHighlighting` now passes `storyId` down, and `StoryMarkdown` renders the Ask links on hover for all scene headings.

11. `npm run lint`

12. `npm run build`

13. `npm test`

## Content Considerations

No wiki content changes. No new markdown files. No brain_lab/ ingest changes needed. The `?highlight=` param maps to `scene-${slugifiedHeading}` — this is consistent with how `StorySceneJump` and the Ask page already handle scene anchors.

## Spoiler & Gating Impact

- **Companion-first defaults:** All content is visible to all users (all chapters unlocked). No additional gating required — the Ask links appear on all scene headings for all readers.
- **Ask page spoiler protection:** The Ask page inherits its existing context-pack gating. With companion-first, all story content is included in context anyway.
- **If gating is ever re-enabled:** The `storyId` passed to `StoryMarkdown` comes from `StoryBodyWithHighlighting`, which is only rendered after the `!unlocked` gate passes in `stories/[storyId]/page.tsx:42`. So the scene Ask links are only shown when the chapter is accessible. No additional gate needed.

## Theme-Specific Requirements (ask-forward)

- **Latency:** Zero. This is a pure navigation link — no API calls or pre-fetching. The Ask companion loads only when the reader clicks.
- **Prompt changes:** None. The link uses the existing `?story=` + `?highlight=` params already handled by `ask/page.tsx` lines 242/245.
- **Conversation memory:** Not applicable — this feature is a navigation entry point, not a conversation feature.
- **Voice/TTS:** Not applicable.

## Testing

- [ ] `npm run lint` — 0 errors (no new warnings)
- [ ] `npm run build` — clean build
- [ ] `npm test` — 192/192 pass (no regressions in wiki/parser/markdown tests)
- [ ] Locked-reader path: N/A under companion-first; with gating re-enabled, chapters that fail `!unlocked` never render `StoryBodyWithHighlighting` so no Ask links appear
- [ ] Unlocked / re-reader path: all scene headings on any chapter page show the hover affordance
- [ ] Guest path: same as unlocked — companion-first means all chapters visible
- [ ] Click flow: heading hover → "Ask →" visible → click → `/ask?story=CH05-echoes-of-intent&highlight=scene-slug` URL → Ask page opens with context seeded
- [ ] No visual regression: `StoryMarkdown` renders normally for pages that pass `storyId` as `undefined` (e.g., any other non-chapter markdown render)

## Dependencies

- `slugifyHeading` — already imported in `StoryMarkdown.tsx` line ~12
- `storyId` prop — already present on `StoryBodyWithHighlighting.tsx` line 7
- `?highlight=` Ask param — already shipped (IDEA-018)
- `?story=` Ask param — already shipped (IDEA-040)
- Tailwind `group` / `group-hover` utilities — already in use across the app
- `text-ink-ghost`, `text-ocean` color tokens — already defined in `globals.css`

## Estimated Total: 0.5 hours
