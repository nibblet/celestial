# FIXES — Keith Cobb Interactive Storybook

> Bug and issue tracker. Updated each nightshift run.

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

### [FIX-001] Next.js 16 Middleware Deprecation
- **Status:** planned
- **Severity:** Medium — build warning today, will eventually break
- **Found:** 2026-04-12
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-001-middleware-to-proxy.md`
- **Summary:** `src/middleware.ts` uses the deprecated Next.js 16 `middleware` file convention. Must be renamed to `src/proxy.ts`. Build currently warns on every run: "The 'middleware' file convention is deprecated."

---

### [FIX-002] Lint Errors in scripts/compile-wiki.ts
- **Status:** planned
- **Severity:** Low — breaks clean lint, will block CI
- **Found:** 2026-04-12
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-002-compile-wiki-lint-errors.md`
- **Summary:** `npm run lint` returns 2 errors (`any` type on lines 98 and 196) and 3 warnings (unused vars: `getLifeStage`, `LIFE_STAGE_ORDER`, `quotesData`) in the compile-wiki script.

---

### [FIX-003] Story Full Text Loses Markdown Formatting
- **Status:** planned
- **Severity:** Low-Medium — UX quality, no data loss
- **Found:** 2026-04-12
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-003-story-fulltext-markdown.md`
- **Summary:** Story detail page splits `fullText` on `\n` and wraps lines in `<p>` tags, stripping all markdown formatting (bold, italic, blockquotes, lists). Should use `ReactMarkdown` like the Ask page already does.

---

### [FIX-004] No Rate Limiting on /api/ask
- **Status:** planned
- **Severity:** Medium — financial risk, no cost guard on Claude API
- **Found:** 2026-04-12
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-004-ask-api-rate-limiting.md`
- **Summary:** `/api/ask` has auth but no rate limiting. Any authenticated user can make unlimited Claude API calls. Fix: in-memory sliding-window limiter (20 req/min per user) with graceful 429 handling in the UI.

---

### [FIX-005] Orphaned User Messages on Stream Failure
- **Status:** planned
- **Severity:** Low — invisible today, will surface when conversation resumption is built
- **Found:** 2026-04-12
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-005-orphaned-user-messages.md`
- **Summary:** User message is saved to DB before Claude stream starts. If stream fails, user message persists with no assistant response, leaving a dangling turn in conversation history. Fix: capture message ID on insert, delete it in the stream's catch block if no response was generated.

---

## Resolved Issues

*(None yet)*
