# Dev Plan: [IDEA-057] Context-Aware Welcome Message on Ask Page
**Theme:** ask-forward

## What This Does

When a reader arrives at the Ask page via `?story={storyId}` (e.g., from the "Chat about this story" button on a chapter page), the empty-state companion greeting and suggested question chips reflect the specific chapter they were just reading — not generic book-level prompts. The welcome reads "You're reading **[Chapter Title]**. What would you like to explore?" and the three chips are grounded in the chapter's lead character, primary location, and key concept from `chapter_tags.json`.

When no `?story=` param is present, the existing generic empty state is unchanged.

## User Stories

- As a first-time reader who just finished CH03 and clicks "Chat about this story (AI)," I see the chapter title in the greeting and suggested questions about that chapter's specific characters and places — not generic book themes.
- As a re-reader (show_all_content on) navigating directly to `/ask?story=ch07-harmonic-breach`, I get question chips grounded in CH07 entities.
- As the author testing from a chapter page, the companion correctly reflects the chapter I was viewing.
- As a guest (no account), the welcome message renders exactly the same — it's display-only with no auth dependency.

## Implementation

### Phase 1: Extend the `meta` API Route

1. Open `src/app/api/stories/[storyId]/meta/route.ts`
2. Add an import for chapter tags:
   ```ts
   import { getChapterTags } from "@/lib/wiki/chapter-tags";
   ```
