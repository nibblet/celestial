# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Two categories: enhance existing features, and new features.
> **Context note:** This backlog was reset on 2026-04-22 (Run 9) after the Celestial Phase 1 migration.
> All Keith Cobb memoir-specific ideas from Runs 1–8 have been moved to the Parked section.
> Last updated: 2026-04-25 (Run 13)

## Maturity Levels

- `seed` — 1-2 sentence concept, just identified
- `exploring` — Validated against codebase, feasibility assessed
- `planned` — User stories, technical approach defined
- `ready` — Dev plan written, waiting for Paul to execute
- `parked` — Stale 3+ days or deprioritized / superseded by migration
- `shipped` — Implemented and in production

---

## Category 1: Enhance / Mature / Expand Existing Features

### [IDEA-034] Chapter Arc Progress Indicator on /stories
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-25
- **Last Updated:** 2026-04-25
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Add a visual "N of 17 chapters read" progress bar or badge at the top of the `/stories` chapter library page. The data is already available via `getReaderProgress()` — `currentChapterNumber` gives chapters read. A slim progress bar (sci-fi styling: segmented, neon accent) above the chapter grid would give readers a clear sense of their arc position without modifying any gating logic. The re-reader variant would show "17/17" with a "Full access — re-reader mode" label.
- **Night Notes:**
  - 2026-04-25 (Run 13): Seeded. `src/app/stories/page.tsx` uses `StoriesPageClient`. Progress data available from `useReaderProgress()` hook or server-side from `getReaderProgress()`. Display target: above the chapter grid in `StoriesPageClient`. Guest-cookie path: cookie-based progress still gives a valid chapter number.

---

### [IDEA-032] Chapter Tag Quality Gate in StoryDetailsDisclosure
- **Status:** planned
- **Category:** enhance
- **Seeded:** 2026-04-24
- **Last Updated:** 2026-04-25
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-032-chapter-tag-quality-gate.md`
- **Summary:** Gate `chapterTags.summary` display in `StoryDetailsDisclosure` behind `chapterTags.reviewed === true`. All 17 chapters currently have `reviewed: false`. Also add `scripts/review-chapter-tags.ts` — an interactive CLI for Paul to approve/skip/edit each AI summary. Themes tags are not gated (they're structural, not narrative prose). Dev plan written.
- **Night Notes:**
  - 2026-04-24 (Run 12): Seeded. `StoryDetailsDisclosure.tsx` line ~87 renders `{chapterTags && chapterTags.summary && <p>…</p>}`. Should be `{chapterTags && chapterTags.reviewed && chapterTags.summary && …}`.
  - 2026-04-25 (Run 13): Advanced to `planned`. Confirmed all 17 chapter_tags entries have `reviewed: false` (0 reviewed). Gate would hide all summaries until Paul runs the review script. Dev plan written: Phase 1 is a 1-line fix, Phase 2 adds the review CLI. Estimated 0.75 hours.

---

### [IDEA-030] Ask Evidence Inline Citation Chips
- **Status:** exploring
- **Category:** enhance
- **Seeded:** 2026-04-23
- **Last Updated:** 2026-04-25
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The `ask-evidence.ts` evidence schema extracts `linksInAnswer` (markdown links from the AI response) and `contextSources` (what layers were injected). Currently these only appear in the collapsible evidence debug panel. Surfacing 1–3 inline citation chips in the assistant message bubble itself (e.g. "See: [Vault 002], [The Vessel and the Thread]") would make Ask responses feel grounded and trustworthy for everyday readers without requiring them to expand the panel.
- **Night Notes:**
  - 2026-04-23 (Run 11): Seeded. `AskMessageEvidence.linksInAnswer` already extracted. `evidence.linksInAnswer.slice(0, 3)` would be the source — show as small pill links below the assistant message bubble.
  - 2026-04-25 (Run 13): Advanced to `exploring`. Confirmed the data flow: `verifyAskAnswer()` returns an `AskMessageEvidence` object with `linksInAnswer: AskEvidenceLink[]`. Each link has `{ text: string; href: string; resolvedKind: string | null }`. The evidence is streamed back to the client as a final SSE event (`data: {...evidence...}`). In `ask/page.tsx`, the `evidence` state is set in the message object. The citation chips would live in `AssistantMessageBubble` (or similar component) — rendered only when `evidence.linksInAnswer.length > 0`. Spoiler safety: `linksInAnswer` is extracted from the AI's own text, which is already gated by the `visibleStories` catalog. No additional gating needed. Estimated 1 hour.

---

### [IDEA-028] Continuity Diff in Beyond Workspace
- **Status:** planned
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-24
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-028-continuity-diff-beyond-panel.md`
- **Summary:** A read-only "Continuity Health" panel in the Beyond author workspace that diffs the canon snapshot against live wiki state and shows blocking contradictions (alias_moved, relation_flipped, entity_vanished, chapter_theme_changed). Pure Server Component reading from existing files — no new infra, no DB changes. Estimated 1.5 hours.
- **Night Notes:**
  - 2026-04-22 (Run 10): Seeded. `src/lib/wiki/continuity-diff.ts` is fully built and tested. `content/raw/.continuity/last-snapshot.json` exists after running `review:ingestion`. The diff is a pure in-memory operation — no additional infra needed for a read-only display.
  - 2026-04-23 (Run 11): Advanced to `exploring`. The new Run 11 commit adds comprehensive audit scripts (`audit-canon-namespaces.ts`, `audit-policies-from-migrations.mjs`) showing a pattern of surface-level auditing being added. Beyond workspace now has a session-wrap panel (`session-wrap.ts`) — the continuity diff panel would naturally sit next to it as a "before-I-write" health check. Approach: Server Component reading `content/raw/.continuity/last-snapshot.json` → call `diffCanonSnapshots(prev, current)` → render `ContradictionCard` list grouped by severity. No DB, no new infra.
  - 2026-04-24 (Run 12): Advanced to `planned`. Dev plan written (DEVPLAN-IDEA-028). Estimated 1.5 hours. Prerequisite: check whether `buildCanonSnapshot` is exported from `continuity-diff.ts` before Phase 2; if not, adjust to use `canon_entities.json` comparison.

