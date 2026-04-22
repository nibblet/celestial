# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Two categories: enhance existing features, and new features.
> **Context note:** This backlog was reset on 2026-04-22 (Run 9) after the Celestial Phase 1 migration.
> All Keith Cobb memoir-specific ideas from Runs 1–8 have been moved to the Parked section.

## Maturity Levels

- `seed` — 1-2 sentence concept, just identified
- `exploring` — Validated against codebase, feasibility assessed
- `planned` — User stories, technical approach defined
- `ready` — Dev plan written, waiting for Paul to execute
- `parked` — Stale 3+ days or deprioritized / superseded by migration
- `shipped` — Implemented and in production

---

## Category 1: Enhance / Mature / Expand Existing Features

### [IDEA-028] Continuity Diff in Beyond Workspace
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The Phase G `review:ingestion` CLI produces a `continuity-diff` report comparing canon snapshots. This is run from the terminal but has no Beyond UI surface. Adding a read-only panel to the Beyond workspace that loads `content/raw/.continuity/last-snapshot.json` and displays any blocking contradictions (alias_moved, relation_flipped) would give Paul a heads-up before new wiki content goes live. The diff module is pure TypeScript with no DB deps — easy to adapt as a server component.
- **Night Notes:**
  - 2026-04-22 (Run 10): Seeded. `src/lib/wiki/continuity-diff.ts` is fully built and tested. `content/raw/.continuity/last-snapshot.json` exists after running `review:ingestion`. The diff is a pure in-memory operation — no additional infra needed for a read-only display.

---

### [IDEA-025] Wire Celestial Rules into Ask Companion
- **Status:** ready
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-025-rules-in-ask.md`
- **Summary:** 14 rule files now exist in `content/wiki/rules/` (up from 3 in Run 9). Adding a `getRulesContext()` function in `prompts.ts` (analogous to `getPeopleContext()`) and injecting it into `sharedContentBlock()` would make Ask answers about Celestial world mechanics dramatically more accurate. Estimated 35 minutes, pure code — no content changes required.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded. Confirmed `getAllRules()` returns rules. Injection point identified: `sharedContentBlock()` in `perspectives.ts`.
  - 2026-04-22 (Run 10): Advanced to `ready`. Dev plan written. Rules directory has grown from 3 to 14 entries (consent-threshold, directive-cn-24, memory-imprint, resonance-field, plus 10 new). `getRulesContext()` pattern matches existing `getPeopleContext()` exactly. Estimated 35 minutes.

---

### [IDEA-024] Fill in Voice Guide Placeholder
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P1
- **Plan:** *(not yet written)*
- **Summary:** `content/voice.md` is currently a stub template. Every Ask persona system prompt injects whatever is in this file via `getVoiceGuide()`. Filling it with actual Celestial narrative voice guidance is the single highest-impact improvement to Ask quality. Author work, no code.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded. Confirmed `content/voice.md` is a stub. `content/decision-frameworks.md` also a stub. Both are called in every persona prompt.
  - 2026-04-22 (Run 10): Still seed. No code changes needed — this is author content work only.

---

### [IDEA-023] Explore Hub — Fiction Entity Graph
- **Status:** planned
- **Category:** new
- **Seeded:** 2026-04-19
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-023-explore-hub-celestial.md`
- **Summary:** A dedicated `/explore` page with three tabs: Story Arc Map, Entity Map, and Connections. Visualization infrastructure already built. Pure UI assembly + chapter-gating task.
- **Night Notes:**
  - 2026-04-19: Seeded.
  - 2026-04-22 (Run 9): Advanced to `planned`. Dev plan written. Estimated 2.5 hours.
  - 2026-04-22 (Run 10): No change. Still planned, awaiting Paul execution.

---

## Category 2: New Features or Integrations

