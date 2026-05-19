# Dev Plan: [IDEA-087] Ask Source Deep-Dive Panel
**Theme:** ask-forward

## What This Does

Expands each entity link inside `AskSourcesDisclosure` (the "Sources" `<details>` accordion on every Ask response bubble) into an expandable mini-panel showing: entity type badge, display name, a one-line description excerpt, and an "Open wiki page →" button — all without leaving the Ask flow.

Currently the "Links in this answer" section is a flat list of `{text} · /href` entries. This change makes each entry interactive, surfacing the entity's world-context inline so readers can decide whether to navigate or continue the conversation.

## User Stories

- As a first-time reader in the Ask companion, when I see "[ALARA](/characters/alara)" cited in a response, I want to quickly learn what kind of entity ALARA is and get a one-line description without navigating away from the conversation.
- As a re-reader (`show_all_content` on), I want to verify which faction or location an answer references, confirm it's the entity I'm thinking of, and jump directly to its wiki page if I want more depth.
- As the author, I want readers to feel the wiki is within arm's reach from every Ask answer — not a separate navigation context.

## Implementation

### Phase 1: New `/api/entity-meta` endpoint
1. Create `src/app/api/entity-meta/route.ts`
2. GET handler: read `?slug=` from `request.nextUrl.searchParams`
3. Call `resolveWikiSlug(slug)` from `@/lib/wiki/slug-resolver` — already server-safe (uses `fs`)
4. If not found: return `{ found: false }`
5. If found: read the markdown file for the resolved entity (`content/wiki/{kind}/{slug}.md`), extract first non-heading paragraph as `excerpt` (first `\n\n`-delimited block that doesn't start with `#`, `**`, or `<!--`)
6. Return `{ found: true, name: resolved.label, kind: resolved.kind, href: resolved.href, excerpt }` (200)
7. No auth required — entity metadata is public, same as wiki pages
8. **Checkpoint:** `curl '/api/entity-meta?slug=alara'` returns `{ found: true, name: "ALARA", kind: "characters", href: "/characters/alara", excerpt: "..." }`

### Phase 2: Expand `AskSourcesDisclosure` in `ask/page.tsx`
1. Open `src/app/ask/page.tsx`, locate `AskSourcesDisclosure` function (line ~66)
2. Add component state:
   ```ts
   const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
   const [metaCache, setMetaCache] = useState<Record<string, EntityMeta | "loading" | "error">>({});
   ```
3. Add helper to derive slug and type badge from href:
   ```ts
   function slugFromHref(href: string): string { return href.split("/").filter(Boolean).pop() ?? ""; }
   function kindFromHref(href: string): string {
     const seg = href.split("/").filter(Boolean)[0] ?? "";
     return seg.charAt(0).toUpperCase() + seg.slice(1, -1); // "characters" → "Character"
   }
   ```
4. Add `fetchEntityMeta(slug)` async function inside the component: calls `fetch('/api/entity-meta?slug={slug}')`, sets `metaCache[slug]` to response; handles loading/error states.
5. For each link row in the `evidence.linksInAnswer.map(...)` block (lines ~160–169), add:
   - An expand `<button>` showing `▸` / `▾` based on `expandedSlug === slug`
   - On click: if not in `metaCache`, call `fetchEntityMeta(slug)`, then toggle `expandedSlug`
   - When expanded and `metaCache[slug]` is loaded: render a small indent block with:
     - `<span className="text-[10px] uppercase tracking-wide text-ink-ghost">{kindBadge}</span>`
     - `<p className="text-ink-muted text-xs mt-0.5 line-clamp-3">{meta.excerpt}</p>`
     - `<Link href={meta.href} className="...">Open wiki page →</Link>`
   - When `metaCache[slug] === "loading"`: show `…`
   - When `metaCache[slug] === "error"`: show nothing (degrade gracefully)
6. Add `EntityMeta` type near top of file (or inline):
   ```ts
   type EntityMeta = { found: true; name: string; kind: string; href: string; excerpt: string } | { found: false };
   ```
7. **Checkpoint:** Open any Ask conversation with a response that has wiki entity links. Expand the "Sources" section. Each link row shows `▸` — clicking it shows the entity type + excerpt + "Open wiki page →" without a full navigation.

### Phase 3: Polish
1. Ensure `line-clamp-3` Tailwind utility is available (Tailwind 4 supports it natively)
2. Verify entity type badge uses consistent label format: capitalize singular (`characters` → `Character`, `locations` → `Location`, `factions` → `Faction`, `vaults` → `Vault`, `artifacts` → `Artifact`, `rules` → `Rule`)
3. Run `npm run build` (or `npx next build`)
4. Run `npm run lint`
5. Run `npm test` (no new test files needed — API route is thin; snapshot not needed)
6. Manual verification: test with 0, 1, and 3+ links in answer; verify graceful error when `slug` not found (returns `{ found: false }`)

## Files Modified
- `src/app/ask/page.tsx` — `AskSourcesDisclosure` function: add component state + expand toggle + meta fetch
- `src/app/api/entity-meta/route.ts` (NEW) — entity meta GET endpoint

## New Files
- `src/app/api/entity-meta/route.ts`

## Database Changes
None — endpoint reads markdown from filesystem via existing `slug-resolver.ts`.

## Content Considerations
No content changes. Entity wiki markdown is the source; the endpoint reads the first paragraph via existing filesystem access pattern.

## Spoiler & Gating Impact
Entity metadata (name, type, first paragraph) is pure world-building context — not narrative content. Under companion-first, all entity data is accessible to all users. No chapter gating required. The endpoint deliberately extracts only the opening description paragraph, not arc-endpoint or story-event content. This is the same data visible on any wiki entity index page.

## Theme-Specific Requirements (ask-forward)
- **Prompt changes:** None — this is a client-side disclosure enhancement; the `/api/ask` prompt/retrieval pipeline is untouched.
- **Latency budget:** The entity-meta fetch fires lazily on accordion expand (only when reader clicks `▸`). No latency added to the Ask stream itself. Each `/api/entity-meta` response reads one small markdown file from disk — sub-10ms server time.
- **Conversation memory:** Not applicable — this is a read-only decoration on completed responses.
- **Voice/TTS:** Not applicable.

## Testing
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (no new `<img>` warnings; type safety for `EntityMeta` union)
- [ ] `npm test` passes (192 suite unchanged)
- [ ] Locked-reader path: entity metadata is non-spoiler world-building; no gating needed
- [ ] Guest path: endpoint requires no auth; works identically for guests
- [ ] Re-reader path: same as regular reader; no show_all_content dependency
- [ ] Zero-links answer: "Links in this answer" section doesn't render (already handled by `evidence.linksInAnswer.length > 0` guard at line ~154); component changes only affect the inner map
- [ ] Slug-not-found: returns `{ found: false }`, component renders nothing in the expanded slot (graceful degrade)
- [ ] Network error on fetch: caught, `metaCache[slug]` set to `"error"`, renders nothing

## Dependencies
- IDEA-063 (EntityHoverCard) — these two features share entity-type-from-href logic. If IDEA-063 ships first, extract the `kindFromHref` helper into a shared utility `src/lib/wiki/entity-from-href.ts` to avoid duplication. If IDEA-087 ships first, leave the helper inline in `ask/page.tsx` and extract on IDEA-063.
- No new npm packages.
- No DB migrations.

## Estimated Total: 2 hours
