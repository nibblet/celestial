# FIXES — Keith Cobb Interactive Storybook

> Bug and issue tracker. Updated each nightshift run.
> **Note on numbering:** FIX-013 and FIX-014 numbers were reused after original issues resolved.
> Open FIX-013 = fenced JSON (different from resolved FIX-013 = auth redirect).
> Open FIX-014 = ageMode validation (different from resolved FIX-014 = tell double-submit).
> New issues from Run 5 start at FIX-018.

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

### [FIX-021] ESLint Errors in Beyond Components (4 errors)
- **Status:** planned
- **Severity:** Medium — build still passes but lint now reports 4 errors (up from 0); regression from clean lint state before Beyond feature wave
- **Found:** 2026-04-18
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-021-beyond-lint-errors.md`
- **Summary:** Four ESLint errors in new Beyond components: `scripts/compile-wiki.ts:564` (`let` → `const` for `peopleIndexEntries`); `MediaGallery.tsx:269` and `MentionSuggestion.tsx:33` (`react-hooks/set-state-in-effect` — legitimate "reset state on prop change" pattern needing eslint-disable); `TipTapEditor.tsx:185` (`react-hooks/immutability` — false positive on DOM element attribute mutation needing eslint-disable). All four are 2-minute fixes. **Do with FIX-019 + FIX-020 for a complete lint sweep.**

---

### [FIX-022] Duplicate `013_` Migration Prefix
- **Status:** planned
- **Severity:** Low — no functional impact since Supabase tracks migrations by full filename; however, it's confusing naming and could cause issues on fresh deployments if alphabetical ordering ever changes
- **Found:** 2026-04-18
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-022-dual-013-migration.md`
- **Summary:** `supabase/migrations/` has both `013_onboarding_flags.sql` (Run 6) and `013_story_corrections.sql` (this week). The subsequent migrations (014–017) are correctly numbered. Fix: add a comment to `013_story_corrections.sql` acknowledging the numbering (Option A — safe for active deployments). Do NOT rename if already applied in production. New migrations should start at `018_`.

---

### [FIX-013] Uncaught Exception in /api/tell/draft When Fenced JSON is Malformed
- **Status:** planned
- **Severity:** Low — Claude rarely returns fenced-but-invalid JSON; contributor sees a broken spinner with no user-friendly message if it occurs
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-013-tell-draft-fenced-json-throw.md`
- **Summary:** The secondary `JSON.parse(fenced[1])` call in the catch block of `/api/tell/draft/route.ts` is not wrapped in its own try/catch. If the fenced content is also malformed, the exception propagates uncaught. Fix: wrap the secondary parse in a try/catch with the same error logging and response pattern as the outer fallback.

---

### [FIX-014] ageMode Not Validated at Runtime in /api/ask
- **Status:** planned
- **Severity:** Low — family-only app; trusted users. If any client sends a non-enum ageMode value, `AGE_MODE_INSTRUCTIONS[ageMode]` silently returns `undefined`, which is interpolated as the string `"undefined"` in the system prompt.
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-014-agemode-not-validated.md`
- **Summary:** Add a runtime validation guard after destructuring `ageMode` from the request body. If the value is not one of `["young_reader", "teen", "adult"]`, default to `"adult"`. One-line fix.

---

### [FIX-016] Tell Page SSE State Mutation (Strict Mode Double-Append Risk)
- **Status:** planned
- **Severity:** Low-Medium — in React Strict Mode (Next.js dev), SSE text chunks may double-append since the state updater mutates the object in-place; violates React immutability contract
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-016-tell-sse-mutation.md`
- **Summary:** `tell/page.tsx` (now `StoryContributionWorkspace.tsx`) `sendMessage()` mutates `last.content += data.text` inside `setMessages`. `ask/page.tsx` already uses the correct immutable batch pattern. Port that pattern to `StoryContributionWorkspace.tsx`.

---

### [FIX-017] Multiple Draft Rows Created for One Tell Session
- **Status:** planned
- **Severity:** Low — produces orphaned draft rows in `sb_story_drafts`; session status stuck at `drafting` when user goes back to chat
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-017-multiple-drafts-per-session.md`
- **Summary:** Composing a draft, going back to chat, then composing again creates a second `sb_story_drafts` row. Fix: upsert in draft API (update if draft exists for session). Also reset session status to `gathering` via PATCH when user clicks "Keep Talking".

---

### [FIX-019] `_history` Unused Parameter Lint Warning in classifier.ts
- **Status:** planned
- **Severity:** Very Low — 1 ESLint warning; no runtime impact. Lint was previously clean (0 warnings) so this represents a regression.
- **Found:** 2026-04-16
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-019-classifier-lint.md`
- **Summary:** `src/lib/ai/classifier.ts` line 43: `_history` parameter has an underscore prefix but the project's ESLint config still warns on it. Add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` on the line before. One-line fix, pairs with FIX-020.

---

