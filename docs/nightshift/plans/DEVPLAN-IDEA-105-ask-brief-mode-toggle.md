# Dev Plan: [IDEA-105] Ask "Brief Mode" Toggle — 3-Sentence Response Constraint
**Theme:** ask-forward

## What This Does

A "Brief / Full" toggle on the Ask page that appends a 3-sentence brevity constraint to the `ask_answerer` system prompt when active. Some readers want a quick factual answer; others want depth. The toggle persists in `localStorage` between sessions, mirrors the existing "Deep / Fast" `askMode` switch both in UX pattern and implementation path, and adds zero new routes, DB tables, or npm packages.

## User Stories

- As a first-time reader: I can ask "Who is ALARA?" and get a 3-sentence answer I can scan in 10 seconds before returning to the chapter.
- As a re-reader (show_all_content on): I toggle Brief off to get deep lore dives; I flip it back on when I just want a quick cross-reference while re-reading.
- As the author: Nothing changes in the data model or admin surfaces; the feature is a prompt-level constraint only.

## Implementation

### Phase 1: Prompt Layer

**File: `src/lib/ai/perspectives.ts`**

1. Add `briefMode?: boolean;` to the `PersonaPromptArgs` type (line 90, after the `askContextPack` field):
   ```ts
   /** When true, instruct the answerer to respond in ≤3 sentences. */
   briefMode?: boolean;
   ```

2. In `buildAskAnswererPrompt(args: PersonaPromptArgs)` (line 282), append the brevity constraint after the `contextPack` block:
   ```ts
   const brevityBlock = args.briefMode
     ? "\n\n## Brevity Constraint\nRespond in 3 complete sentences or fewer. Lead with the most critical fact. Omit supporting detail unless it is essential for accuracy."
     : "";

   return `You are the primary Ask answerer...
   ...
   ${contextPack}${brevityBlock}`;
   ```
   Insert `brevityBlock` at the end of the return template literal string (after `${contextPack}`).

**Checkpoint:** No runtime changes yet. TypeScript compiler verifies the new field. `npm run build` should pass.

### Phase 2: Orchestrator Pass-Through

**File: `src/lib/ai/orchestrator.ts`**

3. Add `briefMode?: boolean;` to the `OrchestrateParams` interface (line 78, after `askMode`):
   ```ts
   /** When true, constrains the ask_answerer to ≤3-sentence responses. */
   briefMode?: boolean;
   ```

4. In `buildPromptArgs(params: OrchestrateParams)` (line 225), destructure `briefMode` alongside the other params:
   ```ts
   const { supabase, ageMode, storySlug, journeySlug, readerProgress, briefMode } = params;
   ```

5. In the `buildPromptArgs` return object (line 324), add the field:
   ```ts
   askContextPack,
   briefMode,   // ← add this line
   ```

**Checkpoint:** `npm run build` passes. `promptArgs.briefMode` now flows from `OrchestrateParams` → `PersonaPromptArgs` → `buildAskAnswererPrompt`.

### Phase 3: API Route

**File: `src/app/api/ask/route.ts`**

6. Add `briefMode?: boolean;` to the request body type (line 82 area, after `askMode`):
   ```ts
   /** When true, constrains the answerer to ≤3-sentence replies. */
   briefMode?: boolean;
   ```

7. Destructure from body (line 64 area, alongside `askMode`):
   ```ts
   askMode,
   briefMode,
   ```

8. Pass to `orchestrateAsk()` (line 158 area, alongside the other spread params):
   ```ts
   ...(normalizedAskMode ? { askMode: normalizedAskMode } : {}),
   ...(briefMode === true ? { briefMode: true } : {}),
   ```
   Using a conditional spread keeps the call site explicit — `briefMode` is only forwarded when explicitly `true`, treating `undefined` and `false` identically.

**Checkpoint:** `npm run build` passes; lint clean. API is wired but no UI yet.

### Phase 4: Client UI

**File: `src/app/ask/page.tsx`**

9. Add a constant and reader function after `ASK_MODE_STORAGE_KEY` (line 15):
   ```ts
   const BRIEF_MODE_STORAGE_KEY = "celestial_ask_brief";

   function readStoredBriefMode(): boolean {
     if (typeof window === "undefined") return false;
     try {
       return window.localStorage.getItem(BRIEF_MODE_STORAGE_KEY) === "true";
     } catch {
       return false;
     }
   }
   ```

10. Add state alongside the `askMode` state (line 252 area):
    ```ts
    const [isBriefMode, setIsBriefMode] = useState<boolean>(readStoredBriefMode);
    ```

11. Add `useEffect` to persist to `localStorage` (alongside the existing askMode persistence effect at line 283):
    ```ts
    useEffect(() => {
      try {
        window.localStorage.setItem(BRIEF_MODE_STORAGE_KEY, String(isBriefMode));
      } catch {
        /* ignore */
      }
    }, [isBriefMode]);
    ```

