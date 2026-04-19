# Fix: [FIX-025] Paragraph Text Used as React Key in Principle Detail Page

## Problem

`src/app/principles/[slug]/page.tsx:46` splits `principle.aiNarrative` on `"\n\n"` and uses the paragraph text as a React `key`:

```tsx
{principle.aiNarrative.split("\n\n").map((paragraph) => (
  <p key={paragraph} ...>
```

React requires keys to be unique among siblings. If two paragraphs ever share identical text — or if the narrative is programmatically generated with a repeated phrase — React emits a duplicate key warning and may produce subtle rendering bugs (skipped updates, mismatched DOM).

## Root Cause

Using content as a key instead of a stable index or ID. Content-based keys are only safe when uniqueness is guaranteed, which is harder to maintain as narratives are edited.

## Steps

### 1. Open `src/app/principles/[slug]/page.tsx`

Find lines 45-52:

```tsx
{principle.aiNarrative.split("\n\n").map((paragraph) => (
  <p
    key={paragraph}
    className="font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted"
  >
    {paragraph}
  </p>
))}
```

Replace `key={paragraph}` with `key={i}` and add the index parameter:

```tsx
{principle.aiNarrative.split("\n\n").map((paragraph, i) => (
  <p
    key={i}
    className="font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted"
  >
    {paragraph}
  </p>
))}
```

### 2. Run `npm run build` — verify no type errors or warnings

### 3. Run `npm run lint` — verify no new warnings

## Files Modified

- `src/app/principles/[slug]/page.tsx` — use index as key for aiNarrative paragraphs

## Verify

- Build passes
- Lint passes
- `/principles/work-hard-and-carry-your-weight` renders correctly (multiple paragraphs visible)
- No duplicate key React warnings in browser console

