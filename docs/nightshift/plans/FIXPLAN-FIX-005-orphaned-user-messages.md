# Fix: [FIX-005] Orphaned User Messages on Stream Failure

## Problem
In `/api/ask/route.ts`, the user's message is inserted into `sb_messages` (line ~52) **before** the Claude stream starts. If the stream subsequently fails (API error, network timeout, Anthropic outage), the user message is persisted in the DB but no assistant response is ever saved.

**Impact:** On the next `/ask` session load (if conversation history is ever restored), Claude will receive a dangling user message with no assistant response at the end of the history. This can cause confused, out-of-context responses. In the current UI this is invisible since history is not loaded on page refresh — but once conversation resumption is built, it will surface.

## Root Cause
`src/app/api/ask/route.ts`:
```
// Save user message (line ~52)
await supabase.from("sb_messages").insert({ role: "user", ... });

// Load history (includes the message we just saved)
const { data: history } = await supabase.from("sb_messages")...

// Start Claude stream
const stream = anthropic.messages.stream(...)

// ← Stream failure here leaves user message with no assistant response
```

## Steps

### Option A (Simple): Delete user message on stream error

Inside the `ReadableStream start()` callback, in the `catch(err)` block, add a cleanup step:

```typescript
} catch (err) {
  // Clean up the orphaned user message if stream fails before any response
  if (!fullResponse) {
    await supabase
      .from("sb_messages")
      .delete()
      .eq("conversation_id", convId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1);
  }
  const errorMessage = err instanceof Error ? err.message : "Unknown error";
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
  );
  controller.close();
}
```

> **Note:** Supabase JS client doesn't support `ORDER BY + LIMIT` on delete directly. Use a subquery approach or delete by exact timestamp.

### Option B (Cleaner): Track the inserted message ID and delete it on failure

1. Capture the inserted user message ID after insert:
   ```typescript
   const { data: savedMsg } = await supabase
     .from("sb_messages")
     .insert({ conversation_id: convId, role: "user", content: message })
     .select("id")
     .single();
   const userMessageId = savedMsg?.id;
   ```

2. In the `catch(err)` block, delete by ID if no response was generated:
   ```typescript
   if (!fullResponse && userMessageId) {
     await supabase.from("sb_messages").delete().eq("id", userMessageId);
   }
   ```

**Recommended:** Option B — precise and safe.

### Steps to implement Option B:

1. Open `src/app/api/ask/route.ts`
2. Update the user message insert at line ~52 to capture the returned ID:
   ```typescript
   const { data: savedUserMsg } = await supabase
     .from("sb_messages")
     .insert({ conversation_id: convId, role: "user", content: message })
     .select("id")
     .single();
   const userMessageId = savedUserMsg?.id ?? null;
   ```
3. In the `catch(err)` block inside `ReadableStream.start()`, add:
   ```typescript
   if (!fullResponse && userMessageId) {
     await supabase.from("sb_messages").delete().eq("id", userMessageId);
   }
   ```
4. Run `npm run build` to confirm no type errors
5. Run `npm run lint`

## Files Modified
- `src/app/api/ask/route.ts` — capture user message ID; delete on stream failure with no response

## New Files
None

## Database Changes
None — uses existing RLS; the server-side Supabase client has permission to delete messages in conversations owned by the requesting user.

## Verify
- [ ] Build passes
- [ ] Normal conversation flow still saves both user and assistant messages
- [ ] Simulating an API error (temporarily invalid ANTHROPIC_API_KEY in .env.local) results in no orphaned user message in the DB
