# Canon Integrity Program

**Single umbrella plan** for (1) **Ask**: citeable answers, verifier, modes, canon proposals and (2) **Wiki & continuity**: structured lore, ingestion confidence, drift detection, and editorial hygiene. Both tracks share frozen interfaces so they can run in parallel without drifting.

**Supersedes separate planning mentally:** Treat older detail specs as inputs—especially the Cursor plan *Ask Canon Evidence Roadmap* (same-repo goals: evidence contract → verifier → modes → rules alignment → proposals → drift/regression)—while **this document** owns sequencing and wiki-side deliverables.

---

## 1. Program outcomes

| Outcome | Ask track | Wiki / continuity track |
|--------|-----------|-------------------------|
| Readers trust what Ask says | Visible **Sources**, structured evidence persisted, precedence enforced (`chapter text > wiki canon > derived`) | Lore is **consistent, linkable, and minimally complete**—fewer orphans and silent stubs |
| Builders scale canon safely | Deep-by-default orchestration, optional Fast, admin-governed **proposals** | **Authoring conventions**, ingestion review, continuity/drift **reports** feeding cleanup |
| Quality does not regress | Verifier + **regression harness** for canonical Q&A | Same fixtures + **continuity-diff** / review scripts gate risky edits |

---

## 2. Shared interfaces (freeze early)

These contracts are owned by **both** tracks; changes here should be explicit.

### 2.1 Corpus precedence

Single source of truth for ordering and conflict resolution lives in **`src/lib/wiki/corpus.ts`**. Prompt assembly, verifier, and any future tooling must consume the same precedence: **chapter > wiki > derived**.

Derived character arc ledgers under `content/wiki/arcs/characters/` are
`derived_inference` records. They may guide synthesis, reviewer questions, and
bounded speculation, but they must cite chapter or mission-log evidence and must
yield to chapter text or reviewed wiki canon when sources conflict.

### 2.2 Evidence vocabulary

A “source” attached to an assistant message must map to identifiable corpus rows: e.g. story/chapter id, wiki slug/path, rule doc slug. Slugs stay **stable**; renaming requires a deliberate migration step.

### 2.3 Lore vs plot visibility

**World rules / lore**: generally always eligible for context (aligned with **`content/wiki/rules`** and persona policy). **Plot spoilers**: gated by reader chapter progress. Verifier and corpus loaders must implement the **same** split (see prompts/personas plus verifier checks).

### 2.4 Wiki authoring conventions (v1)

Authors maintain explicit relationships in markdown so summaries and Ask citations can connect entities without a separate graph DB:

- **Artifacts**: section for **part-of / component-of** (e.g. ship systems ↔ vessel).
- **Vaults**: either top-level wiki pages with stable slugs or clearly linked subsections—pick one convention per vault “tier” and document it here when decided.
- **Locations**: **superset** (planet, vessel, megastructure) vs **subset** (deck, bay); cross-link both directions where it matters for Ask.
- **Factions**: every non-draft page should cite **at least one** in-world anchor (story beat, another wiki pillar, or source doc)—otherwise treat as **stub** until filled or merged.

*Convention doc can start as a short subsection below or a linked file under `docs/` once finalized.*

---

## 3. Staged roadmap (aligned)

Stages are **ordered**. Work inside a stage may parallelize; **do not** enable strict verifier failure modes until Stage 2 wiki gates are met (see §4).

### Stage 0 — Interfaces and inventory (parallel start)

**Goal:** Same vocabulary in code and in editorial practice.

| Deliverable | Owner |
|-------------|--------|
| Precedence + lore/plot rules documented (this §2) | Both |
| Wiki authoring conventions v1 agreed (§2.4) | Editorial + eng |
| Stub / orphan inventory: factions, artifacts, locations with missing refs or inbound links | Wiki (use / extend **`scripts/review-ingestion.ts`**, brain_lab outputs, or a thin report script) |
| Evidence payload shape agreed for Stage 1 | Ask (orchestrator + API) |

