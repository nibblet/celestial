# Fix: [FIX-014] Tell Page SSE State Mutation (Strict Mode Double-Append Risk)

## Problem
`tell/page.tsx` accumulates streaming text from the AI interviewer using a mutable state update pattern. During each SSE chunk, it calls:

```js
setMessages((prev) => {
  const updated = [...prev];
  const last = updated[updated.length - 1];
  if (last.role === "assistant") {
    last.content += data.text;  // ← mutates the object
  }
  return updated;
});
```

`[...prev]` creates a shallow copy of the array, but the `Message` objects inside are still the same references. Mutating `last.content` modifies the object that React already holds. In React 19 Strict Mode (enabled by Next.js in dev), state updaters may be invoked twice with the same `prev` reference, which would append each SSE chunk twice — producing doubled or garbled AI responses in development. While the production build doesn't double-invoke, the pattern is fragile and violates React's immutability contract.

`ask/page.tsx` already uses the correct immutable batching pattern (fixed as part of broader SSE improvements). The Tell page was not updated at the same time.

## Root Cause
`src/app/tell/page.tsx`, inside the SSE processing loop (lines 98–105), uses in-place mutation instead of returning a new object.

## Steps

1. Open `src/app/tell/page.tsx`

2. In `sendMessage()`, find the SSE processing loop. Change from the per-chunk mutation approach to the batching approach used in `ask/page.tsx`:

**Before** (inside the `for (const line of lines)` loop):
```js
if (data.text) {
  setMessages((prev) => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    if (last.role === "assistant") {
      last.content += data.text;
    }
    return updated;
  });
}
```

**After** — accumulate text in a batch variable, then do one immutable setState per read loop iteration:

Replace the entire inner `while (true)` loop with this pattern:

```js
let buffer = "";
while (true) {
  const { done, value } = await reader.read();
  if (value) {
    buffer += decoder.decode(value, { stream: true });
  }
  if (done) {
    buffer += decoder.decode();
  }

  const lines = buffer.split("\n");
  buffer = done ? "" : (lines.pop() ?? "");

  let sseTextBatch = "";
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    try {
      const data = JSON.parse(line.slice(6));
      if (data.error) {
        setError(data.error);
        break;
      }
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
      if (typeof data.text === "string" && data.text.length > 0) {
        sseTextBatch += data.text;
      }
    } catch {
      // Malformed SSE line — skip
    }
  }

  if (sseTextBatch) {
    // Immutable update: create new array + new object so React Strict Mode
    // double-invocation doesn't double-append the chunk.
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== "assistant") return prev;
      return [
        ...prev.slice(0, -1),
        { ...last, content: last.content + sseTextBatch },
      ];
    });
  }

  if (done) break;
}
```

3. Run `npm run build` — should pass with no changes.

4. Run `npm run lint` — should pass clean.

5. Test manually: open `/tell`, send a few messages, confirm AI responses stream in correctly without duplication. Check browser console for errors.

## Files Modified
- `src/app/tell/page.tsx` — replace mutable per-chunk setState with immutable batched setState in the SSE read loop

## Verify
- [ ] Build passes
- [ ] Lint passes clean
- [ ] Streaming AI responses in `/tell` appear correctly (no doubled text)
- [ ] `sessionId` is still set correctly on first response (the `data.sessionId` branch remains)
- [ ] Error handling still works: trigger 429 to confirm error state displays
