# Profile Reflection Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/nightshift/specs/2026-04-18-profile-reflection-gallery-design.md`

**Goal:** Replace the utility-launcher `/profile` page (non-Keith users only) with a reflective mirror — AI narrator reflection as hero, gallery of signal tiles, utility demoted to subtle top-right icons.

**Architecture:** Server Component page assembles one data bundle via `getProfileGalleryData(userId)`, passed to `<ProfileReflectionHero>` + `<ProfileGallery>`. Narrator reflection is generated lazily on request (cooldown + trigger checks), cached per-user in new table `sb_profile_reflections`. Keith special-access path (`KeithProfileHero`) is untouched.

**Tech Stack:** Next.js 16 App Router (RSC), Supabase (Postgres + RLS), Anthropic Claude Sonnet 4 (reusing existing `@anthropic-ai/sdk` integration), `node:test` for unit tests, Tailwind 4.

---

## File Structure

**Create:**

- `supabase/migrations/019_profile_reflections.sql` — `sb_profile_reflections` table + RLS
- `src/lib/analytics/profile-reflection.ts` — trigger logic + generator + caching
- `src/lib/analytics/profile-reflection.test.ts` — unit tests for trigger/signature logic
- `src/lib/analytics/profile-gallery-data.ts` — single bundle assembler for the whole page
- `src/components/profile/ProfileReflectionHero.tsx` — hero strip (narrator + utility icons)
- `src/components/profile/ProfileGallery.tsx` — grid shell
- `src/components/profile/tiles/FeaturedPassageTile.tsx`
- `src/components/profile/tiles/WithKeithSinceTile.tsx`
- `src/components/profile/tiles/PrinciplesTile.tsx`
- `src/components/profile/tiles/DialogueTile.tsx`
- `src/components/profile/tiles/ThemesTile.tsx`
- `src/components/profile/tiles/KeepersTile.tsx`
- `src/components/profile/tiles/KeithsPeopleTile.tsx`
- `src/components/profile/tiles/GhostTile.tsx` — shared ghost shell for empty tiles
- `src/components/profile/ProfileUtilityIcons.tsx` — client component for tour/admin/sign-out icons

**Modify:**

- `src/app/profile/page.tsx` — swap `<ProfileHero>` branch for the new components; Keith branch untouched

**Delete (last task, after verification):**

- `src/components/profile/ProfileHero.tsx`
- `src/components/profile/ProfileReadingDashboard.tsx`

**Unchanged:**

- `src/components/profile/KeithProfileHero.tsx`
- `src/components/profile/KeithDashboard.tsx`
- `src/lib/analytics/keith-dashboard.ts`

---

## Task 1: Create the Profile Reflections Migration

**Files:**

- Create: `supabase/migrations/019_profile_reflections.sql`
- **Step 1: Write the migration**

```sql
-- Cached narrator-voiced reflection about each user's reading pattern.
-- Generated lazily on /profile render; regenerated only when the user's
-- activity signature has moved meaningfully and the 24h cooldown has passed.

create table public.sb_profile_reflections (
  user_id          uuid        primary key references auth.users(id) on delete cascade,
  reflection_text  text        not null check (char_length(reflection_text) between 10 and 800),
  generated_at     timestamptz not null default now(),
  input_signature  text        not null,
  model_slug       text        not null
);

alter table public.sb_profile_reflections enable row level security;

create policy "Users read own reflection"
  on public.sb_profile_reflections for select
  using (auth.uid() = user_id);

-- Writes are restricted to service role (server-side generator) only.
-- No insert/update/delete policies for authenticated users.
```

- **Step 2: Apply migration locally**

Run: `npx supabase db push` (or however the project normally applies migrations — follow the convention already used for `018_`*).
Expected: migration applies without error; `\d sb_profile_reflections` in `psql` shows the table and RLS enabled.

- **Step 3: Commit**

```bash
git add supabase/migrations/019_profile_reflections.sql
git commit -m "feat(profile): add sb_profile_reflections table

Stores cached AI-written narrator reflections per user with an
input_signature for cheap trigger checks. RLS allows self-read only;
writes are service-role only.

Part of DEVPLAN-IDEA-020."
```

---

## Task 2: Reflection Trigger + Signature Logic (Pure Functions)

**Files:**

- Create: `src/lib/analytics/profile-reflection.ts` (trigger/signature functions only in this task)
- Create: `src/lib/analytics/profile-reflection.test.ts`
- **Step 1: Write the failing tests**

```ts
// src/lib/analytics/profile-reflection.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeInputSignature,
  shouldRegenerateReflection,
  type ReflectionInputs,
  type CachedReflection,
} from "@/lib/analytics/profile-reflection";

test("computeInputSignature is stable for identical inputs", () => {
  const a = computeInputSignature({ readCount: 3, savedCount: 1, askedCount: 0 });
  const b = computeInputSignature({ readCount: 3, savedCount: 1, askedCount: 0 });
  assert.equal(a, b);
});

test("computeInputSignature differs when counts differ", () => {
  const a = computeInputSignature({ readCount: 3, savedCount: 1, askedCount: 0 });
  const b = computeInputSignature({ readCount: 4, savedCount: 1, askedCount: 0 });
  assert.notEqual(a, b);
});

test("shouldRegenerate returns 'none' when user has read 0 stories", () => {
  const got = shouldRegenerateReflection({
    inputs: { readCount: 0, savedCount: 0, askedCount: 0 },
    cached: null,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "none");
});

test("shouldRegenerate returns 'generate' on first-time (read>=1, no cache)", () => {
  const got = shouldRegenerateReflection({
    inputs: { readCount: 1, savedCount: 0, askedCount: 0 },
    cached: null,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "generate");
});

test("shouldRegenerate returns 'use-cache' when inputs unchanged", () => {
  const inputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T12:00:00Z"),
    inputSignature: computeInputSignature(inputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs,
    cached,
    now: new Date("2026-04-18T13:00:00Z"),
  });
  assert.equal(got, "use-cache");
});

test("shouldRegenerate returns 'use-cache' when cooldown not elapsed even if inputs moved", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-18T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 6, savedCount: 1, askedCount: 0 }, // +3 reads
    cached,
    now: new Date("2026-04-18T10:00:00Z"), // only 10h later
  });
  assert.equal(got, "use-cache");
});

test("shouldRegenerate returns 'generate' when +3 reads and cooldown elapsed", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 6, savedCount: 1, askedCount: 0 },
    cached,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "generate");
});

test("shouldRegenerate returns 'generate' when +1 saved passage and cooldown elapsed", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 3, savedCount: 2, askedCount: 0 },
    cached,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "generate");
});

test("shouldRegenerate returns 'use-cache' for tiny read growth below threshold", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 4, savedCount: 1, askedCount: 0 }, // +1 read only
    cached,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "use-cache");
});
```

