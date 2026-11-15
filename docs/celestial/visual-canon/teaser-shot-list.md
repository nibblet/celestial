# Teaser shot list: "It's listening" (about 40 s)

**Status:** all eight shots generated and approved (2026-11-15). See **Cut** below.
**Pipeline:** still (OpenAI GPT Image, references attached) → approve → Runway Gen-4.5 image-to-video, 5–10 s. Plan on 4–6 takes per shot.
**Rule:** one moment and one camera move per shot. No lip-sync; the only spoken audio is narration over the picture.

| # | Moment (first occurrence) | Target ID | View / State | Preset | Intent | Camera move | Key line (narration or on-screen text) |
|---|---|---|---|---|---|---|---|
| 1 | CH01 S1, south trench at dawn | `south-trench` | — | `mars_excavation` | establishing_shot | slow push over the trench edge; Galen and Aven small, seen from behind | "The Martian wind didn't howl-it whispered." |
| 2 | CH01 S1, the hull answers the sun | `valkyrie-1` | state `dormant` | `mars_excavation` | motion_loop | locked-off; the low sun crosses the silver curve and the dust settles into glyph-like lines | "Not reflection-response." |
| 3 | CH01 S3, Thane in the shaft | `thane-meric` | state `mars_canopy` (CH01: helmet off under the filtered canopy) | `intimate_crew` | scene_moment | close on a gloved hand hovering over the hull, then tracing three curves and a circle in the dust | "Like a door someone forgot to open." |
| 4 | CH03 S4, the wall folds open at dusk | `zone-theta` | — | `vault_threshold` | scene_moment | slow dolly in; light branches across the wall, then it folds into a pale corridor | "There was no door." |
| 5 | CH04 S1, "the light followed him in" | `vault-002` | view `domed_chamber` | `vault_threshold` | establishing_shot | over Galen's shoulder as he crosses; a thread of light trails in after him | "And the light followed him in." |
| 6 | CH05 S5, ALARA arrives | `alara` | keyframe pair: state `listening` → `present` (Kling O3 start/end frames) | `noncorporeal_presence` | motion_loop | locked; golden veins drain out of the walls into a spiral that lifts into the air | "I have always been aware. But not always awake." |
| 7 | CH07 S5, Observation Deck over Ganymede | `observation-deck` (view `edge_of_the_dome`, state `over_ganymede`, cast `galen-voss`) | — | `valkyrie_shipboard` | scene_moment | slow push-in toward Galen's silhouette against Jupiter and the ice (a pull-back invented walls outside the frame) | "Proceed." |
| 8 | CH08 S3, the jump | `valkyrie-1` | state `harmonic_jump` | `mythic_scale` | motion_loop | wide exterior; the ship unfolds, lengthens and collapses, and a faint glint rings out | "Valkyrie didn't accelerate. She unfolded." |

Title card: **CELESTIAL**, cut on the glint at the end of shot 8.

## Cut (about 44 s)

Hard cuts throughout unless noted. Times are in and out points within each source clip; nudge them by eye. Narration lands about half a second after each cut, so the picture registers first.

| # | Shot | Source clip | In → out | Length | Running | Narration (starts at) |
|---|---|---|---|---|---|---|
| — | Black, wind fades up | — | — | 1.0 s | 0:00–0:01 | — |
| 1 | Trench at dawn, Galen and Aven from behind | [`c9cbcf09`][c1] (Gen-4.5, 5 s) | 0.5 → 4.5 | 4.0 s | 0:01–0:05 | "The Martian wind didn't howl. It whispered." (0:01.5) |
| 2 | The hull answers the sun: one thread of light | [`c21ee077`][c2] (5 s) | 0.5 → 4.5 | 4.0 s | 0:05–0:09 | "Not reflection. Response." (0:06) |
| 3 | Thane traces the glyph | [`63aa7348`][c3] (8 s) | 1.5 → 6.5 | 5.0 s | 0:09–0:14 | "Like a door someone forgot to open." (0:10) |
| 4 | The wall folds open | [`450af710`][c4] (8 s) | 0.5 → 6.0 | 5.5 s | 0:14–0:19.5 | "There was no door." (0:16, as the seam widens) |
| 5 | Galen enters the domed chamber | [`9055b02e`][c5] (8 s) | 0.0 → 5.0 | 5.0 s | 0:19.5–0:24.5 | "And the light followed him in." (0:21) |
| 6 | ALARA: walls to air | [`9aa22d69`][c6] (Kling O3, 8 s) | 0.5 → 8.0 | 7.5 s | 0:24.5–0:32 | "I have always been aware. But not always awake." (0:27, as the spiral lifts) |
| 7 | Galen at the Observation Deck | [`4de8b4c3`][c7] (8 s) | 0.0 → 5.0 | 5.0 s | 0:32–0:37 | "Proceed." (0:35, alone, after a beat of silence) |
| 8 | The jump | [`fb385424`][c8] (10 s) | 2.0 → 9.0 | 7.0 s | 0:37–0:44 | "Valkyrie didn't accelerate. She unfolded." (0:38) |
| — | Title **CELESTIAL** | — | — | 3.0 s | 0:44–0:47 | — cut to the title on the glint |

