# Dev Plan: [IDEA-069] Ask from Wiki Page — Entity-Level Ask CTAs
**Theme:** ask-forward

## What This Does

Adds a compact "Ask about [Entity Name] →" link to the page header of every wiki entity detail page
(characters, factions, locations, artifacts, vaults, rules). Clicking opens `/ask` pre-seeded with
entity context: `?entity={slug}&entityType={type}&entityName={Name}`. On the Ask page, this context
drives an entity-aware breadcrumb ("← Back to ALARA") and a set of entity-type-specific suggestion
chips, making the companion feel naturally reachable from anywhere in the wiki.

## User Stories

- As a first-time reader browsing ALARA's wiki page, I tap "Ask about ALARA →" and the companion
  opens with chips like "What role does ALARA play in the story?" and a breadcrumb back to the
  character page.
- As a re-reader (show_all_content on), I browse a faction page and immediately ask "How does
  [Faction Name] end up?" using the entity CTA — the companion opens with faction-specific chips.
- As the author, no config change needed; the CTA appears automatically on all entity pages.

## Implementation

### Phase 1: Add CTAs to Entity Detail Pages

All four entity types covered by `FictionEntityDetailPage` (factions, locations, artifacts, vaults)
share one component, so one change covers all four.

**1a. `src/components/entities/FictionEntityViews.tsx` — `FictionEntityDetailPage`**

Locate `<h1 className="type-page-title mb-2">{entity.name}</h1>` (currently ~line 242).

Add directly below it:
```tsx
<Link
  href={`/ask?entity=${encodeURIComponent(entity.slug)}&entityType=${encodeURIComponent(entity.entityType)}&entityName=${encodeURIComponent(entity.name)}`}
  className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
>
  Ask about {entity.name} &rarr;
</Link>
```

`Link` is already imported. No new imports needed.

**1b. `src/app/characters/[slug]/page.tsx`**

Locate the `<h1 className="type-page-title">` element (~line 73). Add directly below it:
```tsx
<Link
  href={`/ask?entity=${encodeURIComponent(person.slug)}&entityType=fiction_characters&entityName=${encodeURIComponent(dbPerson?.display_name || person.name)}`}
  className="type-ui mb-1 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
>
  Ask about {dbPerson?.display_name || person.name} &rarr;
</Link>
```

`Link` is already imported.

**1c. `src/components/entities/FictionEntityViews.tsx` — `RuleDetailPage`**

Locate `<h1 className="type-page-title mb-2">{rule.title}</h1>` (~line 398). Add below it:
```tsx
<Link
  href={`/ask?entity=${encodeURIComponent(rule.slug)}&entityType=fiction_rules&entityName=${encodeURIComponent(rule.title)}`}
  className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
>
  Ask about {rule.title} &rarr;
</Link>
```

**Checkpoint:** Navigate to `/characters/alara`, `/factions/rigel-protocol`, `/rules/parables-of-resonance`.
Confirm each shows a small "Ask about X →" link below the page title. Each link should open `/ask`
with the correct `?entity=...` params visible in the URL bar.

### Phase 2: Entity Context in `ask/page.tsx`

**2a. Read new URL params** (alongside the existing params at ~lines 241–246):
```typescript
const entitySlug  = searchParams.get("entity")   || undefined;
const entityType  = searchParams.get("entityType") || undefined;
const entityName  = decodeURIComponent(searchParams.get("entityName") || "");
```

**2b. Add entity-context breadcrumb** directly after the existing story-context breadcrumb block
(~line 649). Mirror the `storySlug` block's pattern:
```tsx
{entitySlug && entityType && (
  <div className="border-b border-[var(--color-border)] bg-gold-pale/30 py-3">
    <p className="type-meta text-ink">Entity context</p>
    <p className="mt-1 font-[family-name:var(--font-lora)] text-sm text-ink">
      You&apos;re chatting about:{" "}
      <Link
        href={`/${ENTITY_TYPE_TO_PATH[entityType] ?? ""}/${encodeURIComponent(entitySlug)}`}
        className="font-medium text-clay underline underline-offset-2 hover:text-clay-mid"
      >
        {entityName || entitySlug}
      </Link>
    </p>
  </div>
)}
```

Add the path mapping constant near the top of the file (or just above its usage):
```typescript
const ENTITY_TYPE_TO_PATH: Record<string, string> = {
  fiction_characters: "characters",
  fiction_factions:   "factions",
  fiction_locations:  "locations",
  fiction_artifacts:  "artifacts",
  fiction_vaults:     "vaults",
  fiction_rules:      "rules",
};
```

