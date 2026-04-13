# Plan: Content Expansion Beyond the Memoir

## Context

The app today is built around a single source: Keith Cobb's memoir PDF (39 stories, "Part 1"). The entire content model — IDs (`P1_S01`), the Python extraction pipeline, the wiki parser, the AI prompt layer — all assume this single book as the canonical source.

Two expansion needs have been identified:

1. **New stories from Keith** — He has more stories in his head that aren't in the book. He needs an easy way to contribute them (voice or text).
2. **Public-source data** — External content (articles, board bios, SEC filings, video transcripts, speeches) that enriches the archive with verifiable facts and additional context.

---

## Part 1: The Mental Framework — "Volumes in a Library"

### Recommendation: Evolve from "Book" to "Library"

The current `P1` prefix already implies there could be a P2, P3, etc. Rather than fighting the book metaphor, **lean into it and extend it**:

| Collection | ID Prefix | Description |
|---|---|---|
| **Volume 1: The Memoir** | `P1_S##` | The original 39 stories (unchanged) |
| **Volume 2: Untold Stories** | `P2_S##` | New stories Keith contributes via voice/text |
| **Volume 3: The Public Record** | `P3_S##` | Stories synthesized from public sources (articles, transcripts, filings) |
| **Volume 4: Family Voices** | `P4_S##` | Future: stories contributed by sons, grandchildren, others |

**Why this works:**
- The existing ID scheme already supports it — `P1`, `P2`, `P3` are natural extensions
- The wiki, themes, principles, and journeys already cross-cut stories by ID — a `P2_S05` story slots into themes and journeys just like a `P1_S05` does
- The AI prompt layer already navigates by story ID and theme — it doesn't care which volume a story comes from
- The pipeline's extraction schema (principles, heuristics, quotes, timeline events) applies equally to oral stories and public-source stories
- Journeys can weave stories from multiple volumes together

### What changes in the codebase

The **only** hardcoded constraint is the regex in `src/lib/wiki/parser.ts:81`:

```typescript
const storyIdMatch = content.match(/\*\*Story ID:\*\*\s*(P1_S\d+)/);
```

This needs to become:

```typescript
const storyIdMatch = content.match(/\*\*Story ID:\*\*\s*(P\d+_S\d+)/);
```

Similar `P1_S\d+` patterns appear in `journeys.ts` and `parser.ts` (theme parsing, related stories, etc.) — all need the same generalization to `P\d+_S\d+`.

The `static-data.ts` generator and the wiki index would also need to group by volume for display purposes.

### UI Implications

- The Stories page gets a volume filter/tab: "The Memoir" | "Untold Stories" | "Public Record"
- Each story card already shows life stage and themes — add a subtle volume badge
- Journeys can explicitly mix volumes: "Leadership Under Pressure" might include memoir chapters + a public speech transcript
- The timeline page naturally absorbs events from any volume

---

## Part 2: Story Contribution — A Core Feature via Structured AI Chat

### The Big Idea

The app currently has one mode: **Read** (explore Keith's stories). Contribution adds a second core mode: **Tell** (add new stories to the library). This isn't an admin tool tucked in a settings page — it's a primary feature, sitting alongside reading in the app's navigation.

**Anyone** in the family can contribute:
- **Keith** adds his untold stories (Volume 2)
- **Sons, grandchildren, others** add their own memories, perspectives, or stories about Keith (Volume 4: Family Voices)
- Volume assignment is determined by who's contributing and what the story is about

### The Interface: Guided Story Chat

Inspired by the forvex-train structured chat pattern (REpost-style, free-form). Instead of a blank text area or a form with fields, the contributor has a **conversation with an AI interviewer** that draws the story out naturally.

#### How It Works

1. User navigates to `/tell` (or "Add a Story" in the nav)
2. The AI greets them and asks what they'd like to share:
   - _"What's a story you'd like to add to the family library? It could be something from your own life, a memory of Keith, or something you've heard passed down."_
3. The contributor talks or types freely — the AI follows up:
   - _"When did this happen roughly?"_
   - _"Who else was involved?"_
   - _"What was the outcome — how did it turn out?"_
   - _"What do you think the lesson was, looking back?"_
4. The chat is **free-form, not rigid** — the AI adapts based on what's been said, not a fixed question sequence. It knows what a complete story needs (context, characters, events, reflection) and gently steers toward those elements without being formulaic.
5. When the AI has enough material, it offers to draft the story:
   - _"I think I have a good picture. Want me to write this up as a story for the library?"_
6. The AI composes a story draft in the contributor's voice (or Keith's voice for Volume 2 contributions from Keith)
7. The contributor reviews, edits, and submits

