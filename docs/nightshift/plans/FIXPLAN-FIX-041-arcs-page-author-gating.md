# Fix: [FIX-041] `/arcs` and `/arcs/[slug]` Pages Expose Full Character Arc Spoilers to All Readers

## Problem

**Severity: P0 — spoiler leak**

`/arcs/page.tsx` and `/arcs/[slug]/page.tsx` have **zero auth checks**. Any authenticated, onboarded reader can navigate to `/arcs/alara` and read the full character arc ledger, which includes:

- **Chapter Arc Entries table**: verbatim per-chapter scene anchors, choices, consequences, and "State After" for CH01–CH17 (e.g., CH17: "Translation completes; ALARA is no longer singular").
- **Major Choices And Consequences**: lists every major character decision by chapter number.
- **Current State By Chapter Boundary**: shows exact spoiler-state at each chapter boundary including "After CH17".
- **Unresolved Tensions** and **Future Questions** sections that reference arc endpoints.

There are 9 arc files (alara, aven-voss, evelyn-tran, galen-voss, jax-reyes, jonah-revas, lena-osei, marco-ruiz, thane-meric), each covering the full Book I arc CH01–CH17.

Additionally, `/characters/[slug]/page.tsx` renders a `CharacterArcPanel` that links to `/arcs/[slug]` for all readers (line 96), pointing them directly to the spoilery page.

## Root Cause

`src/app/arcs/page.tsx` and `src/app/arcs/[slug]/page.tsx` are pure Server Components that call `getAllCharacterArcs()` / `getCharacterArcBySlug()` and render the result without calling `getAuthenticatedProfileContext()` or checking `hasAuthorSpecialAccess`. These arc ledgers are internal author/editor tooling (they explicitly describe "how ASK should answer safely"), not reader-facing content — they were not gated when added in commit `724d66b`.

## Steps

1. Open `src/app/arcs/page.tsx`
2. Add imports at the top:
   ```typescript
   import { redirect } from "next/navigation";
   import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
   ```
3. Make `ArcsPage` async and add the auth gate before `getAllCharacterArcs()`:
   ```typescript
   export default async function ArcsPage() {
     const { user, isAuthorSpecialAccess } = await getAuthenticatedProfileContext();
     if (!user) redirect("/login");
     if (!isAuthorSpecialAccess) redirect("/");
     
     const arcs = getAllCharacterArcs();
     // ...rest unchanged
   ```

4. Open `src/app/arcs/[slug]/page.tsx`
5. Add imports:
   ```typescript
   import { redirect } from "next/navigation";
   import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
   ```
6. Add the auth gate inside `ArcDetailPage`, before `getCharacterArcBySlug(slug)`:
   ```typescript
   export default async function ArcDetailPage({ params }) {
     const { slug } = await params;
     const { user, isAuthorSpecialAccess } = await getAuthenticatedProfileContext();
     if (!user) redirect("/login");
     if (!isAuthorSpecialAccess) redirect("/");
     
     const arc = getCharacterArcBySlug(slug);
     if (!arc) notFound();
     // ...rest unchanged
   ```

7. Open `src/app/characters/[slug]/page.tsx`
8. The `CharacterArcPanel` renders for all readers at line 96: `{arc && <CharacterArcPanel arc={arc} />}`. Gate it to author-only:
   ```typescript
   {arc && isAuthorSpecialAccess && <CharacterArcPanel arc={arc} />}
   ```
   `isAuthorSpecialAccess` is already in scope (line 46).

9. Run `npx next build` (or `npm run build` if prebuild not blocked)
10. Run `npm run lint`
11. Run `npm test`
12. Manual verification:
    - As an author (role=author or AUTHOR_SPECIAL_EMAILS): `/arcs` renders correctly, `/arcs/alara` renders full arc
    - As a regular reader: `/arcs` redirects to `/`, `/arcs/alara` redirects to `/`
    - `/characters/alara` shows NO arc panel for regular reader, shows panel for author

## Files Modified
- `src/app/arcs/page.tsx`
- `src/app/arcs/[slug]/page.tsx`
- `src/app/characters/[slug]/page.tsx`

## New Files (if any)
None.

## Database Changes (if any)
None.

## Verify
- [ ] Build passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Regular reader hitting `/arcs` is redirected to `/`
- [ ] Regular reader hitting `/arcs/alara` is redirected to `/`
- [ ] Author hitting `/arcs` sees arc index
- [ ] Author hitting `/arcs/alara` sees full arc detail
- [ ] `/characters/alara` for regular reader: no arc panel, no arc link
- [ ] `/characters/alara` for author: arc panel with starting state excerpt + arc link
