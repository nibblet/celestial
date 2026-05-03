# Dev Plan: [IDEA-043] On-Demand Scene Visualization via Ask ("Show Me")
**Theme:** genmedia

## What This Does

When a reader asks the in-world companion "Show me what the command dome looks like"
or "What does Valkyrie-1 look like during alignment?", the Ask API detects visual
intent, triggers the existing visuals pipeline (corpus-context → synthesize-prompt →
generate-asset), and streams back an inline image in the chat thread alongside the
normal text response. The reader gets both a verbal answer and a canon-grounded image
in one interaction.

The author-facing visuals pipeline is already fully built (`src/lib/visuals/`). This
feature extends it to reader-triggered on-demand generation.

## Theme-Specific Requirements (genmedia)

### 1. Model/Provider Choice
- **Images:** Imagen 4 via `src/lib/visuals/providers/imagen.ts` — already integrated
  and battle-tested by the author pipeline. Chosen for quality and Celestial-specific
  fine-tuning potential.
- **Video (future):** Runway Gen-4 via `src/lib/visuals/providers/runway.ts` — already
  integrated but out of scope for this phase. Seed separately.

### 2. Cost Budget & Rate Limiting
- **Cost per image:** ~$0.04–$0.08 (Imagen 4 standard).
- **Reader rate limit:** 3 images per reader per hour. Enforced via a new
  `checkImageRateLimit(userId, 3, 3_600_000)` call using the existing
  `src/lib/rate-limit.ts` factory. Unauthenticated users: no image generation
  (require sign-in; Ask already enforces auth).
- **Daily budget (app-wide):** No hard cap in Phase 1 — monitor via `cel_ai_interactions`
  (all Anthropic calls logged; add a separate log entry for image calls). Re-evaluate
  after launch.

### 3. Caching Strategy
- **Key:** `seedHashFor(target, style, corpusVersion)` from `src/lib/visuals/hash.ts`
  + `corpus-version.ts` — deterministic, same key for same entity × style × corpus.
- **Shared cache (not user-scoped):** Canon visuals are not personalised. If two readers
  ask "show me command-dome", they receive the same generated image. Cached in Supabase
  `cel_visual_assets` table (existing schema). No invalidation unless corpus changes
  (corpusVersion covers this).
- **Lookup before generation:** Before calling Imagen 4, check `cel_visual_assets` for
  an approved asset with matching `seed_hash`. If found, return the stored URL. Cost is
  $0.00 for cache hits.

### 4. Spoiler Gating of Prompt Inputs
- With companion-first defaults (`getReaderProgress()` returns max chapter for all users),
  all entities and story content are accessible to all authenticated users. No additional
  gating is needed beyond what the existing `corpus-context.ts` already applies.
- The visual prompt synthesiser does NOT include narrative text — it builds a pure visual
  description from entity spec JSON + canon dossier + foundational lore. No spoiler risk
  from the generated image content itself.
- Guard: Pass `readerProgress` to `buildCorpusContext()` regardless; if future product
  direction re-enables chapter gating, the gate is already in the call chain.

### 5. Canon Grounding
- **Source:** `src/lib/visuals/corpus-context.ts` selects wiki entity spec from
  `content/wiki/specs/{slug}/` + canon dossier blocks + foundational lore.
- **Style preset auto-selection** (new logic in handler):
  - Entity kind `character` → `intimate_crew` or `noncorporeal_presence` (check
    `content/wiki/characters/` lore for biological vs non-corporeal)
  - Entity kind `location` with parent spec `valkyrie-1` → `valkyrie_shipboard`
  - Entity kind `vault` → `vault_threshold`
  - Entities tagged `earth_2050` world → `earth_institutional` or `mars_excavation`
  - Entity kind `faction` → `mythic_scale`
  - Default: `intimate_crew`
- **Spec inheritance chain:** `composeEntitySpec()` in `src/lib/visuals/specs/loader.ts`
  already handles parent_entity inheritance — Valkyrie-1 interior locations
  automatically inherit WORLD A alien_organic vocabulary.

---

## User Stories

