# Fix: [FIX-014] ageMode Not Validated in /api/ask

## Problem
`/api/ask` accepts `ageMode` from the request body and passes it directly to
`buildSystemPrompt()`. The `AGE_MODE_INSTRUCTIONS` lookup is typed as
`Record<AgeMode, string>`, but TypeScript types are compile-time only. At runtime, an
authenticated user could send `ageMode: "anything"` and `AGE_MODE_INSTRUCTIONS[ageMode]`
returns `undefined`, which gets interpolated as the literal string `"undefined"` in the
system prompt.

Impact: Low — family-only, invite-only app; all users are trusted family members. However,
even a well-meaning user whose client sends a malformed value would get a degraded AI
response without any error or warning.

## Root Cause
`src/app/api/ask/route.ts`, lines 43–51:

```ts
const {
  message,
  conversationId,
  storySlug,
  journeySlug,
  ageMode = "adult",
} = body as {
  message: string;
  ...
  ageMode?: AgeMode;
};
```

No runtime check that `ageMode` is one of `"young_reader" | "teen" | "adult"`.

## Steps

1. Open `src/app/api/ask/route.ts`

2. After destructuring `body` (around line 51), add a validation guard:

```ts
const VALID_AGE_MODES = ["young_reader", "teen", "adult"] as const;
const validatedAgeMode: AgeMode = VALID_AGE_MODES.includes(ageMode as AgeMode)
  ? (ageMode as AgeMode)
  : "adult";
```

3. Use `validatedAgeMode` everywhere `ageMode` is referenced below that point:
   - `buildSystemPrompt(validatedAgeMode, storySlug, journeySlug)` (line ~113)
   - The `age_mode` field in `sb_conversations.insert()` (line ~66)

4. Run `npm run build` to verify no breakage.

5. Run `npm run lint`.

## Files Modified
- `src/app/api/ask/route.ts` — add ageMode validation, use `validatedAgeMode`

## Verify
- [ ] Build passes
- [ ] Lint passes
- [ ] A request with `ageMode: "hacker"` defaults to `"adult"` without error
- [ ] A request with `ageMode: "teen"` still produces the correct teen prompt
