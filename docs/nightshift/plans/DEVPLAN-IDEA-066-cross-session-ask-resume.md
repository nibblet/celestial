# Dev Plan: [IDEA-066] Cross-Session Ask Resume — "Continue Where You Left Off"
**Theme:** ask-forward

## What This Does

When an authenticated reader opens `/ask?story={storyId}` and their browser has a record of a prior Ask conversation for that story, the empty state shows a "Continue where you left off" card displaying the first question from that session as a preview — with a "Continue" button and a "Start fresh" link.

Clicking **Continue** loads the full prior conversation via the existing `GET /api/conversations/{id}` endpoint and resumes the thread. Clicking **Start fresh** dismisses the card and clears the browser record. The conversation reference is stored in `localStorage` when a conversation for that story first begins, so no DB migration or new API route is needed.

## User Stories

- **As a first-time reader** visiting Ask for the first time (or a different story than before): no change — no localStorage entry exists, generic empty state shown with suggestion chips.
- **As a returning reader** who asked about CH03 yesterday and is back today: sees "Continue where you left off — [preview of first question]" card above the suggestion chips. Can resume in one tap or start fresh.
- **As a guest (unauthenticated)**: no change — guests cannot persist conversations (the `/api/ask` route returns 401 for unauthenticated users; `conversationId` is never set; no localStorage entry is written).
- **As the author**: unaffected — the feature is a pure Ask page empty-state change; author's own Ask sessions function identically.

## Implementation

### Phase 1: Persist conversation reference to localStorage when a conversation starts

When `conversationId` transitions from `null` to a real UUID and `storySlug` is present, write the first user message (as a preview) plus the conversation ID to localStorage.

**File:** `src/app/ask/page.tsx`

Add a `useEffect` after the existing `storySlug` meta-fetch `useEffect` (line ~381):

```typescript
// Persist conversation reference for "continue where you left off"
useEffect(() => {
  if (!conversationId || !storySlug || messages.length === 0) return;
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return;
  try {
    window.localStorage.setItem(
      `celestial_conv_${storySlug}`,
      JSON.stringify({
        id: conversationId,
        preview: firstUser.content.slice(0, 80),
      })
    );
  } catch { /* ignore */ }
}, [conversationId, storySlug, messages]);
```

**Checkpoint:** Open Ask for a story, send a message, then open DevTools → Application → localStorage. Verify `celestial_conv_{storyId}` key exists with `{ id, preview }`.

### Phase 2: Add `priorSession` state and load from localStorage on storySlug change

In the state declarations block (~line 255), add:

```typescript
const [priorSession, setPriorSession] = useState<{
  id: string;
  preview: string;
} | null>(null);
```

Add a new `useEffect` immediately after the state declarations block, before the first existing `useEffect`:

```typescript
// Load prior session reference from localStorage when story context changes
useEffect(() => {
  if (!storySlug) {
    setPriorSession(null);
    return;
  }
  try {
    const raw = window.localStorage.getItem(`celestial_conv_${storySlug}`);
    if (!raw) {
      setPriorSession(null);
      return;
    }
    const parsed = JSON.parse(raw) as { id?: string; preview?: string };
    if (parsed?.id && parsed?.preview) {
      setPriorSession(parsed as { id: string; preview: string });
    } else {
      setPriorSession(null);
    }
  } catch {
    setPriorSession(null);
  }
}, [storySlug]);
```

**Checkpoint:** Reload the page with `?story=ch01`. `priorSession` should be non-null if the localStorage key from Phase 1 is present.

### Phase 3: Add `continuePriorSession` callback

Add after the `sendMessage` `useCallback` (~line 527), before the `useEffect` block:

```typescript
const continuePriorSession = useCallback(
  async (sessionId: string) => {
    setPriorSession(null);
    setMessages([]);
    setConversationId(null);
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(sessionId)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages: Array<{
          role: string;
          content: string;
          evidence?: AskMessageEvidence;
        }>;
      };
      if (!data?.messages?.length) return;
      setMessages(
        data.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          ...(m.evidence ? { evidence: m.evidence } : {}),
        }))
      );
      setConversationId(sessionId);
    } catch { /* silently fail — user is already in a clean state */ }
  },
  []
);
```

**Checkpoint:** Call `continuePriorSession(id)` from DevTools console (after extracting an ID from localStorage). Verify messages load and conversation continues correctly on next send.

### Phase 4: Render "Continue" card in empty state

In the empty state block (~line 672–691), insert the "Continue" card **inside** the outer `div` before the suggestion chips `div`:

