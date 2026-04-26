# Character Arc Ledger Template
**Slug:** character-slug
**Character:** Character Name
**Scope:** Book I, CH01-CH17
**Canon rank:** derived_inference
**Review status:** draft

> Arc ledgers summarize character change from chapter evidence. They do not
> outrank chapter text or reviewed wiki canon.

## Starting State

- **Book position:** Where the character begins in the story.
- **Role pressure:** What role, duty, identity, or expectation shapes them.
- **Evidence:** `content/wiki/stories/CH##-slug.md`; `content/wiki/mission-logs/index.md`.

## Core Wound / Limitation

- The inner limitation, false posture, unresolved grief, ethical blind spot, or
  structural constraint that the book tests.
- Evidence required for every material claim.

## Desire

- What the character wants on the surface.
- What the character needs underneath that want.

## Pressure Points

| Pressure | Why It Tests The Character | Evidence |
|---|---|---|
| Pressure name | Brief explanation | `path` |

## Chapter Arc Entries

Use one row per meaningful chapter beat. If the character is absent or only
present through logs/dossiers, say so explicitly.

| Chapter | Scene / Anchor | Pressure / Test | Choice / Reaction | Consequence | State After | Evidence |
|---|---|---|---|---|---|---|
| CH## | Scene or log anchor | What tests them | What they do | What changes | Boundary state | `path` |

## Major Choices And Consequences

- **CH## choice:** What the character chooses.
  - **Consequence:** What that choice makes possible or closes off.
  - **Evidence:** `path`.

## Current State By Chapter Boundary

| Boundary | Reader-Safe State |
|---|---|
| After CH## | What can safely be said at this point. |

## Unresolved Tensions

- Tensions the book leaves open as of the scope boundary.

## Spoiler Boundary Notes

- Facts or interpretations that must not appear before a reader reaches the
  relevant chapter.

## Interpretive Claims

Interpretive claims are allowed only when they are grounded in evidence and
phrased as readings, not as hidden canon.

| Claim | Evidence | Confidence |
|---|---|---|
| A supported reading of the arc | `path` | High / Medium / Low |

## Future Questions

- Questions the text raises but does not answer inside the scope boundary.

## Speculation Guardrails

- Do not answer future questions as canon.
- Do not use generated dossier summaries as scene proof when chapter text or
  mission logs are available.
- Distinguish `chapter_text`, `wiki_canon`, and `derived_inference` whenever
  evidence conflicts.

## ASK Guidance

- **Best for:** character-change, motivation, emotional continuity, current-state
  questions.
- **Must cite:** chapter text or mission logs for any major arc claim.
- **Safe unknowns:** Use `Future Questions` when the user asks beyond known canon.
- **Response style:** Explain event summary first only when needed, then name the
  emotional or ethical state change.

## Review Checklist

- [ ] Every major claim has chapter, mission-log, or reviewed wiki evidence.
- [ ] Chronology-sensitive claims account for known mission-log caveats.
- [ ] Event summary and emotional development are separated.
- [ ] Ambiguity is labeled rather than resolved by invention.
- [ ] Spoiler boundaries are explicit enough for progress-gated ASK answers.
- [ ] Future questions and speculation guardrails do not introduce new canon.
