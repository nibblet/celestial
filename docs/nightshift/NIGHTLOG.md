# NIGHTLOG — Keith Cobb Interactive Storybook

> Append-only history of every nightly run. Most recent at the top.

---

## Run: 2026-04-12 (Run 1 — First Full Scan)

### Summary
- Scanned: all 31 source files (routes, components, hooks, lib, scripts, migration, wiki content)
- Issues found: 5 new (`found` → `planned` same night), 0 existing, 0 resolved
- Ideas: 2 new seeds (IDEA-003, IDEA-004), 1 promoted (IDEA-001: seed → ready), 1 advanced (IDEA-002: seed → exploring)
- Plans written:
  - `FIXPLAN-FIX-001-middleware-to-proxy.md`
  - `FIXPLAN-FIX-002-compile-wiki-lint-errors.md`
  - `FIXPLAN-FIX-003-story-fulltext-markdown.md`
  - `FIXPLAN-FIX-004-ask-api-rate-limiting.md`
  - `FIXPLAN-FIX-005-orphaned-user-messages.md`
  - `DEVPLAN-IDEA-001-guided-journeys.md`

### Build & Lint Results
- `npm run build`: **PASSES** — 1 deprecation warning (FIX-001: middleware → proxy)
- `npm run lint`: **FAILS** — 2 errors, 3 warnings in `scripts/compile-wiki.ts` (FIX-002)
- All routes render as Dynamic (ƒ) — correct for auth-dependent app

### Key Findings
1. **Next.js 16 middleware deprecation** — `src/middleware.ts` needs to become `src/proxy.ts`. The build warns on every run. Easy 5-minute fix.
2. **Story full text missing markdown rendering** — `stories/[storyId]/page.tsx` splits text on newlines manually instead of using `ReactMarkdown`. The package is already installed and used in Ask. Quick fix with visible UX benefit.
3. **No rate limiting on /api/ask** — Any authenticated user can fire unlimited Claude API calls. In-memory sliding window limiter would cost <30min and prevent surprise bills.
4. **RLS is solid** — All three tables have proper policies. No auth gaps found. `sb_profiles.role` field exists for admin use but admin-gated routes don't exist yet.
5. **Age mode affects AI prompt only** — The system prompt adapts well by mode. But suggestion chips in Ask are hardcoded for adults, and story UI doesn't vary by mode at all. IDEA-003 addresses this.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-001-middleware-to-proxy.md` — Rename middleware.ts → proxy.ts (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-003-story-fulltext-markdown.md` — Use ReactMarkdown for story text (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-004-ask-api-rate-limiting.md` — Add per-user rate limit to /api/ask (30 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-001-guided-journeys.md` — Full Guided Journeys feature (4–6 hours)

### Recommendations
- **If you have 15 min:** Do FIX-001 and FIX-003 back to back — eliminates the build warning and improves story rendering with minimal effort.
- **If you have 2 hours:** FIX-004 (rate limiting) + start Phase 1 of IDEA-001 (create journey content files and parser). Phase 1 is just markdown files and a TypeScript parser — no UI yet.

---

## Run: 2026-04-12 (Initial Setup)

### Summary
- Nightshift system initialized
- Baseline docs created: STATUS.md, BACKLOG.md, FIXES.md, NIGHTLOG.md
- Plans directory created at `docs/nightshift/plans/`
- Scheduled task configured for nightly 1:00 AM runs

### Recommendations
- **First real scan will run tonight at 1 AM**
