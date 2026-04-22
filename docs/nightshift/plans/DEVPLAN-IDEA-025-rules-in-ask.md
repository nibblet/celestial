# Dev Plan: [IDEA-025] Wire Celestial Rules into Ask Companion

## What This Does
Adds the Celestial world's governance/physics rules (from `content/wiki/rules/`) to every Ask persona's system prompt via a new `getRulesContext()` function in `prompts.ts`. Currently 14 rule files exist covering concepts like consent-threshold, resonance-field, directive-cn-24, the-inheritance, and others. Without this, Ask answers about the Celestial world's cosmology and ethics must be inferred from story summaries alone, producing vague or incorrect answers.

## User Stories
- As a first-time reader at CH04 asking "What is the consent threshold?": Ask names the rule, describes its operating principle, and cites the chapter it first appeared in — without spoiling CH07+ applications.
- As a re-reader (show_all_content on) asking "How does memory imprint relate to Sovrin's behavior?": Ask draws on both the rule definition and any cross-rule relationships shown in the rule files.
- As the author: No author-specific surface change; this improves Ask quality globally.

## Implementation

### Phase 1: Load and format rules for the prompt (20 min)

1. Open `src/lib/ai/prompts.ts`.
2. Add a new cached loader function after `getPeopleContext()`:

```ts
let cachedRulesContext: string | null = null;

export function getRulesContext(): string {
  if (cachedRulesContext !== null) return cachedRulesContext;
  try {
    const rules = getAllRules();
    if (rules.length === 0) {
      cachedRulesContext = "";
      return "";
    }
    const lines = rules.map((r) => {
      const parts = [`### ${r.title}`];
      if (r.thesis) parts.push(r.thesis);
      if (r.examples.length > 0) {
        parts.push(`Examples: ${r.examples.slice(0, 2).join("; ")}`);
      }
      return parts.join("\n");
    });
    cachedRulesContext = `## Celestial Rules & Concepts\n${lines.join("\n\n")}`;
  } catch {
    cachedRulesContext = "";
  }
  return cachedRulesContext;
}
```

3. Ensure `getAllRules` is imported at the top of `prompts.ts` (check existing imports — it likely comes from `@/lib/wiki/parser`).

**Checkpoint:** `getRulesContext()` returns a formatted block with all 14 rule titles and theses when called. Verify with a quick `npx tsx -e "import {getRulesContext} from './src/lib/ai/prompts'; console.log(getRulesContext())"`.

### Phase 2: Inject into sharedContentBlock (10 min)

1. Open `src/lib/ai/perspectives.ts`.
2. In `sharedContentBlock()`, add the rules block after the people context injection (around line 87):

```ts
import { getRulesContext } from "./prompts";

// inside sharedContentBlock, after getPeopleContext():
const rules = getRulesContext();
if (rules) parts.push(rules);
```

**Checkpoint:** The rules block now appears in every persona's system prompt. Test by checking build output or logging `buildFinderPrompt(...)` in a test.

### Phase 3: Build, lint, test (5 min)

```
npx next build
npm run lint
npm test
```

All 147 tests should still pass. The rules loader is pure filesystem read (same pattern as `getVoiceGuide()`).

## Content Considerations
- 14 rule files exist: `coherence`, `consent-threshold`, `directive-cn-24`, `memory-imprint`, `parables-of-resonance`, `resonance-field`, `resonant-ethic`, `the-inheritance`, `the-mirror-at-the-gate`, `the-pattern`, `the-silent-choir`, `the-vessel-and-the-thread`, `the-weightless-measure`, `vault-parables`.
- Rules files carry `<!-- generated:ingest -->` markers in some cases. The loader reads them as-is; `thesis` and `examples` are structural fields. No markdown mutation needed.
- New rule files added by brain_lab ingest will be automatically included (loader scans the directory).

## Spoiler & Gating Impact
- Rules describe world mechanics, not plot events — they are appropriate to show even to CH01 readers.
- No reader-progress filter needed on the rules block itself.
- The existing `Reader Progress Gate` block in `sharedContentBlock` still applies; personas are still told "never reveal content from later chapters." Rules describe the *world*, not *what happens in future chapters*.
- Ask impact is positive: more accurate world-building answers, no new spoiler vectors.

## Testing
- [ ] Build, lint, `npm test` pass
- [ ] `getRulesContext()` returns 14 rule entries
- [ ] Asking "What is the consent threshold?" in a dev session returns a named, defined answer
- [ ] Asking about rules from a CH01 reader perspective returns world-mechanics answers without plot spoilers
- [ ] Re-reader path: same quality or better
- [ ] Guest-cookie path: no change to gating behavior (rules are world-public)

## Dependencies
- `getAllRules()` must be importable in `prompts.ts` — check that it's exported from `parser.ts` (confirmed: `getAllRules` is exported)
- No DB changes, no new migrations

## Estimated Total: 35 minutes
