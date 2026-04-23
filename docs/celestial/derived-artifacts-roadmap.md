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

**Proposed location:** either embedded sections in `content/wiki/characters/*.md` or separate `content/wiki/arcs/characters/*.md`.

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

**Arc entry shape:**

`chapter -> scene -> pressure/test -> choice/reaction -> consequence -> state after`

**ASK value:**

- Better answers to "How is Galen changing?"
- Better explanations of character behavior.
- Better distinction between event summary and emotional development.

**Pilot characters:**

- Galen Voss
- ALARA
- Thane Meric
- Aven Voss
- Jonah Revas
- CAEDEN / SOVRIN if treated as agency-bearing systems

**Initial tasks:**

- [ ] Decide embedded versus separate arc files.
- [ ] Draft one arc ledger for Galen.
- [ ] Draft one arc ledger for ALARA.
- [ ] Add retrieval rules for character-change questions.

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
| How is X changing? | Character arc ledger, relationship ledger |
| Is this a contradiction? | Canon rank, continuity diff, source provenance |
| What should I remember? | Progress summary, open threads, chapter recap |
| What mysteries remain? | Open thread ledger, progress summary |

**ASK value:**

- More consistent answers.
- Better routing between narrator, archivist, lorekeeper, finder, and synthesizer.
- Less prompt bloat because retrieval can be targeted by question type.

**Initial tasks:**

- [ ] Draft playbook table.
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

- Should arcs live inside character pages or as separate files?
- Should relationship dynamics be markdown-first or DB-first?
- Should motifs be classified as rules, themes, or their own concept type?
- Should theme dossiers use the existing `WIKI_THEME_CONCEPT` loader or a richer parser?
- What is the minimum citation standard for derived interpretive claims?
- How much of this should be generated by scripts versus hand-authored?

## Success criteria

ASK improves measurably when answering:

- "What is this chapter really about?"
- "How is this character changing?"
- "What does this symbol mean?"
- "Why did this scene matter?"
- "What mysteries are unresolved?"
- "What can I safely know at this point in the story?"

The answer should cite canon sources, respect reader progress, distinguish fact from interpretation, and avoid inventing connective meaning when the corpus has not earned it.
