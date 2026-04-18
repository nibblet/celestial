# Spec: Profile as Reflection Gallery

**Date:** 2026-04-18
**Scope:** Rework `/profile` (non-Keith, non-special-access users) into a reflective mirror of how each user is engaging with Keith's stories.
**Does NOT touch:** The Keith special-access profile (`KeithProfileHero`). That page remains as-is.

---

## 1. Purpose

The profile page today is a utility launcher (four action buttons + a reading trail dashboard). This redesign makes it a **mirror**: a calm, considered portrait of the user's evolving relationship with Keith and his stories. The user comes here to *see themselves*, not to *do something*.

Guiding principle: **Reflect, don't direct.** Utility is reachable but never shouting.

---

## 2. Signals Surfaced (stage one)

Three anchor signals:

1. **An AI-written narrator reflection** — one or two sentences, second-person, observational voice. The hero of the page.
2. **Principles they've encountered most** — Keith's distilled ideas, drawn from stories they've read.
3. **Passages they've saved** — the words that actually stopped them.

Supporting signals (already in hand):

- Stories read + most recent read (presented as "With Keith since")
- Themes they return to
- Questions asked + Keith's answers (merged into one dialogue tile)
- Favorites (as "Keepers")

Explicitly **out of scope for stage one**:

- User-selectable panels / customization. (Ship curated, watch what resonates, customize later if needed.)
- Shareable "portrait" export.
- Keith-voiced reflections (voice is narrator/second-person only for now; door is left open).
- "Keith's people you've met" tile (ghosted as future — implementation deferred until people pages ship).

---

## 3. Voice

Narrator, second person. Warm, observational, never presumptuous.

**Good:** *"Your reading keeps circling back to stories of identity and early mentors. The passages you've saved share a common thread — quiet, formative moments."*

**Avoid:** Keith-in-first-person ("I notice you…") until real Keith-authored content exists.

---

## 4. Layout

### 4.1 Hero strip (narrator reflection IS the hero)

- Same warm red-clay-gradient background as today.
- Eyebrow label: `YOUR CORNER OF THE STORYBOOK`
- Display name (large Playfair, as today).
- **Narrator reflection** — the visual centerpiece. Italic, Lora or Playfair, generous size (roughly `clamp(1.125rem, 1.75vw, 1.5rem)`), max-width ~640px, centered, ample vertical breathing room above and below.
- Small meta below reflection: `REFLECTION REFRESHED [relative date]` (e.g., "today", "2 days ago").
- **Top-right utility icons** (absolutely positioned in the hero, not in the center layout). Subtle, icon-only, muted color (~`rgba(240,232,213,0.55)`), 44px hit areas, tooltip on hover, `aria-label` for SR:
  - ↻ Take the tour again (`/welcome?replay=1`)
  - ⚙ Admin (`/profile/admin`, admins only)
  - ⏏ Sign out (calls existing `supabase.auth.signOut()` flow)

Email line currently below name: **remove**. It adds nothing reflective; users know their own email. (Small simplification, but worth calling out.)

### 4.2 Gallery grid

Below the hero, on the existing darker `#241710` reading-trail band. 6-column responsive grid on desktop (md+), collapsing to 2-col and then 1-col on smaller breakpoints.

Tile inventory (stage one), in visual order:

| # | Tile | Desktop span | Contents |
|---|---|---|---|
| 1 | **A passage you kept** (featured) | 4 col | Most recently saved passage. Italic serif, gold left-rule. Story title link. Footer: `3 saved →` link to `/profile/highlights`. |
| 2 | **With Keith since** | 2 col | First-read month/year + "N stories · most recent [relative]". |
| 3 | **Principles showing up** | 3 col | Top 3 principles, each a quoted line. `see all →` to a new `/profile/principles` view (or expand inline — see §6). |
| 4 | **Your dialogue with Keith** | 3 col | Up to 2 most-recent Q&A pairs. Question (italic), Keith's answer (gold) or "Waiting for Keith's answer…". Footer: `N asked · N answered →` link to `/profile/questions`. |
| 5 | **Themes you return to** | 2 col | Existing chip style. Top ~5 themes with counts. |
| 6 | **Keepers** (favorites) | 2 col | Up to 2 favorite story titles + saved date. Footer: `N →` link to `/profile/favorites`. |
| 7 | **Keith's people you've met** | 2 col | **Ghosted / dashed border** — "Coming once people pages ship." Not implemented this round; included as a placeholder so the grid feels intentionally forward-looking. |

