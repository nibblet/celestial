# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Three focused themes: **ask-forward**, **genmedia**, **post-read-world**.
> **Context note:** This backlog was restructured on 2026-05-01 (Run 17) to adopt the three-theme format. All Category 1/Category 2 ideas that did not fit a theme are now parked.
> Last updated: 2026-05-14 (Run 29)

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
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-042-follow-up-chips.md`
- **Summary:** After each AI Ask response, render 2–3 contextual suggested follow-up questions as clickable chips directly below the answer bubble. Clicking a chip immediately submits the question. Makes the companion conversational and encourages depth without requiring the reader to think of next questions.
- **Night Notes:**
  - 2026-05-01 (Run 17): Seeded. Two generation strategies: (A) extract from evidence.linksInAnswer; (B) second Haiku call after the main response stream. Strategy B chosen for quality.
  - 2026-05-02 (Run 18): Advanced to `planned`. Dev plan written. Strategy: secondary non-streaming `claude-haiku-4-5-20251001` call after main stream.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present: `DEVPLAN-IDEA-042-follow-up-chips.md`., suggestions returned in the `done: true` SSE event alongside `evidence`. Client adds `suggestions?: string[]` to Message type; renders as chip buttons between markdown div and AskSourcesDisclosure (ask/page.tsx ~line 712). New module: `src/lib/ai/ask-suggestions.ts`. Estimated 2 hours.
  - 2026-05-03 (Run 19): Status unchanged. `ask-suggestions.ts` does not exist yet. Plan ready, not executed.

---

### [IDEA-054] Ask TTS Narrator Voice — "Listen" Button on Ask Responses
- **Status:** parked
- **Theme:** ask-forward
- **Seeded:** 2026-05-05
- **Last Updated:** 2026-05-08
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** After the Ask companion finishes streaming a response, a small "Listen" button appears below the answer bubble. Clicking it sends the response text to a TTS API and plays back the answer in the narrator's voice, adding audio immersion without changing the core text flow.
- **Night Notes:**
  - 2026-05-05 (Run 21): Seeded. The response text is already available post-stream; TTS is a pure add-on. Provider options: ElevenLabs (premium voice quality, ~$0.30/1k chars) or Google TTS (lower cost, ~$0.004/1k chars, less cinematic). Key design question: which voice/tone fits the Celestial narrator persona? Requires a voice guide (`content/voice.md` is a stub — FIX relevant). No spoiler concern: TTS only reads text already shown to the reader. Implementation: new `/api/ask/tts` POST route accepting `text: string`, returning audio stream. Client adds optional `<audio>` element to the response bubble with play/pause control. Latency: TTS generation is fast (~0.5–2s) and can be triggered lazily on button click, not pre-generated.
  - 2026-05-08 (Run 24): Stale 3 days — likely low priority or too complex. Demoting to parked. Voice selection is blocked by `content/voice.md` stub. Un-park when the voice guide is authored.

---

### [IDEA-051] Scene-Level "Ask About This Scene" Quick-Action
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-04
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-051-scene-level-ask-affordance.md`
- **Summary:** Each `### Scene` heading in the chapter body gets a small inline "Ask →" link (visible on hover) navigating to `/ask?story={storyId}&highlight={scene-slug}`. Readers invoke the companion directly from the scene they just finished. Implementation uses `StoryMarkdown`'s existing custom `h3` renderer — add `storyId?` prop, inject the link inside the heading element. Two-file change, ~15 lines.
- **Night Notes:**
  - 2026-05-04 (Run 20): Seeded. Extends IDEA-048 (chapter-level CTA) to per-scene granularity. The `?highlight=` param is already supported by `ask/page.tsx` (shipped IDEA-018). `sceneSections` is already fetched in `stories/[storyId]/page.tsx` and passed to `StorySceneJump`. The scene heading text (which maps to the anchor id) could be passed as `?highlight=` to pre-seed Ask context. The per-scene link could render as a `[Ask]` text button next to each `<h2>` heading in `StoryMarkdown` or inside `StoryBodyWithHighlighting`. Main challenge: scene headings live inside markdown prose, so injection needs either a remark plugin or a wrapper rendering pattern — assess feasibility against `StoryMarkdown` and `remark` plugin system before advancing.
  - 2026-05-06 (Run 22): **Promoted to `planned`.** Feasibility confirmed — `StoryMarkdown.tsx` custom `h3` renderer (lines 76-85) already computes `slug = slugifyHeading(text)`. Adding optional `storyId?` prop and inserting a hover-visible `<a href="/ask?story=…&highlight=…">Ask →</a>` is clean: no remark plugin needed, `StoryBodyWithHighlighting` already has `storyId` as prop (line 7). Dev plan written. Estimated 30 minutes.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present: `DEVPLAN-IDEA-051-scene-level-ask-affordance.md`.

---

### [IDEA-057] Context-Aware Welcome Message on Ask Page
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-06
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-057-context-aware-ask-welcome.md`
- **Summary:** When a reader navigates to the Ask page from a story page (via `?story={storyId}`), the companion's empty state shows a chapter-specific greeting and 3 tailored question chips derived from that chapter's lead character, primary location, and key concept from `chapter_tags.json`. Falls back to generic suggestions when no `?story=` param is present.
- **Night Notes:**
  - 2026-05-06 (Run 22): Seeded. The `?story=` param is already handled by `ask/page.tsx`. The initial assistant message is currently empty.
  - 2026-05-07 (Run 23): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-057-context-aware-ask-welcome.md`. Implementation confirmed: extend `src/app/api/stories/[storyId]/meta/route.ts`.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present. (currently returns only `{ title }`) to also return `chapterWelcome: { greeting, suggestions }` computed from `getChapterTags(storyId)`. The Ask page client (`ask/page.tsx`) already fetches this endpoint — add a new `chapterWelcome` state variable alongside `contextStoryTitle`, then branch the empty-state render. Two-file change. `chapter-tags.ts` uses Node `fs` (server-only), so server route is the right injection point; no bundle bloat on the client. Estimated 45 minutes. No new API endpoint needed.

---

### [IDEA-060] Ask Conversation History Browser
- **Status:** parked
- **Theme:** ask-forward
- **Seeded:** 2026-05-07
- **Last Updated:** 2026-05-11
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A reader-facing panel or page (`/ask/history`) showing past Ask conversations grouped by chapter and searchable by keyword. Readers can resume any prior thread, jump to the chapter that seeded it, or see all questions asked about a specific character or location across sessions.
- **Night Notes:**
  - 2026-05-07 (Run 23): Seeded. `cel_conversations` + `cel_ai_interactions` already persist conversation history in Supabase. The data is there; the gap is a reader-facing browser UI. Implementation approach: a new `/ask/history` route (server component) that fetches `cel_conversations` rows for the authenticated user, groups by `story_id`, renders as a timeline list. Each row links to `/ask?conversation={id}` to resume (the Ask page already handles conversation resumption via `loadConversation` in `useEffect`). Search could be client-side (filter rows by keyword against stored `messages` JSON). Complexity is medium (new route, a Supabase query, a list UI) but no new data model. Post-read-world adjacent but filed here as ask-forward: it surfaces the Ask companion's persistence, making it feel like a real ongoing relationship with the archive. No spoiler concern: users only see their own conversations. Auth required (unauthenticated users have no history).
  - 2026-05-11 (Run 26): Stale 4 days — likely low priority or too complex. Demoting to parked. The lighter-weight "Continue where you left off" (IDEA-066) covers the key resumption use case with zero new routes. Un-park if Paul wants a full browsable history page.

---

