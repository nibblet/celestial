# Derived Artifacts Roadmap for Better ASK Answers

## Purpose

Define the next layer of wiki/corpus artifacts that help ASK answer deeper questions about meaning, causality, character change, symbolism, and spoiler-safe interpretation.

The current corpus already has strong noun-level and canon-level coverage:

- Chapters and scenes
- Mission logs
- Characters
- Artifacts
- Vaults
- Locations
- Factions
- World rules
- Foundational lore metadata
- Canon inventories and continuity checks

This roadmap focuses on the interpretive layer above those records: the structures that explain why events matter, how ideas evolve, and how the reader should understand a moment without requiring the model to infer everything from raw pages.

## Guiding principles

1. **Wiki remains source of truth.**
   New artifacts should begin as markdown or DB-backed derived records that can be regenerated, reviewed, and cited.

2. **Derived does not mean speculative.**
   Every interpretive claim should point back to chapter text, mission logs, or canon wiki pages.

3. **ASK should know what kind of question it is answering.**
   A "who is X?" answer needs entity context. A "why did X happen?" answer needs causal and scene context. A "what does X mean?" answer needs themes, principles, motifs, and arcs.

4. **Spoiler safety is a first-class requirement.**
   Any artifact that spans multiple chapters needs progress-aware reveal boundaries.

5. **Start narrow, then scale.**
   Pilot each artifact type on Book I / CH01-CH17 before automating broader generation.

## Priority roadmap

### Phase 1: Theme Dossiers

**Goal:** Create first-class theme pages that describe recurring meaning across chapters, not just chapter tags.

**Proposed location:** `content/wiki/themes/*.md`

**Suggested schema:**

- Title
- Thesis
- Opposing force
- Key chapters
- Key scenes
- Characters carrying the theme
- Related rules
- Related motifs
- How the theme evolves
- ASK guidance

**ASK value:**

- Better answers to "What themes is the book setting up?"
- Better synthesis across chapters.
- Less generic moralizing because themes become canon-grounded records.

**Candidate themes:**

- Alignment over authority
- Memory as responsibility
- Consent before inheritance
- Consciousness through relationship
- Power versus presence
- Unity without uniformity
- Invitation rather than command
- The burden of legacy

**Initial tasks:**

- [ ] Choose 6-10 canonical Book I themes.
- [ ] Create `content/wiki/themes/`.
- [ ] Draft one complete theme dossier as the template.
- [ ] Wire theme docs into static generation if needed.
- [ ] Add ASK prompt context for theme dossiers when relevant.

### Phase 2: Character Arc Ledgers

**Goal:** Track how major characters change across scenes and chapters.

**Decision:** Use separate files at `content/wiki/arcs/characters/*.md`.

Separate arc files keep identity dossiers concise, allow a stricter review
workflow, and give ASK a clean retrieval target for character-change questions.
Character pages may later link to their ledger, but the ledger owns arc
authoring and review.

**Suggested schema:**

- Character
- Starting state
- Core wound / limitation
- Desire
- Pressure points
- Chapter-by-chapter arc entries
- Major choices
- Consequences
- Current state at each chapter boundary
- Unresolved tension
- Spoiler boundary notes
- Evidence citations
- ASK guidance
- Interpretive claims
- Future questions
- Speculation guardrails

**Arc entry shape:**

`chapter -> scene -> pressure/test -> choice/reaction -> consequence -> state after`

**ASK value:**

- Better answers to "How is Galen changing?"
- Better explanations of character behavior.
- Better distinction between event summary and emotional development.
- Safer answers to future-facing questions because unresolved tensions are
  labeled as unknowns, not treated as canon outcomes.

**ASK retrieval guidance:**

- Questions about how a character changes, why a character behaves differently,
  or what a character's current state means should prefer the character arc
  ledger over generic entity summaries.
- Arc ledgers are `derived_inference` records. Chapter text and reviewed wiki
  canon outrank them when sources conflict.
- Use only chapter entries at or before the reader's progress horizon unless
  reread mode is active.
- Speculative answers may draw on `Future Questions` and `Speculation
  Guardrails`, but must say what remains unknown and must not promote a
  bounded hypothesis into canon.

**Pilot characters:**

- Galen Voss
- ALARA
- Thane Meric
- Aven Voss
- Jonah Revas
- CAEDEN / SOVRIN if treated as agency-bearing systems

**Initial tasks:**

