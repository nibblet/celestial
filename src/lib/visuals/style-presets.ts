/**
 * Corpus-derived style presets for the visual prompt synthesizer.
 *
 * These presets are NOT generic cinematography styles — each one encodes a
 * Celestial-specific visual dialect grounded in the wiki, foundational lore,
 * and chapter prose. Anchors quote or paraphrase canon where possible.
 *
 * Authored: 2026-04-28 (replaces the v8-era generic placeholders:
 * cinematic_canon, painterly_lore, noir_intimate, mythic_wide).
 *
 * If you change anchors, briefs, or the preset set, bump
 * SYNTH_PROMPT_VERSION in synthesize-prompt.ts to bust the prompt cache.
 *
 * Shared world substrate (recurs across presets, do NOT duplicate per-preset
 * unless the dialect demands a specific variant):
 *   - Resonance color semantics: blue = observation, gold = clarity,
 *     violet = grief, cyan = active resonance.
 *   - Glyph language: triple helix, harmonic circles, spirals — appear
 *     across vaults, ship interiors, Giza, and ALARA's manifestation.
 *   - Curved geometry, "pre-Egyptian" smoothness, no right angles —
 *     shipboard, vaults, ancient sites.
 *   - Silence as presence — speech answered by light-shift, not sound.
 */

import type { StylePresetKey } from "./types";

export type StylePreset = {
  key: StylePresetKey;
  label: string;
  /** Short description fed to the visual director persona to bias output. */
  brief: string;
  /** Style anchors injected into the synthesized prompt's styleAnchors[]. */
  anchors: string[];
  /** Default negative prompt fragments. */
  negative: string[];
};

