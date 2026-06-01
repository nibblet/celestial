# Dev Plan: [IDEA-129] Ask Greeting Personalization

**Theme:** ask-forward

## What This Does

When the Ask page loads with no `?story=` context and zero messages, the static generic welcome text adapts to:
1. **Time of day** — "Good morning, archivist." / "Good afternoon, archivist." / "Good evening, archivist." / "The archive never sleeps."
2. **Returning reader** — if `localStorage` key `celestial_last_ask_date` matches today's date string, a "Back again." prefix is prepended, acknowledging ongoing engagement.

All client-side via `useEffect`. Zero API calls, zero DB changes, zero new npm packages. ~15 lines total in `ask/page.tsx`.

## User Stories

- As a first-time-today reader (no story context): I see a time-appropriate greeting that makes the companion feel responsive and alive, not like a static page.
- As a returning reader who has already used Ask today: I see "Back again. Good evening, archivist." — a warm acknowledgment without being sycophantic.
- As a re-reader (`show_all_content` on): Same behavior — no special re-reader copy needed; the time/date variants apply universally.
- As a guest (unauthenticated): Same behavior — `localStorage` is client-only, no auth required.
- As the author: Sees same behavior as any reader.

## Implementation

### Phase 1: Greeting state + useEffect (~15 lines in `ask/page.tsx`)

1. Open `src/app/ask/page.tsx`.

2. Add a `greeting` state variable near the top of the component (after existing state declarations):
   ```ts
   const [greeting, setGreeting] = useState<string>('What would you like to explore in the universe of Celestial?');
   ```

3. Add a `useEffect` that fires once on mount to compute and set the greeting:
   ```ts
   useEffect(() => {
     const hour = new Date().getHours();
     const todayStr = new Date().toDateString();
     const isReturning = localStorage.getItem('celestial_last_ask_date') === todayStr;
     localStorage.setItem('celestial_last_ask_date', todayStr);
     const timeGreeting =
       hour >= 5 && hour < 12  ? 'Good morning, archivist.' :
       hour >= 12 && hour < 18 ? 'Good afternoon, archivist.' :
       hour >= 18 && hour < 22 ? 'Good evening, archivist.' :
                                 'The archive never sleeps.';
     const prefix = isReturning ? 'Back again. ' : '';
     setGreeting(`${prefix}${timeGreeting} What would you like to explore?`);
   }, []);
   ```
   Dependency array is empty `[]` — fires once on mount, no re-runs.

4. In the empty-state render block (currently around `ask/page.tsx` lines 672–691), locate the no-story / no-messages branch:
   - The condition to find: `!storySlug && !prefilledPrompt && !urlPassage && messages.length === 0` (or equivalent logic that shows the generic welcome)
   - Replace the hardcoded welcome `<p>` text with `{greeting}`.
   - Example: if current code is `<p>What would you like to explore in the universe of Celestial?</p>`, replace with `<p>{greeting}</p>`.

5. The `greeting` state starts with a sensible fallback (the original generic copy) so SSR and the first client render before `useEffect` fires are identical — no hydration mismatch.

6. **Checkpoint:** Load `/ask` (no params). Verify the time-appropriate greeting appears. Set localStorage `celestial_last_ask_date` to yesterday's date string (via DevTools console), reload — verify no "Back again." prefix. Set it to today's date string, reload — verify "Back again." prefix appears.

7. Confirm the greeting does NOT appear when `?story=CH01` is set (that path is handled by IDEA-057 and shows the chapter-specific welcome). Confirm the greeting appears above the IDEA-102 chapter discovery grid when that ships.

## Files Modified
- `src/app/ask/page.tsx` — 1 new state var + 1 new `useEffect` + 1 template-text substitution in empty-state render (~15 lines total)

## New Files (if any)
None.

## Database Changes (if any)
None.

## Spoiler & Gating Impact
No spoiler concern. This feature touches only the generic welcome text in the empty state before any query is made. No content, no entity names, no story data is surfaced. The greeting text is hardcoded copy authored here — it references no wiki content.

Companion-first model: all content visible to all users; gating not applicable to this feature.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None — greeting personalization is UI-only; it does not modify any AI system prompt or POST body.
- **Latency budget:** Zero API calls; greeting is set in a synchronous `useEffect` on mount. Imperceptible latency.
- **Conversation-memory storage model:** One `localStorage` key (`celestial_last_ask_date`) storing a date string. Read/write on mount. No cross-session conversation data stored.
- **Voice/TTS considerations:** N/A for this feature.

## Testing
- [ ] `npm run lint` — no errors
- [ ] `npx next build` — passes
- [ ] `npm test` — 192 tests pass
- [ ] Load `/ask` at morning hours (5–11) → verify "Good morning, archivist." in welcome text
- [ ] Load `/ask` at night hours (22–4) → verify "The archive never sleeps." in welcome text
- [ ] Clear `celestial_last_ask_date` from localStorage, load `/ask` → verify no "Back again." prefix
- [ ] Set `celestial_last_ask_date` to `new Date().toDateString()` in DevTools, reload → verify "Back again." prefix
- [ ] Load `/ask?story=CH01` → confirm greeting does NOT appear (IDEA-057 branch, not touched by this change)
- [ ] No hydration mismatch warning in console (initial render uses fallback copy before `useEffect` fires)

## Dependencies
None — no prerequisite features required.

## Estimated Total: 15 minutes
