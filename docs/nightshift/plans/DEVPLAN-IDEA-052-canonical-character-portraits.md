# Dev Plan: [IDEA-052] Canonical Character Portraits — Author-Batch Generated for 9 Main Characters
**Theme:** genmedia

## What This Does
Pre-generates one canonical portrait per main character using the existing author visuals pipeline. Portraits are approved via the admin console and surfaced on each character detail page through the existing `EntityVisualsGallery` component. Zero new infrastructure: this is a content authoring task (seed spec JSONs) plus a batch generation run — the entire display layer is already live.

## User Stories
- As a first-time reader, I see a character portrait at the top of the character detail page that matches the feel of the story, grounded in canonical description rather than fan imagination.
- As a re-reader (show_all_content on), the portraits are visible exactly as for first-time readers — no difference, since companion-first means all content is accessible to all users.
- As the author, I can generate, review, and approve portraits from the existing `/profile/admin/visuals` console, then regenerate with adjusted spec if the result misses canon.

## Theme-Specific Requirements (genmedia)

1. **Model/provider:** Imagen 4 via the existing `src/lib/visuals/providers/imagen.ts`. Imagen 4 is already wired for all visuals generation; no new provider setup. Character portraits are static images, not video — no Runway dependency.

2. **Cost budget:** ~$0.06 per image × 9 characters = ~$0.54 per full batch. Negligible. Rate limiting: existing admin-console-only generation path has no reader-side rate limit needed — only the author triggers generation. Add `source='character_portrait'` to generated assets to distinguish from scene renders.

3. **Caching:** Shared, not user-scoped. Images stored in `cel_visual_assets` with `approved=true` and `target_type='character'`, `target_slug={character-slug}`. The existing `seedHashFor(target, style, corpusVersion)` hash in `src/lib/visuals/hash.ts` deduplicates identical generation calls. `EntityVisualsGallery` fetches from `cel_visual_assets` filtered by target type + slug + approved status.

4. **Spoiler gating of prompt inputs:** Character portrait prompts use only the "Starting State" section of the arc ledger (`content/wiki/arcs/characters/{slug}.md`) and the canonical `## Appearance` or `## Physical Description` section from `content/wiki/characters/{slug}.md`. No future-arc content (Unresolved Tensions, Future Questions, arc endpoints) enters the prompt. The spec system's `renderSpecForPrompt()` emits a `# Visual Spec — CANON OVERRIDE` block sourced from `content/wiki/specs/{slug}/master.json` (once seeded). No chapter-level spoiler concern under companion-first defaults.

5. **Canon grounding:** Three layers, assembled by `corpus-context.ts`:
   - Primary: `content/wiki/specs/{character-slug}/master.json` (to be authored — see Phase 1)
   - Secondary: character wiki markdown (`content/wiki/characters/{slug}.md`) — canonical dossier block + physical/voice description
   - Tertiary: arc ledger "Starting State" section (`content/wiki/arcs/characters/{slug}.md`) — emotional/contextual grounding at CH01
   - Style preset: `intimate_crew` for crew members (Aven Voss, Evelyn Tran, Galen Voss, Jax Reyes, Jonah Revas, Lena Osei, Marco Ruiz, Thane Meric); `noncorporeal_presence` for ALARA (she does not have a body — her "portrait" should be ambient/holographic).

## Implementation

### Phase 1: Seed Character Spec JSON Files
Estimated: 1–2 hours of author time per character (Paul authors; no code needed).

For each of the 9 characters, create `content/wiki/specs/{slug}/master.json`. Structure mirrors `content/wiki/specs/valkyrie-1/master.json`:

```json
{
  "entity": "{slug}",
  "world": "earth_2050",
  "style_reference": "...",
  "physical": {
    "build": "...",
    "height_impression": "...",
    "hair": "...",
    "eyes": "...",
    "skin": "...",
    "distinguishing_features": "..."
  },
  "wardrobe": {
    "default": "...",
    "materials": "...",
    "color_palette": ["...", "...", "..."]
  },
  "expression_default": "...",
  "posture": "...",
  "mood": {
    "primary": "...",
    "secondary": "..."
  },
  "lighting_preference": "...",
  "canon_notes": "Grounded in content/wiki/characters/{slug}.md + arc starting state"
}
```

