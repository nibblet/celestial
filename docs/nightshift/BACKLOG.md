# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Three focused themes: **ask-forward**, **genmedia**, **post-read-world**.
> **Context note:** This backlog was restructured on 2026-05-01 (Run 17) to adopt the three-theme format. All Category 1/Category 2 ideas that did not fit a theme are now parked.
> Last updated: 2026-05-01 (Run 17)

## Maturity Levels

- `seed` — 1-2 sentence concept, just identified
- `exploring` — Validated against codebase, feasibility assessed
- `planned` — User stories, technical approach defined
- `ready` — Dev plan written, waiting for Paul to execute
- `parked` — Stale 3+ days or deprioritized / out of theme focus
- `shipped` — Implemented and in production

---

## ask-forward

### [IDEA-040] "Ask About This Chapter" Quick-Action on Story Detail Pages
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-04-28
- **Last Updated:** 2026-05-01
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-040-ask-about-this-chapter.md`
- **Summary:** A single "Ask the companion about this chapter →" link-button at the top of every story detail page, pointing to `/ask?story={storyId}`. The Ask page already reads the `?story=` param. This is the most natural reader entry point for the companion. Estimated 0.25 hours.
- **Night Notes:**
  - 2026-04-28 (Run 16): Seeded. Noted that `?story=` param already supported in ask/page.tsx. Implementation is ~8 lines of JSX.
  - 2026-05-01 (Run 17): Advanced to `ready`. Dev plan written. Confirmed: ask/page.tsx reads `?story=` at line 242. `AskAboutStory.tsx` (the `#ask` anchor section) is a legacy author Q&A widget — the new CTA is distinct from it and sits higher on the page. No Ask-page changes needed.

---

### [IDEA-042] Suggested Follow-Up Chips After Each Ask Answer
- **Status:** seed
- **Theme:** ask-forward
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-01
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** After each AI Ask response, render 2–3 contextual suggested follow-up questions as clickable chips directly below the answer bubble. Clicking a chip immediately submits the question. Makes the companion conversational and encourages depth without requiring the reader to think of next questions.
- **Night Notes:**
  - 2026-05-01 (Run 17): Seeded. Two generation strategies: (A) extract from `evidence.linksInAnswer` + infer questions from entity links; (B) prompt the Ask LLM to emit a structured `suggestions` field after the main response as a final SSE event — same pattern as `evidence`. Strategy B is cleaner and reuses the SSE event schema already in place. Display target: a flex row of `<button>` chips between the prose div and `AskSourcesDisclosure` in the messages map (ask/page.tsx ~lines 705–730). Complements IDEA-030 (evidence chips) which was parked but shares the same insertion point.

---

## genmedia

### [IDEA-043] On-Demand Scene Visualization via Ask ("Show Me")
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-01
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When a reader asks "Show me what [X] looks like" or "Illustrate this scene" in the Ask companion, the API detects visual intent (via `ask-intent.ts` classification), triggers the existing visuals pipeline, and streams back an inline image result in the Ask thread as a special message type.
- **Night Notes:**
  - 2026-05-01 (Run 17): Seeded. The visuals pipeline (`corpus-context.ts` → `synthesize-prompt.ts` → `generate-asset.ts`) is fully built and author-accessible. This idea extends it to reader-triggered on-demand generation. Key concerns to address in the dev plan:
    1. **Model/provider:** Imagen 4 (image). Runway Gen-4 for cinematic clips (later phase).
    2. **Cost budget:** ~$0.04–$0.08/image (Imagen 4). Rate-limit: 3 images/reader/hour via existing in-memory sliding window + extend to persist in Supabase for cross-session enforcement. Unauthenticated users: no generation (require sign-in).
    3. **Caching:** Generated images keyed on `seedHashFor(target, style, corpusVersion)` — same as admin path. Shared cache (not user-scoped) since canon visuals are not personalized.
    4. **Spoiler gating of prompt inputs:** With companion-first defaults, all users see all content, so no chapter-level spoiler concern. The visual prompt synthesizer already uses the full corpus context for canon grounding — no additional gating needed.
    5. **Canon grounding:** `corpus-context.ts` selects the most-relevant wiki entity spec from `content/wiki/specs/` + canon dossier blocks + foundational lore. Preset selection: auto-select based on entity type (character → `intimate_crew`, location → `valkyrie_shipboard` or `vault_threshold`, etc.).

---

## post-read-world

