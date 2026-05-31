# Dev Plan: [IDEA-128] World Faction Relations Matrix — Static Diplomatic Status Table for Completed Readers

**Theme:** post-read-world

## What This Does

A new `/world/factions` server-component page, gated by `show_all_content === true`, displaying a faction-to-faction diplomatic relations matrix as of CH17. Paul authors the `FACTION_RELATIONS` constant directly in the page file (a 15-minute authoring task). The page renders an HTML `<table>` with color-coded cells per relationship type (`allied`, `contested`, `dissolved`, `absorbed`, `unknown`). Cells are linked to the relevant faction wiki pages. Gives completed readers a diegetic political landscape snapshot they cannot infer from individual faction wiki entries alone.

## User Stories

- As a first-time reader (show_all_content off), this page is entirely inaccessible — a server-side redirect to `/` prevents exposure.
- As a re-reader (show_all_content on), I navigate to `/world/factions` and see the full diplomatic map of CH17's political outcomes — who allied with whom, what dissolved, who absorbed what.
- As the author, I populate the matrix constant (15 min) and the page auto-renders it. No DB writes. Updating the matrix is a code edit to the page file.

## Implementation

### Phase 1: Foundation (~20 min)

1. Create `src/app/world/factions/page.tsx` (new file)

```tsx
import { redirect } from 'next/navigation';
import { getAuthenticatedProfileContext } from '@/lib/supabase/profile-context'; // or equivalent auth helper

export default async function WorldFactionsPage() {
  const ctx = await getAuthenticatedProfileContext();
  if (!ctx?.profile?.show_all_content) {
    redirect('/');
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 text-[var(--color-text-primary)]">
        Faction Relations — End of Mission
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Diplomatic alignment and disposition as of Directive-14 resolution (CH17).
      </p>
      <FactionsMatrix />
    </main>
  );
}
```

**Checkpoint:** Build passes. Navigating to `/world/factions` as a non-`show_all_content` reader redirects to `/`.

### Phase 2: Matrix Data and Render (~30 min code + 15 min Paul authoring)

2. In the same file (or a co-located `_data.ts` import), define the relation types and matrix:

```tsx
type RelationType = 'allied' | 'contested' | 'dissolved' | 'absorbed' | 'unknown';

interface FactionEntry {
  slug: string;
  name: string;
  href: string;
}

// Paul fills in the actual factions from content/wiki/factions/
const FACTIONS: FactionEntry[] = [
  { slug: 'rigel-protocol', name: 'Rigel Protocol', href: '/factions/rigel-protocol' },
  { slug: 'maru-command',   name: 'MARU Command',   href: '/factions/maru-command' },
  { slug: 'vault-accord',   name: 'Vault Accord',   href: '/factions/vault-accord' },
  // ... additional factions as Paul defines
];

// Paul authors this: FACTION_RELATIONS[rowSlug][colSlug] = RelationType
// Diagonal (self) cells are rendered as '—'
const FACTION_RELATIONS: Record<string, Record<string, RelationType>> = {
  'rigel-protocol': {
    'maru-command': 'contested',
    'vault-accord': 'unknown',
    // ...
  },
  // ...
};
```

3. Build the `FactionsMatrix` component (inline in the same file, no separate file needed):

