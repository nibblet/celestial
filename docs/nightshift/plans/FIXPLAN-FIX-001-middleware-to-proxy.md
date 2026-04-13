# Fix: [FIX-001] Next.js 16 Middleware Deprecation — Rename to proxy.ts

## Problem
The build emits a warning on every build:
> "The 'middleware' file convention is deprecated. Please use 'proxy' instead."

In Next.js 16.2.3, the `middleware.ts` file convention at the app root has been replaced by `proxy.ts`. Using the old name is deprecated and will eventually stop working, breaking all auth protection across the app.

**Impact:** Currently functional but will break in a future Next.js 16 patch; every build produces a warning that obscures real errors.

## Root Cause
`src/middleware.ts` exists at the app root. Next.js 16 changed the auth-enforcement file convention from `middleware` to `proxy`. The Supabase SSR session update logic lives there and protects all non-auth routes.

## Steps
1. Open `src/middleware.ts` — read the full file to confirm contents
2. Create `src/proxy.ts` with **identical content** to `src/middleware.ts`
3. Delete `src/middleware.ts`
4. Verify the `config` export in `src/proxy.ts` still has the correct `matcher` — it should remain unchanged
5. Run `npm run build` — confirm the deprecation warning is gone
6. Run `npm run lint` — confirm no new errors

## Files Modified
- `src/middleware.ts` — **deleted**
- `src/proxy.ts` — **new file, identical content to old middleware.ts**

## New Files
- `src/proxy.ts` — Next.js 16 proxy convention for Supabase session refresh and auth-guard redirect

## Database Changes
None

## Verify
- [ ] Build passes with no deprecation warning about middleware
- [ ] Accessing `/stories` while logged out redirects to `/login`
- [ ] Accessing `/login` while logged in redirects to `/`
- [ ] Auth callback at `/auth/callback` still works
