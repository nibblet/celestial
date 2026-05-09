# Fix: [FIX-052] In-Memory Rate Limiter Ineffective in Serverless Multi-Instance Deployments

## Problem

`src/lib/rate-limit.ts` uses a module-level `Map<string, RateLimitEntry>` as a sliding-window
rate-limit store. In Vercel's serverless runtime every lambda instance has its own process memory;
parallel requests routed to different cold instances share no state, so per-user limits are
per-instance only.

8 routes use this limiter. The two highest-cost routes are:
- `/api/ask` — 20 req/min per user (AI generation cost)
- `/api/stories/[storyId]/audio/stream` — 5 req/15min per user (ElevenLabs cost)

A determined user can bypass either limit by sending concurrent requests to hit different
lambda instances. The current code's own comment acknowledges this:
`"Suitable for low-traffic apps on a single server."`

**Severity: Low — current traffic is low; risk grows with audience size.**

## Root Cause

`src/lib/rate-limit.ts:1` — module-level `Map`; no shared backing store.

## Steps

### Phase 1 — Add the DB table (migration 041)

> Note: FIX-026 will consume migration 040. This plan uses 041.
> If FIX-026 is not yet executed, renumber to 040 and adjust FIX-026 to 041.

1. Create `supabase/migrations/041_cel_rate_limits.sql`:

```sql
-- Rate limit tracking for high-cost serverless routes.
-- Accessed only via service_role client (no RLS needed).
create table if not exists public.cel_rate_limits (
  user_key   text        not null,
  route_key  text        not null,
  window_start timestamptz not null default now(),
  request_count integer  not null default 1,
  primary key (user_key, route_key)
);
```

### Phase 2 — Add the DB rate-limit helper

2. Create `src/lib/rate-limit-db.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Checks and increments a per-user rate limit backed by Supabase.
 * Returns `true` if the request is allowed, `false` if the limit is exceeded.
 *
 * Uses upsert: on conflict, resets the window if expired, otherwise increments.
 * Adds ~5 ms overhead per guarded request.
 */
export async function checkAndIncrementDbRateLimit(
  userKey: string,
  routeKey: string,
  maxRequests: number,
  windowSecs: number,
): Promise<boolean> {
  const windowInterval = `${windowSecs} seconds`;

  // One upsert + read. The CASE logic resets the window if expired.
  const { data, error } = await adminClient.rpc("upsert_rate_limit", {
    p_user_key: userKey,
    p_route_key: routeKey,
    p_max_requests: maxRequests,
    p_window_secs: windowSecs,
  });

  if (error) {
    // Fail open: if the DB is unreachable, allow the request rather than blocking all users.
    console.error("[rate-limit-db] DB error — failing open:", error.message);
    return true;
  }
  return (data as number) <= maxRequests;
}
```

3. Add the Postgres function to the same migration file (`041_cel_rate_limits.sql`):

```sql
create or replace function public.upsert_rate_limit(
  p_user_key   text,
  p_route_key  text,
  p_max_requests integer,
  p_window_secs  integer
) returns integer language plpgsql security definer as $$
declare
  v_count integer;
begin
  insert into public.cel_rate_limits (user_key, route_key, window_start, request_count)
  values (p_user_key, p_route_key, now(), 1)
  on conflict (user_key, route_key) do update set
    request_count = case
      when cel_rate_limits.window_start < now() - (p_window_secs * interval '1 second')
        then 1
      else cel_rate_limits.request_count + 1
    end,
    window_start = case
      when cel_rate_limits.window_start < now() - (p_window_secs * interval '1 second')
        then now()
      else cel_rate_limits.window_start
    end
  returning request_count into v_count;

  if v_count is null then
    select request_count into v_count from public.cel_rate_limits
    where user_key = p_user_key and route_key = p_route_key;
  end if;

  return coalesce(v_count, 1);
end;
$$;

-- Grant execute to the service role only.
revoke all on function public.upsert_rate_limit from public;
grant execute on function public.upsert_rate_limit to service_role;
```

### Phase 3 — Wire into `/api/ask`

4. Open `src/app/api/ask/route.ts`. Locate where `rateLimit(...)` is called for the ask route.

5. Add the import at the top:
```typescript
import { checkAndIncrementDbRateLimit } from "@/lib/rate-limit-db";
```

6. After `getReaderProgress()` and `getAuthenticatedProfileContext()`, replace or supplement the
   existing in-memory `rateLimit()` call with:

```typescript
// DB-backed rate limit for the AI cost route (20 req/min per user).
const userKey = profile?.id ?? ip ?? "anon";
const allowed = await checkAndIncrementDbRateLimit(userKey, "ask", 20, 60);
if (!allowed) {
  return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

Keep the existing in-memory `rateLimit()` call as a secondary local guard for single-instance
development and test environments (it still provides a fast-path check).

### Phase 4 — Wire into audio stream

7. Open `src/app/api/stories/[storyId]/audio/stream/route.ts`. Apply the same pattern:

```typescript
import { checkAndIncrementDbRateLimit } from "@/lib/rate-limit-db";

// DB-backed rate limit: 5 req per 15 min per user (ElevenLabs cost).
const userKey = profile?.id ?? ip ?? "anon";
const allowed = await checkAndIncrementDbRateLimit(userKey, "audio_stream", 5, 900);
if (!allowed) {
  return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

### Phase 5 — Validate

8. Run `npm run build` (or `node_modules/.bin/next build` in sandbox after `npm install`).
9. Run `npm run lint`.
10. Run `npm test` — confirm 192 tests pass; the rate-limit helper doesn't touch tested logic.

## Files Modified
- `src/app/api/ask/route.ts` — add DB rate limit guard
- `src/app/api/stories/[storyId]/audio/stream/route.ts` — add DB rate limit guard
- `src/lib/rate-limit-db.ts` — **new file**

## New Files
- `src/lib/rate-limit-db.ts`

## Database Changes
- `supabase/migrations/041_cel_rate_limits.sql` — new table + Postgres function

> **Migration ordering:** FIX-026 uses migration 040. This plan is written for 041.
> If executing this plan before FIX-026, use 040 and adjust FIX-026 to 041.

## Verify
- [ ] Build, lint, tests pass
- [ ] Migration applied (table exists, function callable from service role)
- [ ] `/api/ask`: 21st request in a 60-second window returns HTTP 429
- [ ] `/api/stories/[storyId]/audio/stream`: 6th request in 15 minutes returns 429
- [ ] Single-instance in-memory limiter still fires before the DB call (fast-path)
- [ ] DB error path: if `SUPABASE_SERVICE_ROLE_KEY` is missing, request still goes through (fail-open)
