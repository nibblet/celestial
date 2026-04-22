-- Repair: migration 024 originally added delete-on-own-rows only for sb_story_reads.
-- Celestial reads/writes cel_story_reads (withCelTablePrefix). Apply the same policy.

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