#### The Story Chat System Prompt

The AI interviewer needs its own system prompt, distinct from the "Ask" guide. Key behaviors:

- **Warm, curious, patient** — like a family member who genuinely wants to hear the story
- **Knows the existing library** — can reference existing stories for context ("That reminds me of the story about Peat Marwick — is this around the same time?")
- **Gathers structured data naturally** — without feeling like a form:
  - Time period / dates
  - People involved
  - Setting / location
  - Key events or decisions
  - Lessons, principles, or reflections
  - Memorable quotes or phrases
- **Voice-aware** — when Keith is the contributor, the draft should match his memoir voice. When a grandchild contributes, it should sound like them.
- **Knows when it has enough** — proactively offers to compose the draft rather than asking endless questions

#### Voice Input (Enhancement)

The chat supports text by default. Voice input can be layered on:
- Browser MediaRecorder or Web Speech API for real-time speech-to-text
- Each voice message is transcribed and appears as a chat bubble
- Raw audio is preserved in Supabase Storage as archival material
- This is an enhancement on top of the text chat — same flow, just a different input method

### Data Model

Two new tables:

```sql
-- The chat conversation that gathered the story
create table sb_story_sessions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references sb_profiles(id),
  status text default 'gathering',  -- gathering | drafting | review | published
  volume text default 'P2',         -- P2 (Keith), P4 (family), etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual messages in the story-gathering chat
create table sb_story_session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sb_story_sessions(id),
  role text not null,               -- 'user' | 'assistant'
  content text not null,
  audio_url text,                   -- optional: raw audio for this message
  created_at timestamptz default now()
);

-- The composed story draft (output of the chat)
create table sb_story_drafts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sb_story_sessions(id),
  contributor_id uuid references sb_profiles(id),
  title text not null,
  body text not null,
  life_stage text,
  year_start integer,
  year_end integer,
  themes text[],                    -- AI-suggested themes
  principles text[],                -- AI-extracted principles
  quotes text[],                    -- notable quotes pulled from the story
  status text default 'draft',      -- draft | approved | published
  story_id text,                    -- assigned on publish: P2_S01, P4_S01, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### The Publishing Pipeline

```
Contributor chats with AI → story session saved in Supabase
        ↓
AI composes draft → contributor reviews/edits → draft saved
        ↓
Admin approves → triggers extraction:
  Claude API call extracts structured metadata
  (principles, heuristics, quotes, themes, timeline events)
        ↓