### [FIX-020] `<img>` ESLint Warnings in StoryMarkdown.tsx
- **Status:** planned
- **Severity:** Very Low — 2 `@next/next/no-img-element` warnings; no runtime impact. Lint had 1 warning before this run; these add 2 more. Raw `<img>` is intentional here (dynamic sources, unknown dimensions at compile time, `loading="lazy"` already present).
- **Found:** 2026-04-17
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-020-storymarkdown-img-warnings.md`
- **Summary:** `src/components/story/StoryMarkdown.tsx` lines 34 and 100 use raw `<img>` tags inside a `ReactMarkdown` custom renderer and a lightbox. `next/image` is impractical here (dynamic sources, unknown dimensions). Fix: add targeted `eslint-disable-next-line @next/next/no-img-element` comments at both locations. Two-line fix.

---

## Recently Resolved

### [FIX-018] Uncommitted Changes — KeithProfileHero + classifier.ts
- **Status:** resolved
- **Severity:** Medium
- **Found:** 2026-04-16
- **Resolved:** 2026-04-17 (committed in `c7ebef7`)
- **Summary:** `KeithProfileHero.tsx` (grid simplification, quick links removed) and `classifier.ts` (deep-default logic) both committed as part of the "added original photos and user stats" commit.

---

### [FIX-013] Uncommitted Auth Redirect Changes (app-url.ts + signup/middleware)
- **Status:** resolved
- **Severity:** Medium
- **Found:** 2026-04-15
- **Resolved:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-013-uncommitted-signup-changes.md`
- **Summary:** Verified the auth redirect changes are present in `src/lib/app-url.ts`, `signup/page.tsx`, `supabase/middleware.ts`, and `.env.local.example`, preserving `NEXT_PUBLIC_SITE_URL` support for signup email redirects.

---

### [FIX-014] Tell Page Missing sendInFlightRef Double-Submit Guard
- **Status:** resolved
- **Severity:** Low
- **Found:** 2026-04-15
- **Resolved:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-014-tell-double-submit.md`
- **Summary:** Added a synchronous `sendInFlightRef` guard in `src/app/tell/page.tsx` so rapid double submits cannot fire overlapping `/api/tell` sends before React state re-renders.

---

### [FIX-015] submitDraft() Has No In-Progress Guard
- **Status:** resolved
- **Severity:** Low
- **Found:** 2026-04-15
- **Resolved:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-015-submit-draft-no-guard.md`
- **Summary:** Added `submitting` state to `submitDraft()` in `src/app/tell/page.tsx`, prevented re-entry while in flight, disabled the submit button, and added a "Submitting..." label during the request.

---

### [FIX-008] submitDraft Ignores User Edits to Title/Body
- **Status:** resolved
- **Severity:** High
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-008-submit-draft-ignores-edits.md`
- **Summary:** Added `src/app/api/tell/draft/update/route.ts` and updated `submitDraft()` in `tell/page.tsx` to PATCH edited `title`/`body` before final submit.

---

### [FIX-009] No Rate Limiting on /api/tell/draft + Raw Response Leak
- **Status:** resolved
- **Severity:** Medium
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-009-tell-draft-rate-limiting.md`
- **Summary:** Added rate limiting to `/api/tell/draft` (`5/min` per user with `Retry-After`) and removed raw Claude response leakage from parse-failure API errors.

---

### [FIX-010] getWikiSummaries() in parser.ts Has No Cache
- **Status:** resolved
- **Severity:** Low-Medium
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-010-tell-prompts-wiki-cache.md`
- **Summary:** Added module-level wiki summary caching in `tell-prompts.ts` so Tell prompt builds reuse cached `index.md` content instead of re-reading every request.

---

### [FIX-011] Dead `generateStaticParams` in Journey Routes
- **Status:** resolved
- **Severity:** Low
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-011-dead-generatestaticparams-journeys.md`

---

### [FIX-012] Unused `_node` Lint Warning in Ask Page
- **Status:** resolved
- **Severity:** Very Low
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-012-unused-node-lint-warning.md`

---

## Resolved Issues

### [FIX-001] Next.js 16 Middleware Deprecation
- **Status:** resolved — `src/proxy.ts` replaces `src/middleware.ts`

### [FIX-002] Lint Errors in scripts/compile-wiki.ts
- **Status:** resolved — typed and cleaned up

### [FIX-003] Story Full Text Loses Markdown Formatting
- **Status:** resolved — `ReactMarkdown` used for `fullText`

### [FIX-004] No Rate Limiting on /api/ask
- **Status:** resolved — `src/lib/rate-limit.ts` (20/min per user)

### [FIX-005] Orphaned User Messages on Stream Failure
- **Status:** resolved — delete on empty stream catch

### [FIX-006] Dead `generateStaticParams` in Story/Theme Detail Pages
- **Status:** resolved

### [FIX-007] SSE Stream Chunk Parsing Fragility in Ask Page
- **Status:** resolved — line buffer + TextDecoder stream:true
