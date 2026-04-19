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

## Recently Resolved

### [FIX-025] Paragraph Text Used as React Key on Principle Detail Page
- **Status:** resolved
- **Severity:** Very Low
- **Found:** 2026-04-19
- **Resolved:** 2026-04-19
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-025-principle-detail-key.md`
- **Summary:** Replaced `key={paragraph}` with `key={i}` when mapping `aiNarrative` paragraphs in `src/app/principles/[slug]/page.tsx` so duplicate paragraph text cannot trigger React duplicate-key warnings.

---

### [FIX-024] Corpus Cache Invalidation Ineffective in Serverless
- **Status:** resolved
- **Severity:** Very Low
- **Found:** 2026-04-19
- **Resolved:** 2026-04-19
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-024-corpus-cache-serverless.md`
- **Summary:** Introduced `CACHE_TTL_MS` and documented that `invalidateWikiCorpusCache()` only clears the in-memory cache on the current Vercel serverless instance; other instances rely on TTL expiry.

---

### [FIX-023] Wiki Mirror Publish — Non-Atomic DB Operations
- **Status:** resolved
- **Severity:** Low-Medium
- **Found:** 2026-04-19
- **Resolved:** 2026-04-19
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-023-wiki-mirror-atomicity.md`
- **Summary:** Added recovery after failed integration or wiki document insert in `publishStoryToWikiMirror` by re-selecting and re-activating the latest superseded story doc for that `doc_key`. Added recovery after failed derived-doc batch insert by re-activating the highest-version superseded row per `(doc_type, doc_key)` for theme/timeline/index (avoids activating every historical superseded row).

---

### [FIX-021] ESLint Errors in Beyond Components (4 errors) + FIX-019/020
- **Status:** resolved
- **Severity:** Medium
- **Found:** 2026-04-18
- **Resolved:** 2026-04-18
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-021-beyond-lint-errors.md`
- **Summary:** Fixed all 4 ESLint errors in Beyond feature wave: `scripts/compile-wiki.ts:564` (`let` → `const` on `peopleIndexEntries`); `MediaGallery.tsx:269` and `MentionSuggestion.tsx:33` got `// eslint-disable-next-line react-hooks/set-state-in-effect` for legitimate reset-on-prop-change pattern; `TipTapEditor.tsx:185` got `// eslint-disable-next-line react-hooks/immutability` for imperative DOM attribute mutation (false positive). Lint now clean: `npm run lint` → 0 problems. `npm run build` passes.

---

### [FIX-020] `<img>` ESLint Warnings in StoryMarkdown.tsx
- **Status:** resolved
- **Severity:** Very Low
- **Found:** 2026-04-17
- **Resolved:** 2026-04-18
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-020-storymarkdown-img-warnings.md`
- **Summary:** Added `// eslint-disable-next-line @next/next/no-img-element` at both raw `<img>` sites in `src/components/story/StoryMarkdown.tsx` (inline story image renderer and lightbox). `next/image` remains impractical due to dynamic sources with unknown compile-time dimensions.

---

### [FIX-019] `_history` Unused Parameter Lint Warning in classifier.ts
- **Status:** resolved
- **Severity:** Very Low
- **Found:** 2026-04-16
- **Resolved:** 2026-04-18
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-019-classifier-lint.md`
- **Summary:** Added `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the `_history` parameter in `src/lib/ai/classifier.ts`, keeping the param as a future affordance for context-aware classification without a lint warning.

---

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
