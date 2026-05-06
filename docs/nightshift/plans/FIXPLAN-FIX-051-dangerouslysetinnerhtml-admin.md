# Fix: [FIX-051] `dangerouslySetInnerHTML` Without HTML Sanitization in Author-Only Admin Surfaces

## Problem

Two author-only surfaces render HTML from the database using React's `dangerouslySetInnerHTML` without sanitizing the HTML first:

1. `src/components/beyond/BeyondDraftEditor.tsx:420` — renders the TipTap draft `body` column directly.
2. `src/app/admin/drafts/page.tsx:185` — renders draft `body` column in the admin drafts list.

The gating function `isHTML(s)` in both files only checks `return /^\s*</.test(s)`. If the string starts with `<`, it's injected unsanitized.

**Severity: Low** — Both surfaces are author/admin-only (requires `role = 'author'` or `role = 'admin'`). TipTap enforces its ProseMirror schema during editing, which prevents most malicious HTML. However, the `@tiptap/extension-image` v3.22.3 configured in `TipTapEditor.tsx` (lines 40-44) does not explicitly restrict `javascript:` or `data:` URIs in image `src` attributes. An author-created image node with a `javascript:` src would survive DB round-trip and execute on render.

## Root Cause

`BeyondDraftEditor.tsx` uses TipTap to produce HTML output, but when restoring an existing draft (`initialHTML` prop), the body is re-injected into `dangerouslySetInnerHTML` for a "preview" render at line 419-424. The `admin/drafts/page.tsx` shows a preview of each draft's body using the same pattern. Neither site calls a sanitizer before injection.

TipTap Image extension in `TipTapEditor.tsx`:
```ts
Image.configure({
  HTMLAttributes: { class: "rounded-lg my-3 max-w-full h-auto" },
  inline: false,
  allowBase64: false,
})
```
`HTMLAttributes` only adds classes — it does not restrict the `src` attribute scheme.

## Steps

1. Install `isomorphic-dompurify` (works in both Node and browser environments):
   ```
   npm install isomorphic-dompurify
   npm install --save-dev @types/dompurify
   ```

2. Create `src/lib/sanitize-html.ts`:
   ```ts
   import DOMPurify from "isomorphic-dompurify";

   export function sanitizeHTML(dirty: string): string {
     return DOMPurify.sanitize(dirty, {
       ALLOWED_TAGS: ["p","br","strong","em","u","s","h1","h2","h3","ul","ol","li","blockquote","a","img","figure","figcaption","span","div"],
       ALLOWED_ATTR: ["href","src","alt","class","target","rel","data-person-id","data-person-label","data-person-slug"],
       ALLOW_DATA_ATTR: false,
       FORCE_BODY: false,
     });
   }
   ```
   The allowed tag list mirrors what TipTap's StarterKit + Image + Mention extensions can produce.

3. In `src/components/beyond/BeyondDraftEditor.tsx`:
   - Add import: `import { sanitizeHTML } from "@/lib/sanitize-html";`
   - Change line 420 from:
     ```tsx
     <div dangerouslySetInnerHTML={{ __html: body }} />
     ```
     to:
     ```tsx
     <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(body) }} />
     ```

4. In `src/app/admin/drafts/page.tsx`:
   - Add import: `import { sanitizeHTML } from "@/lib/sanitize-html";`
   - Change line 185 from:
     ```tsx
     <div dangerouslySetInnerHTML={{ __html: d.body }} />
     ```
     to:
     ```tsx
     <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(d.body) }} />
     ```

5. Defense-in-depth: add `src` scheme validation to the TipTap Image extension in `src/components/beyond/TipTapEditor.tsx` to block `javascript:` and `data:` URIs at edit time:
   ```ts
   Image.extend({
     addAttributes() {
       return {
         ...this.parent?.(),
         src: {
           default: null,
           parseHTML: (el) => {
             const src = el.getAttribute("src") ?? "";
             if (/^javascript:/i.test(src) || /^data:/i.test(src)) return null;
             return src;
           },
           renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
         },
       };
     },
   }).configure({
     HTMLAttributes: { class: "rounded-lg my-3 max-w-full h-auto" },
     inline: false,
     allowBase64: false,
   })
   ```

6. `npm run lint`

7. `npm run build`

8. `npm test`

9. Manual verify: open the Beyond workspace, create a draft with an image, preview it — confirm the image renders normally. Navigate to `/admin/drafts` — confirm draft previews render normally.

## Files Modified

- `src/lib/sanitize-html.ts` (new)
- `src/components/beyond/BeyondDraftEditor.tsx` — line 420: wrap with `sanitizeHTML()`
- `src/app/admin/drafts/page.tsx` — line 185: wrap with `sanitizeHTML()`
- `src/components/beyond/TipTapEditor.tsx` — Image extension: add `src` attribute scheme validation

## New Files

- `src/lib/sanitize-html.ts`

## Database Changes

None.

## Verify

- [ ] `npm install` succeeds (isomorphic-dompurify added)
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` passes
- [ ] `npm test` — 192/192 pass
- [ ] Beyond workspace: draft preview renders normally after sanitization
- [ ] Admin drafts page: draft body previews render normally after sanitization
- [ ] Sanity: `sanitizeHTML('<img src="javascript:alert(1)">`)` returns `<img>` (src stripped)
