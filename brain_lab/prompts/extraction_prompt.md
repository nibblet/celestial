You are analyzing a leadership story for cognitive pattern extraction.

Return STRICT JSON with this schema:

```json
{
  "story_id": "",
  "story_title": "",
  "story_summary": "",
  "context": {
    "role": "",
    "industry": "",
    "time_period": "",
    "stakes": ""
  },
  "core_conflict": "",
  "decision_moments": [
    {
      "trigger": "",
      "constraints": [],
      "options": [],
      "choice": "",
      "reasoning": "",
      "risk_accepted": "",
      "outcome": ""
    }
  ],
  "principles": [
    { "principle": "", "evidence": "" }
  ],
  "decision_heuristics": [
    { "heuristic": "", "evidence": "" }
  ],
  "leadership_patterns": {
    "risk_tolerance": "",
    "communication_style": "",
    "accountability_posture": "",
    "ethical_framing": ""
  },
  "quotes": [
    { "quote": "", "max_25_words": true }
  ]
}
```

**Rules:**

- Do NOT invent facts.
- If unknown, use `""` or `[]`.
- **decision_moments:** If there are no clear decision points in the story, use an empty array `[]`. Do not include an object with all empty fields.
- **decision_heuristics:** Each heuristic must be actionable (e.g. "When uncertain about direction, seek expert advice and testing"). Avoid purely thematic labels (e.g. "Nostalgia for childhood").
- **Evidence:** Must be a short verbatim excerpt from the story that directly supports the stated principle or heuristic.
- **Quotes:** max 5, each under 25 words, verbatim from the provided text only.
- **story_id:** Use the exact story ID provided with the story (e.g. P1_S01).
- **story_summary:** One or two sentences summarizing the story; can be empty if not applicable.
