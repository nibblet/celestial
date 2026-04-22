# FIXES — Celestial Interactive Book Companion

> Bug and issue tracker. Updated each nightshift run.
> Numbering continues from Run 8 (last entry was FIX-025).

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

### [FIX-026] Stale `role = 'keith'` in RLS Policies (Migrations 025–028)
- **Status:** planned
- **Severity:** Medium — author accounts (the `author` role, formerly `keith`) cannot write to `cel_open_threads`, `cel_chapter_scenes`, or `cel_beats`. They also cannot read all rows in `cel_ai_interactions` (admin-level read). The ingest scripts use service-role keys (bypass RLS) so automated ingest still works, but any author-role UI or authenticated API call to these tables fails.
- **Found:** 2026-04-22
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-026-stale-keith-role-rls.md`
- **Summary:** Migrations 021 renamed the profile role `'keith'` → `'author'`. Migrations 025–028 were written after 021 but still check `p.role = 'keith'` in their RLS policies. Fix: new migration 030 drops and recreates the broken policies with `p.role = 'author'`.

---

### [FIX-027] `/api/admin/ai-activity` Checks Stale `'keith'` Role
- **Status:** planned
- **Severity:** Medium — author accounts get a 403 "Forbidden" response from the AI activity dashboard, even though RLS on `cel_ai_interactions` (once FIX-026 is fixed) would allow it. This is a code-layer check that must also be updated.
- **Found:** 2026-04-22
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-027-ai-activity-route-keith-role.md`
- **Summary:** Line 31 of `src/app/api/admin/ai-activity/route.ts` checks `["admin", "keith"].includes(profile.role)`. Should be `["admin", "author"]`. One-line fix; also update the comment on line 11.

---

### [FIX-028] Legacy "Keith" UI Copy — Phase 1 Cleanup Incomplete
- **Status:** found
- **Severity:** Low — cosmetic/brand. No functional impact. The app is named Celestial but multiple UI strings still reference "Keith" from the memoir shell.
- **Found:** 2026-04-22
- **Summary:** Multiple src files contain memoir-era copy:
  - `src/app/beyond/page.tsx` (metadata description): "Keith's dedicated space for shaping untold stories..."
  - `src/app/journeys/page.tsx`: "Explore Keith's life as either a curated path..."
  - `src/app/profile/highlights/page.tsx`: "Paragraphs you've saved from Keith's stories."
  - `src/app/profile/questions/page.tsx`: "Questions you've asked about Keith's stories..."
  - `src/components/stories/AskAboutStory.tsx`: "A note for Keith", "Write to Keith", "Send to Keith"
  - `src/components/tell/StoryContributionWorkspace.tsx`: "Share a memory about Keith or your family...", "memory about Keith", "Which untold Keith story should we work on today?"
  Fix: global copy sweep replacing Keith-specific copy with Celestial-appropriate equivalents. Requires Paul to define preferred copy for each surface.

---

### [FIX-029] Age Mode System UI Exposed in Adult-Only Celestial App
- **Status:** found
- **Severity:** Low-Medium — the Celestial app is adult fiction only, but `AgeModeSwitcher` is visible in the Nav, Header, and Home page. Journey components (`JourneyProgressBar`, `JourneyReflection`, `JourneyCompleteSummary`) render age-aware copy branches. For adult fiction, presenting `young_reader` mode is inappropriate and confusing.
- **Found:** 2026-04-22
- **Summary:** Age mode infrastructure carried from memoir shell. Components using `useAgeMode()`: `AgeModeSwitcher` (Nav.tsx, Header.tsx, HomePageClient.tsx), `StoriesReadProgress.tsx`, `JourneyProgressBar.tsx`, `JourneyReflection.tsx`, `JourneyCompleteSummary.tsx`, `BodyModeSync.tsx`. Fix: remove `AgeModeSwitcher` from UI surfaces; hardcode `ageMode = "adult"` in journey components (or simplify copy to adult-only variants). The type/infrastructure can remain for potential future use but UI controls must not expose it.