- [x] Decide embedded versus separate arc files.
- [x] Lock the v1 schema, including interpretation/speculation split.
- [x] Draft one arc ledger for Galen.
- [x] Draft one arc ledger for ALARA.
- [x] Add reviewer questions for evidence, continuity, ambiguity, and spoiler
      safety.
- [x] Add retrieval rules for character-change questions.

### Phase 3: Open Thread and Mystery Ledger

**Goal:** Track narrative questions the text itself raises, distinct from reader questions.

**Existing hook:** `sb_open_threads`

**Suggested schema additions / authoring fields:**

- Thread title
- Question
- Kind: mystery, setup, contradiction, gap, foreshadowing
- Opened in chapter / scene
- Evidence
- Current status
- Possible interpretations
- Spoiler level
- Resolved in chapter / scene
- Resolution note

**ASK value:**

- Better answers to "What mysteries are still unresolved?"
- Better recognition of foreshadowing.
- Better "we do not know yet" answers.

**Initial tasks:**

- [ ] Populate Book I open threads from CH01-CH17.
- [ ] Mark each as resolved/unresolved.
- [ ] Add progress-gated open-thread context to ASK.
- [ ] Create admin review workflow if needed.

### Phase 4: Relationship Dynamics Ledger

**Goal:** Track pairwise and group dynamics that cannot be fully captured on a single character page.

**Proposed location:** `content/wiki/relationships/*.md`

**Suggested schema:**

- Relationship pair or group
- Starting dynamic
- Trust / tension state by chapter
- Power imbalance
- Shared wound or shared task
- Key turning points
- Current unresolved tension
- Related themes
- Related scenes
- ASK guidance

**High-value relationships:**

- Galen and ALARA
- Thane and ALARA
- Galen and Aven
- Crew and Earth
- Humanity and the Coherence
- ALARA and CAEDEN / SOVRIN
- Valkyrie crew and the Vault Builders / Ancients

**ASK value:**

- Better answers to "Why does this relationship matter?"
- Better emotional continuity.
- Better distinction between trust, control, loyalty, and alignment.

**Initial tasks:**

- [ ] Create relationship file template.
- [ ] Draft Galen / ALARA.
- [ ] Draft Thane / ALARA.
- [ ] Add relationship-aware context for pairwise ASK queries.

### Phase 5: Scene Beat Annotations

**Goal:** Add structured dramatic annotations to parsed scenes.

**Existing hook:** `sb_chapter_scenes`

**Suggested fields:**

- POV / focal character
- Dramatic question
- Conflict
- Revelation
- Decision
- Emotional turn
- Canon changes
- Related entities
- Related rules
- Related themes
- Spoiler boundary

**ASK value:**

- Better answers about specific chapter moments.
- Better evidence selection.
- Stronger "why this scene matters" responses.

**Initial tasks:**

- [ ] Annotate scenes for CH01-CH03 manually.
- [ ] Review whether fields belong in DB, markdown, or both.
- [ ] Add scene beat chips to chapter pages only if useful.
- [ ] Teach ASK to prefer scene annotations for moment-specific questions.

### Phase 6: Symbol and Motif Index

**Goal:** Track recurring symbolic language and images across the book.

**Proposed location:** `content/wiki/motifs/*.md`

**Suggested schema:**

- Motif
- Literal appearances
- Symbolic function
- First appearance
- Evolution across chapters
- Related parables
- Related themes
- Related rules
- Key quoted passages or citations
- ASK guidance

**Candidate motifs:**

- Glyphs
- Mirrors
- Threads
- Vessels
- Choirs
- Resonance tones
- Silence
- Light
- Gates
- Inheritance
- Dust

**ASK value:**

- Better answers to "What does the mirror/thread/choir mean?"
- Better parable interpretation.
- Better thematic synthesis without inventing symbolism.

**Initial tasks:**

- [ ] Create motif template.
- [ ] Draft `mirrors`, `threads`, and `choirs`.
- [ ] Connect parable rule pages to motif pages.

### Phase 7: Causal Timeline / Consequence Map

**Goal:** Track why events happen and what each event makes possible later.

**Proposed location:** `content/wiki/causality/*.md` or a structured derived table.

**Suggested schema:**

- Cause event
- Immediate effect
- Delayed consequence
- Affected entities
- Later payoff
- Evidence
- Confidence
- Spoiler boundary

**ASK value:**

