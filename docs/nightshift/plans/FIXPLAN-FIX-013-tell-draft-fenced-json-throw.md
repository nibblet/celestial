# Fix: [FIX-013] Uncaught Exception in /api/tell/draft When Fenced JSON is Malformed

## Problem
When Claude returns a JSON response wrapped in markdown fences (````json ... ````), the draft
route extracts the fenced content and calls `JSON.parse()` on it — but this secondary parse
call is **not wrapped in a try/catch**. If the extracted content is also malformed JSON, the
error propagates uncaught into the Next.js route handler, which returns an unformatted 500
with no error logging and inconsistent response body.

Impact: Low probability (Claude rarely produces fenced-but-invalid JSON for this prompt), but
if it occurs the contributor sees a broken spinner with no friendly error message.

## Root Cause
`src/app/api/tell/draft/route.ts`, lines 98–115:

```ts
try {
  draft = JSON.parse(rawText);
} catch {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    draft = JSON.parse(fenced[1]);  // ← throws uncaught if malformed
  } else {
    console.error(...)
    return Response.json({ error: "..." }, { status: 500 });
  }
}
```

The `if (fenced)` branch calls `JSON.parse` without its own try/catch.

## Steps

1. Open `src/app/api/tell/draft/route.ts`

2. Replace the catch block (roughly lines 100–115) with:

```ts
} catch {
  // Try to extract JSON from markdown fences
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      draft = JSON.parse(fenced[1]);
    } catch {
      console.error(
        "[tell/draft] Fenced JSON also failed to parse:",
        rawText.slice(0, 200)
      );
      return Response.json(
        { error: "Failed to compose story draft — please try again." },
        { status: 500 }
      );
    }
  } else {
    console.error(
      "[tell/draft] Failed to parse Claude response:",
      rawText.slice(0, 200)
    );
    return Response.json(
      { error: "Failed to compose story draft — please try again." },
      { status: 500 }
    );
  }
}
```

3. Run `npm run build` to verify no breakage.

4. Run `npm run lint` to verify no lint warnings.

## Files Modified
- `src/app/api/tell/draft/route.ts` — wrap secondary `JSON.parse` in try/catch

## Verify
- [ ] Build passes
- [ ] Lint passes
- [ ] Manually confirm: the error message `"Failed to compose story draft"` is the only possible
      user-facing error response when Claude produces unparseable JSON (check that `raw:` is
      NOT returned in any error path)