### [IDEA-044] Entity Network Explorer at `/explore`
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-01
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** An interactive force-directed graph at `/explore` showing how characters, factions, ships, locations, and vaults are connected via chapter co-appearances and wiki cross-links. Nodes are entity cards; clicking navigates to the entity detail page. All data is in `static-data.ts` + `chapter_tags.json` — no new APIs needed.
- **Night Notes:**
  - 2026-05-01 (Run 17): Seeded. With companion-first, all entities are always visible to all users — no gating needed. Implementation would use React Flow (already in the ecosystem? check package.json) or d3-force (add as dependency). Node size = chapter appearance count (from `chapter_tags.json` entity mention frequency). Edges from: (1) co-occurrence in same chapter tag list; (2) explicit `[[entity-slug]]` cross-links parsed from wiki markdown. Key plan requirements:
    1. **Hidden for locked readers / graceful degradation:** Not applicable — companion-first means all users see all entities. However, the page should work for unauthenticated guests.
    2. **Integration with `show_all_content`:** N/A with companion-first; all content visible regardless.
    3. **Partial-completion edge cases:** N/A with companion-first.

---

## Parked

*(Ideas parked by the 3-day stale rule, out of theme focus, or superseded.)*

### [IDEA-041] Shared `requireAuthor()` Server Auth Helper
- **Status:** parked
- **Seeded:** 2026-04-28
- **Last Updated:** 2026-05-01
- **Summary:** Extract the repeated inline `requireKeith()` / author-role check into a single shared helper. Out of current theme focus. Parked pending future scope.
- **Night Notes:**
  - 2026-04-28 (Run 16): Seeded.
  - 2026-05-01 (Run 17): Out of current theme focus (ask-forward / genmedia / post-read-world). Parked pending future scope.

---

### [IDEA-038] Per-Chapter Character State Reveal on `/characters/[slug]`
- **Status:** parked
- **Seeded:** 2026-04-27
- **Last Updated:** 2026-05-01
- **Summary:** Surface the "Current State By Chapter Boundary" entry from arc files on the character detail page, showing the reader's progress-appropriate state. Fits post-read-world tangentially but stale 3 days.
- **Night Notes:**
  - 2026-04-27 (Run 15): Seeded.
  - 2026-04-28 (Run 16): Advanced to `exploring`. Arc file structure confirmed.
  - 2026-05-01 (Run 17): Stale 3 days — likely low priority or too complex. Demoting to parked. With companion-first, all arc content is visible to all users (author-only gating on arc pages still applies). Un-park when Paul decides whether arc pages should be opened to readers.

---

### [IDEA-036] Wiki Entity Completeness Audit — `/admin/wiki-audit` Page
- **Status:** parked
- **Seeded:** 2026-04-26
- **Last Updated:** 2026-05-01
- **Summary:** Author-accessible browser page surfacing wiki entity completeness failures. Out of current theme focus.
- **Night Notes:**
  - 2026-04-26 (Run 14): Seeded.
  - 2026-05-01 (Run 17): Out of current theme focus. Parked pending future scope. Note: FIX-037 and FIX-034 are now resolved — the immediate driver for this idea is gone.

---

### [IDEA-034] Chapter Arc Progress Indicator on /stories
- **Status:** parked
- **Seeded:** 2026-04-25
- **Last Updated:** 2026-05-01
- **Summary:** Visual "N of 17 chapters read" progress bar above the chapter grid. Dev plan exists. Out of current theme focus.
- **Night Notes:**
  - 2026-04-25 (Run 13): Seeded.
  - 2026-04-27 (Run 15): Advanced to `ready`. Dev plan written.
  - 2026-05-01 (Run 17): Out of current theme focus. Parked pending future scope. Dev plan at `docs/nightshift/plans/DEVPLAN-IDEA-034-chapter-arc-progress-bar.md` remains valid.

---

### [IDEA-033] Mission Timeline Enhancement — In-Universe Dates on /stories/timeline
- **Status:** parked
- **Seeded:** 2026-04-24
- **Last Updated:** 2026-05-01
- **Summary:** Add a "Valkyrie Mission" section to TimelineView showing CH01–CH17 Mission Day + UTC date ranges. Could re-tag to post-read-world.
- **Night Notes:**
  - 2026-04-24 (Run 12): Seeded.
  - 2026-04-26 (Run 14): Advanced to `exploring`.
  - 2026-05-01 (Run 17): Stale 5 days. Demoting to parked. This fits post-read-world but has not been advanced. Un-park when entity explorer (IDEA-044) is shipped — the timeline is a natural companion view.

---

### [IDEA-032] Chapter Tag Quality Gate in StoryDetailsDisclosure
- **Status:** parked
- **Seeded:** 2026-04-24
- **Last Updated:** 2026-05-01
- **Summary:** Gate chapter tag summaries behind `reviewed === true`. All 17 chapters have `reviewed: false`. Out of current theme focus.
- **Night Notes:**
  - 2026-04-24 (Run 12): Seeded.
  - 2026-04-25 (Run 13): Advanced to `planned`. Dev plan at `docs/nightshift/plans/DEVPLAN-IDEA-032-chapter-tag-quality-gate.md`.
  - 2026-05-01 (Run 17): Out of current theme focus. Parked pending future scope. Phase 1 (1-line fix) remains trivial; un-park when Paul wants to run the review CLI.

---

