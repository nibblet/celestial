# Fix: [FIX-024] Corpus Cache Invalidation Ineffective in Serverless

## Problem

`src/lib/wiki/corpus.ts` uses a module-level variable `cachedDbStories` with a 30-second TTL to cache Supabase wiki mirror story documents. When Keith publishes a story via `/api/beyond/drafts/[id]/publish`, the route calls `invalidateWikiCorpusCache()` to clear this cache.

In Vercel's serverless runtime, each function invocation runs in a separate Node.js process (Lambda instance). The `invalidateWikiCorpusCache()` call only clears the cache in the specific Lambda that handled the publish request. Other concurrent Lambda instances (e.g., a family member using Ask Keith at the same time) still serve the stale cache for up to 30 seconds. The `invalidateWikiCorpusCache` export creates a false sense of immediate consistency.

## Root Cause

Module-level caching in serverless creates per-instance state. There is no shared memory between Lambda instances. This is a structural limitation of the serverless model, not a code bug.

## Impact

Very Low — the family app has rare writes (Keith publishes maybe once a week) and a 30-second stale window is imperceptible. However the `invalidateWikiCorpusCache()` call is misleading.

## Steps

### 1. Open `src/lib/wiki/corpus.ts`

Find the cache declaration and `getActiveDbStories` function (lines 19-65).

Add a comment to the cache TTL constant documenting the serverless behavior:

```typescript
// 30-second TTL. In Vercel serverless each Lambda instance has its own cache.
// invalidateWikiCorpusCache() only affects the calling instance — other
// concurrent instances will serve stale data until their TTL expires.
// This is acceptable: Beyond publishes are rare and 30s staleness is invisible.
const CACHE_TTL_MS = 30_000;
```

Then replace the hardcoded `30_000` in the cache check:

```typescript
// Before:
cachedDbStories = { expiresAt: now + 30_000, stories, markdownByStoryId };

// After:
cachedDbStories = { expiresAt: now + CACHE_TTL_MS, stories, markdownByStoryId };
```

And update the guard:

```typescript
// Before:
if (cachedDbStories && cachedDbStories.expiresAt > now) {

// After (unchanged — already checks expiresAt):
if (cachedDbStories && cachedDbStories.expiresAt > now) {
```

### 2. Add a doc comment to `invalidateWikiCorpusCache`

```typescript
/**
 * Clears the in-memory corpus cache for this Lambda instance.
 * In Vercel serverless, other concurrent instances are unaffected —
 * their caches expire naturally after CACHE_TTL_MS.
 */
export function invalidateWikiCorpusCache() {
  cachedDbStories = null;
}
```

### 3. Run `npm run build` to verify no breakage

## Files Modified

- `src/lib/wiki/corpus.ts` — add CACHE_TTL_MS constant and documentation comments

## Verify

- Build passes
- Lint passes
- No behavioral change — purely documentation

