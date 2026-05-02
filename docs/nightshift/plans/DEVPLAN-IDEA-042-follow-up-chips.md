# Dev Plan: [IDEA-042] Suggested Follow-Up Chips After Each Ask Answer
**Theme:** ask-forward

## What This Does
After each AI Ask response, render 2–3 contextual suggested follow-up questions
as clickable chip buttons below the answer bubble. Clicking a chip immediately
submits the question. Makes the companion conversational and lowers the "what
do I ask next?" friction.

## User Stories
- As a first-time reader: I see suggested next questions after every answer, so I
  can keep exploring without staring at an empty input box.
- As a re-reader (show_all_content on): Chips suggest deeper arc/lore follow-ups
  grounded in the answer content, surfacing connections I might have missed.
- As the author: Testing Ask flows is easier when natural follow-up paths are
  surfaced automatically.

## Implementation

### Phase 1: Server — Suggestion Generation
**File:** `src/app/api/ask/route.ts`

1. After the main text stream finishes and `fullResponse` is complete (line ~186),
   and after verification runs (line ~195), before the `done: true` event (~line 245):

   ```typescript
   let suggestions: string[] = [];
   try {
     suggestions = await generateFollowUpSuggestions(message, fullResponse);
   } catch {
     // suggestions are non-critical — failure silently produces empty array
   }
   ```

2. Include `suggestions` in the final `done: true` SSE event:
   ```typescript
   controller.enqueue(
     encoder.encode(
       `data: ${JSON.stringify({
         done: true,
         conversationId: convId,
         evidence,
         suggestions,   // <-- add this
         ...(verification.shouldBlock ? { replacementContent: ASK_VERIFICATION_FALLBACK_MESSAGE } : {}),
       })}\n\n`
     )
   );
   ```

3. **New file:** `src/lib/ai/ask-suggestions.ts`
   ```typescript
   import "server-only";
   import Anthropic from "@anthropic-ai/sdk";

   const SUGGESTIONS_MODEL = "claude-haiku-4-5-20251001";

   export async function generateFollowUpSuggestions(
     question: string,
     answer: string,
   ): Promise<string[]> {
     const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
     const resp = await anthropic.messages.create({
       model: SUGGESTIONS_MODEL,
       max_tokens: 200,
       system: `You are a follow-up question generator for a sci-fi book companion.
   Given a reader's question and the AI's answer, return ONLY a JSON array of
   2-3 short follow-up questions the reader might naturally want to ask next.
   Keep them specific, in-world, and grounded in what the answer mentioned.
   Return ONLY valid JSON like: ["question 1", "question 2"]
   No prose, no explanation.`,
       messages: [
         {
           role: "user",
           content: `Reader asked: "${question.slice(0, 300)}"\n\nAI answered: "${answer.slice(0, 500)}"`,
         },
       ],
     });
     const text =
       resp.content.find((c) => c.type === "text")?.text?.trim() ?? "[]";
     const match = text.match(/\[[\s\S]*\]/);
     if (!match) return [];
     const parsed = JSON.parse(match[0]) as unknown[];
     return parsed
       .filter((s): s is string => typeof s === "string" && s.length > 0)
       .slice(0, 3);
   }
   ```

   Import at top of `route.ts`: `import { generateFollowUpSuggestions } from "@/lib/ai/ask-suggestions";`

4. Add `SUGGESTIONS_MODEL` to `src/lib/ai/ledger.ts` `MODEL_COST`:
   ```typescript
   "claude-haiku-4-5-20251001": { in: 0.0008, out: 0.004 },
   ```
   (same rate as `claude-3-5-haiku-20241022` — Haiku pricing is stable)

**Checkpoint:** POST to `/api/ask` now returns `suggestions: ["q1", "q2", "q3"]`
in the `done: true` event. Verify in browser network tab.

### Phase 2: Client — Message Type + SSE Handling
**File:** `src/app/ask/page.tsx`

1. Add `suggestions` to the `Message` interface (line ~63):
   ```typescript
   interface Message {
     role: "user" | "assistant";
     content: string;
     id?: string;
     evidence?: AskMessageEvidence | null;
     suggestions?: string[];   // <-- add this
   }
   ```

