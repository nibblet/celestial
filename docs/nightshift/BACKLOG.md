# BACKLOG — Keith Cobb Interactive Storybook

> Ideas backlog with maturity tracking. Two categories: enhance existing features, and new features.

## Maturity Levels
- `seed` — 1-2 sentence concept, just identified
- `exploring` — Validated against codebase, feasibility assessed
- `planned` — User stories, technical approach defined
- `ready` — Dev plan written, waiting for Paul to execute
- `parked` — Stale 3+ days or deprioritized
- `shipped` — Implemented and in production

---

## Category 1: Enhance / Mature / Expand Existing Features

### [IDEA-001] Guided Journeys — Curated Paths Through Stories
- **Status:** shipped
- **Category:** enhance
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-14
- **Priority:** P1
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-001-guided-journeys.md`
- **Summary:** Curated, themed paths through the 39 stories with reflection prompts and progress tracking via localStorage.
- **Night Notes:**
  - 2026-04-12: Seeded by Paul. Nightshift wrote the dev plan.
  - 2026-04-14: **SHIPPED.** Four journeys live at `/journeys`. Full UI including progress bar, reflection prompts, completion page.

---

### [IDEA-003] Age-Aware Ask Keith Suggestion Chips
- **Status:** parked
- **Category:** enhance
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-003-age-aware-suggestion-chips.md`
- **Summary:** The 4 suggestion chips on the Ask Keith empty state are hardcoded for adult readers. They should dynamically reflect the active age mode.
- **Night Notes:**
  - 2026-04-12: Seeded. `useAgeMode()` hook already imported.
  - 2026-04-13: Advanced to `ready`. Dev plan written.
  - 2026-04-15: **Stale 3 days — parked.** Plan still valid if revisited (20-min change).

---

### [IDEA-007] Resume Tell Session — Continue an In-Progress Story
- **Status:** shipped
- **Category:** enhance
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-007-resume-tell-session.md`
- **Summary:** "Continue your story" banner on Tell/Beyond pages. Detects in-progress sessions and lets contributors resume mid-conversation.
- **Night Notes:**
  - 2026-04-14: Seeded and advanced to `ready` same night.
  - 2026-04-15: **SHIPPED.** `GET /api/tell/sessions` + `GET /api/tell/sessions/[id]`. Implemented in `StoryContributionWorkspace.tsx`. Works for both tell and beyond modes.

---

### [IDEA-009] Story Voice Playback — Audio Narration
- **Status:** shipped
- **Category:** enhance
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-16
- **Priority:** P1
- **Plan:** *(no dev plan written — Paul implemented directly)*
- **Summary:** Web Speech API TTS on all story pages. Play/Pause/Stop controls, estimated listen time from wordCount. No server cost, no audio files.
- **Night Notes:**
  - 2026-04-14: Seeded by Paul.
  - 2026-04-16: **SHIPPED.** `StoryAudioControls.tsx` + `src/lib/story-audio.ts` confirmed in codebase. Accessible, aria-live status, `useSyncExternalStore` for SSR safety.

---

### [IDEA-013] Story Reading Progress — Track the Journey Through 39 Stories
- **Status:** planned
- **Category:** enhance
- **Seeded:** 2026-04-15
- **Last Updated:** 2026-04-16
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-013-story-reading-progress.md` *(infra portion)*
- **Summary:** Track which of Keith's 39 stories each family member has read. Show progress on profile and read badges on story cards.
- **Night Notes:**
  - 2026-04-15: Seeded and advanced to `planned` same night.
  - 2026-04-16: **Infra SHIPPED** (migration `005_story_reads.sql`, `ReadTracker` on story pages, `/api/stories/[storyId]/read`, Keith analytics dashboard). UI elements (profile progress bar + story card badges) remain. See IDEA-014 for UI plan.

---

