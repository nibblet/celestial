-- Allow video/mp4 + video/webm in the beyond-media bucket so Runway Gen-4
-- output can be uploaded alongside Imagen stills. Bumps the file-size cap
-- to 100 MB to fit short cinematic clips.
--
-- This is bucket policy, not a normal table migration. Run via Supabase
-- SQL editor in the same shape as supabase/storage-setup.sql.

update storage.buckets
set
  file_size_limit = 100 * 1024 * 1024,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm'
  ]
where id = 'beyond-media';
