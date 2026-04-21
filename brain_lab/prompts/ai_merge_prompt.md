You are grouping statements that express the **same idea** so we can count how many distinct stories support each idea.

Below is a numbered list of statements (leadership principles OR decision heuristics). Some express the same idea in different words; others are distinct.

**Task:** Group the statements by meaning. Put the **index numbers** (0, 1, 2, ...) of statements that express the same idea into the same group. Each statement must appear in exactly one group. A group can have one or more statements.

**Output:** Return ONLY valid JSON in this exact shape:
```json
{"groups": [[0, 3, 7], [1, 5], [2], [4, 6, 8]]}
```
- `groups` is an array of arrays.
- Each inner array is a list of statement indices that express the same idea.
- Use the exact index numbers from the input list (0-based).
- If every statement is distinct, return one index per group: `{"groups": [[0], [1], [2], ...]}`.

**Statements (index then text):**
