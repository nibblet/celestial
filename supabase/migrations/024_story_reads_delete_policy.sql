-- Allow authenticated users to clear their own chapter read rows (mark-all unread).
-- Mirror onto cel_story_reads (see 023_cel_table_namespace.sql); app routes sb_* → cel_*.

create policy "Users delete own story_reads"
  on public.sb_story_reads for delete
  using (auth.uid() = user_id);

do $$
begin
  if to_regclass('public.cel_story_reads') is not null then
    execute 'drop policy if exists "Users delete own story_reads" on public.cel_story_reads';
    execute $pol$
      create policy "Users delete own story_reads"
        on public.cel_story_reads for delete
        using (auth.uid() = user_id)
    $pol$;
  end if;
end $$;
