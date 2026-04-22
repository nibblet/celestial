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

### [IDEA-024] Fill in Voice Guide Placeholder
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P1
- **Plan:** *(not yet written)*
- **Summary:** `content/voice.md` is currently a stub template with placeholder text. Every Ask persona system prompt calls `getVoiceGuide()` and injects whatever is in this file. Filling it in with actual Celestial narrative voice guidance — tone, diction, narrator POV, what the guide should sound like — is the single highest-impact improvement to Ask response quality. This is author/content work, not code.
- **Night Notes:**
  - 2026-04-22: Seeded. Confirmed `content/voice.md` is a stub (3-line placeholder). `content/decision-frameworks.md` is also a stub. Both are called in every persona prompt. Author needs to fill both in. No code changes required.

---

### [IDEA-025] Wire Celestial Rules into Ask Companion
- **Status:** exploring
- **Category:** enhance
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** `content/wiki/rules/` has 3 rule concepts (consent-threshold, memory-imprint, resonance-field) parsed by `getAllRules()` in `parser.ts`. These lore rules are not yet in the Ask system prompt. Adding a `getRulesContext()` function in `prompts.ts` (analogous to `getPeopleContext()`) and injecting it into `sharedContentBlock()` would make Ask answers about the Celestial world's governance/physics dramatically more accurate. This is the Celestial equivalent of the memoir's IDEA-022 (Principles in Ask).
- **Night Notes:**
  - 2026-04-22: Seeded. Confirmed `getAllRules()` returns 3 rule concepts. The rules have thesis statements and examples. The `sharedContentBlock()` in `perspectives.ts` would be the injection point. Estimated 20 min.

---

### [IDEA-023] Explore Hub — Fiction Entity Graph
- **Status:** planned
- **Category:** new
- **Seeded:** 2026-04-19
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-023-explore-hub-celestial.md`
- **Summary:** A dedicated `/explore` page with three tabs: Story Arc Map (chapter flow Sankey, gated by reader progress), Entity Map (character/faction-by-chapter grid, locked columns for future chapters), and Connections (cross-entity relation browser). All visualization infrastructure is already built in `graph.ts`, `StorySankey.tsx`, `ThemePrincipleMatrix.tsx`. Pure UI assembly + chapter-gating task.
- **Night Notes:**
  - 2026-04-19: Seeded. Verified viz components and graph data exist. No `/explore` route yet.
  - 2026-04-22: Advanced to `planned`. Dev plan written. Celestial-specific gate logic designed (locked chapter columns, silhouette nodes). Estimated 2.5 hours.

---

## Category 2: New Features or Integrations

### [IDEA-026] Open Threads Reader Panel — Narrative Mysteries Page
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The `cel_open_threads` DB table tracks narrative mysteries, setups, contradictions, and gaps with fields for `opened_in_chapter_id`, `resolved`, and `resolved_in_chapter_id`. No reader-facing UI exists yet. A "Mysteries" or "Open Questions" page would surface unresolved threads (gated: only threads from unlocked chapters shown), giving readers a living list of plot questions to hold while reading. Especially engaging for re-readers who see which threads got resolved.
- **Night Notes:**
  - 2026-04-22: Seeded. `cel_open_threads` table confirmed (migration 026). RLS allows public reads. No rows exist yet (author needs to seed them via Beyond or direct DB insert). UI can be built now; content depends on author populating the table.

---

### [IDEA-027] Chapter Completion Milestone — "You've Finished the Story"
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-22
- **Priority:** P3
- **Plan:** *(not yet written)*
- **Summary:** When a reader marks the final chapter (CH17) as read for the first time, show a fullscreen "You've completed Celestial" overlay — similar to `PhotoFrameOverlay.tsx` — with a brief congratulatory message and a prompt to enable re-reader mode (`show_all_content`). The `ReadTracker` component already fires on every chapter visit; a count query on `cel_story_reads` where `story_id LIKE 'CH%'` after each POST would detect completion. No new DB columns needed.
- **Night Notes:**
  - 2026-04-22: Seeded. `ReadTracker` is the right hook point. `PhotoFrameOverlay.tsx` provides the fullscreen overlay pattern. The `PUT /api/reader/progress` endpoint already handles `showAllContent` toggle — the overlay could link directly to it.

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
- **IDEA-014** Story Read Progress UI — **SHIPPED** — `ReadBadgeAgeAware` confirmed rendering in `StoriesPageClient.tsx` for unlocked chapters with `readSet.has(story.storyId)`
- **IDEA-015** Enable Deep Ask — Parked 2026-04-19; multi-persona orchestrator fully implemented, kill-switch via `ENABLE_DEEP_ASK=true`
- **IDEA-016** Save a Passage — SHIPPED; highlights carry to Celestial
- **IDEA-017** Photo Frame Mode — SHIPPED; PhotoFrameOverlay carries to Celestial
- **IDEA-018** Ask from Passage — SHIPPED; `?highlight=` param on Ask page
- **IDEA-019** People Biographical Context in Ask — SHIPPED; getPeopleContext() in prompts.ts
- **IDEA-020** Profile as Reflection Gallery — SHIPPED; cel_profile_reflections
- **IDEA-021** Reading Milestone Celebration (39 memoir stories) — Parked 2026-04-22. Memoir-specific (39 P1_S* stories). Celestial equivalent: IDEA-027 (Chapter Completion Milestone, CH17).
- **IDEA-022** Principles Context in Ask — Parked 2026-04-22. Memoir's 12 canonical principles do not map directly to Celestial. Celestial equivalent: IDEA-025 (Rules in Ask).
