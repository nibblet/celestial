# Dev Plan: [IDEA-123] Ask Conversation Exporter
**Theme:** ask-forward

## What This Does

Adds a small "Export ↓" button at the bottom of any Ask session that has 3 or more messages. Clicking generates a Markdown document of the conversation and triggers a browser file download — no API call, no DB write, no server involvement. Readers who use Ask as a research tool can keep a permanent record of what they learned.

## User Stories

- As a first-time reader: After asking 3+ questions, I see "Export ↓" at the bottom of my session. Clicking downloads a `.md` file named `celestial-session.md` with my full Q&A.
- As a re-reader (show_all_content on): Same behaviour — the export captures the full conversation regardless of reader state.
- As the author: No impact — no new routes, no DB tables, no author-facing surfaces.
- As a guest (unauthenticated): Works identically — the export is purely client-side; no auth check needed.

## Implementation

### Phase 1: Export Logic (single file change)

1. Open `src/app/ask/page.tsx`.

2. Add a `handleExport` callback after the existing handler functions (e.g., after `handleSubmit`):

```typescript
const handleExport = useCallback(() => {
  const exportable = messages.filter(m => m.role !== 'system')
  if (exportable.length < 3) return

  const chapterLine = contextStoryTitle
    ? `> Chapter: ${contextStoryTitle}\n`
    : ''
  const header = `# Celestial Archive — Ask Session\n\n${chapterLine}> Exported: ${new Date().toLocaleDateString()}\n\n---\n\n`

  const body = exportable
    .map(m => {
      const label = m.role === 'user' ? '**Q:**' : '**A:**'
      return `${label} ${m.content.trim()}`
    })
    .join('\n\n---\n\n')

  const md = header + body
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'celestial-session.md'
  a.click()
  URL.revokeObjectURL(url)
}, [messages, contextStoryTitle])
```

3. Find the render section that shows the message thread (approximately `ask/page.tsx` lines 700–750). Below the last message bubble and ABOVE the input form, add the export button when 3+ non-system messages exist:

```tsx
{messages.filter(m => m.role !== 'system').length >= 3 && (
  <div className="flex justify-end px-4 pb-2">
    <button
      onClick={handleExport}
      className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-ocean)] transition-colors"
      title="Download this conversation as Markdown"
    >
      Export ↓
    </button>
  </div>
)}
```

**Checkpoint:** Button appears after 3 messages, download triggers on click. Test in browser: open Ask, send 3 messages, verify `.md` file downloads with correct content.

### Phase 2: Edge Cases

4. The `messages` state already includes a system message at index 0 (the initial welcome/context prompt). The `filter(m => m.role !== 'system')` exclusion handles this correctly — only user and assistant turns appear in the export.

5. Long assistant messages with streaming: `m.content` is the fully-accumulated string after stream completion (confirmed — `ask/page.tsx` accumulates chunks into `content` before pushing to the messages array). No streaming-in-progress edge case: the export button only appears after at least 3 complete exchanges.

6. `contextStoryTitle` may be `null` when no `?story=` param is set. The `chapterLine` ternary handles this: omits the chapter line when null.

### Phase 3: Verify

7. Run `npm run lint` — no new imports needed beyond `useCallback` (already imported).
8. Run `npm run build` — `npx next build`.
9. Run `npm test` — no new tests needed (pure client-side UI, no logic testable in unit tests).
10. Manual verification:
    - Open Ask with no story context: send 3 messages, click Export ↓, verify download with generic header (no chapter line).
    - Open Ask from a story page (`?story=CH01`): send 3 messages, click Export ↓, verify chapter line appears: `> Chapter: [CH01 title]`.
    - Open Ask with 0–2 messages: verify button is NOT visible.
    - Guest (no auth): verify button appears and download works (no auth check in export logic).

## Content Considerations

None. No wiki files, no markdown changes, no content pipeline impact.

## Spoiler & Gating Impact

**No spoiler concern.** The export contains only the reader's own session — messages they sent and responses they received. No content is added that wasn't already visible to them. No chapter gating needed: the export is a copy of what the reader has already seen.

## Theme-Specific Requirements (ask-forward)

- Prompt changes: none.
- Latency budget: zero (fully client-side, synchronous).
- Conversation-memory storage model: none — the export is ephemeral (in-page React state only). No persistence. Different from IDEA-075 (pinned Q&A) and IDEA-066 (cross-session resume) — those use DB/localStorage.
- Voice/TTS considerations: none.

## Testing

- [ ] `npx next build` passes
- [ ] `npm run lint` passes (0 errors, ≤ 4 existing warnings)
- [ ] `npm test` passes (192 tests, no regressions)
- [ ] Button appears only when ≥ 3 non-system messages exist
- [ ] Downloaded `.md` file has correct header and Q/A blocks
- [ ] Works for authenticated reader, unauthenticated guest, and re-reader paths
- [ ] System messages excluded from export

## Dependencies

None. Standalone single-file change. No prerequisites.

## Files Modified

- `src/app/ask/page.tsx` — add `handleExport` callback + conditional button JSX (~20 lines total)

## New Files

None.

## Database Changes

None.

## Estimated Total: 15 minutes
