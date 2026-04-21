-- Allow authenticated users to clear their own chapter read rows (mark-all unread).

create policy "Users delete own story_reads"
  on public.sb_story_reads for delete
  using (auth.uid() = user_id);
