# Dev Plan: [IDEA-032] Chapter Tag Quality Gate in StoryDetailsDisclosure

## What This Does

All 17 chapter tag records in `content/raw/chapter_tags.json` currently have `reviewed: false` — AI-generated content produced by `scripts/tag-chapter-entities.ts` that hasn't been confirmed by the author. `StoryDetailsDisclosure.tsx` renders `chapterTags.summary` (an AI-generated chapter summary) and uses `chapterTags.themes` without checking the `reviewed` flag, exposing unreviewed AI text to readers.

This plan gates the AI summary (and optionally themes) behind `reviewed: true` and adds a simple CLI script for Paul to approve entries one-by-one.

## User Stories

- As a first-time reader on a chapter page, I see a chapter summary only when the author has reviewed and approved it — never raw AI draft text.
- As a re-reader (show_all_content on), same behaviour — `reviewed` is a content-quality gate, not a spoiler gate.
- As the author, I can run `npm run review:chapter-tags` from the terminal to view each AI summary and mark it `reviewed: true` in `chapter_tags.json`.

## Implementation

### Phase 1: Gate the Summary in StoryDetailsDisclosure

**Checkpoint:** After this phase, unreviewed summaries are hidden from the reader-facing story detail page.

1. Open `src/components/story/StoryDetailsDisclosure.tsx`

2. Locate line 86:
   ```tsx
   {chapterTags && chapterTags.summary && (
   ```
   Change to:
   ```tsx
   {chapterTags && chapterTags.reviewed && chapterTags.summary && (
   ```

3. Note: `chapterTags.themes` (used for the `displayThemes` fallback at line 45–48) does NOT need to be gated — themes are structural tags (character names, locations), not narrative AI prose. The quality risk is in the prose `summary` field only.

4. Run `npx next build && npm run lint && npm test`

5. **Checkpoint:** Visit any chapter detail page (`/stories/CH01`). The Details panel should open without showing any italic summary text (since all 17 are unreviewed). Themes still appear if present. 

### Phase 2: Author Review Script

**Checkpoint:** Paul can approve chapter summaries from the terminal.

1. Create `scripts/review-chapter-tags.ts`:

   ```ts
   #!/usr/bin/env tsx
   /**
    * Interactive CLI to review AI-generated chapter summaries.
    * Usage: npx tsx scripts/review-chapter-tags.ts
    *
    * For each unreviewed chapter:
    *   - Displays the AI summary
    *   - Prompts: (a)pprove / (s)kip / (e)dit / (q)uit
    *   - On approve: sets reviewed=true in chapter_tags.json
    *   - On edit: opens $EDITOR on a temp file, replaces summary
    */
   import * as fs from "fs";
   import * as path from "path";
   import * as readline from "readline";

   const TAGS_PATH = path.join(process.cwd(), "content/raw/chapter_tags.json");
   const raw = JSON.parse(fs.readFileSync(TAGS_PATH, "utf-8"));
   const chapters: Array<{
     chapterId: string;
     reviewed: boolean;
     summary: string;
     themes?: string[];
     characters?: string[];
   }> = raw.chapters ?? raw;

   const unreviewed = chapters.filter((c) => !c.reviewed);
   console.log(`\n${unreviewed.length} unreviewed chapters.\n`);

   const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
   const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));

   let changed = false;
   for (const ch of unreviewed) {
     console.log(`\n─── ${ch.chapterId} ───────────────────────────────`);
     console.log(`Summary:\n  ${ch.summary}\n`);
     if (ch.themes?.length) console.log(`Themes: ${ch.themes.join(", ")}`);
     const ans = (await ask("(a)pprove / (s)kip / (q)uit > ")).trim().toLowerCase();
     if (ans === "q") break;
     if (ans === "a") {
       ch.reviewed = true;
       changed = true;
       console.log("  ✓ Approved");
     }
   }

   if (changed) {
     const out = Array.isArray(raw) ? chapters : { ...raw, chapters };
     fs.writeFileSync(TAGS_PATH, JSON.stringify(out, null, 2) + "\n", "utf-8");
     console.log("\nSaved chapter_tags.json");
   }
   rl.close();
   ```

2. Add to `scripts` in `package.json`:
   ```json
   "review:chapter-tags": "npx tsx scripts/review-chapter-tags.ts"
   ```

3. **Checkpoint:** Run `npm run review:chapter-tags`. The script lists the first unreviewed chapter, shows its summary, and accepts (a)/(s)/(q) input. Approving one chapter and quitting should update `chapter_tags.json` with `reviewed: true` for that entry. Running `npm test` afterwards should still show the same pass/fail counts.

### Phase 3: Post-Approval Verification

After Paul runs the review script and approves some chapters:

1. Run `npm test` — no new failures expected.
2. Visit `/stories/CH01` (or whichever chapter was approved): the Details panel should now show the AI summary in italic beneath the other metadata.
3. Run `npx next build` — clean build expected.

## Content Considerations

- `content/raw/chapter_tags.json` is produced by `scripts/tag-chapter-entities.ts`. It does NOT carry a `<!-- generated:ingest -->` marker (it's a JSON file, not markdown). Edits via the review script are safe — they won't be silently overwritten. Re-running `tag-chapter-entities.ts` regenerates the file; if Paul re-runs it, `reviewed` flags will be reset. (Note this risk in the script output.)
- Currently all 17 chapters are `reviewed: false`. After Phase 1 ships, all summary blocks are hidden until Paul runs the review script.

## Spoiler & Gating Impact

`reviewed` is a **content quality gate**, not a spoiler gate. It only controls whether the author has confirmed the AI summary is accurate and well-written. The existing chapter gating (only showing the detail page to readers who have unlocked the chapter) is unchanged. No changes to `isStoryUnlocked`, `ReaderProgress`, or any Ask paths.

## Testing
- [ ] Build passes
- [ ] Lint passes (0 errors)
- [ ] Tests pass (170+/173 — same count, gate change only)
- [ ] `/stories/CH01`: no italic AI summary visible when `reviewed: false`
- [ ] After approving CH01 via script: italic summary appears on `/stories/CH01` detail
- [ ] Themes still appear regardless of `reviewed` status
- [ ] Re-reader path: same behaviour as locked reader (reviewed gate is quality, not spoiler)

## Dependencies
None. Phase 1 is 1-line change. Phase 2 is a new optional script.

## Estimated Total: 0.75 hours (Phase 1: 10 min; Phase 2: 35 min)
