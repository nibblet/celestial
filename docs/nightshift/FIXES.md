# FIXES — Keith Cobb Interactive Storybook

> Bug and issue tracker. Updated each nightshift run.

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

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
- **Summary:** `tell/page.tsx` `sendMessage()` mutates `last.content += data.text` inside `setMessages`. `ask/page.tsx` already uses the correct immutable batch pattern (introduced in the SSE improvements). Port that pattern to `tell/page.tsx`.

---

### [FIX-017] Multiple Draft Rows Created for One Tell Session
- **Status:** planned
- **Severity:** Low — produces orphaned draft rows in `sb_story_drafts`; session status stuck at `drafting` when user goes back to chat
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-017-multiple-drafts-per-session.md`
- **Summary:** Composing a draft, going back to chat, then composing again creates a second `sb_story_drafts` row. Fix: upsert in draft API (update if draft exists for session). Also reset session status to `gathering` via PATCH when user clicks "Keep Talking".

---

## Recently Resolved

### [FIX-013] Uncommitted Auth Redirect Changes (app-url.ts + signup/middleware)
- **Status:** resolved
- **Severity:** Medium — working code existed locally but was untracked; a fresh clone or Vercel deploy could silently lose auth redirect behavior
- **Found:** 2026-04-15
- **Resolved:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-013-uncommitted-signup-changes.md`
- **Summary:** Verified the auth redirect changes are present in `src/lib/app-url.ts`, `signup/page.tsx`, `supabase/middleware.ts`, and `.env.local.example`, preserving `NEXT_PUBLIC_SITE_URL` support for signup email redirects.

---

### [FIX-014] Tell Page Missing sendInFlightRef Double-Submit Guard
- **Status:** resolved
- **Severity:** Low — intermittent duplicate sends on slow connections or double-click
- **Found:** 2026-04-15
- **Resolved:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-014-tell-double-submit.md`
- **Summary:** Added a synchronous `sendInFlightRef` guard in `src/app/tell/page.tsx` so rapid double submits cannot fire overlapping `/api/tell` sends before React state re-renders.

---

### [FIX-015] submitDraft() Has No In-Progress Guard
- **Status:** resolved
- **Severity:** Low — double-click on Submit Story fired duplicate PATCH requests
- **Found:** 2026-04-15
- **Resolved:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-015-submit-draft-no-guard.md`
- **Summary:** Added `submitting` state to `submitDraft()` in `src/app/tell/page.tsx`, prevented re-entry while in flight, disabled the submit button, and added a "Submitting..." label during the request.

---

### [FIX-008] submitDraft Ignores User Edits to Title/Body
- **Status:** resolved
- **Severity:** High — user edits are silently discarded; contributor never knows
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-008-submit-draft-ignores-edits.md`
- **Summary:** Added `src/app/api/tell/draft/update/route.ts` and updated `submitDraft()` in `tell/page.tsx` to PATCH edited `title`/`body` before final submit.

---

### [FIX-009] No Rate Limiting on /api/tell/draft + Raw Response Leak
- **Status:** resolved
- **Severity:** Medium — financial risk (4096 token Claude call, unguarded); minor privacy issue
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-009-tell-draft-rate-limiting.md`
- **Summary:** Added rate limiting to `/api/tell/draft` (`5/min` per user with `Retry-After`) and removed raw Claude response leakage from parse-failure API errors.

---

### [FIX-010] getWikiSummaries() in parser.ts Has No Cache
- **Status:** resolved
- **Severity:** Low-Medium — disk read on every /api/tell request; immutable file at runtime
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-010-tell-prompts-wiki-cache.md`
- **Summary:** Added module-level wiki summary caching in `tell-prompts.ts` so Tell prompt builds reuse cached `index.md` content instead of re-reading every request.

---

### [FIX-011] Dead `generateStaticParams` in Journey Routes
- **Status:** resolved
- **Severity:** Low — dead code, same issue as FIX-006 (resolved for stories/themes but reintroduced for journeys)
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-011-dead-generatestaticparams-journeys.md`
- **Summary:** Removed dead `generateStaticParams` exports and now-unused journey list imports from `journeys/[slug]/page.tsx` and `journeys/[slug]/[step]/page.tsx`.

