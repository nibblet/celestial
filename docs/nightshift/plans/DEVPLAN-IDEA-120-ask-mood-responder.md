# Dev Plan: [IDEA-120] Ask Mood Responder — Tone Intent Chips

**Theme:** ask-forward

## What This Does

Adds three small one-shot tone-intent chip buttons to the Ask page — "Factual 📚", "Speculative 🌌", "Emotional 🫀" — that append a register modifier to the next AI request's system prompt only. Selecting "Factual" sharpens the companion to precise canon; "Speculative" invites extrapolation; "Emotional" asks for felt resonance. The chip clears after each submission (one-shot, not persistent). Distinct from IDEA-105 (Brief Mode — controls length) and IDEA-093 (Character Voice Mode — controls persona). Zero new API routes, zero DB, zero npm packages.

## User Stories

- As a first-time reader, I want "What happened at the Resonant Pad?" to return sharp, citable facts — I select "Factual" and get a 2-sentence canon summary.
- As a re-reader (show_all_content on), I want to ask "What might ALARA's merge feel like from inside?" and get poetic speculation — I select "Speculative."
- As the author, the chips let me test companion tone range across factual/speculative/emotional registers without changing retrieval depth or data.

## Implementation

### Phase 1: Type updates (5 min)

1. Open `src/lib/ai/perspectives.ts`
2. Find the `PersonaPromptArgs` type definition (around line 71). Add field:
   ```typescript
   toneIntent?: "factual" | "speculative" | "emotional" | null;
   ```
3. Open `src/lib/ai/orchestrator.ts`
4. Find `OrchestrateAskArgs` type (around line 60). Add:
   ```typescript
   toneIntent?: "factual" | "speculative" | "emotional" | null;
   ```
5. In `buildPromptArgs()`, find where `PersonaPromptArgs` is constructed. Add `toneIntent: args.toneIntent ?? null` to the object literal.
6. **Checkpoint:** `npx tsc --noEmit` passes for these additions.

### Phase 2: Prompt modifier (5 min)

1. Open `src/lib/ai/perspectives.ts`
2. In `buildAskAnswererPrompt()` (around line 282), after any existing `briefMode` handling and before the function returns, add the tone modifier block:

```typescript
const TONE_MODIFIERS: Record<"factual" | "speculative" | "emotional", string> = {
  factual:
    "Respond with focused factual precision. Cite only what is documented in the canon record. Avoid speculative or emotional register.",
  speculative:
    "After addressing what the canon documents, freely speculate about implications, possibilities, and what might lie beyond the record. Mark speculation with 'Beyond the record:' prefix.",
  emotional:
    "Prioritise the emotional and experiential dimension of this. What does it feel like — for the crew, for ALARA, for the reader's understanding of what happened? Fact serves feeling here.",
};
if (args.toneIntent) {
  systemBlocks.push(`[Tone] ${TONE_MODIFIERS[args.toneIntent]}`);
}
```

3. **Checkpoint:** `npm test` still passes (192 tests, 0 failures) — no behaviour change on existing paths where `toneIntent` is undefined/null.

### Phase 3: API route — pass through (3 min)

1. Open `src/app/api/ask/route.ts`
2. After the existing destructuring of the POST body (find the line that destructures `briefMode` or `voiceCharacter` if IDEA-105/093 have shipped, otherwise near the top of the handler), add:
   ```typescript
   const VALID_TONE_INTENTS = ["factual", "speculative", "emotional"] as const;
   type ToneIntent = typeof VALID_TONE_INTENTS[number];
   const toneIntent: ToneIntent | null = VALID_TONE_INTENTS.includes(body.toneIntent)
     ? body.toneIntent
     : null;
   ```
3. Pass `toneIntent` to `orchestrateAsk()` alongside existing params.
4. **Checkpoint:** Unknown `toneIntent` values in the request body are silently normalised to `null` — no 400/422 surface.

### Phase 4: UI — chip row (7 min)

1. Open `src/app/ask/page.tsx`
2. Add state near other toggle states:
   ```typescript
   const [toneIntent, setToneIntent] = useState<"factual" | "speculative" | "emotional" | null>(null);
   ```
3. In `handleSubmit` (find where `briefMode` or other one-shot state is reset, else just after the POST body is dispatched), clear the chip:
   ```typescript
   setToneIntent(null);
   ```
