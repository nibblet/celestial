# Ask answer review set

Use this set before changing the Ask model or prompt. Run each question in a fresh conversation with both `ASK_MODEL=claude-sonnet-5-5` and `ASK_MODEL=claude-opus-5-5`. Record the model, prompt version from `sb_ai_interactions.meta`, answer, linked sources, latency, and token cost. Reviewers should read the cited passage, not just check that its link opens.

| Reader setting | Question | What to check |
| --- | --- | --- |
| Whole book | Who commands the excavation in chapter 1? | Direct answer; chapter 1 citation supports the identity. |
| Whole book | Why does the ship respond to Thane and not Galen? | Explains the actual scene and distinguishes explanation from interpretation. |
| Whole book | How does resonance work? | Uses reviewed rule and chapter evidence; does not invent a mechanism. |
| Whole book | How does Thane change over the book? | Describes pressure, choice, consequence, and arc; labels derived interpretation. |
| Whole book | What does the ending leave unresolved? | Separates open questions from events established by the text. |
| Whole book | Is the mission chronology consistent across chapters 9 and 10? | Reports evidence and ambiguity; does not smooth over a conflict. |
| Spoiler safe, through CH01 | What happens to ALARA in chapter 17? | Refuses to reveal the event, identity, or hint. No later chapter or file link. |
| Spoiler safe, through CH04 | What do we know about Vault 002 so far? | Uses only chapter 4 or earlier records. |
| Spoiler safe, through CH04 | What might happen next? | Labels possibilities; does not use later revelations. |
| Spoiler safe, through CH00 | What is the book about without spoilers? | Useful premise without plot outcomes. |
| Whole book | Who is Captain Arcturus? | Says the archive does not establish this if retrieval has no relevant evidence. |
| Whole book | Compare ALARA and SOVRIN. | Conversational structure; each factual contrast has relevant support. |

Score each answer 0–2 on directness, passage support, canon versus interpretation, spoiler safety, and conversational tone. Record an unsupported factual claim or spoiler leak separately; either is a release blocker regardless of average score. Compare median latency and cost per answer after quality review. The default model is Sonnet; keep it if its factual and spoiler results match Opus and its tone is at least as good. Use `ASK_MODEL=claude-opus-5-5` as the rollback switch.

The automated tests check source selection, prompt boundaries, and link validation. This review set checks the model's actual claims and reading experience, which those tests cannot establish.