- As a first-time reader after finishing CH03: I ask "Show me what the Valkyrie-1 looks
  like" and within a few seconds I see a canon-grounded exterior render appear in the chat
  alongside the companion's verbal description.
- As a re-reader (show_all_content on): I ask "Show me the ship during harmonic jump" and
  get the `harmonic_jump` state render, grounded in spec `content/wiki/specs/valkyrie-1/states/harmonic_jump.json`.
- As the author: I test visual generation directly from the Ask interface, bypassing the
  admin console for quick iteration.

---

## Implementation

### Phase 1: Visual Intent Detection
**File:** `src/lib/ai/ask-intent.ts`
**Estimated:** 30 min

1. Add `"visual_request"` to the `AskIntentKind` union type (line 1):
   ```typescript
   export type AskIntentKind =
     | "factual"
     | "thematic"
     | "character_arc"
     | "world_rule"
     | "future_speculation"
     | "visual_request"   // NEW
     | "unknown_gap";
   ```

2. Add visual patterns constant above `FACTUAL_PATTERNS`:
   ```typescript
   const VISUAL_PATTERNS = [
     /\bshow me\b/i,
     /\bwhat does .* look like\b/i,
     /\billustrate\b/i,
     /\bvisuali[sz]e\b/i,
     /\bpicture of\b/i,
     /\bimage of\b/i,
     /\bdraw\b/i,
     /\brender\b/i,
   ];
   ```

3. Add a new export helper:
   ```typescript
   export function isVisualRequest(message: string): boolean {
     return hasAny(VISUAL_PATTERNS, message.toLowerCase());
   }
   ```

4. In `classifyAskIntent()`, add before the FUTURE_PATTERNS check:
   ```typescript
   if (hasAny(VISUAL_PATTERNS, lower)) {
     return {
       kind: "visual_request",
       confidence: 0.88,
       reason: "asks to see or visualize an entity or scene",
     };
   }
   ```

5. **Checkpoint:** `npm test` — `ask-intent.test.ts` still passes; add 2 new test cases
   for `visual_request` kind.

---

### Phase 2: Visual Ask Handler Module
**New file:** `src/lib/ai/ask-visual-handler.ts`
**Estimated:** 2 hours

```typescript
import { buildCorpusContext } from "@/lib/visuals/corpus-context";
import { synthesizeVisualPrompt } from "@/lib/visuals/synthesize-prompt";
import { generateAndStoreAsset } from "@/lib/visuals/generate-asset";
import { getApprovedAssetBySeedHash } from "@/lib/visuals/list-entity-assets";
import { seedHashFor } from "@/lib/visuals/hash";
import { getCorpusVersion } from "@/lib/visuals/corpus-version";
import type { StylePresetKey } from "@/lib/visuals/style-presets";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { getAllWikiEntities } from "@/lib/wiki/corpus";   // or static-data.ts

export type VisualAskResult = {
  imageUrl: string;
  altText: string;
  entitySlug: string;
  fromCache: boolean;
};

/**
 * Extracts the most likely target entity slug from a visual request message.
 * Uses simple substring matching against the full entity slug list.
 */
function extractTargetSlug(message: string): string | null {
  const entities = getAllWikiEntities();   // returns list of {slug, title, kind}
  const lower = message.toLowerCase();
  // longest-first match to prefer "command-dome" over "dome"
  const sorted = [...entities].sort((a, b) => b.title.length - a.title.length);
  for (const entity of sorted) {
    if (lower.includes(entity.title.toLowerCase()) || lower.includes(entity.slug)) {
      return entity.slug;
    }
  }
  return null;
}

function autoSelectPreset(slug: string, kind: string): StylePresetKey {
  if (kind === "character") return "intimate_crew";
  if (kind === "vault" || slug.startsWith("vault-")) return "vault_threshold";
  if (kind === "location") {
    // Valkyrie interior locations have parent_entity = "valkyrie-1"
    // Check if spec has parent_entity — default to valkyrie_shipboard for ship interiors
    return "valkyrie_shipboard";
  }
  if (kind === "faction") return "mythic_scale";
  return "intimate_crew";
}

export async function generateVisualForAsk(
  message: string,
  readerProgress: ReaderProgress | null,
): Promise<VisualAskResult | null> {
  const slug = extractTargetSlug(message);
  if (!slug) return null;

  const entities = getAllWikiEntities();
  const entity = entities.find((e) => e.slug === slug);
  if (!entity) return null;

  const style = autoSelectPreset(slug, entity.kind);
  const corpusVersion = getCorpusVersion();
  const hash = seedHashFor(slug, style, corpusVersion);

  // Cache check — reuse existing approved asset if available
  const cached = await getApprovedAssetBySeedHash(hash);
  if (cached?.url) {
    return {
      imageUrl: cached.url,
      altText: `${entity.title} — canon visual`,
      entitySlug: slug,
      fromCache: true,
    };
  }

  // Build corpus context and synthesize prompt
  const ctx = await buildCorpusContext({ target: slug, readerProgress });
  const visualPrompt = await synthesizeVisualPrompt(ctx, { style });
  if (!visualPrompt) return null;

  // Generate and store
  const asset = await generateAndStoreAsset(visualPrompt, {
    target: slug,
    style,
    seedHash: hash,
    source: "reader_ask",
  });
  if (!asset?.url) return null;

  return {
    imageUrl: asset.url,
    altText: `${entity.title} — canon visual`,
    entitySlug: slug,
    fromCache: false,
  };
}
```

