# Fix: [FIX-014] Tell Page Missing sendInFlightRef Guard

## Problem
`tell/page.tsx` uses `loading` React state to guard against double-submit in `sendMessage()`. React state updates are asynchronous — between the `setLoading(true)` call and the next re-render, a second submit (double-click or fast keyboard) can pass the `if (!messageText || loading) return;` check, firing two simultaneous API calls into the same assistant message bubble.

`ask/page.tsx` fixed this exact issue (commit `4b209d3`) by adding a synchronous `sendInFlightRef` — but the fix was never ported to `tell/page.tsx`.

Impact: Intermittent double-sends in Tell conversations that corrupt the assistant message (two responses streamed into one bubble). More likely on slow connections where button doesn't visually disable fast enough.

## Root Cause
`src/app/tell/page.tsx` guards with `if (!messageText || loading) return;` (line 45) but `loading` is React state — stale until re-render. `ask/page.tsx` demonstrates the fix.

## Steps

1. Open `src/app/tell/page.tsx`

2. The `useRef` import already exists (line 4). Add a ref declaration after `bottomRef`:
   ```ts
   // Before (line 37):
   const bottomRef = useRef<HTMLDivElement>(null);
   
   // After:
   const bottomRef = useRef<HTMLDivElement>(null);
   const sendInFlightRef = useRef(false);
   ```

3. Update the guard at the top of `sendMessage()` (line 45):
   ```ts
   // Before:
   if (!messageText || loading) return;
   
   // After:
   if (!messageText || sendInFlightRef.current) return;
   sendInFlightRef.current = true;
   ```

4. In the `finally` block of `sendMessage()` (line 123), add ref reset before `setLoading(false)`:
   ```ts
   // Before:
   } finally {
     setLoading(false);
   }
   
   // After:
   } finally {
     sendInFlightRef.current = false;
     setLoading(false);
   }
   ```

5. Run `npm run build` — should pass clean.
6. Run `npm run lint` — should pass clean.

7. Test:
   - Open `/tell`
   - Type a message and double-click Send very quickly
   - Verify only one user bubble and one assistant bubble appear

## Files Modified
- `src/app/tell/page.tsx` — adds `sendInFlightRef` for synchronous double-submit guard

## Verify
- [ ] Build passes
- [ ] Lint passes
- [ ] Double-clicking Send produces only one message pair
- [ ] Normal tell conversation flow unaffected
