# Dev Plan: [IDEA-127] Runway Valkyrie Exterior Cinematic — Ship Reveal Ambient Clip on Wiki Page

**Theme:** genmedia

## What This Does

Author pre-generates a single 4-second Runway Gen-4 ambient video clip of the Valkyrie-1 exterior in deep space (WORLD A `alien_organic` vocabulary — bio-crystalline hull, petal apertures, subdermal vein emission). The clip is stored in `cel_visual_assets` and served from Supabase Storage. On the Valkyrie-1 wiki page (`/artifacts/valkyrie-1`, created by IDEA-106), the clip plays as a `<video autoplay loop muted playsInline>` immediately below the dynamic state header image — a 10-15 line code change to the custom page component. Fail-open: if no approved clip exists, the page renders exactly as without this feature.

## Prerequisites

1. **FIX-048** must execute first — move committed test renders out of `public/images/`; `.gitignore` pattern added.
2. **IDEA-106** (Valkyrie-1 Dynamic State Header) must ship first — its custom `src/app/artifacts/valkyrie-1/page.tsx` is the host for this clip.

## User Stories

- As a first-time reader, I navigate to the Valkyrie-1 wiki page and see a subtle 4-second looping ambient clip of the ship exterior before the state header — immersive world-building without story spoilers.
- As a re-reader (show_all_content on), the same clip plays. It is non-narrative and adds cinematic atmosphere.
- As the author, I batch-generate the clip in the admin console (~$0.30), preview it, approve it, and the code picks it up automatically on next page load.

## Implementation

### Phase 1: Author Batch Generation (~15 min, no code)

1. Log in as author to `/profile/admin/visuals`
2. Set: **Target entity** = `valkyrie-1`, **Style** = `exterior_ambient`, **Provider** = Runway Gen-4
3. Use this prompt (or synthesize via the admin console's synthesis flow):

   > Valkyrie-1 spacecraft exterior, deep space setting, alien organic bio-crystalline hull, petal apertures retracted flush with hull, subdermal vein emission blue-green glowing, phosphorescent glyph lines along hull seams, no human figures, no text overlays, seamless ambient loop, 4 seconds, WORLD A alien organic vocabulary

4. Generate. Expected cost: ~$0.15–$0.30.
5. Preview the clip. Approve via the "Approve" toggle.
6. Note the approved asset ID and storage URL.

**Checkpoint:** `/api/visuals/preferred?target=valkyrie-1&style=exterior_ambient` returns `{ url: "...", approved: true }`.

### Phase 2: Code — Add Video Element to Custom Valkyrie-1 Page (~15 min)

7. Open `src/app/artifacts/valkyrie-1/page.tsx` (the custom page created by IDEA-106)
8. The page already fetches the dynamic state header asset via something like `getPreferredVisual('valkyrie-1', stateStyle)`. Add a second parallel fetch for the exterior ambient clip:

```tsx
const exteriorClipAsset = await getPreferredVisual('valkyrie-1', 'exterior_ambient');
```

(The `getPreferredVisual` helper is the server-safe fetch already used in the IDEA-106 page — it calls `/api/visuals/preferred` and returns the asset URL or null.)

9. After the state header `<Image>` block (or hero section), add the video block:

```tsx
{exteriorClipAsset?.url && (
  <div className="w-full rounded overflow-hidden my-4">
    <video
      src={exteriorClipAsset.url}
      autoPlay
      loop
      muted
      playsInline
      className="w-full object-cover h-48 md:h-64"
    />
  </div>
)}
```

10. Run `npx next build`
11. Run `npm run lint`
12. Manual verification: navigate to `/artifacts/valkyrie-1` as any user — if an approved `exterior_ambient` asset exists, the clip plays. If not, the page renders as before (no layout change).

## Files Modified

- `src/app/artifacts/valkyrie-1/page.tsx` — ~10 lines added (1 fetch + conditional `<video>` block)

## New Files

None.

## Database Changes

None. The clip is stored in `cel_visual_assets` via the existing admin-console generation flow.

## Genmedia Requirements

1. **Model/provider:** Runway Gen-4 via `providers/runway.ts` (already integrated). Selected because IDEA-106 establishes the Valkyrie-1 page as a Runway generation surface; consistency of provider within this page is desirable.

2. **Cost budget:** ~$0.15–$0.30 one-time; author-batch only. Zero reader generation cost. No rate limiting needed for a pre-generated static asset.

3. **Caching strategy:** The clip is stored once in `cel_visual_assets` with `target='valkyrie-1'`, `style='exterior_ambient'`, `approved=true`. The `/api/visuals/preferred` endpoint is a lightweight SELECT on `cel_visual_assets` — cacheable at CDN level with `Cache-Control: public, max-age=3600`. The server component fetches at render time and Next.js static generation (or ISR) caches the result. No user-scoped caching needed — one canonical clip for all users.

4. **Spoiler gating of prompt inputs:** The prompt contains only physical/environmental world-building vocabulary from WORLD A (`alien_organic`). No character names, no narrative events, no chapter references. Content visible under companion-first; no chapter gate required. Safe for all users including guests and first-time readers.

5. **Canon grounding:** `content/wiki/specs/valkyrie-1/master.json` WORLD A vocabulary (bio-crystalline, petal apertures, subdermal vein emission, phosphorescent glyph lines). The master spec is the authoritative visual vocabulary source for Valkyrie-1 exterior. Style key `exterior_ambient` is distinct from IDEA-106's harmonic state keys (`dormant`, `active`, etc.) — no collision in the `cel_visual_assets` table.

## Spoiler & Gating Impact

No gating needed. The clip shows ship exterior only — no characters, no narrative events. All users (guests, first-time readers, re-readers) see the same clip. Fail-open pattern ensures zero functional regression if no clip is approved.

## Theme-Specific Requirements (genmedia)

All five genmedia requirements addressed above in the Genmedia Requirements section.

## Testing

- [ ] Build passes (`npx next build`)
- [ ] Lint passes (0 errors)
- [ ] With approved `exterior_ambient` asset: video element renders on `/artifacts/valkyrie-1`
- [ ] Without approved asset: page renders exactly as IDEA-106 version (no video element, no layout shift)
- [ ] `<video>` does not autoplay sound (muted + no audio track)
- [ ] Guest path: clip visible (no auth requirement)
- [ ] Re-reader path: clip visible (no auth requirement)

## Dependencies

- **FIX-048** (prerequisite — images out of public/)
- **IDEA-106** (prerequisite — custom Valkyrie-1 page must exist)

## Estimated Total: 30 minutes (15 min author batch + 15 min code)
