# Dev Plan: [IDEA-063] Entity Hover-Card in Ask Answers — Inline Wiki Tooltips
**Theme:** ask-forward

## What This Does

When the Ask companion's response contains a wiki link (e.g., `[ALARA](/characters/alara)`),
hovering the link in the answer bubble shows a small tooltip card with:
- Entity type badge (Character / Faction / Location / Vault / Artifact / Concept)
- Entity name (the link label)
- Subtle "View →" cue

Clicking still navigates to the wiki entry. The tooltip adds no latency (no fetches), uses
purely client-side logic (entity type derived from the href path segment), and requires no new
API routes or DB changes.

## User Stories

- As a first-time reader who gets an Ask answer mentioning "ALARA", I can hover the link to
  see "Character · ALARA" before deciding whether to leave the Ask thread and visit the wiki.
- As a re-reader (show_all_content on), I get the same hover affordance — the tooltip is not
  gated; it enhances any Ask session.
- As the author, no action required — the tooltip derives all information from the link href,
  which the AI companion already generates correctly.

## Implementation

### Phase 1: EntityHoverCard Component

1. Create `src/components/ask/EntityHoverCard.tsx`:

```tsx
"use client";

import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  characters: "Character",
  factions: "Faction",
  locations: "Location",
  vaults: "Vault",
  artifacts: "Artifact",
  rules: "Concept",
  stories: "Chapter",
  arcs: "Character Arc",
};

function entityTypeFromHref(href: string): string {
  // href is like /characters/alara — first path segment is the entity category
  const segment = href.split("/")[1] ?? "";
  return TYPE_LABELS[segment] ?? "Entry";
}

interface Props {
  href: string;
  children: React.ReactNode;
}

export function EntityHoverCard({ href, children }: Props) {
  const label = entityTypeFromHref(href);
  return (
    <span className="relative inline-block group/hc">
      <Link
        href={href}
        className="font-medium text-clay underline underline-offset-2 hover:text-clay-mid"
      >
        {children}
      </Link>
      <span
        className={[
          "pointer-events-none absolute bottom-full left-0 mb-1.5 z-50",
          "rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1",
          "text-xs text-ink shadow-sm whitespace-nowrap",
          "opacity-0 group-hover/hc:opacity-100 transition-opacity duration-150",
        ].join(" ")}
        aria-hidden="true"
      >
        <span className="type-meta text-ink-ghost">{label}</span>
        <span className="mx-1 text-ink-ghost">·</span>
        <span className="font-medium">{children}</span>
        <span className="ml-1 text-ink-ghost">→</span>
      </span>
    </span>
  );
}
```

**Checkpoint:** Component renders without errors when storybooked or dropped into a test page.
Tailwind `group-hover/hc` requires Tailwind 3.2+ (current project uses Tailwind 4 ✓).

### Phase 2: Wire into Ask Page

2. Open `src/app/ask/page.tsx`.

3. Add import near the top (after existing `Link` import):
```typescript
import { EntityHoverCard } from "@/components/ask/EntityHoverCard";
```

4. Update `ASSISTANT_MARKDOWN_COMPONENTS.a` (lines 30–38) to use `EntityHoverCard` for
   internal links:

```tsx
a({ href, children, node: _, ...props }) {
  if (href?.startsWith("/")) {
    return <EntityHoverCard href={href}>{children}</EntityHoverCard>;
  }
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-clay underline underline-offset-2 hover:text-clay-mid"
        {...props}
      >
        {children}
      </a>
    );
  }
  return <span>{children}</span>;
},
```

**Checkpoint:** Open any prior Ask conversation that contains entity links (e.g., ask "Who is
ALARA?"). Hover over the `[ALARA]` link in the response — tooltip appears above the link
showing "Character · ALARA →". Click navigates to `/characters/alara`.

### Phase 3: Polish

5. Verify tooltip positioning for links near the top of the viewport (tooltip should not clip
   above the header). If it does, add `bottom-full` fallback:
   - Use `top-full mt-1` as alternative if near the top. For simplicity in Phase 1, `bottom-full`
     is sufficient (links in Ask answers appear mid-page).

6. Run `npm run build` (or `node_modules/.bin/next build` in sandbox after `npm install`).
7. Run `npm run lint`.
8. Run `npm test` — confirm 192 tests pass (no logic touched).

## Content Considerations

No wiki content changes. No new markdown. No brain_lab pipeline changes.

The `TYPE_LABELS` map covers all current entity href prefixes. If new entity types are added
(e.g., `/missions/`), add to the map — it degrades gracefully to "Entry" for unknown prefixes.

## Spoiler & Gating Impact

**No spoiler concern.** The tooltip derives entity type from the href only. The entity name
shown is the same link text already visible in the answer bubble. No additional content is
fetched or revealed. Under companion-first all entity pages are accessible to all users.

No gating required. The hover-card is a UX enhancement visible to all readers.

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None.
- **Latency budget:** Zero additional latency — no fetch, no API call.
- **Conversation-memory storage:** Not touched.
- **Voice/TTS considerations:** Not applicable.

## Testing

- [ ] Build, lint, `npm test` pass
- [ ] Locked-reader path: hover-card visible (no gating — same behavior for all readers)
- [ ] Unlocked / re-reader path: same behavior
- [ ] Guest-cookie path: same behavior (hover-card is pure client-side UI)
- [ ] Tooltip does not obscure the link label itself
- [ ] Tooltip disappears promptly on mouse-out (CSS transition)
- [ ] Clicking the link still navigates correctly (pointer-events on tooltip span is `none`)
- [ ] Unknown href prefix (e.g., `/journeys/`) falls back to "Entry" label

## Dependencies

- No new npm packages
- No DB changes
- No API changes
- Prerequisite: none (standalone enhancement to the existing Ask link renderer)

## Estimated Total: 30 minutes