### [IDEA-063] Entity Hover-Card in Ask Answers — Inline Wiki Tooltips
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-08
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-063-entity-hover-card.md`
- **Summary:** When the Ask companion's response includes a wiki link (e.g., `[ALARA](/characters/alara)`), hovering the link shows a small tooltip card with the entity type badge and name — making answers richer and navigable without leaving the Ask flow.
- **Night Notes:**
  - 2026-05-08 (Run 24): Seeded. The custom `ASSISTANT_MARKDOWN_COMPONENTS.a` renderer in `ask/page.tsx` already renders internal links as styled Next.js `<Link>` components. Entity type can be derived purely from the href path segment (e.g., `/characters/X` → "Character") — no fetch needed, no API change, no new DB.
  - 2026-05-09 (Run 25): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-063-entity-hover-card.md`. Implementation: new `src/components/ask/EntityHoverCard.tsx` component (derives entity type from href path segment, renders Tailwind `group-hover/hc` tooltip above link). Update `ASSISTANT_MARKDOWN_COMPONENTS.a` in `ask/page.tsx` (lines 30–38) to use it. 2-file change: new component + `ask/page.tsx`. Zero fetches, zero new API routes, zero DB changes, zero npm packages. Estimated 30 minutes.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present.

---

### [IDEA-066] Cross-Session Ask Resume — "Continue Where You Left Off"
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-09
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-066-cross-session-ask-resume.md`
- **Summary:** When an authenticated reader opens `/ask?story={storyId}` and their browser has a record of a prior Ask conversation for that story (stored in `localStorage`), the empty state shows a "Continue where you left off" card with the first question as a preview — with "Continue" and "Start fresh" options. Makes the companion feel persistent without requiring a DB migration.
- **Night Notes:**
  - 2026-05-09 (Run 25): Seeded. The data is already there: `cel_conversations` stores `story_id`, `profile_id`, `messages` JSON, and `created_at`. The Ask page already handles conversation resumption via `loadConversation(id)` in a `useEffect`. The gap is surfacing the prior session proactively rather than requiring a reader to navigate to `/ask/history`. Implementation: in `ask/page.tsx` `useEffect` (after `contextStoryId` is resolved), query `cel_conversations` for `{ story_id: storySlug, profile_id: user.id, ORDER BY created_at DESC, LIMIT 1 }`. Extract the last user message as a preview string. New empty-state variant: "Last time you asked: [preview]" with "Continue" → `loadConversation(id)` and "Start fresh" → null the prior session ref. No new API route or DB table. Authenticated users only (guests have no history). This connects to IDEA-060 (full conversation history browser) as a lighter-weight, high-value first step.
  - 2026-05-11 (Run 26): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-066-cross-session-ask-resume.md`. Key design correction from seed notes: `cel_conversations` does NOT have a `story_id` column.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present. (conversations are created with `user_id`, `age_mode`, `title` only — no story FK). Therefore the implementation uses `localStorage` (key: `celestial_conv_{storySlug}`) rather than a Supabase query. This avoids a DB migration entirely. The existing `GET /api/conversations/{id}` endpoint loads the full message history for "Continue". Net code change: 1 state variable + 2 useEffects + 1 callback + ~25 JSX lines, all in `ask/page.tsx`. Estimated 1.5 hours. Priority raised to P2.

---

### [IDEA-069] Ask from Wiki Page — Entity-Level Ask CTA on All Entity Detail Pages
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-11
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-069-entity-level-ask-cta.md`
- **Summary:** Every wiki entity detail page (characters, factions, locations, artifacts, vaults, rules) gets a compact "Ask about [Entity Name] →" link in the page header. Clicking opens `/ask?entity={slug}&entityType={type}&entityName={Name}`, which the Ask page detects to display entity-specific suggestion chips and a back-breadcrumb — extending IDEA-040's chapter-level CTA pattern down to the entity level.
- **Night Notes:**
  - 2026-05-11 (Run 26): Seeded. IDEA-040 shipped a chapter-level Ask CTA on story pages. The natural follow-on is entity pages (characters, factions, locations, etc.) — readers browsing ALARA's wiki page should be one tap away from asking "What role does ALARA play in Chapter 3?" or "How does ALARA differ from other AI systems in the story?". Implementation: (1) Entity detail page templates already render a `<h1>` header and description — add a small `<Link href="/ask?entity={slug}&entityType={type}">Ask about [Name] →</Link>` button in the header JSX (5 pages × ~5 lines each = ~25 lines total); (2) In `ask/page.tsx`, detect `?entity=` and `?entityType=` search params and add them to the empty-state variant alongside `?story=` context. The entity type could drive pre-seeded suggestion chips derived from static entity data (e.g., for a character: "What is [Name]'s role in the crew?", "How does [Name]'s arc develop?", "What is [Name]'s relationship with ALARA?"). No new API route or DB changes needed. The `ask/page.tsx` already handles `?story=` — adding `?entity=` is a parallel pattern. Complexity: low-medium. Estimated 2 hours.
  - 2026-05-12 (Run 27): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-069-entity-level-ask-cta.md`. Implementation confirmed via codebase read: single change to `FictionEntityDetailPage` in `FictionEntityViews.tsx` covers factions/locations/artifacts/vaults; separate change to `characters/[slug]/page.tsx` for characters; `RuleDetailPage` in `FictionEntityViews.tsx` for rules. In `ask/page.tsx`: add 3 new params (`entitySlug`, `entityType`, `entityName`), add entity breadcrumb parallel to story breadcrumb (~line 649), add `ENTITY_SUGGESTIONS` map for type-specific chips. `entityName` passed in URL to avoid any server fetch. 3-file change (2 entity templates + ask page). Zero API routes, zero DB, zero new npm packages. Estimated 2 hours. Priority set to P2.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present.

---

### [IDEA-072] Chapter Quick-Facts Panel in Ask — Contextual Key-Facts Card
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-12
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-072-chapter-quick-facts-panel.md`
- **Summary:** When a reader opens the Ask page from a story (`?story={storyId}`), a collapsible "Key Facts" card appears above the chat thread showing the chapter's mission date range, primary location (linked to wiki), and top 3 characters — pulled from `chapter_tags.json` + `mission_logs_inventory.json` via an extended `/meta` endpoint. Stays visible during the conversation. Zero new API routes or DB changes. 3-file change.
- **Night Notes:**
  - 2026-05-12 (Run 27): Seeded. Identified as complementary to IDEA-057: IDEA-057 changes the empty state; this adds a persistent reference panel that stays visible once the reader starts chatting. Estimated 1.5 hours.
  - 2026-05-13 (Run 28): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-072-chapter-quick-facts-panel.md`. Key implementation insight: mission day data comes from `content/raw/mission_logs_inventory.json`.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present.

---

### [IDEA-075] Ask Pinned Q&A — Star and Save Individual Ask Exchanges
- **Status:** seed
- **Theme:** ask-forward
- **Seeded:** 2026-05-13
- **Last Updated:** 2026-05-13
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Readers can star/pin individual assistant message bubbles in an Ask conversation. Pinned exchanges (the paired user question + assistant answer) appear as a "Things I learned" collection on `/profile/questions`. Makes the companion feel like a personal research tool, not just a chat window.
- **Night Notes:**
  - 2026-05-13 (Run 28): Seeded. `cel_messages` already stores all conversation turns. Implementation: (1) New `pinned` boolean column on `cel_messages` (requires migration 042 — migrations 040 and 041 are reserved for FIX-026 and FIX-052 respectively); (2) Star icon button on each assistant message bubble in `ask/page.tsx` — POST to `/api/ask/pin` toggling `pinned` flag; (3) `/profile/questions/page.tsx` extended to also show pinned Ask pairs grouped by chapter (existing page shows question-type interactions; pinned pairs are a new section). Zero new DB tables. Requires migration for the column. Auth required (no guest path). Estimated 2.5 hours including migration.

