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
  - 2026-04-14: **SHIPPED.** Implemented in commit `3d56213`. Routes live at `/journeys`, `/journeys/[slug]`, `/journeys/[slug]/[step]`, `/journeys/[slug]/complete`. Four journeys in `content/wiki/journeys/`. Full UI including progress bar, journey connector text, reflection prompts, and completion page.

---

### [IDEA-003] Age-Aware Ask Keith Suggestion Chips
- **Status:** parked
- **Category:** enhance
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-003-age-aware-suggestion-chips.md`
- **Summary:** The 4 suggestion chips on the Ask Keith empty state are hardcoded for adult readers. They should dynamically reflect the active age mode — simpler, more relatable questions for young_reader and teen modes.
- **Night Notes:**
  - 2026-04-12: Seeded by Nightshift. `useAgeMode()` hook is already imported.
  - 2026-04-13: Advanced to `ready`. Dev plan written.
  - 2026-04-14: Still unimplemented (verified in `ask/page.tsx` lines 213–218). Plan remains valid. 20-minute change, no dependencies.
  - 2026-04-15: **Stale 3 days — no commits related. Likely low priority or deprioritized in favor of Tell/journeys work. Demoting to parked. Plan still valid if revisited.**

---

### [IDEA-013] Story Reading Progress — Track the Journey Through 39 Stories
- **Status:** planned
- **Category:** enhance
- **Seeded:** 2026-04-15
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-013-story-reading-progress.md`
- **Summary:** Automatically track which of Keith's 39 stories each family member has read. Show green checkmarks on read story cards in the library, and a progress bar ("X of 39 stories read") on the profile page. No action required from the user — reading a story marks it read automatically.
- **Night Notes:**
  - 2026-04-15: Seeded and advanced to `planned` same night. Technically: new `sb_story_reads` Supabase table (migration 004), `ReadTracker` client component on story pages, read badge on story cards, progress bar on profile. Estimated 1.5 hours. No dependencies on other open items.

---

### [IDEA-005] Reading Time Estimate on Story Cards
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-13
- **Last Updated:** 2026-04-13
- **Priority:** P3
- **Plan:** *(not yet written)*
- **Summary:** Show estimated reading time on story cards in the library and on the story detail header. The `wordCount` field already exists on `WikiStory` — just display `Math.ceil(wordCount / 200)` minutes.
- **Night Notes:**
  - 2026-04-13: Seeded by Nightshift. `wordCount` already populated. UI change only.

---

