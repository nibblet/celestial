# BACKLOG — Celestial Interactive Book Companion

> Ideas backlog with maturity tracking. Three focused themes: **ask-forward**, **genmedia**, **post-read-world**.
> **Context note:** This backlog was restructured on 2026-05-01 (Run 17) to adopt the three-theme format. All Category 1/Category 2 ideas that did not fit a theme are now parked.
> Last updated: 2026-05-25 (Run 40)

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
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-13
- **Last Updated:** 2026-05-18
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-075-ask-pinned-qa.md`
- **Summary:** Readers can star/pin individual assistant message bubbles in an Ask conversation. Pinned exchanges (the paired user question + assistant answer) appear as a "Things I learned" collection on `/profile/questions`. Makes the companion feel like a personal research tool, not just a chat window.
- **Night Notes:**
  - 2026-05-13 (Run 28): Seeded. `cel_messages` already stores all conversation turns. Implementation: (1) New `pinned` boolean column on `cel_messages` (requires migration 042 — migrations 040 and 041 are reserved for FIX-026 and FIX-052 respectively); (2) Star icon button on each assistant message bubble in `ask/page.tsx` — POST to `/api/ask/pin` toggling `pinned` flag; (3) `/profile/questions/page.tsx` extended to also show pinned Ask pairs grouped by chapter (existing page shows question-type interactions; pinned pairs are a new section). Zero new DB tables. Requires migration for the column. Auth required (no guest path). Estimated 2.5 hours including migration.
  - 2026-05-15 (Run 30): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-075-ask-pinned-qa.md`. Key design addition vs seed: adds `pin_question_snapshot TEXT` column alongside `pinned` to store a snapshot of the paired user question at pin time — makes the profile page query a single fetch with no N+1. The `/api/ask/pin` POST route looks up the preceding user message in the same conversation server-side when `pinned=true` and stores it. Profile page: new "Pinned Exchanges" section above existing question list, only rendered when at least one pin exists. Link opens conversation at `/ask?conversation={id}`. Priority raised to P2. Estimated 2.5 hours.
  - 2026-05-18 (Run 33): **Promoted to `ready`.** Dev plan confirmed complete and present: `DEVPLAN-IDEA-075-ask-pinned-qa.md`. No new blockers. Ready for Paul to execute.

---

### [IDEA-078] Ask Response Confidence Ring — Grounding Signal on Answer Bubbles
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-14
- **Last Updated:** 2026-05-20
- **Priority:** P3
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-078-ask-confidence-ring.md`
- **Summary:** A subtle left-border accent on each Ask assistant message bubble derived from `linksInAnswer.length` in the `done` SSE event — ocean border (3+ wiki links cited), muted clay border (1–2 links), no accent (zero links). Helps readers calibrate trust in answers without exposing raw retrieval metadata. Pure client-side, ~8 lines of JSX, no API or DB changes.
- **Night Notes:**
  - 2026-05-14 (Run 29): Seeded. The `done` SSE event already returns `linksInAnswer: { href, text }[]` on the client. `linksInAnswer.length` is a simple proxy for grounding quality (0 = no wiki evidence cited; 3+ = well-grounded). Implementation: in `ask/page.tsx`, after streaming completes, compute a `confidence` level (`low | medium | high`) from `linksInAnswer.length` thresholds (e.g., 0 = low, 1-2 = medium, 3+ = high). Add a thin left-border or ring on the response bubble `<div>` using Tailwind classes driven by this level: `border-l-2` with color `text-ink-ghost` (low), `text-ocean` (medium), `text-teal-400` (high). No new API changes. No new fetch. No DB. Pure client-side visual using data already returned. ~15 lines of JSX change in `ask/page.tsx`. Caveat: `linksInAnswer` reflects cited links, not total evidence retrieved — a well-grounded answer with no inline links will show low. Track this as a known approximation.
  - 2026-05-16 (Run 31): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-078-ask-confidence-ring.md`. Key implementation detail confirmed: `msg.evidence.linksInAnswer` is already in client React state. The bubble `<div>` at `ask/page.tsx:698–703` uses `border border-[var(--color-border)]` for assistant messages — adding a `border-l-[3px]` accent with `border-l-[var(--color-ocean)]` (≥3 links) or `border-l-[var(--color-clay)]/50` (1–2 links) is the minimal change. Verify `--color-ocean` CSS var is in `globals.css` before executing. Estimated 20 minutes. 1-file change: `ask/page.tsx`. Priority set to P3 (polish, no functional gap).
  - 2026-05-20 (Run 35): **Promoted to `ready`.** Dev plan confirmed present: `DEVPLAN-IDEA-078-ask-confidence-ring.md`. No new blockers.

---

### [IDEA-081] Chapter Ask Badge on Story Grid — "You Explored This" Signal
- **Status:** parked
- **Theme:** ask-forward
- **Seeded:** 2026-05-15
- **Last Updated:** 2026-05-18
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When a reader has asked 3 or more Ask questions about a specific chapter (tracked via `cel_chapter_questions`), a small "Explored" badge or pill appears on that chapter's card in the `/stories` grid. A subtle signal that the reader engaged deeply with the chapter through the companion, without cluttering the grid for chapters with little Ask activity.
- **Night Notes:**
  - 2026-05-15 (Run 30): Seeded. `cel_chapter_questions` already stores `story_id`, `user_id`, and each question. Implementation: (1) In `StoriesPageClient.tsx` (or the server component loading story cards), issue one grouped count query: `SELECT story_id, count(*) as q_count FROM cel_chapter_questions WHERE user_id = $user GROUP BY story_id HAVING count(*) >= 3`; (2) Pass a `Set<string>` of "explored" story IDs as a prop to story card components; (3) Render a small badge (e.g., `🔭 Explored` or a text pill) on matching cards. No new DB, no new routes. Auth-gated (guests have no `cel_chapter_questions` rows). Works for all readers under companion-first. The threshold of 3 is a UX judgment call — could be 2 or 5. Estimated 1 hour.
  - 2026-05-18 (Run 33): Stale 3 days — likely low priority or too complex. Demoting to parked. Un-park when the stories grid is being revisited for ask-forward polish (after IDEA-048, IDEA-057 ship).

---

### [IDEA-084] Ask Home Hero Widget — No-Story-Context Entry Point on Home Page
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-16
- **Last Updated:** 2026-05-18
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-084-ask-home-hero-widget.md`
- **Summary:** A prominent Ask entry widget on the home shell (`/`) — a single text input with a "Ask the Archive →" call-to-action — placed in the hero section above the chapter grid. Unlike all current Ask CTAs (which require a story context), this one opens `/ask` with no pre-set `?story=` param, letting readers ask anything about the universe from the moment they land. Makes Ask the primary action on the home page, not just a feature on story pages.
- **Night Notes:**
  - 2026-05-16 (Run 31): Seeded. The home page (`src/components/home/HomePageClient.tsx`) is a `'use client'` component with a hero section, nav cards, and chapter grid. Adding a pre-typed text box that reads `onSubmit` and routes to `/ask?q={encodeURIComponent(text)}` would work if the Ask page reads the `?q=` param and pre-populates it. The Ask page already handles `?story=` and `?entity=` params — adding `?q=` as a "pre-seeded first question" is a parallel pattern. Implementation: (1) Extend `ask/page.tsx` to read a `?q=` search param and on mount, if `messages.length === 0 && q`, auto-submit it as the first user message; (2) Add a small text input form to `HomePageClient.tsx` hero section with placeholder "Ask anything about the universe…" and `onSubmit` routing to `/ask?q={encodedQ}`. No new API routes, no DB changes. Auth-agnostic (works for guests too — they see the generic Ask response). Estimated 45 minutes.
  - 2026-05-17 (Run 32): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-084-ask-home-hero-widget.md`. Implementation confirmed via codebase read: `HomeHero.tsx` is a `'use client'` component with parallax state; adding `useRouter` + `useState(query)` + submit handler + form JSX is clean and self-contained. The widget goes inside the existing `.relative.z-10` content div, after the tagline `<p>`. In `ask/page.tsx`, a new `?q=` param read + `quickQFiredRef` + auto-submit effect parallel to the existing `?passage=` auto-submit pattern (lines 553–575) handles the auto-send. 2-file change: `HomeHero.tsx` (~35 lines) + `ask/page.tsx` (~8 lines). Estimated 45 minutes. Priority P2.
  - 2026-05-18 (Run 33): **Promoted to `ready`.** Dev plan confirmed complete and present. Ready to execute — fastest home-page Ask integration in the queue.

---

### [IDEA-087] Ask Source Deep-Dive Panel — Expanded Entity Card on Citation Links
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-17
- **Last Updated:** 2026-05-20
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-087-ask-source-deep-dive.md`
- **Summary:** When an Ask companion response includes wiki entity links (surfaced in `AskSourcesDisclosure`), each source link gets an expandable "See full entry" mini-panel that shows the entity's type badge, one-line description, and a direct "Open wiki page →" link — all without leaving the Ask flow. Deepens the Ask-to-wiki navigation loop and surfaces the retrieval grounding more legibly.
- **Night Notes:**
  - 2026-05-17 (Run 32): Seeded. The existing `AskSourcesDisclosure` component in `ask/page.tsx` renders `linksInAnswer` as a compact disclosure section. Each link already has `href` and `text`. Entity type can be derived from the href path segment (e.g., `/characters/alara` → "Character", `/factions/rigel-protocol` → "Faction") — same derivation used in the planned `EntityHoverCard` (IDEA-063). A short description could be fetched from `static-data.ts` entity index (already loaded server-side for wiki pages) or read from the entity slug mapping. Implementation: (1) In `AskSourcesDisclosure`, each link row gets an optional `<details>` accordion below it; (2) The accordion body renders entity type badge + wiki description pulled from a client-safe entity map; (3) The map could be passed as a prop from `ask/page.tsx` (a small subset of `static-data.ts` loaded at request time) or fetched lazily via a `/api/entity-meta/{slug}` micro-endpoint. The lazy fetch path avoids bundle bloat. No new DB, no AI calls, no generation cost. Estimated 2 hours. Synergistic with IDEA-063 (EntityHoverCard) — the two features share entity-type-from-href logic.
  - 2026-05-19 (Run 34): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-087-ask-source-deep-dive.md`. Implementation confirmed via codebase read. Two files: (1) New `src/app/api/entity-meta/route.ts` — GET endpoint accepting `?slug=X`; calls `resolveWikiSlug()` from `slug-resolver.ts` (already server-safe, uses `fs`); reads first non-heading paragraph of the entity markdown as `excerpt`; returns `{ found, name, kind, href, excerpt }`; no auth required (entity data is public). (2) `src/app/ask/page.tsx`: add `expandedSlug` + `metaCache` state to `AskSourcesDisclosure`; add `▸`/`▾` toggle per link row; lazy-fetch `/api/entity-meta?slug={slug}` on expand; render type badge + excerpt + "Open wiki page →" when loaded. Entity type badge derived client-side from href path segment — no API call for the badge. No new npm packages; no DB; no AI calls; no content changes. Estimated 2 hours. Priority P2.
  - 2026-05-20 (Run 35): **Promoted to `ready`.** Dev plan confirmed present: `DEVPLAN-IDEA-087-ask-source-deep-dive.md`. No new blockers.

---