2. In the SSE reader's `if (data.done === true && data.evidence)` block (line ~466),
   also attach suggestions:
   ```typescript
   if (data.done === true && data.evidence) {
     const replacement = typeof data.replacementContent === "string"
       ? data.replacementContent : undefined;
     const incomingSuggestions: string[] =
       Array.isArray(data.suggestions) ? data.suggestions : [];
     setMessages((prev) => {
       const last = prev[prev.length - 1];
       if (!last || last.role !== "assistant") return prev;
       return [
         ...prev.slice(0, -1),
         {
           ...last,
           content: replacement ?? last.content,
           evidence: data.evidence as AskMessageEvidence,
           suggestions: incomingSuggestions,
         },
       ];
     });
   }
   ```

**Checkpoint:** After an Ask response, `messages[last].suggestions` is populated
with 2–3 strings. Verify by adding a `console.log(messages)` temporarily.

### Phase 3: Client — Chip Rendering
**File:** `src/app/ask/page.tsx`

In the message map (line ~705), inside the `{msg.role === "assistant"}` branch,
add chips between the `ReactMarkdown` div and `AskSourcesDisclosure`. Replace
lines ~706–714 with:

```tsx
{msg.role === "assistant" ? (
  <>
    <div className="prose prose-story prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-sm prose-headings:font-semibold prose-ul:my-1 prose-li:my-0">
      <ReactMarkdown components={ASSISTANT_MARKDOWN_COMPONENTS}>
        {msg.content}
      </ReactMarkdown>
    </div>
    {msg.suggestions && msg.suggestions.length > 0 && !loading && (
      <div className="mt-3 flex flex-wrap gap-2">
        {msg.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => sendMessage(s)}
            className="type-ui rounded-full border border-[var(--color-border)] bg-warm-white-2 px-3 py-1 text-xs text-ink-muted transition-colors hover:border-clay-border hover:text-clay"
          >
            {s}
          </button>
        ))}
      </div>
    )}
    {msg.evidence ? (
      <AskSourcesDisclosure evidence={msg.evidence} />
    ) : null}
  </>
) : ( ...user branch unchanged... )}
```

Note: `!loading` prevents chips showing during a subsequent question's stream.
The chip style reuses the exact class string from `SUGGESTIONS_BY_AGE_MODE`
chips (line ~684) for visual consistency.

**Checkpoint:** Chips render below the answer, clicking one sends the question.
Verify that chips disappear while the follow-up is streaming.

## Content Considerations
No wiki content impact. Suggestions are LLM-generated and ephemeral (not stored
in DB). They appear only in the client UI after each response.

## Spoiler & Gating Impact
Suggestions are generated from the assistant's answer text only (already
spoiler-safe at the time of generation). No new corpus access. No new reader
progress checks needed — the suggestion question, when clicked, goes through
the normal Ask flow which applies all existing gating.

## Theme-Specific Requirements (ask-forward)
- Prompt changes: NEW `ask-suggestions.ts` module with its own prompt. Does NOT
  modify the ask_answerer system prompt.
- Latency budget: Haiku call adds ~300–600ms after the main stream closes. The
  user has already seen the full answer; this is acceptable post-stream latency.
- Conversation-memory storage model: Suggestions are NOT persisted. They're
  ephemeral UI state per message instance. If the page is refreshed or the
  conversation is loaded from history, suggestions are absent (by design —
  they are contextually generated, not historical).
- Voice/TTS: Not applicable for this feature.

## Testing
- [ ] Build, lint, `npm test` pass
- [ ] POST `/api/ask` with a question → `done` event includes `suggestions` array of 2–3 strings
- [ ] Chips render below the answer bubble, not below the Sources disclosure
- [ ] Clicking a chip submits the question and opens a new stream
- [ ] Chips are absent while a subsequent question is loading
- [ ] If Haiku call fails (simulate with bad API key), response still works normally
  with `suggestions: []` (empty — no chips rendered)
- [ ] Locked-reader path: N/A (companion-first, all content accessible)
- [ ] Guest path: guests who cannot submit questions won't see chips
  (ask is auth-gated); no separate handling needed

## Dependencies
- `@anthropic-ai/sdk` — already installed
- `claude-haiku-4-5-20251001` — Haiku 4.5. Add to `MODEL_COST` in ledger.ts.
  If this model ID doesn't resolve, fall back to `claude-3-5-haiku-20241022`.

## Estimated Total: 2 hours
(30 min backend + 30 min client + 1 hr testing and polish)
