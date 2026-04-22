# Celestial — Personas, Beats, Threads, Scenes, Continuity, Ledger

**Goal:** Enhance Celestial's AI + data model across seven aligned moves without changing the wiki-first content architecture.

1. Expand the single Narrator/Lore-keeper/Synthesizer orchestrator into a **persona registry** with four active personas (Celestial narrator, Archivist, Lorekeeper, Finder) and a swappable router. Editor is explicitly deferred.
2. Add an `sb_ai_interactions` ledger + `logAiCall()` helper and wire it into every server-side Anthropic call so we can monitor token/cost when Celestial opens up.
3. Introduce a `sb_open_threads` table for narrative questions the *text itself* raised (mysteries, unresolved setups) — distinct from reader-asked `sb_chapter_questions`.
4. Add a `sb_chapter_scenes` table and a one-shot `ingest:scenes` script that parses the `### Scene N: Title` headings already present in every `content/wiki/stories/CH*.md` file. Give scenes an optional goal/conflict/outcome annotation layer.
5. Prototype a **beats** construct (`sb_beats`) — act / order_index / beat_type / `why_it_matters` — wired end-to-end through one guided journey. Beats may target a chapter, a scene, or neither (free-floating journey beats).
6. Add an **ingestion continuity pass** that diffs every fresh `npm run ingest:*` run against the canonical inventories and flags contradictions before they silently poison the wiki.
7. Cache Beyond session wrap / "story so far" summaries in a new `sb_beyond_reflections` table using the same input-signature pattern as `sb_profile_reflections`.

**Out of scope (deferred / split out):**

- **Next-action engine** — deferred until the reader surface matures.
- **Relationship-beat intensity curve** — split into its own plan so it can apply to the kcobb memoir app as well as Celestial. Tracked as TODO in "Follow-up plans" below; not blocked by this plan.
- **Editor persona** — deferred; placeholder left in the registry.
- **Teach-as-you-go glossary tooltips** — optional Phase H. Skip if execution bandwidth tight.

**Architecture:**