**Exit:** Convention published; inventory exists; no blocker for Stage 1 Ask implementation.

---

### Stage 1 — Transparency: sources in Ask + corpus slug hygiene

**Goal:** Every answer can carry **structured sources** and show them in the UI; wiki side avoids citation targets that move randomly.

**Ask (former roadmap Phase 1)**

- Evidence metadata contract: **`src/lib/ai/orchestrator.ts`**, **`src/app/api/ask/route.ts`** (SSE/metadata envelope).
- Persistence: migration under **`supabase/migrations`**, messages store evidence.
- UI: collapsible **Sources** panel on **`src/app/ask/page.tsx`**.

**Wiki / continuity**

- Freeze **slug policy** for high-traffic entities (artifacts, vaults, key locations); batch-rename before verifier strictness.
- Optionally add cross-links for top relationship gaps discovered in Stage 0 (quick wins only—full remediation is Stage 2).

**Exit:** Sources panel live with persisted evidence; slug policy documented; inventory triaged (P0/P1/P2).

---

### Stage 2 — Enforcement: verifier + editorial minimum bar

**Goal:** Claims are validated before readers see them; wiki clears **minimum** quality so the verifier is not permanently red.

**Ask (former roadmap Phase 2)**

- Verifier module under **`src/lib/ai/`**: citations present where required, sources exist in corpus, spoiler policy, precedence conflicts.
- Integration in **`src/app/api/ask/route.ts`** with repair / fallback path.
- Roll out **warn-only → soft-repair → hard-fail** via flags (see original rollout).

**Implemented (engineering):**

- **`src/lib/ai/ask-verifier.ts`** — validates `/stories/*` and wiki noun paths against `content/wiki/**`, spoiler links via `readerProgress`, light “missing citations” heuristic for factual prompts. **`ASK_VERIFIER_STRICTNESS`**: `off` \| **`warn`** (default) \| `fail` (`fail` replaces assistant text when error-level issues fire).
- **`src/lib/wiki/corpus.ts`** — **`CANON_SOURCE_RANK`**, **`compareCanonAuthority`** for chapter_text > wiki_canon > derived_inference.
- Evidence persists **`verification`** (+ optional **`responseSuperseded`**); SSE **`replacementContent`** when blocked; Sources panel lists issues.

**Wiki / continuity**

- Remediate **P0** stubs (factions with zero references, broken promises in nav).
- Apply §2.4 consistently for **pilot entities** (e.g. vessel ↔ subsystem, vault ↔ ship).
- Optional: expand **`src/lib/wiki/continuity-diff.ts`** usage or reporting for CI-friendly output lists.

**Exit:** Verifier on in production at agreed strictness; P0 wiki list cleared or explicitly downgraded with reasons.

---

### Stage 3 — Depth and policy: modes + rules corpus

**Goal:** Deep-by-default behavior with reader override; rules/lore visibility matches verifier.

**Ask (former roadmap Phases 3–4)**

- Deep / Fast selector + request contract; default deep when ops allow.
- Prompts / personas: **`src/lib/ai/prompts.ts`**, **`src/lib/ai/perspectives.ts`** aligned with **`content/wiki/rules`** always-on vs gated plot context.

**Wiki / continuity**

- Ensure rules pages are complete enough for “always visible” claims.
- Browse UI improvements (artifacts subsets, location clustering) **may** ship here if scoped; they are **not** prerequisites for verifier logic if wiki links encode relationships.

**Exit:** Mode selector shipped; rules alignment verified by spot-check + verifier samples.

**Implemented (engineering):**

