-- Corpus-to-prompt synthesizer: caches structured visual prompts derived from
-- the wiki corpus, plus the generated image/video assets so we can serve a
-- locked-in result whenever the same (target, style, version) combo is hit.
--
-- Two tables:
--   cel_visual_prompts  — one row per (target × style × synth_version)
--   cel_visual_assets   — one row per generated asset (N per prompt across
--                         providers / model params)
--
-- Assets live in the existing `beyond-media` bucket under a `visuals/`
-- prefix; storage policies are unchanged (Keith/admin write, public read).

create table if not exists public.cel_visual_prompts (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('entity', 'story', 'scene', 'freeform')),
  -- For 'entity': wiki slug. For 'story'/'scene': storyId or scene slug.
  -- For 'freeform': null.
  target_id text,
  style_preset text not null,
  -- Stable hash over the synthesis inputs. Two rows with the same seed_hash
  -- mean we can short-circuit synthesis and serve the cached prompt_json.
  -- Composition: sha256(target_kind|target_id|style_preset|corpus_version|synth_model|synth_prompt_version|focus|aspect|intent)
  seed_hash text not null,
  -- Structured prompt: { subject, setting, mood, lighting, camera,
  -- style_anchors[], negative[], aspect, intent, raw }
  prompt_json jsonb not null,
  -- Array of { kind, slug, score } from the wiki retriever — for traceability.
  evidence_refs jsonb not null default '[]'::jsonb,
  synth_model text not null,
  synth_prompt_version text not null,
  corpus_version text not null,
  created_by uuid references public.cel_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_cel_visual_prompts_seed_hash
  on public.cel_visual_prompts (seed_hash);

create index if not exists idx_cel_visual_prompts_target
  on public.cel_visual_prompts (target_kind, target_id);

alter table public.cel_visual_prompts enable row level security;

create policy "Anyone can read visual prompts"
  on public.cel_visual_prompts for select
  using (true);

create policy "Keith admin can insert visual prompts"
  on public.cel_visual_prompts for insert
  with check (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'keith' or p.role = 'admin')
    )
  );

create policy "Keith admin can update visual prompts"
  on public.cel_visual_prompts for update
  using (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'keith' or p.role = 'admin')
    )
  );


create table if not exists public.cel_visual_assets (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.cel_visual_prompts(id) on delete cascade,
  asset_kind text not null check (asset_kind in ('image', 'video')),
  provider text not null,           -- 'imagen' | 'runway' | 'flux' | ...
  provider_model text not null,     -- e.g. 'imagen-4.0-generate-001'
  -- sha256 of normalized provider params (size, steps, seed, aspect, etc.).
  -- (prompt_id, provider, provider_model, params_hash) is the cache key.
  provider_params_hash text not null,
  provider_params jsonb not null default '{}'::jsonb,
  -- Path within the `beyond-media` bucket: visuals/{prompt_id}/{asset_id}.{ext}
  storage_path text not null,
  width integer,
  height integer,
  duration_sec numeric,             -- null for images
  byte_size bigint,
  content_type text,
  -- Flips to true when the user "likes" this asset. Lookups for a stable
  -- served result prefer approved=true, falling back to most-recent.
  approved boolean not null default false,
  created_by uuid references public.cel_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_cel_visual_assets_cache_key
  on public.cel_visual_assets (prompt_id, provider, provider_model, provider_params_hash);

create index if not exists idx_cel_visual_assets_prompt
  on public.cel_visual_assets (prompt_id, approved desc, created_at desc);

alter table public.cel_visual_assets enable row level security;

create policy "Anyone can read visual assets"
  on public.cel_visual_assets for select
  using (true);

create policy "Keith admin can insert visual assets"
  on public.cel_visual_assets for insert
  with check (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'keith' or p.role = 'admin')
    )
  );

create policy "Keith admin can update visual assets"
  on public.cel_visual_assets for update
  using (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'keith' or p.role = 'admin')
    )
  );

create policy "Admin can delete visual assets"
  on public.cel_visual_assets for delete
  using (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
