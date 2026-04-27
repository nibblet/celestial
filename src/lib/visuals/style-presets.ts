/**
 * Default style presets for the visual prompt synthesizer.
 *
 * TODO(post-mvp): replace these defaults with corpus-derived presets. After
 * the MVP lands, read content/wiki/ and the canon dossiers to extract the
 * project's actual visual identity (palette anchors, era, lens preferences,
 * texture cues) and rewrite each preset to reflect that. The shape stays
 * the same; only the anchor strings change. Bump SYNTH_PROMPT_VERSION when
 * doing so to bust the prompt cache.
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
  cinematic_canon: {
    key: "cinematic_canon",
    label: "Cinematic Canon",
    brief:
      "Modern prestige-cinema look: anamorphic lens flares, strong chiaroscuro, warm practical lights against cool ambient, lived-in surfaces with grime and wear, lens compression on long takes. Think Villeneuve / Deakins, not stock 3D render.",
    anchors: [
      "anamorphic lens flares on practical lights",
      "strong chiaroscuro with hard shadows",
      "warm tungsten practicals against cool ambient",
      "long-lens compression, shallow depth of field",
      "lived-in surfaces with wear, grime, and patina",
      "35mm film grain, slight halation around highlights",
    ],
    negative: [
      "stock 3D render look",
      "flat even lighting",
      "clean unweathered surfaces",
      "cgi sheen",
      "plastic skin",
      "hdr halos",
      "oversaturated colors",
      "wide-angle distortion",
    ],
  },
  painterly_lore: {
    key: "painterly_lore",
    label: "Painterly Lore",
    brief:
      "Illustrated lore-book aesthetic: visible brushwork, layered glazes, warm earthen palette, soft rim light.",
    anchors: [
      "oil-on-linen brushwork",
      "warm earthen palette",
      "soft rim light",
      "hand-painted texture",
      "lore-book illustration",
    ],
    negative: ["photorealism", "digital airbrush", "anime", "flat vector"],
  },
  noir_intimate: {
    key: "noir_intimate",
    label: "Noir Intimate",
    brief:
      "Close, low-key, high-contrast: single hard key, deep shadows, smoke and texture, intimate framing on faces and hands.",
    anchors: [
      "low-key high-contrast lighting",
      "single hard key light",
      "deep shadow detail",
      "close intimate framing",
      "monochrome-leaning palette",
    ],
    negative: ["bright daylight", "wide group shots", "pastel palette"],
  },
  mythic_wide: {
    key: "mythic_wide",
    label: "Mythic Wide",
    brief:
      "Establishing-scale grandeur: wide vistas, atmospheric haze, small figures against immense setting, golden-hour or storm light.",
    anchors: [
      "extreme wide composition",
      "atmospheric perspective and haze",
      "small figures, immense setting",
      "golden-hour or stormlight",
      "epic scale framing",
    ],
    negative: ["close-up portrait", "studio backdrop", "flat lighting"],
  },
};

export function getStylePreset(key: StylePresetKey): StylePreset {
  return STYLE_PRESETS[key];
}

export const DEFAULT_STYLE_PRESET: StylePresetKey = "cinematic_canon";