### [IDEA-007] Resume Tell Session — Continue an In-Progress Story
- **Status:** shipped
- **Category:** enhance
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-007-resume-tell-session.md`
- **Summary:** When a contributor navigates away from `/tell` mid-conversation, they lose their context. A "Continue your story" banner on the Tell page detects in-progress sessions and lets them pick up exactly where they left off.
- **Night Notes:**
  - 2026-04-14: Seeded and advanced to `ready` same night.
  - 2026-04-15: **SHIPPED.** `GET /api/tell/sessions` (lists up to 3 in-progress gathering sessions with first-message preview) and `GET /api/tell/sessions/[id]` (loads full message history) routes implemented. `tell/page.tsx` now shows a "Continue your story" banner on the empty state with session cards and a `resumeSession()` handler that restores chat history. Full round-trip: user can leave mid-session and resume with full conversation context restored.

---

## Category 2: New Features or Integrations

### [IDEA-002] Keith's Story Workshop — Author & Source Material Intake
- **Status:** planned
- **Category:** new
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-14
- **Priority:** P1
- **Plan:** *(full dev plan not yet written)*
- **Summary:** Two-track system for adding new stories. Track 1 (family contributions via `/tell`) is now implemented. Track 2 (direct markdown authoring by Keith/admin) and Track 3 (source material pipeline) remain.
- **Night Notes:**
  - 2026-04-12: Seeded by Paul. Track 1 explored as admin-only markdown editor.
  - 2026-04-12 (Nightshift): Advanced to `exploring`. `sb_profiles.role` supports admin gating.
  - 2026-04-14: **Track 1 (family contributions) SHIPPED** as `/tell` feature in commit `cad049d`. The `/tell` → `/admin/drafts` → publish pipeline is fully functional. Advancing to `planned`. What remains: (a) admin-facing direct markdown editor for Keith to write stories without going through chat, (b) V2 story management in admin (edit published Supabase stories). Track 2 (source material pipeline) is still a separate larger investment.

---

### [IDEA-004] Story Bookmarks — Save Favorites for Easy Return
- **Status:** parked
- **Category:** new
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Let family members bookmark stories for re-reading. Bookmarks persist to Supabase so they're available across devices.
- **Night Notes:**
  - 2026-04-12: Seeded by Nightshift. New `sb_bookmarks` table, heart icon on story cards, "My Bookmarks" on home/profile.
  - 2026-04-15: **Stale 3 days — no commits related. IDEA-013 (reading progress) covers similar engagement use case and is simpler. Demoting to parked. Can revisit as complement to IDEA-013.**

---

### [IDEA-006] Featured Story of the Week on Home Page
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-13
- **Last Updated:** 2026-04-13
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** A highlighted "Story of the Week" card on the home page, curated by Paul from the 39 stories via a simple `content/wiki/featured.json` file.
- **Night Notes:**
  - 2026-04-13: Seeded by Nightshift. Zero DB changes needed, fully wiki-first.

---

### [IDEA-008] "New Stories" Feed on Home Page
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-14
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Now that family members can contribute stories via `/tell`, the home page should show a "Recently Added" section listing the newest published Supabase stories. This gives the family a sense that the archive is living and growing, and rewards contributors by making their stories visible immediately.
- **Night Notes:**
  - 2026-04-14: Seeded by Nightshift. Implementation: home page calls `getPublishedStories()` (already exists in `supabase-stories.ts`) and renders the most recent 3, sorted by Supabase `created_at`. No DB changes. Pure UI addition. Pairs naturally with IDEA-006 (featured story) — could combine into one "What's New" section.

---

### [IDEA-009] Story Voice Playback — Audio Narration for Young Readers
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-14
- **Priority:** P1
- **Plan:** *(not yet written)*
- **Summary:** Add a "Listen" button to story pages that reads the story aloud using browser-native Text-to-Speech (Web Speech API) — no server, no cost, no audio files to host. Especially valuable for young_reader mode (ages 3-10) who can't read long text. Controls: play/pause, speed (0.8x for kids), sentence-level highlight tracking so children can follow along visually. Could optionally use an ElevenLabs voice for richer audio if a Keith-like voice is trained.
- **Night Notes:**
  - 2026-04-14: Seeded by Paul. Web Speech API (`speechSynthesis`) is built into all modern browsers and requires zero infrastructure. The story `fullText` is already on the page. For young_reader mode, this could be the primary way children "read" — auto-play on page load with a friendly UI. ElevenLabs voice cloning is a future enhancement once basic TTS works.

---

### [IDEA-010] Public Media Integration — Podcasts, Videos, and Public Sources
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-14
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** A curated "Keith in the World" section that surfaces public content featuring Keith Cobb — podcasts, YouTube interviews, press coverage, and professional profiles. Family members (especially grandchildren) can see and hear Keith speak in his own voice on topics the stories cover. Content is wiki-curated (a `content/wiki/media.md` file listing URLs + descriptions) so Paul controls what appears; no scraping or automation needed.
- **Night Notes:**
  - 2026-04-14: Seeded by Paul (podcasts and YouTube videos to add). Approach: a `content/wiki/media/` directory with a file per media item (title, type: podcast|video|article, url, description, related_story_ids, year). A `/media` route renders these as an embedded or linked gallery. YouTube embeds via iframe; podcast links open externally. Cross-link from story pages: "Hear Keith speak about this →". No backend needed — fully wiki-first.

---

### [IDEA-011] Story Photos — Images That Surface During Reading
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-14
- **Last Updated:** 2026-04-14
- **Priority:** P1
- **Plan:** *(not yet written)*
- **Summary:** For stories that have associated photos, surface those images inline during reading — fade-in as the reader scrolls to the relevant passage, or as clickable thumbnails in the story margin. Especially powerful in young_reader mode where visual context makes stories come alive. Photo metadata lives in the wiki (story markdown frontmatter or a companion `.photos.json`) so Paul can associate specific photos with specific paragraphs or just with the story as a whole.
- **Night Notes:**
  - 2026-04-14: Seeded by Paul. The timeline already has 14 photos in `public/timeline/`. Stories don't yet have associated photos. Approach: (1) a `public/stories/` directory for story photos, (2) story markdown frontmatter adds `photos: [{ src, caption, paragraph }]` — the `paragraph` index controls which prose section triggers the reveal. In young_reader mode, photos could auto-reveal with a CSS fade-in on scroll; in adult mode, they could be tasteful thumbnails that expand on click. ReadingProgressBar component already exists and could be extended to trigger photo reveals at scroll thresholds.

---

### [IDEA-012] Letter to Keith — Personal Takeaway from an Ask Conversation
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-15
- **Last Updated:** 2026-04-15
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** After an Ask Keith conversation, offer a "Write me a letter" button that generates a short, personalized letter (from the user's perspective, addressed to Keith) summarizing what they learned and what it means to them. AI-composed from the conversation history, downloadable as plain text or printable. Especially meaningful for grandchildren — a personal artifact connecting them to Keith's stories.
- **Night Notes:**
  - 2026-04-15: Seeded by Nightshift. Technically: reuse existing `messages` state in `ask/page.tsx`, new non-streaming `/api/ask/letter` endpoint (similar to `/api/tell/draft` — full conversation → composed output). No DB changes needed. Pairs naturally with guided journeys (end-of-journey letter).

---

## Parked

*(Ideas demoted after 3+ days without action — full entries remain in category sections above with status: parked)*

- **IDEA-003** Age-Aware Suggestion Chips — parked 2026-04-15. Plan still valid at `DEVPLAN-IDEA-003-age-aware-suggestion-chips.md`.
- **IDEA-004** Story Bookmarks — parked 2026-04-15. Superseded by IDEA-013 (reading progress).