**2c. Entity-specific suggestion chips** — in the empty-state render block (where
`SUGGESTIONS_BY_AGE_MODE[ageMode].map(...)` currently renders, ~line 679), add an early branch:
```tsx
{messages.length === 0 &&
  !(highlightIdFromUrl && highlightHydration === "loading") && (
  <div className="py-12 text-center">
    <p className="mb-4 text-sm text-ink-muted">
      {entitySlug
        ? `What would you like to know about ${entityName || entitySlug}?`
        : `What would you like to know about ${book.title}?`}
    </p>
    <div className="flex flex-wrap justify-center gap-2">
      {(entitySlug
        ? (ENTITY_SUGGESTIONS[entityType ?? ""] ?? ENTITY_SUGGESTIONS.default)(entityName || entitySlug)
        : SUGGESTIONS_BY_AGE_MODE[ageMode]
      ).map((suggestion) => (
        <button …>
```

Add the suggestions map constant near `SUGGESTIONS_BY_AGE_MODE`:
```typescript
const ENTITY_SUGGESTIONS: Record<string, (name: string) => string[]> = {
  fiction_characters: (name) => [
    `What role does ${name} play in the story?`,
    `How does ${name}'s arc develop across chapters?`,
    `What makes ${name} unique among the characters?`,
  ],
  fiction_factions: (name) => [
    `What does ${name} want to achieve?`,
    `Who leads ${name} and what are their goals?`,
    `How does ${name} affect the mission's outcome?`,
  ],
  fiction_locations: (name) => [
    `What happens at ${name} during the story?`,
    `Why is ${name} significant to the mission?`,
    `What is the history of ${name}?`,
  ],
  fiction_artifacts: (name) => [
    `What is ${name}?`,
    `How is ${name} used or discovered in the story?`,
    `What is the origin of ${name}?`,
  ],
  fiction_vaults: (name) => [
    `What is inside ${name}?`,
    `How was ${name} discovered, and by whom?`,
    `What role does ${name} play in the story?`,
  ],
  fiction_rules: (name) => [
    `What is the ${name}?`,
    `How does ${name} affect events in the story?`,
    `Are there known exceptions or loopholes in ${name}?`,
  ],
  default: (name) => [
    `What can you tell me about ${name}?`,
    `How does ${name} fit into the broader story?`,
    `What is the significance of ${name}?`,
  ],
};
```

**Checkpoint:** Navigate to `/characters/alara`, click "Ask about ALARA →". Confirm: (1) breadcrumb
shows "← ALARA" linking back to `/characters/alara`; (2) empty state reads "What would you like to
know about ALARA?"; (3) chips read "What role does ALARA play in the story?" etc. Test for a faction
and a location too.

## Content Considerations

No new wiki content, no new markdown files. All entity data is already loaded.

## Spoiler & Gating Impact

**No spoiler risk.** Under companion-first, all content is visible to all users. The entity-page CTAs
link to `/ask?entity=…` — no locked content is exposed by the CTA itself. The Ask companion's
existing "Reader Progress Gate" prompt block (always injected) protects against inadvertent spoilers
in AI responses. No change to gating logic.

All three paths:
- **Locked first-time reader:** CTA appears, Ask opens normally. Under companion-first, no content is
  locked, so no additional gate needed.
- **Re-reader (show_all_content on):** CTA appears, works identically.
- **Guest (cookie fallback):** CTA appears. Ask works for unauthenticated users (read-only mode).

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** No change to system prompt. The `entitySlug` is not sent to the API — this
  feature is purely a routing/UX improvement. (If entity-specific context injection into the AI is
  wanted later, add `entitySlug` to the API payload and thread it into `orchestrateAsk` args — but
  that is a follow-on, not part of this plan.)
- **Latency budget:** Zero added latency. No new API calls. Static chips rendered from a local map.
- **Conversation memory:** No change. Entity context is URL-only; no persistence needed.
- **Voice/TTS:** Not applicable.

## Testing

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (0 new errors)
- [ ] `npm test` — 192 pass
- [ ] Locked-reader path: entity CTA visible, Ask opens with entity chips, breadcrumb links back correctly
- [ ] Re-reader path: identical behavior (entity context is UX-only, no gating difference)
- [ ] Guest path: CTA visible on entity page; Ask opens (guests can use Ask in read-only mode)
- [ ] Character page: "Ask about ALARA →" appears, links with `entityType=fiction_characters`
- [ ] Faction page: "Ask about Rigel Protocol →" appears, links with `entityType=fiction_factions`
- [ ] Rules page: "Ask about Parables of Resonance →" appears, `entityType=fiction_rules`
- [ ] Vault page: "Ask about Giza Vault →" appears, `entityType=fiction_vaults`
- [ ] Breadcrumb resolves to correct entity page
- [ ] Entity-specific chips render correctly (3 per entity type, entity name interpolated)
- [ ] Fallback: `default` chips fire if an unknown `entityType` is passed

## Files Modified

1. `src/components/entities/FictionEntityViews.tsx` — add Ask CTA to `FictionEntityDetailPage` and
   `RuleDetailPage`
2. `src/app/characters/[slug]/page.tsx` — add Ask CTA below character `<h1>`
3. `src/app/ask/page.tsx` — read entity params, add entity breadcrumb, add entity-specific chips

## New Files

None.

## Database Changes

None.

## Dependencies

None. No new npm packages.

## Estimated Total: 2 hours
