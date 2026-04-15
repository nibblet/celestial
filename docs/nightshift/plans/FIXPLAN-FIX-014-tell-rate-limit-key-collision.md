# Fix: [FIX-014] Rate Limit Key Collision Between /api/ask and /api/tell

## Problem
`/api/ask` and `/api/tell` both use the same rate limit key: the raw `user.id`. This means a user
who sends 15 messages in Ask Keith consumes 15 of their 20 allowed Tell messages too. A heavy Ask
session (or even a normal 20-message conversation) can completely block the user from contributing
a story via Tell — they see a cryptic "Take a breath" error in the middle of telling their story.

**Impact:** Contributors get rate-limited off `/tell` due to their Ask Keith usage, even if they
haven't sent a single Tell message recently. Confusing and discouraging for family members.

## Root Cause

`src/app/api/ask/route.ts` line 22:
```ts
const rateLimit = checkRateLimit(user.id, 20, 60_000);
```

`src/app/api/tell/route.ts` line 21:
```ts
const rateLimit = checkRateLimit(user.id, 20, 60_000);
```

Both use the plain `user.id` as the bucket key. The rate limiter in `src/lib/rate-limit.ts` uses a
`Map<string, ...>` keyed on this value — so they share the same counter.

Note: `/api/tell/draft` already correctly uses `${user.id}:draft` as its key (FIX-009 fix). The
`/api/tell` gathering endpoint was missed.

## Steps

1. Open `src/app/api/tell/route.ts`

2. On line 21, change:
```ts
const rateLimit = checkRateLimit(user.id, 20, 60_000);
```
To:
```ts
const rateLimit = checkRateLimit(`${user.id}:tell`, 20, 60_000);
```

3. That's it. One line change.

4. Verify: `npm run build` — build should still pass with no type errors.

## Files Modified
- `src/app/api/tell/route.ts` — change rate limit key from `user.id` to `` `${user.id}:tell` ``

## Verify
- [ ] Build passes
- [ ] Sending 20 messages in Ask Keith does NOT block the user from sending messages in Tell
- [ ] Sending 20 messages in Tell still triggers the 429 rate limit in Tell
