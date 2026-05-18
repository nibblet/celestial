# Dev Plan: [IDEA-083] World Lore Quiz — AI-Generated Multiple-Choice Quiz for Completed Readers
**Theme:** post-read-world

## What This Does
A `/world/quiz` page serving an AI-generated multiple-choice quiz grounded in `chapter_tags.json` and wiki facts. Available only to `show_all_content=true` readers. Questions are generated on demand by Claude Haiku, sourced from entity metadata and rule summaries — no separate question database to maintain. Zero new DB tables; stateless scoring (scores not persisted).

## User Stories
- As a re-reader (show_all_content=true): I want to test my knowledge of the Celestial universe with lore-accurate questions grounded in the actual wiki, not vague generalities.
- As a first-time locked reader: I should never reach this page — I'm redirected before seeing any content.
- As the author: I want quiz questions auto-generated from existing wiki facts — no extra content authoring required. Questions stay accurate as the wiki evolves.

## Implementation

### Phase 1: Page Scaffold + Gate (20 min)
1. Open `src/app/` — create directory `world/quiz/` and file `page.tsx`
2. In `page.tsx` (server component), import `getAuthenticatedProfileContext` from `src/lib/auth/profile-context.ts` and `getReaderProgress` from `src/lib/reader-progress.ts`
3. Fetch profile + readerProgress server-side; if `!readerProgress?.showAllContent`, redirect to `/profile` (same gate pattern as `/beyond/page.tsx`)
4. Render a `WorldLoreQuiz` client component stub (placeholder "Loading…" for now)
5. **Checkpoint:** `/world/quiz` is accessible to author accounts with `show_all_content=true`, redirects all others. `npm run build` passes.

### Phase 2: Quiz Generator Module (45 min)
1. Create `src/lib/ai/quiz-generator.ts`
2. Define types:
   ```ts
   export type QuizQuestion = {
     question: string;
     options: [string, string, string, string];
     correctIndex: 0 | 1 | 2 | 3;
     explanation: string;  // shown after answering
   };
   ```
3. Implement `generateQuizQuestions(count: number = 5): Promise<QuizQuestion[]>`:
   - Import `getChapterTags` from `src/lib/wiki/chapter-tags.ts` — read the `chapter_tags.json` entity list for 5 random chapters
   - Import wiki rules via `fs.readdir(path.join(process.cwd(), 'content/wiki/rules'))` — read 3 random rule files' first paragraph
   - Assemble a context block: chapter entity lists (slug + chapter number) + rule summaries — no narrative prose, no arc data
   - Call `anthropic.messages.create` with model `claude-haiku-4-5-20251001`, non-streaming
   - System prompt: "You are a quiz author for a sci-fi novel companion app. Generate exactly N multiple-choice questions about the universe based only on the provided entity and rule facts. Return a JSON array of objects with keys: question, options (array of 4 strings), correctIndex (0–3), explanation. Questions must be answerable from the provided facts. Do not invent details not in the facts. Format: only the JSON array, no other text."
   - User message: the assembled context block + "Generate 5 questions."
   - Parse the response as JSON; validate shape; throw if malformed
4. **Checkpoint:** Unit test or manual `ts-node` verification that `generateQuizQuestions(5)` returns 5 valid `QuizQuestion` objects.

### Phase 3: API Route (20 min)
1. Create `src/app/api/quiz/generate/route.ts` — POST, auth required
2. Use `getAuthenticatedProfileContext` to get profile; return 403 if not `show_all_content`
3. Apply existing `rateLimit` from `src/lib/rate-limit.ts` — 5 quizzes per hour per user (`userId`, window 3600s, max 5)
4. Call `generateQuizQuestions(5)` and return `{ questions }` as JSON
5. On AI error: catch and return `{ error: "Failed to generate quiz" }` with 500 status
6. **Checkpoint:** `curl -XPOST /api/quiz/generate` (with valid session cookie) returns JSON quiz questions; without `show_all_content` returns 403.

### Phase 4: Quiz UI Component (50 min)
1. Create `src/components/quiz/WorldLoreQuiz.tsx` as `'use client'`
2. State machine with `useReducer`:
   - `idle`: "Test Your Archive Knowledge" header + "Generate Quiz →" button
   - `loading`: spinner during the `/api/quiz/generate` POST call
   - `active`: `{ questions, currentIndex, answers: (number | null)[], revealed: boolean[] }`
   - `complete`: final score display
3. In `active` state:
   - Progress indicator: "Question N of 5"
   - Question text as `<h2>` 
   - 4 option buttons — after `revealed[currentIndex]`, color `correctIndex` button green, selected-but-wrong button red
   - "Submit Answer" button (disabled if nothing selected) → reveals answer + shows `explanation` in muted text
   - After reveal: "Next Question →" advances `currentIndex`; at index 4, transitions to `complete`