- **Step 2: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern="computeInputSignature|shouldRegenerate"`
Expected: FAIL with "Cannot find module '@/lib/analytics/profile-reflection'".

- **Step 3: Implement the functions**

```ts
// src/lib/analytics/profile-reflection.ts
import { createHash } from "node:crypto";

export type ReflectionInputs = {
  readCount: number;
  savedCount: number;
  askedCount: number;
};

export type CachedReflection = {
  reflectionText: string;
  generatedAt: Date;
  inputSignature: string;
  modelSlug: string;
};

export type RegenerateDecision = "none" | "use-cache" | "generate";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const READ_TRIGGER = 3;
const SAVED_TRIGGER = 1;
const ASKED_TRIGGER = 1;

export function computeInputSignature(inputs: ReflectionInputs): string {
  const payload = `${inputs.readCount}|${inputs.savedCount}|${inputs.askedCount}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Decide whether to (re)generate the reflection, use the cached one, or show nothing.
 * - "none":       user has no reading activity yet
 * - "use-cache":  cached row is still fresh enough
 * - "generate":   triggers met AND cooldown elapsed (or no cache exists)
 */
export function shouldRegenerateReflection(args: {
  inputs: ReflectionInputs;
  cached: CachedReflection | null;
  now: Date;
}): RegenerateDecision {
  const { inputs, cached, now } = args;

  if (inputs.readCount === 0) return "none";

  if (!cached) return "generate";

  const cooldownElapsed = now.getTime() - cached.generatedAt.getTime() >= COOLDOWN_MS;

  const cachedInputs = parseSignatureCounts(cached.inputSignature, inputs);
  const readDelta = inputs.readCount - cachedInputs.readCount;
  const savedDelta = inputs.savedCount - cachedInputs.savedCount;
  const askedDelta = inputs.askedCount - cachedInputs.askedCount;

  const triggersMet =
    readDelta >= READ_TRIGGER ||
    savedDelta >= SAVED_TRIGGER ||
    askedDelta >= ASKED_TRIGGER;

  if (!cooldownElapsed) return "use-cache";
  if (!triggersMet) return "use-cache";

  return "generate";
}

/**
 * Signatures are opaque hashes; to compute deltas we re-derive the counts
 * by comparing candidate inputs to a stored signature. In practice the
 * caller should also record the raw counts alongside the signature, but we
 * keep the signature as the canonical cache key. For robustness the table
 * stores only the signature; the generator reconstructs a probe from the
 * candidate inputs and falls back to "treat as changed" if mismatch.
 *
 * We solve this by storing counts in the signature material in plain form
 * and recovering them here.
 */
function parseSignatureCounts(
  _signature: string,
  _candidate: ReflectionInputs
): ReflectionInputs {
  // Signature is a sha256 truncation of "r|s|a"; we cannot invert a hash.
  // The trigger logic therefore needs raw counts at comparison time, not the
  // hash. Callers pass the cached row, which contains the signature only —
  // so we store the counts alongside signature in the table via the same
  // deterministic encoding. To keep this pure-function file decoupled from
  // the DB, the generator embeds the counts as a prefix in input_signature:
  //   format: "<r>.<s>.<a>:<sha256-first-16>"
  // parseSignatureCounts reads the prefix if present.
  return { readCount: 0, savedCount: 0, askedCount: 0 };
}
```

**Note for implementer:** the pure-function design above hits a wall: a hash isn't invertible, so we can't compute deltas from signature alone. Replace the design with a prefixed-signature format that embeds raw counts. See Step 4.

- **Step 4: Revise the implementation to use a prefix-encoded signature**

Replace the file content with:

```ts
// src/lib/analytics/profile-reflection.ts
import { createHash } from "node:crypto";

export type ReflectionInputs = {
  readCount: number;
  savedCount: number;
  askedCount: number;
};

export type CachedReflection = {
  reflectionText: string;
  generatedAt: Date;
  inputSignature: string;
  modelSlug: string;
};

export type RegenerateDecision = "none" | "use-cache" | "generate";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const READ_TRIGGER = 3;
const SAVED_TRIGGER = 1;
const ASKED_TRIGGER = 1;

/**
 * Input signature format: "<read>.<saved>.<asked>:<sha256-prefix>"
 * - Prefix preserves counts for delta comparison on read.
 * - Hash suffix protects against hand-edits and lets us version the format later.
 */
export function computeInputSignature(inputs: ReflectionInputs): string {
  const prefix = `${inputs.readCount}.${inputs.savedCount}.${inputs.askedCount}`;
  const hash = createHash("sha256").update(prefix).digest("hex").slice(0, 16);
  return `${prefix}:${hash}`;
}

function decodeSignature(sig: string): ReflectionInputs | null {
  const [prefix] = sig.split(":");
  const parts = prefix?.split(".") ?? [];
  if (parts.length !== 3) return null;
  const [r, s, a] = parts.map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(r) || !Number.isFinite(s) || !Number.isFinite(a)) return null;
  return { readCount: r, savedCount: s, askedCount: a };
}

export function shouldRegenerateReflection(args: {
  inputs: ReflectionInputs;
  cached: CachedReflection | null;
  now: Date;
}): RegenerateDecision {
  const { inputs, cached, now } = args;

  if (inputs.readCount === 0) return "none";
  if (!cached) return "generate";

  const cooldownElapsed =
    now.getTime() - cached.generatedAt.getTime() >= COOLDOWN_MS;

  const decoded = decodeSignature(cached.inputSignature);
  // If we can't decode, treat as a format change — regenerate if cooldown allows.
  if (!decoded) return cooldownElapsed ? "generate" : "use-cache";

  const readDelta = inputs.readCount - decoded.readCount;
  const savedDelta = inputs.savedCount - decoded.savedCount;
  const askedDelta = inputs.askedCount - decoded.askedCount;

  const triggersMet =
    readDelta >= READ_TRIGGER ||
    savedDelta >= SAVED_TRIGGER ||
    askedDelta >= ASKED_TRIGGER;

  if (!cooldownElapsed) return "use-cache";
  if (!triggersMet) return "use-cache";
  return "generate";
}
```

- **Step 5: Run tests to verify they pass**

Run: `npm test -- --test-name-pattern="computeInputSignature|shouldRegenerate"`
Expected: PASS (all 8 tests).

- **Step 6: Commit**

```bash
git add src/lib/analytics/profile-reflection.ts src/lib/analytics/profile-reflection.test.ts
git commit -m "feat(profile): reflection trigger + signature logic

Pure-function core that decides whether to regenerate a narrator
reflection based on cooldown (24h) and activity triggers (+3 reads,
+1 saved, +1 asked). Signature format embeds raw counts for delta
comparison on read. Fully unit-tested.

Part of DEVPLAN-IDEA-020."
```

---

## Task 3: Narrator Generation (Anthropic Call)

**Files:**

- Modify: `src/lib/analytics/profile-reflection.ts` (add `generateReflection` and persist helpers)
- Modify: `src/lib/analytics/profile-reflection.test.ts` (add tests for prompt shape — the model call itself is integration-tested)
- **Step 1: Add failing test for prompt shape**

Append to `src/lib/analytics/profile-reflection.test.ts`:

```ts
import { buildReflectionPrompt } from "@/lib/analytics/profile-reflection";

test("buildReflectionPrompt includes themes, principles, and saved passages", () => {
  const prompt = buildReflectionPrompt({
    reads: [
      { title: "A Towhead from the Red Clay Hills", themes: ["Identity"], principles: ["Small communities matter."] },
      { title: "A Very Busy Teenager", themes: ["Identity", "Gratitude"], principles: ["Adversity builds skills."] },
    ],
    savedPassages: [
      { storyTitle: "A Very Busy Teenager", text: "The four years of high school..." },
    ],
    askedQuestions: ["do you have any red clay left?"],
  });
  assert.match(prompt, /Identity/);
  assert.match(prompt, /Small communities matter\./);
  assert.match(prompt, /The four years of high school/);
  assert.match(prompt, /do you have any red clay left\?/);
});

test("buildReflectionPrompt caps saved passages to 20", () => {
  const savedPassages = Array.from({ length: 30 }, (_, i) => ({
    storyTitle: "Story " + i,
    text: "passage-marker-" + i,
  }));
  const prompt = buildReflectionPrompt({
    reads: [{ title: "x", themes: [], principles: [] }],
    savedPassages,
    askedQuestions: [],
  });
  // Last 20 are kept (most recent).
  assert.match(prompt, /passage-marker-29/);
  assert.match(prompt, /passage-marker-10/);
  assert.doesNotMatch(prompt, /passage-marker-9\b/);
});
```

- **Step 2: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern="buildReflectionPrompt"`
Expected: FAIL with "buildReflectionPrompt is not exported".

- **Step 3: Add prompt builder + generator to `profile-reflection.ts`**

Append to `src/lib/analytics/profile-reflection.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";

export const REFLECTION_MODEL = "claude-sonnet-4-20250514";
const REFLECTION_MAX_TOKENS = 160;
const REFLECTION_TIMEOUT_MS = 4000;

export type ReflectionCorpus = {
  reads: { title: string; themes: string[]; principles: string[] }[];
  savedPassages: { storyTitle: string; text: string }[];
  askedQuestions: string[];
};

const SYSTEM_PROMPT = `You are a warm, observant narrator writing a single reflective sentence (or two short sentences) about what a reader seems to be drawn to in Keith Cobb's memoir stories.

Rules:
- Voice: second person ("your reading keeps returning to…"). Never first person. Never quote Keith directly.
- Tone: observational and warm, not prescriptive. Never tell them what to do.
- Length: 25–45 words total. Plain prose only. No lists, no markdown, no emojis.
- Never invent facts. If the signal is thin, say something honest and small.
- Reference what they seem drawn to: themes, principles, or the character of the passages they've saved. You may allude to questions they've asked as signs of curiosity.
- Never include the user's name. Never use "Keith" as a subject — write about the reader, not about Keith.

Output: just the reflection text. No preamble, no quotes around it.`;

export function buildReflectionPrompt(corpus: ReflectionCorpus): string {
  const themeCounts = new Map<string, number>();
  const principleCounts = new Map<string, number>();
  for (const r of corpus.reads) {
    for (const t of r.themes) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
    for (const p of r.principles) principleCounts.set(p, (principleCounts.get(p) ?? 0) + 1);
  }

  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => `${name} (${count})`);

  const topPrinciples = [...principleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([text]) => `- ${text}`);

  const savedCapped = corpus.savedPassages.slice(-20);

  const lines: string[] = [];
  lines.push(`STORIES_READ: ${corpus.reads.length}`);
  lines.push(`TOP_THEMES: ${topThemes.join(", ") || "(none)"}`);
  lines.push(`TOP_PRINCIPLES:`);
  lines.push(topPrinciples.length ? topPrinciples.join("\n") : "(none)");
  lines.push(`SAVED_PASSAGES (${savedCapped.length}):`);
  if (savedCapped.length === 0) lines.push("(none)");
  for (const p of savedCapped) lines.push(`- from "${p.storyTitle}": ${p.text}`);
  lines.push(`QUESTIONS_ASKED:`);
  if (corpus.askedQuestions.length === 0) lines.push("(none)");
  for (const q of corpus.askedQuestions) lines.push(`- ${q}`);

  return lines.join("\n");
}

