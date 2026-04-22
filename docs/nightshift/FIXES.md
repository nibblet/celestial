# FIXES — Celestial Interactive Book Companion

> Bug and issue tracker. Updated each nightshift run.
> Numbering continues from Run 9 (last entry was FIX-029).

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

### [FIX-032] BeatTimeline Leaks Locked Chapter Content on Journey Pages
- **Status:** planned
- **Severity:** P0 — chapter content leak via BeatTimeline. Beat summaries/titles contain verbatim story content and character developments from specific locked chapters. A reader at CH01 can see CH11 story content on the journey intro page.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md`
- **Summary:** `src/app/journeys/[slug]/page.tsx` fetches ALL published beats via `listBeatsByJourney()` and passes them unfiltered to `BeatTimeline`. The directive-14 journey has beats for CH08–CH14 with summaries that contain actual story events. Fix: fetch `getReaderProgress()` in the journey page and filter beats to `isStoryUnlocked(beat.chapterId, progress)` before passing to BeatTimeline.

---

### [FIX-031] Fiction Entity Detail Pages Leak Future Chapter IDs
- **Status:** planned
- **Severity:** P1 — chapter-gating gap. Faction/location/artifact detail pages show story IDs from locked chapters without gating. Characters are correctly gated; other entity types are not.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-031-fiction-entity-story-gating.md`
- **Summary:** `FictionEntityDetailPage` in `FictionEntityViews.tsx` renders `memoirStoryIds` and `interviewStoryIds` without `isStoryUnlocked()` filtering. Used by `/factions/[slug]`, `/locations/[slug]`, and `/artifacts/[slug]`. Fix: add `readerProgress` prop to `FictionEntityDetailPage` and filter story IDs before rendering; update the three page files to fetch and pass progress.

---

### [FIX-030] `/api/admin/threads` Checks Stale `'keith'` Role
- **Status:** planned
- **Severity:** Medium — author accounts receive 403 from the new threads admin API (Phase E). Cannot create, list, or resolve narrative threads via API.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-030-threads-route-keith-role.md`
- **Summary:** `src/app/api/admin/threads/route.ts:45` — `requireAdmin()` checks `["admin", "keith"].includes(profile.role)`. Should be `["admin", "author"]`. Same pattern as FIX-027 but in the new Phase E route. Also update the comment on line 19 and a stale comment in `threads/repo.ts`.

---

### [FIX-028] Legacy "Keith" UI Copy — Phase 1 Cleanup Incomplete
- **Status:** found
- **Severity:** Low — cosmetic/brand. No functional impact.
- **Found:** 2026-04-22 (Run 9)
- **Summary:** Scope expanded in Run 10. Full list of Keith references in src/:
  - `src/app/beyond/page.tsx` (metadata description): "Keith's dedicated space for shaping untold stories"
  - `src/app/journeys/page.tsx`: "Explore Keith's life as either a curated path..."
  - `src/app/journeys/[slug]/page.tsx:64` (fallback text): "woven from Keith's memoir stories and interviews" — NEW (Phase F)
  - `src/app/profile/highlights/page.tsx`: "saved from Keith's stories"
  - `src/app/profile/questions/page.tsx`: "asked about Keith's stories"
  - `src/app/admin/drafts/page.tsx:93` (body text): "Keith Beyond drafts" — NEW (Phase E)
  - `src/app/principles/page.tsx:55,57`: "Keith's Principles", "Keith's stories" — NEW
  - `src/app/themes/page.tsx:23`: "Keith's decisions" — NEW
  - `src/app/welcome/page.tsx:10` (metadata description): "A quick tour of the Keith Cobb Storybook" — NEW
  - `src/app/welcome/OnboardingStepper.tsx:60`: "The Keith Cobb Story Library" — NEW
  - `src/components/stories/AskAboutStory.tsx`: "A note for Keith", "Write to Keith", "Send to Keith"
  - `src/components/tell/StoryContributionWorkspace.tsx`: "Share a memory about Keith...", "Which untold Keith story..."
  - `src/lib/beyond/session-wrap.ts:139` (system prompt): "welcoming Keith back to Beyond" — NEW (Phase H)
  - Comments (not rendered): `src/lib/threads/repo.ts:12`, `src/lib/beats/repo.ts:12`
  Fix requires Paul to define preferred copy for each surface. Session-wrap system prompt should use a generic "the author" reference instead of "Keith".

---

### [FIX-029] Age Mode System UI Exposed in Adult-Only Celestial App
- **Status:** found
- **Severity:** Low-Medium — `AgeModeSwitcher` visible in Nav, Header, and Home. Journey components render `young_reader` copy branches. Adult fiction only per spec.
- **Found:** 2026-04-22 (Run 9)
- **Summary:** Age mode infrastructure carried from memoir shell. Fix: remove `AgeModeSwitcher` from UI surfaces; hardcode `ageMode = "adult"` in journey components.

---

### [FIX-027] `/api/admin/ai-activity` Checks Stale `'keith'` Role
- **Status:** planned
- **Severity:** Medium — author accounts get 403 from the AI activity dashboard
- **Found:** 2026-04-22 (Run 9)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-027-ai-activity-route-keith-role.md`
- **Summary:** `src/app/api/admin/ai-activity/route.ts:31` checks `["admin", "keith"].includes(profile.role)`. Should be `["admin", "author"]`. One-line fix.

