# Dev Plan: [IDEA-015] Deep Ask Activation — Enable Multi-Perspective Responses

## What This Does
The multi-perspective Ask orchestrator is fully implemented and feature-flagged behind
`ENABLE_DEEP_ASK=true`. When active, reflective/personal/guidance questions trigger
a 3-call pipeline:

1. **Storyteller** — responds from the narrative/memory angle (512 tokens)
2. **Principles Coach** — responds from the leadership/values angle (512 tokens)
3. **Synthesizer** (streamed) — weaves both perspectives into one voice (1024 tokens)

"Simple" factual/list questions still route through the single-call simple path.
The classifier (recently inverted) defaults to "deep" for all non-factual questions.

This feature is production-ready but held behind the env var. This plan outlines
what to evaluate before enabling it and how to activate it safely.

## User Stories
- As a grandchild asking "How did Keith handle failure?", I want a rich, multi-layered
  answer that covers both the personal story and the life lesson — not just one dimension.
- As a family member exploring values, I want Keith's voice to feel like a wise elder
  drawing from both experience and principle, not a simple Q&A lookup.

## Why It Matters
The simple path works, but for reflective questions the deep path is qualitatively
different. It mirrors how a real mentor might answer — first placing you in the story,
then surfacing what it means. The synthesizer then weaves them together.

## Cost Analysis

**Simple path:** 1 Claude Sonnet call × 1024 max tokens → ~$0.003–0.006 per question

**Deep path:** 3 Claude Sonnet calls:
- Storyteller: 512 max tokens → ~$0.002–0.003
- Principles coach: 512 max tokens → ~$0.002–0.003
- Synthesizer: 1024 max tokens → ~$0.003–0.006
- Total per deep question: ~$0.007–0.012 (roughly 2–3× simple)

With rate limiting at 20 req/min per user, max theoretical cost is bounded.
Family is small (invite-only) — real usage volume is low. The quality gain
justifies the cost at this scale.

## Implementation

### Step 1: Review Perspective Prompts
Before enabling, read `src/lib/ai/perspectives.ts` to verify `buildStorytellerPrompt`,
`buildPrinciplesCoachPrompt`, and `buildSynthesizerPrompt` produce good results.
Do a manual test by running the deep path locally with `ENABLE_DEEP_ASK=true`.

### Step 2: Set Env Var Locally
In `.env.local`, add:
```
ENABLE_DEEP_ASK=true
```
Test 3–5 questions — 2 simple (date lookups), 3 reflective (advice/guidance). Verify:
- Simple questions still use single path
- Reflective questions use deep path without visible latency spike

### Step 3: Check Latency
The deep path fires 2 API calls in parallel before streaming begins. Expect ~1–2s
additional latency before the stream starts. This is acceptable for reflective
questions (users expect thoughtful answers to take a moment).

If latency is unacceptable, there are two mitigations:
- Show a "Gathering perspectives…" skeleton/indicator while the parallel calls run
- Lower `max_tokens` on storyteller/principles calls (256 is sufficient for sub-prompts)

### Step 4: Deploy to Vercel
In Vercel project settings → Environment Variables:
- Add `ENABLE_DEEP_ASK=true` to Production and Preview environments.
- Trigger a redeploy.

### Step 5 (Optional): Add Loading Indicator for Deep Questions
The Ask page (`src/app/ask/page.tsx`) shows a typing indicator during streaming.
Consider showing "Reflecting on this from a few angles…" while the deep path's
parallel calls run (before the stream starts). This is cosmetic but improves UX.

**File:** `src/app/ask/page.tsx`
After the API call starts but before the first SSE chunk:
- The API response includes a `depth` field in the non-streaming header (if implemented)
- OR: Show the indicator for all questions, since it only appears for 1–2s.

### Step 6 (Optional): Expose depth in API response
`src/app/api/ask/route.ts` currently streams SSE. Consider adding a first SSE event:
```
data: {"type":"depth","value":"deep"}
```
The Ask page could then update its loading indicator text based on the depth.

## Files to Read First
- `src/lib/ai/perspectives.ts` — the storyteller/coach/synthesizer prompts
- `src/lib/ai/orchestrator.ts` — the orchestration logic
- `src/lib/ai/classifier.ts` — the depth classifier
- `src/app/api/ask/route.ts` — where orchestrateAsk() is called

## Files to Modify
- `.env.local` — add `ENABLE_DEEP_ASK=true` locally for testing
- Vercel env vars — set `ENABLE_DEEP_ASK=true` in production
- (Optional) `src/app/ask/page.tsx` — add loading indicator text

## Testing
- [ ] Build passes
- [ ] `ENABLE_DEEP_ASK=true` set locally
- [ ] Simple question ("When did Keith work at IBM?") → single path, fast response
- [ ] Reflective question ("How did Keith handle a difficult decision?") → deep path, richer response
- [ ] Rate limit still fires after 20 requests
- [ ] No errors in Vercel runtime logs after deploy

## Dependencies
- `src/lib/ai/perspectives.ts` must exist and be well-tested (verify quality before enabling)
- Rate limiting already in place (FIX-004, resolved)

## Estimated Total: 30 min (eval + env var) to 2 hours (with loading indicator enhancement)
