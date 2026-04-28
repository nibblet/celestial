# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Two categories: enhance existing features, and new features.
> **Context note:** This backlog was reset on 2026-04-22 (Run 9) after the Celestial Phase 1 migration.
> All Keith Cobb memoir-specific ideas from Runs 1–8 have been moved to the Parked section.
> Last updated: 2026-04-28 (Run 16)

## Maturity Levels

- `seed` — 1-2 sentence concept, just identified
- `exploring` — Validated against codebase, feasibility assessed
- `planned` — User stories, technical approach defined
- `ready` — Dev plan written, waiting for Paul to execute
- `parked` — Stale 3+ days or deprioritized / superseded by migration
- `shipped` — Implemented and in production

---

## Category 1: Enhance / Mature / Expand Existing Features

### [IDEA-041] Shared `requireAuthor()` Server Auth Helper
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-28
- **Last Updated:** 2026-04-28
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Extract the repeated inline `requireKeith()` / author-role check into a single shared helper at `src/lib/auth/require-author.ts`. Five visuals routes + two existing admin routes all paste the same ~15 lines of Supabase auth boilerplate. A shared helper prevents the FIX-043 recurrence pattern (new route forgets to update role string) and makes the Celestial author role a single source of truth.
- **Night Notes:**
  - 2026-04-28 (Run 16): Seeded in response to FIX-043 (five visuals routes using stale `'keith'` role) and FIX-027/FIX-030 (two earlier admin routes with same bug). A shared `requireAuthor()` helper would return `{ userId }` on success or `{ error, status }` on auth failure — identical interface to the current inline pattern, making the swap mechanical. Estimated 30 min: create helper, replace in 7 files.

---

### [IDEA-038] Per-Chapter Character State Reveal on `/characters/[slug]`
- **Status:** exploring
- **Category:** enhance
- **Seeded:** 2026-04-27
- **Last Updated:** 2026-04-28
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** After FIX-041 gates arc pages to authors only, readers lose visibility into character development beyond the starting state excerpt. A better UX: surface the character's "Current State By Chapter Boundary" entry for the reader's progress on the character detail page — "After CH05: ALARA is no longer only a compliant system" — so readers see only the state earned by their reading. Each arc file has a `## Current State By Chapter Boundary` markdown table with per-boundary reader-safe state descriptions.
- **Night Notes:**
  - 2026-04-27 (Run 15): Seeded. Depends on FIX-041 (arc gating). The `character-arcs.ts` parser currently extracts `startingState`, `unresolvedTensions`, `futureQuestions`, and `askGuidance` via `extractSectionBlock` — a new `currentStateByChapter` field needs to be extracted and parsed into a `{ boundary: string; readerSafeState: string }[]` array. Rendering target: `CharacterArcPanel` in `characters/[slug]/page.tsx` — replace the starting state excerpt with the highest chapter boundary ≤ `currentChapterNumber`. This gives readers a spoiler-safe, progress-gated character state summary. Estimated 1.5 hours.
  - 2026-04-28 (Run 16): Advanced to `exploring`. Confirmed implementation path: (1) Arc files (`content/wiki/arcs/characters/*.md`) each have a `## Current State By Chapter Boundary` section with a markdown table in `| After CHxx | Reader-Safe State |` format. All 9 arc files share this structure. (2) `character-arcs.ts:50` calls `extractSectionBlock(content, "Starting State")` — same function can extract "Current State By Chapter Boundary" as a raw string. (3) Parse the table with regex: `/^\|\s*(After CH(\d+))\s*\|\s*(.*?)\s*\|$/gm` → `{ chapterNumber: number; state: string }[]`. (4) In `CharacterArcPanel` (line 242 of characters/[slug]/page.tsx), the `arc.startingState` excerpt is rendered — replace with the highest `chapterNumber ≤ readerProgress.currentChapterNumber` entry, or fall back to `startingState` for CH00. (5) `readerProgress` is already available on the page (used for story ref filtering on lines 139, 181). No new API or DB needed. Spoiler safety: the boundary table rows are explicitly labelled "Reader-Safe State" — designed for this exact use. Estimated 1.5 hours.

---