4. In `complete` state:
   - Score: "You got N / 5 correct"
   - Styling: score 5/5 = teal accent, 3–4 = ocean accent, 0–2 = muted
   - "Try another quiz" button → resets to `idle`
5. Wire `WorldLoreQuiz` into `/world/quiz/page.tsx` — replace stub
6. **Checkpoint:** Full quiz flow works in browser for `show_all_content` user. Non-`show_all_content` user redirected.

### Phase 5: Navigation Entry Points (15 min)
1. Open `src/app/rules/page.tsx` (rules index) — add a "Test Your Knowledge →" link to `/world/quiz` at the bottom of the page, visible only when `readerProgress.showAllContent === true`
2. When IDEA-089 (Completion Ceremony Page) ships: add quiz link to the "What's next in the Archive?" grid there

## Content Considerations
- `chapter_tags.json` (`content/raw/chapter_tags.json`) provides entity slugs and story contexts per chapter — primary question source ("Which entity first appears in CH04?")
- Wiki rules markdown (`content/wiki/rules/`) — 25 rules, rule titles and first paragraph only — question source for lore/physics rules ("Which rule governs conscious machine awareness?")
- No arc ledger content in quiz prompts — keeps questions factual, not spoilery even for re-readers who might share screenshots
- No narrative prose from story markdown in prompts — entity names and wiki structure only

## Spoiler & Gating Impact
Does not expose narrative content because:
1. Page redirects at server level if `show_all_content !== true`
2. Quiz generation prompt contains only entity names/chapter lists and rule summaries — no story body text, no arc endpoints
3. `show_all_content` readers have finished the book; spoiler risk is zero at that point
4. No question answers expose arc endpoints — questions are factual (entity appearances, rule names, location associations)

## Theme-Specific Requirements (post-read-world)
1. **Hidden from locked/first-time readers:** `/world/quiz/page.tsx` server check — `if (!readerProgress?.showAllContent) redirect('/profile')`. Guest users with no session also redirect. No UI affordance for this page is shown on non-`show_all_content` surfaces.
2. **Integration with `show_all_content`:** Direct server-side profile fetch. The `show_all_content` flag is the sole gate — same pattern as `/beyond`. The `/api/quiz/generate` route also validates `show_all_content` as defense-in-depth.
3. **Partial-completion edge cases:** The flag is a binary author-set signal; partial completion is not an edge case here. If `show_all_content` is false for any reason, the user is redirected, regardless of how many chapters they've read.

## Testing
- [ ] Build, lint, `npm test` pass
- [ ] Locked reader (showAllContent=false) → server redirect to `/profile`
- [ ] Guest reader (no session) → server redirect to home
- [ ] Re-reader (showAllContent=true) → sees quiz page with "Generate Quiz →" button
- [ ] Re-reader clicks "Generate Quiz →" → loading state → 5 questions appear
- [ ] Select option + Submit → correct answer highlighted green, explanation shown
- [ ] Advance through all 5 questions → score screen with "Try another quiz" button
- [ ] Rate limit: 6th POST to `/api/quiz/generate` within 1 hour → 429 response
- [ ] AI failure (mock 500 from Haiku) → error message shown in UI, no crash

## Files Modified
- `src/app/world/quiz/page.tsx` (new)
- `src/app/api/quiz/generate/route.ts` (new)
- `src/lib/ai/quiz-generator.ts` (new)
- `src/components/quiz/WorldLoreQuiz.tsx` (new)
- `src/app/rules/page.tsx` (add footer link — 3-line addition)

## New Files
- `src/app/world/quiz/` (new directory)
- `src/components/quiz/` (new directory)

## Database Changes
None. Scores are not persisted.

## Dependencies
- `chapter_tags.json` — exists at `content/raw/chapter_tags.json`
- `src/lib/wiki/chapter-tags.ts` — existing module
- `src/lib/rate-limit.ts` — existing in-memory rate limiter
- `src/lib/auth/profile-context.ts` — existing auth helper
- `claude-haiku-4-5-20251001` — Claude Haiku 4.5 (low cost: ~$0.001 per 10-question batch)

## Verify
- [ ] Build, lint, tests pass
- [ ] Locked-reader redirect verified
- [ ] Re-reader quiz generate + submit flow verified
- [ ] Guest redirect verified
- [ ] Rate limit 429 verified
- [ ] AI generation prompt contains no narrative prose (verify by logging prompt once during dev)

## Estimated Total: 2.5 hours
