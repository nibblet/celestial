# Dev Plan: [IDEA-108] Ask Reading Dwell Nudge
**Theme:** ask-forward

## What This Does
After a reader has been on a chapter page for 90 seconds with scroll activity detected (not idle), a non-modal floating pill bar appears fixed at the bottom of the viewport: "Ask about [Chapter Title] →" with a dismiss ×. Clicking routes to `/ask?story={storyId}`. A `sessionStorage` flag prevents the nudge from reappearing for that chapter in the same browser session.

This is a passive discovery mechanism — it activates only after confirmed reading engagement. Readers who haven't scrolled (idle tab) don't see it. Readers who dismiss once won't see it again that session.

## User Stories
- As a first-time reader who scrolls through CH04 for 90+ seconds: A subtle bar appears: "Ask about Chapter 4 →". If curious, I tap it. If not, I dismiss it once and it's gone for this session.
- As a re-reader (show_all_content on): Identical experience — nudge is not show_all_content-gated. The Ask page handles its own context.
- As a guest reader: Identical experience — sessionStorage requires no auth. Navigating to `/ask` works for guests under companion-first.
- As the author: Nudge appears on all 17 chapter pages, driving organic Ask discovery without intrusive popups.

## Implementation

### Phase 1: Foundation — New `AskDwellNudge` Component

1. Create `src/components/stories/AskDwellNudge.tsx`:
   ```tsx
   'use client';
   import Link from 'next/link';
   import { useEffect, useRef, useState } from 'react';

   interface Props {
     storyId: string;
     storyTitle: string;
   }

   const DWELL_MS = 90_000;
   const SESSION_KEY = (id: string) => `ask_nudge_${id}`;

   export function AskDwellNudge({ storyId, storyTitle }: Props) {
     const [visible, setVisible] = useState(false);
     const hasScrolled = useRef(false);
     const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

     useEffect(() => {
       if (sessionStorage.getItem(SESSION_KEY(storyId))) return;

       const onScroll = () => { hasScrolled.current = true; };
       window.addEventListener('scroll', onScroll, { passive: true });

       timerRef.current = setTimeout(() => {
         if (hasScrolled.current) setVisible(true);
       }, DWELL_MS);

       return () => {
         window.removeEventListener('scroll', onScroll);
         if (timerRef.current) clearTimeout(timerRef.current);
       };
     }, [storyId]);

     if (!visible) return null;

     function handleDismiss() {
       sessionStorage.setItem(SESSION_KEY(storyId), '1');
       setVisible(false);
     }

     return (
       <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm animate-fade-in">
         <Link
           href={`/ask?story=${storyId}`}
           className="text-[var(--color-ocean)] hover:underline whitespace-nowrap"
         >
           Ask about {storyTitle} →
         </Link>
         <button
           onClick={handleDismiss}
           aria-label="Dismiss"
           className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] leading-none"
         >
           ×
         </button>
       </div>
     );
   }
   ```

   Notes:
   - `{ passive: true }` on the scroll listener avoids any layout jank.
   - The timer clears on unmount (chapter navigation), so navigating between chapters resets the 90s counter.
   - If the reader never scrolls (idle tab open), the nudge never shows — the `hasScrolled` guard prevents false positives.
   - `animate-fade-in` assumes a utility class in `globals.css`; if absent, drop the class (the nudge will just appear instantly — acceptable).

2. Open `src/app/stories/[storyId]/page.tsx`:
   - Add import: `import { AskDwellNudge } from '@/components/stories/AskDwellNudge';`
   - Add `<AskDwellNudge storyId={storyId} storyTitle={story.title} />` as the last child before the closing root `</div>`. This is a fixed overlay so position in the JSX tree doesn't affect visual layout.

   **Checkpoint:** Run `npx next build`. Open a chapter page; after 90s of active scrolling a pill bar appears at the bottom. Clicking routes to `/ask?story=CH01`. Dismissing hides the bar and prevents reappearance in the same session.

### Phase 2: Polish

3. Open `src/app/globals.css` — verify `--color-surface-elevated`, `--color-border`, `--color-ocean`, `--color-text-muted`, `--color-text` are defined as CSS custom properties. If `animate-fade-in` is absent, add:
   ```css
   @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
   .animate-fade-in { animation: fade-in 0.3s ease; }
   ```
   If the CSS vars don't exist, fall back to Tailwind color utilities (`bg-zinc-900 border-zinc-700 text-teal-400`).

4. Run `npm run lint` — fix any warnings. Expect: 0 errors; possible `<Link>` nesting lint if `<a>` is used inside — ensure no nested anchors.

5. Run `npm test` — expect 192 pass, no changes. This feature has no server-side logic and no existing test coverage for client stories components.

## Content Considerations
- No wiki content changes.
- `storyTitle` comes from `story.title` — already fetched in `stories/[storyId]/page.tsx`. No additional data fetching needed.

## Spoiler & Gating Impact
- **Does not touch locked content.** The nudge is a navigation CTA only — it routes to `/ask?story={storyId}`. No content is rendered in the nudge itself.
- **Gate enforcement:** Under companion-first defaults, all users have access to all content. The Ask page applies its own context rules. No gating needed on the nudge.
- **All reader paths:** First-time reader, re-reader (`show_all_content=true`), and guest all see identical behavior. sessionStorage is client-side; no auth required.
- **Ask-filter impact:** None — the nudge creates no Ask query. It opens the Ask page exactly as clicking any other Ask CTA would.

## Theme-Specific Requirements (ask-forward)
- **Prompt changes:** None.
- **Latency budget:** N/A — pure client-side, zero API calls, zero network requests triggered by the nudge.
- **Conversation-memory storage model:** sessionStorage key `ask_nudge_{storyId}` — cleared on browser session end. Lightweight, no auth required.
- **Voice/TTS:** N/A.

## Testing
- [ ] `npx next build` passes (no TS errors)
- [ ] `npm run lint` — 0 errors, 0 new warnings
- [ ] `npm test` — 192 pass (0 regressions)
- [ ] First-time reader: nudge appears after 90s of scrolling a chapter page; routes to `/ask?story=CH01`
- [ ] Re-reader path: identical behavior
- [ ] Guest-cookie path: identical behavior (no auth check in component)
- [ ] Dismiss: bar disappears; reloading the same chapter in the same session does NOT re-show nudge (sessionStorage key set)
- [ ] New session (clear sessionStorage): nudge shows again after 90s of scroll
- [ ] Idle reader (no scroll): nudge does NOT appear even after 90s
- [ ] Chapter navigation: timer resets when navigating to a different chapter (component unmounts and remounts)

## Files Modified
- `src/app/stories/[storyId]/page.tsx` — add `<AskDwellNudge />` near return root

## New Files
- `src/components/stories/AskDwellNudge.tsx`

## Database Changes
None.

## Dependencies
None.

## Estimated Total: 1 hour
