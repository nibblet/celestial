# STATUS — Keith Cobb Interactive Storybook

> Last updated: 2026-04-16 (Nightshift Run 5)

## App Summary

**Keith Cobb Interactive Storybook** is a private, family-only digital archive built around 39 stories from Keith Cobb's life and leadership journey. Family members (especially grandchildren and great-grandchildren) can browse stories, explore principles/themes, view a life timeline, have AI-guided conversations ("Ask Keith"), follow curated Guided Journeys, contribute their own stories via the "Tell" feature, and write notes/questions directly to Keith from any story page.

**Domain:** stories.cobbcorner.com

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.3 (App Router), TypeScript 5 |
| Frontend | React 19, Tailwind CSS 4, @tailwindcss/typography |
| Content | Markdown wiki (`content/wiki/`) — pre-compiled, single source of truth |
| Database | Supabase (PostgreSQL) — auth + conversations + story contributions + Q&A |
| Auth | Supabase Auth (email-based, invite-only) |
| AI Chat | Claude Sonnet 4 (`claude-sonnet-4-20250514`) via Anthropic SDK 0.88.0 |
| Content Rendering | react-markdown (used in Ask, Tell, Story Detail, Journey Steps) |

## Architecture

### Wiki-First Content
- All Keith's stories (Volume 1) live in `content/wiki/` as markdown files
- Compiled from `content/raw/` via `scripts/compile-wiki.ts`
- Static data generated via `scripts/generate-static-data.ts` into `src/lib/wiki/static-data.ts`
- Family-contributed stories (Volume 2+) live in Supabase (`sb_story_drafts` with `status='published'`)
- Story detail page falls back from filesystem to Supabase for non-P1 story IDs

### Database (Supabase)
- **10 migrations** (up from 3 two weeks ago):
  - `001_initial_schema.sql` — base tables
  - `002_signup_profile_age.sql` — age + age_mode on profiles
  - `003_story_sessions.sql` — Tell sessions
  - `004_story_contribution_mode.sql` — beyond vs. tell contribution_mode
  - `005_keith_role.sql` + `005_story_reads.sql` — keith role + read tracking (dual 005 — apply both)
  - `006_chapter_questions.sql` — reader Q&A tables
  - `007_public_qna_read.sql` — RLS for public Q&A reads
  - `008_story_sessions_from_question.sql` — seed sessions from questions
  - `009_qna_rls_no_recursion.sql` — breaks RLS recursion in Q&A
  - `010_asker_seen.sql` — unread tracking for reader answers

- **Tables:**
  - `sb_profiles` — user profiles (display_name, age, age_mode, role: admin|member|keith)
  - `sb_conversations` + `sb_messages` — Ask Keith chat persistence
  - `sb_story_sessions` — Tell/Beyond: story-gathering chat sessions
  - `sb_story_messages` — Tell/Beyond: messages in a story-gathering session
  - `sb_story_drafts` — Tell/Beyond: AI-composed story drafts, publishable to library
  - `sb_story_reads` — Read tracking: which users have read which stories
  - `sb_chapter_questions` — Reader questions submitted from story pages (status: pending/answered)
  - `sb_chapter_answers` — Keith's answers to reader questions (visibility: public/private)

- RLS enabled on all tables — policies cover all CRUD paths
- Auto-trigger: `handle_new_sb_user()` creates `sb_profiles` row on auth signup

