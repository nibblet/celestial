# Dev Plan: [IDEA-019] People Biographical Context in Ask Keith

## What This Does

When a grandchild asks "Tell me about Grandpa's dad" or "Who was Bayne Cobb?", Ask Keith currently only has story summaries to draw from — not the dedicated biographical content that lives in `content/wiki/people/`. This plan adds a "Key People" section to the Ask Keith system prompt, pulling from the rich AI-drafted bios already in each person's wiki file.

With 58 people in the wiki (including Tier A subjects who have full biographical write-ups), Ask Keith will be able to give meaningful, grounded answers about the family, friends, mentors, and colleagues who shaped Keith's life — answering directly from the same source-of-truth content used by the `/people` pages.

## User Stories

- As a grandchild, I want to ask "Who was Bayne Cobb?" and get a real answer grounded in the memoir
- As a family member, I want Ask Keith to know about the major people in his life — not just vague story references
- As an adult reader, I want the AI to be able to connect a person mention in one story to their fuller biographical context

## Implementation

### Phase 1: Add People Context Loader to prompts.ts

1. Open `src/lib/ai/prompts.ts`
2. Add a module-level cache and loader for Tier A people bios:

```ts
let cachedPeopleContext: string | null = null;

export function getPeopleContext(): string {
  if (cachedPeopleContext) return cachedPeopleContext;
  const peopleDir = path.join(WIKI_DIR, "people");
  if (!fs.existsSync(peopleDir)) {
    cachedPeopleContext = "";
    return "";
  }
  const files = fs.readdirSync(peopleDir).filter((f) => f.endsWith(".md"));
  const entries: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(peopleDir, file), "utf-8");
    // Extract the "About [Name]" section (between <!-- ai-draft:start --> and <!-- ai-draft:end -->)
    const draftMatch = content.match(/<!-- ai-draft:start[^>]*-->([\s\S]*?)<!-- ai-draft:end -->/);
    if (!draftMatch) continue;
    const bio = draftMatch[1].trim();
    if (!bio) continue;
    entries.push(bio);
  }
  cachedPeopleContext = entries.length > 0
    ? `## Key People in Keith's Life\n\n${entries.join("\n\n---\n\n")}`
    : "";
  return cachedPeopleContext;
}
```

1. **Checkpoint:** Import and call `getPeopleContext()` in a scratch test to verify it returns bio content for Tier A people like Bayne Cobb, Frances Cobb, etc.

### Phase 2: Add People Context to System Prompt

1. Open `src/lib/ai/prompts.ts`, find the `buildSystemPrompt()` function (or wherever the system prompt is assembled)
2. Include people context after the wiki summaries section but before the story link catalog:

```ts
const peopleContext = getPeopleContext();
// Add to the system prompt string:
// ${peopleContext ? `\n\n${peopleContext}` : ""}
```

The exact insertion point should be after the `## Stories` wiki summary section and before any age-mode instructions. The goal is: people bios are available when the AI needs them, but they don't dominate the prompt.

1. **Checkpoint:** Send a test Ask request locally: "Tell me about Bayne Cobb." Verify the response includes specific biographical details (born 1916, truck driver, died at 93, etc.) rather than a generic "Keith's father" answer.

### Phase 3: Token Budget Check

The wiki people directory has 58 files. Not all have `ai-draft` sections. Tier A/B people with drafted bios will contribute ~200-400 words each. At full coverage, this could add 5,000–15,000 tokens to the system prompt.

Before shipping, check the prompt size:

1. After Phase 2, log `process.env.NODE_ENV === 'development' && console.log('System prompt tokens:', systemPrompt.length / 4)` temporarily
2. If the prompt is over ~6,000 tokens total, consider filtering to only Tier A people (who have the richest bios):
  - Filter: only include files where the wiki page's tier line contains `(A`
  - Or: limit to the 15–20 most prominent people by checking for Tier A in the `## Note` section
3. **Checkpoint:** Ask multiple questions in different age modes. Verify the response quality improves without noticeably slower response times.

### Phase 4: Age-Mode Tone

The people context is sourced from the wiki, which is written at adult reading level. No changes needed to the content itself — the age-mode instructions already tell the AI to adapt its language. However, add a note to the system prompt hint:

```
When discussing people from the list above, adapt the biographical detail to the age mode:
- young_reader: "Grandpa's dad was a hardworking man who drove a truck..."
- teen: brief factual bio with one vivid detail
- adult: full biographical context as written
```

This instruction should be inline in the people context section of the system prompt.

1. **Checkpoint:** Ask "Who was Bayne Cobb?" in each of the three age modes. Verify the depth and vocabulary shift correctly.

## Content Considerations

- People bios live in `content/wiki/people/` — single source of truth (wiki-first)
- The `<!-- ai-draft:start -->` / `<!-- ai-draft:end -->` comment markers already distinguish AI-generated content from structural data — use those as extraction boundaries
- People without `ai-draft` sections (Tier C/D stubs) will be excluded — that's fine; they're minor mentions
- No new wiki files needed; no DB changes needed

## Age-Mode Impact

- **young_reader:** AI naturally simplifies bio content when answering; the data is available for the AI to draw from
- **teen:** Medium depth biographical answers
- **adult:** Full biographical context available including notable quotes and moments

## Testing

- Build passes after changes to prompts.ts
- "Tell me about Bayne Cobb" returns specific biographical facts
- "Who was Frances Cobb?" returns content about Keith's mother
- "Tell me about Blue and Ruby Cole" returns content from their people page
- Response quality doesn't regress for non-people questions (story/theme queries)
- Token budget check: system prompt length is reasonable (< 8,000 tokens ideally)
- All three age modes tested

## Dependencies

None — people wiki pages already exist with AI-drafted bios (confirmed in `content/wiki/people/bayne-cobb.md` and others).

## Estimated Total: 1 hour

(30 min implementation, 30 min testing across age modes and question types)