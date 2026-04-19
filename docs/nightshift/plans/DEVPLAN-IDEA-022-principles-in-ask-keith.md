# Dev Plan: [IDEA-022] Principles Context in Ask Keith

## What This Does

The 12 canonical principles in `/principles` each have a rich `aiNarrative` (300+ words) and a precise `thesis` statement authored specifically to explain Keith's life patterns to a reader. Ask Keith currently knows the people (IDEA-019, shipped) but does not know the principles.

Adding a compact principles context to the system prompt would directly improve answers to the most emotionally resonant family questions: "What did Keith believe about hard work?", "How did Grandpa think about leadership?", "What lessons should I take from his stories?" Before this change, Ask synthesizes these answers from story text alone. After, it has explicit principle summaries to anchor responses.

This is a 30-minute pure prompt enhancement — no DB changes, no new routes, no migrations.

## User Stories

- As a grandchild, I want Keith to explain his core beliefs clearly, so I understand what drove him
- As a family member, I want Ask to connect a story I just read to a named principle, so the lesson has a memorable label
- As an adult reader, I want Ask to distinguish between Keith's different principles (not just "he worked hard"), so answers are specific and memorable

## Implementation

### Phase 1: Add getPrinciplesContext() to prompts.ts

**File:** `src/lib/ai/prompts.ts`

1. Import `getAllCanonicalPrinciples` from `@/lib/wiki/parser`:

```typescript
import { getAllCanonicalPrinciples } from "@/lib/wiki/parser";
```

1. Add a module-level cache (same pattern as `cachedWikiSummaries`):

```typescript
let cachedPrinciplesContext: string | null = null;
```

1. Add `getPrinciplesContext()` function (place near the existing `getPeopleContext()` function):

```typescript
function getPrinciplesContext(): string {
  if (cachedPrinciplesContext) return cachedPrinciplesContext;

  const principles = getAllCanonicalPrinciples();
  const lines = [
    "## Keith's 12 Core Principles",
    "",
    "These recurring patterns of belief and leadership emerge across Keith's stories:",
    "",
  ];

  for (const p of principles) {
    lines.push(`**${p.title}** — ${p.thesis}`);
    if (p.stories.length > 0) {
      const storyTitles = p.stories
        .slice(0, 3)
        .map((s) => s.title)
        .join("; ");
      lines.push(`  *Seen in: ${storyTitles}*`);
    }
  }

  cachedPrinciplesContext = lines.join("\n");
  return cachedPrinciplesContext;
}
```

1. Wire into `buildSystemPrompt`. Find the section where people context is assembled (around line 175-200) and add principles after people:

```typescript
const peopleContext = getPeopleContext();
const principlesContext = getPrinciplesContext(); // Add this line
```

1. Find where `peopleContext` is included in the prompt template (the long template literal) and add `principlesContext` immediately after it:

```
## People in Keith's Life
${peopleContext}

${principlesContext}
```

**Checkpoint:** Run `npm run build` — should pass clean. Confirm `getPrinciplesContext()` is called once and the result is cached.

### Phase 2: Smoke test in Ask

1. Start dev server: `npm run dev`
2. Navigate to `/ask`
3. Ask: "What did Keith believe about hard work?"
  - Expected: Response references "Work Hard and Carry Your Weight" by name and cites specific stories
4. Ask: "What's the difference between Keith's approach to leadership and relationships?"
  - Expected: Response distinguishes "Lead by Example" from "Build Relationships Before You Need Them"
5. Ask (young_reader mode): "What did Grandpa think was most important?"
  - Expected: Response uses simpler language but still names 1-2 principles clearly

**Checkpoint:** All three questions produce answers that reference named principles.

## Content Considerations

- `getAllCanonicalPrinciples()` is synchronous and reads from filesystem. Caching via module-level variable keeps it warm after first call.
- The compact format (title + thesis + top stories) uses ~1,200 chars. Total system prompt grows by ~1,200 chars — well within Claude's context window.
- If principles ever change (new canonical principle added), clearing the module cache requires a server restart — same behavior as `cachedWikiSummaries`. Acceptable for this use case.

## Age-Mode Impact

- **young_reader:** Principles are presented in simple thesis form. Claude will further simplify in its response.
- **teen:** Thesis language is accessible; principles give concrete labels to vague values.
- **adult:** Full richness of named principles anchors reflective conversation.

## Testing

- Build passes
- Lint passes
- `npm test` — all 41 tests pass
- Ask "What did Keith believe about hard work?" — names at least one principle
- Ask "Tell me about Keith's leadership principles" — mentions "Lead by Example" or "Build Relationships"
- All three age modes verified
- System prompt length still reasonable (< 8,000 tokens total)

## Dependencies

- None — `getAllCanonicalPrinciples()` is a pure parser function with no DB deps

## Estimated Total: 30 minutes

