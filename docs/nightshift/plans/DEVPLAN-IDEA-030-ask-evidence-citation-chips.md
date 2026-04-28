# Dev Plan: [IDEA-030] Ask Evidence Inline Citation Chips

## What This Does

Surfaces 1–3 clickable citation chips directly below each assistant message
bubble in Ask — making answers feel grounded and trustworthy for everyday readers
without requiring them to open the collapsible evidence panel.

Currently `evidence.linksInAnswer` (links the AI included in its own response)
is only visible inside the `AskSourcesDisclosure` `<details>` panel (collapsed by
default). Most readers never expand it. Adding visible chips turns a debug-only
feature into a natural discovery pathway to the wiki.

## User Stories

- As a first-time reader: I ask "Who is ALARA?" — the answer mentions the
  Directive 14 chapter. A chip `The Directive 14` appears below the bubble; I
  click it and navigate to the chapter. No panel expansion needed.
- As a re-reader (`show_all_content on`): Same flow, but more links available
  since full corpus is visible. Up to 3 chips shown; more still in the panel.
- As the author: No change — `AskSourcesDisclosure` still shows all debug info.

## Implementation

### Phase 1: Citation Chips Below the Message Bubble

**File:** `src/app/ask/page.tsx`

1. Locate the assistant message block (lines ~705–730) inside `messages.map`:
   ```tsx
   {msg.role === "assistant" ? (
     <>
       <div className="prose ...">
         <ReactMarkdown ...>{msg.content}</ReactMarkdown>
       </div>
       {msg.evidence ? (
         <AskSourcesDisclosure evidence={msg.evidence} />
       ) : null}
     </>
   ) : ...}
   ```

2. Between the prose `div` and `AskSourcesDisclosure`, insert a citation chips
   block:
   ```tsx
   {msg.evidence?.linksInAnswer && msg.evidence.linksInAnswer.length > 0 ? (
     <div className="mt-2 flex flex-wrap gap-1.5">
       {msg.evidence.linksInAnswer.slice(0, 3).map((link) => (
         <Link
           key={link.href}
           href={link.href}
           className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-warm-white px-2.5 py-0.5 text-[11px] font-medium text-ocean hover:bg-[var(--color-surface)] transition-colors"
         >
           {link.text}
         </Link>
       ))}
       {msg.evidence.linksInAnswer.length > 3 ? (
         <span className="text-[11px] text-ink-ghost self-center">
           +{msg.evidence.linksInAnswer.length - 3} more in sources
         </span>
       ) : null}
     </div>
   ) : null}
   ```

3. **Checkpoint:** Chips appear beneath assistant answers that contain
   wiki/story links. Links are correct (navigate to entity or chapter pages).
   Overflow handled with "+N more in sources" label.

### Phase 2: Clean Up Panel Duplication (Optional)

After Phase 1 ships, the "Links in this answer" section inside
`AskSourcesDisclosure` becomes redundant (same data, two places). In
`AskSourcesDisclosure` component (lines ~154–172 in `ask/page.tsx`), remove
the "Links in this answer" `<div>` block. The chips above the panel are the
primary surface; the panel retains `contextSources`, persona/mode metadata,
and verification output.

**File:** `src/app/ask/page.tsx`

Remove the `{evidence.linksInAnswer.length > 0 ? (...)  : null}` block from
inside `AskSourcesDisclosure` (not the one added in Phase 1, the existing one
inside the `<details>` panel).

**Checkpoint:** Panel is cleaner. Chips above the bubble are the only place
links appear in the UI. Verify no duplicated links.

## Content Considerations

No wiki content changes. `linksInAnswer` is parsed from the AI's own response
text by `parseMarkdownInternalLinks()` — any `[text](href)` link the model writes
is surfaced here. The wiki cross-reference policy in prompts governs which links
appear; no prompt changes needed.

## Spoiler & Gating Impact

**No new spoiler surface.** `linksInAnswer` is extracted from the AI's own
answer text, which is already composed over the `visibleStories`-filtered catalog.
If the model correctly respects the Reader Progress Gate (which it does at the
prompt level + verifier), any links in the answer already refer only to unlocked
content. The chips just surface those links visually — they don't introduce new
content access.

Gating by reader path:
- **First-time reader (locked chapters):** Chips link only to unlocked wiki
  entries / chapters (the AI can only mention what it knows from unlocked context)
- **Re-reader (`show_all_content=true`):** Chips may include full-corpus links —
  expected behavior
- **Guest (no progress cookie):** Same as first-time reader since `readerProgress`
  defaults to no unlocks

## Testing

- [ ] `npx next build` passes
- [ ] `npm run lint` passes (0 errors)
- [ ] Ask a question that causes the AI to cite a character or chapter with a
  markdown link → chips appear below the bubble
- [ ] Ask a generic question (no wiki links in answer) → no chips section renders
- [ ] More than 3 links → "+" overflow label shown
- [ ] Chips are accessible (keyboard-navigable, correct href)
- [ ] Locked-reader path: chips only appear for unlocked content links
- [ ] Re-reader path: chips may include full-corpus links
- [ ] AskSourcesDisclosure panel (Phase 2): "Links in this answer" section removed,
  no duplicate display

## Dependencies

- None — `evidence.linksInAnswer` is already streamed to the client and available
  on `msg.evidence`. No new API endpoints, DB changes, or types needed.

## Estimated Total: 0.75 hours

- Phase 1 (~20 min): JSX insertion + styling
- Phase 2 (~25 min): remove panel duplicate section + verify clean output
