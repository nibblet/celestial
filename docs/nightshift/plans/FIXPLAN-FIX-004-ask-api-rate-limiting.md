# Fix: [FIX-004] No Rate Limiting on /api/ask — Claude API Cost Risk

## Problem
`/api/ask` has no rate limiting. Any authenticated family member can send unlimited requests to the Claude API in quick succession. There is also no throttle on conversation creation. A curious kid spamming the "Ask Keith" button (or a malicious actor who gets credentials) could generate unexpected Anthropic API costs.

**Impact:** Financial risk (unbounded Claude API usage). No current mitigation.

## Root Cause
`src/app/api/ask/route.ts` has an auth check but no per-user request rate limiting. The only guard is `message.length > 2000`.

## Steps

This fix adds an in-memory sliding-window rate limiter. For a family app with low concurrency, in-memory is sufficient (no Redis needed).

### 1. Create rate limiter utility

Create `src/lib/rate-limit.ts`:

```typescript
// Simple in-memory sliding-window rate limiter.
// Suitable for low-traffic apps on a single server.
// Key: typically userId. Window: rolling N seconds.

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { allowed: false, retryAfterMs };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, retryAfterMs: 0 };
}
```

### 2. Apply rate limiter in /api/ask

Open `src/app/api/ask/route.ts`. After the auth check (line ~18), add:

```typescript
import { checkRateLimit } from "@/lib/rate-limit";

// Inside POST, after auth check:
const rateLimit = checkRateLimit(user.id, 20, 60_000); // 20 requests per minute
if (!rateLimit.allowed) {
  return Response.json(
    { error: "Too many questions! Take a breath and try again in a moment." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
    }
  );
}
```

Place this block right after the `if (!user)` check and before the message validation.

**Limits:** 20 requests per minute per user is generous for family use but prevents runaway spamming.

### 3. Handle 429 on the client

Open `src/app/ask/page.tsx`. In the `sendMessage` function, update the error handling after `if (!res.ok)`:

```typescript
if (!res.ok) {
  if (res.status === 429) {
    throw new Error("Too many questions! Please wait a moment before asking again.");
  }
  throw new Error("Failed to get response");
}
```

4. Run `npm run build` — confirm no type errors
5. Run `npm run lint` — confirm clean

## Files Modified
- `src/app/api/ask/route.ts` — rate limit check added after auth check
- `src/app/ask/page.tsx` — 429 status handled gracefully in UI

## New Files
- `src/lib/rate-limit.ts` — in-memory sliding window rate limiter

## Database Changes
None

## Verify
- [ ] Build passes
- [ ] Sending 20 messages in rapid succession is allowed
- [ ] 21st message in the same minute returns a friendly error message
- [ ] After the window resets, messages work again
- [ ] Normal conversational use (1 message every few seconds) is never blocked
