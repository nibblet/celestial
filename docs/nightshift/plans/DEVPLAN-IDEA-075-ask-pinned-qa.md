# Dev Plan: [IDEA-075] Ask Pinned Q&A — Star and Save Individual Ask Exchanges
**Theme:** ask-forward

## What This Does
Readers can tap a star icon on any assistant message bubble to pin that exchange (the paired user question + assistant answer). Pinned exchanges appear in a new "Pinned Exchanges" section at the top of `/profile/questions`, making the Ask companion feel like a personal research tool. A pinned pair is stored in `cel_messages` with a snapshot of the paired question so the profile page query is a single fetch.

## User Stories
- As a first-time reader, I star an answer about ALARA's nature and find it later under "Pinned" in my profile — no scrolling through conversation history needed.
- As a re-reader (`show_all_content` on), I pin a handful of answers about plot foreshadowing and use them as a personal annotation layer for my reread notes.
- As the author, I see no impact — pinned data stays in `cel_messages` (reader-private, RLS-gated).

## Implementation

### Phase 1: Migration — Add `pinned` and `pin_question_snapshot` to `cel_messages`

1. Create `supabase/migrations/042_cel_messages_pinned.sql`:
   ```sql
   -- Migration 042: Add pinned flag and question snapshot to cel_messages
   -- Migrations 040 (FIX-026) and 041 (FIX-052) must run first.

   alter table public.cel_messages
     add column if not exists pinned boolean not null default false,
     add column if not exists pin_question_snapshot text;

   create index if not exists cel_messages_pinned_idx
     on public.cel_messages (conversation_id, pinned)
     where pinned = true;
   ```
   No new RLS policies needed: existing `cel_messages` RLS already scopes reads/writes to the message owner via the `cel_conversations` parent FK.

