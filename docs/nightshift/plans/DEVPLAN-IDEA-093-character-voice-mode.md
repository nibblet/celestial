# Dev Plan: [IDEA-093] Character Voice Mode — Ask the Crew in First Person
**Theme:** ask-forward

## What This Does

A character selector chip row on the Ask page lets the reader choose one of the 9 main Valkyrie-1 crew members. All subsequent questions in that session are answered in that character's first-person voice, grounded in their arc ledger "Starting State" and wiki profile. Default state is "Archive" (the standard impersonal companion voice). Makes the companion feel like a direct conversation with the fictional crew.

## User Stories

- As a first-time reader, I tap "ALARA" and ask "What do you make of the Resonant Pad?" — I get a first-person answer grounded in ALARA's documented starting state, not a third-person summary.
- As a re-reader (show_all_content on), I switch between crew members mid-session to compare how they'd frame the same event.
- As the author, I verify the voice mode uses only safe "Starting State" content — no arc-endpoint spoilers appear regardless of which character is selected.

## Implementation

### Phase 1: Server-Side Plumbing

1. Open `src/lib/ai/perspectives.ts`
   - Add `voiceCharacter?: string` field to the `PersonaPromptArgs` type (after line 88, before the closing `}`).
   - Add `import { getCharacterArcBySlug } from "@/lib/wiki/character-arcs";` at the top of the imports block.
   - Add a helper function `buildVoiceCharacterBlock(slug: string): string` after line 93 (before `sharedContentBlock`):
     ```ts
     function buildVoiceCharacterBlock(slug: string): string {
       const arc = getCharacterArcBySlug(slug);
       if (!arc) return "";
       const startingState = arc.startingState?.slice(0, 800) ?? "";
       return `## CHARACTER VOICE MODE — Respond as ${arc.character}
     You are speaking directly as ${arc.character} in first person. All your answers must be grounded only in this character's documented experiences and knowledge.

     Starting State (your known self at the story's outset):
     ${startingState}

     Voice rules:
     - Use "I", "me", "my" throughout.
     - Draw only from what this character would plausibly know and experience.
     - Do not narrate other characters' inner states unless directly observed.
     - Do not invent story events beyond the canon.
     - If a question falls outside your character's knowledge, say so in character — do not speculate as a narrator.
     - Maintain character voice: your personality and perspective as documented, not a generic first-person narrator.`;
     }
     ```
   - In `buildAskAnswererPrompt(args: PersonaPromptArgs)` (line 282), before the opening `` `You are the primary Ask answerer`` template literal, check for `args.voiceCharacter` and prepend the block:
     ```ts
     const voiceBlock = args.voiceCharacter
       ? `${buildVoiceCharacterBlock(args.voiceCharacter)}\n\n`
       : "";
     return `${voiceBlock}You are the primary Ask answerer for "${book.title}"...`;
     ```
   **Checkpoint:** `npx tsc --noEmit` passes. No test regression.

2. Open `src/lib/ai/orchestrator.ts`
   - Add `voiceCharacter?: string` to `OrchestrateParams` interface (after `askMode?: AskReaderMode;`, around line 78).
   - In `buildPromptArgs()` (line 224), destructure `voiceCharacter` from `params`:
     ```ts
     const { supabase, ageMode, storySlug, journeySlug, readerProgress, voiceCharacter } = params;
     ```
   - In the returned `PersonaPromptArgs` object (around line 320), add:
     ```ts
     ...(voiceCharacter ? { voiceCharacter } : {}),
     ```
   **Checkpoint:** `npx tsc --noEmit` still passes.

### Phase 2: API Route

3. Open `src/app/api/ask/route.ts`
   - Add `voiceCharacter` to the destructured body (after `askMode`, around line 71):
     ```ts
     voiceCharacter,
     ```
   - Add it to the body type annotation:
     ```ts
     voiceCharacter?: string;
     ```
   - Validate: after the `message` length check (line 84), add:
     ```ts
     const VALID_VOICE_SLUGS = [
       "alara", "aven-voss", "evelyn-tran", "galen-voss",
       "jax-reyes", "jonah-revas", "lena-osei", "marco-ruiz", "thane-meric",
     ];
     const validatedVoiceCharacter =
       typeof voiceCharacter === "string" && VALID_VOICE_SLUGS.includes(voiceCharacter)
         ? voiceCharacter
         : undefined;
     ```
   - Pass to `orchestrateAsk()` call (around line 158):
     ```ts
     ...(validatedVoiceCharacter ? { voiceCharacter: validatedVoiceCharacter } : {}),
     ```
   **Checkpoint:** `npx next build` passes. Route accepts and validates the new param.

### Phase 3: Client UI

4. Open `src/app/ask/page.tsx`
   - Add a `CREW_CHIPS` constant near the top of the file (after imports, before the component):
     ```ts
     const CREW_CHIPS: { slug: string; label: string }[] = [
       { slug: "alara", label: "ALARA" },
       { slug: "aven-voss", label: "Aven" },
       { slug: "evelyn-tran", label: "Evelyn" },
       { slug: "galen-voss", label: "Galen" },
       { slug: "jax-reyes", label: "Jax" },
       { slug: "jonah-revas", label: "Jonah" },
       { slug: "lena-osei", label: "Lena" },
       { slug: "marco-ruiz", label: "Marco" },
       { slug: "thane-meric", label: "Thane" },
     ];
     ```
   - Add state (after line 251 where `const [input, setInput] = useState("")` is defined):
     ```ts
     const [voiceCharacter, setVoiceCharacter] = useState<string | null>(null);
     ```
   - Add `voiceCharacter` to the `sendMessage()` POST body (alongside `storySlug`, around line 404):
     ```ts
     ...(voiceCharacter ? { voiceCharacter } : {}),
     ```
   - Add the chip row UI in the bottom input bar, **above** the `<form>` element (around line 749, before the `<form>` tag):
     ```tsx
     <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
       <button
         type="button"
         onClick={() => setVoiceCharacter(null)}
         className={`type-ui rounded-full px-2.5 py-0.5 text-xs transition-colors ${
           voiceCharacter === null
             ? "bg-clay text-warm-white"
             : "bg-warm-white-2 text-ink-mid border border-[var(--color-border)] hover:bg-warm-white-3"
         }`}
       >
         Archive
       </button>
       {CREW_CHIPS.map((chip) => (
         <button
           key={chip.slug}
           type="button"
           onClick={() => setVoiceCharacter(v => v === chip.slug ? null : chip.slug)}
           className={`type-ui rounded-full px-2.5 py-0.5 text-xs transition-colors ${
             voiceCharacter === chip.slug
               ? "bg-ocean text-warm-white"
               : "bg-warm-white-2 text-ink-mid border border-[var(--color-border)] hover:bg-warm-white-3"
           }`}
         >
           {chip.label}
         </button>
       ))}
     </div>
     ```
   **Checkpoint:** The chip row renders above the input. Clicking a character chip highlights it; clicking "Archive" or the same chip again returns to default. `voiceCharacter` state included in POST body.

5. Run `npm run build`, `npm run lint`, `npm test`.

6. Manual verification:
   - Open `/ask`. Chip row renders with "Archive" (active) + 9 crew chips.
   - Click "ALARA". Submit "What do you see in the resonant pad?" — response should use first-person ALARA voice.
   - Click "Archive". Next message returns to third-person archive voice.
   - Click "Aven Voss". Submit "How do you feel about ALARA?" — response grounds in Aven Voss's documented perspective.
   - Verify that with no `voiceCharacter` selected, the prompt is identical to prior behavior (no regression).
   - Verify an invalid slug cannot be injected via the API (server validation rejects it silently).

## Files Modified
- `src/lib/ai/perspectives.ts` — add `voiceCharacter?` to `PersonaPromptArgs`; add `buildVoiceCharacterBlock()`; modify `buildAskAnswererPrompt()`
- `src/lib/ai/orchestrator.ts` — add `voiceCharacter?` to `OrchestrateParams`; pass through in `buildPromptArgs()`
- `src/app/api/ask/route.ts` — destructure, validate, and forward `voiceCharacter`
- `src/app/ask/page.tsx` — add `CREW_CHIPS`, `voiceCharacter` state, chip row UI, include in POST body

## New Files (if any)
None.

## Database Changes (if any)
None. Voice character selection is session-only client React state. Not persisted.

## Content Considerations
- Grounding draws from `content/wiki/arcs/characters/{slug}.md` "Starting State" section only — no arc-endpoint spoilers (Unresolved Tensions and Future Questions sections are excluded).
- Character wiki markdown (`content/wiki/characters/{slug}.md`) is not directly injected (to avoid context bloat), but the shared content block already includes `getCharacterCanonContext()` which loads wiki character data. The voice block focuses on Starting State for conciseness.
- No changes to `content/voice.md` or `content/decision-frameworks.md`.

## Spoiler & Gating Impact
- Voice mode draws exclusively from "Starting State" text (the safe, non-spoilery arc section per the codebase's own classification in `getCharacterArcContext()`).
- All users (first-time, re-reader, guest) can use voice mode — no gating required. Under companion-first defaults all content is accessible.
- The server validates that `voiceCharacter` must be one of 9 known slugs — no arbitrary string injection.
- The standard context pack and wiki content are still present alongside the voice block, so answers remain grounded in canon.
- No new retrieval paths; no new content included beyond Starting State (~800 chars/character).

## Theme-Specific Requirements (ask-forward)
- **Prompt changes:** Yes. `buildAskAnswererPrompt()` prepends a ~300-token character voice block when `voiceCharacter` is set. The rest of the prompt is unchanged.
- **Latency budget:** ~300 additional input tokens per message in voice mode. At 1.5M tokens/s input throughput, this adds < 1ms to TTFT. Negligible.
- **Conversation-memory storage:** Unchanged. `cel_messages` stores conversation turns normally; voice mode character is not persisted (session state only). A reader switching characters mid-session will see the new voice immediately on the next message.
- **Voice/TTS considerations:** Not applicable — this is text-only. Audio voice mode would require `content/voice.md` to be authored first (currently a stub, FIX-024 parked).

## Testing
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (0 new errors)
- [ ] `npm test` passes (192/192; no prompt-related tests broken)
- [ ] Voice mode off: Ask behavior identical to current baseline
- [ ] Voice mode on (ALARA): Response uses first-person, references "I" and ALARA-specific knowledge
- [ ] Voice mode on (arbitrary crew member): Chips highlight correctly; server validates slug
- [ ] Invalid slug via direct API call: Server returns normal response (validation strips unknown slugs silently)
- [ ] No-chip selected ("Archive"): Chip bar shows Archive highlighted; standard voice
- [ ] Guest path: Guest user (no auth) — Ask route returns 401 before voice mode logic is reached (no change)

## Dependencies
- `getCharacterArcBySlug()` — already in `src/lib/wiki/character-arcs.ts:75` (server-safe, reads fs)
- `src/lib/ai/perspectives.ts` imports chain — already server-only; no new client imports
- All 9 arc ledger files — already present in `content/wiki/arcs/characters/`

## Estimated Total: 1.5 hours