### [IDEA-036] Wiki Entity Completeness Audit — `/admin/wiki-audit` Page
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-26
- **Last Updated:** 2026-04-26
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** An author-accessible `/admin/wiki-audit` page that surfaces wiki entity completeness failures in the browser: entities missing `**Status:**`, `**Superset:**`, `**Subkind:**`, or other required lore fields. The test suite (`canon-integrity.test.ts`) already validates these rules and identifies exact file paths + field names. Surfacing the same checks live (server-side scan on page load) removes the friction of running tests to find content gaps.
- **Night Notes:**
  - 2026-04-26 (Run 14): Seeded. `npm test` has 3 persistent failures (FIX-034, FIX-037) from exactly these checks — test output already identifies the offending files. A live browser view would let Paul fix these between Nightshift runs without needing a terminal. Gate with `hasAuthorSpecialAccess()`. No new infra — pure read/scan of content/ directory at request time.

---

### [IDEA-034] Chapter Arc Progress Indicator on /stories
- **Status:** ready
- **Category:** enhance
- **Seeded:** 2026-04-25
- **Last Updated:** 2026-04-27
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-034-chapter-arc-progress-bar.md`
- **Summary:** Add a visual "N of 17 chapters read" progress bar above the chapter grid on `/stories`. All data is already in `StoriesPageClient` props. Dev plan written: Phase 1 is a pure JSX addition (~20 lines), no new API, no DB. Estimated 0.5 hours.
- **Night Notes:**
  - 2026-04-25 (Run 13): Seeded.
  - 2026-04-26 (Run 14): Advanced to `exploring`. Confirmed all three reader paths handled cleanly via existing props.
  - 2026-04-27 (Run 15): Advanced to `ready`. Dev plan written. Implementation is a single JSX block above the chapter grid in `StoriesPageClient.tsx`.

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
- **Status:** planned
- **Category:** enhance
- **Seeded:** 2026-04-23
- **Last Updated:** 2026-04-28
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-030-ask-evidence-citation-chips.md`
- **Summary:** The `ask-evidence.ts` evidence schema extracts `linksInAnswer` (markdown links from the AI response). Currently these only appear in the collapsible evidence debug panel. Surfacing 1–3 inline citation chip pills directly below the assistant message bubble makes answers feel grounded for everyday readers without requiring panel expansion. Dev plan written.
- **Night Notes:**
  - 2026-04-23 (Run 11): Seeded. `AskMessageEvidence.linksInAnswer` already extracted.
  - 2026-04-25 (Run 13): Advanced to `exploring`. Confirmed data flow: evidence arrives as final SSE event; `msg.evidence.linksInAnswer` available on each completed assistant message object in ask/page.tsx.
  - 2026-04-28 (Run 16): Advanced to `planned`. Dev plan written. Confirmed exact insertion point in `messages.map` (lines ~705–730 of ask/page.tsx) between the prose div and `AskSourcesDisclosure`. Phase 1 is ~20 lines of JSX; Phase 2 removes the duplicate "Links in this answer" block from inside the disclosure panel. Estimated 0.75 hours.

---

### [IDEA-028] Continuity Diff in Beyond Workspace
- **Status:** parked
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-27
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-028-continuity-diff-beyond-panel.md`
- **Summary:** A read-only "Continuity Health" panel in the Beyond author workspace that diffs the canon snapshot against live wiki state and shows blocking contradictions. Pure Server Component, no new infra. Dev plan written (1.5 hours).
- **Night Notes:**
  - 2026-04-22 (Run 10): Seeded.
  - 2026-04-23 (Run 11): Advanced to `exploring`.
  - 2026-04-24 (Run 12): Advanced to `planned`. Dev plan written.
  - 2026-04-27 (Run 15): Stale 3 days — likely low priority or too complex. Demoting to parked. Dev plan at DEVPLAN-IDEA-028 remains valid — un-park when Paul is ready to add to Beyond workspace.

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
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-19
- **Last Updated:** 2026-04-27
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-023-explore-hub-celestial.md`
- **Summary:** A dedicated `/explore` page with three tabs: Story Arc Map, Entity Map, and Connections. Dev plan written. Estimated 2.5 hours.
- **Night Notes:**
  - 2026-04-19: Seeded.
  - 2026-04-22 (Run 9): Advanced to `planned`. Dev plan written.
  - 2026-04-22 (Run 10): No change.
  - 2026-04-27 (Run 15): Stale 5 days — likely low priority or too complex. Demoting to parked. Un-park when higher-priority fixes (P0/P1 gating) are cleared.

