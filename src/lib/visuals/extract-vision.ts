import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { logAiCall } from "@/lib/ai/ledger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Claude Sonnet vision pass that extracts a structured "visual fingerprint"
 * from a generated asset. Stored on cel_visual_assets.vision_description and
 * later injected as canon-equivalent continuity reference when re-rendering
 * the same entity.
 *
 * Identity fields cross style presets (face / build / signature props stay
 * locked even when the painterly_lore preset borrows from a cinematic_canon
 * portrait). Wardrobe / environment / composition are preset-specific and
 * the synthesizer is instructed to treat them as inspiration only.
 */
const VISION_MODEL = "claude-sonnet-4-20250514";

const VISION_SYSTEM_PROMPT = `You are a continuity supervisor. You are looking at a single rendered
frame and your job is to extract a precise, structured description so a
future generation can recreate the IDENTITY of any subject and (separately)
the LOOK of the shot.

Output STRICT JSON with this shape and no prose around it:
{
  "identity": {
    "build": "<one phrase: height/proportions/posture, e.g. 'lean, ~6ft, military posture'>",
    "face": "<one sentence: age, hair color/cut, beard, distinguishing features. If no face/humanoid, write 'non-humanoid' here.>",
    "skin_tone_hex": "<single hex color, or empty string if non-applicable>",
    "signature_features": ["<3-6 specific identity tags that should persist across re-rolls: scar pattern, eye color, hairline, prosthetic, etc.>"]
  },
  "wardrobe": {
    "garments": ["<each visible garment with material/color/wear, e.g. 'faded khaki pressure suit, scuffed at knees'>"],
    "palette_hex": ["<3-5 dominant wardrobe hex colors>"],
    "signature_props": ["<carried/worn props that read as identity: chest harness, helmet style, weapon, tool>"]
  },
  "environment": {
    "time_of_day": "<one phrase>",
    "atmospheric_state": "<one phrase: haze level, weather, particulate>",
    "key_lights": ["<each named light: 'sunset key, camera-left, ~10° elevation, 2400K'>"],
    "key_props_in_frame": ["<distinct elements visible in scene: vehicles, structures, terrain>"]
  },
  "composition": {
    "framing": "<e.g. 'from-behind 3/4', 'medium close-up', 'over-the-shoulder'>",
    "subject_screen_pct": <integer 0-100, vertical screen percentage occupied by primary subject; 0 if no subject>
  }
}

Rules:
- Be specific. A weak description says "brown coat"; a strong one says "weathered tan canvas duster, frayed hem, leather collar".
- If a field is not visible / not applicable, return an empty string or empty array — NEVER invent.
- Hex colors: estimate from the image, lowercase #rrggbb.
- Do not editorialize on mood; describe what is rendered.

JSON SAFETY (critical — output is parsed strictly):
- Output ONLY the JSON object. No markdown fences, no commentary before or after.
- Use ONLY ASCII characters inside strings.
- NEVER use the double-quote character inside any string value. For heights, write "5 feet 10 inches" or "~178cm" — NEVER 5'10". For inch marks, spell them out.
- Use plain ASCII apostrophes and dashes, never curly quotes or em-dashes.
- No comments. No trailing commas.`;

export type VisualVisionDescription = {
  identity: {
    build: string;
    face: string;
    skin_tone_hex: string;
    signature_features: string[];
  };
  wardrobe: {
    garments: string[];
    palette_hex: string[];
    signature_props: string[];
  };
  environment: {
    time_of_day: string;
    atmospheric_state: string;
    key_lights: string[];
    key_props_in_frame: string[];
  };
  composition: {
    framing: string;
    subject_screen_pct: number;
  };
};

export async function extractAndPersistVision(params: {
  assetId: string;
  imageBytes: Buffer;
  contentType: string;
  userId?: string | null;
}): Promise<VisualVisionDescription | null> {
  try {
    const description = await runVisionExtraction(params.imageBytes, params.contentType);
    const admin = createAdminClient();
    await admin
      .from("cel_visual_assets")
      .update({
        vision_description: description,
        vision_model: VISION_MODEL,
        vision_extracted_at: new Date().toISOString(),
      })
      .eq("id", params.assetId);

    await logAiCall(admin, {
      userId: params.userId ?? null,
      persona: "vision_continuity",
      contextType: "visuals_vision",
      contextId: params.assetId,
      model: VISION_MODEL,
      status: "ok",
    });
    return description;
  } catch (err) {
    console.error("[extract-vision] failed", err);
    // Fail-open: generation already succeeded, vision is enrichment.
    return null;
  }
}

async function runVisionExtraction(
  imageBytes: Buffer,
  contentType: string,
): Promise<VisualVisionDescription> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
  const mediaType = normalizeMediaType(contentType);
  const base64 = imageBytes.toString("base64");

  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 1500,
    temperature: 0.2,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "Extract the visual fingerprint as strict JSON.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseVisionJson(raw);
}

/**
 * Defensive JSON parse for LLM output. Handles the common failure modes:
 *   - markdown code fences around the JSON
 *   - trailing commas before } or ]
 *   - JS-style // line comments
 *   - smart quotes / em-dashes
 *   - unescaped " inside string values (e.g. height '5'10"' missing the
 *     escape on the inner inch-mark quote)
 *
 * If even the repaired text fails to parse, logs the raw payload and
 * throws a descriptive error.
 */
function parseVisionJson(text: string): VisualVisionDescription {
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Vision extractor did not return JSON");
  const candidate = match[0];

  try {
    return JSON.parse(candidate) as VisualVisionDescription;
  } catch {
    const repaired = candidate
      // smart quotes → ascii
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      // em/en dashes → hyphen
      .replace(/[\u2013\u2014]/g, "-")
      // strip // line comments
      .replace(/\/\/[^\n]*/g, "")
      // strip trailing commas before } or ]
      .replace(/,(\s*[}\]])/g, "$1")
      // best-effort: escape inner double-quotes inside string values
      // by walking the string and tracking whether we're inside a string.
      .split("\n")
      .map(escapeInnerQuotesPerLine)
      .join("\n");

    try {
      return JSON.parse(repaired) as VisualVisionDescription;
    } catch (err) {
      console.error("[extract-vision] raw model output that failed to parse:\n", candidate);
      throw new Error(
        `Vision JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/**
 * Per-line repair: in a JSON line of the form `  "key": "value",` ensure any
 * stray `"` characters inside the value are escaped. Only operates when the
 * line clearly has key+value structure; lines containing JSON syntax (object
 * literals, arrays) are returned unchanged.
 */
function escapeInnerQuotesPerLine(line: string): string {
  const m = line.match(/^(\s*"[^"]+"\s*:\s*)"(.*?)"(\s*,?\s*)$/);
  if (!m) return line;
  const [, prefix, value, suffix] = m;
  // Already-escaped quotes are fine; only repair raw " characters.
  const repaired = value.replace(/(?<!\\)"/g, '\\"');
  return `${prefix}"${repaired}"${suffix}`;
}

function normalizeMediaType(
  contentType: string,
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const lower = contentType.toLowerCase();
  if (lower.includes("png")) return "image/png";
  if (lower.includes("webp")) return "image/webp";
  if (lower.includes("gif")) return "image/gif";
  return "image/jpeg";
}
