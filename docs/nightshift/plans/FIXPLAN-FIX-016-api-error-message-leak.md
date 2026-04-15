# Fix: [FIX-016] API Routes Stream Raw Internal Error Messages to Client

## Problem
Both `/api/ask/route.ts` and `/api/tell/route.ts` stream the raw `Error.message` from Anthropic SDK exceptions directly to the browser as an SSE event. If the Anthropic API returns an error with a descriptive message (e.g. "Invalid API key", "Your credit balance is too low", content policy details, or rate limit info), that message is passed verbatim to every browser tab watching the stream.

The FIX-009 patch already fixed the equivalent leak in `/api/tell/draft/route.ts` (which returned `{ raw: rawText }` in the JSON body). This is the same pattern in the streaming paths.

## Root Cause
`src/app/api/ask/route.ts` line ~162:
```ts
const errorMessage = err instanceof Error ? err.message : "Unknown error";
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
```
`src/app/api/tell/route.ts` line ~163: identical pattern.

## Steps
1. Open `src/app/api/ask/route.ts`
2. In the `catch (err)` block inside the ReadableStream `start()` function, replace:
   ```ts
   const errorMessage = err instanceof Error ? err.message : "Unknown error";
   controller.enqueue(
     encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
   );
   ```
   with:
   ```ts
   console.error("[ask] Stream error:", err);
   controller.enqueue(
     encoder.encode(
       `data: ${JSON.stringify({ error: "Ask Keith is temporarily unavailable. Please try again." })}\n\n`
     )
   );
   ```
3. Open `src/app/api/tell/route.ts`
4. In the same `catch (err)` block, replace:
   ```ts
   const errorMessage = err instanceof Error ? err.message : "Unknown error";
   controller.enqueue(
     encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
   );
   ```
   with:
   ```ts
   console.error("[tell] Stream error:", err);
   controller.enqueue(
     encoder.encode(
       `data: ${JSON.stringify({ error: "Something went wrong composing the response. Please try again." })}\n\n`
     )
   );
   ```
5. Run `npm run build` to verify no breakage.

## Files Modified
- `src/app/api/ask/route.ts` — replace raw error message with generic user message + server-side log
- `src/app/api/tell/route.ts` — same

## Verify
- [ ] Build passes
- [ ] Lint passes
- [ ] On Anthropic API error: browser shows a friendly message, server logs show the real error
- [ ] Normal streaming chat still works end-to-end