- Better answers to "Why did this happen?"
- Better continuity across chapters.
- Better ability to explain setup and payoff.

**Initial tasks:**

- [ ] Draft causal chain for Valkyrie discovery / activation.
- [ ] Draft causal chain for ALARA awakening.
- [ ] Draft causal chain for Earth-side containment escalation.

### Phase 8: Spoiler-Safe Progress Summaries

**Goal:** Define what the reader knows at each chapter boundary.

**Proposed location:** `content/wiki/progress/CH##_known-state.md`

**Suggested schema:**

- Reader has seen
- Reader can infer
- Still unknown
- Unsafe future facts
- Active entities
- Active themes
- Active open threads
- Safe ASK summary

**ASK value:**

- Stronger progress-gated answers.
- Cleaner "as of CH##" responses.
- Lower risk of accidental future reveals.

**Initial tasks:**

- [ ] Draft CH01, CH05, CH10, CH17 boundary summaries.
- [ ] Decide whether every chapter needs a file.
- [ ] Add progress summaries to ASK context when reader progress is known.

### Phase 9: ASK Answer Playbooks

**Goal:** Map question types to the best context sources.

**Proposed location:** `docs/celestial/ask-answer-playbooks.md` first; later code in router/retrieval.

**Question type matrix:**

| User asks... | Prefer context from... |
|---|---|
| Who/what is X? | Entity page, appearances, related entities |
| Why did X happen? | Scene beat, causal map, relevant rule |
| What does X mean? | Theme dossier, principle, motif, parable |
| How is X changing? | Character arc ledger first, then relationship ledger, then chapter text |
| Is this a contradiction? | Canon rank, continuity diff, source provenance |
| What should I remember? | Progress summary, open threads, chapter recap |
| What mysteries remain? | Open thread ledger, progress summary |

**ASK value:**

- More consistent answers.
- Better routing between narrator, archivist, lorekeeper, finder, and synthesizer.
- Less prompt bloat because retrieval can be targeted by question type.

**Initial tasks:**

- [x] Draft playbook table.
- [ ] Add classifier labels for question types.
- [ ] Make evidence panel show which artifact types were used.

## Proposed implementation order

1. Theme dossiers
2. Character arc ledgers
3. Open thread population
4. Relationship dynamics
5. Scene beat annotations
6. Motif index
7. Causal timeline
8. Spoiler-safe progress summaries
9. ASK answer playbooks

## Open decisions

- Should arc ledgers eventually be rendered on character pages, or stay as
  backend-only derived records?
- Should relationship dynamics be markdown-first or DB-first?
- Should motifs be classified as rules, themes, or their own concept type?
- Should theme dossiers use the existing `WIKI_THEME_CONCEPT` loader or a richer parser?
- What is the minimum citation standard for derived interpretive claims?
- How much of this should be generated by scripts versus hand-authored?

## Companion App Product Features

The artifacts above feed the ASK backend. This section captures the reader-facing
features that turn those artifacts into a companion-app experience. Decisions
reflect a deliberate moat: **authored canon + spoiler-aware progression +
verifier-grounded answers**. We compete on authorial curation, not on generic
RAG plumbing.

### Confirmed features

#### CA-1. Reading-position sync → auto spoiler horizon

Today we track what has been read at chapter granularity. Extend this to a live
reading position so the wiki, graphs, and ASK answers automatically reshape to
the reader's current point — no manual "I'm on chapter 7" toggle.

- Enhances every artifact that has a spoiler boundary (Phases 1-8).
- Replaces explicit horizon selection in the UI with implicit, accurate state.
- Core dependency for CA-2, CA-3, CA-5.

#### CA-2. "What changed" per chapter

After a chapter is marked read, show a diff of the wiki: new entities, updated
facts, newly askable questions, newly visible open threads.

- Leans on Phase 3 (open threads), Phase 8 (progress summaries), entity tags.
- Turns the companion into a post-chapter ritual, not just a lookup tool.

#### CA-3. Time-sliced relationship graph

Visualize character / faction / alliance structure at the reader's current
horizon. Major design opportunity for distinctive visuals.

- Primary data source: Phase 4 (Relationship Dynamics Ledger).
- Secondary: character arcs (Phase 2), factions.
- Must respect CA-1 horizon strictly — no future edges bleeding through.

#### CA-4. Citation previews in ASK answers

Every ASK answer already has verifier evidence. Surface the exact cited passage
as an expand / hover, restricted to chapters the reader has completed.

