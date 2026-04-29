# Visuals Integration — Phased Plan

**Status:** proposed
**Created:** 2026-04-28
**Owner:** Paul

## Goal

Integrate the corpus-grounded visuals pipeline into the user-facing app. Ask is the primary surface; visuals appear inline when relevant. A global gallery and wiki entity pages anchor discovery. User contributions feed a tiered corpus (Book → Canon → Generated canon → Community) with admin-gated promotion.

## Decisions (already made)

- **Primary surface:** Ask (inline visuals when intent warrants).
- **Secondary surface:** thin global gallery; wiki entity pages embed canonical visuals.
- **Generation strategy:** hybrid — pre-gen anchors for top entities, on-demand for the long tail.
- **Source tiers:** Book corpus → Canon → Generated canon → Community. Both canon tiers gated by admin approval; community auto-publishes with attribution.
- **Conflict resolution:** (d) canon-blessed wins → (a) variants allowed under same entity → (c) usage signals tie-break.
- **User contributions feed the shared corpus**, not user-scoped silos.
- **Gating:** on-demand generation eventually rate/token-gated. Build hook now, set real limits later.

## What already exists (don't rebuild)

- Visuals pipeline: `synthesize-prompt.ts`, `corpus-context.ts`, `generate-asset.ts`, `extract-vision.ts`, `continuity.ts`, layered specs loader, Imagen + Runway providers.
- Storage: `cel_visual_prompts`, `cel_visual_assets` (with `approved` flag and vision fingerprint).
- Entity galleries: `listEntityVisuals()` + `EntityVisualsGallery` already wired into character/artifact/location/faction/vault pages.
- Admin console: `VisualsAdminConsole` + `/api/visuals/approve`.
- Roles: `author` and `admin` roles with route guards.
- Source-tier seed: `CANON_SOURCE_RANK` constant + `compareCanonAuthority()` (3-tier; we'll extend).
- Rate limiter: in-memory sliding window (we'll persist for token gating).

---

## Phase 0 — Anchor seeding

**Duration:** 1–2 days
**Goal:** populate canonical visuals for top-N entities so Phase 1 has something real to surface.
**Code changes:** none. Spec authoring + admin-console runs only.

### Recommended anchor entities

Aim for ~25 anchors. Group by type, prioritize narrative weight.

**Characters — leads (Tier A):**
- `alara` — sentient Valkyrie-1 AI (co-protagonist; needs an embodied/representational form)
- POV characters from `entities.json` Tier A (confirm during seeding; likely includes `thane-meric`, `jax-reyes`, `lena-osei`)

**Characters — principals (Tier B):**
- `rhea-solari` — Captain, Rigel Ascendant
- `sovrin` — moral adjudication engine, Rigel Ascendant
- `caeden` — Earth oversight AI on Valkyrie-1
- 2–3 more recurring crew from `entities.json`

**Ships & artifacts:**
- `valkyrie-1` — ✅ already has full layered specs; ensure approved hero render exists
- `rigel-ascendant` — counterpart vessel
- `harmonic-drive`
- `resonant-core`
- `triple-helix-symbol` — emblem, useful as visual motif

**Locations — iconic interiors (Valkyrie-1):**
- `command-dome`, `observation-deck`, `sensorium`, `triad-chamber`

**Locations — exteriors / planetary:**
- `great-pyramid` / `giza-plateau` (Earth-side, ancient context)
- `europa` (mission destination)
- `subsurface-vault` + `vault-interface-annex` (vault interior)

**Factions (emblems/insignia only at this phase):**
- `project-valkyrie`
- `council-of-orbits`
- `the-ancients`

### Recommended shot types per kind

Each anchor should produce **one approved hero asset** plus optionally one alternate. Standardizing shot types makes continuity tractable and gallery layouts predictable.

| Kind | Hero shot | Alternate (optional) | Purpose |
|------|-----------|---------------------|---------|
| **Character** | Portrait, head-and-shoulders, eye-level, neutral background — *identity anchor* (highest priority for vision-fingerprint capture) | Full-body in habitual environment | Identity reference for all future generations |
| **AI / non-corporeal** | Symbolic representation (interface, voice-form, or implied presence) — establish a visual grammar | In-context (e.g., Alara's presence on the bridge) | Avoid forcing literal embodiment where lore disagrees |
| **Ship** | 3/4 exterior hero, scale-neutral background | Interior signature space | Already proven on `valkyrie-1` |
| **Artifact** | Object-centered, museum-lighting hero | In-use / in-context | Recognizable across scales |
| **Location (interior)** | Establishing wide from primary entry POV | Signature detail (a console, a window, a fixture) | Sets mood and architecture |
| **Location (exterior/planet)** | Establishing wide, characteristic light | Surface detail or atmospheric | Long-tail variants on demand |
| **Faction** | Emblem / insignia on neutral field | Representative tableau (later, not Phase 0) | Cheap, instantly recognizable |
| **Symbol/motif** | Clean glyph/icon | Stylized variant | Reusable across other compositions |

### Style preset by kind (defaults)

- Characters, AIs → `cinematic_canon` (matches book voice; portrait-friendly)
- Ships, artifacts → `cinematic_canon` for hero, `mythic_wide` for scale shots
- Ancient/Earth-side locations → `painterly_lore`
- Vault/Ancients material → `mythic_wide`
- Intimate interior scenes → `noir_intimate`

### Form inputs per anchor (VisualsAdminConsole)

Form fields: **Target Kind, Target ID, Focus, Style Preset, Aspect, Intent, View, State, Seed.**
Leave View / State blank unless the entity has layered specs in `content/wiki/specs/<id>/`. Seed blank on hero pass; reuse the chosen seed on follow-up variants to lock identity.

#### Characters — leads & principals (Tier A/B)

Hero (identity anchor). Generate this FIRST per character; vision-extracted fingerprint becomes the continuity reference for all later shots.

| Target ID | Kind | Focus | Preset | Aspect | Intent |
|---|---|---|---|---|---|
| `alara` | entity | symbolic interface presence — luminous instrumentation pattern, no literal embodiment | cinematic_canon | 4:5 | scene_moment |
| `rhea-solari` | entity | head-and-shoulders portrait, command-deck ambient light, neutral background | cinematic_canon | 4:5 | portrait |
| `sovrin` | entity | symbolic representation — adjudication-engine console glyph, restrained palette | noir_intimate | 1:1 | scene_moment |
| `caeden` | entity | symbolic — Earth-oversight signal motif, cool palette | cinematic_canon | 1:1 | scene_moment |
| `thane-meric` | entity | head-and-shoulders portrait, eye-level, neutral background | cinematic_canon | 4:5 | portrait |
| `jax-reyes` | entity | head-and-shoulders portrait, eye-level, neutral background | cinematic_canon | 4:5 | portrait |
| `lena-osei` | entity | head-and-shoulders portrait, eye-level, neutral background | cinematic_canon | 4:5 | portrait |
| `marco-ruiz` | entity | head-and-shoulders portrait, eye-level, neutral background | cinematic_canon | 4:5 | portrait |
| `evelyn-tran` | entity | head-and-shoulders portrait, eye-level, neutral background | cinematic_canon | 4:5 | portrait |
| `galen-voss` | entity | head-and-shoulders portrait, eye-level, neutral background | cinematic_canon | 4:5 | portrait |
| `aven-voss` | entity | head-and-shoulders portrait, eye-level, neutral background | cinematic_canon | 4:5 | portrait |

Optional alternate per character (after hero approved, reuse seed):

| Focus | Preset | Aspect | Intent |
|---|---|---|---|
| full-body in habitual environment (bridge / lab / quarters per dossier) | cinematic_canon | 3:2 | scene_moment |

#### Ships

| Target ID | Focus | Preset | Aspect | Intent | View |
|---|---|---|---|---|---|
| `valkyrie-1` (verify hero) | exterior 3/4 view, deep space backdrop, scale-neutral | cinematic_canon | 16:9 | establishing_shot | three_quarter |
| `valkyrie-1` (alt) | orthogonal hull profile, technical-document feel | cinematic_canon | 16:9 | establishing_shot | orthogonal |
| `rigel-ascendant` | exterior 3/4 view, contrasting silhouette to Valkyrie-1, deep space | cinematic_canon | 16:9 | establishing_shot | _(blank — no specs yet; author after hero)_ |

> **Note:** `rigel-ascendant` should get layered specs authored *before* generation (mirror `valkyrie-1` structure). Otherwise expect the same Valkyrie-style "generate-elsewhere-then-extract" loop.

#### Artifacts

| Target ID | Focus | Preset | Aspect | Intent |
|---|---|---|---|---|
| `harmonic-drive` | object-centered hero, museum lighting, neutral surround, materials legible | cinematic_canon | 1:1 | portrait |
| `resonant-core` | object-centered hero, museum lighting, soft inner glow if canon allows | cinematic_canon | 1:1 | portrait |
| `triple-helix-symbol` | clean glyph on neutral field, no environmental context | cinematic_canon | 1:1 | portrait |
| `rigel-ascendant` artifact-of-state items | _(skip in Phase 0; pull on demand)_ | — | — | — |

Optional alternate (in-context):

| Target ID | Focus | Preset | Aspect | Intent |
|---|---|---|---|---|
| `harmonic-drive` | installed in Valkyrie systems-nexus, ambient operational light | cinematic_canon | 16:9 | scene_moment |
| `resonant-core` | active state in resonant-pad, controlled tension | noir_intimate | 4:5 | scene_moment |

#### Locations — Valkyrie-1 interiors

| Target ID | Focus | Preset | Aspect | Intent |
|---|---|---|---|---|
| `command-dome` | establishing wide from primary entry POV, working light | cinematic_canon | 16:9 | establishing_shot |
| `observation-deck` | wide toward the viewport, deep-space exterior visible | cinematic_canon | 16:9 | establishing_shot |
| `sensorium` | establishing wide, interface light dominates | noir_intimate | 16:9 | establishing_shot |
| `triad-chamber` | establishing wide, ceremonial geometry foregrounded | cinematic_canon | 16:9 | establishing_shot |

#### Locations — Earth / planetary / vault

| Target ID | Focus | Preset | Aspect | Intent |
|---|---|---|---|---|
| `great-pyramid` | establishing wide, golden-hour, scale-establishing foreground figure | painterly_lore | 16:9 | establishing_shot |
| `giza-plateau` | wide vista, atmospheric haze | painterly_lore | 16:9 | establishing_shot |
| `europa` | surface establishing, characteristic ice light | mythic_wide | 16:9 | establishing_shot |
| `subsurface-vault` | deep interior establishing, dramatic key light | mythic_wide | 16:9 | establishing_shot |
| `vault-interface-annex` | establishing wide, interface-detail in mid-ground | mythic_wide | 16:9 | establishing_shot |

#### Factions (emblems only in Phase 0)

| Target ID | Focus | Preset | Aspect | Intent |
|---|---|---|---|---|
| `project-valkyrie` | emblem / insignia, neutral field, official-document feel | cinematic_canon | 1:1 | portrait |
| `council-of-orbits` | emblem / insignia, neutral field, formal | cinematic_canon | 1:1 | portrait |
| `the-ancients` | symbolic motif, weathered / archaeological texture | painterly_lore | 1:1 | portrait |

> Faction tableaux (representative scenes) deferred to post-Phase 0.

### Phase 0 workflow

1. For each anchor entity, confirm wiki page exists and has enough corpus context for `corpus-context.ts` to ground a prompt. Stub missing dossiers minimally if needed.
2. Author layered visual specs (master + features + state) where missing — use `valkyrie-1` specs as the template.
3. Run `VisualsAdminConsole` → synthesize prompt → generate → review → approve.
4. Verify vision fingerprint extraction populated `vision_description` on each approved asset.
5. Spot-check a re-roll inherits identity correctly (continuity check).

### Exit criteria

- Every anchor entity has ≥ 1 `approved = true` asset.
- Every character anchor has a vision fingerprint extracted.
- Hero asset for each entity is the first item returned by `listEntityVisuals()`.

---

## Phase 1 — Visuals on Ask + global gallery

**Duration:** ~1 week
**Goal:** make visuals discoverable. Ask shows inline; gallery is browseable.

### Scope

**Ask integration**
- In `src/app/api/ask/route.ts`, after retrieval scores finalize, call `listEntityVisuals(slug)` for top 1–3 ranked entities.
- Attach visuals as a structured block on the streamed response; render inline beneath relevant section in `src/app/ask/page.tsx`.
- **Visual-relevance gate:** only attach when (a) intent ∈ {`factual`, `world_rule`, `character_arc`}, OR (b) question contains visual triggers (regex on "look like", "show me", "image of", "appearance", "what does", "picture"). Skip on `future_speculation` and `open_thread`.

**Global gallery**
- New route `/gallery`. Server component, no new schema.
- Paginated grid over `cel_visual_assets` where `approved = true`, grouped by `(target_kind, target_id)`.
- Click-through to entity page. Filter chips by kind (characters, ships, locations, factions).

**Wiki canonical embed**
- `EntityVisualsGallery` gets a `hero` mode that pins the first approved asset above the gallery row.

### Out of scope

- On-demand generation UI (Phase 2).
- Tier labeling beyond "approved/not" (Phase 3).
- Variant grouping beyond default sort (Phase 3).

### Exit criteria

- Asking "what does Rhea look like?" returns answer + Rhea's hero portrait inline.
- `/gallery` lists all Phase 0 anchors, navigable to entity pages.
- Each entity page shows hero asset prominently.

---

## Phase 2 — On-demand generation + gating skeleton

**Duration:** ~1–1.5 weeks
**Goal:** users request generation; gating instrumented even if limits start permissive.

### Scope

**Schema**
- New table `cel_generation_ledger`: `id, user_id, kind, est_tokens, actual_tokens, source_anchor_id, asset_id (nullable), created_at`.

**Endpoint**
- New `/api/visuals/generate` POST endpoint. Auth-gated, accepts `(target_kind, target_id, parent_anchor_id, prompt_extras?, style_preset?)`.
- `canGenerate(userId, kind)` hook at request boundary. Initial limits: free tier = 5 on-demand/day; anchors and cache hits don't count. Always log estimated cost regardless of allow/deny.

**Cache layer (cost lever)**
- Before generation, hash `(target, intent, style_preset, prompt_extras)` and check `cel_visual_assets` for a recent matching approved asset. Return cached match if found.

**UI**
- "Generate variant" button on entity-page galleries and inline-Ask gallery (when authed).
- New variants attach `parent_anchor_id` so vision continuity inherits identity from the canonical asset.
- Default surface rule on entity pages: anchor + 3 most recent variants; "see all" expands.

**Persistence migration**
- Move visual-gen rate limit from in-memory limiter to the new ledger. Ask request limit can stay in-memory for now.

### Exit criteria

- Authed user clicks "generate variant" on Rhea → new asset appears under her, identity-consistent with anchor, logged in ledger.
- 6th request in a day returns 429 with retry guidance.
- Cache hit returns existing asset without generating.

---

## Phase 3 — Tier system + conflict resolution

**Duration:** ~1.5–2 weeks
**Goal:** formalize Book → Canon → Generated canon → Community across visuals AND Ask-derived lore.

### Scope

**Schema**
- Add `source_tier` enum to `cel_visual_assets`: `book | canon | generated_canon | community`.
- New table `cel_corpus_contributions` for Ask-derived community lore: stores Q&A pairs and explicit user follow-ups/corrections. Synthesized facts from answers are NOT auto-captured (hallucination risk).
- Add `parent_anchor_id` (nullable) to `cel_visual_assets` for variant grouping.

**Migration**
- Existing `manual_upload` references → `canon`.
- Existing `approved = true` generated assets → `generated_canon`.
- Existing unapproved generated assets → `community`.

**Code changes**
- Extend `CANON_SOURCE_RANK` to include the new tiers; `compareCanonAuthority()` already provides the conflict primitive.
- `ask-retrieval.ts`: tier-aware boost — fixed margins so canon outranks generated_canon outranks community.
- Entity-page gallery groups by `parent_anchor_id`; canon variant always shown first.
- Conflict policy enforced at retrieval: when a community variant contradicts canon, canon shows on primary surface; community variant accessible under "variants".
- Attribution UI: every non-canon asset shows tier badge + contributor name (when not canon).

### Exit criteria

- Retrieval respects tiers (verified by test cases).
- Gallery and entity pages visibly distinguish canon vs. community.
- Conflicting variants coexist; canon always wins primary slot.
- Ask-derived community lore is queryable and contributes to context packs at low weight.

---

## Phase 4 — Moderation pipeline + promotion

**Duration:** ~1 week
**Goal:** unified admin queue for promoting community → generated_canon → canon. Reuses story-draft scaffolding.

### Scope

- New `/api/admin/contributions/route.ts` listing pending visuals + lore contributions (mirrors `/api/admin/drafts/route.ts` shape).
- New admin UI: queue with actions — approve / promote-tier / reject / merge-into-variant. Built on top of existing `VisualsAdminConsole`.
- New audit table `cel_promotion_log`: `id, target_kind, target_id, asset_id, from_tier, to_tier, actor_id, reason, created_at`.
- **Trust escape hatch:** counter on `auth.users` (or app-level) for approved promotions; once user crosses N (suggest 5), future submissions auto-tier to `generated_canon` pending sample audit.

### Exit criteria

- One queue triages all user contributions (visual + lore).
- Tier promotion is one click and writes to audit log.
- Trusted contributors stop bottlenecking on admin review.

---

## Phase 5 — Token-cost gating + tier limits

**Duration:** TBD (depends on usage data)
**Goal:** flip on real limits informed by Phase 2 ledger.

### Scope

- Analyze ledger: cost per generation, per-user distribution, cache hit rate.
- Define free / paid / admin tier limits based on actual unit economics.
- User-facing "X of Y generations remaining" indicator.
- Auto-promote high-hit cached results to `generated_canon` candidate queue.

### Exit criteria

- Sustainable unit economics.
- Users see clear quota.
- No surprise cost spikes.

---

## Sequencing notes

- Phases 0–1 are pure value, no risk — ship to validate demand before investing further.
- Phase 2's gating hook is load-bearing; subsequent phases assume it's in place.
- Phase 3 is the riskiest (schema + retrieval changes). Don't start until 1 + 2 have run for ≥ 2 weeks of real usage.
- Phase 4 only matters once community contributions exist (Phase 2 enables them, Phase 3 tiers them, Phase 4 governs them).
- Phase 5 waits on real usage data from Phase 2's ledger.

## Open questions (revisit as we go)

- Should AI/non-corporeal entities (Alara, Sovrin, Caeden) get literal embodied portraits, or stick to symbolic visuals? Lore-dependent.
- Faction representative tableaux — Phase 0 emblem-only, or include scene? Suggest defer to Phase 1.5.
- Ask-derived community lore granularity: full Q&A pair vs. just user-corrections? Suggest start with corrections only; expand if signal is high.
