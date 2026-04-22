-- Ask / conversations: cel_* must allow authenticated users to manage their own rows.
-- 023 clones with LIKE INCLUDING ALL; RLS policies are not copied, so RLS-on with zero
-- policies denies all writes. Message policies cloned from sb may still reference sb_conversations.
--
-- Replaces policies on cel_conversations and cel_messages only (does not touch sb_*).

do $$
declare
  pol record;
begin
  if to_regclass('public.cel_conversations') is null
     or to_regclass('public.cel_messages') is null then
    raise notice '033: skip — cel_conversations or cel_messages missing';
    return;
  end if;

  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'cel_messages'
  loop
    execute format('drop policy if exists %I on public.cel_messages', pol.policyname);
  end loop;

  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'cel_conversations'
  loop
    execute format('drop policy if exists %I on public.cel_conversations', pol.policyname);
  end loop;

  execute $sql$
    create policy "SB users can read own conversations"
      on public.cel_conversations for select
      using (auth.uid() = user_id)
  $sql$;

  execute $sql$
    create policy "SB users can create own conversations"
      on public.cel_conversations for insert
      with check (auth.uid() = user_id)
  $sql$;

  execute $sql$
    create policy "SB users can update own conversations"
      on public.cel_conversations for update
      using (auth.uid() = user_id)
  $sql$;

  execute $sql$
    create policy "SB users can delete own conversations"
      on public.cel_conversations for delete
      using (auth.uid() = user_id)
  $sql$;

  execute $sql$
    create policy "SB users can read messages in own conversations"
      on public.cel_messages for select
      using (
        exists (
          select 1 from public.cel_conversations cc
          where cc.id = cel_messages.conversation_id
            and cc.user_id = auth.uid()
        )
      )
  $sql$;

  execute $sql$
    create policy "SB users can create messages in own conversations"
      on public.cel_messages for insert
      with check (
        exists (
          select 1 from public.cel_conversations cc
          where cc.id = cel_messages.conversation_id
            and cc.user_id = auth.uid()
        )
      )
  $sql$;

  execute $sql$
    create policy "SB users can delete messages in own conversations"
      on public.cel_messages for delete
      using (
        exists (
          select 1 from public.cel_conversations cc
          where cc.id = cel_messages.conversation_id
            and cc.user_id = auth.uid()
        )
      )
  $sql$;
end $$;
