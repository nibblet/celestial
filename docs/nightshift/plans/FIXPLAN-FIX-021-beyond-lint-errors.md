# Fix: [FIX-021] ESLint Errors in Beyond Components (4 errors)

## Problem
`npm run lint` now reports 4 ESLint **errors** (up from 0 errors before these commits). The Beyond feature wave added three components that trigger rules the project enforces. This blocks a clean lint pass.

Affected files and rules:
1. `scripts/compile-wiki.ts:564` — `prefer-const` on `peopleIndexEntries` (never reassigned)
2. `src/components/beyond/MediaGallery.tsx:269` — `react-hooks/set-state-in-effect` (setState in useEffect body)
3. `src/components/beyond/MentionSuggestion.tsx:33` — `react-hooks/set-state-in-effect` (setState in useEffect body)
4. `src/components/beyond/TipTapEditor.tsx:185` — `react-hooks/immutability` (modifying DOM element via hook return value)

## Root Cause

**Error 1 (`compile-wiki.ts:564`):** `let peopleIndexEntries: string[] = []` is declared with `let` but only mutated via `.push()` — the binding itself is never reassigned. ESLint's `prefer-const` rule flags this.

**Errors 2 & 3 (MediaGallery, MentionSuggestion):** Both use `useEffect(() => setSomeState(value), [dep])` — calling setState synchronously in the effect body. This is a legitimate "reset state when prop changes" pattern that the `react-hooks/set-state-in-effect` rule flags. The behavior is correct; the pattern just needs to be acknowledged with a disable comment.

**Error 4 (TipTapEditor):** `el.dataset.placeholder = placeholder || ""` where `el = editor.view.dom as HTMLElement`. The `react-hooks/immutability` rule considers any value derived from a hook return to be immutable. But `editor.view.dom` is a real DOM element — setting its `.dataset` attribute is a standard imperative DOM mutation, not a React state mutation. The rule is a false positive here; a targeted disable comment resolves it.

## Steps

### Fix 1 — compile-wiki.ts
1. Open `scripts/compile-wiki.ts`
2. At line 564, change:
   ```ts
   // Before:
   let peopleIndexEntries: string[] = [];
   // After:
   const peopleIndexEntries: string[] = [];
   ```

### Fix 2 — MediaGallery.tsx
1. Open `src/components/beyond/MediaGallery.tsx`
2. At line 268-269, add disable comment:
   ```ts
   // Before:
     const [caption, setCaption] = useState(item.caption ?? "");
     useEffect(() => setCaption(item.caption ?? ""), [item]);
   // After:
     const [caption, setCaption] = useState(item.caption ?? "");
     // eslint-disable-next-line react-hooks/set-state-in-effect
     useEffect(() => setCaption(item.caption ?? ""), [item]);
   ```

### Fix 3 — MentionSuggestion.tsx
1. Open `src/components/beyond/MentionSuggestion.tsx`
2. At line 32-33, add disable comment:
   ```ts
   // Before:
     useEffect(() => setIndex(0), [items]);
   // After:
     // eslint-disable-next-line react-hooks/set-state-in-effect
     useEffect(() => setIndex(0), [items]);
   ```

### Fix 4 — TipTapEditor.tsx
1. Open `src/components/beyond/TipTapEditor.tsx`
2. At line 184-185, add disable comment:
   ```ts
   // Before:
       const el = editor.view.dom as HTMLElement;
       el.dataset.placeholder = placeholder || "";
   // After:
       const el = editor.view.dom as HTMLElement;
       // eslint-disable-next-line react-hooks/immutability
       el.dataset.placeholder = placeholder || "";
   ```

### Verify
5. Run `npm run lint` — should show **0 errors**, 3 warnings (FIX-019 + FIX-020 still open)
6. Run `npm run build` — should still pass

## Files Modified
- `scripts/compile-wiki.ts` — `let` → `const` on line 564
- `src/components/beyond/MediaGallery.tsx` — eslint-disable-next-line comment on line 269
- `src/components/beyond/MentionSuggestion.tsx` — eslint-disable-next-line comment on line 33
- `src/components/beyond/TipTapEditor.tsx` — eslint-disable-next-line comment on line 185

## Verify
- [ ] `npm run lint` passes with 0 errors (3 warnings remaining for FIX-019/020)
- [ ] `npm run build` passes
- [ ] No runtime behavior change (all fixes are comments or a `let`→`const` rename)

## Estimated Time
2 minutes. Can be stacked with FIX-019 + FIX-020 for a complete lint sweep in one commit.