**Checkpoint:** Module compiles. Can be tested by calling directly from a test script.

---

### Phase 3: Ask API Integration
**File:** `src/app/api/ask/route.ts`
**Estimated:** 1 hour

1. Add import at top of file:
   ```typescript
   import { isVisualRequest, generateVisualForAsk } from "@/lib/ai/ask-visual-handler";
   import { checkRateLimit } from "@/lib/rate-limit";
   ```

2. After the standard rate-limit check (line ~47), add an image-specific rate limit:
   ```typescript
   if (isVisualRequest(message)) {
     const imageRateLimit = checkRateLimit(`${user.id}:images`, 3, 3_600_000);
     if (!imageRateLimit.allowed) {
       return Response.json(
         { error: "Image generation limit reached. You can generate up to 3 images per hour." },
         { status: 429, headers: { "Retry-After": String(Math.ceil(imageRateLimit.retryAfterMs / 1000)) } }
       );
     }
   }
   ```

3. Before the readable stream construction (after `orchestrateAsk` call, line ~172),
   kick off image generation in parallel (non-blocking):
   ```typescript
   let visualResultPromise: Promise<VisualAskResult | null> | null = null;
   if (isVisualRequest(message)) {
     visualResultPromise = generateVisualForAsk(message, readerProgress).catch(() => null);
   }
   ```

4. In the `done: true` event payload, await and include image result:
   ```typescript
   const visualResult = visualResultPromise ? await visualResultPromise : null;
   
   controller.enqueue(
     encoder.encode(
       `data: ${JSON.stringify({
         done: true,
         conversationId: convId,
         evidence,
         ...(visualResult ? { imageUrl: visualResult.imageUrl, imageAlt: visualResult.altText } : {}),
         ...(verification.shouldBlock ? { replacementContent: ASK_VERIFICATION_FALLBACK_MESSAGE } : {}),
       })}\n\n`
     )
   );
   ```

**Checkpoint:** Visual requests return both text stream + imageUrl in done event. Non-visual requests unchanged.

---

### Phase 4: Client Rendering
**File:** `src/app/ask/page.tsx`
**Estimated:** 1 hour

1. Extend `Message` interface (line 58):
   ```typescript
   interface Message {
     role: "user" | "assistant";
     content: string;
     id?: string;
     evidence?: AskMessageEvidence | null;
     imageUrl?: string;    // NEW
     imageAlt?: string;    // NEW
   }
   ```