Story ID assigned (next P2_S## or P4_S##)
Draft promoted to published story in Supabase
        ↓
Story appears in the app immediately (no redeploy)
Optionally exported to git as wiki markdown for archival
```

### Who Sees What

| Role | Can Tell | Can Read Own Drafts | Can Approve/Publish |
|---|---|---|---|
| Keith (admin) | Yes — Volume 2 | Yes | Yes |
| Family member | Yes — Volume 4 | Yes | No |
| Admin (you) | Yes — any volume | Yes — all drafts | Yes |

### Architecture: Supabase-First for New Content

New contributed stories live in Supabase, not the filesystem:

- **Volume 1 (Memoir)** stays git-first — it's stable, complete, and the pipeline already produces the wiki markdown
- **Volume 2+ (new contributions)** are Supabase-first — drafts and published stories live in the DB, no git/redeploy cycle needed
- The wiki parser's `getAllStories()` merges both sources: filesystem stories (V1) + DB stories (V2+)
- Published DB stories can optionally be exported to git as markdown for archival
- The AI "Ask" feature sees all stories regardless of source — the system prompt includes both filesystem and DB content

---

## Part 3: Public Source Ingestion

### What Already Exists

The `06_ingest_source.py` script already handles:
- Video transcripts, articles, board bios, SEC filings, speeches, letters
- Produces cleaned text, metadata stubs, and basic extractions (quotes, claims, timeline candidates)
- Outputs to `sources/` directory structure

### What's Missing

The ingested sources currently sit in `sources/` as raw material — they don't become wiki stories that the AI can reference. The gap:

```
sources/cleaned/video_transcript_xyz.txt  →  ???  →  content/wiki/stories/P3_S01-xyz.md
```

### Recommendation: Source-to-Story Promotion

Add a step that "promotes" an ingested source into a wiki story:

1. Run `06_ingest_source.py` (already works)
2. New script: `07_promote_source.py --source-id video_transcript_xyz --volume P3`
   - Reads `sources/cleaned/` text + `sources/meta/` metadata
   - Runs extraction (principles, quotes, themes, timeline) — either via existing Python pipeline or Claude API call
   - Generates a wiki markdown file in `content/wiki/stories/P3_S01-title-slug.md`
   - Assigns next available `P3_S##` ID
   - Updates the wiki index

Alternatively, for the web-based flow, an admin page at `/admin/sources` could:
- Upload a text file or paste content
- Select source type
- Preview the extracted story
- Publish to the wiki

---

## Part 4: Implementation Phases

### Phase 1: Generalize the ID Scheme (Small, do now)
- Update `P1_S\d+` regexes to `P\d+_S\d+` across parser.ts, journeys.ts, static-data generation
- Add a `volume` field to `StoryCard` and `WikiStory` interfaces (derived from prefix)
- Add volume display/filter to Stories page
- **Effort: ~2-4 hours**

### Phase 2: Story Chat MVP — Text-Based
- Supabase tables: `sb_story_sessions`, `sb_story_session_messages`, `sb_story_drafts`
- `/tell` page with the AI story-gathering chat (text input, streaming responses)
- Story interviewer system prompt (warm, adaptive, knows the library)
- "Compose draft" step: AI assembles chat material into a story
- Contributor review/edit screen for the draft
- `/api/tell` route — similar to `/api/ask` but with the interviewer prompt
- **Effort: ~2-3 days**

### Phase 3: Publishing Pipeline
- Admin draft review page
- Claude API extraction endpoint: pass story text → get structured metadata (principles, themes, quotes, heuristics, timeline)
- Story ID assignment (next available P2_S## or P4_S##)
- Hybrid `getAllStories()` that merges filesystem (V1) + Supabase (V2+)
- Published stories immediately visible in the app — no redeploy
- **Effort: ~1-2 days**

### Phase 4: Voice Input Enhancement
- MediaRecorder or Web Speech API integration on the `/tell` chat
- Each voice message transcribed → appears as chat text
- Raw audio preserved in Supabase Storage
- Same chat flow, just voice as an additional input method
- **Effort: ~1 day**

### Phase 5: Public Source Integration
- Adapt `06_ingest_source.py` output into promotable stories
- Build `07_promote_source.py` or web-based admin equivalent
- Promoted sources get P3_S## IDs and flow through the same publishing pipeline
- **Effort: ~1 day**

### Future: Maturation
- Smarter interviewer: learns from existing stories to ask better follow-up questions
- Multi-session stories: pick up where you left off across visits
- Family discussion threads on contributed stories
- Richer voice handling: speaker diarization, emotional tone markers
- Story suggestions: "Keith, you mentioned [X] in your memoir — want to tell us more about that?"

---

## Summary of Recommendations

1. **Framework: "Volumes in a Library"** — extend the existing `P1`/`P2`/`P3`/`P4` ID scheme. The book metaphor becomes a library metaphor. Themes, journeys, principles, and the AI prompt layer all work across volumes without structural changes.

2. **Two core modes: Read and Tell** — contribution via structured AI chat is a first-class feature, not an admin tool. The chat draws stories out through natural conversation, then composes a draft. Available to Keith and all family members.

3. **Free-form chat, not rigid forms** — the AI interviewer adapts to what's been said, knows when it has enough, and gently steers toward complete stories. Inspired by the forvex-train/REpost pattern. Can mature over time.

4. **Supabase-first for new content** — Volume 1 stays in git (stable). Volumes 2+ live in Supabase so new stories go live without a redeploy.

5. **Public sources: Promote to stories** — the ingestion pipeline already exists. Add a promotion step that turns raw sources into Volume 3 stories.

6. **Start with the ID generalization** — it's a tiny change that unblocks everything else.