---

### [IDEA-078] Ask Response Confidence Ring — Grounding Signal on Answer Bubbles
- **Status:** seed
- **Theme:** ask-forward
- **Seeded:** 2026-05-14
- **Last Updated:** 2026-05-14
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A subtle visual indicator on each Ask response bubble showing how well-grounded the answer was in the wiki — derived from `linksInAnswer.length` in the `done` SSE event. Full ring = multiple evidence links; dashed ring = sparse evidence; no ring = ungrounded. Helps readers calibrate trust in answers without exposing raw retrieval metadata.
- **Night Notes:**
  - 2026-05-14 (Run 29): Seeded. The `done` SSE event already returns `linksInAnswer: { href, text }[]` on the client. `linksInAnswer.length` is a simple proxy for grounding quality (0 = no wiki evidence cited; 3+ = well-grounded). Implementation: in `ask/page.tsx`, after streaming completes, compute a `confidence` level (`low | medium | high`) from `linksInAnswer.length` thresholds (e.g., 0 = low, 1-2 = medium, 3+ = high). Add a thin left-border or ring on the response bubble `<div>` using Tailwind classes driven by this level: `border-l-2` with color `text-ink-ghost` (low), `text-ocean` (medium), `text-teal-400` (high). No new API changes. No new fetch. No DB. Pure client-side visual using data already returned. ~15 lines of JSX change in `ask/page.tsx`. Caveat: `linksInAnswer` reflects cited links, not total evidence retrieved — a well-grounded answer with no inline links will show low. Track this as a known approximation.

---

## genmedia

### [IDEA-043] On-Demand Scene Visualization via Ask ("Show Me")
- **Status:** ready
- **Theme:** genmedia
- **Seeded:** 2026-05-01
- **Last Updated:** 2026-05-14
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
  - 2026-05-03 (Run 19): Dev plan written.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present: `DEVPLAN-IDEA-043-on-demand-scene-visualization.md`.

---

### [IDEA-049] Chapter Hero Image — AI-Generated Splash at Top of Story Pages
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-03
- **Last Updated:** 2026-05-06
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Each of the 17 chapter pages gets a full-width AI-generated header image depicting the chapter's primary setting, tone, or pivotal moment — displayed above the story title. Images are pre-generated by the author (batch run via admin console) and stored in Supabase, so readers see zero generation latency. Grounded in the chapter's entity specs + `chapter_tags.json` key entities.
- **Night Notes:**
  - 2026-05-03 (Run 19): Seeded. This is an author-side batch generation task (using the existing visuals pipeline) that produces 17 canonical "chapter cover" images. Different from IDEA-043 (reader-triggered on-demand) — these are curated, approved, pre-computed. Dev plan must address: (1) Model: Imagen 4. (2) Cost: 17 images × ~$0.06 = ~$1 per batch refresh; trivial. (3) Caching: images stored in `cel_visual_assets` with `source='chapter_splash'`; one canonical image per chapter. (4) Spoiler gating: images show setting/atmosphere, not narrative events — no spoiler risk even for future chapters, but author decides which chapters get images first. Under companion-first all chapters are visible. (5) Canon grounding: each chapter's primary location entity spec + dominant entity from `chapter_tags.json`. New `target_type='chapter'` variant for `corpus-context.ts`.
  - 2026-05-06 (Run 22): Stale 3 days — likely low priority or too complex. Demoting to parked. Un-park after IDEA-052 (canonical character portraits) ships and the batch pipeline is proven out.

---

### [IDEA-058] Location Mood Board — 4-Panel Pre-Generated Canonical Gallery
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-06
- **Last Updated:** 2026-05-09
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For key story locations (Giza Plateau, Command Dome, Resonant Pad, Zone Theta), pre-generate a 4-panel mood board showing the location across different lighting states, story moments, or perspectives. Stored in `cel_visual_assets` and displayed on location detail pages via `EntityVisualsGallery` as a curated "Scenes from [Location]" gallery.
- **Night Notes:**
  - 2026-05-06 (Run 22): Seeded. The visuals pipeline already supports location targets — `corpus-context.ts` builds context from location wiki markdown. A 4-panel mood board requires 4 separate Imagen 4 calls per location with varied prompt seeds (different view params or state variations). Author runs via admin console, approves, and the gallery picks them up automatically. Dev plan must address: (1) Model: Imagen 4. (2) Cost: 4 images × ~$0.06 × 6 priority locations = ~$1.44; trivial. (3) Caching: shared per (target, style, variant) key. (4) Spoiler gating: location imagery is setting-level, not narrative — no chapter spoiler concern; all content visible under companion-first. (5) Canon grounding: location wiki markdown + parent entity spec chain (e.g., `command-dome` inherits from `valkyrie-1` via `parent_entity`). A `panel_index` (0-3) variant could be added to the `view` param to generate varied angles systematically.
  - 2026-05-09 (Run 25): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by lack of `view` variant system on admin console; un-park after IDEA-052 (character portraits) ships and batch pipeline has proven support for systematic variation.

---

### [IDEA-061] Chapter Completion Atmospheric Video Loop
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-07
- **Last Updated:** 2026-05-11
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When a reader marks a chapter complete (via `/api/stories/[storyId]/read`), a short 3–5 second atmospheric looping video clip plays as a completion cinematic. The clip depicts the chapter's dominant setting or closing mood, generated via Runway Gen-4 and pre-approved by the author — zero generation latency for the reader.
- **Night Notes:**
  - 2026-05-07 (Run 23): Seeded. The completion trigger already exists: `POST /api/stories/[storyId]/read` marks a chapter read and the client receives a 200 OK. Adding a video response requires: (1) Pre-generate 17 chapter completion clips offline via the author visuals pipeline (a new `target_type='chapter_completion'` in `corpus-context.ts`, a new batch script, approved via admin console); (2) Store clips in `cel_visual_assets` with `source='chapter_completion'`; (3) The `/api/visuals/preferred` GET endpoint (already exists, no auth) returns the approved asset for a `(target × style)` pair — add a `chapter_completion` target type; (4) After the reader marks a chapter read, client fetches the preferred clip and plays a looping `<video>` element in a fullscreen modal overlay (dismissable). Dev plan must address: (1) Model: Runway Gen-4 (~$0.015/s × 4s = ~$0.06/clip × 17 chapters = ~$1.02 total — trivial). (2) Cost: author-side batch only; readers trigger zero generation. (3) Caching: pre-generated, shared, stored in `cel_visual_assets`. (4) Spoiler gating of inputs: clip prompt uses only location/setting info from the chapter's dominant location spec; no narrative events in the prompt. (5) Canon grounding: chapter's primary location from `chapter_tags.json` → `corpus-context.ts` → location wiki markdown + spec JSON.
  - 2026-05-11 (Run 26): Stale 4 days — likely low priority or too complex. Demoting to parked. Blocked by lack of Runway Gen-4 integration in current pipeline; un-park after IDEA-043 (on-demand scene visualization) ships and establishes the video generation path.

---

