# Fix: [FIX-018] Uncommitted Changes — KeithProfileHero + classifier.ts

## Problem
Two files have working-tree changes that are not committed. A fresh Vercel deploy or
`git stash` would silently lose them. Both changes are intentional and working.

Files affected:
- `src/components/profile/KeithProfileHero.tsx` — removed 2 quick links ("Read the Library",
  "Walk the Timeline"), changed quick link grid from `md:grid-cols-2 lg:grid-cols-4` to
  `sm:grid-cols-2`, minor Tailwind `!text-` fixes for override specificity.
- `src/lib/ai/classifier.ts` — inverted deep/simple classification logic. Old: default to
  simple, deep if matching specific advice patterns. New: default to deep, simple only for
  clearly factual/list/lookup questions. Same `_history` parameter retained.

## Root Cause
Both changes were made in the working tree and not staged/committed. No commits reference them.

## Steps
1. Run `git add src/components/profile/KeithProfileHero.tsx src/lib/ai/classifier.ts`
2. Run:
```bash
git commit -m "$(cat <<'EOF'
refactor(beyond): trim Keith profile links; invert ask classifier logic

KeithProfileHero: remove Read the Library and Walk the Timeline quick links
(now redundant with hub nav), tighten grid to sm:grid-cols-2, fix Tailwind
!text- overrides.

classifier: invert deep/simple routing — default to deep (multi-perspective)
for all questions except clearly factual date/list/lookup patterns.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
3. Verify with `git log --oneline -3` — commit should appear.

## Files Modified
- `src/components/profile/KeithProfileHero.tsx` — 2 quick links removed, grid adjusted
- `src/lib/ai/classifier.ts` — classification logic inverted

## Verify
- [ ] `git status` shows clean working tree after commit
- [ ] `npm run build` passes
- [ ] `/profile` page loads correctly for Keith (KeithProfileHero renders with 2 links, not 4)