### [IDEA-090] Ask Command Palette — Global Keyboard-Shortcut Companion Invocation
- **Status:** parked
- **Theme:** ask-forward
- **Seeded:** 2026-05-18
- **Last Updated:** 2026-05-21
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A global `Cmd+K`/`Ctrl+K` keyboard shortcut (from any page in the app) opens a floating command palette modal — a frosted-glass panel with a text input pre-focused. Submitting routes to `/ask?q={encodedQ}`, making Ask feel like a first-class keyboard-native shell command rather than a page you navigate to. The palette also surfaces 3 recent questions from `localStorage` and a typeahead entity search against static entity names.
- **Night Notes:**
  - 2026-05-18 (Run 33): Seeded.
  - 2026-05-21 (Run 36): Stale 3 days — likely low priority or too complex. Demoting to parked. The home hero widget (IDEA-084, ready) and Ask CTA on story/entity pages cover the primary entry-point gap. Un-park if Paul wants a universal keyboard-native invocation surface across all pages. The home page hero widget (IDEA-084) solves the problem for homepage entry; the command palette solves it universally — from a chapter detail page, a character wiki page, or mid-scroll anywhere. Implementation: (1) New `src/components/ask/AskCommandPalette.tsx` — `'use client'` component that listens for `keydown` with `(ctrlKey || metaKey) && key === 'k'` via a `useEffect` on `document`; (2) Renders as a full-screen semi-transparent backdrop + centered frosted-glass modal with a text `<input>` (autofocused on open) and recent questions list loaded from `localStorage` key `celestial_recent_questions`; (3) On submit → `router.push('/ask?q={encodedQ}')` + dismiss; on Escape → dismiss; (4) Mount in `src/app/layout.tsx` so it's available everywhere; (5) `ask/page.tsx` reads `?q=` param and auto-submits (same change as IDEA-084 — the two features share this one `ask/page.tsx` edit). After a successful Ask response, append the question text to `localStorage` recent list (max 5 entries). No new API routes, no DB changes, zero npm packages (uses Tailwind). Estimated 1.5 hours. Works for guests (routes to Ask page, which handles unauthenticated users gracefully).

---

### [IDEA-093] Character Voice Mode — Ask the Crew in First Person
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-19
- **Last Updated:** 2026-05-21
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-093-character-voice-mode.md`
- **Summary:** A character selector badge on the Ask page lets the reader choose one of the 9 main crew members. Subsequent questions are answered as if spoken in that character's first-person voice, grounded in their arc ledger "Starting State" + character wiki entry. Transforms the archive companion into a direct conversation with the fictional crew.
- **Night Notes:**
  - 2026-05-19 (Run 34): Seeded. The ask_answerer persona already has access to character arc context via `getCharacterArcContext()` injected in `sharedContentBlock()`. A voice-mode toggle would (1) add a horizontal character chip row beneath the Ask input in `ask/page.tsx` — clicking a chip sets `voiceCharacter: string | null` state; (2) include `voiceCharacter` in the `/api/ask` POST body; (3) in `orchestrateAsk()`, if `voiceCharacter` is set, append a system-prompt block: "Respond as {CHARACTER_NAME} in first-person. Ground your answers only in this character's documented experiences up to their established arc state. Do not invent events or speak about other characters' inner states." + inject that character's Starting State + wiki profile text. The selector chip row has a "None (Archive)" default option, preserving existing behavior. Implementation: 2 state additions to `ask/page.tsx` + 1 param in the API route + ~20 lines in `perspectives.ts` or `prompts.ts`. No new DB, no new content files. Content grounding: `content/wiki/arcs/characters/{slug}.md` "Starting State" entry (safe — no arc-endpoint spoilers). Estimated 1.5 hours. Works for all users under companion-first. Latency unchanged (no additional AI calls; one system-prompt modification). No spoiler concern: character voice mode draws only from publicly accessible wiki + starting-state arc data.
  - 2026-05-20 (Run 35): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-093-character-voice-mode.md`. Implementation confirmed via codebase read: `getCharacterArcBySlug(slug)` already exists in `character-arcs.ts:75`; `PersonaPromptArgs` type is in `perspectives.ts:71`; `buildAskAnswererPrompt()` at `perspectives.ts:282` is the correct injection point. 4-file change: `perspectives.ts` (add field + helper fn + modify prompt builder), `orchestrator.ts` (add to `OrchestrateParams` + pass through), `api/ask/route.ts` (destructure + validate against allowlist), `ask/page.tsx` (CREW_CHIPS constant + state + chip row UI + POST body). Server validates slug against hardcoded allowlist — no arbitrary string injection. Draws only from "Starting State" arc section (~800 chars). Priority P2. Estimated 1.5 hours.
  - 2026-05-21 (Run 36): **Promoted to `ready`.** Dev plan confirmed present and complete: `DEVPLAN-IDEA-093-character-voice-mode.md`. No new blockers. All plumbing confirmed in code; 4-file change, 1.5 hr. Next to ship after IDEA-048/IDEA-084 cluster.

---

