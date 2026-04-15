# FIXES — Keith Cobb Interactive Storybook

> Bug and issue tracker. Updated each nightshift run.

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

### [FIX-013] Uncommitted Auth Redirect Changes (app-url.ts + signup/middleware)
- **Status:** planned
- **Severity:** Medium — working code exists locally but is untracked; a fresh clone or Vercel deploy would silently lose the auth redirect URL fix
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-013-uncommitted-signup-changes.md`
- **Summary:** Four files changed locally (new `src/lib/app-url.ts`, updated `signup/page.tsx`, `middleware.ts`, `.env.local.example`) to support `NEXT_PUBLIC_SITE_URL` for Vercel auth redirects — but none are committed to git.

---

### [FIX-014] Tell Page Missing sendInFlightRef Double-Submit Guard
- **Status:** planned
- **Severity:** Low — intermittent duplicate sends on slow connections or double-click
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-014-tell-double-submit.md`
- **Summary:** `tell/page.tsx` uses `loading` React state to guard double-submit, but state is async and stale before re-render. `ask/page.tsx` fixed this with `sendInFlightRef` (commit `4b209d3`) — fix needs porting to Tell.

---

### [FIX-015] submitDraft() Has No In-Progress Guard
- **Status:** planned
- **Severity:** Low — double-click on Submit Story fires two PATCH requests; button remains active during network call
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-015-submit-draft-no-guard.md`
- **Summary:** `tell/page.tsx` `submitDraft()` has no `submitting` state or ref guard. Add `submitting` state, guard the function, disable button with "Submitting..." label during in-flight.

---

## Recently Resolved

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