- Wiki stays source of truth. DB stays mirror. New tables are **derived artifacts** populated by scripts (beats excepted — they're authored in the DB).
- Persona registry is a pure module; orchestrator imports it and routes per-classification.
- Ledger is write-only from server. No user-facing surface in this plan beyond an admin JSON endpoint.
- Every schema change is additive. No existing table is altered beyond additive columns.

**Tech Stack:** TypeScript, Next.js 16 (App Router), Anthropic SDK, Supabase (ssr + service-role), `tsx`, `node --test`. No new runtime dependencies.

**Spec:** (none yet — this plan is the spec. Add `docs/superpowers/specs/2026-04-21-personas-beats-threads-ledger-design.md` only if the plan grows.)

---

## Phase order & dependency graph

```
A. Migrations (all five SQL files)
         │
         ├──► B. Ledger helper + wire into existing calls
         │
         ├──► C. Persona registry refactor  ─► uses ledger
         │
         ├──► D. Scenes ingest ─► Phase F beats can target scenes
         │
         ├──► E. Open threads  ─► fed into Phase C contexts
         │
         ├──► F. Beats prototype
         │
         ├──► G. Continuity pass
         │
         └──► H. Beyond session wrap  (independent — can ship anytime after A)
                  │
                  └──► I. (optional) Teach-as-you-go glossary
```

Each lettered phase is a deployable checkpoint. Test + commit between phases.

---

## File map (whole plan)

**Create — SQL:**

- `supabase/migrations/025_ai_interactions.sql`
- `supabase/migrations/026_open_threads.sql`
- `supabase/migrations/027_chapter_scenes.sql`
- `supabase/migrations/028_beats.sql`
- `supabase/migrations/029_beyond_reflections.sql`

**Create — TS lib:**

- `src/lib/ai/ledger.ts` + `src/lib/ai/ledger.test.ts`
- `src/lib/ai/personas.ts` + `src/lib/ai/personas.test.ts`
- `src/lib/ai/router.ts` + `src/lib/ai/router.test.ts`
- `src/lib/ai/reflections.ts` + `src/lib/ai/reflections.test.ts`
- `src/lib/wiki/scene-parser.ts` + `src/lib/wiki/scene-parser.test.ts`
- `src/lib/wiki/continuity-diff.ts` + `src/lib/wiki/continuity-diff.test.ts`
- `src/lib/threads/repo.ts` + `src/lib/threads/repo.test.ts`
- `src/lib/beats/repo.ts` + `src/lib/beats/repo.test.ts`

**Create — scripts:**

- `scripts/ingest-chapter-scenes.ts` + `scripts/ingest-chapter-scenes.test.ts`
- `scripts/review-ingestion.ts`
- `scripts/seed-journey-beats.ts` (one-off, deletable after seed)

**Create — UI:**

- `src/app/api/admin/ai-activity/route.ts` (service-role JSON)
- `src/app/api/admin/threads/route.ts` (admin CRUD)
- `src/components/journeys/BeatTimeline.tsx`
- `src/components/story/SceneBeatChips.tsx`

**Modify:**

- `src/lib/ai/orchestrator.ts` — use persona registry + router; log every sub-call.
- `src/lib/ai/classifier.ts` — return `PersonaRoute` (not just depth).
- `src/lib/ai/perspectives.ts` — renamed `Storyteller` → `CelestialNarrator`; add `Archivist`, `Finder`; leave `Editor` placeholder export throwing "not implemented".
- `src/app/api/ask/route.ts` — pass context_type/context_id to orchestrator for the ledger.
- `src/app/api/tell/draft/route.ts`, `src/app/api/tell/route.ts`, `src/app/api/beyond/polish/route.ts`, `src/lib/analytics/profile-reflection.ts` — call `logAiCall()`.
- `scripts/compile-wiki.ts` — after story compile, invoke `ingestChapterScenes(storyId)` upsert.
- `src/app/stories/[storyId]/page.tsx` — swap scene source to `sb_chapter_scenes` (Phase D4); add optional beat chips (Phase F3).
- `src/app/journeys/[slug]/page.tsx` — render `<BeatTimeline>`.
- `src/app/beyond/page.tsx` — render cached session-wrap summary.
- `package.json` — add scripts: `ingest:scenes`, `review:ingestion`, `seed:beats`.

---

## Phase A — Schema foundation

**Goal:** All five tables land in one atomic migration window. Each is additive, RLS-enabled, with idempotent `create table if not exists`. Nothing depends on app code yet.

### Task A1: `sb_ai_interactions`

**File:** `supabase/migrations/025_ai_interactions.sql`

```sql
-- Append-only ledger of every server-side AI call.
-- Mirrors buildabook's ai_interactions so extraction into a shared package later is trivial.

create table if not exists public.sb_ai_interactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  persona         text not null,                    -- narrator | archivist | lorekeeper | finder | synthesizer | tell_gather | tell_draft | beyond_polish | profile_reflection | other
  context_type    text not null,                    -- 'ask' | 'tell_session' | 'beyond_draft' | 'beyond_polish' | 'profile' | 'script'
  context_id      text,                             -- free-form id: conversation id, session id, draft id, user id, ''
  model           text not null,
  input_tokens    integer,
  output_tokens   integer,
  latency_ms      integer,
  cost_usd        numeric(10, 6),
  status          text not null default 'ok' check (status in ('ok', 'error')),
  error_message   text,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_sb_ai_interactions_created_at
  on public.sb_ai_interactions (created_at desc);
create index if not exists idx_sb_ai_interactions_context
  on public.sb_ai_interactions (context_type, context_id);
create index if not exists idx_sb_ai_interactions_user
  on public.sb_ai_interactions (user_id, created_at desc);

alter table public.sb_ai_interactions enable row level security;

-- Users may read their own call records (useful if we ever expose a "your AI spend" UI).
create policy "Users read own ai_interactions"
  on public.sb_ai_interactions for select
  using (auth.uid() = user_id);

-- Admin read-all.
create policy "Admin reads all ai_interactions"
  on public.sb_ai_interactions for select
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  );

-- Writes are service-role only (no insert policy for authenticated users).
```

- [ ] Write SQL.
- [ ] Apply locally via the usual supabase migration workflow.
- [ ] `npm test` still passes (no code depends on this yet).
- [ ] Commit: `migration: sb_ai_interactions ledger (025)`

### Task A2: `sb_open_threads`

**File:** `supabase/migrations/026_open_threads.sql`

Narrative mysteries / setups the *text* raised. Distinct from `sb_chapter_questions` (reader-asked).

```sql
create table if not exists public.sb_open_threads (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null,                               -- "Why is the Vault listening?"
  question                 text not null,
  kind                     text not null default 'mystery' check (kind in ('mystery', 'setup', 'contradiction', 'gap')),
  opened_in_chapter_id     text not null,                                -- e.g. 'CH01'
  opened_in_scene_slug     text,                                         -- 'scene-waking-dust'
  resolved                 boolean not null default false,
  resolved_in_chapter_id   text,
  resolved_in_scene_slug   text,
  notes                    text not null default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_sb_open_threads_open_chapter
  on public.sb_open_threads (opened_in_chapter_id);
create index if not exists idx_sb_open_threads_resolved
  on public.sb_open_threads (resolved);

alter table public.sb_open_threads enable row level security;

create policy "Anyone can read open_threads"
  on public.sb_open_threads for select using (true);

create policy "Admin or keith can write open_threads"
  on public.sb_open_threads for all
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  )
  with check (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  );
```

- [ ] Write SQL, apply, test, commit.

### Task A3: `sb_chapter_scenes`

**File:** `supabase/migrations/027_chapter_scenes.sql`

Rows are a DB mirror of `### Scene N: Title` headings under `## Full Text` in each chapter MD. Annotations (goal/conflict/outcome, pov, location) are authored on top.

```sql
create table if not exists public.sb_chapter_scenes (
  id                  uuid primary key default gen_random_uuid(),
  chapter_id          text not null,                                 -- 'CH01'
  order_index         integer not null,                               -- 1-based
  slug                text not null,                                  -- 'scene-waking-dust'
  title               text not null,                                  -- 'Waking Dust'
  goal                text,                                           -- optional annotation
  conflict            text,
  outcome             text,
  pov                 text,
  location_slug       text,
  -- NOTE: word_count is a cheap ingestion stat; recomputed on every ingest.
  word_count          integer,
  -- Content hash lets us detect when the scene body changed in source.
  content_hash        text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (chapter_id, slug)
);

create index if not exists idx_sb_chapter_scenes_chapter_order
  on public.sb_chapter_scenes (chapter_id, order_index);

alter table public.sb_chapter_scenes enable row level security;

create policy "Anyone can read chapter_scenes"
  on public.sb_chapter_scenes for select using (true);

create policy "Admin or keith can write chapter_scenes"
  on public.sb_chapter_scenes for all
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  )
  with check (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  );
```

- [ ] Write SQL, apply, test, commit.

### Task A4: `sb_beats`

**File:** `supabase/migrations/028_beats.sql`

Beats can target a chapter, a scene, or live free-floating attached to a journey. `why_it_matters` is the teaching payload.

```sql
create table if not exists public.sb_beats (
  id                uuid primary key default gen_random_uuid(),
  journey_slug      text,                                             -- nullable: beats can exist outside a journey
  chapter_id        text,                                              -- e.g. 'CH04'
  scene_slug        text,                                              -- pairs with chapter_id to target a scene
  act               integer not null check (act between 1 and 5),
  order_index       integer not null,
  beat_type         text not null check (beat_type in (
    'opening', 'inciting', 'rising', 'midpoint', 'climax',
    'falling', 'resolution', 'reveal', 'decision', 'reflection', 'setup', 'payoff'
  )),
  title             text not null,
  summary           text not null default '',
  why_it_matters    text not null default '',
  status            text not null default 'draft' check (status in ('draft', 'published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_sb_beats_journey
  on public.sb_beats (journey_slug, order_index);
create index if not exists idx_sb_beats_chapter
  on public.sb_beats (chapter_id);

alter table public.sb_beats enable row level security;

create policy "Anyone can read published beats"
  on public.sb_beats for select
  using (status = 'published');

create policy "Admin or keith can read all beats"
  on public.sb_beats for select
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  );

create policy "Admin or keith can write beats"
  on public.sb_beats for all
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  )
  with check (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'keith')
    )
  );
```

- [ ] Write SQL, apply, test, commit.

### Task A5: `sb_beyond_reflections`

**File:** `supabase/migrations/029_beyond_reflections.sql`

Cache of author-side "story so far" / session-wrap summaries. Mirrors `sb_profile_reflections` shape exactly so the reflections helper in Phase H can treat both tables uniformly.

```sql
create table if not exists public.sb_beyond_reflections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  kind              text not null check (kind in (
    'session_wrap', 'story_so_far', 'draft_digest'
  )),
  target_id         text,                                              -- session id, draft id, or null for cross-draft digest
  reflection_text   text not null check (char_length(reflection_text) between 10 and 4000),
  input_signature   text not null,
  model_slug        text not null,
  ai_interaction_id uuid references public.sb_ai_interactions(id) on delete set null,
  generated_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, kind, target_id)
);

create index if not exists idx_sb_beyond_reflections_user_kind
  on public.sb_beyond_reflections (user_id, kind, generated_at desc);

alter table public.sb_beyond_reflections enable row level security;

create policy "Users read own beyond_reflections"
  on public.sb_beyond_reflections for select
  using (auth.uid() = user_id);

-- Writes are service-role only.
```

- [ ] Write SQL, apply, test, commit.

### Task A6: Verify and capture reference

- [ ] Run `npm test` — all existing tests still pass.
- [ ] Run `npm run dev` — app still boots.
- [ ] Update `supabase/reference/` if the project maintains a schema snapshot (peek the folder first; skip if not used).
- [ ] **Commit:** `migrations 025–029: ai_interactions, open_threads, chapter_scenes, beats, beyond_reflections`

---

## Phase B — AI ledger helper

**Goal:** A single `logAiCall()` that every server-side Anthropic call funnels through, with graceful error handling (never throws into the calling path).

### Task B1: `src/lib/ai/ledger.ts` (TDD)

**Files:**

- Create: `src/lib/ai/ledger.ts`
- Create: `src/lib/ai/ledger.test.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AiCallRecord = {
  userId?: string | null;
  persona: string;                 // 'narrator' | 'archivist' | 'lorekeeper' | 'finder' | 'synthesizer' | ...
  contextType: string;             // 'ask' | 'tell_session' | 'beyond_draft' | 'beyond_polish' | 'profile' | 'script'
  contextId?: string | null;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  costUsd?: number | null;
  status?: "ok" | "error";
  errorMessage?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Cost lookup — add rows as new models come online. Unknown models return null.
 * Prices expressed as USD per 1K tokens.
 */
const MODEL_COST: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-20250514": { in: 0.003, out: 0.015 },
  "claude-3-5-haiku-20241022": { in: 0.0008, out: 0.004 },
};

export function estimateCostUsd(
  model: string,
  inputTokens?: number | null,
  outputTokens?: number | null
): number | null {
  const rate = MODEL_COST[model];
  if (!rate || inputTokens == null || outputTokens == null) return null;
  return (inputTokens / 1000) * rate.in + (outputTokens / 1000) * rate.out;
}

/**
 * Insert a ledger row. Never throws — failures are logged to console and swallowed.
 * Returns the inserted row id, or null on error.
 */
export async function logAiCall(
  supabase: SupabaseClient,
  record: AiCallRecord
): Promise<string | null> {
  try {
    const costUsd =
      record.costUsd ?? estimateCostUsd(record.model, record.inputTokens, record.outputTokens);
    const { data, error } = await supabase
      .from("sb_ai_interactions")
      .insert({
        user_id: record.userId ?? null,
        persona: record.persona,
        context_type: record.contextType,
        context_id: record.contextId ?? null,
        model: record.model,
        input_tokens: record.inputTokens ?? null,
        output_tokens: record.outputTokens ?? null,
        latency_ms: record.latencyMs ?? null,
        cost_usd: costUsd,
        status: record.status ?? "ok",
        error_message: record.errorMessage ?? null,
        meta: record.meta ?? {},
      })
      .select("id")
      .single();
    if (error) {
      console.error("[ai-ledger] insert failed:", error.message);
      return null;
    }
    return data.id as string;
  } catch (err) {
    console.error("[ai-ledger] unexpected error:", err);
    return null;
  }
}
```

- [ ] **Test first:** write `ledger.test.ts` covering `estimateCostUsd` (known model, unknown model, nulls). The DB insert function can be integration-tested via a mocked `SupabaseClient` (ref `src/lib/story-audio.test.ts` for the mocking pattern used in this repo).
- [ ] Implement; verify `npm test` passes.

### Task B2: Wire into existing AI callsites

One-by-one, wrap each `anthropic.messages.*` call with timing + `logAiCall()`. Preserve streaming behavior (capture `input_tokens`/`output_tokens` from the stream's `message_stop` / `message_delta` events — see existing orchestrator loop for the pattern).

- [ ] `src/lib/ai/orchestrator.ts` — log each of: narrator sub-call, lorekeeper sub-call, synthesizer, simple-path call. `context_type='ask'`, `context_id=conversationId`.
- [ ] `src/app/api/tell/route.ts` — persona `tell_gather`, `context_type='tell_session'`.
- [ ] `src/app/api/tell/draft/route.ts` — persona `tell_draft`.
- [ ] `src/app/api/beyond/polish/route.ts` — persona `beyond_polish`, `context_type='beyond_polish'`.
- [ ] `src/lib/analytics/profile-reflection.ts` — persona `profile_reflection`, `context_type='profile'`.

> **Streaming note:** When we can't get exact token counts from a streamed call (Anthropic sends them in `message_delta` / `message_stop`), still log the row with tokens=null and let cost remain null. Better to log nothing than guess.

### Task B3: Admin JSON endpoint

**File:** `src/app/api/admin/ai-activity/route.ts`

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("sb_profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "keith"].includes(profile.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 100));
  const { data } = await supabase
    .from("sb_ai_interactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return NextResponse.json({ rows: data ?? [] });
}
```

- [ ] Create route.
- [ ] Manual smoke: hit `/api/admin/ai-activity?limit=20` as Keith/admin — expect JSON array.
- [ ] **Commit:** `feat(ai): logAiCall ledger + wire all callsites + admin JSON endpoint`

---

## Phase C — Persona registry & router

**Goal:** Replace hand-rolled two-perspective logic with a `PERSONAS` registry. Router returns 1..N personas to fire for a given classification. Synthesizer merges N results. Behavior should match today's simple+deep paths as a baseline, then expand.

### Task C1: Registry module

**File:** `src/lib/ai/personas.ts`

```ts
import type { AgeMode } from "@/types";
import type { ReaderProgress } from "@/lib/progress/reader-progress";

export type PersonaKey =
  | "celestial_narrator"   // was storyteller
  | "archivist"            // NEW: "why does this matter" across the corpus
  | "lorekeeper"           // was principles coach — renamed for the sci-fi framing
  | "finder"               // NEW: quick factual lookup, curated list, dates
  | "synthesizer"          // merges narrator + archivist + lorekeeper
  | "editor";              // PLACEHOLDER — throws "not implemented"

export type PersonaDefinition = {
  key: PersonaKey;
  label: string;
  model: string;
  temperature: number;
  maxTokens: number;
  /** Pure function: given the context params, return the system prompt string. */
  buildSystemPrompt(args: {
    ageMode: AgeMode;
    storySlug?: string;
    journeySlug?: string;
    wikiSummaries?: string;
    storyCatalog?: string;
    readerProgress?: ReaderProgress;
    openThreads?: OpenThreadForContext[];   // NEW in Phase E
    beats?: BeatForContext[];               // NEW in Phase F
  }): string;
};

export type OpenThreadForContext = {
  title: string;
  question: string;
  openedInChapterId: string;
  resolved: boolean;
};

export type BeatForContext = {
  title: string;
  whyItMatters: string;
  beatType: string;
  chapterId: string | null;
};

export const PERSONAS: Record<PersonaKey, PersonaDefinition> = {
  celestial_narrator: { /* built from perspectives.ts#buildStorytellerPrompt */ ... },
  lorekeeper:         { /* built from perspectives.ts#buildPrinciplesCoachPrompt ... */ },
  archivist:          { /* NEW — see C2 */ ... },
  finder:             { /* NEW — see C3 */ ... },
  synthesizer:        { /* built from perspectives.ts#buildSynthesizerPrompt */ ... },
  editor:             {
    key: "editor",
    label: "Editor (not implemented)",
    model: "claude-sonnet-4-20250514",
    temperature: 0.3,
    maxTokens: 1024,
    buildSystemPrompt: () => {
      throw new Error("editor persona is not implemented in this phase");
    },
  },
};

export function getPersona(key: PersonaKey): PersonaDefinition {
  return PERSONAS[key];
}
```

- [ ] Write registry wiring — import/port existing prompt builders from `perspectives.ts`.
- [ ] Tests: `personas.test.ts` asserts each active persona returns a non-empty prompt containing its shared content block and `AGE_MODE_INSTRUCTIONS[ageMode]` snippet.
- [ ] Assert `getPersona("editor").buildSystemPrompt(...)` throws with "not implemented".

### Task C2: New Archivist persona

Archivist = "why does this matter across the corpus" — thematic pattern-spotting, cross-story synthesis, but ground in the *company of stories*, not individual principles.

```ts
export function buildArchivistPrompt(...): string {
  return `You are the Archivist in a multi-agent system exploring "${book.title}".

## Your Role
Surface the pattern across multiple stories and artifacts. Where the Narrator finds the single vivid story and the Lore-keeper names the rule, the Archivist says *why it keeps happening* — the throughline across the corpus.

## Instructions
- Name 2–4 distinct stories or artifacts that share a pattern relevant to the user's question.
- Describe the pattern in one sentence; do not list bullet principles (that is the Lore-keeper's role).
- Prefer evidence from multiple life stages, chapters, or factions to show breadth.
- Link story titles as markdown: [Title](/stories/STORY_ID).
- Do NOT retell any one story in full.
- Keep your response under 300 words — this is raw material.

...shared content block...`;
}
```

### Task C3: New Finder persona

Finder = fast, short, factual lookups. Replaces the "simple path" in today's orchestrator.

```ts
export function buildFinderPrompt(...): string {
  return `You are the Finder in a multi-agent system for "${book.title}".

## Your Role
Answer factual or list queries directly and briefly. Dates, counts, which stories mention what, which chapter an event happened in. No storytelling flourishes. No cross-synthesis.

## Instructions
- Answer in 1–4 sentences OR a short bulleted list.
- Always link specific stories using [Title](/stories/STORY_ID).
- If the corpus does not cover the question, say so plainly in one sentence.
- Do NOT invent events, dates, or quotes.

...shared content block (compact)...`;
}
```

### Task C4: Router

**File:** `src/lib/ai/router.ts`

```ts
import type { PersonaKey } from "./personas";
import { classifyQuestion, type QuestionDepth } from "./classifier";

export type PersonaRoute = {
  personas: PersonaKey[];        // ordered by priority; synthesizer added automatically if length > 1
  depth: QuestionDepth;
  reason: string;
};

/**
 * Returns which personas to fire for a given user message.
 * Default: narrator + archivist + lorekeeper → synthesizer. (3 parallel + 1 merge)
 * Factual / list: finder alone.
 * Short lookup: finder alone.
 */
export function routeAsk(message: string): PersonaRoute {
  const depth = classifyQuestion(message);
  if (depth === "simple") {
    return { personas: ["finder"], depth, reason: "short/factual" };
  }
  return {
    personas: ["celestial_narrator", "archivist", "lorekeeper"],
    depth,
    reason: "deep synthesis",
  };
}
```

- [ ] `router.test.ts`: `"When did Directive 14 happen?"` → `["finder"]`; `"What does the Vault teach us about regret?"` → narrator+archivist+lorekeeper.

### Task C5: Orchestrator refactor

Rewrite `src/lib/ai/orchestrator.ts` to consume the router + registry:

```ts
export async function orchestrateAsk(params): Promise<OrchestrateResult> {
  const route = routeAsk(params.message);
  if (route.personas.length === 1) {
    return { stream: singlePath(params, route.personas[0]), depth: route.depth };
  }
  return { stream: multiPath(params, route.personas), depth: route.depth };
}
```

- `singlePath(params, personaKey)` — load persona, stream, log ledger row. Mirrors today's `simplePath()`.
- `multiPath(params, personaKeys)` — fire all in parallel (non-streaming), log a row per sub-call, then stream synthesizer. Mirrors today's `deepPath()` but with N perspectives.
- Synthesizer prompt is updated to say "Here are N perspectives" dynamically rather than hardcoding 2.

- [ ] Port `deepPath`/`simplePath` into `multiPath`/`singlePath`.
- [ ] Update `buildSynthesizerPrompt` to accept `personaLabels: string[]` and format the section header dynamically.
- [ ] Every sub-call goes through `logAiCall()` with `persona` set to the persona key.
- [ ] Manual smoke: ask short factual question → finder only; ask deep question → narrator+archivist+lorekeeper merged.
- [ ] **Commit:** `feat(ai): persona registry + router (narrator, archivist, lorekeeper, finder); editor placeholder`

---

## Phase D — Scenes ingest + surface

**Goal:** The `### Scene N: Title` headings already present in every `content/wiki/stories/CH*.md` become queryable rows. Downstream (Phase F) beats can target them; AI context blocks can cite scene-level locations.

### Task D1: Scene parser

**File:** `src/lib/wiki/scene-parser.ts`

Extract existing logic from `src/lib/wiki/markdown-headings.ts` (`extractSceneSectionsFromChapterBody`) and extend: return full scene body text, a content hash, and word count.

```ts
import { createHash } from "node:crypto";
import { slugifyHeading } from "@/lib/wiki/markdown-headings";

export type ParsedScene = {
  orderIndex: number;         // 1-based
  slug: string;               // 'scene-waking-dust'
  title: string;              // 'Waking Dust'
  body: string;               // full scene prose (markdown between its ### and the next ### or ## heading)
  wordCount: number;
  contentHash: string;        // sha256 of body
};

export function parseChapterScenes(fullText: string): ParsedScene[] {
  const block = fullText.match(/## Full Text\s*\n\n([\s\S]*)/)?.[1];
  if (!block) return [];
  const beforeNextMajor = block.split(/\n## /)[0] ?? block;
  const lines = beforeNextMajor.split("\n");
  const scenes: ParsedScene[] = [];
  let current: { title: string; slug: string; buffer: string[] } | null = null;
  let order = 0;
  const flush = () => {
    if (!current) return;
    const body = current.buffer.join("\n").trim();
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    const contentHash = createHash("sha256").update(body).digest("hex").slice(0, 32);
    scenes.push({ orderIndex: ++order, slug: current.slug, title: current.title, body, wordCount, contentHash });
  };
  for (const line of lines) {
    const m = line.match(/^###\s+(?:Scene\s+\d+:\s+)?(.+)$/i);
    if (m) {
      flush();
      const title = m[1].trim();
      current = { title, slug: `scene-${slugifyHeading(title)}`, buffer: [] };
      continue;
    }
    if (current) current.buffer.push(line);
  }
  flush();
  return scenes;
}
```

- [ ] **Test first:** write `scene-parser.test.ts` fixtures with 2- and 3-scene chapter bodies, including mission-log headings after scenes (must stop at the next `## ` or at mission-log marker).
- [ ] Implement, verify tests pass.

### Task D2: Ingest script

**File:** `scripts/ingest-chapter-scenes.ts`

```ts
import { createClient } from "@supabase/supabase-js";
import { getAllStories } from "@/lib/wiki/parser";
import { parseChapterScenes } from "@/lib/wiki/scene-parser";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const stories = getAllStories();
  let inserted = 0, updated = 0, unchanged = 0;
  for (const story of stories) {
    const parsed = parseChapterScenes(story.fullText);
    for (const scene of parsed) {
      const { data: existing } = await supabase
        .from("sb_chapter_scenes")
        .select("id, content_hash")
        .eq("chapter_id", story.storyId)
        .eq("slug", scene.slug)
        .maybeSingle();
      if (existing && existing.content_hash === scene.contentHash) { unchanged++; continue; }
      if (existing) {
        await supabase.from("sb_chapter_scenes").update({
          order_index: scene.orderIndex, title: scene.title,
          word_count: scene.wordCount, content_hash: scene.contentHash, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("sb_chapter_scenes").insert({
          chapter_id: story.storyId, order_index: scene.orderIndex, slug: scene.slug,
          title: scene.title, word_count: scene.wordCount, content_hash: scene.contentHash,
        });
        inserted++;
      }
    }
  }
  console.log(`[ingest:scenes] inserted=${inserted} updated=${updated} unchanged=${unchanged}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] Add to `package.json`: `"ingest:scenes": "node --import tsx scripts/ingest-chapter-scenes.ts"`.
- [ ] Run once locally against a dev Supabase. Expect rows for every `CH##` + scene heading.
- [ ] Call it from `scripts/compile-wiki.ts` tail so the wiki mirror stays in sync with scenes automatically (wrap with a top-level feature flag in case service-role env is missing).

### Task D3: Scene detail surface (minimal)

No new page — just make scenes queryable for the AI context and for Phase F beats. Add a helper:

**File:** `src/lib/wiki/scenes-db.ts`

```ts
import { createClient } from "@/lib/supabase/server";

export async function getScenesForChapter(chapterId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sb_chapter_scenes")
    .select("order_index, slug, title, goal, conflict, outcome, pov, location_slug")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true });
  return data ?? [];
}
```

- [ ] Wire into the `currently reading` context block in `perspectives.ts#sharedContentBlock` — when a `storySlug` is present, append a compact "Scenes in this chapter" list so personas can reference them by slug.
- [ ] **Commit:** `feat(scenes): sb_chapter_scenes + ingest:scenes + AI context integration`

### Task D4: Swap story detail page onto `sb_chapter_scenes`

**Goal:** Close acceptance criterion *"`/stories/CH01` has a scene list backed by `sb_chapter_scenes` rows, not markdown-only parsing."* Without this, the page still reads from `extractSceneSectionsFromChapterBody`, so the DB table is invisible to readers and the user's "surface existing named scenes" approval stays partially met.

**Files:**
- Modify: `src/app/stories/[storyId]/page.tsx`
- Modify: `src/lib/wiki/scenes-db.ts` (from D3) — add an adapter helper.

The existing page consumes scenes in the shape `{ id: string; label: string }[]` (fed into `StorySceneJump` and `StoryTOC`). D4 keeps that prop contract, only flips the source.

- [ ] **Step 1: Add an adapter in `scenes-db.ts`**

```ts
// src/lib/wiki/scenes-db.ts  (append alongside getScenesForChapter from D3)

export type SceneSection = { id: string; label: string };

/**
 * Returns scene sections in the shape StorySceneJump / StoryTOC already expect.
 * `id` is the anchor slug (same one the markdown path produced), `label` is the scene title.
 */
export async function getSceneSectionsForChapter(
  chapterId: string,
): Promise<SceneSection[]> {
  const rows = await getScenesForChapter(chapterId);
  return rows.map((r) => ({ id: r.slug, label: r.title }));
}
```

- [ ] **Step 2: Flip the page**

In `src/app/stories/[storyId]/page.tsx`, replace the markdown-path line:

```ts
// BEFORE
import { extractSceneSectionsFromChapterBody } from "@/lib/wiki/markdown-headings";
// ...
const sceneSections = extractSceneSectionsFromChapterBody(story.fullText);
```

with the DB-backed version + a graceful fallback for chapters where `ingest:scenes` hasn't been run (empty DB → don't break the page):

```ts
import { getSceneSectionsForChapter } from "@/lib/wiki/scenes-db";
import { extractSceneSectionsFromChapterBody } from "@/lib/wiki/markdown-headings";
// ...
const dbScenes = await getSceneSectionsForChapter(storyId);
const sceneSections =
  dbScenes.length > 0
    ? dbScenes
    : extractSceneSectionsFromChapterBody(story.fullText);
```

Rationale for the fallback: during local dev or on a fresh Supabase, `sb_chapter_scenes` may be empty until someone runs `npm run ingest:scenes`. The page should degrade to the old behavior rather than render an empty TOC. Once all chapters are ingested in prod the fallback is dead code — removable in a later cleanup PR.

- [ ] **Step 3: Verify both branches**

With `sb_chapter_scenes` empty:
1. `truncate public.sb_chapter_scenes;` in Supabase SQL editor.
2. Open `/stories/CH01` — scene jump list still renders from markdown (fallback path).

After running `npm run ingest:scenes`:
1. Confirm rows exist (`select count(*) from sb_chapter_scenes where chapter_id = 'CH01';`).
2. Reload `/stories/CH01` — scene list still renders; inspect the server component's rendered HTML to confirm anchor `id`s match the slugs in the DB (they should, since both paths now use `slugifyHeading`).
3. Manually rename a scene heading in one markdown file, re-run `npm run ingest:scenes`, reload — the reader sees the new title without any code change. This confirms the DB is truly the source.

- [ ] **Step 4: Don't delete the markdown helper yet**

`extractSceneSectionsFromChapterBody` is still the fallback, and `scene-parser.ts` (D1) is a different helper with a different return shape. Both stay for now. A future cleanup can retire the former once every environment is guaranteed to have ingested scenes.

- [ ] **Step 5: Commit**

```bash
git add src/app/stories/\[storyId\]/page.tsx src/lib/wiki/scenes-db.ts
git commit -m "feat(scenes): reader page reads from sb_chapter_scenes with markdown fallback"
```

---

## Phase E — Open threads

**Goal:** Track narrative mysteries that the text itself raises. Minimal author-only admin UI; AI context block can surface unresolved threads.

### Task E1: Repo

**File:** `src/lib/threads/repo.ts`

```ts
export type OpenThread = {
  id: string;
  title: string;
  question: string;
  kind: "mystery" | "setup" | "contradiction" | "gap";
  openedInChapterId: string;
  openedInSceneSlug: string | null;
  resolved: boolean;
  resolvedInChapterId: string | null;
  resolvedInSceneSlug: string | null;
  notes: string;
};

export async function listOpenThreads(...): Promise<OpenThread[]> { ... }
export async function listUnresolvedThroughChapter(chapterId: string): Promise<OpenThread[]> { ... }
export async function createThread(input: ...): Promise<OpenThread> { ... }
export async function markResolved(id: string, ...): Promise<OpenThread> { ... }
```

- [ ] Tests: fake Supabase client; assert queries filter by resolved / chapter.

### Task E2: Admin API

**File:** `src/app/api/admin/threads/route.ts` — GET list, POST create, PATCH resolve. Admin/keith role gate identical to `/api/admin/ai-activity`.

- [ ] Manual seed: insert 3–5 threads via the API (or `scripts/seed-open-threads.ts` if you prefer a repeatable seed).

### Task E3: Context integration

In `src/lib/ai/personas.ts` `sharedContentBlock` (Phase C), when a `readerProgress` is known, fetch unresolved threads opened in chapters ≤ current and append:

```
## Open Narrative Threads (unresolved through current chapter)
- [mystery] "Why is the Vault listening?" (opened in CH01) — the text keeps returning to this without resolving it.
- [setup] "What is Galen afraid to hear?" (opened in CH02) — ...
```

- [ ] Verify in dev: ask "What mysteries are still open?" → answer should cite the actual threads, not hallucinate.
- [ ] **Commit:** `feat(threads): sb_open_threads + admin API + AI context integration`

---

## Phase F — Beats prototype

**Goal:** Prove the beats construct end-to-end on **one** journey before committing to full coverage. Pick a journey that exercises act/arc structure well — e.g. the "Directive 14" arc or any that threads through Acts I–III.

### Task F1: Repo

**File:** `src/lib/beats/repo.ts`

```ts
export type Beat = {
  id: string;
  journeySlug: string | null;
  chapterId: string | null;
  sceneSlug: string | null;
  act: number;
  orderIndex: number;
  beatType: string;
  title: string;
  summary: string;
  whyItMatters: string;
  status: "draft" | "published";
};

export async function listBeatsByJourney(slug: string): Promise<Beat[]> { ... }
export async function listBeatsByChapter(chapterId: string): Promise<Beat[]> { ... }
export async function upsertBeat(input: Omit<Beat, "id">): Promise<Beat> { ... }
```

### Task F2: Seed one journey

**File:** `scripts/seed-journey-beats.ts` — hand-authored constant array of ~8–12 beats for **one** journey. Deletable once content moves into a real admin flow; keep committed for now as the reference seed.

```ts
const JOURNEY_SLUG = "directive-14";    // or whichever journey you choose
const BEATS: Omit<Beat, "id">[] = [
  { journeySlug: JOURNEY_SLUG, chapterId: "CH01", sceneSlug: "scene-waking-dust",
    act: 1, orderIndex: 1, beatType: "opening",
    title: "A silence that listens back",
    summary: "Galen feels the Valkyrie is not merely dormant.",
    whyItMatters: "Seeds the series' core question: when an artifact refuses to speak, is it dead — or deciding?",
    status: "published" },
  // ...
];
```

- [ ] Add `"seed:beats": "node --import tsx scripts/seed-journey-beats.ts"` to `package.json`.
- [ ] Run once. Inspect rows. Iterate on wording.

### Task F3: Render

**File:** `src/components/journeys/BeatTimeline.tsx` — list beats ordered by `act, order_index`. For each beat render:
- Badge with `beatType`
- Title + one-sentence summary
- Collapsible "Why it matters" (the teaching payload — this is the whole point of beats)
- If `chapterId`/`sceneSlug` present: anchor link `/stories/CH01#scene-waking-dust`

- [ ] Render in `src/app/journeys/[slug]/page.tsx` below the existing description.
- [ ] Optional: render small chips on the story detail page (`SceneBeatChips.tsx`) showing beats that target the current scene.

### Task F4: AI context integration

In `sharedContentBlock`, if `journeySlug` present, pull beats for that journey and inject:

```
## Journey Beats (structural map)
- **[Act 1 · opening] A silence that listens back** — Seeds the series' core question: when an artifact refuses to speak, is it dead — or deciding?
- ...
```

- [ ] Verify narrator + archivist can reference beats in their replies ("this is the inciting beat — the moment Galen decides…").
- [ ] **Commit:** `feat(beats): sb_beats + one-journey seed + BeatTimeline + AI context integration`

---

## Phase G — Ingestion continuity pass

**Goal:** Each time `npm run ingest:book` / `ingest:lore` / `compile:wiki` runs, diff the fresh outputs against the last run and surface contradictions before they contaminate the corpus.

### Task G1: Continuity diff module

**File:** `src/lib/wiki/continuity-diff.ts`

```ts
export type CanonSnapshot = {
  entities: Record<string, { canonicalSlug: string; aliases: string[]; lastSeenIn: string[] }>;
};

export type Contradiction =
  | { kind: "alias_moved"; alias: string; fromSlug: string; toSlug: string }
  | { kind: "entity_vanished"; slug: string }
  | { kind: "relation_flipped"; subject: string; predicate: string; before: string; after: string }
  | { kind: "chapter_theme_changed"; storyId: string; before: string[]; after: string[] };

export function diffCanonSnapshots(
  previous: CanonSnapshot | null,
  current: CanonSnapshot
): Contradiction[] { ... }
```

- [ ] Tests cover: alias moved between entities; entity vanished; theme changed. Each produces one typed contradiction.

### Task G2: Continuity CLI

**File:** `scripts/review-ingestion.ts`

Reads the current `content/raw/canon_entities.json`, `lore_inventory.json`, `mission_logs_inventory.json` and diffs them against a stored snapshot at `content/raw/.continuity/last-snapshot.json`. Writes:

- A fresh snapshot (overwrites previous) under `content/raw/.continuity/last-snapshot.json`.
- A human-readable report at `docs/superpowers/specs/YYYY-MM-DD-ingestion-review.md` (dated).
- Exit code 1 if any `alias_moved` or `relation_flipped` contradictions are found — so CI can gate re-ingest.

- [ ] Add `"review:ingestion": "node --import tsx scripts/review-ingestion.ts"` to `package.json`.
- [ ] Add `.continuity/` to `.gitignore` inside `content/raw/` if the snapshot file shouldn't be versioned; keep it versioned if you want reproducible diffs across collaborators (recommend: version it — it's tiny).
- [ ] Run once after a fresh `ingest:book` run. Expect zero contradictions on first run.
- [ ] Simulate a contradiction (rename an alias in a wiki file, re-ingest): the CLI should exit 1 and write a review markdown listing it.
- [ ] **Commit:** `feat(continuity): review:ingestion CLI + snapshot diffs`

