# Cover compositor

Sets the **Celestial Heritage** title, author and three-arc glyph over generated cover art.

1. Generate the art in the Visuals studio: entity `celestial-heritage-cover`, aspect `2:3`, intent `establishing_shot`. Leave the upper sky empty; the spec asks for no text or glyphs.
2. Run the compositor on the approved still (local path or public URL):

   ```bash
   node scripts/cover/build-cover.mjs --art <png|url> --out cover-out
   ```

Outputs `front-cover.png` (1800×2700, a 6×9 in front panel at 300 dpi) and `end-card-9x16.png` (1080×1920, the closing card for Reels and Stories).

The glyph uses the PROJECT VALKYRIE patch geometry. The title font is Cinzel (SIL OFL 1.1, see `fonts/OFL-Cinzel.txt`).

**For print:** the generated art is 1024×1536, so the front panel is upscaled about 1.75×. Upscale the art with a dedicated upscaler before printing. The full wrap (spine and back) comes once KDP gives the page count.
