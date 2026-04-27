-- Vision-extracted "visual fingerprint" for each generated asset.
--
-- After a successful generation, we run a Claude Sonnet vision pass on the
-- rendered image and store a structured description. Subsequent generations
-- for the same entity pull the IDENTITY sub-object from the approved asset's
-- description and inject it into the visual_director's context as canon-
-- equivalent continuity reference. This locks face / build / signature
-- props across re-rolls and across style presets.
--
-- vision_description shape (informal, validated app-side):
--   {
--     identity: { build, face, skin_tone_hex, ... },
--     wardrobe: { garments[], palette_hex[], signature_props[] },
--     environment: { time_of_day, atmospheric_state, key_lights[], key_props_in_frame[] },
--     composition: { framing, subject_screen_pct }
--   }

alter table public.cel_visual_assets
  add column if not exists vision_description jsonb,
  add column if not exists vision_model text,
  add column if not exists vision_extracted_at timestamptz;

create index if not exists idx_cel_visual_assets_approved_by_prompt
  on public.cel_visual_assets (prompt_id, approved)
  where approved = true;