### [IDEA-096] Ask Live Context Band — Visual Grounding Indicator Above the Input
- **Status:** ready
- **Theme:** ask-forward
- **Seeded:** 2026-05-20
- **Last Updated:** 2026-05-22
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-096-ask-live-context-band.md`
- **Summary:** A compact strip rendered between the thread and the input bar showing the active context for the next message — story name (if `?story=` set), voice character (if IDEA-093 active), and any entity context (if `?entity=` set) — as dismissable pill badges. Gives readers visual feedback on what's grounding the companion before they type. Zero API calls; pure client-side React state display.
- **Night Notes:**
  - 2026-05-20 (Run 35): Seeded. Currently the Ask page has a breadcrumb-style story title shown near the top of the thread, but readers have no inline reminder near the input of what context is active. This is especially relevant with IDEA-093 (Character Voice Mode) shipping — a reader may forget they have "ALARA" selected mid-session. Implementation: (1) Render a `<div>` between the thread scroll area and the form (just above the chip row from IDEA-093); (2) Shows dismissable `×` pills: one for story ("📖 Chapter N: Title"), one for voice character ("🎙 Responding as ALARA"), one for entity context ("🔍 ALARA"). Each × clears its respective state. (3) If no context is active (all null/undefined), the strip renders nothing (zero height); no layout shift when context is absent. (4) All state (storySlug, voiceCharacter, entitySlug) is already in `ask/page.tsx` React state — this is a pure display layer, ~20 lines JSX. Zero new API routes, zero DB, zero npm packages. Synergistic with IDEA-093 (character chips), IDEA-084 (home widget auto-submit), IDEA-069 (entity-level CTA). Estimated 30 minutes.
  - 2026-05-22 (Run 37): **Promoted to `ready`.** Dev plan written: `DEVPLAN-IDEA-096-ask-live-context-band.md`. Phase 1 (story context pill using existing `contextStoryId` + `contextStoryTitle` state vars) is independently deployable today — 15 minutes, 1-file change (`ask/page.tsx`). Phase 2 (voice character pill) awaits IDEA-093; Phase 3 (entity pill) awaits IDEA-069. All three phases are backward-compatible — each pill block only renders when its state var is non-null. Priority raised to P2.

---

### [IDEA-105] Ask "Brief Mode" Toggle — 3-Sentence Response Constraint
- **Status:** planned
- **Theme:** ask-forward
- **Seeded:** 2026-05-23
- **Last Updated:** 2026-05-24
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-105-ask-brief-mode-toggle.md`
- **Summary:** A small "Brief / Full" toggle on the Ask page that appends a system-prompt constraint ("Respond in 3 sentences or fewer") when Brief is active. Some readers want quick factual answers; others want depth. Zero new API routes, zero DB, zero npm. Estimated 30 minutes: 1 state toggle + 1 param + 5 lines in `perspectives.ts`.
- **Night Notes:**
  - 2026-05-23 (Run 38): Seeded. The Ask companion currently has no response length control — it produces medium-length narrative answers by default. A "Brief" toggle is the minimum viable depth switch. Implementation: (1) Add `isBriefMode: boolean` to `ask/page.tsx` React state, initialized from `localStorage` key `celestial_ask_brief`; (2) Render a small `<button>` labeled "Brief / Full" near the input row — same row as voice chips from IDEA-093; (3) Include `briefMode: isBriefMode` in the `/api/ask` POST body; (4) In `api/ask/route.ts`, destructure `briefMode` and pass to `orchestrateAsk()`; (5) In `perspectives.ts` `buildAskAnswererPrompt()`, if `briefMode === true`, append a constraint line to the user-facing prompt: "Respond in 3 complete sentences or fewer. Prioritize the most critical fact." This is a system-prompt modification, not content filtering — no spoiler implications. Toggle persists in localStorage. Guest-compatible (no auth needed). Synergistic with IDEA-093 (voice mode can be combined with brief mode — "Brief ALARA" gives a first-person 3-sentence answer). 1 state var + 4 small file edits. Estimated 30 minutes. No new imports, no new routes, no migrations.
  - 2026-05-24 (Run 39): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-105-ask-brief-mode-toggle.md`. Implementation confirmed via codebase read: `PersonaPromptArgs` type at `perspectives.ts:71`; `buildAskAnswererPrompt` at `perspectives.ts:282`; `OrchestrateParams` at `orchestrator.ts:60`; `buildPromptArgs` return at `orchestrator.ts:324`; POST body at `ask/page.tsx:401`; mode toggle UI at `ask/page.tsx:597`. Exact pattern matches existing `askMode` localStorage toggle (same constant/reader/state/effect/POST-body/UI structure). 4-file change. Priority raised to P2. Estimated 30 minutes.

---

### [IDEA-108] Ask Reading Dwell Nudge — Ambient Chapter-Page Ask Prompt After 90s
- **Status:** planned
- **Theme:** ask-forward
- **Seeded:** 2026-05-24
- **Last Updated:** 2026-05-25
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-108-ask-reading-dwell-nudge.md`
- **Summary:** After a reader has been on a chapter page for 90 seconds with scrolling activity detected (not idle), a subtle non-modal floating pill bar appears at the bottom of the viewport: "Ask about [Chapter Title] →" with a dismiss `×`. Clicking navigates to `/ask?story={storyId}`. A lightweight presence cue for readers who haven't discovered Ask organically. One-per-chapter-session (sessionStorage flag prevents repeat). Pure client-side component, zero API, zero DB.
- **Night Notes:**
  - 2026-05-24 (Run 39): Seeded. The current Ask CTAs are explicit (buttons Paul must build) or page-level (a link in the hero). The dwell nudge is passive — it appears only after the reader is clearly engaged (90s + scroll). Zero new API routes. Zero DB. Zero npm packages. No spoiler concern — the bar just links to Ask with story context. Works for guests (no auth check). Estimated: 1 hour. Synergistic with IDEA-057 (context-aware welcome) — the nudge routes to Ask which shows the chapter-specific welcome. Prerequisite: none.
  - 2026-05-25 (Run 40): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-108-ask-reading-dwell-nudge.md`. Implementation confirmed: 2-file change — new `src/components/stories/AskDwellNudge.tsx` (client component with `useRef hasScrolled`, 90s `setTimeout`, sessionStorage guard, fixed pill bar) + `src/app/stories/[storyId]/page.tsx` (add component near return root). No portal needed — `fixed` CSS positioning achieves the overlay effect without `document.body` mutation. The scroll listener uses `{ passive: true }`. Session key: `ask_nudge_{storyId}`. Priority raised to P2. Estimated 1 hour.

---

### [IDEA-099] Floating Chapter Ask Widget — Inline Ask Drawer on Reading Pages
- **Status:** parked
- **Theme:** ask-forward
- **Seeded:** 2026-05-21
- **Last Updated:** 2026-05-24
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A persistent floating action button on chapter reading pages (`/stories/[storyId]`) that opens a slide-in mini Ask panel on the right edge of the viewport — showing the last 3 conversation exchanges and a text input — so readers can consult the companion without navigating away from the chapter text.
- **Night Notes:**
  - 2026-05-21 (Run 36): Seeded. The current Ask CTAs all require navigating to `/ask`, losing the reader's scroll position and reading context. A floating drawer solves this: (1) A small circular FAB (floating action button) at the bottom-right of the chapter page — containing a sparkle or compass icon; (2) Clicking opens a `<aside>` slide-in panel (~320px wide) overlaying the right edge of the viewport, with backdrop overlay; (3) The panel hosts a mini chat thread (last 3 exchanges from the current session, stored in component state) and a single-line input that fires POST `/api/ask` with `storySlug` context; (4) Streaming responses render in the panel thread in real time; (5) An "Open in full Ask →" link at the top navigates to `/ask?story={storyId}&conversation={id}` if they want more. Implementation: a new `AskFloatingDrawer.tsx` client component — uses `useState(open)`, a `useRef` for the thread, and the same streaming pattern as `ask/page.tsx`. Added to `stories/[storyId]/page.tsx` near the page root. Context: `storySlug` passed as a prop. The drawer can start with the same 3 suggested chips from `chapter_tags.json` as IDEA-057 (context-aware welcome). Spoiler: none — the drawer uses the same `/api/ask` endpoint with the same gating; all content accessible under companion-first. Zero new routes, zero new DB tables. Estimated 3 hours (new streaming component from scratch + panel layout). Prerequisite: IDEA-057 (context-aware welcome chips) could share a server fetch. Synergistic with IDEA-093 (character voice mode chips could appear in the drawer too). Key design question: does the drawer persist state across scroll, or reset on each chapter navigation? Answer: persist in React state for the session (page mount).
  - 2026-05-24 (Run 39): Stale 3 days — likely low priority or too complex. Demoting to parked. The 3-hour new streaming component scope is substantial; simpler Ask CTAs (IDEA-048, IDEA-051, IDEA-102) should ship first to validate the chapter-page Ask entry pattern before building an embedded panel. Un-park when Paul is ready to invest in a native in-chapter Ask surface.

---

### [IDEA-102] Ask Empty State Chapter Grid — Discovery Entry Point Without Story Context
- **Status:** planned
- **Theme:** ask-forward
- **Seeded:** 2026-05-22
- **Last Updated:** 2026-05-23
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-102-ask-empty-state-chapter-grid.md`
- **Summary:** When the Ask page is opened without a `?story=` param and no prior messages exist, the empty state displays a compact 17-chapter mini-grid as discovery chips — "Explore CH01", "Explore CH02", etc. — letting readers ground the companion in a chapter they want to ask about without needing to navigate back to the chapter list first.
- **Night Notes:**
  - 2026-05-22 (Run 37): Seeded. IDEA-057 (Context-Aware Welcome, ready) handles the empty state when `?story=` IS set — this idea is the complementary discovery flow for readers who land on Ask directly (e.g., from the home hero widget of IDEA-084 without pre-filling a query). The 17 chapter tiles can be rendered from a static constant (all 17 CH slugs + titles, sourced from `static-data.ts` or a compact server-side fetch). Clicking a tile sets `contextStoryId` (equivalent to `/ask?story=ch01`) and triggers the IDEA-057 welcome greeting. The grid displays as 6 tiles per row in a compact `text-sm` style with chapter number + short title. When `?story=` IS set, the grid is replaced by the IDEA-057 chapter-specific welcome (no overlap). Implementation: extend the empty-state branch in `ask/page.tsx` — add a 3rd sub-branch: `if (!contextStoryId && !messages.length) { show chapter grid }`. The grid can use a `CHAPTER_QUICK_TILES` static constant (17 slug + title pairs). Zero new API routes, zero DB. Chapter titles already available in `static-data.ts` story list. Estimated 45 minutes. Synergistic with IDEA-057 (which kicks in after a tile is clicked), IDEA-084 (home widget routes to Ask — these tiles are the fallback if no `?q=` is provided).
  - 2026-05-23 (Run 38): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-102-ask-empty-state-chapter-grid.md`. Implementation confirmed via codebase read: empty state block is at `ask/page.tsx` lines 672–691. Key decisions: (1) `CHAPTER_QUICK_TILES` hardcoded (17 entries, not imported from `static-data.ts`) to avoid ~500KB bundle bloat — titles verified at plan-write time; (2) `useRouter` added alongside existing `useSearchParams` import; (3) Grid shows ONLY when `!storySlug && !prefilledPrompt && !urlPassage` — generic chips remain for all other empty-state contexts (backward compatible with IDEA-057 landing); (4) Clicking a tile calls `router.push('/ask?story=CH01')` — sets URL param, activates breadcrumb, triggers IDEA-057 welcome when that ships. Priority raised to P2. Estimated 45 minutes. 1-file change: `ask/page.tsx`.

---

### [IDEA-111] Ask Scene Jump — Inline Source Navigation from Companion Answer to Chapter Text
- **Status:** seed
- **Theme:** ask-forward
- **Seeded:** 2026-05-25
- **Last Updated:** 2026-05-25
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When an Ask answer references a specific chapter scene (identified by a story link in `linksInAnswer`), a small "Jump to scene →" link appears below the answer bubble routing to `/stories/{storyId}`. Makes Ask a two-way navigation layer: readers ask a question, get an answer grounded in a chapter, then jump directly to that chapter to read the source text.
- **Night Notes:**
  - 2026-05-25 (Run 40): Seeded. The `done` SSE event already returns `linksInAnswer: { href, text }[]` on the client. Story links follow the pattern `/stories/CH01`, `/stories/CH02` etc. After stream completion, filter `linksInAnswer` for hrefs starting with `/stories/` — if any exist, render a compact "Jump to scene →" button row below the assistant message bubble (between the text bubble and `AskSourcesDisclosure`). The button links to `/stories/{storyId}` (without a scene anchor initially; scene-level linking can be added later when scene slugs are in the evidence payload). Multiple story links → first one is used (or a short list of distinct chapter links, max 2). No API changes needed. No DB. No npm packages. Client-side only: add a `storyLinksInAnswer` computed value from `msg.evidence.linksInAnswer` after the `done` event. Implementation: ~15 lines of JSX in `ask/page.tsx` within the assistant message render block (between the text div and AskSourcesDisclosure — same location where the confidence ring from IDEA-078 would go). Estimated 30 minutes. Synergistic with IDEA-078 (confidence ring) and IDEA-087 (source deep-dive) — all three add layers to the same assistant bubble post-stream area. Works for all users under companion-first. No spoiler concern — the link goes to a chapter page already accessible to the reader.

---

## genmedia

### [IDEA-088] Approved Entity Thumbnail Inline in Ask Answers — Zero-Gen Visual Bridge
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-17
- **Last Updated:** 2026-05-20
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When an Ask response references a wiki entity via a link in `linksInAnswer`, and that entity has an approved visual asset in `cel_visual_assets` (e.g., a character portrait from IDEA-052), a small circular thumbnail (40×40px) appears inline next to the entity link inside the answer bubble. Zero generation cost; purely displays pre-approved author assets. Requires IDEA-052 (canonical character portraits) to ship first to populate the asset table meaningfully.
- **Night Notes:**
  - 2026-05-17 (Run 32): Seeded. A simpler, more targeted variant of the previously parked IDEA-070 (which added thumbnails to AskSourcesDisclosure). This version embeds the thumbnail directly adjacent to the entity wiki link inside the rendered markdown — inside `ASSISTANT_MARKDOWN_COMPONENTS.a` in `ask/page.tsx` (lines 30–38). After the `done` SSE event, the client has `linksInAnswer` with entity slugs. A secondary Supabase client-side fetch for approved asset URLs (one batched query after stream completes) adds the thumbnail URL to each link entry. (1) Model/provider: N/A — no generation. (2) Cost per generation: $0 — assets are pre-approved. (3) Caching: approved assets are in Supabase Storage with public URLs; client caches response in component state for the session. (4) Spoiler gating of prompt inputs: N/A — no AI generation; entity visuals are decorative world-building, not narrative text. (5) Canon grounding: thumbnails come exclusively from `cel_visual_assets` with `approved=true` — author-curated canonical renders only. Prerequisite: IDEA-052 (character portraits) must ship first. Fallback: if no approved asset exists, the link renders exactly as today. Estimated 2 hours after IDEA-052 ships. Related: supersedes IDEA-070 (parked).
  - 2026-05-20 (Run 35): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by IDEA-052 (character portraits) prerequisite — no approved assets to display yet. Superseded in part by IDEA-070 (parked) and overlaps with IDEA-087 (Ask Source Deep-Dive, now ready). Un-park after IDEA-052 ships to populate assets and the thumbnail display scope is confirmed as distinct from IDEA-087.

---

### [IDEA-091] Faction Propaganda Poster — In-World Diegetic Artifact via Ask
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-18
- **Last Updated:** 2026-05-21
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When a reader asks "Show me the Rigel Protocol" or "What does the Vault Accord look like?" in the Ask companion, the system detects faction visual intent and generates a diegetic "propaganda poster" or recruitment artifact from that faction's perspective via Imagen 4 — not a scene render, but an in-world object that feels like it was produced by the faction itself. Government-style visual for Earth factions (`earth_institutional` preset); organic/geometric for Resonant-aligned factions (`alien_organic` preset).
- **Night Notes:**
  - 2026-05-18 (Run 33): Seeded. This is a specialization of IDEA-043 (on-demand scene visualization) that targets faction entities specifically.
  - 2026-05-21 (Run 36): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by IDEA-043 (on-demand visualization) as a prerequisite. Un-park after IDEA-043 ships and the visual intent pipeline is established. The key differentiator is the diegetic artifact framing — the prompt explicitly requests an in-world document/poster aesthetic rather than a cinematic scene. Implementation extends IDEA-043's `ask-intent.ts` visual intent detection with a `faction_artifact` sub-type (detected when a faction entity slug is in the message). (1) Model/provider: Imagen 4 (~$0.04–$0.08/image). (2) Cost budget: ~$0.06/generation; 3 images/reader/hour (shared with IDEA-043 rate limit via `cel_rate_limits` once FIX-052 ships). (3) Caching: per (faction-slug, style, corpusVersion) hash — shared cache, not user-scoped. (4) Spoiler gating of prompt inputs: faction identity is non-narrative; no story events in prompts. All content visible under companion-first; no chapter gate needed. (5) Canon grounding: `content/wiki/factions/{slug}.md` + any `content/wiki/specs/{faction-slug}/master.json` (if seeded); preset auto-selected from faction's world-affiliation (WORLD B for Earth factions, WORLD A for Resonant/alien factions, WORLD C for Vault-aligned factions). Prerequisite: IDEA-043 (on-demand visualization) ships first to establish the visual intent → generation pipeline in Ask. Estimated 1 hour on top of IDEA-043.

---

### [IDEA-094] Ship Section Schematics via Ask — Blueprint-Style Technical Diagram on Demand
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-19
- **Last Updated:** 2026-05-22
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When a reader asks how the Command Dome is laid out, what the Resonant Pad looks like from above, or how a specific ship section connects to others, the Ask companion detects spatial/structural intent and offers an optional "Diagram →" inline image generated via Imagen 4 with an orthographic blueprint aesthetic — distinct from the cinematic scene renders of IDEA-043.
- **Night Notes:**
  - 2026-05-19 (Run 34): Seeded. This targets a different visual register than IDEA-043 (scene illustrations) or IDEA-094 (faction posters): schematic/technical rather than cinematic/diegetic. Reader asks "What does the Translation Bay look like?" or "Show me the Valkyrie-1 interior layout" → intent classifier detects `spatial_structure` sub-type → Imagen 4 call with a blueprint-style prompt modifier ("orthographic cutaway cross-section, labeled diagram, technical blueprint lines, no atmosphere"). The 11 interior location specs in `content/wiki/specs/` (with `parent_entity: "valkyrie-1"` inheritance chains) are ideal grounding sources — they have established WORLD A vocabulary. (1) Model/provider: Imagen 4 (`valkyrie_shipboard` preset + `schematic_overlay` style modifier string). (2) Cost budget: ~$0.06/image; 3 images/reader/hour shared with IDEA-043 rate limit. (3) Caching: per (entitySlug, "schematic", corpusVersion) hash — shared, not user-scoped; different cache key from scene renders so both can coexist. (4) Spoiler gating of prompt inputs: location/structural data is non-narrative; ship section specs contain no story events. All spec JSON and location wiki markdown is safe for all users under companion-first. (5) Canon grounding: entity spec chain from `content/wiki/specs/{slug}/` (inheriting from `valkyrie-1/master.json` via `parent_entity`) + location wiki markdown (`content/wiki/locations/{slug}.md`). Prerequisite: IDEA-043 (on-demand visualization) ships first to establish the visual intent → generation pipeline in Ask. Estimated 1.5 hours on top of IDEA-043 (adds `spatial_structure` intent sub-type + schematic prompt modifier + cache key variant).
  - 2026-05-22 (Run 37): Stale 3 days — blocked by IDEA-043 prerequisite. The schematic/technical visual register is genuinely distinct from IDEA-043's cinematic path, and the 11 interior location spec JSONs are ideal grounding sources. Demoting to parked. Un-park after IDEA-043 ships and the visual intent pipeline is established.

---

### [IDEA-106] Valkyrie-1 Dynamic State Header — Reader-Progress-Driven Harmonic State Image on Ship Wiki Page
- **Status:** exploring
- **Theme:** genmedia
- **Seeded:** 2026-05-23
- **Last Updated:** 2026-05-25
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** The `/artifacts/valkyrie-1` wiki page selects which pre-approved harmonic state image (dormant/wake/active/alignment/harmonic_jump) to display as a header image based on which state appears in the reader's most recently read chapter, derived from `chapter_tags.json`. Zero reader generation cost — uses the 5 approved state renders already committed (or moved to Supabase after FIX-048). As the reader progresses through the story, the ship's wiki page "evolves" visually.
- **Night Notes:**
  - 2026-05-23 (Run 38): Seeded. The 5 Valkyrie-1 harmonic state renders already exist at `public/images/` (FIX-048 notes they're ~15MB committed test renders). After FIX-048 resolves, these would live in `cel_visual_assets` with `approved=true` and `source='harmonic_state'`. (1) Model/provider: Imagen 4 — images already generated; author batch only, zero reader cost. (2) Cost per generation: $0 for readers — 5 pre-approved author images. (3) Caching: images in Supabase Storage with public URLs; asset lookup uses existing `/api/visuals/preferred?target=valkyrie-1&style={stateSlug}` endpoint (already exists); result cached in component state for session. (4) Spoiler gating of prompt inputs: N/A — no generation; state-to-chapter mapping uses `chapter_tags.json` entity list (world-building data, not narrative prose). No spoiler risk: showing "harmonic_jump" imagery to a reader who hasn't reached the chapter where it appears reveals only a visual aesthetic, not story events. (5) Canon grounding: `content/wiki/specs/valkyrie-1/states/{state}.json` specs ground the imagery; already generated. Implementation: (1) A new `ChapterToHarmonicState` mapping constant in `src/lib/wiki/` or inline on the page — maps chapter ranges to the ship state most prominent in that chapter group, derived from `chapter_tags.json` harmonic-state entity entries; (2) In `/artifacts/valkyrie-1` page (or `FictionEntityDetailPage`), fetch `readerProgress.currentChapterNumber`; look up the corresponding state slug; fetch the preferred approved asset via `/api/visuals/preferred`; render as a `<Image>` header if found, otherwise no header. Zero new routes beyond what already exists. Estimated 1 hour: mapping constant + one `getServerSideProps`-equivalent data fetch + header `<Image>` render. Prerequisite: FIX-048 (move images to Supabase) should execute first so the images are in `cel_visual_assets` and accessible via the preferred API — otherwise the feature works only if images remain in `public/images/` and paths are known. Synergistic with IDEA-047 (Harmonic State Gallery, parked) — this feature is a simpler first step.
  - 2026-05-25 (Run 40): **Advanced to `exploring`.** Feasibility confirmed: `chapter_tags.json` entity-slug lists per chapter provide the data source for the `ChapterToHarmonicState` mapping. The `/api/visuals/preferred` endpoint already exists and accepts `?target=valkyrie-1&style={stateSlug}` — no new routes needed. Key blocker: FIX-048 must execute first to move images from `public/images/` into `cel_visual_assets` so the preferred API can return them. One design gap: the `FictionEntityDetailPage` component in `FictionEntityViews.tsx` handles the Valkyrie-1 artifact page; adding a header image slot requires either a new prop or a direct page-level fetch in `/artifacts/valkyrie-1/page.tsx` (which doesn't exist as a custom override — it falls through to the generic artifacts route). Advance to `planned` after FIX-048 is confirmed as the next execution target.

---

### [IDEA-097] Resonant Pad Harmonic Pulse — Pre-Generated Abstract Visualization for Location Page
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-20
- **Last Updated:** 2026-05-23
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A pre-generated Imagen 4 abstract visualization of the Resonant Pad's harmonic emission pattern — an alien-organic energy field render, not a scene illustration — displayed on the `/locations/resonant-pad` wiki page via `EntityVisualsGallery`. Author-batch only (zero reader generation cost). Leverages the existing `resonant-pad` spec JSON and the WORLD A `alien_organic` vocabulary.
- **Night Notes:**
  - 2026-05-20 (Run 35): Seeded. The `resonant-pad` location has a `content/wiki/specs/resonant-pad/master.json` spec file (added commits `03d7d20` + `74aeae5`, see STATUS.md) with `parent_entity: "valkyrie-1"`. The spec chain gives full WORLD A vocabulary (bio-crystalline, petal apertures, subdermal vein emission). An abstract energy-field visualization — showing harmonic emission lines converging on the pad surface — is achievable with an Imagen 4 prompt tuned to the WORLD A aesthetic without depicting narrative events. (1) Model/provider: Imagen 4 with `valkyrie_shipboard` or `alien_organic` vocabulary (WORLD A). ~$0.06/image. (2) Cost budget: 1–2 images; author-batch only; ~$0.06–$0.12 total. (3) Caching: stored in `cel_visual_assets` with `approved=true`; surfaced on location page via existing `EntityVisualsGallery`. (4) Spoiler gating of prompt inputs: Resonant Pad specs contain no narrative events — the spec describes the physical/spatial object only. No spoiler risk. (5) Canon grounding: `content/wiki/specs/resonant-pad/master.json` + parent chain from `valkyrie-1/master.json` + `content/wiki/locations/resonant-pad.md`. No additional content needed. Prerequisite: author runs via admin console, approves asset. The existing `EntityVisualsGallery` on the location page will surface it automatically. Estimated: 20 minutes of author time, zero code changes.
  - 2026-05-23 (Run 38): Stale 3 days — likely low priority or too complex. Demoting to parked. An excellent low-cost author task (20 min, zero code), but it requires the admin console workflow to be the active focus. Un-park when Paul is running a batch generation session for location visuals. The `resonant-pad` spec is fully ready to drive generation.

---

### [IDEA-109] Vault Entry Preview Images — 10 Canonical Threshold-View Renders for Vault Wiki Pages
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-24
- **Last Updated:** 2026-05-24
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Author pre-generates one canonical "threshold view" image per vault entity (giza-vault, vault-002 through vault-010) via Imagen 4 using the `vault_threshold` preset and WORLD C vocabulary (carved stone, glyph reliefs, candle-warm interior). Images stored in `cel_visual_assets` with `approved=true` and surfaced on each vault detail page via the existing `EntityVisualsGallery`. Zero code changes — purely author-batch via admin console. Total cost: ~$0.60 for all 10 vaults.
- **Night Notes:**
  - 2026-05-24 (Run 39): Seeded. Vault entities are among the most visually distinctive in the story world — WORLD C (ancient_vault) vocabulary with glyph reliefs, carved stone, and dim interior lighting is a strong aesthetic fit for Imagen 4. The 10 vault entities in `content/wiki/vaults/` each have markdown wiki entries describing their physical characteristics. Vault spec JSONs are minimal (stub `master.json` files or absent), but `content/wiki/specs/` already has `giza-vault/` with some spec data — enough to anchor the `vault_threshold` preset. For vaults without spec JSON, the vault wiki markdown alone provides sufficient WORLD C vocabulary for a threshold-view prompt. (1) Model/provider: Imagen 4 with `vault_threshold` preset. ~$0.06/image × 10 vaults = $0.60 total; author-batch only. (2) Cost budget: ~$0.06/image; 10 images in one session; no reader generation. (3) Caching: stored in `cel_visual_assets` with `approved=true`, `source='vault_threshold'`, `target={vault-slug}`; shared/canonical. (4) Spoiler gating of prompt inputs: vault physical descriptions are world-building data — no narrative events in wiki markdown or spec JSON. Zero spoiler risk. (5) Canon grounding: `content/wiki/vaults/{slug}.md` wiki markdown + `content/wiki/specs/{vault-slug}/master.json` (where it exists, e.g., giza-vault); `vault_threshold` preset provides WORLD C base vocabulary. Prerequisite: none — author console workflow is fully operational. `EntityVisualsGallery` on vault pages already fetches and displays approved assets (confirmed in STATUS.md — gallery renders on vault detail pages). Estimated: 20–30 minutes of author time in the admin console; zero code changes.

---

### [IDEA-100] Harmonic State Portrait Composite — Character-Within-Ship State Visual via Ask
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-21
- **Last Updated:** 2026-05-24
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** When a reader asks "What does the ship look like when ALARA is in alignment?" or describes a specific Valkyrie harmonic state combined with ALARA's presence, the Ask companion detects `vessel_state_character_intent` and generates a composite image: the named harmonic state's physical spec overlaid with ALARA's noncorporeal visual signature. A portrait-within-landscape class of image unique to this story world.
- **Night Notes:**
  - 2026-05-21 (Run 36): Seeded. All 5 Valkyrie-1 harmonic states have full spec JSON at `content/wiki/specs/valkyrie-1/states/` (dormant/wake/active/alignment/harmonic_jump). ALARA has a spec path that would use the `noncorporeal_presence` preset. A composite image would combine: the named state's physical spec overrides (vein color, intensity, aperture posture) + a noncorporeal overlay (diffuse luminescent presence throughout the space) + the `valkyrie_shipboard` background. The composition creates a "ship as perceived by ALARA" visual register — not a scene render (IDEA-043) and not a portrait (IDEA-052), but a state-mediated point-of-view image. (1) Model/provider: Imagen 4 with `valkyrie_shipboard` preset + `noncorporeal_presence` style blend in prompt. ~$0.06/image. (2) Cost budget: 3 images/reader/hour shared with IDEA-043 rate limit. (3) Caching: per `(stateSlug, "alara-composite", corpusVersion)` hash — shared, not user-scoped; all 5 states can be pre-cached. (4) Spoiler gating of prompt inputs: harmonic state names are world-building vocabulary (not narrative events). ALARA's noncorporeal presence is established in early chapters — no spoiler risk. All specs visible to all users under companion-first. (5) Canon grounding: `content/wiki/specs/valkyrie-1/master.json` (WORLD A base vocab) + `content/wiki/specs/valkyrie-1/states/{state}.json` (overrides) + `content/wiki/characters/alara.md` (noncorporeal description) + Starting State from `content/wiki/arcs/characters/alara.md` (safe section only). Prerequisite: IDEA-043 (on-demand scene visualization) ships first to establish the visual-intent → generation pipeline in Ask. This extends IDEA-043 with a new `vessel_state_character` intent sub-type. Estimated: 1 hour on top of IDEA-043.
  - 2026-05-24 (Run 39): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by IDEA-043 (on-demand scene visualization) as a prerequisite. Un-park after IDEA-043 ships and the visual-intent pipeline is in place.

---

### [IDEA-103] Chapter Atmosphere Color Thumbnails — Abstract Mood Tiles on Chapter Cards
- **Status:** exploring
- **Theme:** genmedia
- **Seeded:** 2026-05-22
- **Last Updated:** 2026-05-24
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Author pre-generates one abstract 128×128px atmosphere thumbnail per chapter via Imagen 4 using only an emotional-palette prompt (dominant color + mood word derived from `chapter_tags.json` themes, no characters or locations). Stored in `cel_visual_assets` and displayed as a small decorative accent on chapter cards in the `/stories` grid. Adds visual rhythm to the chapter list at near-zero cost.
- **Night Notes:**
  - 2026-05-22 (Run 37): Seeded. This is the cheapest possible use of Imagen 4 generation — abstract color-field images that carry emotional tone only. (1) Model/provider: Imagen 4 with a 1-sentence prompt: "{primary_color} tones, {mood_adjective} atmosphere, abstract, painterly field, no text, no figures" — color and mood derived from the `themes` array in `chapter_tags.json` per chapter. (2) Cost budget: ~$0.06/image × 17 chapters = ~$1.02 total for the full set; author-batch only; negligible. (3) Caching: stored in `cel_visual_assets` with `source='chapter_atmosphere'` and `target=chapter_slug`; one image per chapter; shared canonical, never user-scoped. (4) Spoiler gating of prompt inputs: the prompt contains only a color word and a mood adjective — no character names, no location names, no narrative events. Zero spoiler risk even for earliest unread chapters. (5) Canon grounding: `chapter_tags.json` themes field per chapter → the first theme string becomes the mood adjective (e.g., "isolation", "revelation", "confrontation"); the dominant color is derived from a static mood→color mapping authored by Paul (e.g., "isolation" → "deep navy", "revelation" → "amber gold"). Author controls the mapping and can adjust before batch generation. Implementation: the existing admin console (`/profile/admin/visuals`) is the generation surface — no new routes needed. A one-time batch generation of 17 images + author approval + they surface automatically on chapter cards via `EntityVisualsGallery` (or a lightweight `<img>` from a new `/api/visuals/preferred?target={slug}&style=chapter_atmosphere` call at build time). The chapter cards in `StoriesPageClient.tsx` would need a small visual slot added if not already present. Estimated: 20 minutes author time for batch + 1 hour code for displaying the thumbnail in chapter cards.
  - 2026-05-24 (Run 39): **Advanced to `exploring`.** Feasibility assessment: (1) Author workflow is well-defined — `chapter_tags.json` already has per-chapter `themes` arrays; Paul can map each chapter's first theme to a color word offline and generate 17 prompts in a single admin console session. (2) One code gap identified: `StoriesPageClient.tsx` chapter cards have no visual thumbnail slot currently — the chapter card grid would need a small `<img>` slot or colored border accent to surface the approved asset. (3) The `/api/visuals/preferred?target={slug}&style=chapter_atmosphere` endpoint already exists and would return the approved URL without auth. Recommend: Paul defines the 17 mood→color pairs, runs the batch, and assesses visual quality before committing to the card display code. Advance to `planned` when Paul confirms the mood→color mapping approach and card display slot design.

---

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
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-12
- **Last Updated:** 2026-05-15
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Author pre-generates a set of 3 "cinematic still" images per chapter (opening atmosphere, midpoint tension, closing/resolution) via the existing visuals pipeline. Stills stored in `cel_visual_assets` with `source='chapter_still'` and a `sequence_index` (0–2). Displayed as a filmstrip-style gallery strip on each chapter detail page, above the scene navigation. Zero reader latency — author-batch only.
- **Night Notes:**
  - 2026-05-12 (Run 27): Seeded. Distinct from IDEA-049 (single "chapter hero" splash image, now parked) — this produces 3 stills per chapter that together narrate the chapter's emotional arc visually. Implementation: (1) Model/provider: Imagen 4 (~$0.06/still × 3 stills × 17 chapters = ~$3.06 total for full coverage — trivial). (2) Cost budget: author-batch only; no reader-triggered generation. (3) Caching: stills stored as approved assets in `cel_visual_assets` with `source='chapter_still'` and `sequence_index` field; shared/canonical per chapter. (4) Spoiler gating of prompt inputs: each still's prompt uses only the chapter's primary location spec from `content/wiki/specs/` and the dominant entity from `chapter_tags.json` — no narrative text, no character arc details. Style: location-appropriate preset (e.g., `valkyrie_shipboard` for shipboard chapters, `giza_archaeological` for vault chapters). (5) Canon grounding: chapter's location wiki markdown + location spec JSON + `chapter_tags.json` key entities. Schema note: a `sequence_index` int column would be needed on `cel_visual_assets` (new migration), or stills could be distinguished by the `target` field using a convention like `ch01-opening`, `ch01-midpoint`, `ch01-closing`. Prerequisite: IDEA-052 (canonical character portraits) should ship first to prove out the batch workflow; `sequence_index` schema design should align with IDEA-064 (ALARA evolution sequence, parked).
  - 2026-05-15 (Run 30): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by `sequence_index` schema decision and IDEA-052 (character portraits) prerequisite. Un-park after IDEA-052 ships and the batch workflow is proven.

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

### [IDEA-079] Mission Briefing Classified Document Art — Per-Chapter Diegetic Visual
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-14
- **Last Updated:** 2026-05-17
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Author pre-generates a stylized "classified mission document" image per chapter — a diegetic artifact that exists within the story world, showing mission designation, coordinates, and brief (in-world MARU/Rigel Protocol format). Generated via Imagen 4 with `earth_institutional` preset. Displayed on chapter detail pages as a visual prop above the scene TOC.
- **Night Notes:**
  - 2026-05-14 (Run 29): Seeded. These are diegetic documents that feel like artifacts from the story world — distinct from cinematic scene illustrations (IDEA-073) or hero images (IDEA-049, parked). They exist as props a character might hand another character. (1) Model/provider: Imagen 4 (`earth_institutional` or `earth_2050` preset — matches Rigel Protocol / Earth military aesthetics). (2) Cost budget: ~$0.06/image × 17 chapters = ~$1.02 total; trivial; author-batch only. (3) Caching: stored in `cel_visual_assets` with `source='chapter_briefing'` and `target` = chapter slug; one canonical asset per chapter. (4) Spoiler gating of prompt inputs: prompt uses only the chapter number, mission designation, and dominant location from `chapter_tags.json` — zero narrative content, zero character events. No spoiler risk. (5) Canon grounding: Rigel Protocol document format from `content/wiki/factions/rigel-protocol.md` (if exists) + `earth_institutional` preset — the visual identity of Earth-bureaucracy documents in the story. Implementation: author generates via admin console with a template prompt specifying document format; approved assets surface on chapter detail pages via a small stamp-like callout near the chapter title. Prerequisite: at least one faction spec JSON (`content/wiki/specs/rigel-protocol/master.json`) would strengthen visual consistency.
  - 2026-05-17 (Run 32): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by missing faction spec JSON for Rigel Protocol and IDEA-052 (character portraits) prerequisite. Un-park after IDEA-052 ships and batch workflow is proven.

---

### [IDEA-082] Personalized Completion Cover Art — Reader-Unique Print After Finishing the Book
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-15
- **Last Updated:** 2026-05-18
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** After a reader finishes the book (`show_all_content=true`), the Ask companion offers a one-time "Generate your Celestial cover art" from the `/ask` or `/profile` page. The image prompt seeds from the reader's most-highlighted chapter (from `cel_story_highlights` count) and their most-asked-about character (from `cel_chapter_questions` count) to produce a uniquely personalized art print. Cost: ~$0.06/reader. Cached per-user (not shared). Only available to `show_all_content` readers.
- **Night Notes:**
  - 2026-05-15 (Run 30): Seeded. Unlike all other genmedia ideas (which are author-batch canonical assets), this is the first truly per-reader personalized visual. (1) Model/provider: Imagen 4 (`intimate_crew` or `mythic_scale` preset depending on the dominant character/setting). (2) Cost budget: ~$0.06 once per reader — user-scoped not shared. Rate limit: 1 generation per profile, enforced by checking `cel_visual_assets` for an existing `source='reader_cover'` asset for the user_id. (3) Caching: per-profile — stored in `cel_visual_assets` with `source='reader_cover'`, `target = profile_id`. If asset exists, skip generation and return it. (4) Spoiler gating of prompt inputs: only available to `show_all_content=true` readers, so full corpus access is authorized. The prompt uses only entity names and preset vocabulary — no verbatim narrative prose. (5) Canon grounding: the most-highlighted chapter's primary location from `chapter_tags.json` + the most-asked-about character's spec JSON (if available) or wiki markdown. Style: chosen from `[intimate_crew, mythic_scale, valkyrie_shipboard]` based on entity type. Implementation: new `/api/visuals/reader-cover` POST route (auth required, checks `show_all_content`); new CTA button on `/profile` or `/ask` when `show_all_content=true`. Estimated 3 hours including the per-user asset lookup logic and profile page CTA.
  - 2026-05-18 (Run 33): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by IDEA-052 (character portraits) prerequisite — per-reader personalization requires approved assets to already exist. Un-park after IDEA-052 ships and the completion ceremony page (IDEA-089) establishes the `show_all_content` CTA surface.

---

### [IDEA-085] Ask Ink Print — Author-Generated Typographic Art Card from Best Ask Exchange
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-16
- **Last Updated:** 2026-05-19
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** The author selects one exceptional Ask Q&A exchange (question + answer) from the admin ledger and generates a typographic "ink print" image using Imagen 4 — the question as a bold headline and the answer's key phrase as body copy, overlaid on canonical world imagery. Displayed on a `/about/ink-print` or `/ask/featured` page as a curated "Best of the Archive" artifact. Zero reader-triggered cost; purely author-curated.
- **Night Notes:**
  - 2026-05-16 (Run 31): Seeded. The AI ledger (`cel_ai_interactions`) stores all Ask exchanges. The author could periodically select a favorite exchange via the admin interface and generate a poster-style typographic visual using Imagen 4 with the `earth_institutional` or `intimate_crew` preset. The image prompt would include: a background scene (from the chapter's location spec), a typographic treatment of the Q, and a visual focal point matching the answer's central entity. This is a curation and publishing workflow, not a reader-triggered generation. (1) Model/provider: Imagen 4 with typographic overlay (text-in-image support). (2) Cost: ~$0.06/image; author-batch only, no reader generation cost. (3) Caching: stored in `cel_visual_assets` with `source='ink_print'`; one or a small rotating gallery. (4) Spoiler gating of prompt inputs: author selects the exchange manually — they choose exchanges safe for all readers to see (world-building answers, not narrative endpoints). No automated spoiler risk. (5) Canon grounding: entity spec from the answer's primary `linksInAnswer` entity slug + preset per entity type. A "Featured exchange" could also be surfaced on the Ask empty state as an example of what the companion does — serving a dual role as showcase and Ask onboarding.
  - 2026-05-19 (Run 34): Stale 3 days — likely low priority or too complex. Demoting to parked. A `/about/ink-print` page is additional routing scope; the "featured exchange" use case is covered more directly by IDEA-043 (on-demand visualization) and the Ask confidence ring (IDEA-078). Un-park if Paul wants an explicit editorial curation surface for Ask exchanges.

---

### [IDEA-112] Faction Identity Tile — Single Compact Emblem per Faction Wiki Page
- **Status:** seed
- **Theme:** genmedia
- **Seeded:** 2026-05-25
- **Last Updated:** 2026-05-25
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** Author pre-generates one compact 128×128px "faction identity" tile per named faction via Imagen 4 — stylized iconographic color-field (no characters, no scenes) representing the faction's aesthetic identity. Stored in `cel_visual_assets` with `approved=true` and surfaced in the faction wiki page header via `EntityVisualsGallery`. Zero code changes beyond what already exists. Total cost: ~$0.06/faction × 6–8 factions ≈ $0.36–$0.48.
- **Night Notes:**
  - 2026-05-25 (Run 40): Seeded. Faction wiki pages (`/factions/[slug]`) already render `EntityVisualsGallery` (confirmed in STATUS.md). No faction spec JSON files exist yet (`content/wiki/specs/` has ship/location specs but no faction entries), but the faction wiki markdown at `content/wiki/factions/{slug}.md` is sufficient for an identity tile prompt: faction name + affiliation + visual style preset. (1) Model/provider: Imagen 4 with preset auto-selected by faction world-affiliation: `earth_institutional` for military/bureaucratic Earth factions (Rigel Protocol, MARU Command), `alien_organic` for Resonant-aligned entities, `ancient_vault` for Vault-keepers. ~$0.06/tile. (2) Cost budget: 6–8 factions × $0.06 = $0.36–$0.48 total; author-batch only; zero reader generation. (3) Caching: stored in `cel_visual_assets` with `approved=true`, `target={faction-slug}`, `source='faction_identity'`; shared canonical. (4) Spoiler gating of prompt inputs: faction identity (name, affiliation, color palette, symbol vocabulary) is world-building data — no narrative events in the prompt. Zero spoiler risk. (5) Canon grounding: `content/wiki/factions/{slug}.md` wiki markdown provides the faction's mission, membership, and color/symbol vocabulary; preset vocabulary provides the visual aesthetic. Each tile is abstract (emblem/field aesthetic, not a scene render) — does not require a `master.json` spec file, unlike character portraits. Author workflow: generate via admin console with a 1-line prompt per faction: "{faction name}, {world vocab keywords}, abstract identity emblem, no text, no figures." Estimated: 15 minutes author time per faction in the admin console; zero code changes required. EntityVisualsGallery on faction pages picks them up automatically. Prerequisite: none — admin console is fully operational. Synergistic with IDEA-091 (Faction Propaganda Poster, parked) which builds on this after IDEA-043 ships.

---

## post-read-world

### [IDEA-089] Completion Ceremony Page — Transition Surface for Finished Readers
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-17
- **Last Updated:** 2026-05-20
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A dedicated `/completion` page (or redirect from profile when all 17 chapters are read) that celebrates a reader's journey through the book. Shows personalized reading stats (chapters read, Ask questions asked, highlights saved), the highlight fingerprint mosaic (from IDEA-077), and a "Continue Exploring" section surfacing key post-read-world features (quiz, reading journey timeline, entity explorer). Acts as a rite-of-passage transition from "first-time reader" to "archive explorer."
- **Night Notes:**
  - 2026-05-17 (Run 32): Seeded. The completion trigger could be: (a) explicit `show_all_content = true` flag, or (b) reader marking all 17 chapters read (`cel_story_reads` has 17 rows for the user). Data sources for the summary stats: `cel_story_reads` (count + date of last read), `cel_story_highlights` (total count), `cel_chapter_questions` (total count). All three are existing Supabase tables. Implementation: (1) New `/completion/page.tsx` server component — gated by `show_all_content === true` (redirect to `/profile` if false); (2) Three aggregated Supabase queries: `count(*)` from each of the three tables for the user; (3) Render a celebration header ("You've read the universe"), a stats summary row (chapters, highlights, questions), the highlight fingerprint mosaic (import `HighlightFingerprintMosaic` component from IDEA-077 when that ships), and a "What's next in the Archive?" grid of post-read-world feature links (quiz, journey timeline, entity graph). Post-read-world requirements: (a) Hidden for first-time and guest readers — `show_all_content` gate at server level; (b) Integration with `show_all_content`: direct server-side check; (c) Partial-completion edge cases: flag validated server-side. Dependency note: the page is buildable today with just the stat counts; the fingerprint mosaic is plug-in after IDEA-077 ships. Estimated 2 hours baseline (without mosaic) + 30 min after IDEA-077 to integrate mosaic component.
  - 2026-05-20 (Run 35): Stale 3 days — likely low priority or too complex. Demoting to parked. IDEA-095 (Arc Endpoint Quotes Gallery, seeded Run 34) covers the contemplative post-read entry point more directly with less scope. Un-park after IDEA-077 (highlight fingerprint) and IDEA-083 (lore quiz) ship to fill in the "Continue Exploring" grid this page would surface.

---

### [IDEA-092] Faction Alignment Reveal — Who Sided With Whom at Book's End
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-18
- **Last Updated:** 2026-05-21
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content=true` readers, each faction detail page gains a collapsible "Where the crew stood" accordion at CH17, listing which of the 9 main characters ended the story aligned with, opposed to, or neutral toward that faction — drawn entirely from arc ledger "State After" entries at CH17 and faction cross-references in character wiki markdown. Turns static faction pages into living political landscapes post-completion.
- **Night Notes:**
  - 2026-05-18 (Run 33): Seeded. Arc ledger files (`content/wiki/arcs/characters/*.md`) contain per-chapter "State After" entries that often reference specific faction relationships.
  - 2026-05-21 (Run 36): Stale 3 days — likely low priority or too complex. Demoting to parked. Lexical faction-mention detection in arc free text is fragile; IDEA-095 (Arc Endpoint Quotes Gallery, now planned) establishes the CH17 table parsing infrastructure this would share. Un-park after IDEA-062 (hindsight panel) and IDEA-095 ship. (e.g., "defied Rigel Protocol directive", "aligned with Vault Accord goals"). Cross-referencing all 9 arc ledgers at CH17 against a faction's slug yields the alignment picture. Implementation: (1) New server utility `src/lib/wiki/faction-alignment.ts` — accepts `factionSlug: string`, reads all 9 arc ledgers via `getAllCharacterArcs()` (existing), scans the CH17 "State After" entry for each character for mentions of the faction slug (case-insensitive), returns `{ aligned: CharacterRef[], opposed: CharacterRef[], neutral: CharacterRef[] }`. The mention detection can be lexical (faction slug / name match in text) — not a semantic inference, so it's fast and deterministic. (2) On `/factions/[slug]/page.tsx`, call this utility when `readerProgress.showAllContent === true`, pass results to a new `<FactionAlignmentReveal>` component rendered as a `<details>` accordion. (3) Post-read-world requirements: (a) Hidden from first-time readers and guests — `show_all_content` gate at server level; (b) Integration with `show_all_content`: direct server-side check; (c) Partial-completion: same server-side flag check. Zero new DB, zero new content, zero npm packages. The lexical match may have false positives if faction names appear in other contexts — acceptable for a v1; can be refined once arc parsing utilities (IDEA-062) are shipped and battle-tested. Estimated 2 hours. Prerequisite: IDEA-062 (hindsight panel) establishes the arc parsing infrastructure this reuses.

