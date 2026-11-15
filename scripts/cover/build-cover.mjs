#!/usr/bin/env node
/**
 * Celestial Heritage cover compositor.
 *
 * Sets the title, author and the three-arc glyph over generated cover art
 * (content/wiki/specs/celestial-heritage-cover), so the lettering is crisp
 * instead of AI-garbled. Renders with the preinstalled Playwright Chromium.
 *
 *   node scripts/cover/build-cover.mjs --art path/or/url.png [--out dir] [--author "NAME"]
 *
 * Outputs:
 *   front-cover.png     1800x2700  (6x9 in at 300 dpi; KDP/IngramSpark front panel)
 *   end-card-9x16.png   1080x1920  (closing card for Reels / Stories)
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// require() so a globally installed Playwright (NODE_PATH) also resolves.
const { chromium } = createRequire(import.meta.url)("playwright");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []),
);
if (!args.art) {
  console.error("usage: build-cover.mjs --art <png|jpg|url> [--out dir] [--author NAME]");
  process.exit(1);
}
const outDir = path.resolve(args.out ?? "cover-out");
fs.mkdirSync(outDir, { recursive: true });
const author = (args.author ?? "PAUL COBB").toUpperCase();

async function artDataUri(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`art download failed: ${res.status}`);
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  }
  const ext = path.extname(src).slice(1).toLowerCase();
  const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext || "png"}`;
  return `data:${type};base64,${fs.readFileSync(src).toString("base64")}`;
}

const font = `data:font/ttf;base64,${fs.readFileSync(path.join(here, "fonts/Cinzel.ttf")).toString("base64")}`;

/**
 * The glyph: three nested crescents over a solid circle, the same geometry as
 * the PROJECT VALKYRIE patch (public/visual-references/project-valkyrie-patch.svg)
 * and the CH01 hull pattern ("three curves and a circle"). Rendered as soft
 * pale-gold light with a bloom. `size` is the rendered width in px.
 */
function glyph(size) {
  // Patch coordinates (720x720 artboard): crescent = circle(r) minus circle(r+2) shifted down by d.
  const crescents = [
    [92, 34],
    [146, 38],
    [202, 42],
  ];
  const masks = crescents
    .map(
      ([r, d], i) => `<mask id="m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="720" height="720">
        <rect width="720" height="720" fill="black"/>
        <circle cx="360" cy="450" r="${r}" fill="white"/>
        <circle cx="360" cy="${450 + d}" r="${r + 2}" fill="black"/></mask>`,
    )
    .join("");
  const vb = { x: 140, y: 230, w: 440, h: 300 };
  const height = Math.round((size * vb.h) / vb.w);
  return `
<svg width="${size}" height="${height}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${masks}
    <linearGradient id="light" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbedc8"/><stop offset="1" stop-color="#e2c48c"/>
    </linearGradient>
    <filter id="bloom" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="b2"/>
      <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#bloom)" opacity="0.85">
    ${crescents.map((_, i) => `<rect x="0" y="0" width="720" height="720" fill="url(#light)" mask="url(#m${i})"/>`).join("")}
    <circle cx="360" cy="456" r="50" fill="url(#light)"/>
  </g>
</svg>`;
}

function page({ w, h, art, layout }) {
  const { glyphSize, glyphTop, titleTop, titleSize, authorSize, authorTop, track } = layout;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Cinzel; src: url(${font}); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${w}px; height: ${h}px; background: #07090f; overflow: hidden; }
.art { position: absolute; inset: 0; background: url(${art}) center bottom / cover no-repeat; }
.shade { position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(5,7,14,0.55) 0%, rgba(5,7,14,0.15) 38%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 100%); }
.glyph { position: absolute; left: 50%; top: ${glyphTop}px; transform: translateX(-50%); }
.title { position: absolute; left: 0; right: 0; top: ${titleTop}px; text-align: center;
  font-family: Cinzel; color: #f1e6cf; font-size: ${titleSize}px; line-height: 1.04;
  letter-spacing: ${track}em; padding-left: ${track}em;
  text-shadow: 0 0 ${titleSize * 0.25}px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.5); }
.author { position: absolute; left: 0; right: 0; top: ${authorTop}px; text-align: center;
  font-family: Cinzel; color: #e3d5b8; font-size: ${authorSize}px; letter-spacing: 0.32em; padding-left: 0.32em;
  text-shadow: 0 2px 6px rgba(0,0,0,0.6); }
</style></head><body>
<div class="art"></div><div class="shade"></div>
<div class="glyph">${glyph(glyphSize)}</div>
<div class="title">CELESTIAL<br>HERITAGE</div>
<div class="author">${author}</div>
</body></html>`;
}

const art = await artDataUri(args.art);
const browser = await chromium.launch();
const jobs = [
  {
    file: "front-cover.png",
    w: 1800,
    h: 2700,
    layout: { glyphSize: 440, glyphTop: 250, titleTop: 640, titleSize: 230, track: 0.06, authorTop: 1180, authorSize: 86 },
  },
  {
    file: "end-card-9x16.png",
    w: 1080,
    h: 1920,
    layout: { glyphSize: 270, glyphTop: 290, titleTop: 520, titleSize: 132, track: 0.06, authorTop: 830, authorSize: 50 },
  },
];
for (const job of jobs) {
  const pg = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: 1 });
  await pg.setContent(page({ ...job, art }), { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(outDir, job.file) });
  await pg.close();
  console.log("wrote", path.join(outDir, job.file));
}
await browser.close();
