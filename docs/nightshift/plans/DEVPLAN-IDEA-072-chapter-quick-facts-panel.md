# Dev Plan: [IDEA-072] Chapter Quick-Facts Panel in Ask
**Theme:** ask-forward

## What This Does

When a reader opens the Ask page from a story page (`?story={storyId}`), a compact collapsible "Key Facts" card appears above the chat thread — showing the chapter's in-universe mission date range, primary location, and top 3 characters. The card remains visible while the reader chats, giving them quick reference context without leaving Ask. It disappears when no story context is set.

This complements IDEA-057 (context-aware welcome message + chips): IDEA-057 changes the *empty state*, while IDEA-072 adds a *persistent reference panel* that stays visible during the conversation.

## User Stories

- As a first-time reader on Ask from a story page: I see a "Key Facts" card reminding me of mission date, where the chapter takes place, and who the key characters are — helping me form better questions.
- As a re-reader (`show_all_content` on): the same card gives quick reference facts while I dig deeper with the companion.
- As the author: no change to authoring workflow; data comes entirely from `chapter_tags.json` + `mission_logs_inventory.json`, both already populated.

## Implementation

### Phase 1: Extend the `/meta` endpoint (1 file)

**File:** `src/app/api/stories/[storyId]/meta/route.ts`

Currently returns only `{ title }`. Extend to also return `quickFacts`:

```ts
import { getChapterTags } from "@/lib/wiki/chapter-tags";
import * as fs from "fs";
import * as path from "path";

// Inside the GET handler, after fetching story.title:
const tags = getChapterTags(storyId);
let missionDayRange: string | null = null;
try {
  const invPath = path.join(process.cwd(), "content/raw/mission_logs_inventory.json");
  if (fs.existsSync(invPath)) {
    const inv = JSON.parse(fs.readFileSync(invPath, "utf-8")) as {
      missionLogs?: Array<{ chapterId?: string; dateShipTime?: string }>;
    };
    const dayRe = /Mission Day\s+(\d+)/i;
    const days = (inv.missionLogs ?? [])
      .filter((l) => l.chapterId?.trim() === storyId)
      .flatMap((l) => {
        const m = (l.dateShipTime ?? "").match(dayRe);
        return m ? [parseInt(m[1], 10)] : [];
      })
      .sort((a, b) => a - b);
    if (days.length === 1) missionDayRange = `Mission Day ${days[0]}`;
    else if (days.length > 1) missionDayRange = `Mission Days ${days[0]}–${days[days.length - 1]}`;
  }
} catch { /* silent — quickFacts is decorative */ }

const primaryLocation = tags?.locations?.[0]?.slug ?? null;
const topChars = (tags?.characters ?? [])
  .sort((a, b) => {
    const order = { lead: 0, supporting: 1, mentioned: 2 };
    return (order[a.presence] ?? 9) - (order[b.presence] ?? 9);
  })
  .slice(0, 3)
  .map((c) => c.slug);

return NextResponse.json({
  title: story.title,
  quickFacts: { missionDayRange, primaryLocation, topCharacterSlugs: topChars },
});
```

**Note:** If IDEA-057 ships first, this change merges into the same route extension. The two responses are independent JSON fields — no conflict. The `chapterWelcome` field from IDEA-057 and the `quickFacts` field from IDEA-072 coexist cleanly.

### Phase 2: New component (1 new file)

**New file:** `src/components/ask/ChapterQuickFactsPanel.tsx`

```tsx
"use client";

interface QuickFacts {
  missionDayRange: string | null;
  primaryLocation: string | null;
  topCharacterSlugs: string[];
}

export function ChapterQuickFactsPanel({
  storyTitle,
  facts,
}: {
  storyTitle: string;
  facts: QuickFacts;
}) {
  const items: { label: string; value: string; href?: string }[] = [];
  if (facts.missionDayRange) items.push({ label: "When", value: facts.missionDayRange });
  if (facts.primaryLocation)
    items.push({
      label: "Where",
      value: facts.primaryLocation.replace(/-/g, " "),
      href: `/locations/${facts.primaryLocation}`,
    });
  if (facts.topCharacterSlugs.length > 0)
    items.push({
      label: "Who",
      value: facts.topCharacterSlugs.map((s) => s.replace(/-/g, " ")).join(", "),
    });

  if (items.length === 0) return null;

  return (
    <details className="mb-3 rounded-lg border border-[var(--color-border)] bg-warm-white text-sm open:mb-4" open>
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-ghost">
        {storyTitle} — Key Facts
      </summary>
      <ul className="divide-y divide-[var(--color-border)] px-3 pb-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-baseline gap-2 py-1.5">
            <span className="w-10 shrink-0 text-xs text-ink-ghost">{item.label}</span>
            {item.href ? (
              <a href={item.href} className="capitalize text-ink hover:text-ocean hover:underline">
                {item.value}
              </a>
            ) : (
              <span className="capitalize text-ink">{item.value}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
```

