-- Fix: replace 'keith' role checks with 'author' in visual table RLS policies.
-- Targets four policies created in migration 035.

-- cel_visual_prompts
drop policy if exists "Keith admin can insert visual prompts" on public.cel_visual_prompts;
drop policy if exists "Keith admin can update visual prompts" on public.cel_visual_prompts;

create policy "Author admin can insert visual prompts"
  on public.cel_visual_prompts for insert
  with check (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );

create policy "Author admin can update visual prompts"
  on public.cel_visual_prompts for update
  using (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );

-- cel_visual_assets
drop policy if exists "Keith admin can insert visual assets" on public.cel_visual_assets;
drop policy if exists "Keith admin can update visual assets" on public.cel_visual_assets;

create policy "Author admin can insert visual assets"
  on public.cel_visual_assets for insert
  with check (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );

create policy "Author admin can update visual assets"
  on public.cel_visual_assets for update
  using (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );
