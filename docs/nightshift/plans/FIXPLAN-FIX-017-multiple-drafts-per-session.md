# Fix: [FIX-015] Multiple Draft Rows Created for One Tell Session

## Problem
A contributor can accumulate multiple `sb_story_drafts` rows for the same Tell session:

1. User chats with AI → clicks "Write it up for the library" → draft A is composed and saved
2. User clicks "← Back to conversation" (local state resets, but the session in Supabase still has `status='drafting'`)
3. User chats more → clicks "Write it up" again → draft B is inserted for the same `sessionId`

Two issues result:
- **Multiple orphaned drafts in admin view**: Paul sees duplicate entries for the same conversation. The earlier draft (A) is never cleaned up.
- **Inconsistent session status**: After `backToChat()`, the Supabase session status is stuck at `drafting` but the user is back in `gathering` mode. When IDEA-007 (resume Tell session) lands, a session in `drafting` status would be treated as "has a completed draft" and users returning to it would be shown the wrong prompt.

Impact: Low severity today (Paul reviews manually and can ignore duplicates), but will compound as more contributors use `/tell`.

## Root Cause

**Issue 1 — No deduplication on draft insert:** `/api/tell/draft/route.ts` line 124 always does `supabase.from("sb_story_drafts").insert(...)`. There's no check for whether a draft already exists for `sessionId`.

**Issue 2 — Session status not reset on back-to-chat:** `tell/page.tsx` `backToChat()` resets local React state but makes no API call to reset the session's `status` in Supabase from `drafting` → `gathering`.

## Steps

### Part A: Upsert draft instead of insert

1. Open `src/app/api/tell/draft/route.ts`

2. Before the `insert` block (around line 124), add a lookup for an existing draft:

```js
// Check for existing draft for this session
const { data: existingDraft } = await supabase
  .from("sb_story_drafts")
  .select("id")
  .eq("session_id", sessionId)
  .eq("status", "draft")
  .single();
```

3. If `existingDraft` exists, update it instead of inserting:

```js
let savedDraft;
let draftError;

if (existingDraft) {
  const { data, error } = await supabase
    .from("sb_story_drafts")
    .update({
      title: draft.title || "Untitled Story",
      body: draft.body || "",
      life_stage: draft.life_stage || null,
      year_start: draft.year_start || null,
      year_end: draft.year_end || null,
      themes: draft.themes || [],
      principles: draft.principles || [],
      quotes: draft.quotes || [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingDraft.id)
    .select("id")
    .single();
  savedDraft = data;
  draftError = error;
} else {
  const { data, error } = await supabase
    .from("sb_story_drafts")
    .insert({
      session_id: sessionId,
      contributor_id: user.id,
      title: draft.title || "Untitled Story",
      body: draft.body || "",
      life_stage: draft.life_stage || null,
      year_start: draft.year_start || null,
      year_end: draft.year_end || null,
      themes: draft.themes || [],
      principles: draft.principles || [],
      quotes: draft.quotes || [],
      status: "draft",
    })
    .select("id")
    .single();
  savedDraft = data;
  draftError = error;
}
```

4. Remove the original single `insert` block.

### Part B: Reset session status when going back to chat

5. Open `src/app/tell/page.tsx`

6. In `backToChat()`, add a PATCH call to reset session status:

```js
function backToChat() {
  if (sessionId) {
    // Reset session status so it doesn't appear as "has a draft" in resume logic
    fetch("/api/tell", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, status: "gathering" }),
    }).catch(() => {}); // Fire-and-forget — non-critical
  }
  setViewMode("chat");
  setDraft(null);
}
```

7. Open `src/app/api/tell/route.ts` and add a `PATCH` handler after the existing `POST` export:

```js
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, status } = await request.json() as { sessionId: string; status: string };
  if (!sessionId || !["gathering", "drafting"].includes(status)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify session belongs to this user
  const { data: session } = await supabase
    .from("sb_story_sessions")
    .select("id, contributor_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.contributor_id !== user.id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  await supabase
    .from("sb_story_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  return Response.json({ ok: true });
}
```

8. Run `npm run build` to verify no breakage.

9. Run `npm run lint`.

## Files Modified
- `src/app/api/tell/draft/route.ts` — check for existing draft before insert, upsert if found
- `src/app/tell/page.tsx` — `backToChat()` fires a PATCH to reset session status
- `src/app/api/tell/route.ts` — new PATCH handler to update session status

## Verify
- [ ] Build passes
- [ ] Lint passes clean
- [ ] Compose a draft → go back to chat → compose again → confirm only ONE draft row exists in `sb_story_drafts` for the session (check Supabase table editor)
- [ ] After back-to-chat, session `status` in `sb_story_sessions` returns to `gathering` (check table editor)
- [ ] Normal flow (single draft compose → submit) still works correctly
- [ ] Admin `/admin/drafts` shows no duplicates