---

### [IDEA-095] Arc Endpoint Quotes Gallery — Closing Words of the Crew at CH17
- **Status:** ready
- **Theme:** post-read-world
- **Seeded:** 2026-05-19
- **Last Updated:** 2026-05-22
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-095-arc-endpoint-quotes-gallery.md`
- **Summary:** For `show_all_content=true` readers, a `/world/voices` page surfaces one curated "final-state entry" per main character drawn from their CH17 arc ledger "State After" text — displayed as a typographic quote card gallery. Nine panels, each character's closing arc state rendered as a reflective quote. Pure static data; zero AI calls, zero DB changes. A contemplative anchor page for readers before they explore post-read-world features.
- **Night Notes:**
  - 2026-05-19 (Run 34): Seeded. All 9 arc ledger files in `content/wiki/arcs/characters/` have a CH17 "State After" entry.
  - 2026-05-21 (Run 36): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-095-arc-endpoint-quotes-gallery.md`. 2-file implementation: new `src/lib/wiki/arc-endpoints.ts` (parse CH17 "State After" from table rows via regex; filter arcs with no CH17 row gracefully) + new `src/app/world/voices/page.tsx` (server component, `show_all_content` gate, 3×3 quote-card grid with `sci-card-link` styling, links to character wiki pages). Zero new DB, zero new content, zero npm packages. Column index verification: after splitting CH17 table row by `|`, State After is at index 6 (0="", 1=CH17, 2=Scene, 3=Pressure, 4=Choice, 5=Consequence, 6=State After, 7=Evidence). Estimated 1.5 hours. Priority P2. Implementation: (1) New server utility `src/lib/wiki/arc-endpoints.ts` — calls `getAllCharacterArcs()` (existing), extracts the `stateAfter` text from the CH17 row for each arc; returns `ArcEndpoint[]`. The arc markdown table parsing reuses the same logic planned in IDEA-062 (`chapter-hindsight.ts`). (2) New `/world/voices/page.tsx` server component — gated by `show_all_content === true` (redirect to `/profile` if false); calls `getArcEndpoints()`, renders a 3×3 (or 2×4+1) grid of quote cards. Each card: character name (title-cased), a short "State After" excerpt (first 100 chars from CH17 entry), and a link to the character's wiki page. Tailwind styling: `italic`, large centered text, muted underline. (3) Post-read-world requirements: (a) Hidden from first-time readers and guests — server-level `show_all_content` check; (b) Integration with `show_all_content`: direct server-side check; (c) Partial-completion: flag validated server-side. Zero new DB, zero new npm packages, zero content files. The CH17 "State After" entries are arc-endpoint spoilers — this page is correctly gated behind `show_all_content`. Estimated 1.5 hours. Synergistic with IDEA-089 (completion ceremony page) — `/world/voices` can be a CTA from the ceremony page.
  - 2026-05-22 (Run 37): **Promoted to `ready`.** Dev plan confirmed complete at 185 lines (`DEVPLAN-IDEA-095-arc-endpoint-quotes-gallery.md`). No new blockers. Shares `arc-endpoints.ts` utility with IDEA-101 (Crew Debrief Mode) and IDEA-098 (Crew Final Status Board). Ready for Paul to execute — 1.5 hr, 2 new files.