---

### [FIX-012] Unused `_node` Lint Warning in Ask Page
- **Status:** resolved
- **Severity:** Very Low — 1 ESLint warning, no runtime impact
- **Found:** 2026-04-14
- **Resolved:** 2026-04-14
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-012-unused-node-lint-warning.md`
- **Summary:** Updated markdown link renderer arg destructuring from `node: _node` to `node: _`, clearing the lint warning while still excluding `node` from spread props.

---

## Resolved Issues

### [FIX-001] Next.js 16 Middleware Deprecation
- **Status:** resolved
- **Severity:** Medium — build warning today, will eventually break
- **Found:** 2026-04-12
- **Resolved:** 2026-04-13
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-001-middleware-to-proxy.md`
- **Summary:** Replaced `src/middleware.ts` with `src/proxy.ts` using `export async function proxy` (Next.js 16 requires the function name `proxy`, not `middleware`). Build no longer emits the deprecation warning.

---

### [FIX-002] Lint Errors in scripts/compile-wiki.ts
- **Status:** resolved
- **Severity:** Low — breaks clean lint, will block CI
- **Found:** 2026-04-12
- **Resolved:** 2026-04-13
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-002-compile-wiki-lint-errors.md`
- **Summary:** Added `ParsedStory`, typed manifest rows as `Record<string, string>` → `ManifestRow`, removed unused `getLifeStage`, `LIFE_STAGE_ORDER`, and `quotesData` load.

---

### [FIX-003] Story Full Text Loses Markdown Formatting
- **Status:** resolved
- **Severity:** Low-Medium — UX quality, no data loss
- **Found:** 2026-04-12
- **Resolved:** 2026-04-13
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-003-story-fulltext-markdown.md`
- **Summary:** `src/app/stories/[storyId]/page.tsx` now renders `fullText` with `ReactMarkdown` inside the existing prose article.

---

### [FIX-004] No Rate Limiting on /api/ask
- **Status:** resolved
- **Severity:** Medium — financial risk, no cost guard on Claude API
- **Found:** 2026-04-12
- **Resolved:** 2026-04-13
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-004-ask-api-rate-limiting.md`
- **Summary:** Added `src/lib/rate-limit.ts` (20 req/min per user). `/api/ask` returns 429 with `Retry-After`; Ask page shows a friendly message for 429.

---

### [FIX-005] Orphaned User Messages on Stream Failure
- **Status:** resolved
- **Severity:** Low — invisible today, will surface when conversation resumption is built
- **Found:** 2026-04-12
- **Resolved:** 2026-04-13
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-005-orphaned-user-messages.md`
- **Summary:** User message insert uses `.select("id").single()`; on stream `catch`, if `fullResponse` is still empty, the row is deleted by `id`.

---

### [FIX-006] Dead `generateStaticParams` in Story/Theme Detail Pages
- **Status:** resolved
- **Severity:** Low — dead code at build time, no runtime impact
- **Found:** 2026-04-13
- **Resolved:** 2026-04-13
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-006-dead-generatestaticparams.md`
- **Summary:** Removed `generateStaticParams` and unused `getAllStories` / `getAllThemes` imports from story and theme detail pages.

---

### [FIX-007] SSE Stream Chunk Parsing Fragility in Ask Page
- **Status:** resolved
- **Severity:** Medium — causes intermittent chat failures on slow/mobile connections
- **Found:** 2026-04-13
- **Resolved:** 2026-04-13
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-007-sse-chunk-fragility.md`
- **Summary:** Ask page stream reader uses a line buffer, `TextDecoder` `{ stream: true }`, final `decode()` flush on `done`, and per-line try/catch.

---