2. **Checkpoint:** `npx supabase db push` in dev env confirms migration applies cleanly. No test breakage (tests don't rely on `cel_messages` column count).

### Phase 2: New API Route — `/api/ask/pin`

1. Create `src/app/api/ask/pin/route.ts`:
   ```ts
   import { NextRequest } from "next/server";
   import { createClient } from "@/lib/supabase/server";

   export async function POST(req: NextRequest) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

     const { messageId, pinned } = await req.json() as { messageId: string; pinned: boolean };
     if (!messageId || typeof pinned !== "boolean") {
       return Response.json({ error: "Invalid body" }, { status: 400 });
     }

     // Resolve the paired user question when pinning (not when unpinning)
     let pin_question_snapshot: string | null = null;
     if (pinned) {
       // Find this message's conversation and the user message immediately before it
       const { data: target } = await supabase
         .from("cel_messages")
         .select("conversation_id, created_at")
         .eq("id", messageId)
         .single();

       if (target) {
         const { data: prev } = await supabase
           .from("cel_messages")
           .select("content")
           .eq("conversation_id", target.conversation_id)
           .eq("role", "user")
           .lt("created_at", target.created_at)
           .order("created_at", { ascending: false })
           .limit(1)
           .single();
         pin_question_snapshot = prev?.content ?? null;
       }
     }

     const { error } = await supabase
       .from("cel_messages")
       .update({ pinned, pin_question_snapshot: pinned ? pin_question_snapshot : null })
       .eq("id", messageId);
     // RLS ensures only the message owner can update

     if (error) return Response.json({ error: error.message }, { status: 500 });
     return Response.json({ ok: true });
   }
   ```

2. **Checkpoint:** `curl -X POST /api/ask/pin` with a valid `messageId` for a message owned by the test user returns `{ ok: true }`.

### Phase 3: Star Button in `ask/page.tsx`

1. Add `pinned?: boolean` to the `Message` interface (line 58–64):
   ```ts
   interface Message {
     role: "user" | "assistant";
     content: string;
     id?: string;
     evidence?: AskMessageEvidence | null;
     pinned?: boolean;          // ← add
   }
   ```

2. Propagate `pinned` when loading conversation history. In the `loadConversation` helper (search for where `cel_messages` is fetched via `/api/conversations/{id}` and mapped to `Message[]`), add `pinned: m.pinned ?? false` to the map. The `GET /api/conversations/[id]/route.ts` currently selects `"role, content"` — extend the select to `"id, role, content, pinned"`.

3. Also propagate when the assistant message is finalized from the SSE stream. After streaming completes, the assistant message in local state has `id` (from the `done` event if returned, or from `savedUserMsg` context). Add `pinned: false` as default on creation.

4. Add the star toggle UI inside the assistant message bubble (after `AskSourcesDisclosure`, still inside the `msg.role === "assistant"` branch, approximately line 714):
   ```tsx
   {msg.id && (
     <button
       onClick={async () => {
         const next = !msg.pinned;
         // Optimistic update
         setMessages(msgs =>
           msgs.map(m => m.id === msg.id ? { ...m, pinned: next } : m)
         );
         await fetch("/api/ask/pin", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ messageId: msg.id, pinned: next }),
         });
       }}
       title={msg.pinned ? "Unpin this answer" : "Pin this answer"}
       className={`mt-2 flex items-center gap-1 text-xs transition-colors ${
         msg.pinned
           ? "text-clay hover:text-clay/70"
           : "text-ink-ghost hover:text-clay"
       }`}
     >
       {msg.pinned ? "★ Pinned" : "☆ Pin"}
     </button>
   )}
   ```
   Use `★`/`☆` Unicode stars so no new npm packages are needed. Wrap in `{msg.id && ...}` so the button only renders for DB-persisted messages (not the in-flight streaming bubble).

5. **Checkpoint:** In dev, ask a question, receive answer, click ☆ → optimistic UI shows ★ Pinned, DB row updated. Click again → unpins. Reload conversation → pinned state persists (loaded from DB).

### Phase 4: Pinned Section on `/profile/questions`

1. In `src/app/profile/questions/page.tsx`, add a `PinnedPair` type and a Supabase query after the existing `sb_chapter_questions` fetch:
   ```ts
   type PinnedPair = {
     id: string;
     content: string;               // assistant answer
     pin_question_snapshot: string | null;
     created_at: string;
     conversation_id: string;
   };

   const { data: pinned } = await supabase
     .from("cel_messages")
     .select("id, content, pin_question_snapshot, created_at, conversation_id")
     .eq("pinned", true)
     .eq("role", "assistant")
     .order("created_at", { ascending: false })
     .limit(50);
   ```
   RLS scopes this to the current user's conversations automatically.

2. Add a "Pinned Exchanges" section above the existing question list. Render only if `pinned && pinned.length > 0`:
   ```tsx
   {pinned && pinned.length > 0 && (
     <section className="mb-8">
       <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
         Pinned Exchanges
       </h2>
       <div className="space-y-4">
         {pinned.map(p => (
           <div key={p.id} className="sci-card-link rounded-xl border border-[var(--color-border)] p-4">
             {p.pin_question_snapshot && (
               <p className="mb-2 text-xs text-ink-muted">
                 <span className="font-medium">You asked:</span> {p.pin_question_snapshot}
               </p>
             )}
             <p className="text-sm text-ink line-clamp-4">{p.content}</p>
             <div className="mt-2 flex gap-3 text-xs text-ink-ghost">
               <span>{formatDate(p.created_at)}</span>
               <Link href={`/ask?conversation=${p.conversation_id}`} className="text-ocean hover:underline">
                 Open conversation →
               </Link>
             </div>
           </div>
         ))}
       </div>
     </section>
   )}
   ```

3. **Checkpoint:** Pin an answer in `/ask`, navigate to `/profile/questions` — the pinned section appears with the snapshot question and a truncated answer. "Open conversation →" link goes to `/ask?conversation={id}` (existing resumption path).

## Content Considerations
No wiki content impact. No new markdown files. No `brain_lab` ingest changes.

## Spoiler & Gating Impact
- **Does this touch locked content?** No — pinned data is reader-generated. Readers can only pin answers they've already received, which the Ask companion produced from their unlocked context.
- **Gate enforcement:** Auth required (no guest path — `msg.id` is only set for authenticated users whose messages are persisted). The star button is absent for messages without an `id`.
- **Unlocked-state UX:** All users see all content under companion-first; no additional gating logic needed.
- **Ask-filter impact:** None — the pin route reads/writes `cel_messages` only; it does not touch the retrieval or prompt layer.

## Theme-Specific Requirements — ask-forward
- **Prompt changes:** None.
- **Latency budget:** The star click fires a non-blocking `fetch` after an optimistic UI update — zero perceived latency for the user.
- **Conversation-memory storage model:** Uses existing `cel_messages` table + 2 new columns. No new DB tables.
- **Voice/TTS:** N/A.

## Testing
- [ ] `npm run build` — confirms new route and extended `Message` type compile cleanly
- [ ] `npm run lint` — no new warnings
- [ ] `npm test` — 192 tests still pass (no existing tests touch the pin route or `cel_messages.pinned`)
- [ ] Locked-reader path: star button only appears when `msg.id` is set (authenticated user), which is always the case for logged-in readers under companion-first; guests cannot ask questions (no auth)
- [ ] Unlocked / re-reader path: same behavior; `show_all_content` does not affect pinning
- [ ] Guest-cookie path: not applicable — guest users have no `cel_messages` rows
- [ ] Unpin flow: clicking ★ Pinned → optimistic toggle to ☆, API fires, DB updates, reload confirms unpinned state; profile page no longer shows the pair
- [ ] Profile page with zero pins: the "Pinned Exchanges" section is absent entirely
- [ ] `pin_question_snapshot` null case: pair still renders with only the answer (no "You asked:" prefix)

## Dependencies
- Migration 040 (FIX-026) and migration 041 (FIX-052) must run before migration 042
- No new npm packages

## Files Modified
- `supabase/migrations/042_cel_messages_pinned.sql` (new)
- `src/app/api/ask/pin/route.ts` (new)
- `src/app/api/conversations/[id]/route.ts` (extend select to include `pinned`)
- `src/app/ask/page.tsx` (Message interface + pin button + conversation load mapping)
- `src/app/profile/questions/page.tsx` (PinnedPair type + query + Pinned Exchanges section)

## Database Changes
- `supabase/migrations/042_cel_messages_pinned.sql` — adds `pinned boolean default false` + `pin_question_snapshot text` + index to `cel_messages`

## Estimated Total: 2.5 hours
(Migration: 15 min; API route: 30 min; ask/page.tsx star button: 45 min; profile page section: 45 min; testing: 15 min)
