# Fix: [FIX-023] Wiki Mirror Publish — Non-Atomic DB Operations

## Problem

When Keith publishes a Beyond story, `publishStoryToWikiMirror` in `src/lib/wiki/wiki-mirror.ts` performs three sequential DB writes:

1. UPDATE `sb_wiki_documents` — supersede any existing active doc for this story
2. INSERT `sb_story_integrations` — save computed integration metadata
3. INSERT `sb_wiki_documents` — save new active wiki document

If step 2 or 3 fails (network hiccup, constraint violation), the old document is already superseded and no new active doc exists. The story goes dark for Ask Keith and the corpus — it simply vanishes from the wiki until manually fixed. A subsequent rebuild or re-publish would recover it, but Keith has no UI signal that recovery is needed.

## Root Cause

`publishStoryToWikiMirror` (`src/lib/wiki/wiki-mirror.ts:288`) supersedes the old doc before inserting the new one. The partial unique index `idx_sb_wiki_documents_active_key` on `(doc_type, doc_key) WHERE status = 'active'` requires this order — you can't insert while an active doc still exists. So the supersede must happen first, creating a brief window of inconsistency.

The Supabase JS client does not expose multi-statement transactions, so a true atomic approach requires a Postgres RPC. The pragmatic fix is a recovery block: if the new insert fails, immediately re-activate the superseded doc.

## Steps

### 1. Open `src/lib/wiki/wiki-mirror.ts`

Find the section starting at line ~346 (the `sb_wiki_documents` insert and its error check):

```typescript
const { error: documentError } = await supabase.from("sb_wiki_documents").insert(row);
if (documentError) {
  throw new Error(`Failed to save wiki document: ${documentError.message}`);
}
```

Replace with a recovery block:

```typescript
const { error: documentError } = await supabase.from("sb_wiki_documents").insert(row);
if (documentError) {
  // Recovery: re-activate the superseded doc so the story doesn't go dark.
  await supabase
    .from("sb_wiki_documents")
    .update({ status: "active", updated_at: now })
    .eq("doc_type", "story")
    .eq("doc_key", docKey)
    .eq("status", "superseded")
    .order("version", { ascending: false })
    .limit(1);
  throw new Error(`Failed to save wiki document: ${documentError.message}`);
}
```

### 2. Apply the same recovery pattern for `rebuildDerivedWikiMirrorDocuments`

In `rebuildDerivedWikiMirrorDocuments` (line ~557), find the derived docs insert:

```typescript
const { error: insertError } = await supabase
  .from("sb_wiki_documents")
  .insert(docs);
if (insertError) {
  throw new Error(`Failed to save derived wiki documents: ${insertError.message}`);
}
```

Replace with:

```typescript
const { error: insertError } = await supabase
  .from("sb_wiki_documents")
  .insert(docs);
if (insertError) {
  // Recovery: re-activate the superseded derived docs.
  await supabase
    .from("sb_wiki_documents")
    .update({ status: "active", updated_at: now })
    .in("doc_type", ["theme", "timeline", "index"])
    .eq("status", "superseded");
  throw new Error(`Failed to save derived wiki documents: ${insertError.message}`);
}
```

### 3. Run `npm run build` to verify no breakage

### 4. Run `npm run lint` to verify no new issues

### 5. Run `npm test` to verify all 41 tests pass

### 6. Test manually

- In Beyond, create a new draft and publish it
- Confirm it appears on `/stories` and in Ask Keith responses
- Confirm no error toast in Beyond UI after publish

## Files Modified

- `src/lib/wiki/wiki-mirror.ts` — add recovery blocks after failed inserts

## Verify

- Build passes
- Lint passes (0 errors, 0 warnings)
- Tests pass (41/41)
- Beyond publish succeeds and story appears in wiki
- Error path doesn't leave story dark (hard to test without injecting failure)

