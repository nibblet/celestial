# Dev Plan: [IDEA-001] Guided Journeys — Curated Paths Through Stories

## What This Does
Guided Journeys are pre-authored, thematic paths through Keith's 39 stories — like a museum audio tour. A family member picks a journey topic (e.g., "Growing Up in the South", "Leadership Under Pressure", "Work Ethic & Grit") and is walked through a hand-curated sequence of stories in a meaningful order. Between each story, a short AI-generated "connector" paragraph links the story just read to the next one, and a reflection prompt is offered. At the end, a journey summary recaps the key lesson thread.

**Why it matters:** Right now, stories are browsable but there's no curation for first-time readers. Grandchildren opening the app for the first time don't know where to start. Journeys give them a guided on-ramp into Keith's life that feels intentional and emotionally resonant — not just a list.

## User Stories
- As a grandchild, I want to follow a guided path through stories about Keith's childhood so I get a coherent picture of where he came from.
- As a teen, I want a "Career Lessons" journey that shows me how Keith built his career, step by step, with simple reflections I can connect to my own future.
- As an adult, I want to explore a "Leadership Under Pressure" journey that goes deep into the ethical and strategic decisions Keith made.
- As any family member, I want to pick up a journey where I left off (basic progress tracking).

## Implementation

### Phase 1: Journey Data — Static Definitions

1. Create `content/wiki/journeys/` directory
2. Create individual journey files (one per journey). Start with 4 journeys:

   **`growing-up-in-the-south.md`**
   - Title: Growing Up in the South
   - Stories: P1_S01, P1_S02, P1_S03, P1_S06, P1_S07, P1_S08
   - Theme focus: childhood, family, identity, community
   
   **`the-making-of-a-career.md`**
   - Title: The Making of a Career
   - Stories: P1_S16, P1_S17, P1_S18, P1_S19, P1_S20, P1_S21, P1_S22, P1_S23
   - Theme focus: early career, ambition, work ethic, professional growth
   
   **`leadership-under-pressure.md`**
   - Title: Leadership Under Pressure
   - Stories: P1_S24, P1_S25, P1_S26, P1_S27, P1_S28
   - Theme focus: leadership, integrity, accountability, decision-making
   
   **`roots-and-values.md`**
   - Title: Roots & Values
   - Stories: P1_S04, P1_S05, P1_S09, P1_S10, P1_S31, P1_S32
   - Theme focus: character, faith, curiosity, gratitude

   **Journey file format:**
   ```markdown
   # Growing Up in the South
   
   **Slug:** growing-up-in-the-south
   **Description:** Walk through Keith's early years — the red clay hills of Mississippi, the family that shaped him, and the small-town values that never left him.
   **Story Count:** 6
   **Age Appropriate:** young_reader, teen, adult
   
   ## Stories
   - [[P1_S01]]
   - [[P1_S02]]
   - [[P1_S03]]
   - [[P1_S06]]
   - [[P1_S07]]
   - [[P1_S08]]
   ```

3. Create `src/lib/wiki/journeys.ts` — parser that reads journey files:
   ```typescript
   export interface WikiJourney {
     slug: string;
     title: string;
     description: string;
     storyIds: string[];
     storyCount: number;
   }
   
   export function getAllJourneys(): WikiJourney[] { ... }
   export function getJourneyBySlug(slug: string): WikiJourney | null { ... }
   ```

4. **Checkpoint:** `getAllJourneys()` returns 4 journey objects with correct story sequences.

---

### Phase 2: Journey List Page

1. Create `src/app/journeys/page.tsx` — journey picker:
   - Header: "Guided Journeys"
   - Subhead: "A curated path through Keith's stories"
   - Grid of journey cards (similar to themes page cards)
   - Each card: title, description, story count, "Begin Journey →" CTA
   - This is a server component — no client state needed

2. Add Journeys link to `src/components/layout/Nav.tsx` alongside Stories, Themes, Timeline, Ask.

3. **Checkpoint:** `/journeys` renders 4 journey cards with correct info. Nav link works.

---

### Phase 3: Journey Reading Flow

1. Create `src/app/journeys/[slug]/page.tsx` — journey intro page:
   - Shows journey title, description, list of story titles in order
   - "Start Journey" button → links to first story in journey: `/journeys/[slug]/1`

