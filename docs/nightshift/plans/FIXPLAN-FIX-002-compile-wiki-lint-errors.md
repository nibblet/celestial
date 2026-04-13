# Fix: [FIX-002] Lint Errors in scripts/compile-wiki.ts

## Problem
`npm run lint` reports 2 errors and 3 warnings in `scripts/compile-wiki.ts`:

```
78:10  warning  'getLifeStage' is defined but never used
98:33  error    Unexpected any. Specify a different type
196:16 error    Unexpected any. Specify a different type
228:7  warning  'LIFE_STAGE_ORDER' is assigned a value but never used
268:9  warning  'quotesData' is assigned a value but never used
```

**Impact:** `npm run lint` returns non-zero exit code. CI (if added) will fail. The errors could also mask real type bugs in the script.

## Root Cause
`scripts/compile-wiki.ts:98` — `const stories: Record<string, any> = {}` uses `any` because the story object is built dynamically.
`scripts/compile-wiki.ts:196` — similar `any` usage in a second dynamic object context.
`getLifeStage`, `LIFE_STAGE_ORDER`, `quotesData` are declared but never used in the final compiled code.

## Steps

### Fix the two `any` errors

**Line 98** (`parseStoryIndex` function, `stories` local variable):

Open `scripts/compile-wiki.ts`. Find:
```typescript
const stories: Record<string, any> = {};
```
Replace with:
```typescript
interface ParsedStory {
  title: string;
  life_stage: string;
  themes: string[];
  summary: string;
  best_used_when: string[];
  principles: string[];
  heuristics: string[];
}
const stories: Record<string, ParsedStory> = {};
```

Add the `ParsedStory` interface definition near the top of the file, alongside the other interface definitions (`StoryJson`, `ManifestRow`, `TimelineEvent`).

**Line 196**: Locate the second `any` usage — it will be a similar dynamic object accumulator. Apply the same pattern: define a local interface or use an appropriate existing type.

### Remove unused declarations

1. Delete the `getLifeStage` function (line 78) — it is defined but never called.
2. Delete or comment out `LIFE_STAGE_ORDER` assignment (line 228) if it's an unused constant.
3. Delete or comment out `quotesData` assignment (line 268) if it's an unused variable.

> **Caution:** Before deleting, search for any calls to `getLifeStage` or references to `LIFE_STAGE_ORDER`/`quotesData` throughout the file to confirm they're truly unused.

### Final check
4. Run `npm run lint` — confirm 0 errors, 0 warnings from this file
5. Run `npx tsx scripts/compile-wiki.ts` (in a safe test context) — confirm the script still runs without runtime errors

## Files Modified
- `scripts/compile-wiki.ts` — type annotations tightened, unused declarations removed

## New Files
None

## Database Changes
None

## Verify
- [ ] `npm run lint` exits 0 with no errors from compile-wiki.ts
- [ ] `npm run build` still passes
- [ ] Running `npx tsx scripts/compile-wiki.ts` completes without runtime errors
