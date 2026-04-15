# Dev Plan: [IDEA-013] Story Reading Progress

## What This Does
Tracks which of Keith's 39 stories each family member has read, and surfaces that progress visually. A checkmark badge appears on read stories in the library, and the profile page shows "You've read X of 39 stories." This creates a gentle sense of journey through the archive — grandchildren especially will feel motivated to "collect" all 39 stories, the same way they might complete a book series.

This does NOT gate any content. Reading progress is purely additive and celebratory. A story is marked "read" automatically when a user visits its detail page (no action required).

## User Stories
- As a grandchild, I want to see which Keith stories I've already read so I know what to explore next.
- As a family member, I want to see my reading progress so I feel a sense of accomplishment working through the archive.
- As Paul, I want to encourage family engagement without adding friction — read tracking should be automatic, not a button to click.

## Implementation

### Phase 1: Database — Track Reads

1. Create a new Supabase migration `004_story_reads.sql`:
   ```sql
   CREATE TABLE sb_story_reads (
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     story_id TEXT NOT NULL,
     read_at TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (user_id, story_id)
   );

   ALTER TABLE sb_story_reads ENABLE ROW LEVEL SECURITY;

   -- Users can only see and write their own reads
   CREATE POLICY "Users read own story_reads" ON sb_story_reads
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users insert own story_reads" ON sb_story_reads
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

2. Apply migration in Supabase dashboard or via CLI.

3. **Checkpoint:** Table exists, RLS blocks cross-user queries.

### Phase 2: API — Mark a Story as Read

1. Create `src/app/api/stories/[storyId]/read/route.ts`:
   ```ts
   import { createClient } from "@/lib/supabase/server";

   export async function POST(
     _request: Request,
     { params }: { params: { storyId: string } }
   ) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

     await supabase.from("sb_story_reads").upsert(
       { user_id: user.id, story_id: params.storyId },
       { onConflict: "user_id,story_id", ignoreDuplicates: true }
     );

     return Response.json({ ok: true });
   }
   ```

2. **Checkpoint:** POST `/api/stories/P1_S01/read` marks story as read.

### Phase 3: Mark Story as Read on Page Load

1. Open `src/app/stories/[storyId]/page.tsx` (server component).

2. After rendering the story, add a client-side fire-and-forget call. Create a small client component `src/components/story/ReadTracker.tsx`:
   ```tsx
   "use client";
   import { useEffect } from "react";

   export function ReadTracker({ storyId }: { storyId: string }) {
     useEffect(() => {
       fetch(`/api/stories/${storyId}/read`, { method: "POST" }).catch(() => {});
     }, [storyId]);
     return null;
   }
   ```

3. Import and render `<ReadTracker storyId={storyId} />` at the bottom of the story detail page component.

4. **Checkpoint:** Visiting any story page silently marks it as read.

### Phase 4: Read Badges in Story Library

1. Open `src/app/stories/page.tsx`.

2. In the server component, fetch the user's read story IDs:
   ```ts
   const supabase = await createClient();
   const { data: { user } } = await supabase.auth.getUser();
   const { data: reads } = user
     ? await supabase
         .from("sb_story_reads")
         .select("story_id")
         .eq("user_id", user.id)
     : { data: [] };
   const readSet = new Set((reads || []).map((r) => r.story_id));
   ```

3. Pass `readSet` down to story cards. Add a small checkmark badge to each card where `readSet.has(story.storyId)`:
   ```tsx
   {readSet.has(story.storyId) && (
     <span
       className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs"
       title="Read"
       aria-label="Read"
     >
       ✓
     </span>
   )}
   ```
   (Ensure the card wrapper has `relative` positioning.)

4. **Checkpoint:** Visit 2-3 stories, return to library — those cards show a green checkmark.

### Phase 5: Reading Progress on Profile Page

1. Open `src/app/profile/page.tsx`.

2. Fetch the count of reads for the current user alongside existing profile data:
   ```ts
   const { count } = await supabase
     .from("sb_story_reads")
     .select("story_id", { count: "exact", head: true })
     .eq("user_id", user.id);
   const readCount = count || 0;
   const totalStories = 39; // Volume 1 count
   ```

3. Add a progress display in the profile UI:
   ```tsx
   <div className="rounded-lg border border-[var(--color-border)] bg-warm-white p-4">
     <p className="type-ui text-xs font-medium text-ink-muted mb-2">
       Reading Progress
     </p>
     <div className="flex items-center gap-3">
       <div className="flex-1 rounded-full bg-[var(--color-border)] h-2 overflow-hidden">
         <div
           className="h-full bg-clay rounded-full transition-all"
           style={{ width: `${(readCount / totalStories) * 100}%` }}
         />
       </div>
       <span className="type-ui text-sm text-ink shrink-0">
         {readCount} / {totalStories}
       </span>
     </div>
     {readCount === totalStories && (
       <p className="type-ui text-xs text-clay mt-2">
         You've read all of Keith's stories!
       </p>
     )}
   </div>
   ```

4. **Checkpoint:** Profile shows progress bar. Reads update after visiting stories.

## Content Considerations
- Volume 1 stories only (39 total). When Volume 2 stories are published, `totalStories` could be dynamic (fetch from Supabase story count).
- No wiki file changes needed.

## Age-Mode Impact
- All age modes benefit equally. Young readers may need encouragement copy ("You've read 5 stories! Keep going!") as a future enhancement.
- No mode-specific behavior in this initial implementation.

## Testing
- [ ] Build passes
- [ ] Lint passes
- [ ] Migration applied successfully in Supabase
- [ ] Visiting a story marks it read (verify via Supabase table)
- [ ] Library shows checkmarks on read stories
- [ ] Profile shows correct count and progress bar
- [ ] Two different users have separate read tracking (RLS verified)
- [ ] Reading the same story twice doesn't create duplicate rows

## Dependencies
- None (can be done after any other current fix)
- Supabase migration must be applied before deploying

## Estimated Total: 1.5 hours
