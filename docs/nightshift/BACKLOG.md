# BACKLOG — Keith Cobb Interactive Storybook

> Ideas backlog with maturity tracking. Two categories: enhance existing features, and new features.

## Maturity Levels
- `seed` — 1-2 sentence concept, just identified
- `exploring` — Validated against codebase, feasibility assessed
- `planned` — User stories, technical approach defined
- `ready` — Dev plan written, waiting for Paul to execute
- `parked` — Stale 3+ days or deprioritized

---

## Category 1: Enhance / Mature / Expand Existing Features

### [IDEA-001] Guided Journeys — Curated Paths Through Stories
- **Status:** ready
- **Category:** enhance
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-12
- **Priority:** P1
- **Plan:** `docs/nightshift/plans/DEVPLAN-IDEA-001-guided-journeys.md`
- **Summary:** Curated, themed paths through the 39 stories — like a museum audio tour. Family members pick a journey (e.g., "Leadership Lessons", "Growing Up in the South", "Work Ethic & Grit") and are guided through a sequence of stories with reflection prompts and a journey summary at the end.
- **Night Notes:**
  - 2026-04-12: Seeded by Paul. The 12 existing themes provide a natural starting point for journey topics.
  - 2026-04-12 (Nightshift): Advanced to `ready`. Validated against codebase — all scaffolding exists (wiki parser, story detail layout, age mode context). 5-phase dev plan written. 4 initial journeys defined with story sequences. Key architectural decision: progress tracking via localStorage (no DB changes needed). Journey files live in `content/wiki/journeys/`. Requires FIX-003 (markdown rendering) to be done first.

---

### [IDEA-003] Age-Aware Ask Keith Suggestion Chips
- **Status:** seed
- **Category:** enhance
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-12
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** The 4 suggestion chips on the Ask Keith empty state ("What shaped Keith's leadership style?", etc.) are hardcoded for adult readers. They should dynamically reflect the active age mode — simpler, more relatable questions for young_reader and teen modes.
- **Night Notes:**
  - 2026-04-12: Seeded by Nightshift. In `src/app/ask/page.tsx` the suggestion array is a hardcoded static list. The `useAgeMode()` hook is already imported — the fix is just replacing the static array with an `ageModeContext`-aware one. Very small change, big UX impact for young family members.

---

## Category 2: New Features or Integrations

### [IDEA-002] Keith's Story Workshop — Author & Source Material Intake
- **Status:** exploring
- **Category:** new
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-12
- **Priority:** P1
- **Plan:** *(not yet written)*
- **Summary:** Two-track system for Keith to add new stories. Track 1: in-app markdown editor for direct authoring. Track 2: source material intake pipeline for photos, recordings, and handwritten notes.
- **Night Notes:**
  - 2026-04-12: Seeded by Paul. Track 1 (direct authoring) could be an admin-only `/workshop` route with a markdown editor, preview, and "publish to wiki" flow.
  - 2026-04-12 (Nightshift): Advancing to `exploring`. Validated: `sb_profiles` has a `role` field (`admin | member`), so admin-only route gating is already architecturally supported. The wiki compiler is deterministic from `content/raw/` — authored stories would need a `content/wiki/stories-authored/` directory and a separate read path in the parser. Key open question: how to prevent the deterministic compile from overwriting manually authored stories. Proposed approach: authored stories use a different filename prefix (e.g., `P2_S01`) and the parser treats them separately. Track 2 (source material pipeline) is a larger infrastructure investment — Supabase Storage + processing queue — and should be scoped separately.

---

### [IDEA-004] Story Bookmarks — Save Favorites for Easy Return
- **Status:** seed
- **Category:** new
- **Seeded:** 2026-04-12
- **Last Updated:** 2026-04-12
- **Priority:** P2
- **Plan:** *(not yet written)*
- **Summary:** Let family members bookmark stories they want to re-read, share, or reference. Bookmarks persist to Supabase so they're available across devices. A "My Bookmarks" section appears on the home page or profile page for quick access.
- **Night Notes:**
  - 2026-04-12: Seeded by Nightshift. Would need a new `sb_bookmarks` table (`user_id`, `story_id`, `created_at`) with RLS matching `sb_conversations`. UI is a single heart/bookmark icon on story cards and story detail pages. Medium lift — mostly plumbing. Could also use localStorage for a zero-DB version first.

---

## Parked

*(Ideas demoted after 3+ days without action)*