---

### [IDEA-107] ALARA Observer Logs — Author-Written First-Person Chapter Journals at `/world/alara-logs`
- **Status:** exploring
- **Theme:** post-read-world
- **Seeded:** 2026-05-23
- **Last Updated:** 2026-05-25
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** A `/world/alara-logs` page for `show_all_content=true` readers presenting 17 short first-person journal entries written by the author in ALARA's voice — one per chapter, drawn from her arc ledger "Starting State"/"State After" observations. Reads like private ship logs: "Mission Day 1. I observe. The humans call this 'initialization.' I call it waking." Zero on-demand AI cost — author writes 17 entries offline and commits them as static markdown. A narrative artifact that transforms arc data into a reader-facing companion text.
- **Night Notes:**
  - 2026-05-23 (Run 38): Seeded. This is primarily a content creation task for Paul (writing 17 short log entries in ALARA's voice, ~100–200 words each) with minimal code. (1) Post-read-world requirements: (a) `/world/alara-logs` gated by `show_all_content === true` at server level — redirect to `/profile` if false; (b) Integration with `show_all_content`: direct server-side check via `getReaderProgress()`; (c) Partial-completion edge cases: `show_all_content` is the sole gate — arc-endpoint voice is appropriate only for completed readers. (2) Content format: 17 markdown files at `content/wiki/logs/alara/ch01.md` through `ch17.md` — no `<!-- generated:ingest -->` marker (manually authored); (3) Code: new `/world/alara-logs/page.tsx` server component — reads all 17 log files via `fs.readdir` + `fs.readFile`, renders as a scrollable timeline of `<article>` cards with chapter label + ALARA's log text via `react-markdown`. The StoryMarkdown component can be reused for consistent prose rendering. (4) Navigation: add a link from `/world/voices` (IDEA-095) to `/world/alara-logs` as a companion post-read-world route. No new DB, no AI calls at render time, zero npm packages. Estimated code: 1 hour (route + file reader utility + card layout). Content: Paul estimates 2–3 hours writing time. The `arc-endpoints.ts` utility from IDEA-095 + the arc ledger "Starting State" sections provide the grounding material for each log entry. Synergistic with IDEA-095 (both live under `/world/`), IDEA-101 (Crew Debrief Mode), and character voice work in IDEA-093. A unique piece of companion content that turns technical arc data into living voice.
  - 2026-05-25 (Run 40): **Advanced to `exploring`.** Implementation path is clear: (1) `content/wiki/logs/alara/` directory with 17 authored markdown files — no generated marker, fully manual ownership; (2) `src/app/world/alara-logs/page.tsx` server component using `fs.readdir`/`fs.readFile` to load and render them as a timeline; (3) `show_all_content` gate via `getReaderProgress()` server-side; (4) Cross-link from IDEA-095's `/world/voices` page. The code is straightforward (1 hour); the bottleneck is Paul's writing time (~3 hours for 17 log entries). Recommend: Paul writes 3 sample entries first (CH01, CH08, CH17) to validate voice before committing to all 17. Advance to `planned` after IDEA-095 ships (the `/world/` cluster should be built together).

---

### [IDEA-098] Crew Final Status Board — Character State Grid on Characters Index for Completed Readers
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-20
- **Last Updated:** 2026-05-23
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content=true` readers, the `/characters` index page gains a "Crew Status at Book's End" summary grid above the character list — a 3×3 compact card layout, one card per main character showing their name and a 3–5 word CH17 arc-state summary drawn from their arc ledger. Gives completed readers a living roster view, not just a list of wiki links.
- **Night Notes:**
  - 2026-05-20 (Run 35): Seeded. The `/characters` page currently renders all character slugs as link cards. For `show_all_content` readers, a companion "crew status" panel above the character list would surface the arc endpoint in a compact at-a-glance format. Implementation: (1) In `characters/page.tsx` (server component), check `readerProgress.showAllContent`; if true, call `getAllCharacterArcs()` (existing), extract CH17 "State After" text, truncate to ~6 words per character; (2) Render a `<section>` with a heading "Crew — Where They Ended" and a 3×3 CSS grid of small cards (character name + 6-word state excerpt + link to character page); (3) Post-read-world requirements: (a) Hidden from first-time readers and guests — `show_all_content` check at server level; entire `<section>` not rendered without the flag; (b) Integration with `show_all_content`: direct server-side check before calling arc utility; (c) Partial-completion edge cases: `show_all_content` is the sole gate — server validates flag. Zero new DB, zero new content, zero npm packages. The CH17 "State After" text in the arc ledger is the same data sourced by IDEA-095 (Arc Endpoint Quotes Gallery) — these two features share the same data utility `arc-endpoints.ts` from IDEA-062. Estimated 1 hour. Synergistic with IDEA-095 (can cross-link each card to the `/world/voices` quote gallery). Prerequisite: IDEA-062 (hindsight panel) establishes arc parsing utilities; can be built independently with an inline `getAllCharacterArcs()` call.
  - 2026-05-23 (Run 38): Stale 3 days — likely low priority or too complex. Demoting to parked. IDEA-095 (Arc Endpoint Quotes Gallery, ready) covers the "where the crew ended" content more elegantly on `/world/voices`. Adding a second surface on the `/characters` index adds noise before IDEA-095 ships. Un-park after IDEA-095 ships; revisit as a compact inline widget once readers have the full quotes gallery as context.

---

### [IDEA-110] World Glossary Accordion — All 25 Rules as Expandable Reference for Completed Readers
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-24
- **Last Updated:** 2026-05-24
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content=true` readers, a `/world/glossary` page listing all 25 rules/concepts from `content/wiki/rules/` as expandable `<details>` accordions, grouped by series-bible category, with a keyword filter and per-rule chapter cross-reference links derived from `chapter_tags.json`. A living reference for the rule-set governing the story world. Zero AI, zero DB, zero new content — all data from existing static files and `static-data.ts`.
- **Night Notes:**
  - 2026-05-24 (Run 39): Seeded. The 25 rules in `content/wiki/rules/` represent the full Series Bible rule-set (ancients-philosophy, conscious-machines, containment-morality, earth-2050, moral-questions, prologue-timeline, spiritual-symbols, technology-limits, vault-network, plus older lore rules). They are already surfaced on the `/rules` index page as plain cards and individual `/rules/[slug]` pages. A glossary accordion brings them into a single scrollable reference optimized for re-reading: (1) A new `/world/glossary/page.tsx` server component gated by `show_all_content === true` (redirect to `/profile` if false); (2) Load all 25 rules from `static-data.ts` (or direct from `content/wiki/rules/` via `fs.readdir` — same pattern as `getCanonicalWikiSummaries()`); (3) Group by category (series-bible rules vs. older foundational lore rules) based on file metadata or a hardcoded category map; (4) Render each rule as a `<details><summary>{name}</summary>{lore/description}</details>` accordion; (5) Add a client-side keyword filter (`<input>` that hides non-matching accordions via CSS — no React state needed, pure DOM `filter()`); (6) Per-rule chapter cross-reference: query `chapter_tags.json` for chapters where the rule slug appears in entity tags; render as compact chapter chips linking to `/ask?story={ch}&entity={slug}` (or plain chapter links). Post-read-world requirements: (a) Hidden from first-time and guest readers — `show_all_content` server-side check; (b) Integration with `show_all_content`: direct check before rendering; (c) Partial-completion edge cases: flag validated server-side. Zero new DB, zero new content files, zero npm packages. Add link to `/world/glossary` from `/rules` (with `show_all_content` guard) and from `/world/voices` (IDEA-095 page). Estimated 1.5 hours (route + grouping logic + accordion + keyword filter + chapter cross-ref). Synergistic with IDEA-095 (`/world/voices`) and IDEA-104 (`/world/map`) — the three form a natural `/world/` nav cluster for completed readers.

---

### [IDEA-101] Crew Debrief Mode — Post-Completion First-Person Arc Conversation
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-21
- **Last Updated:** 2026-05-24
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content=true` readers, a distinct "Debrief" mode on the Ask page that activates a character voice with full arc-endpoint context — including CH17 "State After" and arc trajectory, not just Starting State. Readers can have an "after the ending" conversation with any crew member, grounded in their complete documented arc. Strictly gated by `show_all_content`.
- **Night Notes:**
  - 2026-05-21 (Run 36): Seeded. IDEA-093 (Character Voice Mode, now ready) uses only "Starting State" (~800 chars) to avoid spoiling the arc. Crew Debrief Mode lifts this restriction for completed readers: (1) A second set of character chips appears on the Ask page only when `profile.showAllContent === true` (fetched server-side at page load and injected via a `debrief_eligible` prop); (2) The chips are visually distinct from the standard IDEA-093 crew chips — different color or "Debrief" label prefix; (3) When a debrief character is selected, the API receives `voiceCharacter` + `debriefMode: true`; (4) Server validates: if `debriefMode === true`, confirm `readerProgress.showAllContent === true` before including arc-endpoint content in the system prompt — otherwise strip to Starting State only. The debrief prompt block includes: CH17 "State After" (from `getArcEndpoints()` utility — shared with IDEA-095) + any "Current State by Chapter Boundary" section from the arc ledger. (5) Post-read-world requirements: (a) Chip row for debrief mode renders only when `showAllContent === true` — server prop injection ensures no flash on client; (b) API validates `showAllContent` server-side before unlocking the arc-endpoint context — client UI state alone cannot unlock it; (c) Partial-completion edge cases: server-side flag check is the sole gate. Prerequisite: IDEA-093 (Character Voice Mode) ships first to establish the chip row UI and API plumbing; debrief mode extends it with a server-side guard and additional context. Implementation: 3-file change after IDEA-093 ships — `api/ask/route.ts` (add `debriefMode` + `showAllContent` validation), `perspectives.ts` (add `buildDebriefBlock()` using CH17 state + arc trajectory), `ask/page.tsx` (conditional debrief chip row). Zero new DB tables; no new content. Estimated 1.5 hours on top of IDEA-093. Synergistic with IDEA-095 (shares `getArcEndpoints()` utility for CH17 state text).
  - 2026-05-24 (Run 39): Stale 3 days — likely low priority or too complex. Demoting to parked. Blocked by IDEA-093 (Character Voice Mode, ready) as a prerequisite — debrief mode extends the character chip plumbing IDEA-093 introduces. Un-park after IDEA-093 ships and is confirmed working end-to-end.

---

### [IDEA-104] Chapter-Location Story Map — Spatial Pattern Grid for Completed Readers
- **Status:** exploring
- **Theme:** post-read-world
- **Seeded:** 2026-05-22
- **Last Updated:** 2026-05-24
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content=true` readers, a `/world/map` page showing a grid visualization: chapters (CH01–CH17) as columns and key locations as rows. Each cell is filled/colored when that location is tagged in a chapter via `chapter_tags.json`. Readers scan the story's spatial structure at a glance — which locations span multiple chapters, which appear only once. Zero AI, zero DB, zero new content.
- **Night Notes:**
  - 2026-05-22 (Run 37): Seeded. The data source is `content/raw/chapter_tags.json` which has a per-chapter list of entity slugs including location slugs. A simple server-side pass builds a `Set<locationSlug>` per chapter, then renders a CSS grid. Key design choices: (1) Which locations to show as rows — the 11 Valkyrie-1 interior locations + the key story locations (Giza Plateau, Mars Base, Earth locations) = ~20–25 rows is manageable; can be derived from locations that appear in ≥2 chapters to keep the grid dense. (2) Cell fill: binary (appears/doesn't appear) using a colored cell vs. transparent — no bar-chart complexity needed. (3) Cells link to `/ask?story={chapterSlug}&entity={locationSlug}` (or just the location wiki page) for exploration. (4) Post-read-world requirements: (a) Hidden from first-time readers and guests — `/world/map` page gated by `show_all_content === true` at server level with redirect to `/profile` if false; (b) Integration with `show_all_content`: direct server-side check; (c) Partial-completion edge cases: same `show_all_content` flag check. Zero new DB tables, zero new content files, zero npm packages (pure CSS grid + Tailwind). Estimated 2 hours (data assembly utility + grid component + page route + gate). Synergistic with IDEA-095 (`/world/voices`) and IDEA-098 (`/characters` crew board) — these three form a natural "World" nav cluster.
  - 2026-05-24 (Run 39): **Advanced to `exploring`.** Feasibility confirmed: `chapter_tags.json` contains entity slugs per chapter (verified in STATUS.md — 17 chapters tagged, all entity types included). Key design decision for the row list: filter location slugs to those appearing in ≥2 chapters (avoids one-off locations bloating the grid). The grid header row would be chapter labels (CH01–CH17 abbreviated) and left column would be location names — this fits within a Tailwind `grid-cols-[auto_repeat(17,1fr)]` layout. Cell links pointing to `/ask?story={chSlug}&entity={locSlug}` would require IDEA-069 (entity Ask CTA) to already ship for the best UX, but work as plain links to location wiki pages as a fallback. Advance to `planned` when the `/world/` nav cluster is being developed alongside IDEA-095.

---

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
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-12
- **Last Updated:** 2026-05-15
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For completed readers (`show_all_content=true`), a collapsible "Crew Connections at CH17" card at the bottom of each character detail page lists which other main characters had direct narrative interactions with this character, along with each connection's final relationship state drawn from arc ledger data. Zero new content; sourced entirely from existing arc ledger "Chapter Arc Entries" tables and `chapter_tags.json` co-appearances.
- **Night Notes:**
  - 2026-05-12 (Run 27): Seeded. Each of the 9 arc ledger files in `content/wiki/arcs/characters/` contains a "Chapter Arc Entries" table with a `State After` column per chapter. Co-appearance data in `chapter_tags.json` per chapter shows which entity slugs share chapter presence. Implementation: (1) New server utility `src/lib/wiki/crew-cross-ref.ts` — accepts a character slug, reads all 9 arc ledger files via `getAllCharacterArcs()` (already exists), cross-references `chapter_tags.json` co-appearances to build a list of `{ slug, name, chaptersTogether: CH[], finalRelationshipHint }` entries; (2) On `characters/[slug]/page.tsx`, call this utility when `readerProgress.showAllContent === true`, pass results to a new `<CrewCrossRefCard>` component rendering as a collapsed `<details>` accordion; (3) Post-read-world requirements: (a) Hidden for first-time readers and guests — gated by `show_all_content === true` at server level; (b) `show_all_content` integration: direct server-side check before calling the utility; (c) Partial-completion edge cases: server validates flag, no card rendered without it. Zero new DB changes, zero new content files, zero new npm packages. Estimated 2 hours. `finalRelationshipHint` can be the `State After` at CH17 from the SUBJECT's arc ledger that mentions the other character — or a simple "shared N chapters" count as a fallback if no explicit mention is found.
  - 2026-05-15 (Run 30): Stale 3 days — likely low priority or too complex. Demoting to parked. The `finalRelationshipHint` extraction logic (finding cross-character mentions in arc ledger free text) is fragile without structured data. Un-park after IDEA-062 (hindsight panel) ships and the arc parsing utilities are proven; revisit with a simpler co-appearance count fallback.

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
- **Status:** ready
- **Theme:** post-read-world
- **Seeded:** 2026-05-13
- **Last Updated:** 2026-05-15
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-077-highlight-fingerprint.md`
- **Summary:** For `show_all_content` readers, the `/profile/highlights` page gains a 17-chapter grid "fingerprint" above the highlights list — each chapter tile colored by the reader's highlight density (more highlights = deeper color). A personalized visual record showing which chapters resonated most. Zero new DB, zero new content; uses existing `cel_story_highlights` table.
- **Night Notes:**
  - 2026-05-13 (Run 28): Seeded. `cel_story_highlights` already stores `user_id`, `story_id`, `passage_text`, and `created_at`. Implementation: (1) In `/profile/highlights/page.tsx`, if `readerProgress.showAllContent === true`, issue one Supabase query to count highlights per story: `SELECT story_id, count(*) FROM cel_story_highlights WHERE user_id = $user GROUP BY story_id`; (2) Build a `Map<string, number>` of story_id → count; (3) Render a 17-tile grid (CH01–CH17) where each tile's background opacity is proportional to `count / maxCount` (clamped 10%–100%), with a legend note "Chapters you highlighted most"; (4) Tiles link to the chapter page for easy navigation. Post-read-world requirements: (a) Hidden for first-time and guest readers — only renders when `show_all_content === true` at server level; (b) Integration with `show_all_content`: direct server-side check before issuing the count query; (c) Partial-completion edge cases: flag validated server-side; if false, section is simply not rendered. Zero new DB tables, zero new content files, zero npm packages. Estimated 1.5 hours.
  - 2026-05-14 (Run 29): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-077-highlight-fingerprint.md`. Key addition vs seed: zero-highlight edge case handled (all tiles at 8% min opacity); color token note added (verify `--color-ocean-rgb` availability in `globals.css` before executing). Priority set to P2.
  - 2026-05-15 (Run 30): **Promoted to `ready`.** Dev plan confirmed present and complete: `DEVPLAN-IDEA-077-highlight-fingerprint.md`.

---

### [IDEA-080] Personalized Reread Guide — `/profile/reread` Chapter Retrospective
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-14
- **Last Updated:** 2026-05-17
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content` readers, a new `/profile/reread` page showing a per-chapter retrospective: (1) the reader's saved highlights for that chapter, (2) their Ask questions about that chapter, and (3) the arc milestone "State After" from arc ledger data — all in one scrollable view. Zero new content; assembled entirely from existing data in `cel_story_highlights`, `cel_chapter_questions`, and arc markdown files.
- **Night Notes:**
  - 2026-05-14 (Run 29): Seeded. Three data sources, all already available: (a) `cel_story_highlights` grouped by `story_id`; (b) `cel_chapter_questions` grouped by `story_id` (the existing `/profile/questions` page already fetches this); (c) per-chapter "State After" from the 9 arc ledger files via `getAllCharacterArcs()` (same function used in the planned IDEA-062 hindsight panel). Implementation: (1) New `/profile/reread/page.tsx` server component gated by `show_all_content === true`; (2) Fetch all 3 data sources server-side for the authenticated user; (3) For each CH01–CH17 chapter, render a collapsible accordion card containing: chapter title + link, highlights section (if any), questions section (if any), and arc state section (if any); (4) Cards with zero activity shown at lower opacity (greyed out), so active chapters visually stand out. Post-read-world requirements: (a) Hidden for non-`show_all_content` readers — server redirect to `/profile` if flag is false; (b) Integration with `show_all_content`: direct server-side check; (c) Partial-completion: flag validated server-side — no edge case. One new route, no new DB tables, no new content files. Prerequisite: IDEA-062 (hindsight panel) establishes the arc parsing utility `chapter-hindsight.ts` which this page can reuse. Estimated 3 hours.
  - 2026-05-17 (Run 32): Stale 3 days — likely low priority or too complex. Demoting to parked. Superseded in part by IDEA-086 (Reading Journey Timeline, seeded Run 31) which covers the per-chapter timeline view with less complexity. Un-park after IDEA-062 (hindsight panel) ships and arc parsing utilities are proven; revisit as a richer successor to IDEA-086.

---

### [IDEA-083] World Lore Quiz — AI-Generated Multiple-Choice Quiz for Completed Readers
- **Status:** ready
- **Theme:** post-read-world
- **Seeded:** 2026-05-15
- **Last Updated:** 2026-05-20
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-083-world-lore-quiz.md`
- **Summary:** For `show_all_content` readers, a `/world/quiz` page serving an AI-generated multiple-choice quiz grounded in `chapter_tags.json` and wiki facts. Questions like "Which chapter did the Vault Accord first activate?" or "Which harmonic state did Valkyrie-1 enter during the alignment sequence?" Test readers on actual lore with no spoiler risk since they've finished the book. Zero new content needed; all ground truth lives in the wiki.
- **Night Notes:**
  - 2026-05-15 (Run 30): Seeded. This is the only quiz/gamification idea in the backlog, and it has a clear post-read-world boundary (gated by `show_all_content=true`). Implementation: (1) Post-read-world requirements: (a) Hidden from first-time and guest readers — `/world/quiz` requires `show_all_content === true` at server level; (b) Integration with `show_all_content`: direct server-side check, redirect to `/profile` if false; (c) Partial-completion edge cases: same server-side flag check. (2) Quiz generation: a new `/api/quiz/generate` POST route calls Claude Haiku (cost: ~$0.001 per 10-question set) with a prompt seeded from a random subset of `chapter_tags.json` entity entries + wiki rule facts. The AI generates 5 multiple-choice questions with 4 options each, returning structured JSON `{ question, options: string[], correctIndex }`. (3) Client renders the quiz as a step-by-step card flow (current question, options, "Submit" → reveal answer + next). Score shown at end. No scores persisted in DB (stateless). (4) Canon grounding: question prompts fed to Haiku include only wiki markdown excerpts (facts, not narrative prose) + entity metadata from `chapter_tags.json`. No character arc ledger content — keeps questions factual, not narrative-spoiler-y. Estimated 3 hours including API route, quiz render component, and `show_all_content` gate.
  - 2026-05-18 (Run 33): **Promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-083-world-lore-quiz.md`. Key refinements vs seed notes: (1) `QuizQuestion` type refined to include `explanation: string` (shown after answer reveal); (2) Phase structure: 5 phases — gate/scaffold, quiz generator module, API route, quiz UI component, navigation entry points; (3) Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) model — cost ~$0.001 per 5-question set; (4) Rate limit reuses existing `src/lib/rate-limit.ts` (5 quizzes/hour); (5) No new DB tables — scores are stateless. Priority set to P2. Estimated 2.5 hours.
  - 2026-05-20 (Run 35): **Promoted to `ready`.** Dev plan confirmed present: `DEVPLAN-IDEA-083-world-lore-quiz.md`. No new blockers.

---

### [IDEA-086] Reading Journey Timeline — Personal Chapter-by-Chapter Memoir on `/profile/journey`
- **Status:** parked
- **Theme:** post-read-world
- **Seeded:** 2026-05-16
- **Last Updated:** 2026-05-19
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content` readers, a new `/profile/journey` page that renders the reader's personal reading history as a vertical timeline — one card per chapter showing the date they first read it (`cel_story_reads.created_at`), their highlight count for that chapter, and their Ask question count. A personal "reading memoir" that makes the companion experience feel like a real journey they lived.
- **Night Notes:**
  - 2026-05-16 (Run 31): Seeded. All three data sources already exist: (a) `cel_story_reads` — `created_at` per chapter read event per user; (b) `cel_story_highlights` — count per chapter per user; (c) `cel_chapter_questions` — count per chapter per user. Implementation: (1) New `/profile/journey/page.tsx` server component gated by `show_all_content === true` (redirect to `/profile` if false); (2) Three server-side Supabase queries: reads with timestamps, highlight counts grouped by story_id, question counts grouped by story_id; (3) Render a vertical timeline (ordered CH01–CH17) with a `<time>` element showing the read date, a bar or number for highlights, and a bar or number for questions asked. Chapters not yet read (no `cel_story_reads` row) still appear as empty timeline entries in muted style. (4) Post-read-world requirements: (a) Hidden from first-time and guest readers — gated by `show_all_content === true`; (b) Integration with `show_all_content`: direct server-side check; (c) Partial-completion: the `show_all_content` flag is the gate — under companion-first, `show_all_content` is the author-set signal for re-reader status. Zero new DB tables, zero content files. Synergistic with IDEA-077 (Highlight Fingerprint mosaic on `/profile/highlights`) and IDEA-080 (Personalized Reread Guide on `/profile/reread`). Estimated 2 hours.
  - 2026-05-19 (Run 34): Stale 3 days — likely low priority or too complex. Demoting to parked. The completion ceremony page (IDEA-089) and highlight fingerprint (IDEA-077) cover the high-value parts of this idea as separate, more focused features. Un-park after IDEA-077 and IDEA-089 ship to see if a dedicated journey timeline page adds meaningful new ground.

---

### [IDEA-113] Arc Progression Heatmap — Character Activity Grid for Completed Readers
- **Status:** seed
- **Theme:** post-read-world
- **Seeded:** 2026-05-25
- **Last Updated:** 2026-05-25
- **Priority:** unranked
- **Plan:** *(not yet written)*
- **Summary:** For `show_all_content=true` readers, a `/world/arcs` page showing a 9×17 heatmap grid (9 main characters as rows, CH01–CH17 as columns). Each cell is filled/colored when that character has a documented arc entry in that chapter (derived from "Choice" + "Consequence" column content in the arc ledger tables). Darker fill = more arc activity. Gives completed readers a spatial view of the story's dramatic density. Zero AI, zero DB, zero new content.
- **Night Notes:**
  - 2026-05-25 (Run 40): Seeded. The 9 arc ledger files at `content/wiki/arcs/characters/` each contain a "Chapter Arc Entries" table with rows for each chapter. Each row has "Choice" and "Consequence" columns — cells that are non-empty (not `—` or blank) signal arc-active chapters for that character. A heatmap cell intensity can be derived simply from: both Choice AND Consequence non-empty → full fill; one non-empty → half fill; both empty → no fill. Implementation: (1) A new server utility `src/lib/wiki/arc-heatmap.ts` — calls `getAllCharacterArcs()` (existing), parses each arc ledger table via the same row-splitting logic as `arc-endpoints.ts` (planned in IDEA-095), returns `ArcCell[][]` (9 rows × 17 columns with `intensity: 0 | 0.5 | 1`). (2) New `src/app/world/arcs/page.tsx` server component — gated by `show_all_content === true` (redirect to `/profile` if false); calls `getArcHeatmap()`, renders as a CSS grid with `grid-cols-[auto_repeat(17,1fr)]`. Column headers: CH01–CH17 labels. Row labels: character names. Cell fill: Tailwind background opacity classes (`bg-[var(--color-ocean)]/100`, `/50`, or transparent). Cell click → `/ask?story={chSlug}&entity={charSlug}` for exploration. (3) Post-read-world requirements: (a) Hidden from first-time readers and guests — `show_all_content` server-side gate; (b) Integration with `show_all_content`: direct server check, redirect if false; (c) Partial-completion edge cases: `show_all_content` is the sole gate. Zero new DB tables, zero new content, zero npm. Estimated 2 hours. Shares `getAllCharacterArcs()` with IDEA-095 (`arc-endpoints.ts`) and IDEA-062 (`chapter-hindsight.ts`). Completes the `/world/` nav cluster with IDEA-095, IDEA-104, IDEA-110. Prerequisite: IDEA-095 should ship first to establish the arc parsing utility; this feature reuses and extends it.

---

## Parked

*(Ideas parked by the 3-day stale rule, out of theme focus, or superseded.)*

### [IDEA-076] World Visual Glossary — 3 Canonical Texture/Mood Cards (One Per Visual World)
- **Status:** parked
- **Theme:** genmedia
- **Seeded:** 2026-05-13
- **Last Updated:** 2026-05-16
- **Priority:** unranked
- **Plan:** *(not written)*
- **Summary:** Pre-generate three abstract "visual vocabulary" mood-board images — one per canonical visual world (WORLD A alien_organic, WORLD B earth_2050, WORLD C ancient_vault) — using Imagen 4. Displayed on a `/about/visuals` page or "Visual Canon" panel in `/rules`.
- **Night Notes:**
  - 2026-05-13 (Run 28): Seeded.
  - 2026-05-16 (Run 31): Stale 3 days — likely low priority or too complex. Demoting to parked. The idea is sound but a new `/about/visuals` route is extra scope and `cel_visual_assets` has few approved assets yet (IDEA-052 must ship first to populate the gallery meaningfully). Un-park after IDEA-052 (character portraits) ships.

---

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
