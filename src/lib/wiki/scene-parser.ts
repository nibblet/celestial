/**
 * Chapter scene parser.
 *
 * Extracts the `### Scene N: Title` headings that live under `## Full Text`
 * in every `content/wiki/stories/CH*.md` file, and returns their full body
 * prose together with a content hash used by the ingest script to detect
 * when a scene's text has actually changed.
 *
 * Contract:
 *   - Only `### Scene <number>: <title>` headings are recognized as scenes.
 *     Every other `### ...` heading (mission logs, asides, notes) closes
 *     the previous scene's body but does not create a new scene.
 *   - The scene body is everything from the line after the scene heading
 *     up to (but not including) the next `### ` heading or the next `## `
 *     top-level heading (which marks the end of `## Full Text`).
 *   - The stored `slug` is the slugified FULL heading (e.g.
 *     `scene-scene-1-waking-dust`) so it matches the anchor id that
 *     `src/components/story/StoryMarkdown.tsx` emits for rendered `<h3>`
 *     tags. This is the key property that lets the reader page's scene
 *     jump navigation swap from markdown-parsed sections to DB rows
 *     without breaking `#scene-...` links.
 *   - The `title` is the clean label with the `Scene N:` prefix stripped,
 *     because that is what any UI layer wants to display.
 */

import { createHash } from "node:crypto";
import { slugifyHeading } from "@/lib/wiki/markdown-headings";

export type ParsedScene = {
  /** 1-based position within the chapter. */
  orderIndex: number;
  /** `scene-<slugified-full-heading>`; matches the rendered anchor id. */
  slug: string;
  /** Display title with any `Scene N:` prefix stripped. */
  title: string;
  /** Full markdown body between this scene heading and the next `### ` /
   *  `## ` boundary. Trimmed. */
  body: string;
  wordCount: number;
  /** First 32 chars of sha256(body). Lets ingest skip unchanged rows. */
  contentHash: string;
};

const SCENE_HEADING = /^###\s+Scene\s+\d+\s*:\s*(.+)$/i;
const ANY_H3 = /^###\s+/;

function hashBody(body: string): string {
  return createHash("sha256").update(body).digest("hex").slice(0, 32);
}

export function parseChapterScenes(fullText: string): ParsedScene[] {
  // Accept both raw chapter markdown (containing the `## Full Text`
  // header) and the already-extracted body that
  // `src/lib/wiki/parser.ts#getAllStories` returns on `story.fullText`
  // (which strips the `## Full Text` header and trims at the next `## `).
  // When the header is present we scope to its body; otherwise we treat
  // the input as the body directly.
  const headerMatch = fullText.match(/## Full Text\s*\n\n([\s\S]*)/);
  const block = headerMatch?.[1] ?? fullText;

  // `## Full Text` may be followed by another `## SomethingElse` section
  // (e.g. `## References` or `## Mission Logs`). Everything past that
  // boundary is not part of the Full Text block. When we've already been
  // handed the pre-extracted body this split is a no-op.
  const beforeNextMajor = block.split(/\n## /)[0] ?? block;
  const lines = beforeNextMajor.split("\n");

  const scenes: ParsedScene[] = [];
  let current:
    | { title: string; slug: string; buffer: string[] }
    | null = null;
  let order = 0;

  const flush = () => {
    if (!current) return;
    const body = current.buffer.join("\n").trim();
    const wordCount =
      body.length === 0 ? 0 : body.split(/\s+/).filter(Boolean).length;
    scenes.push({
      orderIndex: ++order,
      slug: current.slug,
      title: current.title,
      body,
      wordCount,
      contentHash: hashBody(body),
    });
    current = null;
  };

  for (const line of lines) {
    const sceneMatch = line.match(SCENE_HEADING);
    if (sceneMatch) {
      flush();
      const rawHeading = line.replace(/^###\s+/, "").trim();
      const cleanTitle = sceneMatch[1].trim();
      const slug = `scene-${slugifyHeading(rawHeading)}`;
      current = { title: cleanTitle, slug, buffer: [] };
      continue;
    }
    if (ANY_H3.test(line)) {
      // Mission logs, notes, asides -- close the current scene but don't
      // open a new one. Subsequent lines are ignored until the next real
      // scene heading (or the end of the Full Text block).
      flush();
      continue;
    }
    if (current) current.buffer.push(line);
  }
  flush();
  return scenes;
}
