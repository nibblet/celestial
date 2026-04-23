# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Two categories: enhance existing features, and new features.
> **Context note:** This backlog was reset on 2026-04-22 (Run 9) after the Celestial Phase 1 migration.
> All Keith Cobb memoir-specific ideas from Runs 1–8 have been moved to the Parked section.
> Last updated: 2026-04-23 (Run 11)

## Maturity Levels

- `seed` — 1-2 sentence concept, just identified
- `exploring` — Validated against codebase, feasibility assessed
- `planned` — User stories, technical approach defined
- `ready` — Dev plan written, waiting for Paul to execute
- `parked` — Stale 3+ days or deprioritized / superseded by migration
- `shipped` — Implemented and in production

---

## Category 1: Enhance / Mature / Expand Existing Features

### [IDEA-030] Ask Evidence Inline Citation Chips
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-23
- **Last Updated:** 2026-04-23
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The new `ask-evidence.ts` evidence schema extracts `linksInAnswer` (markdown links from the AI response) and `contextSources` (what layers were injected). Currently these only appear in the collapsible evidence debug panel. Surfacing 1–3 inline citation chips in the assistant message bubble itself (e.g. "See: [Vault 002], [The Vessel and the Thread]") would make Ask responses feel grounded and trustworthy for everyday readers without requiring them to expand the panel. The data is already extracted — this is a pure UI change in `ask/page.tsx`.
- **Night Notes:**
  - 2026-04-23 (Run 11): Seeded. `AskMessageEvidence.linksInAnswer` already extracted. `evidence.linksInAnswer.slice(0, 3)` would be the source — show as small pill links below the assistant message bubble.

---

### [IDEA-028] Continuity Diff in Beyond Workspace
- **Status:** exploring
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-23
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The Phase G `review:ingestion` CLI produces a `continuity-diff` report comparing canon snapshots. This is run from the terminal but has no Beyond UI surface. Adding a read-only panel to the Beyond workspace that loads `content/raw/.continuity/last-snapshot.json` and displays any blocking contradictions (alias_moved, relation_flipped) would give Paul a heads-up before new wiki content goes live. The diff module is pure TypeScript with no DB deps — easy to adapt as a server component.
- **Night Notes:**
  - 2026-04-22 (Run 10): Seeded. `src/lib/wiki/continuity-diff.ts` is fully built and tested. `content/raw/.continuity/last-snapshot.json` exists after running `review:ingestion`. The diff is a pure in-memory operation — no additional infra needed for a read-only display.
  - 2026-04-23 (Run 11): Advanced to `exploring`. The new Run 11 commit adds comprehensive audit scripts (`audit-canon-namespaces.ts`, `audit-policies-from-migrations.mjs`) showing a pattern of surface-level auditing being added. Beyond workspace now has a session-wrap panel (`session-wrap.ts`) — the continuity diff panel would naturally sit next to it as a "before-I-write" health check. Approach: Server Component reading `content/raw/.continuity/last-snapshot.json` → call `diffCanonSnapshots(prev, current)` → render `ContradictionCard` list grouped by severity. No DB, no new infra.

---

### [IDEA-025] Wire Celestial Rules into Ask Companion
- **Status:** shipped
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-23
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-025-rules-in-ask.md`
- **Summary:** SHIPPED in Run 11. `getRulesContext()` implemented in `prompts.ts` (lines 147–196), injected into `sharedContentBlock()` in `perspectives.ts` (lines 27, 75, 89–90). All 16 rules now injected into every Ask system prompt with a 10,000-character budget cap. The function caches on first call. Rules are cited by Ask using `[Title](/rules/slug)` markdown links and verified by the new `ask-verifier.ts`.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded. Confirmed `getAllRules()` returns rules. Injection point identified: `sharedContentBlock()` in `perspectives.ts`.
  - 2026-04-22 (Run 10): Advanced to `ready`. Dev plan written.
  - 2026-04-23 (Run 11): **SHIPPED** — `getRulesContext()` added in commit 0ff28dd. Confirmed by grep: `prompts.ts:147` defines the function, `perspectives.ts:27,89-90` injects it.

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

### [IDEA-031] Vault Discovery Map
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-23
- **Last Updated:** 2026-04-23
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The 10 vault entities each have chapter appearance data via `memoirStoryIds`. The `/vaults` index currently shows all vaults as flat cards regardless of reader progress. A "discovery" layer would show vaults as: locked/undiscovered (silhouette, no first appearance chapter reached), known (basic info only, after first appearance chapter), or fully mapped (complete detail, after last appearance chapter). This is a natural sci-fi companion feature — vaults are literally ancient sites being discovered through the plot. Data is all available; this is a UI enhancement to the vaults index page.
- **Night Notes:**
  - 2026-04-23 (Run 11): Seeded. Vault entities now fully populated (10 vaults). FIX-035 (vault story gating) is the prerequisite — after that fix, `memoirStoryIds` + `isStoryUnlocked()` already provide the discovery-state data needed. The `/vaults` index page currently calls `getAllVaults()` with no reader progress. Adding `getReaderProgress()` + a three-state rendering card would complete the feature.

---

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
- **Status:** planned
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-23
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-026-open-threads-mysteries-page.md`
- **Summary:** A reader-facing `/mysteries` page surfacing unresolved threads from `cel_open_threads`, gated by chapter — only threads opened in unlocked chapters shown. The `listUnresolvedThroughChapter()` function in `threads/repo.ts` already implements the right query. Especially engaging for re-readers who see which threads got resolved.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded. `cel_open_threads` confirmed. No rows yet.
  - 2026-04-22 (Run 10): Advanced to `exploring`. Full implementation path identified.
  - 2026-04-23 (Run 11): Advanced to `planned`. Dev plan written. Estimated 1.2 hours. Blocking: FIX-030 (author must be able to seed threads via admin API), though empty state renders correctly before any threads are seeded. `ExploreHubTabs.tsx` is the natural nav home for a future Mysteries tab.

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