---

### [IDEA-025] Wire Celestial Rules into Ask Companion
- **Status:** shipped
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-23
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-025-rules-in-ask.md`
- **Summary:** SHIPPED in Run 11. `getRulesContext()` implemented in `prompts.ts` (lines 147–196), injected into `sharedContentBlock()` in `perspectives.ts` (lines 27, 75, 89–90). All 25 rules (up from 16 in Run 11) now injected into every Ask system prompt with a 60 000-character budget cap (raised from 18k in Run 12 to accommodate 9 new Series Bible rules).
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded.
  - 2026-04-22 (Run 10): Advanced to `ready`. Dev plan written.
  - 2026-04-23 (Run 11): **SHIPPED**
  - 2026-04-24 (Run 12): Budget cap raised from 18k → 60k chars in commit `145a753` to accommodate 9 new Series Bible rules (total 25). `RULES_CONTEXT_MAX_CHARS = 60_000` in `prompts.ts`.

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

### [IDEA-035] Author Chapter Review Dashboard — `/admin/chapter-review`
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-25
- **Last Updated:** 2026-04-25
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** A browser-based review page at `/admin/chapter-review` (author-gated) that renders each chapter's AI-generated summary and entity tags, with an "Approve" button that sets `reviewed: true` in `chapter_tags.json` via a server action. Companion to IDEA-032 (quality gate) — provides a more ergonomic review UX than the CLI script planned in DEVPLAN-IDEA-032. Works by reading `chapter_tags.json` at request time, rendering each unreviewed entry as a card with the full summary and tag lists, and calling a server action to write the `reviewed` flag back to the JSON file.
- **Night Notes:**
  - 2026-04-25 (Run 13): Seeded. Depends on IDEA-032 Phase 1 shipping (the gate must be in place for this to have purpose). Key concern: `chapter_tags.json` is a generated file — if `scripts/tag-chapter-entities.ts` is re-run, `reviewed` flags would be reset. The review dashboard should include a warning about this. Implementation: Server Component reads the JSON, Client Component handles the approve interaction via `use server` action writing the file. Author-gated via `hasAuthorSpecialAccess()`.

---

### [IDEA-033] Mission Timeline Enhancement — In-Universe Dates on /stories/timeline
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-24
- **Last Updated:** 2026-04-24
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The new `getMissionTimelineContext()` function (commit `145a753`) produces a compact Mission Day + UTC date range per chapter from `content/raw/mission_logs_inventory.json`. `/stories/timeline` already exists but shows only publication ordering. Surfacing in-universe dates alongside chapters ("CH01 — Mission Days 1–42, Oct 2050") would ground the reading experience in the sci-fi setting and give readers a temporal anchor. The new `content/wiki/timeline/prologue.md` adds pre-Valkyrie world events (12000 BCE → 2050 CE) that could appear above CH01 as a "Before Valkyrie" section. All data is already on disk; this is a UI enhancement to the timeline view.
- **Night Notes:**
  - 2026-04-24 (Run 12): Seeded. `getMissionTimelineContext()` in `prompts.ts` (lines 218–308) already parses mission logs into a per-chapter date table. `content/wiki/timeline/prologue.md` has pre-Valkyrie entries formatted as `- **YEAR** — Event`. `src/components/timeline/TimelineView.tsx` is the render target.

---

### [IDEA-031] Vault Discovery Map
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-23
- **Last Updated:** 2026-04-23
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The 10 vault entities each have chapter appearance data via `memoirStoryIds`. The `/vaults` index currently shows all vaults as flat cards regardless of reader progress. A "discovery" layer would show vaults as: locked/undiscovered (silhouette, no first appearance chapter reached), known (basic info only, after first appearance chapter), or fully mapped (complete detail, after last appearance chapter). This is a natural sci-fi companion feature — vaults are literally ancient sites being discovered through the plot. Data is all available; this is a UI enhancement to the vaults index page.
- **Night Notes:**
  - 2026-04-23 (Run 11): Seeded. Vault entities now fully populated (10 vaults). FIX-035 (vault story gating) is the prerequisite — after that fix, `memoirStoryIds` + `isStoryUnlocked()` already provide the discovery-state data needed.

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
  - 2026-04-22 (Run 10): Seeded and immediately advanced to `ready`. FIX-032 is the prerequisite. Estimated 1.25 hours after FIX-032. Dev plan written.

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
  - 2026-04-22 (Run 9): Seeded.
  - 2026-04-22 (Run 10): Advanced to `exploring`.
  - 2026-04-23 (Run 11): Advanced to `planned`. Dev plan written. Estimated 1.2 hours. Blocking: FIX-030 (author must be able to seed threads via admin API).

---


## Parked

*(Ideas demoted after 3+ days without action, or superseded by Celestial migration.)*

### [IDEA-027] Chapter Completion Milestone — "You've Finished the Story"
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-25
- **Priority:** P3
- **Summary:** Fullscreen overlay when reader marks CH17 as read for the first time; prompt to enable re-reader mode.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded.
  - 2026-04-22 (Run 10): Still seed.
  - 2026-04-25 (Run 13): Stale 3 days — likely low priority or too complex. Demoting to parked.

### [IDEA-024] Fill in Voice Guide Placeholder
- **Status:** parked
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-25
- **Priority:** P1
- **Summary:** `content/voice.md` is a stub template. Filling it with Celestial narrative voice guidance is the highest-impact improvement to Ask quality — pure author content work, no code.
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded. Confirmed `content/voice.md` is a stub.
  - 2026-04-25 (Run 13): Stale 3 days — likely low priority or too complex. Demoting to parked. Note: this is actually P1 author content work, not a code task. Un-park explicitly when Paul is ready to draft voice guidance.

---

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