---

### [FIX-026] Stale `role = 'keith'` in RLS Policies (Migrations 025–028)
- **Status:** planned
- **Severity:** Medium — author accounts cannot write to `cel_open_threads`, `cel_chapter_scenes`, or `cel_beats`
- **Found:** 2026-04-22 (Run 9)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-026-stale-keith-role-rls.md`
- **Summary:** Migrations 025–028 check `p.role = 'keith'` in RLS policies. Fix: new migration 030 drops and recreates policies with `p.role = 'author'`.

---

### [FIX-022] Duplicate `013_` Migration Prefix
- **Status:** planned
- **Severity:** Low — no functional impact
- **Found:** 2026-04-18 (Run 7)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-022-dual-013-migration.md` *(recreate if needed)*
- **Summary:** Two migrations with `013_` prefix. New migrations start at `030_`. Documentation-only fix.

---

### [FIX-013] Uncaught Exception in /api/tell/draft When Fenced JSON is Malformed
- **Status:** planned
- **Severity:** Low
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-013-tell-draft-fenced-json-throw.md` *(recreate if needed)*
- **Summary:** Secondary `JSON.parse(fenced[1])` in catch block of `/api/tell/draft/route.ts` not wrapped in try/catch.

---

### [FIX-014] ageMode Not Validated at Runtime in /api/ask
- **Status:** planned
- **Severity:** Low — adult fiction app; invalid ageMode silently returns undefined
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-014-agemode-not-validated.md` *(recreate if needed)*

---

### [FIX-016] Tell Page SSE State Mutation (Strict Mode Double-Append Risk)
- **Status:** planned
- **Severity:** Low-Medium
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-016-tell-sse-mutation.md` *(recreate if needed)*

---

### [FIX-017] Multiple Draft Rows Created for One Tell Session
- **Status:** planned
- **Severity:** Low
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-017-multiple-drafts-per-session.md` *(recreate if needed)*

---

## Recently Resolved

### [FIX-025] Paragraph Text Used as React Key on Principle Detail Page
- **Status:** resolved / **Resolved:** 2026-04-19

### [FIX-024] Corpus Cache Invalidation Ineffective in Serverless
- **Status:** resolved / **Resolved:** 2026-04-19

### [FIX-023] Wiki Mirror Publish — Non-Atomic DB Operations
- **Status:** resolved / **Resolved:** 2026-04-19

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
