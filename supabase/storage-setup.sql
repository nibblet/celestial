-- Beyond canvas Storage bucket setup. Run once in the Supabase SQL editor.
--
-- Creates the `beyond-media` bucket with public read, and RLS policies that
-- allow Keith/admin (and draft owners, for their own drafts) to upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beyond-media',
  'beyond-media',
  true,                                  -- public read via URL
  15 * 1024 * 1024,                      -- 15 MB cap
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read: anyone can read from the bucket (mirrors public=true).
drop policy if exists "Public read beyond-media" on storage.objects;
create policy "Public read beyond-media"
  on storage.objects for select
  using (bucket_id = 'beyond-media');

-- Write: authenticated users whose role is keith/admin, or any authed user
-- uploading to a path prefix they own. Path convention:
--   stories/{draft_id}/{uuid}.{ext}
--   people/{person_uuid}/{uuid}.{ext}
-- The server-side API route enforces the deeper ownership checks (e.g.,
-- that the draft really belongs to the uploader). This policy just keeps
-- anonymous writes out.
drop policy if exists "Keith admin can write beyond-media" on storage.objects;
create policy "Keith admin can write beyond-media"
  on storage.objects for insert
  with check (
    bucket_id = 'beyond-media'
    and exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'keith' or p.role = 'admin')
    )
  );

drop policy if exists "Keith admin can update beyond-media" on storage.objects;
create policy "Keith admin can update beyond-media"
  on storage.objects for update
  using (
    bucket_id = 'beyond-media'
    and exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'keith' or p.role = 'admin')
    )
  );

drop policy if exists "Admin can delete beyond-media" on storage.objects;
create policy "Admin can delete beyond-media"
  on storage.objects for delete
  using (
    bucket_id = 'beyond-media'
    and exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
