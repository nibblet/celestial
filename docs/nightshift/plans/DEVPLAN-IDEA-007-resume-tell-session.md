# Dev Plan: [IDEA-007] Resume Tell Session — Continue an In-Progress Story

**Status (2026-04-15): Implemented.** Logic lives in `StoryContributionWorkspace` (used by `/tell` and `/beyond`), not inline in `tell/page.tsx`. APIs: `GET /api/tell/sessions`, `GET /api/tell/sessions/[id]` — both support `?mode=tell|beyond` to scope sessions by `contribution_mode`.

## What This Does
When a family member starts telling a story on the `/tell` page, their conversation is saved
to Supabase (`sb_story_sessions` + `sb_story_messages`). But if they navigate away or close
the tab, they can never return to that session — the page always starts fresh.

This feature adds a "Continue your story" banner on the Tell page that detects any in-progress
sessions (status: "gathering") and lets the contributor pick up exactly where they left off.
This is especially important for family members who might start a story, get interrupted,
and come back hours or days later.

## User Stories
- As a family member, I want to resume an unfinished story conversation so I don't lose the
  context I already shared with the interviewer.
- As a contributor, I want to see what I've already told the AI so I can continue naturally
  without repeating myself.

## Implementation

### Phase 1: API — Fetch In-Progress Sessions

Create `src/app/api/tell/sessions/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sessions } = await supabase
    .from("sb_story_sessions")
    .select("id, status, created_at, updated_at")
    .eq("contributor_id", user.id)
    .eq("status", "gathering")
    .order("updated_at", { ascending: false })
    .limit(3);

  // For each session, get a preview (first user message)
  const enriched = await Promise.all((sessions || []).map(async (s) => {
    const { data: firstMsg } = await supabase
      .from("sb_story_messages")
      .select("content")
      .eq("session_id", s.id)
      .eq("role", "user")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    return {
      id: s.id,
      updatedAt: s.updated_at,
      preview: firstMsg?.content?.slice(0, 80) || "Untitled story",
    };
  }));

  return Response.json({ sessions: enriched });
}
```

**Checkpoint:** `GET /api/tell/sessions` returns in-progress sessions with preview text.

### Phase 2: Load Session History API

Create `src/app/api/tell/sessions/[id]/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: session } = await supabase
    .from("sb_story_sessions")
    .select("id, contributor_id")
    .eq("id", id)
    .single();

  if (!session || session.contributor_id !== user.id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("sb_story_messages")
    .select("role, content")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return Response.json({ messages: messages || [] });
}
```

**Checkpoint:** `GET /api/tell/sessions/[id]` returns message history for that session.

### Phase 3: UI — Resume Banner and Load Flow

Update `src/app/tell/page.tsx` (or the shared workspace component it renders):

**Actual implementation:** `src/components/tell/StoryContributionWorkspace.tsx`.

1. **Add state** for pending sessions:
```ts
interface PendingSession { id: string; preview: string; updatedAt: string; }
const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
const [sessionsChecked, setSessionsChecked] = useState(false);
```

2. **Fetch on mount** (before user interacts):
```ts
useEffect(() => {
  async function checkSessions() {
    const res = await fetch("/api/tell/sessions");
    if (res.ok) {
      const data = await res.json();
      setPendingSessions(data.sessions || []);
    }
    setSessionsChecked(true);
  }
  checkSessions();
}, []);
```

3. **Add resume handler**:
```ts
async function resumeSession(id: string) {
  setSessionId(id);
  const res = await fetch(`/api/tell/sessions/${id}`);
  if (!res.ok) return;
  const data = await res.json();
  setMessages(data.messages || []);
  setPendingSessions([]);
}
```

4. **Show resume banner** in the empty state (before any messages):
```tsx
{messages.length === 0 && sessionsChecked && pendingSessions.length > 0 && (
  <div className="mb-6 rounded-lg border border-clay-border bg-gold-pale/40 p-4">
    <p className="type-ui text-sm font-medium text-ink mb-2">
      You have an unfinished story:
    </p>
    {pendingSessions.map((s) => (
      <div key={s.id} className="flex items-center justify-between gap-3">
        <p className="type-ui text-sm text-ink-muted truncate flex-1">
          &ldquo;{s.preview}&rdquo;
        </p>
        <button
          onClick={() => resumeSession(s.id)}
          className="type-ui shrink-0 rounded-lg bg-clay px-3 py-1.5 text-sm font-medium text-warm-white hover:bg-clay-mid"
        >
          Continue
        </button>
      </div>
    ))}
    <button
      onClick={() => setPendingSessions([])}
      className="type-ui mt-2 text-xs text-ink-ghost hover:text-ink"
    >
      Start a new story instead
    </button>
  </div>
)}
```

**Checkpoint:** On `/tell`, if user has an in-progress session, the banner appears. Click
"Continue" loads the message history. Clicking "Start a new story" hides the banner.

### Phase 4: Dismiss Completed Sessions

When a draft is composed (`/api/tell/draft`), the session status changes to "drafting" — it
will no longer appear in the pending sessions list. No extra work needed. The `GET /api/tell/sessions`
query already filters for `status = "gathering"` only.

## Content Considerations
None — no markdown or wiki changes.

## Age-Mode Impact
No direct impact. The Tell feature is available to all age modes, but resuming sessions is
most relevant to adult contributors.

## Testing
- [x] Build passes (`npm run build`, 2026-04-15)
- [ ] Start a Tell session, navigate away, return — banner shows with preview
- [ ] Click "Continue" — previous messages load, new messages continue the same session
- [ ] Click "Start a new one instead" — banner dismisses, fresh chat starts
- [ ] After composing a draft, return to `/tell` — banner does NOT show (session is "drafting")
- [ ] No session exists — banner does not show, normal empty state appears

## Dependencies
None. Can be implemented independently.

## Estimated Total: 1.5–2 hours