### [IDEA-029] Reader Arc Progress — Gated BeatTimeline
- **Status:** ready
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-029-reader-arc-progress.md`
- **Summary:** After FIX-032 (BeatTimeline chapter gating), enhance the journey intro page so readers see how many beats they've revealed vs. total, a "N more unlock as you read on" tease, and a subtle checkmark on beats from chapters already read. Builds directly on FIX-032 — requires no new infrastructure.
- **Night Notes:**
  - 2026-04-22 (Run 10): Seeded and immediately advanced to `ready`. FIX-032 is the prerequisite. The data needed (total beats, visible beats, read chapter set) is all available in the journey page after FIX-032 is applied. Estimated 1.25 hours after FIX-032. Dev plan written.

---

### [IDEA-026] Open Threads Reader Panel — Narrative Mysteries Page
- **Status:** exploring
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** A reader-facing `/mysteries` page surfacing unresolved threads from `cel_open_threads`, gated by chapter — only threads opened in unlocked chapters shown. The `listUnresolvedThroughChapter()` function in `threads/repo.ts` already implements the right query. Especially engaging for re-readers who see which threads got resolved.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded. `cel_open_threads` confirmed. No rows yet.
  - 2026-04-22 (Run 10): Advanced to `exploring`. The `listUnresolvedThroughChapter()` query in `src/lib/threads/repo.ts` is the exact right tool. The admin API (`/api/admin/threads`) is the population mechanism (after FIX-030 is applied). A reader page at `/mysteries` would: (1) call `getReaderProgress()`, (2) call `listUnresolvedThroughChapter(supabase, currentChapter)`, (3) render thread cards grouped by kind (mystery / setup / contradiction / gap). Server Component, no client JS needed. Feasibility: high. Blocking: FIX-030 (author must seed threads first). Estimated 1 hour once threads are seeded.

---

### [IDEA-027] Chapter Completion Milestone — "You've Finished the Story"
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P3
- **Plan:** *(not yet written)*
- **Summary:** When a reader marks CH17 as read for the first time, show a fullscreen overlay with a congratulatory message and prompt to enable re-reader mode. `ReadTracker` is the hook point; `PhotoFrameOverlay.tsx` provides the pattern.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded.
  - 2026-04-22 (Run 10): Still seed. Low priority until CH17 content is complete.

---

## Parked

*(Ideas demoted after 3+ days without action, or superseded by Celestial migration.)*

### Memoir-Era Ideas (Parked 2026-04-22 — Superseded by Celestial Migration)

All of the following were designed for the Keith Cobb memoir shell and are no longer applicable in the Celestial fiction companion. Kept for historical reference; do not un-park without explicit author instruction.

- **IDEA-001** Guided Journeys — SHIPPED in memoir shell; carried to Celestial as `/journeys`
- **IDEA-002** Keith's Story Workshop — SHIPPED in memoir shell; maps to Beyond/Tell in Celestial
- **IDEA-003** Age-Aware Suggestion Chips — SHIPPED; age mode system is a FIX-029 legacy remnant
- **IDEA-004** Bookmark a Story as Favorite — SHIPPED in memoir shell; carries to Celestial `/stories/[storyId]`
- **IDEA-005** Reading Time Estimate — SHIPPED; listen time via StoryAudioControls
- **IDEA-006** Featured Story of the Week — Parked 2026-04-16 (memoir context)
- **IDEA-007** Resume Tell Session — SHIPPED in memoir shell
- **IDEA-008** New Stories Feed — Parked 2026-04-17 (memoir context)
- **IDEA-009** Story Voice Playback — SHIPPED; StoryAudioControls carries to Celestial
- **IDEA-010** Public Media Integration — SHIPPED as interview story series
- **IDEA-011** Story Photos — SHIPPED; memoir photos — not applicable to Celestial fiction
- **IDEA-012** Letter to Keith — Parked 2026-04-18 (memoir-specific)
- **IDEA-013** Story Reading Progress — SHIPPED; `cel_story_reads` carries to Celestial
- **IDEA-014** Story Read Progress UI — **SHIPPED** — `ReadBadgeAgeAware` confirmed rendering in `StoriesPageClient.tsx`
- **IDEA-015** Enable Deep Ask — Parked 2026-04-19; multi-persona orchestrator fully implemented, kill-switch via `ENABLE_DEEP_ASK=true`
- **IDEA-016** Save a Passage — SHIPPED; highlights carry to Celestial
- **IDEA-017** Photo Frame Mode — SHIPPED; PhotoFrameOverlay carries to Celestial
- **IDEA-018** Ask from Passage — SHIPPED; `?highlight=` param on Ask page
- **IDEA-019** People Biographical Context in Ask — SHIPPED; getPeopleContext() in prompts.ts
- **IDEA-020** Profile as Reflection Gallery — SHIPPED; cel_profile_reflections
- **IDEA-021** Reading Milestone Celebration (39 memoir stories) — Parked 2026-04-22. Memoir-specific. Celestial equivalent: IDEA-027 (CH17).
- **IDEA-022** Principles Context in Ask — Parked 2026-04-22. Memoir's 12 canonical principles do not map to Celestial. Celestial equivalent: IDEA-025 (Rules in Ask).