12. Include in the POST body (line 401 area, inside the JSON.stringify object):
    ```ts
    briefMode: isBriefMode,
    ```
    Place alongside `askMode` on its own line.

13. Add the toggle button in the mode controls row (line 597 area, inside the `aria-label="Answer mode"` div — place the Brief button group after the existing Deep/Fast group):
    ```tsx
    <div className="inline-flex items-center gap-2">
      <span className="type-meta text-[10px] uppercase tracking-wide text-ink-ghost">
        Length
      </span>
      <button
        type="button"
        onClick={() => setIsBriefMode((prev) => !prev)}
        aria-pressed={isBriefMode}
        className={`type-ui rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
          isBriefMode
            ? "border-ocean bg-ocean/10 text-ocean"
            : "border-[var(--color-border)] text-ink-muted hover:text-ink"
        }`}
        title={isBriefMode ? "Brief mode on — ≤3 sentences" : "Full mode — detailed answers"}
      >
        {isBriefMode ? "Brief" : "Full"}
      </button>
    </div>
    ```
    Note: verify `--color-ocean` CSS variable is defined in `src/app/globals.css` before finalizing the active color class. The fallback `bg-clay text-warm-white` pattern (used by the Deep/Fast buttons) is an equally valid alternative if `ocean` is not defined for this context.

**Checkpoint:** Feature is fully wired. Test the golden path:
- Toggle "Brief" → ask any question → verify response is 3 sentences or fewer.
- Reload the page → verify "Brief" state persists.
- Toggle back to "Full" → verify longer answers return.

## Content Considerations

No wiki content changes. `content/voice.md` is still a stub — the brevity constraint is appended after the Voice Guide block, so it overrides length but not tone. When `content/voice.md` is fully authored, the brevity constraint will coexist cleanly.

## Spoiler & Gating Impact

**No spoiler impact.** The `briefMode` constraint is a response-length instruction only — it does not change which context is retrieved, which entities are surfaced, or which chapters are visible. The Reader Progress Gate (injected into every system prompt) is unaffected. The brevity block is appended after all content and gate blocks, so it only constrains reply length.

**Gating:** No auth required. Works for guests (no `conversationId`), authenticated readers, and re-readers (`show_all_content`). The toggle is stored in `localStorage`, which is available for all browser sessions regardless of auth state.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** One block appended to `buildAskAnswererPrompt()` only — no changes to other persona builders (narrator, lorekeeper, archivist, finder, synthesizer). Only the `ask_answerer` persona (the default since Run 16) is affected.
- **Latency budget:** No latency change. Brief responses may stream faster (fewer tokens to generate), but the retrieval + synthesis path is identical.
- **Conversation-memory storage:** `localStorage` only — no DB storage for the toggle state. No new `cel_conversations` fields.
- **Voice/TTS considerations:** Not applicable in this plan. If IDEA-054 (Ask TTS) ships later, the TTS call receives the full final text regardless of brief mode — no interaction needed.

## Synergies

- **IDEA-093 (Character Voice Mode):** "Brief ALARA" — a first-person 3-sentence answer in ALARA's voice. The two features combine in the API without any additional code; `briefMode` and `voiceCharacter` are independent params.
- **IDEA-096 (Live Context Band):** When the context band ships, it could optionally surface the active length mode as a dismissable pill alongside the story/character pills. No code changes needed now; the band reads existing state vars.
- **IDEA-102 (Ask Empty State Chapter Grid):** No interaction. Brief mode only applies after the reader starts asking.

## Files Modified

1. `src/lib/ai/perspectives.ts` — add `briefMode?` to `PersonaPromptArgs`, append constraint in `buildAskAnswererPrompt`
2. `src/lib/ai/orchestrator.ts` — add `briefMode?` to `OrchestrateParams`, destructure + pass through in `buildPromptArgs`
3. `src/app/api/ask/route.ts` — destructure `briefMode` from body, forward to `orchestrateAsk`
4. `src/app/ask/page.tsx` — constant + reader fn + state + localStorage effect + POST body + toggle button UI

## New Files

None.

## Database Changes

None.

## Testing

- [ ] `npm run build` passes (4-file TypeScript changes)
- [ ] `npm run lint` — 0 errors; brief-mode toggle button should have no `<img>` tag warnings
- [ ] `npm test` — 192 / 192 pass; no prompt-logic tests touch `buildAskAnswererPrompt` in a way that would break (test suite doesn't assert on system prompt text directly, but verify)
- [ ] Toggle "Brief" → ask question → response is 3 sentences or fewer
- [ ] Reload page → "Brief" state is still active (localStorage persisted)
- [ ] Toggle "Full" → ask same question → response is longer
- [ ] Guest path: unauthenticated user can toggle Brief; Ask still works (no auth check on this field)
- [ ] `isBriefMode` defaults to `false` on first load (no prior localStorage entry)
- [ ] Combined: Brief + Character Voice Mode (after IDEA-093 ships): 3-sentence first-person answer

## Estimated Total: 30 minutes