### Routing
- `/` — Home (nav cards)
- `/stories` — Story library (search, filter by stage/theme, Volume 1 + published V2+)
- `/stories/[storyId]` — Story detail (filesystem-first, Supabase fallback for V2+)
- `/stories/timeline` — Timeline embedded in stories hub
- `/themes` — Themes/Principles browser (chord diagram, 12 themes)
- `/themes/[slug]` — Theme detail
- `/timeline` — Life timeline (grouped by decade, 32 events, with photos)
- `/journeys` — Guided Journeys list (4 curated journeys)
- `/journeys/[slug]` — Journey intro (story list, "Start Journey" CTA)
- `/journeys/[slug]/[step]` — Journey step (story + reflection + connectors)
- `/journeys/[slug]/complete` — Journey completion page
- `/journeys/[slug]/narrated` — Narrated journey view (new)
- `/ask` — Chat interface (streaming Claude responses, age-mode aware, multi-perspective)
- `/tell` — Story contribution (streaming AI interviewer, draft review, submit, resume sessions)
- `/beyond` — Keith's dedicated story workspace (keith role only — routes to StoryContributionWorkspace)
- `/admin/drafts` — Admin review + publish of contributed stories (admin-only)
- `/profile` — User profile (age mode, display name, Q&A notification, read progress)
- `/profile/questions` — Reader Q&A inbox (my questions + Keith's answers)
- `/signup` — New user registration
- `/login` — Supabase auth
- `/auth/callback` — OAuth callback

- **API:**
  - `/api/ask` — Streaming Claude API endpoint (rate limited: 20/min, multi-perspective orchestrator)
  - `/api/tell` — Story-gathering chat endpoint (rate limited: 20/min)
  - `/api/tell/draft` — Compose story draft from session (rate limited: 5/min)
  - `/api/tell/draft/update` — PATCH draft title/body before submit
  - `/api/tell/sessions` — GET in-progress gathering sessions
  - `/api/tell/sessions/[id]` — GET full message history for session
  - `/api/admin/drafts` — List drafts (admin-only)
  - `/api/admin/drafts/publish` — Publish a draft (admin-only)
  - `/api/conversations` — List conversations
  - `/api/conversations/[id]` — Get conversation with messages
  - `/api/stories/[storyId]/read` — POST to mark a story read (fires on page visit via ReadTracker)
  - `/api/stories/[storyId]/meta` — GET story metadata
  - `/api/stories/[storyId]/questions` — GET public Q&A / POST new reader question (rate: 10/hr)
  - `/api/beyond/questions` — GET pending questions (keith only)
  - `/api/beyond/questions/[id]/answer` — POST quick answer (keith only)
  - `/api/beyond/questions/[id]/seed-session` — POST start Beyond session from question (keith only)
  - `/api/notifications/count` — GET unread answer count (readers) + pending question count (Keith)

### Auth / Middleware
- Auth enforced via `src/proxy.ts` (Next.js 16 format)
- All routes except `/login`, `/signup`, `/auth/callback` require authentication
- Admin routes (`/admin/*`, `/api/admin/*`) gated by `sb_profiles.role = 'admin'`
- Keith routes (`/beyond`, `/api/beyond/*`) gated by `hasKeithSpecialAccess()` — checks `role = 'keith'` OR email match in `src/lib/auth/special-access.ts`

### Age Mode System
- Three modes: `young_reader` (3-10), `teen` (11-17), `adult` (18+)
- Derived from `sb_profiles.age` or set manually on profile page
- Context provider: `src/hooks/useAgeMode.tsx`
- Affects: AI system prompt language/depth, story audio controls

### AI / Ask Keith
- System prompt built in `src/lib/ai/prompts.ts`
- **Multi-perspective orchestrator** in `src/lib/ai/orchestrator.ts`:
  - Simple path: single Sonnet call (factual/list/lookup questions)
  - Deep path: storyteller + principles coach (parallel) → synthesizer (streamed)
  - Feature-flagged via `ENABLE_DEEP_ASK=true` env var (currently disabled in prod)
  - Depth classifier: `src/lib/ai/classifier.ts` — defaults to "deep", simple only for factual patterns
  - Perspective prompts: `src/lib/ai/perspectives.ts`
- Rate limiting: 20 req/min per user
- Double-submit guard: `sendInFlightRef` in `ask/page.tsx`
- SSE stream parsing: buffered with TextDecoder stream:true, per-line try/catch

### AI / Tell + Beyond (Story Contribution)
- System prompt in `src/lib/ai/tell-prompts.ts` with two modes: `gathering` and `drafting`
- `StoryContributionWorkspace` component handles both `/tell` (family) and `/beyond` (Keith)
- `contributionMode: "tell" | "beyond"` controls which API endpoints are called
- Beyond workspace: shows pending reader questions in triage strip; Keith can quick-answer or seed a session from a question
- Rate limiting: 20/min gathering, 5/min drafting
- Resume sessions: in-progress sessions show on empty state with "Continue" button

### Reader Q&A System (NEW in Run 5)
- **Reader flow:** Click "Write to Keith" on any story page → `AskAboutStory` form → POST `/api/stories/[storyId]/questions` → question shows in Keith's Beyond triage strip
- **Keith flow:** See pending questions in Beyond → quick-answer (text only) OR seed a Beyond session (AI-assisted story expansion) → answer appears on story page
- **Visibility:** `public` (shown to all readers) or `private` (only to the asker)
- **Notifications:** Profile nav shows dot (readers with new answers) or count badge (Keith with pending questions)
- **Reader inbox:** `/profile/questions` lists all questions + answers

### Story Audio (NEW in Run 5)
- `StoryAudioControls` component on story pages (Web Speech API, no server cost)
- Play/Pause/Stop controls, estimated listen time from `wordCount`
- `src/lib/story-audio.ts` — `formatEstimatedListenLabel()` utility

### Story Read Tracking (partial — infra shipped)
- `sb_story_reads` table — upsert on story visit, user_id + story_id (unique)
- `ReadTracker` component fires POST silently on story page load
- Keith's analytics dashboard (`keith-dashboard.ts`) shows read metrics (total reads, top stories, weekly trends)
- **NOT YET:** Read progress bar on user profile, read badges on story cards (IDEA-014, planned)

### Guided Journeys
- 4 journeys in `content/wiki/journeys/`: growing-up-in-the-south, leadership-under-pressure, roots-and-values, the-making-of-a-career
- Progress tracked via localStorage (no DB required)
- Journey files define: storyIds, reflections (per-story), connectors (transition text between steps)
- Ask Keith is journey-aware: `journeySlug` param adds journey context to system prompt
- `/journeys/[slug]/narrated` — narrated view (recently added)

### Content Pipeline (cobb_brain_lab/)
- Standalone Python project for extracting stories from PDF memoir
- Story IDs: Volume 1 = `P1_S01–P1_S39`, Volume 2+ = `P2_S01+` (Supabase)
- Regex pattern in all scripts/parsers updated to `P\d+_S\d+` for multi-volume support

### Timeline
- 32 events across life stages
- 14 photos added to `public/timeline/` (jpg files)
- Also accessible at `/stories/timeline` in the Stories hub

## Conventions
- All Supabase tables prefixed with `sb_`
- Story IDs: `P{volume}_S{nn}` (e.g., `P1_S09`, `P2_S01`)
- Theme slugs: kebab-case, matching filenames in `content/wiki/themes/`
- Wiki files: single source of truth for Volume 1 content
- Server components by default; client components marked with `'use client'`
- Rate limiter key pattern: `userId` for chat, `${userId}:draft` for drafting, `${userId}:question` for Q&A (10/hr)
- Keith-gated features use `hasKeithSpecialAccess(email, role)` from `src/lib/auth/special-access.ts`

## Recent Changes (Since Run 4)
- **Commits d7b6143–fb7ea3d (20 commits):** Major feature wave:
  - `/beyond` — Keith's dedicated story workspace with reader question triage
  - `chapter_questions` + `chapter_answers` tables (migrations 006–010)
  - `AskAboutStory` + `AnsweredQuestionsList` on story pages
  - `/profile/questions` — reader Q&A inbox
  - `ProfileNavLink` notification badge (unread answers for readers, pending count for Keith)
  - Multi-perspective Ask orchestrator (`orchestrator.ts`, `classifier.ts`, `perspectives.ts`)
  - `StoryAudioControls` (Web Speech API TTS on story pages)
  - `sb_story_reads` + `ReadTracker` + Keith analytics dashboard
  - Hub navigation (Stories/Explore tabs)
  - `/journeys/[slug]/narrated` — narrated journey view
  - Mobile design updates

- **Uncommitted (FIX-018):** `KeithProfileHero.tsx` (removed 2 quick links, grid fix) + `classifier.ts` (inverted logic to default-deep)

## Current State
- All V1 + V2 + V3 features complete: stories, themes, timeline, ask (multi-perspective), journeys, tell, beyond, admin drafts, signup/profile, reader Q&A
- Build: **PASSES** — clean, 34 routes
- Lint: **1 warning** — `_history` unused in `classifier.ts` (FIX-019)
- 6 open issues (FIX-013, FIX-014, FIX-016, FIX-017, FIX-018, FIX-019) — all planned
- Content: All 39 stories; 14 timeline photos; wiki index current
- Auth: Multi-role system (member/admin/keith); all routes gated correctly
- Story reading tracked silently; profile progress UI not yet built (IDEA-014)
- Multi-perspective Ask built but feature-flagged (IDEA-015)

## Known Issues (See FIXES.md)
- FIX-013: Fenced JSON fallback in /api/tell/draft not wrapped in try/catch (planned)
- FIX-014: ageMode not validated at runtime in /api/ask (planned)
- FIX-016: Tell page SSE state mutation (planned)
- FIX-017: Multiple draft rows per Tell session (planned)
- FIX-018: Uncommitted changes — KeithProfileHero + classifier (planned, 5 min)
- FIX-019: `_history` lint warning in classifier.ts (planned, 1 min)

## Next Actions (Priority Order)
1. **FIX-018** — Commit uncommitted KeithProfileHero + classifier changes (5 min)
2. **FIX-019** — Fix lint warning in classifier.ts (1 min, pairs well with FIX-018)
3. **IDEA-014** — Story read progress UI: profile bar + story card badges (1–1.5 hrs)
4. **IDEA-015** — Enable deep Ask mode (30 min eval + env var set)
5. **FIX-016** — Tell SSE state mutation (15 min port from ask/page.tsx)
6. **FIX-017** — Multiple draft rows per session (30 min upsert fix)
7. **FIX-013** — Fenced JSON fallback (10 min defensive coding)
8. **FIX-014** — ageMode runtime validation (5 min, one-liner)