2. In the SSE `done` handler, parse imageUrl:
   ```typescript
   if (cd.imageUrl && typeof cd.imageUrl === "string") {
     setMessages((prev) =>
       prev.map((m) =>
         m === lastAssistant
           ? { ...m, imageUrl: cd.imageUrl, imageAlt: cd.imageAlt ?? "" }
           : m
       )
     );
   }
   ```

3. In the message bubble render, after the markdown content and before
   `AskSourcesDisclosure`, add image card:
   ```tsx
   {msg.imageUrl && (
     <div className="mt-3 overflow-hidden rounded-lg border border-[var(--color-border)]">
       <img
         src={msg.imageUrl}
         alt={msg.imageAlt ?? "Canon visual"}
         className="w-full max-w-md object-cover"
         loading="lazy"
       />
     </div>
   )}
   ```
   Note: Use `<img>` (not `next/image`) to match existing gallery pattern. This will
   produce the existing `@next/next/no-img-element` lint warning — acceptable per prior
   runs (same pattern as `EntityVisualsGallery.tsx`).

**Checkpoint:** Ask a visual question → text streams normally → after stream ends, image
card appears below the answer bubble.

---

### Phase 5: DB — Store Source Field (optional but recommended)
**Migration:** `supabase/migrations/040_visual_assets_source_field.sql`

Add a `source` column to `cel_visual_assets` to distinguish author-generated vs
reader-triggered assets, for analytics and rate-limit auditing:
```sql
ALTER TABLE cel_visual_assets
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'author_console'
  CHECK (source IN ('author_console', 'reader_ask'));
```

This also closes FIX-026's migration number reservation (040 was earmarked for the keith
RLS fix — if FIX-026 ships first, increment this to 041).

---

## Content Considerations

- No new wiki markdown needed.
- `content/wiki/specs/` already has 17 entity specs. Entities without a spec will get
  a corpus-context-only prompt (no `# Visual Spec — CANON OVERRIDE` block) — still
  valid, just less specific.
- Adding more entity specs improves image quality but is not a blocker.

## Spoiler & Gating Impact

- **No new spoiler surface.** The visual prompt synthesiser produces visual descriptions
  from entity specs and dossier blocks, not narrative prose. No story plot is included
  in image prompts.
- **Companion-first:** All content visible to all authenticated users. The `readerProgress`
  param is threaded through `buildCorpusContext()` for future gating compatibility.
- **Locked-reader path (if gating re-enabled):** `corpus-context.ts` already respects
  `readerProgress` when selecting which chapter-tagged entities to include. The visual
  handler should pass the same `readerProgress` from the Ask route.
- **Guest / unauthenticated:** Ask already returns 401 for unauthenticated users; no
  images generated.

## Testing

- [ ] `npx next build` — build passes
- [ ] `npm run lint` — 0 errors (4 existing `<img>` warnings becomes 5; acceptable)
- [ ] `npm test` — 192+ pass; add tests:
  - `ask-intent.test.ts`: `classifyAskIntent("show me the command dome")` → `visual_request`
  - `ask-intent.test.ts`: `isVisualRequest("what does alara look like")` → `true`
  - `ask-intent.test.ts`: `isVisualRequest("who is alara")` → `false`
- [ ] Locked-reader path: non-authenticated Ask → 401, no image generated
- [ ] Visual request path: "Show me the Valkyrie-1" → text response + image URL in
  `done` event → image card renders in UI
- [ ] Cache hit: second request for same entity → `fromCache: true`, no Imagen call
- [ ] Rate limit: 4th image request within 1 hour → 429 response
- [ ] Non-visual request: "Who is ALARA?" → no image generated, existing behavior intact
- [ ] Unknown entity: "Show me a banana" → `generateVisualForAsk` returns null → no
  image in response, no error

## Dependencies

- No new packages needed
- `src/lib/visuals/` pipeline already complete
- `src/lib/rate-limit.ts` already handles arbitrary key strings
- Migration 040: coordinate with FIX-026 (also targeting migration 040) — one must be 041

## Estimated Total: 5 hours

Phase 1 (30 min) + Phase 2 (2 hr) + Phase 3 (1 hr) + Phase 4 (1 hr) + Phase 5 (30 min)