---

## Phase H — Beyond session wrap

**Goal:** When Keith returns to Beyond, he sees a cached "here's where you left off" summary that only regenerates when his activity signature has moved.

### Task H1: Generic reflection helper

**File:** `src/lib/ai/reflections.ts`

Same shape as buildabook's `getOrGenerateReflection` but reads/writes `sb_beyond_reflections`:

```ts
export async function getOrGenerateBeyondReflection(args: {
  userId: string;
  kind: "session_wrap" | "story_so_far" | "draft_digest";
  targetId: string | null;
  inputSignature: string;
  model: string;
  generate: () => Promise<{ text: string; inputTokens?: number; outputTokens?: number }>;
}): Promise<{ text: string; generated: boolean }> { ... }
```

- Reads existing row for `(user_id, kind, target_id)`.
- If signature matches → return cached text (`generated: false`).
- Else → call `generate()`, log an `sb_ai_interactions` row, upsert, return (`generated: true`).
- All DB failures → fallback to calling `generate()` and returning the fresh output uncached (fail-open).

- [ ] `reflections.test.ts` mirrors the pure decision logic from `analytics/profile-reflection.ts` (which already has a well-factored `shouldRegenerateReflection`). Reuse where appropriate — consider extracting the decision function into this module.

### Task H2: Session-wrap generator