### [IDEA-055] Faction Emblems & Heraldry — Author-Batch Generated Canonical Badges
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-05
- **Last Updated:** 2026-05-08
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Pre-generate one canonical emblem or heraldic badge per faction (e.g., the Rigel Protocol, the Vault Accord, and other named factions) via the existing author visuals pipeline. Displayed on faction detail pages via `EntityVisualsGallery`.
- **Night Notes:**
  - 2026-05-05 (Run 21): Seeded. No faction spec JSON files exist yet — would need `content/wiki/specs/{faction-slug}/master.json` seeded per faction, defining emblem shape, color palette, symbolic elements. Style: heraldic/insignia rather than cinematic scene; closest existing preset is `earth_institutional` for military/institutional factions, or `alien_organic` for Resonant/Vault-affiliated factions. Model: Imagen 4. Cost: ~$0.06/image × N factions (likely 6–10) = ~$0.36–0.60. Caching: shared, stored in `cel_visual_assets`. Spoiler gating: faction identity is non-narrative — emblems carry no chapter-specific content. Canon grounding: `content/wiki/factions/{slug}.md` + spec JSON. Dev plan must address: (1) Model: Imagen 4. (2) Cost: ~$0.06/image. (3) Caching: shared. (4) Spoiler gating: none required — emblems are world-building visuals. (5) Canon grounding: faction wiki markdown + faction master.json spec.
  - 2026-05-08 (Run 24): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by missing faction spec JSON files. Un-park after IDEA-052 (character portraits) ships and the batch spec authoring workflow is proven.

---

### [IDEA-067] Ask Auto-Illustration Toggle — Opt-In Inline Image After Each Answer
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-09
- **Last Updated:** 2026-05-12
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** An optional "❆ Illustrate" toggle on the Ask page. When enabled, each completed Ask response attempts to generate a small inline image (300×200px) below the text bubble, derived from the first entity wiki link in `linksInAnswer`. Triggered lazily after stream completion; reader opts in explicitly.
- **Night Notes:**
  - 2026-05-09 (Run 25): Seeded. This is an ambient version of IDEA-043 (on-demand visualization). Rather than requiring the reader to explicitly ask "show me," the toggle enables auto-generation after every response containing at least one entity wiki link. Key decisions: (1) Model/provider: Imagen 4 (~$0.04–$0.08/image). (2) Cost budget: only when opt-in toggle is ON; rate limit 3 images per 15-minute window per user — shared with IDEA-043 limit, backed by DB (FIX-052 approach). Toggle state stored in `localStorage` ("ask_illustrate_enabled"). (3) Caching: shared per `seedHashFor(entitySlug, autoStyle, corpusVersion)` — same as admin path; check `cel_visual_assets` for approved asset before generating. (4) Spoiler gating of prompt inputs: entity slug from `linksInAnswer[0].href` is the only prompt input; no narrative text involved; all entity specs are available to all users under companion-first. (5) Canon grounding: `corpus-context.ts` builds context from entity wiki markdown + spec JSON files in `content/wiki/specs/`. Style auto-selected based on entity type (character → `intimate_crew`, location → `valkyrie_shipboard`, vault → `vault_threshold`, etc.). Implementation: new `/api/ask/illustrate` POST route accepting `{ entityHref: string }`; calls `synthesizeVisualPrompt` then `generateAsset`; returns `{ imageUrl }`. Client fires this call after the `done` SSE event if toggle is on and `linksInAnswer.length > 0`.
  - 2026-05-12 (Run 27): Stale 3 days — likely low priority or too complex. Demoting to parked. Superseded by IDEA-043 (on-demand visualization) which covers the explicit "show me" path first; the opt-in ambient path is lower priority until IDEA-043 ships. Un-park after IDEA-043 ships.

---

