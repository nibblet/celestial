# Dev Plan: [IDEA-084] Ask Home Hero Widget
**Theme:** ask-forward

## What This Does

Adds a text input form to the home page hero (`HomeHero.tsx`) that lets readers type a
question and navigate directly to the Ask companion with the question auto-submitted.
Extends `ask/page.tsx` by a new `?q=` search param that fires `sendMessage` on mount —
making Ask the primary entry action from the home page, not just a feature reachable from
story pages.

## User Stories

- As a first-time reader landing on the home page, I want to ask the companion a question
  immediately without hunting for a nav card or navigating to a separate page first.
- As a re-reader (`show_all_content` on), I want quick, frictionless access to the archive
  from the home page hero, bypassing the nav-card grid entirely.
- As the author, I want Ask to feel like the central surface of the app — visible and
  usable from the very first screen a reader sees.

## Implementation

### Phase 1: `ask/page.tsx` — `?q=` auto-submit param

1. Open `src/app/ask/page.tsx`

2. After line 244 (`const prefilledPrompt = getPreloadPrompt(...)`), add:
   ```typescript
   const quickQuestion = searchParams.get("q") ?? undefined;
   ```

3. After the `promptHydratedRef` declaration (line ~275), add:
   ```typescript
   const quickQFiredRef = useRef(false);
   ```

4. After the existing prompt pre-fill effect (line ~551), add a new effect:
   ```typescript
   useEffect(() => {
     if (
       !quickQuestion ||
       messages.length > 0 ||
       quickQFiredRef.current ||
       sendInFlightRef.current
     ) return;
     quickQFiredRef.current = true;
     void sendMessage(quickQuestion);
   }, [quickQuestion, messages.length, sendMessage]);
   ```

5. **Checkpoint:** Navigate to `/ask?q=Who+is+ALARA` in dev server — the question
   auto-submits on mount and streaming begins without any user action.

### Phase 2: `HomeHero.tsx` — Add Ask input widget

1. Open `src/components/home/HomeHero.tsx`

2. Add imports at the top (after `import { useEffect, useState } from "react";`):
   ```typescript
   import { useRouter } from "next/navigation";
   ```

3. Inside the `HomeHero` function body, after the existing `useState` declarations (~line 8),
   add:
   ```typescript
   const router = useRouter();
   const [query, setQuery] = useState("");

   function handleAskSubmit(e: React.FormEvent) {
     e.preventDefault();
     const q = query.trim();
     if (!q) return;
     router.push(`/ask?q=${encodeURIComponent(q)}`);
   }
   ```

4. In the JSX, locate the tagline `<p>` block (around line 57–59, ending in `</p>`). After
   the closing `</p>`, and before the closing `</div>` of the `.relative.z-10.mx-auto` div,
   add:
   ```tsx
   <form
     className="mx-auto mt-2 flex max-w-md gap-2"
     onSubmit={handleAskSubmit}
   >
     <input
       type="text"
       className="flex-1 rounded-lg border border-[rgba(168,242,240,0.25)] bg-[rgba(255,255,255,0.07)] px-4 py-2.5 text-[rgba(242,238,228,0.9)] placeholder-[rgba(242,238,228,0.35)] outline-none focus:border-[rgba(168,242,240,0.55)] focus:ring-0"
       placeholder="Ask anything about the universe…"
       value={query}
       onChange={(e) => setQuery(e.target.value)}
     />
     <button
       type="submit"
       disabled={!query.trim()}
       className="rounded-lg bg-[rgba(127,231,225,0.18)] px-4 py-2.5 text-sm text-[rgba(242,238,228,0.85)] transition hover:bg-[rgba(127,231,225,0.28)] disabled:opacity-40"
     >
       Ask →
     </button>
   </form>
   ```

5. **Checkpoint:** On `/`, the hero shows a frosted-glass text input in the hero section.
   Type "What is Valkyrie-1?" and click "Ask →" — navigates to `/ask?q=What+is+Valkyrie-1`
   and the question auto-submits, streaming begins.

### Phase 3: Verifications

1. Run `npx next build` (or `npm run build` if prebuild works in sandbox)
2. Run `npm run lint`
3. Manually verify the golden path and edge cases (see Testing section)

## Content Considerations

None — no wiki markdown, no content pipeline changes.

## Spoiler & Gating Impact

The `?q=` auto-submit sends the user's question through the existing `/api/ask` route, which
applies the full retrieval pipeline with reader progress gating exactly as it does for any
other Ask session. No new spoiler exposure path. All gating continues to happen server-side.

The widget is auth-agnostic by design: guests and authenticated readers both see it and both
receive Ask responses (guests get slightly less personalized context, which is the existing
behavior). No gating bypass.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None — the question submitted from the hero widget goes through the
  same `ask_answerer` path as all other Ask traffic.
- **Latency budget:** Auto-submit fires on mount; streaming response begins within ~1s.
  No additional latency introduced.
- **Conversation-memory storage model:** Unchanged — `cel_conversations` creation is the
  same as any other Ask session. The `?q=` param is only used to fire the first message;
  subsequent conversation state is managed identically.
- **Voice/TTS:** None.

## Testing

- [ ] `npx next build` passes
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm test` passes (192 tests unchanged — no new test coverage needed for JSX addition)
- [ ] Navigate to `/` — text input appears in hero section below the tagline
- [ ] Type "Who is ALARA?" and click "Ask →" — navigates to `/ask` and question
  auto-submits; streaming answer begins without any additional user action
- [ ] Empty input — "Ask →" button is visually disabled; clicking it does nothing
- [ ] Press Enter with non-empty input — same as clicking "Ask →"
- [ ] Navigate directly to `/ask?q=what+is+Valkyrie-1` — question auto-submits
  without any home page visit (the param path works standalone)
- [ ] Navigate to `/ask?q=...` a second time (browser back → forward) — `quickQFiredRef`
  prevents double-submission
- [ ] Locked-reader / guest path: guest user types in hero widget, gets navigated to
  `/ask`, Ask companion responds with general context (no auth required)
- [ ] Unlocked / re-reader path: authenticated `show_all_content` user — same widget,
  full Ask context available as normal
- [ ] Existing `?prompt=` pre-fill behavior unchanged (verify by navigating to
  `/ask?prompt=test` — input box pre-fills but does NOT auto-submit)

## Files Modified

- `src/app/ask/page.tsx` — add `quickQuestion` search param, `quickQFiredRef`, and
  auto-submit effect (~8 lines)
- `src/components/home/HomeHero.tsx` — add `useRouter` import, `query` state, submit
  handler, and form JSX (~35 lines)

## New Files

None.

## Database Changes

None.

## Verify

- [ ] Build and lint pass
- [ ] Hero widget visible on `/` home page
- [ ] Auto-submit fires on `/ask?q=...` navigation
- [ ] Empty input is disabled
- [ ] Existing `?prompt=` pre-fill behavior unchanged
- [ ] Guest path works without auth
