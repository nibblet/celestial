# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Three focused themes: **ask-forward**, **genmedia**, **post-read-world**.
> **Context note:** This backlog was restructured on 2026-05-01 (Run 17) to adopt the three-theme format. All Category 1/Category 2 ideas that did not fit a theme are now parked.
> Last updated: 2026-05-04 (Run 20)

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
- **Status:** shipped
- **Theme:** ask-forward
- **Seeded:** 2026-04-28
- **Last Updated:** 2026-05-03
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-040-ask-about-this-chapter.md`
- **Summary:** A "Chat about this story (AI)" button at the bottom of every story detail page, linking to `/ask?story={storyId}`. Discovered shipped on Run 19 — button exists at `stories/[storyId]/page.tsx:316–322`. Prior runs missed it by reading only the first ~130 lines of the file.
- **Night Notes:**
  - 2026-04-28 (Run 16): Seeded. Noted that `?story=` param already supported in ask/page.tsx. Implementation is ~8 lines of JSX.
  - 2026-05-01 (Run 17): Advanced to `ready`. Dev plan written. Believed unimplemented.
  - 2026-05-02 (Run 18): Kept as `ready`. Still believed unimplemented.
  - 2026-05-03 (Run 19): **SHIPPED** — discovered on full page read. `stories/[storyId]/page.tsx` lines 314–330 contains a bottom-of-page CTA block with `href={/ask?story=${storyId}}` and label "Chat about this story (AI)". Core feature is live. Note: dev plan called for placement near the top (after summary, visible on first scroll); current placement is at the very bottom after all content. Top-of-page variant seeded as IDEA-048.

---

### [IDEA-048] Ask Companion CTA Near Top of Story Page (After Summary)
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-03
- **Last Updated:** 2026-05-04
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-048-ask-cta-top-of-story-page.md`
- **Summary:** IDEA-040 shipped a bottom-of-page "Chat about this story (AI)" CTA. A second, more prominent CTA positioned directly after the chapter summary paragraph (before scene navigation) would catch readers mid-read or immediately after the summary, not just post-scroll.
- **Night Notes:**
  - 2026-05-03 (Run 19): Seeded as follow-on to IDEA-040 shipping. One new `<Link>` block (~8 lines) placed after the `story.summary` paragraph (~line 166) and before `<StorySceneJump>`. IDEA-040 dev plan already has the exact code snippet. This is a 15-minute copy-paste refine from an existing ready plan.
  - 2026-05-04 (Run 20): Advanced to `ready`. Dev plan written: `DEVPLAN-IDEA-048-ask-cta-top-of-story-page.md`. Confirmed exact insertion point: after line 166 `</p>` (summary), before line 168 `<StorySceneJump>`. No new imports needed. Bottom CTA at line 317 stays untouched. Estimated 15 minutes.

---