---

## Category 2: New Features or Integrations

### [IDEA-040] "Ask About This Chapter" Quick-Action on Story Detail Pages
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-28
- **Last Updated:** 2026-04-28
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Add an "Ask about this chapter" button on `/stories/[storyId]` that opens Ask pre-populated with the chapter slug — the most natural reader entry point for Ask (right after finishing a chapter). Readers currently must navigate away to `/ask` and manually type. The `storySlug` would be pre-set, giving Ask full chapter scene context. Complements IDEA-039 (character-scoped Ask).
- **Night Notes:**
  - 2026-04-28 (Run 16): Seeded. Implementation path: add a Link at the bottom of the chapter detail page pointing to `/ask?storySlug=CH07-narrative-tide` (or similar). Ask page already reads `storySlug` from query params via the `highlight` pattern. Check if `storySlug` query param is read; if not, a 1-line addition to the Ask page param reader wires it. The button itself is ~5 lines on the story detail page. Very low complexity — potentially combinable into a single 30-min session with IDEA-032 or IDEA-034.

---

### [IDEA-039] "Ask About This Character" Quick-Action on Character Detail Pages
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-27
- **Last Updated:** 2026-04-27
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** An "Ask about [Character]" button on `/characters/[slug]` that opens Ask pre-populated with the character name and scoped to the character's arc ledger filtered by reader progress. Currently Ask injects ALL 9 arcs into every prompt; a character-focused entry point could route to Ask with `?message=Tell+me+about+ALARA&character=alara` and a future API path that injects only the relevant arc + character wiki, reducing prompt size and improving answer focus. Spoiler safety: only arc sections up to the reader's chapter boundary are injected (integrates with IDEA-038 arc state gating).
- **Night Notes:**
  - 2026-04-27 (Run 15): Seeded. Depends on FIX-041 (arc page gating) and FIX-042 (arc context pruning). The `?highlight=` param pattern (from memoir's "Ask from Passage" feature) shows how Ask can be pre-seeded from other pages. Implementation path: (1) add a query-param reader to `ask/page.tsx` that pre-fills the message input; (2) optionally pass `characterSlug` param to Ask API for narrowed arc context. Step 1 alone (pre-fill) is useful and requires no API change. Estimated 1.5 hours for full implementation with arc scoping.

---

### [IDEA-037] Chapter Recall Mode — Post-Read Comprehension Prompts
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-26
- **Last Updated:** 2026-04-26
- **Priority:** P3
- **Plan:** *(not yet written)*
- **Summary:** After a reader marks a chapter as read, optionally offer 3 short in-world comprehension prompts ("What was Amar-Cael's goal in this chapter?", "Name one decision that surprised you") generated on-demand by the Ask AI. Responses are ephemeral — the value is in the reader's reflection process, not storing their answers. The chapter body + mission logs are already fed to the AI via the Ask pipeline; this feature just surfaces a new entry point. Gated naturally: the chapter must already be unlocked to trigger it.
- **Night Notes:**
  - 2026-04-26 (Run 14): Seeded. Trigger point: after `markStoryRead()` succeeds in `StoriesPageClient.tsx`, show a small "Want a quick recall check?" CTA that opens a modal. Modal fetches 3 prompts from a new `/api/stories/[storyId]/recall-prompts` endpoint (author-controlled, AI-generated, cached once per chapter hash). Spoiler safety: prompts generated from only the unlocked chapter's content. Estimated 3 hours (new API route + modal UI + caching). Depends on FIX-036 and IDEA-032 being shipped first.

---

### [IDEA-033] Mission Timeline Enhancement — In-Universe Dates on /stories/timeline
- **Status:** exploring
- **Category:** new
- **Seeded:** 2026-04-24
- **Last Updated:** 2026-04-26
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The new `getMissionTimelineContext()` function (commit `145a753`) produces a compact Mission Day + UTC date range per chapter from `content/raw/mission_logs_inventory.json`. `/stories/timeline` already exists but shows only publication ordering. Surfacing in-universe dates alongside chapters ("CH01 — Mission Days 1–42, Oct 2050") would ground the reading experience in the sci-fi setting and give readers a temporal anchor. The new `content/wiki/timeline/prologue.md` adds pre-Valkyrie world events (12000 BCE → 2050 CE) that could appear above CH01 as a "Before Valkyrie" section. All data is already on disk; this is a UI enhancement to the timeline view.
- **Night Notes:**
  - 2026-04-24 (Run 12): Seeded. `getMissionTimelineContext()` in `prompts.ts` (lines 218–308) already parses mission logs into a per-chapter date table. `content/wiki/timeline/prologue.md` has pre-Valkyrie entries formatted as `- **YEAR** — Event`. `src/components/timeline/TimelineView.tsx` is the render target.
  - 2026-04-26 (Run 14): Advanced to `exploring`. Confirmed architecture: `TimelineView.tsx` (199 lines) is a Server Component that calls `getTimeline()` (career-timeline.md — legacy memoir) and `getPrologueTimeline()` (prologue.md — pre-Valkyrie). Neither reads `mission_logs_inventory.json` or applies chapter gating. Enhancement plan: (1) add a third data source — chapter timeline entries derived from `getMissionLogInventory()` (already gated by `isStoryUnlocked` at the missions page level); (2) render a new "Valkyrie Mission" section in `TimelineView` showing "CH01 — Mission Days X–Y, Month YYYY" rows, gated by reader progress. Spoiler concern: **chapter-gated** — only unlocked chapters' mission rows shown. `TimelineView` needs to become an async Server Component to call `getReaderProgress()`. Estimated 1.5 hours.

---

### [IDEA-029] Reader Arc Progress — Gated BeatTimeline
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-27
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-029-reader-arc-progress.md`
- **Summary:** After FIX-032 (BeatTimeline chapter gating), enhance journey intro page beats with progress indicators. Dev plan written. 1.25 hours after FIX-032 ships.
- **Night Notes:**
  - 2026-04-22 (Run 10): Seeded and advanced to `ready`. FIX-032 is the prerequisite.
  - 2026-04-27 (Run 15): Stale 5 days — likely low priority or too complex. Demoting to parked. FIX-032 (the prerequisite) is still unexecuted. Un-park after FIX-032 ships.

---

### [IDEA-026] Open Threads Reader Panel — Narrative Mysteries Page
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-27
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-026-open-threads-mysteries-page.md`
- **Summary:** A reader-facing `/mysteries` page surfacing unresolved threads, gated by chapter. Dev plan written. Estimated 1.2 hours. Blocking: FIX-030 (keith role fix).
- **Night Notes:**
  - 2026-04-22 (Run 9): Seeded.
  - 2026-04-23 (Run 11): Advanced to `planned`. Dev plan written.
  - 2026-04-27 (Run 15): Stale 4 days — likely low priority or too complex. Demoting to parked. Un-park after FIX-030 ships.

---


## Parked

*(Ideas demoted after 3+ days without action, or superseded by Celestial migration.)*

### [IDEA-035] Author Chapter Review Dashboard — `/admin/chapter-review`
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-25
- **Last Updated:** 2026-04-28
- **Priority:** P2
- **Summary:** Browser-based `/admin/chapter-review` page for approving chapter tags. Depends on IDEA-032 Phase 1. Stale 3 days — demoting to parked.
- **Night Notes:**
  - 2026-04-25 (Run 13): Seeded. Depends on IDEA-032 Phase 1 shipping.
  - 2026-04-28 (Run 16): Stale 3 days — likely low priority or too complex. Demoting to parked. Un-park after IDEA-032 Phase 1 ships.

### [IDEA-031] Vault Discovery Map
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-23
- **Last Updated:** 2026-04-26
- **Priority:** P2
- **Summary:** The 10 vault entities each have chapter appearance data via `memoirStoryIds`. A "discovery" layer for the `/vaults` index would show vaults as: undiscovered (silhouette), known (basic info), or fully mapped (complete detail) based on chapter progress.
- **Night Notes:**
  - 2026-04-23 (Run 11): Seeded. FIX-035 (vault story gating) is the prerequisite.
  - 2026-04-26 (Run 14): Stale 3 days — likely low priority or too complex. Demoting to parked. FIX-035 (the prerequisite) is still unexecuted. Un-park after FIX-035 ships.

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