### [IDEA-014] Story Read Progress UI — Profile Bar + Story Card Badges
- **Status:** ready
- **Category:** enhance
- **Seeded:** 2026-04-16
- **Last Updated:** 2026-04-16
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-014-story-read-progress-ui.md`
- **Summary:** The read tracking infrastructure is live. This closes the loop: show "X of 39 stories read" progress bar on the user's profile page, and a small "Read" badge on story cards for stories already visited. Estimated 1–1.5 hours.
- **Night Notes:**
  - 2026-04-16: Seeded and advanced to `ready` same night. DB + API + ReadTracker all confirmed working. Only UI elements remain. Plan written.

---

## Category 2: New Features or Integrations

### [IDEA-002] Keith's Story Workshop — Author & Source Material Intake
- **Status:** planned
- **Category:** new
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-14
- **Priority:** P1
- **Plan:** *(full dev plan not yet written)*
- **Summary:** Track 1 (family /tell) and Beyond (Keith's AI-assisted workspace) are shipped. Track 2 (direct markdown authoring by Keith/admin) remains.
- **Night Notes:**
  - 2026-04-12: Seeded by Paul.
  - 2026-04-14: Track 1 SHIPPED as `/tell`. Advanced to `planned`.
  - 2026-04-16: Beyond workspace SHIPPED — Keith can now capture stories via AI-assisted chat AND respond to reader questions. Remaining: admin-facing direct markdown editor for quick story additions without chat.

---

### [IDEA-004] Story Bookmarks — Save Favorites for Easy Return
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** *(not written)*
- **Summary:** Bookmarking with Supabase persistence. Superseded by IDEA-013/014 (reading progress).
- **Night Notes:**
  - 2026-04-15: **Parked** — 3-day stale, superseded by IDEA-013.

---

### [IDEA-008] "New Stories" Feed on Home Page
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-14
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Home page section showing most recent family-contributed stories (from `getPublishedStories()`). Pairs naturally with IDEA-006.
- **Night Notes:**
  - 2026-04-14: Seeded. `getPublishedStories()` already exists. Pure UI addition, no DB changes.

---

### [IDEA-010] Public Media Integration — Podcasts, Videos, and Public Sources
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-14
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Curated "Keith in the World" section — podcasts, YouTube interviews, press coverage. Wiki-curated via `content/wiki/media/` files. No backend.
- **Night Notes:**
  - 2026-04-14: Seeded by Paul.

---

### [IDEA-011] Story Photos — Images That Surface During Reading
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-14
- **Priority:** P1
- **Plan:** *(not yet written)*
- **Summary:** Associate photos with specific stories (via frontmatter). Inline reveal as reader scrolls. Especially powerful in young_reader mode.
- **Night Notes:**
  - 2026-04-14: Seeded by Paul. Timeline already has 14 photos in `public/timeline/`. `ReadingProgressBar` exists and could trigger photo reveals.

---

### [IDEA-012] Letter to Keith — Personal Takeaway from an Ask Conversation
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-15
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** After an Ask conversation, generate a short personal letter (from the user's perspective) summarizing what they learned. Downloadable. Especially meaningful for grandchildren.
- **Night Notes:**
  - 2026-04-15: Seeded. Non-streaming `/api/ask/letter` endpoint reusing conversation messages state.

---

### [IDEA-015] Enable Deep Ask — Multi-Perspective Responses in Production
- **Status:** ready
- **Category:** new
- **Seeded:** 2026-04-16
- **Last Updated:** 2026-04-16
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-015-deep-ask-activation.md`
- **Summary:** The multi-perspective Ask orchestrator (storyteller + principles coach → synthesizer) is fully implemented and feature-flagged via `ENABLE_DEEP_ASK=true`. The classifier now defaults to "deep" for all reflective questions. Activating it requires reviewing the perspective prompts in `perspectives.ts`, testing locally, then setting the env var in Vercel. Estimated 30 min eval + 5 min deploy.
- **Night Notes:**
  - 2026-04-16: Seeded and advanced to `ready` same night. `orchestrator.ts`, `classifier.ts`, `perspectives.ts` all confirmed in codebase. Plan written.

---

## Parked

*(Ideas demoted after 3+ days without action — full entries remain in category sections above with status: parked)*

- **IDEA-003** Age-Aware Suggestion Chips — parked 2026-04-15. Plan at `DEVPLAN-IDEA-003-age-aware-suggestion-chips.md`.
- **IDEA-004** Story Bookmarks — parked 2026-04-15. Superseded by IDEA-013/014.
- **IDEA-005** Reading Time Estimate — parked 2026-04-16. Stale 3 days. `wordCount` exists but Paul has not prioritized. Parked — easy to revisit (30 min, no deps).
- **IDEA-006** Featured Story of the Week — parked 2026-04-16. Stale 3 days. Wiki-first, no DB changes. Parked — revisit when home page refresh is prioritized.