### [IDEA-042] Suggested Follow-Up Chips After Each Ask Answer
- **Status:** planned
- **Theme:** ask-forward
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-02
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-042-follow-up-chips.md`
- **Summary:** After each AI Ask response, render 2–3 contextual suggested follow-up questions as clickable chips directly below the answer bubble. Clicking a chip immediately submits the question. Makes the companion conversational and encourages depth without requiring the reader to think of next questions.
- **Night Notes:**
  - 2026-05-01 (Run 17): Seeded. Two generation strategies: (A) extract from evidence.linksInAnswer; (B) second Haiku call after the main response stream. Strategy B chosen for quality.
  - 2026-05-02 (Run 18): Advanced to `planned`. Dev plan written. Strategy: secondary non-streaming `claude-haiku-4-5-20251001` call after main stream, suggestions returned in the `done: true` SSE event alongside `evidence`. Client adds `suggestions?: string[]` to Message type; renders as chip buttons between markdown div and AskSourcesDisclosure (ask/page.tsx ~line 712). New module: `src/lib/ai/ask-suggestions.ts`. Estimated 2 hours.
  - 2026-05-03 (Run 19): Status unchanged. `ask-suggestions.ts` does not exist yet. Plan ready, not executed.

---

### [IDEA-045] Ask Ambient Context Whispers During Reading
- **Status:** seed
- **Theme:** ask-forward
- **Seeded:** 2026-05-02
- **Last Updated:** 2026-05-02
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** While a reader scrolls through a chapter page, a subtle ambient indicator appears alongside paragraphs for which the Ask companion has relevant context. Clicking/tapping opens Ask pre-seeded with that paragraph's text — proactive surfacing rather than waiting for the reader to invoke the companion.
- **Night Notes:**
  - 2026-05-02 (Run 18): Seeded. Extends IDEA-040 (chapter CTA) to per-paragraph granularity. The `?highlight=` param in Ask (IDEA-018, shipped) already handles passage pre-seeding. This idea is about proactive context discovery: marking paragraphs with entity mentions (from `chapter_tags.json`) as "Ask-able". Consider a hover/focus affordance on paragraphs that name entities in that chapter's tag list.

---

### [IDEA-051] Scene-Level "Ask About This Scene" Quick-Action
- **Status:** seed
- **Theme:** ask-forward
- **Seeded:** 2026-05-04
- **Last Updated:** 2026-05-04
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Each scene-section heading in the chapter body (`StorySceneJump` destinations) gets a small inline "Ask →" link that navigates to `/ask?story={storyId}&highlight={scene-heading}`. Readers can jump straight from a scene they just finished into the Ask companion seeded with that scene's context — tighter than the chapter-level CTA.
- **Night Notes:**
  - 2026-05-04 (Run 20): Seeded. Extends IDEA-048 (chapter-level CTA) to per-scene granularity. The `?highlight=` param is already supported by `ask/page.tsx` (shipped IDEA-018). `sceneSections` is already fetched in `stories/[storyId]/page.tsx` and passed to `StorySceneJump`. The scene heading text (which maps to the anchor id) could be passed as `?highlight=` to pre-seed Ask context. The per-scene link could render as a `[Ask]` text button next to each `<h2>` heading in `StoryMarkdown` or inside `StoryBodyWithHighlighting`. Main challenge: scene headings live inside markdown prose, so injection needs either a remark plugin or a wrapper rendering pattern — assess feasibility against `StoryMarkdown` and `remark` plugin system before advancing.

---

### [IDEA-049] Chapter Hero Image — AI-Generated Splash at Top of Story Pages
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-03
- **Last Updated:** 2026-05-03
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Each of the 17 chapter pages gets a full-width AI-generated header image depicting the chapter's primary setting, tone, or pivotal moment — displayed above the story title. Images are pre-generated by the author (batch run via admin console) and stored in Supabase, so readers see zero generation latency. Grounded in the chapter's entity specs + `chapter_tags.json` key entities.
- **Night Notes:**
  - 2026-05-03 (Run 19): Seeded. This is an author-side batch generation task (using the existing visuals pipeline) that produces 17 canonical "chapter cover" images. Different from IDEA-043 (reader-triggered on-demand) — these are curated, approved, pre-computed. Dev plan must address: (1) Model: Imagen 4. (2) Cost: 17 images × ~$0.06 = ~$1 per batch refresh; trivial. (3) Caching: images stored in `cel_visual_assets` with `source='chapter_splash'`; one canonical image per chapter. (4) Spoiler gating: images show setting/atmosphere, not narrative events — no spoiler risk even for future chapters, but author decides which chapters get images first. Under companion-first all chapters are visible. (5) Canon grounding: each chapter's primary location entity spec + dominant entity from `chapter_tags.json`. New `target_type='chapter'` variant for `corpus-context.ts`.

---

### [IDEA-052] Canonical Character Portraits — Author-Batch Generated for 9 Main Characters
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-04
- **Last Updated:** 2026-05-04
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Pre-generate one canonical portrait per main character (ALARA, Aven Voss, Evelyn Tran, Galen Voss, Jax Reyes, Jonah Revas, Lena Osei, Marco Ruiz, Thane Meric) using the existing author visuals pipeline. Portraits are curated and approved via the admin console, then surfaced on each character detail page via `EntityVisualsGallery`.
- **Night Notes:**
  - 2026-05-04 (Run 20): Seeded. The visuals pipeline already supports character target types — `corpus-context.ts` can build context from character wiki + arc dossier. Style preset: `intimate_crew` for crew members, `noncorporeal_presence` for ALARA. Cost: 9 images × ~$0.06 = ~$0.54 total; negligible. Canon grounding: character wiki markdown + `content/wiki/arcs/characters/{slug}.md` "Starting State" + any existing reference uploads. The 9 characters all have arc ledger files already. Main gap: no character-specific `content/wiki/specs/{slug}/master.json` entries exist yet — would need to seed one per character before generation, or rely on text-only canon dossier extraction (less visually consistent). Recommended: add stub `master.json` for at least ALARA before running batch. Dev plan must address: (1) Model: Imagen 4. (2) Cost: ~$0.54/batch. (3) Caching: shared, stored in `cel_visual_assets` with `approved=true`. (4) Spoiler gating of inputs: character wiki + starting-state arc text only — no future-chapters arc content. (5) Canon grounding: `content/wiki/characters/{slug}.md` + starting-state section of arc ledger + any existing approved assets as style anchors.

---

## genmedia

### [IDEA-043] On-Demand Scene Visualization via Ask ("Show Me")
- **Status:** planned
- **Theme:** genmedia
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-03
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-043-on-demand-scene-visualization.md`
- **Summary:** When a reader asks "Show me what [X] looks like" or "Illustrate this scene" in the Ask companion, the API detects visual intent (via `ask-intent.ts` classification), triggers the existing visuals pipeline, and streams back an inline image result in the Ask thread as a special message type.
- **Night Notes:**
  - 2026-05-01 (Run 17): Seeded. The visuals pipeline (`corpus-context.ts` → `synthesize-prompt.ts` → `generate-asset.ts`) is fully built and author-accessible. This idea extends it to reader-triggered on-demand generation. Key concerns to address in the dev plan:
    1. **Model/provider:** Imagen 4 (image). Runway Gen-4 for cinematic clips (later phase).
    2. **Cost budget:** ~$0.04–$0.08/image (Imagen 4). Rate-limit: 3 images/reader/hour via existing in-memory sliding window + extend to persist in Supabase for cross-session enforcement. Unauthenticated users: no generation (require sign-in).
    3. **Caching:** Generated images keyed on `seedHashFor(target, style, corpusVersion)` — same as admin path. Shared cache (not user-scoped) since canon visuals are not personalized.
    4. **Spoiler gating of prompt inputs:** With companion-first defaults, all users see all content, so no chapter-level spoiler concern. The visual prompt synthesizer already uses the full corpus context for canon grounding — no additional gating needed.
    5. **Canon grounding:** `corpus-context.ts` selects the most-relevant wiki entity spec from `content/wiki/specs/` + canon dossier blocks + foundational lore. Preset selection: auto-select based on entity type (character → `intimate_crew`, location → `valkyrie_shipboard` or `vault_threshold`, etc.).