### [IDEA-052] Canonical Character Portraits — Author-Batch Generated for 9 Main Characters
- **Status:** ready
- **Theme:** genmedia
- **Seeded:** 2026-05-04
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-052-canonical-character-portraits.md`
- **Summary:** Pre-generate one canonical portrait per main character (ALARA, Aven Voss, Evelyn Tran, Galen Voss, Jax Reyes, Jonah Revas, Lena Osei, Marco Ruiz, Thane Meric) using the existing author visuals pipeline. Portraits are curated and approved via the admin console, then surfaced on each character detail page via `EntityVisualsGallery`.
- **Night Notes:**
  - 2026-05-04 (Run 20): Seeded. The visuals pipeline already supports character target types — `corpus-context.ts` can build context from character wiki + arc dossier. Style preset: `intimate_crew` for crew members, `noncorporeal_presence` for ALARA. Cost: 9 images × ~$0.06 = ~$0.54 total; negligible. Canon grounding: character wiki markdown + `content/wiki/arcs/characters/{slug}.md` "Starting State" + any existing reference uploads. The 9 characters all have arc ledger files already. Main gap: no character-specific `content/wiki/specs/{slug}/master.json` entries exist yet — would need to seed one per character before generation, or rely on text-only canon dossier extraction (less visually consistent). Recommended: add stub `master.json` for at least ALARA before running batch. Dev plan must address: (1) Model: Imagen 4. (2) Cost: ~$0.54/batch. (3) Caching: shared, stored in `cel_visual_assets` with `approved=true`. (4) Spoiler gating of inputs: character wiki + starting-state arc text only — no future-chapters arc content. (5) Canon grounding: `content/wiki/characters/{slug}.md` + starting-state section of arc ledger + any existing approved assets as style anchors.
  - 2026-05-05 (Run 21): Promoted to `planned`. Dev plan written: `DEVPLAN-IDEA-052-canonical-character-portraits.md`. Phases: (1) Author seeds 9 character spec JSON files; (2) batch generate and approve via admin console; (3) verify `EntityVisualsGallery` on character pages. Estimated 3 hours author time, zero code changes. Priority raised to P2.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present.

---

### [IDEA-073] Story Scene Cinematic Stills — Batch Keyframe Gallery per Chapter
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-12
- **Last Updated:** 2026-05-12
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Author pre-generates a set of 3 "cinematic still" images per chapter (opening atmosphere, midpoint tension, closing/resolution) via the existing visuals pipeline. Stills stored in `cel_visual_assets` with `source='chapter_still'` and a `sequence_index` (0–2). Displayed as a filmstrip-style gallery strip on each chapter detail page, above the scene navigation. Zero reader latency — author-batch only.
- **Night Notes:**
  - 2026-05-12 (Run 27): Seeded. Distinct from IDEA-049 (single "chapter hero" splash image, now parked) — this produces 3 stills per chapter that together narrate the chapter's emotional arc visually. Implementation: (1) Model/provider: Imagen 4 (~$0.06/still × 3 stills × 17 chapters = ~$3.06 total for full coverage — trivial). (2) Cost budget: author-batch only; no reader-triggered generation. (3) Caching: stills stored as approved assets in `cel_visual_assets` with `source='chapter_still'` and `sequence_index` field; shared/canonical per chapter. (4) Spoiler gating of prompt inputs: each still's prompt uses only the chapter's primary location spec from `content/wiki/specs/` and the dominant entity from `chapter_tags.json` — no narrative text, no character arc details. Style: location-appropriate preset (e.g., `valkyrie_shipboard` for shipboard chapters, `giza_archaeological` for vault chapters). (5) Canon grounding: chapter's location wiki markdown + location spec JSON + `chapter_tags.json` key entities. Schema note: a `sequence_index` int column would be needed on `cel_visual_assets` (new migration), or stills could be distinguished by the `target` field using a convention like `ch01-opening`, `ch01-midpoint`, `ch01-closing`. Prerequisite: IDEA-052 (canonical character portraits) should ship first to prove out the batch workflow; `sequence_index` schema design should align with IDEA-064 (ALARA evolution sequence, parked).

---

### [IDEA-070] Approval-Gated Visual Thumbnails Inline in Ask Answers
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-11
- **Last Updated:** 2026-05-14
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When the Ask companion's response references a wiki entity via a link in `linksInAnswer`, and that entity has at least one approved visual asset in `cel_visual_assets`, a small circular thumbnail (48×48px) appears inline next to the entity link. Zero generation latency — uses only pre-approved author assets. No AI calls, no cost per render.
- **Night Notes:**
  - 2026-05-11 (Run 26): Seeded. The `/api/ask` route already returns `linksInAnswer` in the `done` SSE event with entity slugs and hrefs.
  - 2026-05-14 (Run 29): Stale 3 days — likely low priority or too complex. Demoting to parked. Prerequisite: IDEA-052 (character portraits) must ship first to populate approved assets. Un-park after IDEA-052 ships. The `EntityVisualsGallery` component already fetches approved assets for entity pages. To render thumbnails inline in Ask answers: extend the `done` SSE event payload to include `approvedThumbnailUrl?: string` per `linksInAnswer` entry (API-side: one Supabase query per distinct entity slug after stream completes — fetch the approved asset URL from `cel_visual_assets` where `approved=true AND target={slug}`); client renders a `<img className="inline-block h-10 w-10 rounded-full mr-1" src={thumbnailUrl} />` next to the entity link inside the `ASSISTANT_MARKDOWN_COMPONENTS.a` renderer. Dev plan must address: (1) Model/provider: N/A — uses pre-generated assets only. (2) Cost per generation: $0 — assets are pre-approved. (3) Caching: assets are already in Supabase Storage with public URLs; no additional caching layer needed. (4) Spoiler gating of prompt inputs: N/A — no AI generation triggered by this feature; entity visuals are decorative world-building, not narrative text. (5) Canon grounding: thumbnails come from `cel_visual_assets` with `approved=true`, which are exclusively author-curated canonical renders. Fallback: if no approved asset exists for an entity, the link renders exactly as today (no thumbnail). Estimated 2 hours. Prerequisite: IDEA-052 (character portraits) must ship first to populate approved assets; otherwise only existing approved assets appear (currently sparse). Low risk of over-fetching: the query runs only once per Ask response completion, and only for entities in `linksInAnswer` (typically 0–5 per answer).

---

### [IDEA-064] ALARA Visual Evolution Sequence — Portrait Arc Across Key Chapters
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-08
- **Last Updated:** 2026-05-11
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A curated sequence of 4–5 Imagen 4–generated portraits showing ALARA's visual transformation across her arc: (1) dormant observer (CH01–02), (2) emergent presence (CH04–05), (3) aligned participant (CH06–07), (4) merged resonance (CH14), (5) post-translation distributed form (CH17). Pre-generated by the author and displayed on ALARA's character page as a horizontally-scrollable "Evolution" gallery strip above the main `EntityVisualsGallery`.
- **Night Notes:**
  - 2026-05-08 (Run 24): Seeded. This extends IDEA-052 (single portrait per character) with a specifically ALARA-focused narrative arc. ALARA is the only character with a visual transformation arc significant enough for this treatment — her arc moves from background AI system → noncorporeal emergent intelligence → merged distributed entity. Implementation: (1) Model: Imagen 4. (2) Cost: 5 images × ~$0.06 = ~$0.30 total. (3) Caching: shared, stored in `cel_visual_assets` with `source='character_arc_sequence'`; a `sequence_index` field (0–4) distinguishes images. (4) Spoiler gating of inputs: each portrait's prompt uses only information available up to the depicted chapter — no forward-looking arc details. `corpus-context.ts` would need to accept a `chapterBoundary` parameter to limit which arc sections are included. (5) Canon grounding: `content/wiki/characters/alara.md` + ALARA arc ledger chapter entry for the relevant chapter + `noncorporeal_presence` preset + `content/wiki/specs/valkyrie-1/states/*.json` to convey ship harmonic state in background. Prerequisite: IDEA-052 ships first (establishes the spec authoring + batch workflow for ALARA). The `sequence_index` concept requires a schema addition to `cel_visual_assets`.
  - 2026-05-11 (Run 26): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by IDEA-052 prerequisite (canonical portraits not yet generated). Un-park after IDEA-052 ships and the `sequence_index` schema extension is designed.

---

### [IDEA-076] World Visual Glossary — 3 Canonical Texture/Mood Cards (One Per Visual World)
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-13
- **Last Updated:** 2026-05-13
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Pre-generate three abstract "visual vocabulary" mood-board images — one per canonical visual world (WORLD A alien_organic, WORLD B earth_2050, WORLD C ancient_vault) — using Imagen 4. Displayed on a `/about/visuals` page or as a "Visual Canon" panel in `/rules`. These cards ground the reader's visual expectations and serve as style references for all future AI-generated visuals.
- **Night Notes:**
  - 2026-05-13 (Run 28): Seeded. The 3-world vocabulary is already defined in `synthesize-prompt.ts` WORLD A/B/C spec blocks. Each mood-board prompt is an abstract texture/atmosphere composition using the world's canonical descriptors — no characters, no narrative events, no spoiler risk. (1) Model/provider: Imagen 4 (~$0.06/image × 3 = ~$0.18 total — trivial). (2) Cost budget: author-side batch only; zero reader-triggered generation. (3) Caching: shared canonical assets stored in `cel_visual_assets` with `source='visual_glossary'` and `target` = `world-a-alien-organic` / `world-b-earth-2050` / `world-c-ancient-vault`; never regenerated unless author explicitly refreshes. (4) Spoiler gating of prompt inputs: pure style/texture prompts drawn from `synthesize-prompt.ts` WORLD blocks — no chapter content, no character names, no story events. Safe for all readers. (5) Canon grounding: the three WORLD vocabulary blocks in `synthesize-prompt.ts` (lines ~35–65) are the sole grounding source — no additional spec files needed. These blocks describe texture, light, and material vocabulary only. Implementation: author generates via admin console using three custom prompts; approved assets surface on a new `/about/visuals` static page or embedded in the existing `/rules` index as a "Visual Canon" section. New page requires 1 server component (~40 lines) + 1 Supabase query for the 3 glossary assets.

---

### [IDEA-079] Mission Briefing Classified Document Art — Per-Chapter Diegetic Visual
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-14
- **Last Updated:** 2026-05-14
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Author pre-generates a stylized "classified mission document" image per chapter — a diegetic artifact that exists within the story world, showing mission designation, coordinates, and brief (in-world MARU/Rigel Protocol format). Generated via Imagen 4 with `earth_institutional` preset. Displayed on chapter detail pages as a visual prop above the scene TOC.
- **Night Notes:**
  - 2026-05-14 (Run 29): Seeded. These are diegetic documents that feel like artifacts from the story world — distinct from cinematic scene illustrations (IDEA-073) or hero images (IDEA-049, parked). They exist as props a character might hand another character. (1) Model/provider: Imagen 4 (`earth_institutional` or `earth_2050` preset — matches Rigel Protocol / Earth military aesthetics). (2) Cost budget: ~$0.06/image × 17 chapters = ~$1.02 total; trivial; author-batch only. (3) Caching: stored in `cel_visual_assets` with `source='chapter_briefing'` and `target` = chapter slug; one canonical asset per chapter. (4) Spoiler gating of prompt inputs: prompt uses only the chapter number, mission designation, and dominant location from `chapter_tags.json` — zero narrative content, zero character events. No spoiler risk. (5) Canon grounding: Rigel Protocol document format from `content/wiki/factions/rigel-protocol.md` (if exists) + `earth_institutional` preset — the visual identity of Earth-bureaucracy documents in the story. Implementation: author generates via admin console with a template prompt specifying document format; approved assets surface on chapter detail pages via a small stamp-like callout near the chapter title. Prerequisite: at least one faction spec JSON (`content/wiki/specs/rigel-protocol/master.json`) would strengthen visual consistency.

---

## post-read-world

### [IDEA-056] Celestial Star Chart — Spatial Universe Map for Readers
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-05
- **Last Updated:** 2026-05-08
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A visual chart of the key locations in the Celestial universe (Earth, Mars, Asteroid Belt, Europa, Ganymede, Valkyrie-1's trajectory corridor) displayed on a dedicated page or as a new tab on the existing `/stories/timeline` page. Each location links to its wiki entry. Helps readers understand the spatial context of a multi-planet story.
- **Night Notes:**
  - 2026-05-05 (Run 21): Seeded. All key locations exist in `content/wiki/locations/` (including andes-glacial-lake, asteroid-belt, europa, ganymede — added Run 12). An SVG-based star chart with clickable named regions would be the ideal form; a simpler fallback is a styled HTML list with distances/context. The timeline page (`/stories/timeline`) already handles the temporal axis — this is the spatial complement. Post-read-world requirements: (1) Under companion-first all content is visible to all users — no gating needed. (2) `show_all_content`: N/A. (3) Partial-completion edge cases: N/A. Complexity: if SVG, a designer/Paul must author the spatial layout; if HTML list, pure dev work using existing location data. Consider linking from the existing location index page (`/locations`) as a "Universe Map" tab rather than a standalone route.
  - 2026-05-08 (Run 24): Stale 3 days — likely low priority or too complex. Demoting to parked. SVG authoring is a design-time blocker (same as IDEA-053). Un-park if Paul prefers the HTML list fallback form, which could be built without any design assets.

---

### [IDEA-050] Chapter Recap on Demand — Ask-Generated In-World Summary
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-03
- **Last Updated:** 2026-05-06
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A "Recap this chapter" button on the story detail page (or a chip in the Ask companion after finishing a chapter) that triggers an Ask-generated in-world narrative summary. Unlike the static `story.summary` already shown, this is a living AI-written recap grounded in mission logs, character arc data, and wiki context — framed in the narrator voice.
- **Night Notes:**
  - 2026-05-03 (Run 19): Seeded. For post-read-world use: readers who want to re-orient before continuing. The companion already has all the context needed to generate this (chapter wiki-first context pack + mission logs + arc state). Implementation: (1) A `?recap=true` param on `/ask` pre-seeds a "Give me a recap of this chapter" message, or a dedicated `/stories/{storyId}/recap` endpoint. (2) The Ask `ask_answerer` persona with `storySlug` context produces the recap without spoilers beyond the current chapter. (3) Post-read-world plan requirements: with companion-first, all chapters visible — no gating needed; `show_all_content` N/A; partial-completion N/A. This is purely an Ask convenience shortcut surfaced prominently on chapter pages.
  - 2026-05-06 (Run 22): Stale 3 days — no advancement since seeding. Demoting to parked. The core Ask infrastructure is ready; un-park when chapter-page CTAs (IDEA-048) are being tackled, since recap is a natural companion chip to place alongside the Ask affordance.

---

### [IDEA-053] Valkyrie-1 Interactive Interior Map
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-04
- **Last Updated:** 2026-05-07
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A dedicated `/artifacts/valkyrie-1/map` page (or a "Ship Map" tab on the Valkyrie-1 artifact page) showing an interactive SVG cross-section of the ship. The 11 interior locations (each with `parent_entity: "valkyrie-1"` in `content/wiki/specs/`) are placed as clickable regions. Clicking a region opens a side-panel with the location's wiki entry and approved visual assets. A natural post-read companion for readers who want to visualize where story events happened.
- **Night Notes:**
  - 2026-05-04 (Run 20): Seeded. The 11 interior location stub specs already exist (`content/wiki/specs/` — command-dome, resonant-pad, plus 9 others with parent_entity chain). All have wiki markdown entries in `content/wiki/locations/`. SVG map does not exist — needs designer authoring. IDEA-047 (Harmonic State Gallery) could combine with this into a "Valkyrie-1 Explorer" page.
  - 2026-05-07 (Run 23): Stale 3 days — likely low priority or too complex. Demoting to parked. SVG authoring is a design-time blocker. Un-park when Paul is ready to commit to SVG layout authoring or decides to use the simpler text-based "deck list" fallback instead.

---

### [IDEA-062] Re-Reader Chapter Insight Panel — Hindsight Annotations
- **Status:** ready
- **Theme:** post-read-world
- **Seeded:** 2026-05-07
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-062-re-reader-hindsight-panel.md`
- **Summary:** For readers with `show_all_content=true`, each chapter page gains a collapsible "Hindsight" accordion at the bottom showing 2–4 arc-state insights drawn from existing character arc ledgers. Re-readers see foreshadowing they missed on first read. Zero new content needed; all insight text is from manually-authored arc markdown.
- **Night Notes:**
  - 2026-05-07 (Run 23): Seeded. No new content needed: arc ledgers already have per-chapter milestone notes for 9 characters (e.g., "CH03: First refusal of override — seeds the CH15-17 arc"). The insight panel is a curated display that joins chapter ID against each arc ledger's milestone entries and surfaces the relevant items. Implementation: (1) A server utility reads arc markdown files and extracts per-chapter milestone notes (similar to how `getCharacterArcContext()` in `prompts.ts` reads arc content); (2) `stories/[storyId]/page.tsx` calls this utility server-side and passes `chapterInsights[]` to a new `<HindsightPanel>` client component; (3) `HindsightPanel` renders as a collapsed accordion at the bottom of the chapter, visible only when `showAllContent === true` (passed from the existing `readerProgress` fetch). No new DB tables, no new markdown files. Post-read-world requirements: (1) Hidden for locked/first-time readers: gated by `showAllContent === true`. (2) Integration with `show_all_content`: direct dependency — the panel only renders when this flag is set. (3) Partial-completion edge cases: under companion-first, all content is visible to all users regardless; this feature's gate is purely the `show_all_content` profile flag, so it applies only to readers the author has explicitly granted re-reader status.
  - 2026-05-08 (Run 24): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-062-re-reader-hindsight-panel.md`. Implementation confirmed: new `src/lib/wiki/chapter-hindsight.ts` parses the "Chapter Arc Entries" table in each arc ledger and returns "State After" text per chapter + character. Used in `stories/[storyId]/page.tsx` when `readerProgress.showAllContent === true`. New `HindsightPanel.tsx` component renders as a collapsed `<details>` accordion. Zero new npm packages; no DB changes. Estimated 2 hours. Priority set to P2.
  - 2026-05-14 (Run 29): Promoted to `ready`. Dev plan confirmed present.

---

### [IDEA-059] Character Arc Comparison View — Side-by-Side Reader/Author Progress
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-06
- **Last Updated:** 2026-05-09
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A `/characters/compare` page (or a "Compare Arcs" tab on a character's detail page) that places two or more named characters side-by-side, showing their arc milestones, emotional state changes, and story roles across chapters. Pulls from existing character wiki entries and `content/wiki/characters/` arc data. Designed for re-readers who want to see how, e.g., Mira and Eli's arcs intersect, or how a supporting character's trajectory maps against the protagonist's across the full story.
- **Night Notes:**
  - 2026-05-06 (Run 22): Seeded. Post-read-world requirements: (1) Under companion-first all character data is visible to all users — no gating. (2) `show_all_content`: N/A. (3) Partial-completion: N/A. Character wiki entries in `content/wiki/characters/` already contain arc milestones and chapter appearances. Implementation approach: a static-data driven comparison table/card layout, similar to how the wiki compiler resolves related entities. The `/characters/[slug]` pages already render per-character arc data; this view joins two or more. Lower complexity than SVG maps (no designer asset needed). Un-park when character page work picks up.
  - 2026-05-09 (Run 25): Stale 3 days — likely low priority or too complex. Demoting to parked. No clear UX specification for the comparison layout (table vs. timeline vs. cards). Un-park when Paul has a specific visual design in mind for this view.

---

### [IDEA-071] Chapter-to-Chapter Arc Bridge for Re-Readers — "What Changed Between CH_X and CH_Y"
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-11
- **Last Updated:** 2026-05-14
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For re-readers with `show_all_content=true`, a new panel or dedicated `/arcs/bridge?from=ch03&to=ch15` page that compares two selected chapters and surfaces which characters changed state, which factions shifted, and which key events connect the two chapters — pulled entirely from arc ledger milestone tables and `chapter_tags.json`. No AI generation needed.
- **Night Notes:**
  - 2026-05-11 (Run 26): Seeded. The arc ledger files (`content/wiki/arcs/characters/*.md`) contain "Chapter Arc Entries" tables with a `| State After |` column per chapter for each of the 9 main characters.
  - 2026-05-14 (Run 29): Stale 3 days — likely low priority or too complex. Demoting to parked. Complexity of the UX (chapter selectors, multi-character diff display) and the `/arcs` route being currently ungated make this a larger project. Un-park after IDEA-062 (hindsight panel) ships and the arc parsing utilities are proven. `chapter_tags.json` has key entities and events per chapter. The "bridge" concept: given `fromChapter` and `toChapter`, compute a diff of each character's "State After" between those two chapters (9 diffs), surface them as a clean narrative summary — "Since CH03: ALARA has moved from passive observer → autonomous actor; ALARA's refusal arc began in CH07". Implementation: (1) New server utility `src/lib/wiki/chapter-bridge.ts` — accepts `from` and `to` chapter IDs, reads all 9 arc ledger files via `getAllCharacterArcs()` (already exists), extracts the "State After" entries for the two chapters, returns `CharacterBridge[]` with `{ slug, name, fromState, toState }`; (2) New `/arcs/bridge/page.tsx` or a modal/panel on the `/arcs` route — two chapter selectors (dropdowns), a "Compare" button, renders the diff; (3) Post-read-world requirements: (a) Hidden for first-time readers and guests — page requires `show_all_content === true` via `hasAuthorSpecialAccess()` or `show_all_content` profile check; (b) `show_all_content` integration: direct — server check; (c) Partial-completion edge cases: server validates the flag, guests redirect to home. Zero new content, zero DB changes, zero npm packages. Estimated 2–3 hours.

---

### [IDEA-074] Crew Cross-Reference Card — Character Connections at Book's End
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-12
- **Last Updated:** 2026-05-12
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For completed readers (`show_all_content=true`), a collapsible "Crew Connections at CH17" card at the bottom of each character detail page lists which other main characters had direct narrative interactions with this character, along with each connection's final relationship state drawn from arc ledger data. Zero new content; sourced entirely from existing arc ledger "Chapter Arc Entries" tables and `chapter_tags.json` co-appearances.
- **Night Notes:**
  - 2026-05-12 (Run 27): Seeded. Each of the 9 arc ledger files in `content/wiki/arcs/characters/` contains a "Chapter Arc Entries" table with a `State After` column per chapter. Co-appearance data in `chapter_tags.json` per chapter shows which entity slugs share chapter presence. Implementation: (1) New server utility `src/lib/wiki/crew-cross-ref.ts` — accepts a character slug, reads all 9 arc ledger files via `getAllCharacterArcs()` (already exists), cross-references `chapter_tags.json` co-appearances to build a list of `{ slug, name, chaptersTogether: CH[], finalRelationshipHint }` entries; (2) On `characters/[slug]/page.tsx`, call this utility when `readerProgress.showAllContent === true`, pass results to a new `<CrewCrossRefCard>` component rendering as a collapsed `<details>` accordion; (3) Post-read-world requirements: (a) Hidden for first-time readers and guests — gated by `show_all_content === true` at server level; (b) `show_all_content` integration: direct server-side check before calling the utility; (c) Partial-completion edge cases: server validates flag, no card rendered without it. Zero new DB changes, zero new content files, zero new npm packages. Estimated 2 hours. `finalRelationshipHint` can be the `State After` at CH17 from the SUBJECT's arc ledger that mentions the other character — or a simple "shared N chapters" count as a fallback if no explicit mention is found.

---

### [IDEA-068] Re-Reader Deep Archive Mode — Full-Canon Ask Companion for Completed Readers
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-09
- **Last Updated:** 2026-05-12
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Completed readers with `show_all_content=true` can toggle "Deep Archive" mode on the Ask page, lifting the companion's spoiler-guard clause and allowing fully unfiltered answers about any chapter, character arc endpoint, or lore detail.
- **Night Notes:**
  - 2026-05-09 (Run 25): Seeded. Currently the Ask companion injects a "Reader Progress Gate" block into every persona system prompt, instructing it to avoid content from unread chapters. Under companion-first defaults all content is unlocked for all users, making this gate largely ceremonial — but a subset of readers (those explicitly granted `show_all_content` by the author) may want the companion to engage with full narrative arc knowledge without hedging. "Deep Archive" mode: (1) A UI toggle on `ask/page.tsx`, visible only when the user's profile has `show_all_content = true` (fetched on mount). (2) Toggle state: React state + included in the `/api/ask` POST body as `deepArchiveMode: boolean`. (3) Server-side validation: in `src/app/api/ask/route.ts`, if `deepArchiveMode = true`, confirm `readerProgress.showAllContent === true`; otherwise ignore the flag. (4) In `orchestrateAsk()` / persona system-prompt builders, when `deepArchiveMode = true`, omit the "Reader Progress Gate" block. Implementation: add `deepArchiveMode?` to `OrchestrateAskArgs`, thread through to `buildSystemPrompt()` (or wherever the gate block is injected), add the UI toggle + profile check in `ask/page.tsx`. No new DB table. Post-read-world requirements: (1) Hidden from first-time readers and guests — toggle only renders when `showAllContent === true`. (2) `show_all_content` integration: direct dependency — server validates the flag. (3) Partial-completion edge cases: server-side check prevents unauthorized use regardless of UI state.
  - 2026-05-12 (Run 27): Stale 3 days — likely low priority or too complex. Demoting to parked. Under companion-first, the progress gate is already ceremonial for all users; this feature only meaningfully differentiates for `show_all_content` readers, a small audience. Un-park when there is explicit author demand for the toggle, or when companion-first is revisited.

---

### [IDEA-065] World Canon Browser — Unified `/world` Explorer for Completed Readers
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-08
- **Last Updated:** 2026-05-11
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A new `/world` page that consolidates all entity categories (characters, factions, locations, ships, vaults, artifacts, rules) into a single richly-designed world explorer with visual thumbnails from `EntityVisualsGallery`, cross-linked to individual detail pages. Replaces the need to navigate five separate index pages, giving re-readers a single immersive entry point into the universe.
- **Night Notes:**
  - 2026-05-08 (Run 24): Seeded. Currently readers must navigate between `/characters`, `/factions`, `/locations`, `/vaults`, etc. as separate sparse index pages. A unified `/world` page with section headers, brief entity descriptions, and approved thumbnail images (via the existing `cel_visual_assets` approved asset system) would create a "World Bible" feel appropriate for re-readers. Implementation: (1) New `/world/page.tsx` server component that calls `getAllCharacterArcs()`, `getEntityLoader()`, and `getLocations()` etc. to assemble all entity data in one pass; (2) Renders as a `<main>` with themed sections: "Crew of Valkyrie-1", "Factions & Powers", "Key Locations", "The Vaults", "Artifacts & Systems"; (3) Each entity card shows: entity name, entity type badge, 1-line description, and approved visual thumbnail (if available) via a lightweight version of `EntityVisualsGallery`; (4) Post-read-world requirements: Under companion-first, all entity data is visible to all users — no gating needed for content. `show_all_content`: this page could be fully accessible to all (it shows wiki-level information, not arc endpoints). Partial-completion: N/A. The page is purely additive — existing entity index pages remain. Complexity: medium (mostly composition of existing APIs; no new data; thumbnail loading adds Supabase queries). Estimated 3–4 hours dev time.
  - 2026-05-11 (Run 26): Stale 3 days — likely low priority or too complex. Demoting to parked. Too broad in scope and visual thumbnails are sparse until IDEA-052 (character portraits) ships. Un-park when more approved assets exist and Paul wants a consolidated world explorer surface.

---

### [IDEA-077] Re-Reader Highlight Fingerprint — Reading Intensity Mosaic on Profile
- **Status:** planned
- **Theme:** post-read-world
- **Seeded:** 2026-05-13
- **Last Updated:** 2026-05-14
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-077-highlight-fingerprint.md`
- **Summary:** For `show_all_content` readers, the `/profile/highlights` page gains a 17-chapter grid "fingerprint" above the highlights list — each chapter tile colored by the reader's highlight density (more highlights = deeper color). A personalized visual record showing which chapters resonated most. Zero new DB, zero new content; uses existing `cel_story_highlights` table.
- **Night Notes:**
  - 2026-05-13 (Run 28): Seeded. `cel_story_highlights` already stores `user_id`, `story_id`, `passage_text`, and `created_at`. Implementation: (1) In `/profile/highlights/page.tsx`, if `readerProgress.showAllContent === true`, issue one Supabase query to count highlights per story: `SELECT story_id, count(*) FROM cel_story_highlights WHERE user_id = $user GROUP BY story_id`; (2) Build a `Map<string, number>` of story_id → count; (3) Render a 17-tile grid (CH01–CH17) where each tile's background opacity is proportional to `count / maxCount` (clamped 10%–100%), with a legend note "Chapters you highlighted most"; (4) Tiles link to the chapter page for easy navigation. Post-read-world requirements: (a) Hidden for first-time and guest readers — only renders when `show_all_content === true` at server level; (b) Integration with `show_all_content`: direct server-side check before issuing the count query; (c) Partial-completion edge cases: flag validated server-side; if false, section is simply not rendered. Zero new DB tables, zero new content files, zero npm packages. Estimated 1.5 hours.
  - 2026-05-14 (Run 29): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-077-highlight-fingerprint.md`. Key addition vs seed: zero-highlight edge case handled (all tiles at 8% min opacity); color token note added (verify `--color-ocean-rgb` availability in `globals.css` before executing). Priority set to P2.

---

### [IDEA-080] Personalized Reread Guide — `/profile/reread` Chapter Retrospective
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-14
- **Last Updated:** 2026-05-14
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content` readers, a new `/profile/reread` page showing a per-chapter retrospective: (1) the reader's saved highlights for that chapter, (2) their Ask questions about that chapter, and (3) the arc milestone "State After" from arc ledger data — all in one scrollable view. Zero new content; assembled entirely from existing data in `cel_story_highlights`, `cel_chapter_questions`, and arc markdown files.
- **Night Notes:**
  - 2026-05-14 (Run 29): Seeded. Three data sources, all already available: (a) `cel_story_highlights` grouped by `story_id`; (b) `cel_chapter_questions` grouped by `story_id` (the existing `/profile/questions` page already fetches this); (c) per-chapter "State After" from the 9 arc ledger files via `getAllCharacterArcs()` (same function used in the planned IDEA-062 hindsight panel). Implementation: (1) New `/profile/reread/page.tsx` server component gated by `show_all_content === true`; (2) Fetch all 3 data sources server-side for the authenticated user; (3) For each CH01–CH17 chapter, render a collapsible accordion card containing: chapter title + link, highlights section (if any), questions section (if any), and arc state section (if any); (4) Cards with zero activity shown at lower opacity (greyed out), so active chapters visually stand out. Post-read-world requirements: (a) Hidden for non-`show_all_content` readers — server redirect to `/profile` if flag is false; (b) Integration with `show_all_content`: direct server-side check; (c) Partial-completion: flag validated server-side — no edge case. One new route, no new DB tables, no new content files. Prerequisite: IDEA-062 (hindsight panel) establishes the arc parsing utility `chapter-hindsight.ts` which this page can reuse. Estimated 3 hours.

---

## Parked

*(Ideas parked by the 3-day stale rule, out of theme focus, or superseded.)*

### [IDEA-047] Harmonic State Gallery — Valkyrie-1 States for Re-Readers
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-02
- **Last Updated:** 2026-05-05
- **Summary:** A dedicated section on the Valkyrie-1 entity page showcasing the ship in each of its 5 canonical harmonic states with visual renders and in-world descriptions.
- **Night Notes:**
  - 2026-05-02 (Run 18): Seeded. Implementation mainly a display page reusing state images + spec data. FIX-048 (committed images) linked — design for Supabase-first from the start.
  - 2026-05-05 (Run 21): Stale 3 days — likely low priority or too complex. Demoting to parked. Un-park when FIX-048 is resolved and images move to Supabase. Related: IDEA-053 (Valkyrie-1 Interior Map) could combine with this into a "Valkyrie-1 Explorer" page.

---

### [IDEA-046] Harmonic State Visualizer — Reader-Triggered Valkyrie-1 State Renders
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-02
- **Last Updated:** 2026-05-05
- **Summary:** When a reader asks "What does the Valkyrie look like during alignment?" the Ask API detects visual intent, calls `synthesizeVisualPrompt` with the relevant `state` param, and returns an inline image. The visual spec system already has all 5 states defined.
- **Night Notes:**
  - 2026-05-02 (Run 18): Seeded. Spec files at `content/wiki/specs/valkyrie-1/states/` already exist. Bridges author pipeline to reader-triggered Ask intent. Model: Imagen 4. Cost: ~$0.04–$0.08/image; 3 imgs/reader/hour. Caching: shared per-state. Spoiler gating: N/A under companion-first. Canon grounding: valkyrie-1 states JSON.
  - 2026-05-05 (Run 21): Stale 3 days — likely low priority or too complex. Demoting to parked. Superseded by IDEA-043 (on-demand scene visualization), which covers the visual intent detection path more generally. Un-park as a specialization of IDEA-043 once IDEA-043 ships.

---

### [IDEA-045] Ask Ambient Context Whispers During Reading
- **Status:** parked
- **Theme:** ask-forward
- **Seeded:** 2026-05-02
- **Last Updated:** 2026-05-05
- **Summary:** While a reader scrolls through a chapter page, a subtle ambient indicator appears alongside paragraphs for which the Ask companion has relevant context. Clicking/tapping opens Ask pre-seeded with that paragraph's text — proactive surfacing rather than waiting for the reader to invoke.
- **Night Notes:**
  - 2026-05-02 (Run 18): Seeded. Extends IDEA-040 (chapter CTA) to per-paragraph granularity. The `?highlight=` param in Ask (IDEA-018, shipped) already handles passage pre-seeding. Idea: marking paragraphs with entity mentions (from `chapter_tags.json`) as "Ask-able".
  - 2026-05-05 (Run 21): Stale 3 days — likely low priority or too complex. Demoting to parked. The per-scene variant (IDEA-051) and per-chapter CTA (IDEA-048) are both more feasible stepping stones. Un-park after IDEA-051 ships if per-paragraph granularity is still wanted.

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