### Phase 3: Wire into Ask page (1 file)

**File:** `src/app/ask/page.tsx`

1. Add `quickFacts` state alongside `contextStoryTitle`:
   ```ts
   const [quickFacts, setQuickFacts] = useState<{
     missionDayRange: string | null;
     primaryLocation: string | null;
     topCharacterSlugs: string[];
   } | null>(null);
   ```

2. In the existing `useEffect` that fetches `/api/stories/{storyId}/meta` (~line 366), extend the response parsing:
   ```ts
   .then((d: { title?: string; quickFacts?: { missionDayRange: string | null; primaryLocation: string | null; topCharacterSlugs: string[] } } | null) => {
     if (!cancelled) {
       if (d?.title) setContextStoryTitle(d.title);
       if (d?.quickFacts) setQuickFacts(d.quickFacts);
     }
   })
   ```
   And clear on unmount/slug change:
   ```ts
   setQuickFacts(null); // in the !storySlug early-return branch
   ```

3. Import the component:
   ```ts
   import { ChapterQuickFactsPanel } from "@/components/ask/ChapterQuickFactsPanel";
   ```

4. Render the panel directly above the chat thread (approximately line 649, after the story breadcrumb block and before the messages container):
   ```tsx
   {contextStoryTitle && quickFacts && (
     <ChapterQuickFactsPanel storyTitle={contextStoryTitle} facts={quickFacts} />
   )}
   ```

**Checkpoint:** After Phase 3, navigate to `/ask?story=CH01`. The card should appear showing "Mission Days 43–XX", "Where: mars", "Who: galen-voss, thane-meric, aven-voss". Collapse it via the `<details>` toggle.

## Content Considerations

No new wiki content required. All data sourced from existing `chapter_tags.json` and `mission_logs_inventory.json`. The panel reads slugs from those files and renders them without lookup — location and character names are the slug with hyphens replaced by spaces. For a richer display (capitalized canonical names), `getStaticData()` could be used to resolve display names, but that adds latency and complexity — slug-based display is sufficient for v1.

## Spoiler & Gating Impact

**No spoiler risk.** Under companion-first defaults, all content is unlocked for all users. The quick-facts data (mission day, location slug, character slugs) is world-building metadata, not narrative text. Even if gating were active, this data is analogous to "what chapter is this" metadata shown on the story page itself.

The panel only appears when `storySlug` is set in the URL — it is invisible when Ask is opened without a story context. Guests and unauthenticated users are not served the Ask page (auth required by the middleware → `/login` redirect), so no guest path needed.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None. The quick-facts panel is a client-side UI addition only; it does not inject additional context into the AI system prompt. Mission day and location context is already in the AI's context pack via `getMissionTimelineContext()` and `ask-retrieval.ts` story context.
- **Latency budget:** The `quickFacts` data is fetched alongside the existing `contextStoryTitle` in the same API call — zero additional network requests.
- **Conversation-memory storage model:** N/A — the panel is purely UI-side, no storage changes.
- **Voice/TTS considerations:** None.

## Dependency

- **IDEA-057 (context-aware welcome message):** Both ideas extend `/api/stories/[storyId]/meta`. If IDEA-057 ships first, Phase 1 of this plan merges into that route update (add `quickFacts` alongside the `chapterWelcome` response field). The component and page wiring are independent regardless of order.
- The panel can be implemented whether or not IDEA-057 has shipped — Phase 1 can stand alone.

## Files Modified

1. `src/app/api/stories/[storyId]/meta/route.ts` — add `quickFacts` to response
2. `src/app/ask/page.tsx` — add state, extend fetch parse, render panel

## New Files

1. `src/components/ask/ChapterQuickFactsPanel.tsx` — new panel component

## Database Changes

None.

## Testing

- [ ] `npm run build` passes (or `node_modules/.bin/next build`)
- [ ] `npm run lint` passes
- [ ] `npm test` passes (no new tests required — component logic is presentational and not testable without DOM; API extension is a read-only data projection)
- [ ] Manual: `/ask?story=CH01` shows "Key Facts" card with mission day range, primary location, top characters
- [ ] Manual: `/ask` (no story) shows NO quick-facts card
- [ ] Manual: `/ask?story=CH17` shows CH17-specific facts (different mission day, different characters)
- [ ] Manual: clicking the `<details>` summary collapses/expands the card
- [ ] Manual: primary location renders as a link to `/locations/{slug}`
- [ ] Manual: IDEA-057 co-existence — if chapterWelcome chips are present, both render without conflict

## Estimated Total: 1.5 hours

(Reduces to ~45 min if IDEA-057 ships first and the meta route extension is already done)