- **`askMode`** on POST **`/api/ask`**: `deep` (default) \| `fast`. Fast forces a single Finder pass; Deep uses normal **`routeAsk`** classification, then **`ENABLE_DEEP_ASK`** kill-switch as before.
- Evidence carries **`askModeRequested`**, **`askModeApplied`**, **`askModeNote`** (unwrap mismatch reasons).
- **`src/app/ask/page.tsx`**: Deep / Fast toggle + **`localStorage`** (`celestial_ask_mode`).
- **`getRulesContext()`** in **`src/lib/ai/prompts.ts`** loads **`content/wiki/rules/*.md`** (capped ~18k chars); **`sharedContentBlock`** injects **World rules** for every Ask persona.

---

### Stage 4 — Governance: canon proposals + editorial loop

**Goal:** Great Ask turns become **reviewable** canon updates, not silent wiki mutation.

**Ask (former roadmap Phase 5)**

- DB + API + minimal admin UI for proposals; approval writes target wiki or mirror then refresh static/compile pipeline.

**Wiki / continuity**

- Proposal templates match wiki sections (relationships, refs).
- Drift / duplicate detection policies for proposal queue (tie to original roadmap mitigations).

**Exit:** At least one end-to-end proposal approved into canon.

---

### Stage 5 — Quality at scale: drift + joint regression

**Goal:** Canon stays consistent as volume grows; Ask and wiki regress together.

**Ask (former roadmap Phase 6)**

- Scheduled or CI **`continuity-diff`**-driven reports; Ask regression tests in **`src/lib/ai/*.test.ts`** (and related).

**Wiki / continuity**

- **Joint fixture set**: fixed questions + expected source types (subset ↔ superset, vault ↔ vessel, faction with refs).
- Ingestion completeness: periodic run of review / ingestion checks; changelog expectations for large imports.

**Exit:** Regression suite runs in CI; drift reports actionable; joint fixtures owned and updated when canon changes.

---

## 4. Gate rule (avoid thrash)

Do **not** flip verifier to **hard-fail** for missing citations until:

1. Stage 1 **Sources** + persistence ship, and  
2. Stage 2 **P0** wiki remediation (or explicit waiver list) is done.

Until then: **warn-only** or **soft-repair** so editors are not blocked by incomplete legacy pages.

---

## 5. Testing and verification (shared)

- **Unit:** Verifier, orchestrator metadata, corpus precedence helpers.
- **Integration:** Ask SSE + persisted evidence; optional API tests.
- **Joint regression:** Curated canon questions with expected evidence types and slug paths.
- **Continuity:** Scripts producing human-readable reports (`continuity-diff`, `review-ingestion`, future reports/).

---

## 6. Risks (combined)

| Risk | Mitigation |
|------|------------|
| Verifier noise from thin wiki pages | Stage 2 editorial minimum + waivers; phased strictness |
| Parallel docs diverging | **This file** is the staging source of truth; update when phases slip |
| Proposal queue overload | Ranking, dedupe, tie to Stage 5 drift signals |
| Cost / latency (deep + verification) | Mode selector; lightweight verifier pass; ops monitoring |

---

## 7. References (repo)

| Area | Path |
|------|------|
| Ask API | `src/app/api/ask/route.ts` |
| Orchestrator / routing | `src/lib/ai/orchestrator.ts`, `src/lib/ai/router.ts` |
| Prompts / personas | `src/lib/ai/prompts.ts`, `src/lib/ai/perspectives.ts` |
| Corpus | `src/lib/wiki/corpus.ts` |
| Continuity | `src/lib/wiki/continuity-diff.ts` |
| Ingestion review | `scripts/review-ingestion.ts` |
| Rules corpus | `content/wiki/rules/` |
| Character arc ledgers | `content/wiki/arcs/characters/`, `docs/continuity/character-arc-review.md` |
| External plan snapshot | Cursor: `ask-canon-evidence-roadmap` (same phases as Ask column above) |

---

## 8. Document control

- **Owner:** Team lead for canon (product + eng).
- **Update when:** Any change to precedence, evidence schema, verifier strictness gates, or wiki convention v1.
- **Review cadence:** End of each stage in §3.
