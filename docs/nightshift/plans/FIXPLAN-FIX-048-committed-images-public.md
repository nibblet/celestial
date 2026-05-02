# Fix: [FIX-048] ~15MB of Binary Test Renders Committed to `public/images/`

## Problem
Commits `03d7d20` and `74aeae5` added 14 image files (PNG/JPG) totalling ~15MB
to `public/images/`. These are spec development test renders, not authored
reader-facing assets:

- `baseline_view.png` (2.5 MB) — Valkyrie-1 exterior render
- `three_quarter_view.png` (680 KB)
- `orthogonal_views.png` (199 KB)
- `side_view.png`, `front_view.png`, `top_view.png`, `bottom_view.png` (47–105 KB each)
- `command_dome.png` (281 KB)
- `resonant_pad.jpg` (11 KB)
- `active-state.png`, `alignment-state.png`, `dormant-state.png`, `harmonic-jump-state.png`, `wake-state.png` (~2 MB each)
- `alara_sidgel.png` (10 KB)

**Severity: Low** — No functional breakage. Impact: ~15MB of git history bloat;
all images are served as public assets accessible to anyone who knows the URL;
these are intended as author-internal spec reference renders.

The 5 harmonic state images (`active-state.png`, etc.) may be intentionally
public-facing if IDEA-047 (Harmonic State Gallery) ships, so they should be
kept in public/ with that in mind.

## Root Cause
No `.gitignore` rule prevents images under `public/images/` from being tracked.
Test renders from the visual spec development pipeline were committed directly
to the repo rather than being stored in Supabase storage.

## Steps

**Option A — Minimal (recommended for now): Document + gitignore future renders**

1. Add a pattern to `.gitignore` to prevent unintentional future renders:
   ```
   # Visual spec test renders — use Supabase storage for new renders
   # Remove specific filenames below if intentionally tracking them
   public/images/*.png
   public/images/*.jpg
   public/images/*.jpeg
   ```
   Exception: If the 5 harmonic state images are intended to be public-facing
   (for IDEA-047), either track them explicitly by removing the gitignore
   exception or store them in Supabase.

2. Do NOT retroactively `git rm` files that are already committed — that rewrites
   history. The blobs are already in the repo; removing them now only stops
   future additions from piling on.

3. Add a `public/images/README.md` (one sentence): "Images here are canon
   reference renders for spec development. Production reader-facing images live
   in Supabase cel_visual_assets."

**Option B — Clean slate: Move to Supabase (more work, deferred)**

For each image that should be a canonical reader-facing asset:
1. Upload via `/api/visuals/reference` (or directly to Supabase storage)
2. Approve via `/api/visuals/approve` to make it the canonical approved asset
3. Remove the file from `public/images/` and add to `.gitignore`

This is the correct long-term architecture but requires decision by Paul on
which images are canonical vs temporary test renders.

**Recommended execution order:**
1. Do Option A now (5 min, prevents blowup)
2. Defer Option B until IDEA-047 (Harmonic State Gallery) is prioritised

## Files Modified
- `.gitignore` (add pattern)
- `public/images/README.md` (new, one line)

## New Files (if any)
- `public/images/README.md`

## Database Changes (if any)
None.

## Verify
- [ ] `git status` after adding a test .png to `public/images/` confirms it's
  not tracked
- [ ] The 5 harmonic state images (`active-state.png` etc.) are still visible in
  the browser at `/images/active-state.png` if intentionally kept
- [ ] `npm run build` and `npm run lint` pass (no code changes)