---

### [IDEA-046] Harmonic State Visualizer — Reader-Triggered Valkyrie-1 State Renders
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-02
- **Last Updated:** 2026-05-02
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When a reader asks "What does the Valkyrie look like during alignment?" or "Show me the ship in harmonic jump", the Ask API detects visual intent, calls `synthesizeVisualPrompt` with the relevant `state` param, and returns an inline image in the Ask thread. The visual spec system already has all 5 states defined.
- **Night Notes:**
  - 2026-05-02 (Run 18): Seeded. Spec files at `content/wiki/specs/valkyrie-1/states/` and reference renders in `public/images/*-state.png` already exist. The author pipeline uses `state` param in the prompt route. This bridges that to reader-triggered Ask intent. Dev plan must address: (1) Model: Imagen 4. (2) Cost: ~$0.04–0.08/image; 3 imgs/reader/hour rate limit. (3) Caching: shared per-state — high hit rate expected since all readers see same canon. (4) Spoiler gating: all content visible under companion-first; all harmonic state images safe for all users. (5) Canon grounding: spec chain from valkyrie-1 states JSON provides complete visual description.

---

## post-read-world

### [IDEA-050] Chapter Recap on Demand — Ask-Generated In-World Summary
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-03
- **Last Updated:** 2026-05-03
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A "Recap this chapter" button on the story detail page (or a chip in the Ask companion after finishing a chapter) that triggers an Ask-generated in-world narrative summary. Unlike the static `story.summary` already shown, this is a living AI-written recap grounded in mission logs, character arc data, and wiki context — framed in the narrator voice.
- **Night Notes:**
  - 2026-05-03 (Run 19): Seeded. For post-read-world use: readers who want to re-orient before continuing. The companion already has all the context needed to generate this (chapter wiki-first context pack + mission logs + arc state). Implementation: (1) A `?recap=true` param on `/ask` pre-seeds a "Give me a recap of this chapter" message, or a dedicated `/stories/{storyId}/recap` endpoint. (2) The Ask `ask_answerer` persona with `storySlug` context produces the recap without spoilers beyond the current chapter. (3) Post-read-world plan requirements: with companion-first, all chapters visible — no gating needed; `show_all_content` N/A; partial-completion N/A. This is purely an Ask convenience shortcut surfaced prominently on chapter pages.