[c1]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/c7ee6acb-b9aa-4cda-b45a-ec05fbd445ab/c9cbcf09-4020-451e-b18d-c0a1fbac94b4.mp4
[c2]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/b880f9d8-da3c-4bbd-aa85-127bcf5b61c2/c21ee077-8a90-4ff6-a4d5-bdd081d15c4e.mp4
[c3]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/09713c7a-475f-4eb0-b9c0-50ce2dc7e3fe/63aa7348-2403-472e-b7b5-b819b4995735.mp4
[c4]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/bce57af4-0773-4f56-a9fd-05d79be25e3f/450af710-5366-4b89-9a84-a3d46d510528.mp4
[c5]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/bb24f48f-a657-4f94-ac6f-a0fac89a3ae8/9055b02e-7cf6-400a-ba16-afe40a6d8263.mp4
[c6]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/5878afc0-83f5-4e67-bd37-9f890e4272fe/9aa22d69-7390-4166-b3a8-d6f7e60695ad.mp4
[c7]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/3dab45ea-785b-4ab7-9c6a-bd6264ba5094/4de8b4c3-2ee0-4e7c-8079-4972ab3f93aa.mp4
[c8]: https://jafcwggqgqxrcbuxjreo.supabase.co/storage/v1/object/public/beyond-media/visuals/82ad3631-8cc4-47c1-a7d3-bce4bd550c0a/fb385424-1a57-4706-9489-42ad9529ba61.mp4

**Rhythm:** three short Mars beats (1–3, 4 s to 5 s each), then a slower vault pair (4–5), then the longest hold on ALARA (6) as the midpoint. Shot 7 is the breath before the jump, and 8 is the release.

**Sound map:**
- 0:00–0:19.5: wind plus the low drone. Pull the wind out across the cut into shot 5.
- 0:19.5: sub-bass swell into the vault.
- 0:28: ALARA's three-note cadence as the spiral leaves the walls.
- 0:32–0:35: near silence on the deck; only the drone, so "Proceed." lands bare.
- 0:38: the drone rises into a harmonic chord through the jump.
- 0:44: hard stop on the glint, then the title in silence or with a single low tone.

**Edit notes:**
- Shot 6 can run reversed later in a longer cut ("ALARA withdrawing").
- Shot 7: stop by 5 s. After that the Milky Way holds while the stars drift, and his raised palm starts to read as a wave.
- Shot 8: the jump's ring ripple is the cut point for the title.
- Export 16:9 at 1080p (upscale the 720p clips in the editor). Make a 9:16 social version by center-cropping shots 3, 5 and 7, which are centered on the subject, and reframing the others by hand.

## Audio

- Bed: a low harmonic drone, plus the wind for shots 1–4. Add a sub-bass swell at shot 5 and ALARA's soft three-note cadence (CH16) at shot 6.
- Narration: one voice reading the key lines. Keep the narration on picture, not lip-synced to characters.

## Notes

- Shots 2 and 8 rely on the Valkyrie hull-color decision listed under "Still open" in `README.md`.
- Shot 7: under "specs win", the Observation Deck has no window frame, so the stars and Jupiter fill a seamless dome.
- Alternates from the evidence Top 12: Amar's shuttle landing in red light (CH06 S2); the spiral staircase of light in the Ganymede vault (CH08 S5); Vault 003 forming inside the ship and the pale-blue veil (CH17).