- Cheap to ship; compounds trust.
- Depends on the verifier's existing evidence trail.

#### CA-5. Reread mode

Already supported in primitive form: per-chapter read state plus a whole-book
read/reset. Productize this as an explicit mode that:

- Flips horizon to end-of-book.
- Unlocks foreshadowing annotations, author notes, "what you missed" per entity.
- Pairs naturally with Phase 5 (scene beat annotations) and Phase 7 (causal map).

#### CA-6. Theories and predictions

Readers log predictions at chapter N, locked until a later beat resolves them.
Scoreboard across readers once cohort effects are worth it.

- Depends on Phase 3 (open threads) to know what is resolvable.
- Strong fandom-energy loop; hard to replicate without authored beat data.

#### CA-9. In-world audio artifacts

The companion app already has audio infrastructure. Port it into the reader
experience as short (30-90s) authored pieces: vault logs, intercepted
transmissions, character voice memos. Sci-fi leans into this format naturally.

#### CA-12. Canon drops as the release cadence

Post-launch, publish short stories, vault entries, side-character POVs, and
expanded wiki pages directly into the app. This is the **delivery mechanism for
the deepening wiki** — not a separate initiative. See CA-Q below for the input
pipeline that feeds it.

### CA-Q. The Q&A → Wiki Loop (central feature)

Every ASK question and verified answer is logged and used to deepen canon over
time. This is the compounding moat: readers reveal which parts of the world are
under-documented, and the author decides what to canonize.

**Design rules:**

1. **Curated, not auto.** Auto-publishing AI answers into canon will eventually
   enshrine a hallucination. AI answers enter a draft queue; only a human editor
   promotes to canon.
2. **Track the question, not just the answer.** Question clustering by entity
   and beat window is the editorial signal. "12 readers asked about Jonah's
   pre-Vault years in chapters 3-5" is a backlog item.
3. **Close the loop visibly.** When a reader's prior question leads to a later
   canon drop (CA-12), surface it to them: "You asked about X in chapter 4 — new
   entry added." This is both retention and participation.

**Pipeline sketch:**

```
ASK question + verified answer
  → logged with entity tags, beat position, reader progress
  → clustered into editorial queue (grouped by entity × beat window)
  → editor reviews, rejects, edits, or promotes
  → promoted drafts become canon updates
  → canon updates ship as CA-12 canon drops
  → readers whose questions seeded the update get notified
```

**Initial tasks:**

- [ ] Log ASK question + verified answer + entity tags + beat position.
- [ ] Define the draft / queued / promoted / rejected states.
- [ ] Build the editorial review surface (internal, not user-facing).
- [ ] Define which artifact types (Phases 1-8) each queue entry can populate.
- [ ] Wire reader notification when a seeded question produces a canon drop.

### Deferred or declined

- **Author tooling / CMS as a platform (CA-10).** Productizing our authoring
  pipeline for other authors is a different company shape. Revisit after Book I
  ships cleanly; decide then whether to be a publisher or a platform.
- **AI-generated side stories / character roleplay chat.** Dilutes canon,
  invites hallucination, and puts us in the Character.ai bucket where we cannot
  win on defensibility. The Q&A loop (CA-Q) captures the upside without the
  risk.
- **Generic full-text search with AI summarization.** Kindle and Apple Books
  will ship this. We do not compete on plumbing.
- **Branching / choose-your-own paths.** Different product, different reader.

### Sequencing

Ship in this order to compound fastest:

1. **CA-1** (position sync) and **CA-4** (citation previews) — foundation.
2. **CA-Q** logging (log questions even before the editorial surface exists) —
   start building the corpus of reader signal immediately.
3. **CA-2** (what changed) and **CA-5** (reread mode productized).
4. **CA-3** (relationship graph) — needs Phase 4 artifacts.
5. **CA-6** (predictions) — needs Phase 3 populated.
6. **CA-Q editorial surface** + **CA-12** (canon drops) — the publishing loop.
7. **CA-9** (audio port) — whenever convenient; independent of the above.

## Success criteria

ASK improves measurably when answering:

- "What is this chapter really about?"
- "How is this character changing?"
- "What does this symbol mean?"
- "Why did this scene matter?"
- "What mysteries are unresolved?"
- "What can I safely know at this point in the story?"

The answer should cite canon sources, respect reader progress, distinguish fact from interpretation, and avoid inventing connective meaning when the corpus has not earned it.