2. Create `src/app/journeys/[slug]/[step]/page.tsx` — journey step page:
   
   **URL structure:** `/journeys/growing-up-in-the-south/1` (step 1 of N)
   
   **Layout:**
   - Progress bar: "Story 1 of 6 — Growing Up in the South"
   - Story title and full story content (reuse `getStoryById(storyId).fullText` rendered with ReactMarkdown)
   - Story principles section (same as story detail page)
   - **Reflection prompt** (age-mode-aware, static — one per story-in-journey, authored in the journey file)
   - **Navigation footer:**
     - "← Previous Story" (if not first)
     - "Next Story →" (if not last)
     - On last story: "Finish Journey" → `/journeys/[slug]/complete`

3. Add reflection prompts to journey markdown files — one per story:
   ```markdown
   ## Reflections
   - [[P1_S01]]: What do you think it was like to grow up in a small town where everyone knew each other?
   - [[P1_S02]]: Keith took on a lot of responsibilities as a teenager. What responsibilities do you have that help shape who you are?
   ```

4. Create `src/app/journeys/[slug]/complete/page.tsx` — journey completion page:
   - "You've completed: [Journey Title]"
   - 3–4 key themes/lessons from this journey (pull from the stories' principles)
   - "Ask Keith about this journey" CTA → `/ask?journey=[slug]`
   - "Explore another journey" CTA → `/journeys`
   - "Browse all stories" CTA → `/stories`

5. **Checkpoint:** Full flow works: pick journey → step 1 → step 2 → ... → complete. Navigation between steps works.

---

### Phase 4: Age-Mode Aware Reflection Prompts

1. Journey files store one generic reflection per story. At render time, the reflection can be displayed differently by age mode:
   - `young_reader`: Short question, 1 sentence, simple vocabulary. Add a visual cue (star icon or "Think about this:").
   - `teen`: Standard question as written.
   - `adult`: Add a second, deeper follow-up question ("How does this connect to a decision you've made in your own life?")

2. In `src/app/journeys/[slug]/[step]/page.tsx`, read `ageMode` from the `AgeModeContext` and adjust reflection rendering.

3. Since this is a server component (no client state), pass `ageMode` as a prop from layout or convert to a lightweight client component just for the reflection section.

4. **Checkpoint:** Young reader sees a simple "Think about this:" prompt. Adult sees a deeper follow-up question.

---

### Phase 5: Progress Tracking (localStorage, no DB)

1. Track which journey steps have been visited using `localStorage`:
   - Key: `journey_progress_[slug]`
   - Value: `{ completedSteps: number[], completed: boolean }`

2. On the journey intro page (`/journeys/[slug]`), if progress exists, show "Continue where you left off →" with the next unread step.

3. On the journey list page, show a subtle "In progress" or "Completed" badge on journey cards that have progress data.

4. Create a thin client hook `src/hooks/useJourneyProgress.ts` to encapsulate localStorage reads/writes.

5. **Checkpoint:** Starting a journey, navigating to step 3, refreshing the page, going back to `/journeys/[slug]` shows "Continue from Story 4".

---

## Content Considerations
- Journey story sequences need to be authored thoughtfully (not auto-generated) — the order should tell a coherent narrative arc
- Reflection prompts need one author pass — they're static markdown and don't require AI
- Journey files live in `content/wiki/journeys/` as the single source of truth
- No content in the database — consistent with wiki-first architecture

## Age-Mode Impact
- **young_reader:** Simple one-sentence reflection questions. Progress bar labeled "Story 1 of 6" with a friendly icon.
- **teen:** Standard reflection questions. Progress bar shows percentage complete.
- **adult:** Deeper follow-up reflection questions. Journey summary on completion page is more detailed.

## Testing
- [ ] Build passes
- [ ] All 4 journeys render their full story sequences
- [ ] Step navigation (prev/next) works correctly at first and last step boundaries
- [ ] Completion page shows correctly after final step
- [ ] Age mode changes affect reflection prompt display
- [ ] Progress tracking persists across page refreshes
- [ ] Mobile layout looks correct (progress bar, navigation footer)

## Dependencies
- FIX-003 (Story full text markdown rendering) should be done first so story content in journeys renders correctly
- No database migrations needed

## Estimated Total: 4–6 hours
