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

## Part 2: Contributor Interface — How Keith Adds New Stories

### The Core Problem

Keith has stories in his head. The current pipeline requires: write text file → run Python scripts → generate wiki markdown → commit to git. That's a developer workflow, not a contributor workflow.

### Recommendation: A "Tell Your Story" Page

Build a simple, authenticated page at `/contribute` (visible only to Keith's profile, or to `admin` role users) with two input modes:

#### Option A: Voice Recording (Recommended Primary)

1. Keith taps a "Record" button and tells his story out loud
2. Browser captures audio via MediaRecorder API
3. Audio is sent to a server-side endpoint that:
   - Stores the raw audio in Supabase Storage (permanent archive)
   - Transcribes via Whisper API (or Anthropic's future audio support, or a speech-to-text service)
   - Returns the transcript for review
4. Keith reviews/edits the transcript in a simple text area
5. On "Save", the story is stored as a draft in Supabase

**Why voice-first:** Keith is a storyteller. Making him type defeats the purpose. Voice capture preserves his natural cadence and phrasing — which is also valuable raw material for the voice/style guide.

#### Option B: Text Entry (Secondary)

A simple form with:
- **Title** (required)
- **Story text** (large textarea, Markdown-friendly)
- **Life stage** (dropdown: Childhood, Education, Early Career, KPMG Years, Post-Corporate, Reflections)
- **When did this happen?** (optional year or year range)

Both options save to a `sb_story_drafts` table:

```sql
create table sb_story_drafts (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references sb_profiles(id),
  title text not null,
  body text not null,
  life_stage text,
  year_start integer,
  year_end integer,
  audio_url text,          -- link to raw audio in Supabase Storage
  status text default 'draft',  -- draft | review | published
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### The Publishing Pipeline

Drafts don't go live automatically. The flow:

```
Keith records/types → Draft saved in Supabase
        ↓
Admin reviews draft → Triggers extraction (principles, quotes, themes)
        ↓
Extraction can be:
  (a) Automated via Claude API call (pass story text + extraction prompt)
  (b) Semi-manual using existing Python pipeline
        ↓
Wiki markdown file generated → P2_S## ID assigned
        ↓
Story appears in the app
```

**For the MVP**, extraction via Claude API is the simplest path. The existing extraction prompt in `cobb_brain_lab/prompts/extraction_prompt.md` can be adapted into an API call that returns structured JSON (principles, heuristics, quotes, timeline events, themes). This avoids requiring Python pipeline knowledge.

### Architecture Decision: Supabase-First vs. Git-First Content

Two viable approaches:

| | Git-first (current) | Supabase-first (new) |
|---|---|---|
| **How it works** | Stories are `.md` files in `content/wiki/stories/`. Server reads from filesystem. | Stories live in Supabase tables. Server queries DB. |
| **Pros** | Simple, auditable, version-controlled. Works today. | Dynamic — no redeploy needed. Better for contributor workflow. |
| **Cons** | Adding a story requires a git commit + redeploy. | Requires migrating the content model to DB. More complex. |
| **Best for** | Curated, slow-changing content | Frequent additions, contributor self-service |

**Recommendation: Hybrid approach.**

- **Volume 1 (Memoir)** stays git-first — it's stable, complete, and the pipeline already produces the wiki markdown.
- **Volume 2+ (new contributions)** are Supabase-first — drafts and published stories live in the DB, no git/redeploy cycle needed.
- The wiki parser gets a `getAllStories()` that merges both sources: filesystem stories + DB stories.
- Over time, published DB stories can optionally be exported to git as markdown for archival.

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

### Phase 2: Contributor "Tell Your Story" Page (Medium)
- `sb_story_drafts` table in Supabase
- `/contribute` page with text input (voice can come in Phase 2b)
- Admin review page at `/admin/drafts`
- Claude API extraction endpoint to auto-extract principles/themes/quotes from draft text
- Publishing flow: draft → extracted → wiki markdown generated → live
- **Effort: ~1-2 days**

### Phase 2b: Voice Recording
- Add MediaRecorder-based voice capture to `/contribute`
- Supabase Storage for audio files
- Speech-to-text integration (Whisper API or similar)
- **Effort: ~1 day additional**

### Phase 3: Public Source Integration
- Adapt `06_ingest_source.py` output into promotable stories
- Build `07_promote_source.py` or web-based admin equivalent
- **Effort: ~1 day**

### Phase 4: Supabase-First Stories (Optional, if frequency warrants)
- Migrate published Volume 2+ stories from filesystem to Supabase
- Hybrid `getAllStories()` that merges git + DB sources
- Remove redeploy requirement for new content
- **Effort: ~2-3 days**

---

## Summary of Recommendations

1. **Framework: "Volumes in a Library"** — extend the existing `P1`/`P2`/`P3` ID scheme rather than replacing it. The book metaphor becomes a library metaphor. Everything else (themes, journeys, principles, AI prompts) works across volumes without structural changes.

2. **Contributor interface: Voice-first, simple** — Keith taps record, tells a story, reviews the transcript, saves. Admin publishes. Claude API handles extraction. No Python pipeline knowledge required.

3. **Public sources: Promote to stories** — The ingestion pipeline already exists. Add a "promotion" step that turns raw sources into wiki-formatted stories with extracted principles and themes.

4. **Start with the ID generalization** — it's a tiny change that unblocks everything else.