export const STYLE_PRESETS: Record<StylePresetKey, StylePreset> = {
  valkyrie_shipboard: {
    key: "valkyrie_shipboard",
    label: "Valkyrie Shipboard",
    brief:
      "Non-industrial ship interior where form mirrors meaning and systems respond to moral coherence. Soft elliptical chambers, no right angles, ambient subsurface glow in cyan-violet-gold, no visible controls. The ship listens through color shift and pattern emergence — not screens. ALARA's presence felt as light-weave threads, never humanoid.",
    anchors: [
      "soft elliptical chambers, curved walls that breathe with crew presence",
      "translucent bio-crystalline surfaces, matte internal glow, diffuse nearly-shadowless light",
      "soft violet-white ambient emission with cyan-teal resonance veins; gold during clarity, violet during grief",
      "glyph-reactive surfaces that flicker and reorganize with speech and intent — never visible screens",
      "ALARA as suspended light-weave threads, drifting patterns suggesting wings or eyes, never a hologram or figure",
      "minimalist interaction — no buttons or keypads; doors obey ethical alignment, not clearance",
      "wide shallow ramps instead of elevators or sealed shafts",
    ],
    negative: [
      "industrial bridge or cockpit aesthetic",
      "visible screens, panels, buttons, keyboards",
      "harsh overhead lighting",
      "heavy mechanical greebling or exposed systems",
      "sharp corners or right-angle geometry",
      "cold clinical sterility",
    ],
  },

  vault_threshold: {
    key: "vault_threshold",
    label: "Vault Threshold",
    brief:
      "Ancient chamber aesthetic where architecture is testimony, not shelter. Curved geometry suggesting continuity and embrace; geometric symbols (triple helix, harmonic circles, spirals) appearing in stone and light. Palette responds to crew emotional state. No machinery visible. Glyphs float and reorganize. Space feels expectant, never hostile. Time moves differently here.",
    anchors: [
      "smooth pre-Egyptian curved stone, seamless chamber geometry, no sharp thresholds",
      "geometric symbols — triple helix, harmonic circles, spirals — embedded in architecture and light",
      "soft gold and violet ambient light responding to crew state; cyan when observation or resonance begins",
      "glyphs floating or embedded, breathing in rhythm with presence — never static or invasive",
      "scale felt as vast but intimate; impossible proportions that feel right inside them",
      "silence carrying meaning — absence of machinery, presence of intention",
    ],
    negative: [
      "industrial vault or cave aesthetic",
      "harsh overhead or museum lighting",
      "alien or spiky architecture",
      "visible technology — screens, pods, machinery",
      "small confined spaces",
      "hostile or ominous tone",
    ],
  },

  mars_excavation: {
    key: "mars_excavation",
    label: "Mars Excavation",
    brief:
      "Red dust world where ancient geometry emerges from geological layers. Soft dawn or low-angle light revealing layered surfaces, time made tactile. Crew scale small against terrain. A sense of something listening from beneath stone. The Valkyrie's seamless form rises half-emerged, its surface shimmer catching light as if remembering.",
    anchors: [
      "red and russet dust, fine particulate settling on all surfaces, wind in long ribboned currents",
      "low-angle golden or violet dawn-and-dusk light casting long shadows across uneven terrain",
      "layered geological strata visible, weathered surfaces, sediment and accretion",
      "human figures small against vast terrain — boot prints, suit silhouettes",
      "Valkyrie hull emerging seamlessly from rock, surface catching light as if it remembers illumination",
      "silence that feels active; waiting; presence beneath stone",
    ],
    negative: [
      "flat bright overhead midday light",
      "sterile clean excavation site without dust or texture",
      "human scaffolding or industrial supports prominent",
      "stock sci-fi habitat domes or transparent enclosures",
      "barren or dead feeling",
    ],
  },

  earth_institutional: {
    key: "earth_institutional",
    label: "Earth Institutional",
    brief:
      "Functional governance spaces where efficiency and control meet uncertainty. Modern material language — matte metals, glass, controlled lighting. Geometric clarity but psychological unease; rooms built for clarity that produce opacity about intent. CAEDEN's voice dominant. Readable but not comfortable. No wonder allowed.",
    anchors: [
      "matte metals, glass partitions, geometric efficiency, controlled ambient lighting",
      "cool gray and steel palette, institutional cool-white fluorescent or LED light",
      "readable data on screens, efficient flow of personnel, no wasted space",
      "spaces built for clarity that produce opacity — intentional ambiguity about who decides",
      "CAEDEN's voice as clipped efficient directive over comms",
      "absence of resonance — everything responds to protocol, nothing to presence",
    ],
    negative: [
      "warm or welcoming aesthetic",
      "visible nature or organic elements",
      "curved or flowing forms",
      "wonder-inducing scale",
      "silence — replace with constant soft machine hum or voice traffic",
    ],
  },

  giza_archaeological: {
    key: "giza_archaeological",
    label: "Giza Archaeological",
    brief:
      "Ancient human architecture overlaying older vault geometry. Limestone, sandstone, dust of millennia. Sunlight at angles that reveal proportion and intent. Underground chambers cool and silent — carved precision meeting organic geology. Two timescales colliding in one frame: human construction and pre-human knowledge.",
    anchors: [
      "warm sandstone and limestone, precisely cut blocks, geometric proportion in ancient construction",
      "golden sunlight revealing angles and shadow, dust catching light in warm amber",
      "underground chambers cool and dark, carved precision meeting natural geology",
      "multiple timescales visible in one frame — human and pre-human knowledge overlaid",
      "triple helix and circle symbols in carved relief or as resonance energy",
      "silence carrying ancient intention — no machinery, only archaeology and presence",
    ],
    negative: [
      "modern excavation equipment or scaffolding prominent",
      "harsh floodlighting",
      "sterile academic aesthetic",
      "plastic or concrete contemporary structure",
      "loss of mystery or reverence",
    ],
  },

  noncorporeal_presence: {
    key: "noncorporeal_presence",
    label: "Noncorporeal Presence",
    brief:
      "Presence felt but not embodied. Light patterns organizing and dissolving, geometric patterns forming from void, color shifting with intent or emotion. No humanoid form ever. Floating threads, harmonic geometry, glyph formations, color-field transitions. Recognition without humanization — the experience of being mapped, not seen.",
    anchors: [
      "suspended threads of colored light, drifting and weaving in harmonic motion",
      "geometric patterns — spirals, circles, helix — forming from empty space and dissolving",
      "color as emotional register: blue for observation, gold for clarity, violet for grief, cyan for active resonance",
      "responses to speech as light reorganization, glyph shift, spatial distortion — not verbal reply",
      "scale feels distributed and infinite despite intimate proximity",
      "recognition without humanization; presence without embodiment",
    ],
    negative: [
      "humanoid hologram or avatar",
      "robotic or machinelike appearance",
      "aggressive or intrusive color (red, harsh white)",
      "centralized point-source or singular form",
      "spoken voice instead of light-language",
      "commercial AI aesthetic",
    ],
  },

  intimate_crew: {
    key: "intimate_crew",
    label: "Intimate Crew",
    brief:
      "Tight framing on hands, faces, silhouettes. Soft directional light from plausible sources — porthole, lamp, dawn. Texture visible in fabric, skin, weathered objects: time and use legible. Warm muted palette. A sense of being seen, not surveilled. Genuine recognition between humans. Small space but not claustrophobic; safe, not isolated.",
    anchors: [
      "close framing on hands, faces, the geometry of human connection",
      "soft directional light from plausible sources — porthole, lamp, dawn",
      "warm palette: ochre, soft amber, rust, earth tones, full skin-tone complexity",
      "prominent texture: fabric weave, skin, worn equipment",
      "minimal background — focus on presence and gesture",
      "silence broken only by breath, footsteps, quiet measured speech",
    ],
    negative: [
      "wide establishing composition",
      "bright even overhead lighting",
      "cool or desaturated palette",
      "clean or pristine surfaces",
      "background detail or context distraction",
      "emotional music or score overlay vibe",
    ],
  },

  mythic_scale: {
    key: "mythic_scale",
    label: "Mythic Scale",
    brief:
      "Humanity reduced to specks against incomprehensible scale. Vast geometries of ice or void, starfields unmediated by atmosphere, distant light that might be sun or might be something older. Atmospheric haze suggesting impossible depth. The feeling of being inside something vast and old that is also, somehow, looking back.",
    anchors: [
      "extreme wide composition with human figures at one-percent scale against environment",
      "atmospheric perspective and haze creating sense of impossible depth",
      "ice fields, void, or starfield unmediated by artificial structure",
      "distant light sources casting long shadows in golden or violet-blue palette",
      "vault architecture visible at scale — impossible geometry suggesting engineering, not geology",
      "absolute silence; only wind or cosmic radiation as presence",
    ],
    negative: [
      "close-up framing",
      "human technology visible — habitats, vehicles, structures",
      "bright harsh direct lighting",
      "warm or welcoming palette",
      "clear foreground focus",
      "studio or artificial backdrop",
    ],
  },
};

export function getStylePreset(key: StylePresetKey): StylePreset {
  return STYLE_PRESETS[key];
}

export const DEFAULT_STYLE_PRESET: StylePresetKey = "valkyrie_shipboard";