export async function generateReflection(
  corpus: ReflectionCorpus,
  anthropic: Anthropic
): Promise<{ text: string; modelSlug: string } | null> {
  const userPrompt = buildReflectionPrompt(corpus);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFLECTION_TIMEOUT_MS);

  try {
    const response = await anthropic.messages.create(
      {
        model: REFLECTION_MODEL,
        max_tokens: REFLECTION_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal }
    );

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const text = textBlocks.map((b) => b.text).join("").trim();
    if (!text) return null;
    return { text, modelSlug: REFLECTION_MODEL };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
```

- **Step 4: Run tests to verify they pass**

Run: `npm test -- --test-name-pattern="buildReflectionPrompt"`
Expected: PASS (2 new tests), plus all earlier tests still PASS.

- **Step 5: Commit**

```bash
git add src/lib/analytics/profile-reflection.ts src/lib/analytics/profile-reflection.test.ts
git commit -m "feat(profile): narrator reflection prompt + generator

Adds buildReflectionPrompt (pure, testable) and generateReflection
(Anthropic call with 4s timeout, safe-null on failure). Reuses the
existing Claude Sonnet 4 model. Caps saved-passage input at 20 most
recent to bound prompt size.

Part of DEVPLAN-IDEA-020."
```

---

## Task 4: Profile Gallery Data Assembler

**Files:**

- Create: `src/lib/analytics/profile-gallery-data.ts`
- **Step 1: Implement the assembler**

```ts
// src/lib/analytics/profile-gallery-data.ts
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { storiesData } from "@/lib/wiki/static-data";
import {
  computeInputSignature,
  generateReflection,
  shouldRegenerateReflection,
  type CachedReflection,
  type ReflectionCorpus,
} from "@/lib/analytics/profile-reflection";

export type GalleryDialogueItem = {
  id: string;
  question: string;
  answerText: string | null;
  askedAt: string;
  answered: boolean;
};

export type ProfileGalleryData = {
  readStats: {
    readCount: number;
    firstReadAt: string | null;
    mostRecentReadAt: string | null;
  };
  topThemes: { name: string; count: number }[];
  topPrinciples: { text: string; count: number }[];
  featuredPassage:
    | { id: string; text: string; storyId: string; storyTitle: string; savedAt: string }
    | null;
  savedPassageCount: number;
  favorites: {
    top: { storyId: string; storyTitle: string; favoritedAt: string }[];
    totalCount: number;
  };
  dialogue: {
    recent: GalleryDialogueItem[];
    askedCount: number;
    answeredCount: number;
  };
  reflection: { text: string; refreshedAt: string } | null;
};

type StoryMeta = { title: string; themes: string[]; principles: string[] };

function buildStaticStoryMap(): Map<string, StoryMeta> {
  return new Map(
    storiesData.map((s) => [
      s.storyId,
      { title: s.title, themes: s.themes, principles: s.principles },
    ])
  );
}

async function appendPublishedStoryMeta(map: Map<string, StoryMeta>): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sb_story_drafts")
      .select("story_id, title, themes, principles")
      .eq("status", "published")
      .not("story_id", "is", null);
    for (const s of data || []) {
      if (!s.story_id) continue;
      map.set(s.story_id, {
        title: s.title,
        themes: s.themes || [],
        principles: s.principles || [],
      });
    }
  } catch {
    // Static stories remain; published metadata is additive.
  }
}