---

### [IDEA-053] Valkyrie-1 Interactive Interior Map
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-04
- **Last Updated:** 2026-05-04
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A dedicated `/artifacts/valkyrie-1/map` page (or a "Ship Map" tab on the Valkyrie-1 artifact page) showing an interactive SVG cross-section of the ship. The 11 interior locations (each with `parent_entity: "valkyrie-1"` in `content/wiki/specs/`) are placed as clickable regions. Clicking a region opens a side-panel with the location's wiki entry and approved visual assets. A natural post-read companion for readers who want to visualize where story events happened.
- **Night Notes:**
  - 2026-05-04 (Run 20): Seeded. The 11 interior location stub specs already exist (`content/wiki/specs/` — command-dome, resonant-pad, plus 9 others with parent_entity chain). All have wiki markdown entries in `content/wiki/locations/` (the Valkyrie-1 interior locations). The SVG map itself does not exist — it would need to be authored (by Paul / a designer) as an SVG with named regions matching location slugs. Alternative: a text-based "deck list" layout rather than SVG if SVG authoring is a blocker. Post-read-world requirements: (1) Hidden/degraded for locked readers: N/A under companion-first — all content visible. (2) Integration with `show_all_content`: N/A. (3) Partial-completion edge cases: N/A. Note: this is a post-read discovery feature; for first-time readers it also works as spatial orientation while reading. The 5 harmonic state renders in `public/images/` provide atmosphere but aren't interior maps. IDEA-047 (Harmonic State Gallery) is a complementary idea — they could share a "Valkyrie-1 Explorer" page with Map and States tabs.

---

### [IDEA-047] Harmonic State Gallery — Valkyrie-1 States for Re-Readers
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-02
- **Last Updated:** 2026-05-02
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A dedicated section on the Valkyrie-1 entity page (or a new `/artifacts/valkyrie-1/states` page) showcasing the ship in each of its 5 canonical harmonic states with visual renders and in-world descriptions. Reference renders exist in `public/images/`; spec JSONs define each state's canon behavior.
- **Night Notes:**
  - 2026-05-02 (Run 18): Seeded. The 5 state images (`active-state.png`, etc.) are already committed. Implementation is mainly a display page reusing the existing image + spec data. Post-read-world plan requirements: (1) With companion-first, all users can see this — no gating needed. (2) `show_all_content` N/A under companion-first. (3) Partial-completion edge cases N/A. Note: FIX-048 (committed images) and this idea are linked — if state images move to Supabase, gallery needs to fetch from `cel_visual_assets`. Design for Supabase-first from the start.

---

## Parked

*(Ideas parked by the 3-day stale rule, out of theme focus, or superseded.)*

### [IDEA-044] Entity Network Explorer at `/explore`
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-04
- **Summary:** An interactive force-directed graph at `/explore` showing characters, factions, ships, locations, and vaults connected via chapter co-appearances and wiki cross-links.
- **Night Notes:**
  - 2026-05-01 (Run 17): Seeded. Force-directed graph (React Flow or d3-force). No gating needed under companion-first. Edges from chapter co-occurrence in `chapter_tags.json` + `[[entity-slug]]` cross-links.
  - 2026-05-04 (Run 20): Stale 3 days — likely low priority or too complex. Demoting to parked. Graph library dependency, SVG layout complexity, and edge data computation are significant. Un-park when Paul decides to invest in an `/explore` page. IDEA-023 (parked earlier) is an older version of this concept.

---

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