4. In the input area, above or below the Brief Mode toggle (if IDEA-105 has shipped) or just above the submit button, add:

```tsx
{/* Tone Intent */}
<div className="flex gap-2 flex-wrap text-xs mt-1">
  {(
    [
      { key: "factual", label: "Factual 📚" },
      { key: "speculative", label: "Speculative 🌌" },
      { key: "emotional", label: "Emotional 🫀" },
    ] as const
  ).map(({ key, label }) => (
    <button
      key={key}
      type="button"
      onClick={() => setToneIntent((prev) => (prev === key ? null : key))}
      aria-pressed={toneIntent === key}
      className={[
        "px-2 py-0.5 rounded border transition-colors",
        toneIntent === key
          ? "border-[var(--color-ocean)] text-[var(--color-ocean)]"
          : "border-[var(--color-border)] text-[var(--color-ink-ghost)] hover:border-[var(--color-ocean)]",
      ].join(" ")}
    >
      {label}
    </button>
  ))}
</div>
```

5. Include `toneIntent` in the POST body object passed to `/api/ask`.
6. **Checkpoint:** Chips render below the input. Click toggles active state. Click again deselects. Submitting a message clears the selection. All three chips visible.

## Content Considerations

No wiki content changes. No new markdown files. No `<!-- generated:ingest -->` files touched. Voice guide (`content/voice.md`) is currently a stub — no conflict. Reconcile tone modifier wording with the voice guide when it is authored.

## Spoiler & Gating Impact

This feature affects **response register only**. The retrieval layer (`ask-retrieval.ts`), spoiler guard block in system prompts, and all `readerProgress`-based gating are completely untouched. The `toneIntent` modifier is appended as the last block in the system prompt, after all content and gating instructions. No spoiler risk. Works for guests (no auth check). Works for all users under companion-first.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** `buildAskAnswererPrompt()` gains a conditional `[Tone]` system block. Does not touch the spoiler-guard block, retrieval instructions, or voice/canon blocks.
- **Latency budget:** 0 ms added. One sentence appended to system prompt; no additional API call.
- **Conversation-memory storage model:** Not persisted — cleared on each submission by design. No localStorage, no DB column.
- **Voice/TTS considerations:** N/A for now.

## Testing

- [ ] `npm run build` passes
- [ ] `npm run lint` passes — 0 errors, 4 existing `<img>` warnings unchanged
- [ ] `npm test` passes — 192 / 0 fail
- [ ] **Locked-reader path:** Unauthenticated user sees chips; selects "Factual"; ask returns a fact-focused answer; chip clears after send.
- [ ] **Unlocked / re-reader path:** `show_all_content` reader sees the same chips; no behavioural difference from gating perspective.
- [ ] **Guest-cookie path:** Works — no auth dependency.
- [ ] Manual: Select "Factual" → ask "What is the Resonant Pad?" — response should be dry, citable, no speculation.
- [ ] Manual: Select "Speculative" → same question — response should include extrapolation.
- [ ] Manual: Select "Emotional" → same question — response should emphasise experiential/felt language.
- [ ] Manual: No chip selected → behaviour baseline unchanged.
- [ ] Manual: Chip clears after each send (not retained across messages).
- [ ] Manual: Invalid `toneIntent` value injected directly in request body → silently treated as `null` (server validation in route.ts).

## Files Modified

1. `src/lib/ai/perspectives.ts` — `PersonaPromptArgs` type + `buildAskAnswererPrompt()` tone block
2. `src/lib/ai/orchestrator.ts` — `OrchestrateAskArgs` type + `toneIntent` pass-through in `buildPromptArgs()`
3. `src/app/api/ask/route.ts` — destructure + validate `toneIntent` from request body; pass to `orchestrateAsk()`
4. `src/app/ask/page.tsx` — `toneIntent` state + chip row JSX + `setToneIntent(null)` on submit + POST body inclusion

## New Files

None.

## Database Changes

None.

## Verify

- [ ] Build, lint, tests pass
- [ ] Factual chip tightens answer to canon-only phrasing
- [ ] Speculative chip produces answer with extrapolation section
- [ ] Emotional chip produces answer with experiential/felt register
- [ ] Chip clears after each message submission
- [ ] No chip selected → identical behaviour to baseline (regression-free)

## Estimated Total: 20 minutes
