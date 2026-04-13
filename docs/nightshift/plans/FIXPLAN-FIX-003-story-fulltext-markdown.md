# Fix: [FIX-003] Story Full Text Loses Markdown Formatting

## Problem
Story full text is rendered by splitting on `\n` and wrapping each non-empty line in a `<p>` tag:

```tsx
{story.fullText.split("\n").map((paragraph, i) =>
  paragraph.trim() ? <p key={i}>{paragraph.trim()}</p> : null
)}
```

This strips any inline markdown formatting (bold, italic, blockquotes, lists) that may exist in story text files. It also treats each line as a separate paragraph regardless of whether there's a blank line between them, which can cause visual fragmentation.

**Impact:** Stories that contain markdown formatting in their `## Full Text` section render as plain text. Future stories with richer formatting will be silently degraded.

## Root Cause
`src/app/stories/[storyId]/page.tsx` lines 56–60 manually split the `fullText` string rather than using `react-markdown` (which is already installed and used in `src/app/ask/page.tsx`).

## Steps

1. Open `src/app/stories/[storyId]/page.tsx`

2. Add `ReactMarkdown` import at the top of the file:
   ```tsx
   import ReactMarkdown from "react-markdown";
   ```

3. Replace the manual split block:
   ```tsx
   {story.fullText.split("\n").map((paragraph, i) =>
     paragraph.trim() ? (
       <p key={i}>{paragraph.trim()}</p>
     ) : null
   )}
   ```
   With a single `ReactMarkdown` render inside the existing `<article>` element:
   ```tsx
   <ReactMarkdown>{story.fullText}</ReactMarkdown>
   ```

4. The `<article>` already has `prose prose-stone prose-sm md:prose-base max-w-none mb-8 leading-relaxed` applied — this is correct and `@tailwindcss/typography` will style all markdown elements (bold, italic, blockquotes, lists) automatically.

5. Run `npm run build` — confirm no TypeScript errors

6. Run `npm run lint` — confirm no new lint issues

## Files Modified
- `src/app/stories/[storyId]/page.tsx` — replace manual paragraph split with ReactMarkdown

## New Files
None

## Database Changes
None

## Verify
- [ ] Build passes
- [ ] Story detail page renders story text visually (headings, bold, lists if present in fullText)
- [ ] Plain paragraph text still renders correctly (no regression for simple stories)
- [ ] No raw markdown syntax visible (e.g., `**word**` should render as **bold**)
