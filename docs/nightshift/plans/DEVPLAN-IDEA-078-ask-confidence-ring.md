# Dev Plan: [IDEA-078] Ask Response Confidence Ring — Grounding Signal on Answer Bubbles
**Theme:** ask-forward

## What This Does

Adds a subtle left-border accent to each Ask assistant message bubble, derived from the number of in-app wiki links cited in `linksInAnswer` (already present in every `done` SSE event). Full accent = 3+ wiki links cited; muted accent = 1–2 links; no accent = zero links (ungrounded or sparse answers). Gives readers a non-intrusive visual trust signal without exposing raw retrieval metadata.

## User Stories

- As a first-time reader, I glance at the left edge of each answer and see at a glance how wiki-grounded the response was — a thicker accent means "the archive has a lot on this."
- As a re-reader (show_all_content on), I use the accent to distinguish canon-dense answers from synthesized inferences while exploring the full lore.
- As the author, I can quickly tell when demo answers are pulling from the wiki vs. generating from context — useful during prompt tuning.

## Implementation

### Phase 1: Client-Only Change to `ask/page.tsx`

The only file to change is `src/app/ask/page.tsx`. No new imports, no new files, no API changes, no DB changes.

1. Open `src/app/ask/page.tsx`

2. Locate the assistant bubble `<div>` at approximately **line 698–703**:
   ```tsx
   <div
     className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
       msg.role === "user"
         ? "bg-clay text-warm-white"
         : "border border-[var(--color-border)] bg-warm-white text-ink"
     }`}
   >
   ```

3. Replace with a version that computes a left-border accent class for assistant messages with evidence:
   ```tsx
   <div
     className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
       msg.role === "user"
         ? "bg-clay text-warm-white"
         : `border bg-warm-white text-ink ${
             msg.evidence
               ? msg.evidence.linksInAnswer.length >= 3
                 ? "border-l-[3px] border-[var(--color-border)] border-l-[var(--color-ocean)]"
                 : msg.evidence.linksInAnswer.length >= 1
                 ? "border-l-[3px] border-[var(--color-border)] border-l-[var(--color-clay)]/50"
                 : "border border-[var(--color-border)]"
               : "border border-[var(--color-border)]"
           }`
     }`}
   >
   ```

   Logic:
   - `linksInAnswer.length >= 3` → strong ocean-colored left border (well-grounded)
   - `linksInAnswer.length >= 1` → muted clay-colored left border at 50% opacity (partially grounded)
   - `linksInAnswer.length === 0` OR no evidence yet → standard border (same as today)

   **Note:** Verify that `--color-ocean` is defined in `src/app/globals.css` before executing. If not, use a Tailwind color token (e.g., `border-l-teal-400`) as a fallback. `--color-clay` is confirmed defined (used in the user bubble background).

4. **Checkpoint:** Run `npm run lint` — the change is JSX template-literal only, no TypeScript issues expected. Start dev server and open an Ask session. Verify:
   - A response with 3+ wiki links gets an ocean/teal left border
   - A response with 1–2 wiki links gets a muted clay/amber left border
   - A response with 0 links (or still streaming before `done`) shows no accent (standard border)
   - The streaming / in-flight state (before `done` SSE event sets `msg.evidence`) shows standard border — it should, because `msg.evidence` is null/undefined until the done event fires

5. Run `npm run build` (or `npx next build` if prebuild is blocked in sandbox)

6. Run `npm run lint`

7. Run `npm test` — no test assertions touch the bubble className directly, but run to confirm nothing broken.

**Checkpoint:** Build, lint, tests all pass. Visual regression: user bubble still clay, assistant bubbles still rounded-2xl. Left-border accent appears only after streaming completes (evidence set).

## Content Considerations

None. No wiki content changes, no new markdown, no unlock markers.

## Spoiler & Gating Impact

None. This feature reads only `msg.evidence.linksInAnswer.length` — a count of links already rendered as text in the response. It adds no new context, no new wiki content, no new API surface. All readers (locked, unlocked, re-reader, guest) see the same styling; the signal is per-message, not per-reader.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None.
- **Latency budget:** Zero — computation is `linksInAnswer.length` comparison, a constant-time client-side expression.
- **Conversation-memory storage model:** None — uses `msg.evidence` already in React state.
- **Voice/TTS considerations:** None.

## Known Approximation

`linksInAnswer` reflects links that appeared in the markdown text of the answer (detected by the `extractLinksInAnswer` post-processor), not total evidence retrieved by the context pack. An answer using many retrieved wiki passages but citing none inline would show "ungrounded" styling even though the retrieval was rich. This is a documented approximation — noted in the seed's Night Notes. The signal is still useful: if the companion cited links, the reader can follow them; if it didn't, the answer is more inferential.

## Testing

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (0 errors, same 4 img warnings)
- [ ] `npm test` — 192 pass
- [ ] Locked-reader path: open Ask with no story context, submit a factual question that cites 3+ wiki links → ocean left border visible
- [ ] Unlocked / re-reader path: same
- [ ] Guest-cookie path: no auth-gated behavior; border logic is pure client-side
- [ ] Streaming state: during stream (before `done` event), the bubble shows standard border; accent appears only after stream completes

## Files Modified

- `src/app/ask/page.tsx` — ~8 lines changed in the assistant bubble `<div>` className

## New Files

None.

## Database Changes

None.

## Dependencies

None. Uses `msg.evidence.linksInAnswer` already in local React state.

## Estimated Total: 20 minutes