Rows sum to 6 columns each:
- Row 1: tile 1 (4) + tile 2 (2)
- Row 2: tile 3 (3) + tile 4 (3)
- Row 3: tile 5 (2) + tile 6 (2) + tile 7 (2)

On md breakpoints the grid collapses to 2-col (each tile full width of the pair), and on sm to single column. Tile order above is preserved at all breakpoints.

### 4.3 Utility footer

Removed. (All utility now lives as top-right icons.)

---

## 5. Narrator Reflection: Generation & Caching

### 5.1 When to generate

- **First generation:** user has read ≥ 1 story (so we have *something* to reflect on).
- **Regeneration triggers (any of):**
  - +3 reads since last generation, OR
  - +1 saved passage since last generation, OR
  - +1 question asked since last generation.
- **Floor:** at most once per 24h per user. If a trigger fires within the cooldown, it's queued and honored on the next eligible view.

### 5.2 Input to the model

- List of read stories with themes + principles (same data the dashboard already assembles).
- List of saved passages (text + source story). Capped to the most recent 20 to bound prompt size.
- List of questions asked (text only; do not include Keith's answers — we're describing the *user's* pattern, not summarizing Keith).

### 5.3 Output shape

- 1–2 sentences, second person, plain prose. No lists, no markdown, no emojis.
- Target ~25–45 words.
- Prompt guardrails: observational, not prescriptive; reference what they seem *drawn to*, not what they *should* do; never invent facts about the user or Keith.

### 5.4 Persistence

New DB table:

```sql
create table if not exists sb_profile_reflections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reflection_text text not null,
  generated_at timestamptz not null default now(),
  input_signature text not null,  -- hash of (read_count, saved_count, asked_count) at generation time
  model_slug text not null
);
-- RLS: user can read own row. Only service role can write.
```

The `input_signature` lets us cheaply decide whether the trigger conditions have moved meaningfully without re-hashing the full corpus.

### 5.5 Model choice

Reuse whichever provider/model the existing `src/lib/ai/` pipeline uses (classifier/perspectives). No new provider is introduced.

### 5.6 Graceful degradation

If generation fails, is rate-limited, or no row yet exists and the user has read 0 stories: **do not show a fake reflection**. Instead show the empty-state line (see §7).

---

## 6. Featured Passage Selection

- **Stage one rule:** the most recently saved `sb_highlight`. Simple, surprising, always fresh.
- If zero saved: the tile becomes a ghost version (see §7).

---

## 7. Empty State

A user with 0 reads and 0 saves should see:

- Hero: narrator reflection slot is **replaced by a gentle CTA line**, italic, same position: *"Your portrait is just beginning. Start with a story."* — linked to `/stories`.
- Meta tag below it changes from `REFLECTION REFRESHED…` to a subtler `YOUR READING TRAIL STARTS HERE`.
- All gallery tiles render as **ghosted versions** with soft-color borders and placeholder copy:
  - Passage → "The passages you save will appear here."
  - With Keith since → "Start reading and this will fill in."
  - Principles → "Ideas you encounter will collect here."
  - Dialogue → "Questions you ask Keith will live here."
  - Themes → "Themes you return to will appear here."
  - Keepers → "Stories you favorite will live here."
  - Keith's people → (already ghosted; unchanged)

Partial-data users (e.g., read 3 stories, saved 0): real tiles for what they have, ghost tiles for the rest. No mixed messaging — each tile independently decides "real or ghost" based on its own source data.

---

## 8. Components & Files

New:

- `src/components/profile/ProfileReflectionHero.tsx` — hero strip with narrator reflection + utility icons.
- `src/components/profile/ProfileGallery.tsx` — the grid shell.
- `src/components/profile/tiles/` — one file per tile:
  - `FeaturedPassageTile.tsx`
  - `WithKeithSinceTile.tsx`
  - `PrinciplesTile.tsx`
  - `DialogueTile.tsx`
  - `ThemesTile.tsx`
  - `KeepersTile.tsx`
  - `KeithsPeopleTile.tsx` (ghost-only for stage one)
- `src/lib/analytics/profile-reflection.ts` — narrator generation + caching logic.
- `supabase/migrations/019_profile_reflections.sql` — table + RLS.

Modified:

- `src/app/profile/page.tsx` — replace `<ProfileHero>` render for non-Keith users; keep `<KeithProfileHero>` path untouched.
- `src/lib/analytics/profile-dashboard.ts` — extended (or a new sibling module) to assemble all tile inputs in one server call, not one-per-tile.

Deleted / deprecated:

- `src/components/profile/ProfileHero.tsx` (button row) — replaced by `ProfileReflectionHero`. Remove once the new flow is in place and tested.
- `src/components/profile/ProfileReadingDashboard.tsx` — its signals (stories read, themes, principles) are absorbed into the gallery tiles. Remove once migrated.

The Keith-side components (`KeithProfileHero.tsx`, `KeithDashboard.tsx`) are untouched.

---

## 9. Data Flow

Server-side render (RSC) in `src/app/profile/page.tsx`:

1. `getAuthenticatedProfileContext()` → user + profile + isKeithSpecialAccess (unchanged).
2. If Keith-special → render `KeithProfileHero` (unchanged).
3. Otherwise → `getProfileGalleryData(userId)` returns everything the page needs in one shot:
   - `displayName`, `email`
   - `readStats` (count, firstReadAt, mostRecentReadAt)
   - `topPrinciples`, `topThemes` (reuse existing ranking helpers)
   - `featuredPassage` (most recent `sb_highlight` with story title)
   - `savedPassageCount`
   - `favorites` (top 2 + total count)
   - `dialogue` ({ recent: [{question, answer|null, askedAt, answered}], askedCount, answeredCount })
   - `reflection` ({ text, refreshedAt } | null)
   - `isAdmin`
4. Pass the bundle to `<ProfileReflectionHero>` + `<ProfileGallery>`.

Reflection generation happens **lazily on-request**: inside the server action that loads the gallery, if triggers are met and the 24h cooldown has passed, call the model, save to `sb_profile_reflections`, and return the new text. If the model errors out, fall back to the last cached row (or null if none). Never block the page render on model latency beyond a short timeout (e.g., 4s) — on timeout, show the cached reflection if present, empty state otherwise.

---

## 10. Accessibility

- All tiles: proper heading levels (h2 for page title, h3 for tile headings).
- Utility icons: `aria-label` + keyboard focusable + visible focus ring.
- Color contrast for muted text (currently `rgba(240,232,213,0.55)` on `#241710`): passes WCAG AA for large text; verify with real tokens during implementation.
- Ghost tiles must not be announced as empty data by SR — use `aria-label="Your saved passages will appear here"` etc.

---

## 11. Testing

- Unit: `getProfileGalleryData` assembles correct bundles for 3 fixture users (empty, partial, rich).
- Unit: reflection trigger logic (`shouldRegenerate(input_signature, lastGeneratedAt, now)`).
- Integration: the page renders the empty state, partial state, and rich state correctly without calling the model twice in the same request.
- Smoke: RLS policy on `sb_profile_reflections` — a user cannot read another user's row.
- Visual: storybook-style check (or Playwright screenshot) of the three states on one breakpoint.

---

## 12. Out of Scope (deferred)

- Shareable portrait / export.
- Scheduled (cron) reflection regeneration.
- User-selectable panels.
- Keith-authored reflections.
- "Keith's people you've met" tile with real data (waits for people pages).
- Email summaries triggered off the reflection.
- Animation / transitions between states.

---

## 13. Success Criteria

- A returning user lands on `/profile` and sees a reflection line that feels specific to them, not generic.
- The tiles collectively answer "what has this user been doing with Keith's stories?" at a glance.
- Utility (tour, admin, sign-out) is reachable in ≤ 1 click but never dominates the page.
- Empty-state users understand what the page is *for* and have an obvious next step.
- Keith's special-access profile is unchanged and untouched by this work.