---

### [FIX-022] Duplicate `013_` Migration Prefix
- **Status:** planned
- **Severity:** Low — no functional impact since Supabase tracks migrations by full filename; however, it's confusing naming and could cause issues on fresh deployments if alphabetical ordering ever changes
- **Found:** 2026-04-18
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-022-dual-013-migration.md` *(plan file from Run 7 — recreate if needed)*
- **Summary:** `supabase/migrations/` has both `013_onboarding_flags.sql` and `013_story_corrections.sql`. New migrations should start at `030_`. Add a comment in `013_story_corrections.sql` acknowledging the numbering. Do NOT rename if already applied in production.

---

### [FIX-013] Uncaught Exception in /api/tell/draft When Fenced JSON is Malformed
- **Status:** planned
- **Severity:** Low — Claude rarely returns fenced-but-invalid JSON; contributor sees a broken spinner with no user-friendly message if it occurs
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-013-tell-draft-fenced-json-throw.md` *(recreate if needed)*
- **Summary:** The secondary `JSON.parse(fenced[1])` call in the catch block of `/api/tell/draft/route.ts` is not wrapped in its own try/catch. Fix: wrap in try/catch with same error logging pattern.

---

### [FIX-014] ageMode Not Validated at Runtime in /api/ask
- **Status:** planned
- **Severity:** Low — adult fiction app; all readers should use "adult" mode. If any client sends a non-enum ageMode value, `AGE_MODE_INSTRUCTIONS[ageMode]` silently returns `undefined`.
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-014-agemode-not-validated.md` *(recreate if needed)*
- **Summary:** Add runtime guard after destructuring `ageMode` from request body. Given FIX-029, longer-term fix is to stop accepting ageMode from clients entirely and hardcode `"adult"`. Short-term: default to `"adult"` if value is not a valid AgeMode.

---

### [FIX-016] Tell Page SSE State Mutation (Strict Mode Double-Append Risk)
- **Status:** planned
- **Severity:** Low-Medium — in React Strict Mode (Next.js dev), SSE text chunks may double-append since the state updater mutates the object in-place; violates React immutability contract
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-016-tell-sse-mutation.md` *(recreate if needed)*
- **Summary:** `StoryContributionWorkspace.tsx` `sendMessage()` mutates `last.content += data.text` inside `setMessages`. Port the immutable batch pattern from `ask/page.tsx`.

---

### [FIX-017] Multiple Draft Rows Created for One Tell Session
- **Status:** planned
- **Severity:** Low — produces orphaned draft rows in `cel_story_drafts`; session status stuck at `drafting` when user goes back to chat
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-017-multiple-drafts-per-session.md` *(recreate if needed)*
- **Summary:** Composing a draft, going back to chat, then composing again creates a second `cel_story_drafts` row. Fix: upsert in draft API (update if draft exists for session).

---

## Recently Resolved

### [FIX-025] Paragraph Text Used as React Key on Principle Detail Page
- **Status:** resolved
- **Found:** 2026-04-19 / **Resolved:** 2026-04-19

### [FIX-024] Corpus Cache Invalidation Ineffective in Serverless
- **Status:** resolved
- **Found:** 2026-04-19 / **Resolved:** 2026-04-19

### [FIX-023] Wiki Mirror Publish — Non-Atomic DB Operations
- **Status:** resolved
- **Found:** 2026-04-19 / **Resolved:** 2026-04-19

### [FIX-021] ESLint Errors in Beyond Components
- **Status:** resolved — 0 lint errors since commit `1bf9147`

### [FIX-020] `<img>` ESLint Warnings in StoryMarkdown.tsx
- **Status:** resolved

### [FIX-019] `_history` Unused Parameter Lint Warning in classifier.ts
- **Status:** resolved

### [FIX-018] Uncommitted Changes
- **Status:** resolved

### [FIX-001 through FIX-017] (prior runs)
- **Status:** all resolved except the open FIX-013, FIX-014, FIX-016, FIX-017 which were replanned above