3. Add a `buildWelcome` helper inside the file:
   ```ts
   function buildWelcome(tags: import("@/lib/wiki/chapter-tags").ChapterTagRecord): {
     greeting: string;
     suggestions: string[];
   } {
     const slugToLabel = (s: string) =>
       s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

     const suggestions: string[] = [];

     const lead = tags.characters.find((c) => c.presence === "lead");
     if (lead) {
       suggestions.push(
         `What drives ${slugToLabel(lead.slug)} in this chapter?`
       );
     }

     const loc = tags.locations[0];
     if (loc) {
       suggestions.push(
         `What is the significance of ${slugToLabel(loc.slug)} here?`
       );
     }

     const rule = tags.rules[0];
     if (rule) {
       suggestions.push(
         `How does the concept of ${slugToLabel(rule.slug)} apply to this chapter?`
       );
     }

     // Ensure at least 2 suggestions if entity data is sparse
     if (suggestions.length < 2) {
       suggestions.push("What is happening at this point in the story?");
     }
     if (suggestions.length < 3) {
       suggestions.push("What are the key themes of this chapter?");
     }

     return {
       greeting: `You're reading **${tags.title}**. What would you like to explore?`,
       suggestions: suggestions.slice(0, 3),
     };
   }
   ```
4. Update the GET handler to call this and include the result:
   ```ts
   export async function GET(
     _request: Request,
     context: { params: Promise<{ storyId: string }> }
   ) {
     const { storyId } = await context.params;
     const story = await getCanonicalStoryById(storyId);
     if (!story) {
       return NextResponse.json({ title: null }, { status: 404 });
     }
     const tags = getChapterTags(storyId);
     const chapterWelcome = tags ? buildWelcome(tags) : null;
     return NextResponse.json({ title: story.title, chapterWelcome });
   }
   ```

**Checkpoint:** `curl /api/stories/ch01-dustfall/meta` returns `{ title: "Chapter 1: Dustfall", chapterWelcome: { greeting: "...", suggestions: [...] } }`. For a missing story: `{ title: null }` (404 unchanged).

### Phase 2: Update the Ask Page Client State

5. Open `src/app/ask/page.tsx`
6. Add a new state variable alongside `contextStoryTitle`:
   ```ts
   const [chapterWelcome, setChapterWelcome] = useState<{
     greeting: string;
     suggestions: string[];
   } | null>(null);
   ```
7. In the existing `useEffect` that fetches story meta (around line 366–381), extend the response handler:
   ```ts
   useEffect(() => {
     if (!storySlug) {
       setContextStoryTitle(null);
       setChapterWelcome(null);
       return;
     }
     let cancelled = false;
     fetch(`/api/stories/${encodeURIComponent(storySlug)}/meta`)
       .then((r) => (r.ok ? r.json() : null))
       .then((d: { title?: string; chapterWelcome?: { greeting: string; suggestions: string[] } | null } | null) => {
         if (!cancelled) {
           if (d?.title) setContextStoryTitle(d.title);
           setChapterWelcome(d?.chapterWelcome ?? null);
         }
       })
       .catch(() => {});
     return () => {
       cancelled = true;
     };
   }, [storySlug]);
   ```

**Checkpoint:** TypeScript compiles. When `storySlug` changes, both `contextStoryTitle` and `chapterWelcome` are updated from the same single API call (no extra network round-trip).

### Phase 3: Render the Contextual Empty State

8. In `src/app/ask/page.tsx`, locate the empty-state block (around line 672):
   ```tsx
   {messages.length === 0 &&
     !(highlightIdFromUrl && highlightHydration === "loading") && (
     <div className="py-12 text-center">
       <p className="mb-4 text-sm text-ink-muted">
         What would you like to know about {book.title}?
       </p>
       ...
     </div>
   )}
   ```
9. Replace with a conditional branch that uses `chapterWelcome` when available:
   ```tsx
   {messages.length === 0 &&
     !(highlightIdFromUrl && highlightHydration === "loading") && (
     <div className="py-12 text-center">
       <p className="mb-4 font-[family-name:var(--font-lora)] text-sm text-ink-muted">
         {chapterWelcome
           ? chapterWelcome.greeting.replace(/\*\*(.*?)\*\*/g, "$1") /* strip markdown bold for plain render */
           : `What would you like to know about ${book.title}?`}
       </p>
       <div className="flex flex-wrap justify-center gap-2">
         {(chapterWelcome?.suggestions ?? SUGGESTIONS_BY_AGE_MODE[ageMode]).map(
           (suggestion) => (
             <button
               key={suggestion}
               type="button"
               onClick={() => sendMessage(suggestion)}
               className="type-ui rounded-full border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-ink-muted transition-colors hover:border-clay-border hover:text-clay"
             >
               {suggestion}
             </button>
           )
         )}
       </div>
     </div>
   )}
   ```
   - The greeting strips `**…**` markdown bold markers for plain rendering. If ReactMarkdown is already imported (it is), use it instead: wrap the greeting in a single-line `<ReactMarkdown>` component with `prose-sm` styles.
10. Run `node_modules/.bin/next build`
11. Run `npm run lint`
12. Run `npm test`

**Checkpoint:** Build and lint pass. Tests unchanged (no test files modified).

### Phase 4: Manual Verification

13. Start the dev server (`npm run dev` or as available in your environment).
14. Navigate to a chapter page (e.g., `/stories/ch01-dustfall`).
15. Click "Chat about this story (AI)" → verify the Ask page shows the CH01 title in the greeting and 3 entity-grounded suggestion chips.
16. Navigate to `/ask` directly (no `?story=`) → verify the generic "What would you like to know about Celestial?" welcome appears unchanged.
17. Test with an invalid story slug: `/ask?story=nonexistent` → verify graceful fallback to generic welcome (no crash, no blank chips).
18. Verify that clicking a chip submits it as a question and the session proceeds normally.

## Files Modified
- `src/app/api/stories/[storyId]/meta/route.ts` — add `buildWelcome`, return `chapterWelcome` in response
- `src/app/ask/page.tsx` — add `chapterWelcome` state, extend fetch handler, conditional empty-state render

## New Files
- None

## Database Changes
- None

## Content Considerations

`chapter_tags.json` is the source. All 17 chapters have `reviewed: false` — this means the entity data was AI-generated and may have occasional misidentifications. For the welcome UX, imperfect entity names are acceptable: the chips are suggestions, not authoritative claims. Once Paul reviews and marks chapters `reviewed: true`, the suggestions will be equally good (the `reviewed` flag is not checked by this feature).

## Spoiler & Gating Impact

No spoiler risk. The greeting and suggestions reveal:
- The chapter title (already shown on the chapter page the reader just left)
- Entity slugs as display labels (world-building metadata, not narrative events)

Under companion-first defaults, all content is accessible to all users. The feature behaves identically for first-time readers, re-readers, and guests — no gating logic is touched.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None — this only changes the empty-state UI, not the AI system prompt or API payload.
- **Latency budget:** Zero additional latency. `chapterWelcome` is fetched in the same API call as `contextStoryTitle`, which already fires when `storySlug` is set. The server-side `getChapterTags(storyId)` reads from a cached in-memory file (chapter-tags.ts caches after first read) — adds ~0ms.
- **Conversation-memory storage:** Not applicable. The welcome chips are display-only and not persisted. Clicking a chip sends a normal message via `sendMessage`, which is persisted in `cel_conversations` as any other message.
- **Voice/TTS considerations:** Not applicable to this implementation. If IDEA-054 (TTS) ships later, the welcome greeting text is fine to ignore for TTS (it's a UI label, not a spoken assistant turn).

## Testing

- [ ] `node_modules/.bin/next build` passes
- [ ] `npm run lint` passes (0 errors, 4 existing img warnings unchanged)
- [ ] `npm test` passes (192 tests, no changes to test files)
- [ ] **Locked-reader path (companion-first = all content visible):** Navigate to `/ask?story=ch01-dustfall` — chapter-specific welcome with CH01 entities appears
- [ ] **Direct `/ask` path (no `?story=`):** Generic "What would you like to know about Celestial?" appears
- [ ] **Unknown story slug path:** `/ask?story=nonexistent` — falls back to generic welcome gracefully
- [ ] **Guest path:** Unauthenticated user — welcome renders (no auth check in this feature)
- [ ] **Clicking a chip:** Submits the question, conversation begins normally

## Dependencies

- `src/lib/wiki/chapter-tags.ts`: `getChapterTags(storyId)` — already exists, already used in other server contexts. Caches file after first read; safe to call from API routes.
- `content/raw/chapter_tags.json`: Must be present and parseable. Already generated; fails gracefully (returns `null`) if missing.

## Estimated Total: 45 minutes
- Phase 1 (extend meta API): 15 min
- Phase 2 (client state): 10 min
- Phase 3 (conditional render): 15 min
- Phase 4 (verify): 5 min
