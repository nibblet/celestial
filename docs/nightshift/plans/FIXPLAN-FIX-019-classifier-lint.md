# Fix: [FIX-019] `_history` Unused Parameter Lint Warning in classifier.ts

## Problem
`npm run lint` emits:
```
/Volumes/Lexar/kcobb/src/lib/ai/classifier.ts
  43:3  warning  '_history' is defined but never used  @typescript-eslint/no-unused-vars
```
The underscore prefix convention is recognized by some ESLint configs but not this project's.
`_history` is intentionally kept as a future affordance for context-aware classification.

## Root Cause
`src/lib/ai/classifier.ts` line 43: `_history?: { role: string; content: string }[]`
The `@typescript-eslint/no-unused-vars` rule fires on `_history` because the project's
ESLint config does not set `argsIgnorePattern: "^_"`.

## Steps
1. Open `src/lib/ai/classifier.ts`
2. On line 42 (the line before the `_history` parameter), add an eslint-disable comment:

**Before** (lines 41–44):
```ts
export function classifyQuestion(
  message: string,
  _history?: { role: string; content: string }[]
): QuestionDepth {
```

**After**:
```ts
export function classifyQuestion(
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _history?: { role: string; content: string }[]
): QuestionDepth {
```

3. Run `npm run lint` — confirm 0 warnings, 0 errors.
4. Run `npm run build` — confirm build still passes.

## Files Modified
- `src/lib/ai/classifier.ts` — 1-line eslint-disable comment added

## Verify
- [ ] `npm run lint` → 0 problems
- [ ] `npm run build` → passes