**File:** `src/lib/beyond/session-wrap.ts`

Inputs: last N sessions for this user (`sb_story_sessions` joined with `sb_story_drafts`), recent `sb_story_messages` summaries, and any drafts still in `draft` status.

Signature = `sha256("session_wrap:" + lastSessionId + ":" + draftCount + ":" + latestMessageTimestamp).slice(0, 16)`.

- [ ] Unit-test the signature function only (not the Claude call — that's already covered by the helper tests).

### Task H3: Surface

In `src/app/beyond/page.tsx`, server-render:

```tsx
const { text, generated } = await getOrGenerateBeyondReflection({
  userId: user.id,
  kind: "session_wrap",
  targetId: null,
  inputSignature: sig,
  model: "claude-sonnet-4-20250514",
  generate: () => generateSessionWrap({ userId: user.id }),
});
```

Render as a dismissible card at the top of /beyond. If `generated === true`, also log to `sb_ai_interactions` (the helper does this for you).

- [ ] Verify the cached path is exercised on second render (inspect the ledger — no new row).
- [ ] **Commit:** `feat(beyond): session wrap reflection with input-signature cache`

---

## Phase I (optional) — Teach-as-you-go glossary

> Only execute if time remains. User said "good" on item 10 — OK to ship minimally, OK to drop.

### Task I1: Glossary source

**File:** `content/wiki/glossary.md`

```md
# Glossary

## Journey
A curated path through multiple chapters or stories that explores a single question or theme.

## Mission log
An in-world document format used aboard the Valkyrie. Captures commander or crew observations in a standardized shape.

## Lore metadata
A structured block at the foot of a wiki entity page that records where a fact came from and when it was last reviewed.

## Principle
A recurring pattern the series returns to — extracted and organized under the 12 canonical principles.
```

### Task I2: Parser + component

- `src/lib/wiki/glossary.ts` — `getGlossary(): Record<string, { term: string; definition: string }>`.
- `src/components/ui/TermTip.tsx` — wrap any term: `<TermTip term="Mission log">mission log</TermTip>` → hover/tap reveals definition.

- [ ] Sprinkle a handful of `<TermTip>` instances in reader-facing headers (`/stories`, `/journeys`, `/mission-logs`).
- [ ] **Commit:** `feat(glossary): teach-as-you-go term tooltips`

---

## Follow-up plans (NOT in this plan — track separately)

- **Relationship-beat intensity curve** — split into `docs/superpowers/plans/<date>-relationship-intensity-curve.md`. Scope to apply to both Celestial (`sb_people` ↔ chapters) and the kcobb memoir app so the schema lands once. User explicitly asked this be scoped separately.
- **Next-action engine** — deferred until the reader surface matures. Revisit after beats + scenes + open threads are live in UI; those are the natural inputs.
- **Editor persona** — second-pass continuity editor that critiques a Beyond draft against established canon. Natural successor to Phase G.
- **Shared packages extraction** — `@your/tiptap-mentions`, `@your/ai-ledger`, `@your/persona-kit`. Revisit once the ledger + registry have stabilized across two callsites (Celestial + kcobb/buildabook).

---

## Acceptance

This plan is complete when:

- [ ] All 5 migrations applied; `npm test` passes.
- [ ] Every server-side Anthropic call in the repo writes to `sb_ai_interactions` (verify by opening `/api/admin/ai-activity?limit=50` after a test session and seeing one row per sub-call).
- [ ] Ask Celestial responds with:
  - `finder` only for short factual questions (latency and cost drop vs. today's deep path).
  - `narrator + archivist + lorekeeper + synthesizer` for deep questions (latency roughly matches today's deep path; output cites more diverse stories).
- [ ] At least one journey renders a full `<BeatTimeline>` with `why_it_matters` copy on every beat.
- [ ] `/stories/CH01` (or any chapter) has a scene list backed by `sb_chapter_scenes` rows, not markdown-only parsing. Markdown fallback path only fires when the DB is empty for that chapter.
- [ ] Admin can insert an open thread via `/api/admin/threads` and see it referenced in a subsequent Archivist response.
- [ ] `npm run review:ingestion` passes with zero contradictions on a clean repo and exits 1 when a known contradiction is introduced.
- [ ] `/beyond` shows a cached session-wrap summary that does not regenerate on refresh.
- [ ] No ESLint / TypeScript errors. No new runtime dependencies added.

---

## Rough sequencing (single-dev calendar estimate)

| Phase | Effort | Notes |
|---|---|---|
| A – migrations | 0.5 day | SQL only, no code |
| B – ledger + wiring | 1 day | Touch every callsite |
| C – personas + router | 1.5 days | Most cognitive load |
| D – scenes | 0.75 day | Parser already exists; D4 swaps the reader page onto the DB |
| E – open threads | 0.5 day | Table + admin API + context |
| F – beats prototype | 1 day | Seeding one journey is the work |
| G – continuity pass | 1 day | Diff logic is the work |
| H – Beyond session wrap | 0.5 day | Helper mostly mirrors buildabook |
| I – glossary (optional) | 0.5 day | |

Total ≈ 6.75 dev-days with the optional phase, 6.25 without.
