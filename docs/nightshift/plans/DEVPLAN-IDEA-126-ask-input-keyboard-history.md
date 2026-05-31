# Dev Plan: [IDEA-126] Ask Input Keyboard History — Up/Down Arrow Key Question Recall

**Theme:** ask-forward

## What This Does

Pressing the Up arrow key in the Ask text input while the input contains no newlines cycles backward through questions submitted in the current session (most recent first). Down arrow advances forward. Standard shell/REPL history behavior. A `historyRef` accumulates submitted questions on each `handleSubmit`; a cursor ref tracks position. Any typing while in history mode exits navigation and keeps the current text.

## User Stories

- As a first-time reader, I type a question, get an answer, then want to ask a variation — I press Up, see my previous question prefilled, tweak it, and submit.
- As a re-reader (show_all_content on), I cycle through 5 questions I asked this session to revisit the context of each answer.
- As the author testing Ask, I press Up/Up/Up to replay a test question sequence without retyping.

## Implementation

### Phase 1: Refs and History Push

1. Open `src/app/ask/page.tsx`
2. Near the existing `useRef` declarations (search for `useRef` — currently `inputRef`, `streamRef`, etc.), add:

```tsx
const historyRef = useRef<string[]>([]);
const historyCursorRef = useRef<number>(-1);
const historyDraftRef = useRef<string>('');
```

3. In `handleSubmit` (locate by searching `handleSubmit`), after validating `inputText` is non-empty and before clearing the input, prepend to history:

```tsx
// Push to in-session history (max 10 entries)
historyRef.current = [inputText, ...historyRef.current].slice(0, 10);
historyCursorRef.current = -1;
```

**Checkpoint:** Build passes. No visible change yet.

### Phase 2: KeyDown Handler

4. Add the `handleInputKeyDown` callback (co-locate with other `useCallback` handlers):

```tsx
const handleInputKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const history = historyRef.current;
    if (!history.length) return;
    // Only intercept when no newlines in the current text
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !inputText.includes('\n')) {
      e.preventDefault();
      if (e.key === 'ArrowUp') {
        if (historyCursorRef.current === -1) {
          historyDraftRef.current = inputText;
          historyCursorRef.current = 0;
        } else if (historyCursorRef.current < history.length - 1) {
          historyCursorRef.current++;
        }
        setInputText(history[historyCursorRef.current]);
      } else {
        // ArrowDown
        if (historyCursorRef.current > 0) {
          historyCursorRef.current--;
          setInputText(history[historyCursorRef.current]);
        } else if (historyCursorRef.current === 0) {
          historyCursorRef.current = -1;
          setInputText(historyDraftRef.current);
        }
      }
    } else if (historyCursorRef.current !== -1 && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
      // Any other key while in history mode: exit history mode, keep current text
      historyCursorRef.current = -1;
    }
  },
  [inputText]
);
```

5. Attach to the `<textarea>` for the Ask input (around line 595 — the main message input, not the search field). Search for `<textarea` in `ask/page.tsx` and add `onKeyDown={handleInputKeyDown}` to the Ask submission textarea.

**Checkpoint:** Build passes. Press Up in an empty Ask input after submitting one question — the question reappears. Press Down — input clears. Press Up twice after 2 submissions — second most recent appears.

### Phase 3: Verify and Polish

6. Confirm behavior when input has newlines (multi-line text): Up/Down do NOT navigate history (the `!inputText.includes('\n')` guard fires first). Normal textarea caret behavior preserved.
7. Confirm cursor resets to -1 after submission so next Up starts at most-recent item.
8. Run `npm run build` (or `npx next build`).
9. Run `npm run lint`.
10. Manual verification: open `/ask`, type "What is ALARA?", submit, type "Who is Jonah?", submit. Press Up → "Who is Jonah?", Up again → "What is ALARA?", Down → "Who is Jonah?", Down → empty. Type mid-navigation → exits history mode.

## Files Modified

- `src/app/ask/page.tsx` — ~25 lines added (3 refs + history push in `handleSubmit` + `handleInputKeyDown` callback + `onKeyDown` prop on textarea)

## New Files

None.

## Database Changes

None.

## Verify

- [ ] Build passes
- [ ] Lint passes (0 errors)
- [ ] Up/Down navigation cycles through submitted questions in session
- [ ] Multi-line input: Up/Down navigates textarea caret normally (no history intercept)
- [ ] History resets to most-recent on new submission
- [ ] Guest path: works identically (no auth dependency)
- [ ] Re-reader path: works identically

## Notes

- Works for all users (guests, authenticated, re-reader) — no auth dependency
- History is ephemeral (session-only, `useRef` — not `useState`) — no re-renders on history push
- Max 10 history entries to bound memory
- The `onKeyDown` guard `!inputText.includes('\n')` is the key safety valve — never blocks multi-line editing
- Distinct from IDEA-066 (cross-session resume — localStorage + Supabase) — this is in-session only

## Estimated Total: 15 minutes