```jsx
{messages.length === 0 &&
  !(highlightIdFromUrl && highlightHydration === "loading") && (
  <div className="py-12 text-center">
    {/* NEW: Prior session resume card */}
    {priorSession && storySlug && (
      <div className="mx-auto mb-6 max-w-sm rounded-lg border border-[var(--color-border)] bg-warm-white px-4 py-3 text-left">
        <p className="type-meta mb-1 text-xs text-ink-ghost">
          Continue where you left off
        </p>
        <p className="mb-3 truncate font-[family-name:var(--font-lora)] text-sm text-ink">
          &ldquo;{priorSession.preview}&hellip;&rdquo;
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void continuePriorSession(priorSession.id)}
            className="type-ui rounded-full bg-clay px-3 py-1.5 text-xs text-warm-white transition-colors hover:bg-clay-mid"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => {
              setPriorSession(null);
              try {
                window.localStorage.removeItem(`celestial_conv_${storySlug}`);
              } catch { /* ignore */ }
            }}
            className="type-ui rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-clay-border hover:text-clay"
          >
            Start fresh
          </button>
        </div>
      </div>
    )}
    {/* EXISTING: Suggestion chips — unchanged */}
    <p className="mb-4 text-sm text-ink-muted">
      What would you like to know about {book.title}?
    </p>
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTIONS_BY_AGE_MODE[ageMode].map((suggestion) => (
        ...
      ))}
    </div>
  </div>
)}
```

**Checkpoint:**
1. Open `/ask?story=ch01` cold (no prior localStorage) → card does NOT appear.
2. Send one message, end the session.
3. Reload `/ask?story=ch01` → "Continue where you left off" card appears with preview.
4. Click "Continue" → messages load; new message continues the conversation.
5. Send a new message in the resumed session → verify conversation persists (no duplicate conversation created).
6. Open `/ask?story=ch02` → card does NOT appear (different story key).
7. Click "Start fresh" on the ch01 card → card dismisses; localStorage key cleared; suggestion chips shown.

## Files Modified

- `src/app/ask/page.tsx` — Add 1 state variable, 2 `useEffect` hooks, 1 `useCallback`, and ~25 lines JSX in the empty state block. Net addition ~60 lines.

## New Files

None.

## Database Changes

None. The `GET /api/conversations/{id}` endpoint already exists and is reused.

## Spoiler & Gating Impact

- **Does this touch locked content?** No. The feature only retrieves and re-displays conversations the reader already initiated. Under companion-first all content is visible to all users.
- **Gate enforcement:** Conversations are created only for authenticated users (the Ask API returns 401 for guests, so no `conversationId` is ever set in the guest case, and no localStorage entry is written). The `GET /api/conversations/{id}` endpoint uses RLS — users can only fetch their own conversations.
- **Unlocked-state UX:** No change. The "Continue" card only appears when a prior session exists for that story.
- **Ask-filter impact:** None. The conversation messages are loaded directly from the DB (already filtered at write time); no spoiler risk from loading a prior conversation.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None — this feature doesn't modify what goes to the AI.
- **Latency budget:** The `GET /api/conversations/{id}` call is a simple Supabase query (messages for one conversation). Typical latency <100ms. No user-blocking load — the "Continue" action is user-triggered, not automatic.
- **Conversation-memory storage model:** Uses `localStorage` for the session reference (cross-session within the same browser/device). Full conversation history lives in `cel_conversations`/`cel_messages` in Supabase — unchanged.
- **Voice/TTS considerations:** Not applicable.

## Edge Cases

1. **Deleted conversation:** If the conversation row was deleted in Supabase, `GET /api/conversations/{id}` returns 404. The `continuePriorSession` callback fails silently (messages stay empty; user sees the normal empty state). The localStorage key is NOT cleared in this case — on next visit the stale "Continue" card will reappear but will fail silently again. Fix if needed: on a 404 response, also call `localStorage.removeItem()`.
2. **Corrupted localStorage:** The `try/catch` in the `useEffect` handles `JSON.parse` failures — `priorSession` will be `null`, degrading gracefully to the normal empty state.
3. **Prior session from a different story:** The localStorage key is namespaced by `celestial_conv_{storySlug}`, so cross-story contamination is impossible.
4. **React Strict Mode double-fire:** Both `useEffect`s are idempotent (reads/writes are deterministic); no risk.

## Testing

- [ ] `npm run build` passes (no new types or imports needed)
- [ ] `npm run lint` passes
- [ ] Guest path: open `/ask?story=ch01` without being logged in → no "Continue" card, no localStorage write after sending (the send fails with 401 before `conversationId` is set)
- [ ] Authenticated path — new conversation: open Ask, send message → `celestial_conv_{storyId}` key appears in localStorage
- [ ] Authenticated path — returning: reload → "Continue" card with correct preview
- [ ] Continue flow: click Continue → messages load → can send followup → conversation continues on same ID
- [ ] Start fresh: click "Start fresh" → card dismisses → localStorage key removed → conversation starts fresh

## Dependencies

- Requires no new npm packages
- Requires no DB migration
- Requires no new API routes
- `GET /api/conversations/{id}` endpoint must remain available (currently at `src/app/api/conversations/[id]/route.ts`)

## Estimated Total: 1.5 hours
