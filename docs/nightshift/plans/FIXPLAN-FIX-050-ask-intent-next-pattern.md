# Fix: [FIX-050] Overly Broad `/\bnext\b/` Pattern in `ask-intent.ts` Misclassifies Factual Questions

## Problem
`src/lib/ai/ask-intent.ts` has `/\bnext\b/i` in `FUTURE_PATTERNS`. This matches any question containing the word "next" — including clearly factual queries such as:
- "Who is next in the command hierarchy?" (factual → wrongly classified as `future_speculation`, confidence 0.78)
- "What chapter comes next?" (factual → wrongly classified)
- "What happens at the next vault node?" (contextual → wrongly classified)

When misclassified, the rendered context pack sent to the AI includes `Intent: future_speculation (asks about future or next possibilities)`, which can subtly bias the AI toward speculative framing on questions the reader intends as factual lookups.

**Severity: Low — answers remain generally correct due to AI judgment, but intent metadata is misleading and confidence scoring is slightly skewed.**

## Root Cause
`ask-intent.ts` FUTURE_PATTERNS already has a specific `/\bwhat happens next\b/i` pattern for the canonical "what happens next?" phrasing, making the generic `/\bnext\b/i` redundant and over-broad. It fires on "next" in any context.

File: `src/lib/ai/ask-intent.ts`, line 35.

```ts
const FUTURE_PATTERNS = [
  /\bwhat might happen\b/i,
  /\bwhat happens next\b/i,
  /\bwhat could happen\b/i,
  /\bfuture\b/i,
  /\bnext\b/i,   // ← too broad; remove this line
];
```

## Steps

1. Open `src/lib/ai/ask-intent.ts`.

2. Remove the `/\bnext\b/i` entry from `FUTURE_PATTERNS`:
   ```diff
   const FUTURE_PATTERNS = [
     /\bwhat might happen\b/i,
     /\bwhat happens next\b/i,
     /\bwhat could happen\b/i,
     /\bfuture\b/i,
   -  /\bnext\b/i,
   ];
   ```
   The `/\bwhat happens next\b/i` pattern above already covers the primary "what happens next" phrasing. The `/\bfuture\b/i` pattern covers forward-looking questions that use the word "future". No coverage is lost.

3. Open `src/lib/ai/ask-intent.test.ts` and add a regression test confirming factual "next" questions are not misclassified:
   ```ts
   test("classifyAskIntent does not misclassify 'next in command' as future speculation", () => {
     const intent = classifyAskIntent("Who is next in the command hierarchy?");
     expect(intent.kind).not.toBe("future_speculation");
   });
   ```

4. Run `npm test` — expect 193 (or higher) passing tests, 0 failures.

5. Run `npm run lint` — expect 0 errors.

## Files Modified
- `src/lib/ai/ask-intent.ts` (1-line deletion)
- `src/lib/ai/ask-intent.test.ts` (1 new test)

## New Files
None.

## Database Changes
None.

## Verify
- [ ] Build passes
- [ ] Lint passes
- [ ] New test passes; existing intent tests unchanged
- [ ] `classifyAskIntent("Who is next in command?")` no longer returns `future_speculation`
- [ ] `classifyAskIntent("What happens next?")` still returns `future_speculation` (covered by specific pattern)
- [ ] `classifyAskIntent("What might happen in future vaults?")` still returns `future_speculation`