### [IDEA-030] Ask Evidence Inline Citation Chips
- **Status:** parked
- **Seeded:** 2026-04-23
- **Last Updated:** 2026-05-01
- **Summary:** Surface `linksInAnswer` evidence as inline chip pills below the assistant message bubble. Dev plan written. Fits ask-forward theme.
- **Night Notes:**
  - 2026-04-23 (Run 11): Seeded.
  - 2026-04-28 (Run 16): Advanced to `planned`. Dev plan written at `docs/nightshift/plans/DEVPLAN-IDEA-030-ask-evidence-citation-chips.md`.
  - 2026-05-01 (Run 17): Stale 3 days — likely low priority or too complex. Demoting to parked. Fits ask-forward; un-park when IDEA-040 (Ask CTA) ships. IDEA-042 (follow-up chips) supersedes the insertion-point work.

---

### [IDEA-039] "Ask About This Character" Quick-Action on Character Detail Pages
- **Status:** parked
- **Seeded:** 2026-04-27
- **Last Updated:** 2026-05-01
- **Summary:** Button on character pages opening Ask pre-populated with the character name. Fits ask-forward.
- **Night Notes:**
  - 2026-04-27 (Run 15): Seeded.
  - 2026-05-01 (Run 17): Stale 4 days. Demoting to parked. Very similar to IDEA-040 (now ready); un-park after IDEA-040 ships as a natural follow-on.

---

### [IDEA-037] Chapter Recall Mode — Post-Read Comprehension Prompts
- **Status:** parked
- **Seeded:** 2026-04-26
- **Last Updated:** 2026-05-01
- **Summary:** After marking a chapter read, optionally offer 3 short in-world comprehension prompts. Fits ask-forward.
- **Night Notes:**
  - 2026-04-26 (Run 14): Seeded.
  - 2026-05-01 (Run 17): Stale 5 days. Demoting to parked.

---

### [IDEA-028] Continuity Diff in Beyond Workspace
- **Status:** parked
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-27
- **Summary:** Read-only "Continuity Health" panel in Beyond. Dev plan written.
- **Night Notes:**
  - 2026-04-27 (Run 15): Stale 3 days — demoted to parked.
  - 2026-05-01 (Run 17): No change. Out of current theme focus. Dev plan at `docs/nightshift/plans/DEVPLAN-IDEA-028-continuity-diff-beyond-panel.md` remains valid.

---

### [IDEA-025] Wire Celestial Rules into Ask Companion
- **Status:** shipped
- **Seeded:** 2026-04-22
- **Summary:** SHIPPED in Run 11. `getRulesContext()` implemented, 25 rules injected into every Ask prompt with 60k-char budget cap.

---

### [IDEA-023] Explore Hub — Fiction Entity Graph
- **Status:** parked
- **Seeded:** 2026-04-19
- **Last Updated:** 2026-04-27
- **Summary:** Dedicated `/explore` page with Story Arc Map, Entity Map, Connections tabs. Dev plan written. Stale 5 days (as of Run 15).
- **Night Notes:**
  - 2026-04-27 (Run 15): Demoted to parked.
  - 2026-05-01 (Run 17): IDEA-044 (Entity Network Explorer) is a newer, more focused version of this concept in the post-read-world theme. Consider un-parking if IDEA-044 scope expands.

---

### [IDEA-029] Reader Arc Progress — Gated BeatTimeline
- **Status:** parked
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-27
- **Summary:** Progress indicators on journey beats after FIX-032 ships. Dev plan written.
- **Night Notes:**
  - 2026-04-27 (Run 15): Demoted to parked. FIX-032 prerequisite remains unexecuted (parked after companion-first shift).

---

### [IDEA-026] Open Threads Reader Panel — Narrative Mysteries Page
- **Status:** parked
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-27
- **Summary:** Reader-facing `/mysteries` page for unresolved threads gated by chapter. Dev plan written.
- **Night Notes:**
  - 2026-04-27 (Run 15): Demoted to parked. Prerequisite FIX-030 (keith role in threads route) still open (planned, not executed).

---

### [IDEA-027] Chapter Completion Milestone — "You've Finished the Story"
- **Status:** parked
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-25
- **Summary:** Fullscreen overlay when reader marks CH17 complete for first time. Demoted to parked 2026-04-25.

---

### [IDEA-024] Fill in Voice Guide Placeholder
- **Status:** parked
- **Seeded:** 2026-04-22
- **Last Updated:** 2026-04-25
- **Summary:** `content/voice.md` is a stub. Author content work; P1 impact on Ask quality. Out of theme scope. Un-park explicitly when Paul is ready to draft voice guidance.

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
- **IDEA-021** Reading Milestone Celebration (39 memoir stories) — Parked 2026-04-22. Memoir-specific.
- **IDEA-022** Principles Context in Ask — Parked 2026-04-22. Celestial equivalent: IDEA-025 (Rules in Ask — shipped).
