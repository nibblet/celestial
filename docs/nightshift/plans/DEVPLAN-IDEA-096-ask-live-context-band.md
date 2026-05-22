# Dev Plan: [IDEA-096] Ask Live Context Band
**Theme:** ask-forward

## What This Does

A compact visual strip rendered between the Ask thread scroll area and the input form showing the reader's active context state as dismissable pill badges. Story name (if `?story=` set), voice character (once IDEA-093 ships), and entity context (once IDEA-069 ships) each appear as a labeled pill with a `×` dismiss button. When all context is null the band collapses to zero height — no layout shift.

This gives readers visual confirmation of what grounds the companion's next answer before they type, and a one-tap escape when they want to reset context mid-session.

## User Stories

- As a first-time reader... I navigate to `/ask?story=ch03` from a chapter page and immediately see "📖 Chapter 3: Contact Zone" above the input — I know the companion is grounded in that chapter without re-reading a heading elsewhere on the page.
- As a re-reader (show_all_content on)... After IDEA-093 ships and I select the ALARA voice chip, I see "🎙 alara" in the band above the input at all times during that session. When I want to switch back to the archive voice, I click × to clear it.
- As the author... N/A — this is reader-facing UX only. No admin surface needed.

## Implementation

### Phase 1: Story Context Pill — Independently Deployable Today
All state variables referenced in this phase (`contextStoryId`, `contextStoryTitle`) already exist in `src/app/ask/page.tsx`.

1. Open `src/app/ask/page.tsx`.
2. Locate the JSX layout between the thread scroll `<div>` and the `<form>` element (the textarea + submit button area). In the current codebase this is roughly around the section that renders the input form after the messages thread.
3. Insert the following block directly above the `<form>` (not inside it):
   ```tsx
   {contextStoryId && (
     <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-[var(--color-border)]">
       <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-sci-panel)] text-[var(--color-text-muted)]">
         <span>📖 {contextStoryTitle || contextStoryId}</span>
         <button
           type="button"
           onClick={() => { setContextStoryId(null); setContextStoryTitle(null); }}
           className="ml-1 opacity-60 hover:opacity-100 leading-none"
           aria-label="Clear chapter context"
         >
           ×
         </button>
       </span>
     </div>
   )}
   ```
4. Verify `--color-sci-panel` and `--color-text-muted` are defined: `grep -n "sci-panel\|text-muted" src/app/globals.css`. If either is absent use `--color-card-bg` and `--color-text-secondary` as fallbacks.
5. **Checkpoint:** Open `/ask` without params — no band, no layout shift. Open `/ask?story=ch03` — story pill appears. Click × — pill disappears, contextStoryId and contextStoryTitle are cleared; companion returns to no-context mode. Form still accepts input normally.

### Phase 2: Voice Character Pill — After IDEA-093 Ships
This phase adds zero code changes to any shipped code until IDEA-093 adds `voiceCharacter` state.

1. After IDEA-093 ships and `voiceCharacter: string | null` is added to `ask/page.tsx`, extend the band `<div>` (inside the outer wrapper from Phase 1, or add a second wrapper if Phase 1 was deployed separately):
   ```tsx
   {voiceCharacter && (
     <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-sci-panel)] text-[var(--color-text-muted)]">
       <span>🎙 {voiceCharacter}</span>
       <button
         type="button"
         onClick={() => setVoiceCharacter(null)}
         className="ml-1 opacity-60 hover:opacity-100 leading-none"
         aria-label="Clear character voice"
       >
         ×
       </button>
     </span>
   )}
   ```
2. Merge both pills into a single shared `<div className="flex flex-wrap gap-2 px-4 py-2 border-t ...">` wrapper with an outer conditional `{(contextStoryId || voiceCharacter) && (...)}`.
3. **Checkpoint:** Select ALARA chip → voice pill appears. Click × → chip deselects in IDEA-093 chip row, pill disappears from band. Story pill still shows independently.

### Phase 3: Entity Context Pill — After IDEA-069 Ships
After IDEA-069 ships and `entitySlug`, `entityType`, `entityName` state variables are added to `ask/page.tsx`:

1. Add an entity pill inside the shared band wrapper:
   ```tsx
   {entitySlug && (
     <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-sci-panel)] text-[var(--color-text-muted)]">
       <span>🔍 {entityName || entitySlug}</span>
       <button
         type="button"
         onClick={() => { setEntitySlug(null); setEntityType(null); setEntityName(null); }}
         className="ml-1 opacity-60 hover:opacity-100 leading-none"
         aria-label="Clear entity context"
       >
         ×
       </button>
     </span>
   )}
   ```
2. Outer conditional: `{(contextStoryId || voiceCharacter || entitySlug) && (...)}`.
3. **Checkpoint:** Navigate from an entity page via IDEA-069 CTA — entity pill renders. × clears it. All three pills can coexist in the band simultaneously.

## Content Considerations
No wiki content changes. No markdown. No brain_lab changes.

## Spoiler & Gating Impact
The band displays only information the reader has already chosen to set as context — story title (they navigated from a chapter page), voice character (they selected a chip explicitly), entity name (they clicked an entity CTA). No new content is exposed; no new retrieval is triggered. The band is safe for all reader types (locked, unlocked, re-reader, guest) — it reflects visible UI state only.

## Theme-Specific Requirements (ask-forward)
- **Prompt changes:** None. The band is a display layer only; it does not modify what is sent to the API.
- **Latency budget:** Zero — no API calls, no fetches, no derived computation. Pure React state display.
- **Conversation-memory storage:** None. Context pills are ephemeral client state; they reset on page refresh (same as all other Ask page state).
- **Voice/TTS considerations:** None.

## Testing
- [ ] `npx next build` passes — no new errors
- [ ] `npm run lint` passes — 0 errors, ≤ 4 existing `<img>` tag warnings
- [ ] `npm test` — 192 tests pass (no wiki/parser/prompt logic touched)
- [ ] **Locked-reader path (story context):** Open `/ask` — no band visible. Open `/ask?story=ch03` — story pill appears with chapter title. Click × — pill removed, form still works.
- [ ] **Unlocked / re-reader path:** Same as locked-reader path (under companion-first, all content accessible to all users; story context pill behavior identical).
- [ ] **Guest-cookie path:** Open `/ask?story=ch03` as unauthenticated user — band renders story pill. × clears it. No auth required for band to function.
- [ ] **Phase 2 verification (after IDEA-093):** Select a crew chip → voice pill appears in band. × clears both chip and pill. Band collapses when both pills cleared.
- [ ] **Empty state:** No story, no voice, no entity set — band div not rendered, zero height, no border-t visible.

## Dependencies
- `contextStoryId` and `contextStoryTitle` state variables: already in `ask/page.tsx` (Phase 1 deployable today)
- `voiceCharacter` state: added by IDEA-093 (Phase 2, optional until then)
- `entitySlug`, `entityType`, `entityName` state: added by IDEA-069 (Phase 3, optional until then)
- `--color-sci-panel` CSS variable: verify exists in `globals.css` before executing; fallback `--color-card-bg`
- No new npm packages. No new DB tables. No new API routes. No new component files.

## Files Modified
- `src/app/ask/page.tsx` — 1 conditional JSX block (~8–25 lines depending on phase) inserted between thread scroll div and form element

## New Files
None.

## Database Changes
None.

## Verify
- [ ] Build, lint, tests pass
- [ ] No layout shift when context is null (band truly renders nothing)
- [ ] All three pill types render and dismiss correctly
- [ ] Locked-reader, re-reader, and guest paths verified

## Estimated Total: 30 minutes (Phase 1 alone: 15 minutes)