function rankNamed(items: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function rankText(items: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

export async function getProfileGalleryData(
  userId: string
): Promise<ProfileGalleryData> {
  const supabase = await createClient();
  const storyMap = buildStaticStoryMap();
  await appendPublishedStoryMeta(storyMap);

  // Parallel fetch of all signal sources.
  const [
    readsRes,
    highlightsRes,
    highlightCountRes,
    favoritesRes,
    favoritesCountRes,
    questionsRes,
    cachedReflectionRes,
  ] = await Promise.all([
    supabase
      .from("sb_story_reads")
      .select("story_id, read_at")
      .eq("user_id", userId)
      .order("read_at", { ascending: false }),
    supabase
      .from("sb_story_highlights")
      .select("id, story_id, story_title, passage_text, saved_at")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false })
      .limit(1),
    supabase
      .from("sb_story_highlights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("sb_story_favorites")
      .select("story_id, story_title, favorited_at")
      .eq("user_id", userId)
      .order("favorited_at", { ascending: false })
      .limit(2),
    supabase
      .from("sb_story_favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("sb_chapter_questions")
      .select(
        "id, question, created_at, status, sb_chapter_answers(answer_text, visibility)"
      )
      .eq("asker_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sb_profile_reflections")
      .select("reflection_text, generated_at, input_signature, model_slug")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const reads = readsRes.data ?? [];
  const themeHits: string[] = [];
  const principleHits: string[] = [];
  for (const r of reads) {
    const s = storyMap.get(r.story_id);
    if (!s) continue;
    themeHits.push(...s.themes);
    principleHits.push(...s.principles);
  }

  const highlight = highlightsRes.data?.[0] ?? null;
  const highlightCount = highlightCountRes.count ?? 0;

  const favTop = (favoritesRes.data ?? []).map((f) => ({
    storyId: f.story_id,
    storyTitle: f.story_title,
    favoritedAt: f.favorited_at,
  }));
  const favTotal = favoritesCountRes.count ?? 0;

  const questionRows = questionsRes.data ?? [];
  const dialogueRecent: GalleryDialogueItem[] = questionRows
    .slice(0, 2)
    .map((q) => {
      const answers = Array.isArray(q.sb_chapter_answers)
        ? q.sb_chapter_answers
        : q.sb_chapter_answers
          ? [q.sb_chapter_answers]
          : [];
      const first = answers[0];
      return {
        id: q.id,
        question: q.question,
        answerText: first?.answer_text ?? null,
        askedAt: q.created_at,
        answered: q.status === "answered" && Boolean(first?.answer_text),
      };
    });
  const askedCount = questionRows.length; // approximate; see note below
  const answeredCount = questionRows.filter(
    (q) => q.status === "answered"
  ).length;

  // Reflection decision
  const cachedRow = cachedReflectionRes.data;
  const cached: CachedReflection | null = cachedRow
    ? {
        reflectionText: cachedRow.reflection_text,
        generatedAt: new Date(cachedRow.generated_at),
        inputSignature: cachedRow.input_signature,
        modelSlug: cachedRow.model_slug,
      }
    : null;

  const inputs = {
    readCount: reads.length,
    savedCount: highlightCount,
    askedCount: askedCount,
  };
  const decision = shouldRegenerateReflection({ inputs, cached, now: new Date() });

  let reflection: ProfileGalleryData["reflection"] = cached
    ? { text: cached.reflectionText, refreshedAt: cached.generatedAt.toISOString() }
    : null;

  if (decision === "generate") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      // Build corpus: include all reads (title + themes + principles), all saved passages, all questions.
      const { data: allHighlights } = await supabase
        .from("sb_story_highlights")
        .select("story_title, passage_text")
        .eq("user_id", userId)
        .order("saved_at", { ascending: true });
      const corpus: ReflectionCorpus = {
        reads: reads.map((r) => {
          const s = storyMap.get(r.story_id);
          return {
            title: s?.title ?? r.story_id,
            themes: s?.themes ?? [],
            principles: s?.principles ?? [],
          };
        }),
        savedPassages: (allHighlights ?? []).map((h) => ({
          storyTitle: h.story_title,
          text: h.passage_text,
        })),
        askedQuestions: questionRows.map((q) => q.question),
      };

      const anthropic = new Anthropic({ apiKey });
      const generated = await generateReflection(corpus, anthropic);
      if (generated) {
        const admin = createAdminClient();
        const signature = computeInputSignature(inputs);
        const now = new Date();
        await admin.from("sb_profile_reflections").upsert(
          {
            user_id: userId,
            reflection_text: generated.text,
            generated_at: now.toISOString(),
            input_signature: signature,
            model_slug: generated.modelSlug,
          },
          { onConflict: "user_id" }
        );
        reflection = { text: generated.text, refreshedAt: now.toISOString() };
      }
    }
  }

  if (decision === "none") reflection = null;

  return {
    readStats: {
      readCount: reads.length,
      firstReadAt: reads[reads.length - 1]?.read_at ?? null,
      mostRecentReadAt: reads[0]?.read_at ?? null,
    },
    topThemes: rankNamed(themeHits, 5),
    topPrinciples: rankText(principleHits, 3),
    featuredPassage: highlight
      ? {
          id: highlight.id,
          text: highlight.passage_text,
          storyId: highlight.story_id,
          storyTitle: highlight.story_title,
          savedAt: highlight.saved_at,
        }
      : null,
    savedPassageCount: highlightCount,
    favorites: { top: favTop, totalCount: favTotal },
    dialogue: {
      recent: dialogueRecent,
      askedCount,
      answeredCount,
    },
    reflection,
  };
}
```

**Note on `askedCount`:** The query limits to 10 for the dialogue preview. For an accurate total, swap the count fetch to a separate `head: true` count query (mirrors the favorites pattern). Add that as Step 2 below.

- **Step 2: Fix the askedCount to use an accurate head-count query**

Replace the `questionsRes` usage with two queries. Within `getProfileGalleryData`, split:

```ts
supabase
  .from("sb_chapter_questions")
  .select("id, question, created_at, status, sb_chapter_answers(answer_text, visibility)")
  .eq("asker_id", userId)
  .order("created_at", { ascending: false })
  .limit(10),
```

into the existing preview fetch PLUS a count fetch, and use the count for `askedCount` and a separate answered-count query for `answeredCount`:

```ts
supabase
  .from("sb_chapter_questions")
  .select("id", { count: "exact", head: true })
  .eq("asker_id", userId),
supabase
  .from("sb_chapter_questions")
  .select("id", { count: "exact", head: true })
  .eq("asker_id", userId)
  .eq("status", "answered"),
```

Adjust `Promise.all` destructuring and the return block so `askedCount = askedCountRes.count ?? 0` and `answeredCount = answeredCountRes.count ?? 0`. Leave the existing 10-row query for populating `dialogueRecent`.

- **Step 3: Commit**

```bash
git add src/lib/analytics/profile-gallery-data.ts
git commit -m "feat(profile): single-bundle data assembler for gallery page

getProfileGalleryData(userId) runs all signal queries in parallel,
decides whether to generate a fresh narrator reflection, persists it
to sb_profile_reflections when generated, and returns one bundle the
profile page can render without further I/O.

Part of DEVPLAN-IDEA-020."
```

---

## Task 5: Utility Icons Client Component

**Files:**

- Create: `src/components/profile/ProfileUtilityIcons.tsx`
- **Step 1: Implement**

```tsx
// src/components/profile/ProfileUtilityIcons.tsx
"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Props = {
  isAdmin: boolean;
};

const ICON_BTN =
  "inline-flex h-11 w-11 items-center justify-center rounded-full text-[rgba(240,232,213,0.55)] transition-colors duration-[var(--duration-normal)] hover:bg-[rgba(240,232,213,0.10)] hover:text-[#f0e8d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(240,232,213,0.6)]";

export function ProfileUtilityIcons({ isAdmin }: Props) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-1 md:right-6 md:top-6">
      <Link
        href="/welcome?replay=1"
        aria-label="Take the tour again"
        title="Take the tour again"
        className={ICON_BTN}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
            clipRule="evenodd"
          />
        </svg>
      </Link>

      {isAdmin && (
        <Link
          href="/profile/admin"
          aria-label="Admin"
          title="Admin"
          className={ICON_BTN}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sign out"
        title="Sign out"
        className={ICON_BTN}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
```

- **Step 2: Commit**

```bash
git add src/components/profile/ProfileUtilityIcons.tsx
git commit -m "feat(profile): subtle top-right utility icons

Tour, admin (conditional), sign-out as icon-only 44px buttons with
aria-labels and focus rings. Client component because sign-out calls
supabase.auth.signOut().

Part of DEVPLAN-IDEA-020."
```

---

## Task 6: Individual Tile Components

Each tile is small and standalone. They render in one task because they share a visual language and it's faster to review as a set. All tiles are pure Server Components (no client state) unless noted.

**Files:**

- Create: `src/components/profile/tiles/GhostTile.tsx`
- Create: `src/components/profile/tiles/FeaturedPassageTile.tsx`
- Create: `src/components/profile/tiles/WithKeithSinceTile.tsx`
- Create: `src/components/profile/tiles/PrinciplesTile.tsx`
- Create: `src/components/profile/tiles/DialogueTile.tsx`
- Create: `src/components/profile/tiles/ThemesTile.tsx`
- Create: `src/components/profile/tiles/KeepersTile.tsx`
- Create: `src/components/profile/tiles/KeithsPeopleTile.tsx`
- **Step 1: Create `GhostTile.tsx` (shared empty-state shell)**

```tsx
// src/components/profile/tiles/GhostTile.tsx
type Props = {
  label: string;
  body: string;
  className?: string;
};

export function GhostTile({ label, body, className = "" }: Props) {
  return (
    <div
      className={`rounded-[20px] border border-dashed border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.015)] p-5 ${className}`}
      aria-label={body}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.42)]">{label}</p>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-sm italic text-[rgba(240,232,213,0.5)]">
        {body}
      </p>
    </div>
  );
}
```

- **Step 2: Create `FeaturedPassageTile.tsx`**

```tsx
// src/components/profile/tiles/FeaturedPassageTile.tsx
import Link from "next/link";
import { GhostTile } from "./GhostTile";

type Props = {
  passage: {
    text: string;
    storyId: string;
    storyTitle: string;
    savedAt: string;
  } | null;
  totalCount: number;
  className?: string;
};

function formatSavedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FeaturedPassageTile({ passage, totalCount, className = "" }: Props) {
  if (!passage) {
    return (
      <GhostTile
        label="A passage you kept"
        body="The passages you save will appear here."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 md:p-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="type-era-label text-[rgba(240,232,213,0.58)]">
          A passage you kept
        </h3>
        <Link
          href="/profile/highlights"
          className="type-era-label text-[rgba(240,232,213,0.5)] hover:text-[#f0e8d5]"
        >
          {totalCount} saved →
        </Link>
      </div>
      <blockquote className="mt-4 border-l-2 border-[rgba(212,168,67,0.5)] pl-4 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-[#f0e8d5] md:text-lg">
        &ldquo;{passage.text}&rdquo;
      </blockquote>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-xs text-[rgba(240,232,213,0.5)]">
        From{" "}
        <Link
          href={`/stories/${passage.storyId}`}
          className="text-[#d4a843] hover:underline"
        >
          {passage.storyTitle}
        </Link>{" "}
        · saved {formatSavedAt(passage.savedAt)}
      </p>
    </section>
  );
}
```

- **Step 3: Create `WithKeithSinceTile.tsx`**

```tsx
// src/components/profile/tiles/WithKeithSinceTile.tsx
import { GhostTile } from "./GhostTile";

type Props = {
  firstReadAt: string | null;
  readCount: number;
  mostRecentReadAt: string | null;
  className?: string;
};

function formatMonthYear(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function WithKeithSinceTile({
  firstReadAt,
  readCount,
  mostRecentReadAt,
  className = "",
}: Props) {
  if (readCount === 0) {
    return (
      <GhostTile
        label="With Keith since"
        body="Start reading and this will fill in."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.58)]">With Keith since</p>
      <p className="mt-3 font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#f0e8d5]">
        {formatMonthYear(firstReadAt)}
      </p>
      <p className="mt-2 font-[family-name:var(--font-inter)] text-xs text-[rgba(240,232,213,0.62)]">
        {readCount} {readCount === 1 ? "story" : "stories"} · most recent{" "}
        {formatRelative(mostRecentReadAt)}
      </p>
    </section>
  );
}
```

- **Step 4: Create `PrinciplesTile.tsx`**

```tsx
// src/components/profile/tiles/PrinciplesTile.tsx
import { GhostTile } from "./GhostTile";

type Props = {
  principles: { text: string; count: number }[];
  className?: string;
};

export function PrinciplesTile({ principles, className = "" }: Props) {
  if (principles.length === 0) {
    return (
      <GhostTile
        label="Principles showing up"
        body="Ideas you encounter will collect here as you read."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.58)]">
        Principles showing up
      </p>
      <ul className="mt-4 space-y-3">
        {principles.map((p) => (
          <li
            key={p.text}
            className="font-[family-name:var(--font-lora)] text-sm italic leading-relaxed text-[rgba(240,232,213,0.92)]"
          >
            &ldquo;{p.text}&rdquo;
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- **Step 5: Create `DialogueTile.tsx`**

```tsx
// src/components/profile/tiles/DialogueTile.tsx
import Link from "next/link";
import { GhostTile } from "./GhostTile";
import type { GalleryDialogueItem } from "@/lib/analytics/profile-gallery-data";

type Props = {
  recent: GalleryDialogueItem[];
  askedCount: number;
  answeredCount: number;
  className?: string;
};

export function DialogueTile({
  recent,
  askedCount,
  answeredCount,
  className = "",
}: Props) {
  if (askedCount === 0) {
    return (
      <GhostTile
        label="Your dialogue with Keith"
        body="Questions you ask Keith will live here."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="type-era-label text-[rgba(240,232,213,0.58)]">
          Your dialogue with Keith
        </h3>
        <Link
          href="/profile/questions"
          className="type-era-label text-[rgba(240,232,213,0.5)] hover:text-[#f0e8d5]"
        >
          {askedCount} asked · {answeredCount} answered →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {recent.map((item) => (
          <li
            key={item.id}
            className="border-b border-[rgba(240,232,213,0.08)] pb-3 last:border-b-0 last:pb-0"
          >
            <p className="font-[family-name:var(--font-inter)] text-sm italic text-[rgba(240,232,213,0.92)]">
              &ldquo;{item.question}&rdquo;
            </p>
            <p className="mt-1 font-[family-name:var(--font-inter)] text-xs">
              {item.answered && item.answerText ? (
                <span className="text-[#d4a843]">
                  Keith: &ldquo;{item.answerText}&rdquo;
                </span>
              ) : (
                <span className="text-[rgba(240,232,213,0.5)]">
                  Waiting for Keith's answer…
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- **Step 6: Create `ThemesTile.tsx`**

```tsx
// src/components/profile/tiles/ThemesTile.tsx
import Link from "next/link";
import { GhostTile } from "./GhostTile";

type Props = {
  themes: { name: string; count: number }[];
  className?: string;
};

export function ThemesTile({ themes, className = "" }: Props) {
  if (themes.length === 0) {
    return (
      <GhostTile
        label="Themes you return to"
        body="Themes will start to emerge after you read a few stories."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <p className="type-era-label text-[rgba(240,232,213,0.58)]">
        Themes you return to
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {themes.map((t) => (
          <Link
            key={t.name}
            href={`/themes/${t.name.toLowerCase().replace(/\s+/g, "-")}`}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(122,179,201,0.28)] bg-[rgba(74,127,160,0.16)] px-3 py-1.5 font-[family-name:var(--font-inter)] text-sm font-medium text-[#e8f4f8] transition-colors hover:bg-[rgba(74,127,160,0.26)]"
          >
            <span>{t.name}</span>
            <span className="rounded-full bg-[rgba(240,232,213,0.12)] px-2 py-0.5 text-xs text-[#f0e8d5]">
              {t.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- **Step 7: Create `KeepersTile.tsx`**

```tsx
// src/components/profile/tiles/KeepersTile.tsx
import Link from "next/link";
import { GhostTile } from "./GhostTile";

type Props = {
  top: { storyId: string; storyTitle: string; favoritedAt: string }[];
  totalCount: number;
  className?: string;
};

function formatSavedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function KeepersTile({ top, totalCount, className = "" }: Props) {
  if (totalCount === 0) {
    return (
      <GhostTile
        label="Keepers"
        body="Stories you favorite will live here."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="type-era-label text-[rgba(240,232,213,0.58)]">Keepers</h3>
        <Link
          href="/profile/favorites"
          className="type-era-label text-[rgba(240,232,213,0.5)] hover:text-[#f0e8d5]"
        >
          {totalCount} →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {top.map((f) => (
          <li key={f.storyId}>
            <Link
              href={`/stories/${f.storyId}`}
              className="font-[family-name:var(--font-playfair)] text-base text-[#f0e8d5] hover:underline"
            >
              {f.storyTitle}
            </Link>
            <p className="mt-1 font-[family-name:var(--font-inter)] text-xs text-[rgba(240,232,213,0.5)]">
              Saved {formatSavedAt(f.favoritedAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- **Step 8: Create `KeithsPeopleTile.tsx`**

```tsx
// src/components/profile/tiles/KeithsPeopleTile.tsx
type Props = { className?: string };

export function KeithsPeopleTile({ className = "" }: Props) {
  return (
    <section
      className={`rounded-[20px] border border-dashed border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.015)] p-5 ${className}`}
      aria-label="Keith's people you've met — coming soon"
    >
      <p className="type-era-label text-[rgba(240,232,213,0.42)]">
        Keith's people you've met
      </p>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-sm italic text-[rgba(240,232,213,0.5)]">
        Coming once people pages ship.
      </p>
    </section>
  );
}
```

- **Step 9: Commit**

```bash
git add src/components/profile/tiles/
git commit -m "feat(profile): reflection gallery tile components

Seven tiles (plus shared GhostTile) covering featured passage, with-
Keith-since, principles, dialogue, themes, keepers, and the ghosted
future 'Keith's people' tile. Each tile handles its own empty state
via GhostTile.

Part of DEVPLAN-IDEA-020."
```

---

## Task 7: Reflection Hero + Gallery Shell

**Files:**

- Create: `src/components/profile/ProfileReflectionHero.tsx`
- Create: `src/components/profile/ProfileGallery.tsx`
- **Step 1: Implement `ProfileReflectionHero.tsx`**

```tsx
// src/components/profile/ProfileReflectionHero.tsx
import Link from "next/link";
import { ProfileUtilityIcons } from "./ProfileUtilityIcons";

type Props = {
  displayName: string;
  isAdmin: boolean;
  reflection: { text: string; refreshedAt: string } | null;
  hasAnyActivity: boolean;
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileReflectionHero({
  displayName,
  isAdmin,
  reflection,
  hasAnyActivity,
}: Props) {
  return (
    <section className="relative flex min-h-[70vh] flex-col justify-center overflow-hidden md:min-h-[78vh]">
      <div className="absolute inset-0 bg-[#2c1810]">
        <div
          className="absolute inset-0 bg-cover bg-[center_35%] bg-no-repeat opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(44,28,16,0.35), rgba(44,28,16,0.35)), url(/images/red-clay-road.jpg)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[rgba(44,28,16,0.92)] via-[rgba(44,28,16,0.5)] to-[rgba(44,28,16,0.2)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(165deg,#5c3d2e_0%,#8b4513_22%,#3d6b35_50%,#d4a843_82%,#f0e8d5_100%)] opacity-[0.82] mix-blend-multiply"
          aria-hidden
        />
      </div>

      <ProfileUtilityIcons isAdmin={isAdmin} />

      <div className="relative z-10 mx-auto max-w-wide px-[var(--page-padding-x)] pb-16 pt-20 text-center md:pb-20 md:pt-24">
        <p className="type-era-label mb-4 text-[rgba(240,232,213,0.65)]">
          Your corner of the storybook
        </p>
        <h1 className="mb-8 font-[family-name:var(--font-playfair)] text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.08] tracking-tight text-[#f0e8d5]">
          {displayName}
        </h1>

        {reflection ? (
          <>
            <p
              className="mx-auto max-w-[640px] font-[family-name:var(--font-lora)] text-[clamp(1.125rem,1.75vw,1.5rem)] font-normal italic leading-[1.55] text-[rgba(240,232,213,0.92)]"
            >
              {reflection.text}
            </p>
            <p className="mt-6 font-[family-name:var(--font-inter)] text-[11px] font-medium tracking-[0.18em] text-[rgba(240,232,213,0.42)] uppercase">
              Reflection refreshed {formatRelative(reflection.refreshedAt)}
            </p>
          </>
        ) : hasAnyActivity ? (
          <p className="mx-auto max-w-[640px] font-[family-name:var(--font-lora)] text-lg italic leading-[1.55] text-[rgba(240,232,213,0.75)]">
            Your portrait is quietly forming — a reflection will appear as your reading deepens.
          </p>
        ) : (
          <>
            <p className="mx-auto max-w-[560px] font-[family-name:var(--font-lora)] text-lg italic leading-[1.55] text-[rgba(240,232,213,0.85)]">
              Your portrait is just beginning.{" "}
              <Link href="/stories" className="text-[#f0e8d5] underline-offset-4 hover:underline">
                Start with a story.
              </Link>
            </p>
            <p className="mt-6 font-[family-name:var(--font-inter)] text-[11px] font-medium tracking-[0.18em] text-[rgba(240,232,213,0.42)] uppercase">
              Your reading trail starts here
            </p>
          </>
        )}
      </div>
    </section>
  );
}
```

- **Step 2: Implement `ProfileGallery.tsx`**

```tsx
// src/components/profile/ProfileGallery.tsx
import type { ProfileGalleryData } from "@/lib/analytics/profile-gallery-data";
import { FeaturedPassageTile } from "./tiles/FeaturedPassageTile";
import { WithKeithSinceTile } from "./tiles/WithKeithSinceTile";
import { PrinciplesTile } from "./tiles/PrinciplesTile";
import { DialogueTile } from "./tiles/DialogueTile";
import { ThemesTile } from "./tiles/ThemesTile";
import { KeepersTile } from "./tiles/KeepersTile";
import { KeithsPeopleTile } from "./tiles/KeithsPeopleTile";

type Props = { data: ProfileGalleryData };

export function ProfileGallery({ data }: Props) {
  return (
    <section className="relative border-t border-[rgba(240,232,213,0.12)] bg-[#241710] text-[#f0e8d5]">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,168,67,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-wide px-[var(--page-padding-x)] py-12 md:py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {/* Row 1 */}
          <FeaturedPassageTile
            passage={data.featuredPassage}
            totalCount={data.savedPassageCount}
            className="lg:col-span-4"
          />
          <WithKeithSinceTile
            firstReadAt={data.readStats.firstReadAt}
            readCount={data.readStats.readCount}
            mostRecentReadAt={data.readStats.mostRecentReadAt}
            className="lg:col-span-2"
          />
          {/* Row 2 */}
          <PrinciplesTile
            principles={data.topPrinciples}
            className="lg:col-span-3"
          />
          <DialogueTile
            recent={data.dialogue.recent}
            askedCount={data.dialogue.askedCount}
            answeredCount={data.dialogue.answeredCount}
            className="lg:col-span-3"
          />
          {/* Row 3 */}
          <ThemesTile themes={data.topThemes} className="lg:col-span-2" />
          <KeepersTile
            top={data.favorites.top}
            totalCount={data.favorites.totalCount}
            className="lg:col-span-2"
          />
          <KeithsPeopleTile className="lg:col-span-2" />
        </div>
      </div>
    </section>
  );
}
```

- **Step 3: Commit**

```bash
git add src/components/profile/ProfileReflectionHero.tsx src/components/profile/ProfileGallery.tsx
git commit -m "feat(profile): reflection hero + gallery shell

Hero puts the narrator reflection in the visual centerpiece with
three state variants (reflection / partial-activity placeholder /
fresh-user CTA). Gallery renders the 7 tiles in a responsive 6-col
grid (md: 2-col, lg: 6-col with spans per spec).

Part of DEVPLAN-IDEA-020."
```

---

## Task 8: Wire Up `/profile` Page

**Files:**

- Modify: `src/app/profile/page.tsx`
- **Step 1: Replace the non-Keith branch**

Replace the entire file content with:

```tsx
// src/app/profile/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfileGalleryData } from "@/lib/analytics/profile-gallery-data";
import { ProfileReflectionHero } from "@/components/profile/ProfileReflectionHero";
import { ProfileGallery } from "@/components/profile/ProfileGallery";
import { KeithProfileHero } from "@/components/profile/KeithProfileHero";
import { getKeithDashboardData } from "@/lib/analytics/keith-dashboard";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Keith Cobb Storybook profile.",
};

function resolveDisplayName(
  profileName: string | null | undefined,
  metaName: unknown,
  email: string | null | undefined
): string {
  const fromProfile = profileName?.trim();
  if (fromProfile) return fromProfile;
  const fromMeta =
    typeof metaName === "string" && metaName.trim() ? metaName.trim() : "";
  if (fromMeta) return fromMeta;
  const local = email?.split("@")[0]?.trim();
  if (local) return local;
  return "Family reader";
}

export default async function ProfilePage() {
  const { user, profile, isKeithSpecialAccess } =
    await getAuthenticatedProfileContext();

  if (!user) redirect("/login");

  const displayName = resolveDisplayName(
    profile?.display_name,
    user.user_metadata?.display_name,
    user.email
  );

  if (isKeithSpecialAccess) {
    const supabase = await createClient();
    const { count: pendingQuestionCount } = await supabase
      .from("sb_chapter_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const dashboard = await getKeithDashboardData();

    return (
      <KeithProfileHero
        displayName={displayName}
        email={user.email ?? ""}
        pendingQuestionCount={pendingQuestionCount ?? 0}
        dashboard={dashboard}
      />
    );
  }

  const data = await getProfileGalleryData(user.id);
  const hasAnyActivity =
    data.readStats.readCount > 0 ||
    data.savedPassageCount > 0 ||
    data.dialogue.askedCount > 0 ||
    data.favorites.totalCount > 0;

  return (
    <>
      <ProfileReflectionHero
        displayName={displayName}
        isAdmin={profile?.role === "admin"}
        reflection={data.reflection}
        hasAnyActivity={hasAnyActivity}
      />
      <ProfileGallery data={data} />
    </>
  );
}
```

- **Step 2: Run `npm run dev` and manually verify**

Run: `npm run dev`
Expected manual checks (browser, signed in as a non-Keith user):

1. `/profile` renders the new hero (narrator reflection or appropriate empty state) — no more old button row.
2. Top-right icons are visible, keyboard focusable, tooltips on hover.
3. Gallery grid below renders all 7 tiles with correct content.
4. Signing in as the Keith account still shows the unchanged `KeithProfileHero`.
5. Browser console shows no client errors; server terminal shows no unhandled errors.

- **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS with no new warnings in profile files.

- **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): switch non-Keith /profile to reflection gallery

Replaces ProfileHero/ProfileReadingDashboard render path with the new
ProfileReflectionHero + ProfileGallery driven by getProfileGalleryData.
Keith special-access path unchanged.

Part of DEVPLAN-IDEA-020."
```

---

## Task 9: Remove Deprecated Components

Only run this after Task 8 has been verified working.

**Files:**

- Delete: `src/components/profile/ProfileHero.tsx`
- Delete: `src/components/profile/ProfileReadingDashboard.tsx`
- Delete: `src/lib/analytics/profile-dashboard.ts` (superseded by `profile-gallery-data.ts`)
- **Step 1: Confirm no remaining imports of the deprecated files**

Run: `npx grep-like check using your search tool`. Expected: no imports of `ProfileHero`, `ProfileReadingDashboard`, or `profile-dashboard` from any remaining file. If any exist (other than the ones being deleted), fix them before deleting.

- **Step 2: Delete the files**

```bash
git rm src/components/profile/ProfileHero.tsx
git rm src/components/profile/ProfileReadingDashboard.tsx
git rm src/lib/analytics/profile-dashboard.ts
```

- **Step 3: Run build to confirm no broken references**

Run: `npm run build`
Expected: build succeeds with no "module not found" errors.

- **Step 4: Commit**

```bash
git commit -m "chore(profile): remove deprecated hero + dashboard components

ProfileHero, ProfileReadingDashboard, and profile-dashboard.ts are
superseded by the new reflection gallery. Keith-side components are
untouched.

Part of DEVPLAN-IDEA-020."
```

---

## Task 10: Update Backlog

**Files:**

- Modify: `docs/nightshift/BACKLOG.md`
- **Step 1: Append a shipped entry under Category 1**

Add a new entry following the same format as IDEA-001:

```markdown
### [IDEA-020] Profile as Reflection Gallery
- **Status:** shipped
- **Category:** enhance
- **Seeded:** 2026-04-18
- **Last Updated:** 2026-04-18
- **Priority:** P1
- **Spec:** `docs/nightshift/specs/2026-04-18-profile-reflection-gallery-design.md`
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-020-profile-reflection-gallery.md`
- **Summary:** Rework /profile (non-Keith users) into a reflective mirror: AI narrator reflection as hero, gallery of signal tiles (featured passage, principles, dialogue with Keith, themes, keepers, ghosted future people tile). Utility demoted to subtle top-right icons. Keith special-access profile untouched.
- **Night Notes:**
  - 2026-04-18: Spec + plan written and implemented end-to-end. New table sb_profile_reflections with 24h/+3-read/+1-saved trigger logic. Reuses Claude Sonnet 4 via existing Anthropic wiring.
```

- **Step 2: Commit**

```bash
git add docs/nightshift/BACKLOG.md
git commit -m "docs: mark IDEA-020 profile reflection gallery shipped"
```

---

## Self-Review

**1. Spec coverage:**

- §1 Purpose — realized in Tasks 7–8 (hero is narrator reflection, utility demoted)
- §2 Signals — all 3 anchors (reflection, principles, passages) + supporting signals rendered by Tasks 4 + 6–7
- §3 Voice — encoded in `SYSTEM_PROMPT` in Task 3
- §4.1 Hero — Task 7 `ProfileReflectionHero`
- §4.2 Gallery grid + tile order + column spans — Task 7 `ProfileGallery` matches the locked order
- §4.3 Utility footer removed / icons top-right — Task 5 + Task 7
- §5 Narrator generation/caching — Tasks 1–4 (table, signature, trigger, generator, assembler persists + graceful-degrades)
- §6 Featured passage = most recent — Task 4 query `order("saved_at", {ascending: false}).limit(1)`
- §7 Empty state — Task 6 ghost tiles + Task 7 hero empty-state branch + Task 8 `hasAnyActivity`
- §8 Components & Files — Task file list matches exactly; deletions in Task 9
- §9 Data flow — Task 4 single bundle + Task 8 page wiring
- §10 A11y — icon buttons have `aria-label`, focus rings; ghost tiles have `aria-label` on the container
- §11 Testing — Tasks 2 + 3 cover pure-function + prompt tests; integration verification is manual in Task 8 Step 2 (acceptable scope for this plan)
- §12 Out of scope — nothing in the plan implements deferred items
- §13 Success criteria — all manually checked in Task 8 Step 2

**2. Placeholder scan:** No TBDs, no "implement later", no "similar to Task N", no vague error handling — all code is complete. One honest note in Task 4: the "Note on askedCount" explains *why* Step 2 exists rather than glossing. Left in place.

**3. Type consistency:**

- `ReflectionInputs`, `CachedReflection`, `ReflectionCorpus`, `RegenerateDecision` — defined in Task 2/3, used by Task 4. Consistent.
- `ProfileGalleryData`, `GalleryDialogueItem` — defined and re-exported from `profile-gallery-data.ts` in Task 4; consumed by tiles in Task 6 and gallery in Task 7. `DialogueTile` imports `GalleryDialogueItem` — matches.
- Component props between `ProfileGallery` → each tile: `principles`, `top`, `totalCount`, `themes`, `recent`, `askedCount`, `answeredCount`, `passage`, `firstReadAt`, etc. All names match between passing and receiving.
- `buildReflectionPrompt` signature in Task 3 test vs implementation — `{reads, savedPassages, askedQuestions}`. Matches.
- `generateReflection(corpus, anthropic)` in Task 3 vs called in Task 4 — matches.

No inconsistencies found.

---

## Execution Handoff

Plan complete and saved to `docs/nightshift/plans/DEVPLAN-IDEA-020-profile-reflection-gallery.md`.