```tsx
const RELATION_STYLES: Record<RelationType, string> = {
  allied:    'bg-[var(--color-ocean)]/20 text-[var(--color-ocean)]',
  contested: 'bg-red-900/20 text-red-300',
  dissolved: 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]',
  absorbed:  'bg-amber-900/20 text-amber-300',
  unknown:   'bg-transparent text-[var(--color-text-muted)]',
};

function FactionsMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-[var(--color-text-muted)]" />
            {FACTIONS.map(f => (
              <th key={f.slug} className="p-2 text-center text-xs text-[var(--color-text-muted)] font-mono">
                <a href={f.href} className="hover:text-[var(--color-ocean)]">{f.name}</a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FACTIONS.map(row => (
            <tr key={row.slug} className="border-t border-[var(--color-border)]">
              <td className="p-2 text-xs font-mono text-[var(--color-text-muted)]">
                <a href={row.href} className="hover:text-[var(--color-ocean)]">{row.name}</a>
              </td>
              {FACTIONS.map(col => {
                if (row.slug === col.slug) {
                  return <td key={col.slug} className="p-2 text-center text-[var(--color-text-muted)]">—</td>;
                }
                const rel = FACTION_RELATIONS[row.slug]?.[col.slug] ?? 'unknown';
                return (
                  <td key={col.slug} className={`p-2 text-center text-xs capitalize rounded ${RELATION_STYLES[rel]}`}>
                    {rel}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

4. **Paul's authoring step (15 min):** Populate `FACTIONS` array with all named factions from `content/wiki/factions/` and fill in `FACTION_RELATIONS` with accurate CH17 dispositions. Run `ls content/wiki/factions/` to get the full list of faction slugs.

**Checkpoint:** Page renders with color-coded matrix. Faction names link to their wiki entries. Diagonal cells show "—".

### Phase 3: Navigation Entry Point (~10 min)

5. On the `/factions` index page (`src/app/factions/page.tsx` or the relevant component), add a conditional link visible only to `show_all_content` readers:

```tsx
{readerProgress?.showAllContent && (
  <Link href="/world/factions" className="text-sm text-[var(--color-ocean)] hover:underline ml-4">
    View Relations Matrix →
  </Link>
)}
```

   Or add a "World" nav item in the post-read navigation cluster if one exists (parallel to where IDEA-095's `/world/voices` link would appear).

6. Run `npx next build`
7. Run `npm run lint`
8. Manual verification:
   - Non-`show_all_content` reader → redirected to `/`
   - `show_all_content` reader → sees matrix with correct cell colors
   - Faction name links → navigate to correct wiki pages
   - No content visible on `/world/factions` to non-completed readers

## Files Modified

- `src/app/world/factions/page.tsx` — **new file** (~80 lines: page, data constants, FactionsMatrix component)
- `src/app/factions/page.tsx` (or equivalent factions index) — ~5 lines (conditional navigation link)

## New Files

- `src/app/world/factions/page.tsx`

## Database Changes

None.

## Content Considerations

Paul authors the `FACTION_RELATIONS` constant directly in the new page file. This is static authored data — no wiki markdown or `<!-- generated:ingest -->` files involved. Updating the matrix in the future is a code edit.

Before executing: run `ls content/wiki/factions/` to enumerate all faction slugs for the `FACTIONS` array. Check `content/wiki/arcs/characters/` CH17 "State After" entries for faction disposition references.

## Spoiler & Gating Impact

- Page is entirely gated — server-side `redirect('/')` if `show_all_content` is false. No partial render.
- Content references only post-CH17 political outcomes — full spoilers for anyone who hasn't finished the book. The `show_all_content` gate is the correct and sufficient protection.
- Partial-completion edge cases: `show_all_content` is the sole gate. Readers who have read all chapters but haven't toggled `show_all_content` in their profile will not see this page.
- Ask spoiler impact: none — this is a static page, not an Ask context input.

## Theme-Specific Requirements (post-read-world)

1. **Hidden for locked/first-time readers:** Yes — server-side redirect to `/` when `show_all_content === false`. No content renders, no links visible (only the conditional navigation entry added in Phase 3 is gated).

2. **Integration with `show_all_content`:** Direct server-side check via `getAuthenticatedProfileContext()` → `profile.show_all_content`. Consistent with pattern used by IDEA-095's `/world/voices` and IDEA-116's `/world/manifest`.

3. **Partial-completion edge cases:** `show_all_content` is the sole gate. If a reader has read CH01–CH16 but not CH17, they cannot access the page. If `show_all_content` is true, the page is visible regardless of explicit chapter reads (companion-first: all content accessible anyway).

## Testing

- [ ] Build passes (`npx next build`)
- [ ] Lint passes (0 errors)
- [ ] Non-`show_all_content` reader: `/world/factions` → redirect to `/` (no flash of content)
- [ ] `show_all_content` reader: matrix renders, all faction cells present
- [ ] Cell colors match their RelationType (allied = blue tint, contested = red, dissolved = gray, absorbed = amber)
- [ ] Faction name links navigate correctly to wiki pages
- [ ] Diagonal (self) cells render as "—"
- [ ] No `npm test` failures introduced (no wiki/parser/prompt logic touched)

## Dependencies

- None blocking. Independent feature.
- Synergistic with IDEA-095 (Arc Endpoint Quotes Gallery) — `getArcEndpoints()` could inform faction mentions in arc ledger for Paul's authoring step, but is not a hard dependency.
- Synergistic with IDEA-119 (Faction Final Status Board on `/factions` index, `exploring`) — that idea adds a per-faction status accordion inline on the existing index; this plan adds a dedicated matrix page. The two are complementary, not conflicting.

## Estimated Total: 1 hour code + 15 minutes Paul authoring the relations data