Special case for ALARA: use `"world": "alien_organic"` and describe her ambient holographic form rather than a physical body:
```json
{
  "entity": "alara",
  "world": "alien_organic",
  "form": "ambient_holographic",
  "visual_presence": "distributed_light_pattern",
  "color_palette": ["violet", "amethyst", "warm_gold"],
  "motion": "resonant_drift",
  "expression_register": "crystalline_calm_with_subtle_warmth"
}
```

Recommended authoring order (start with most-defined characters):
1. Thane Meric (primary POV, most described)
2. ALARA (unique visual requirements — noncorporeal)
3. Galen Voss
4. Evelyn Tran
5. Aven Voss
6. Lena Osei
7. Marco Ruiz
8. Jax Reyes
9. Jonah Revas

**Checkpoint:** `content/wiki/specs/thane-meric/master.json` exists. Open admin console at `/profile/admin/visuals`, target=character, slug=thane-meric. Generate one test portrait. Review quality. Iterate on spec if needed.

### Phase 2: Batch Generate All 9 Portraits
Estimated: 30 minutes of generation time (Imagen 4 API).

1. Via `/profile/admin/visuals` admin console, generate one portrait per character.
   - Target type: character
   - Slug: `{character-slug}`
   - Style preset: `intimate_crew` (or `noncorporeal_presence` for ALARA)
   - No `state` or `view` param needed for portraits

2. Review each generated image. If a result misses canon:
   - Adjust the `master.json` spec with more specific visual constraints
   - Regenerate (new `corpusVersion` hash ensures no stale cache served)

3. Approve each satisfactory portrait in the admin console (sets `approved=true`).

**Checkpoint:** All 9 characters have at least one `approved=true` row in `cel_visual_assets`. `EntityVisualsGallery` on `/characters/{slug}` displays the approved portrait.

### Phase 3: Verify Display and Polish
Estimated: 30 minutes.

1. Visit each of the 9 character detail pages (`/characters/{slug}`) as a reader.
2. Confirm `EntityVisualsGallery` renders the approved portrait correctly.
3. Confirm no console errors, no broken image URLs.
4. Optional: if a portrait style is inconsistent with others, adjust the spec or generate an alternate and switch approval.

**Checkpoint:** All 9 character pages show a portrait. Visual style is internally consistent across the crew.

## Content Considerations
- 9 new `content/wiki/specs/{character-slug}/master.json` files (manually authored, no `<!-- generated:ingest -->` marker needed — these are manually owned spec files)
- No changes to wiki markdown content
- No brain_lab pipeline changes
- Portraits stored in Supabase `cel_visual_assets` — not in the repo (see FIX-048 for why images should not be committed)

## Spoiler & Gating Impact
None. Character portraits are decorative and contain no narrative text. Under companion-first defaults all content is accessible to all users. Portrait images depict characters as they appear at their Starting State (CH01 entry point), not at story-end states — no spoiler risk even in principle.

## Testing
- [ ] Build passes after adding spec JSON files
- [ ] Lint passes (0 errors)
- [ ] `npm test` passes (no code changes → 192/192)
- [ ] First-time reader path: `/characters/thane-meric` shows approved portrait
- [ ] ALARA: `/characters/alara` shows ambient holographic portrait (not a humanoid face)
- [ ] Admin console can generate, review, and approve portraits for all 9 characters
- [ ] No images committed to `public/images/` (Supabase-only storage)

## Dependencies
- Existing visuals pipeline: `corpus-context.ts`, `synthesize-prompt.ts`, `generate-asset.ts`, Imagen 4 provider
- `EntityVisualsGallery.tsx` already renders approved assets on character pages — no code changes needed
- `cel_visual_assets` table with existing RLS (migration 039 — allows `author` and `admin` to insert/update)
- Author must have an `author`-role Supabase account to access the admin console
- Imagen 4 API key configured in environment

## Estimated Total: ~2 hours authoring (spec JSONs) + ~1 hour generation/review = ~3 hours author time. Zero code changes.
