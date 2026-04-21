# Upload to GPT (Knowledge)

This folder is a **ready-to-upload bundle** for a custom GPT that uses the memoir’s story library and doctrine.

**Regenerate after updates:** From project root run `make upload-to-gpt` (or `python3 scripts/build_upload_to_gpt.py`).

---

## Files to upload

| File | Required | Purpose |
|------|----------|--------|
| **STORIES_ALL.md** | Yes | All story Markdown in one file (story ID + title, then full text). Use for “Tell me a story about…” and “What did he say about…?” |
| **00_LIBRARY_INDEX.md** | Yes | Map of stories (ID, title, themes). Keeps the GPT from wandering; use for “Which story is about work ethic?” |
| **draft_principles_doctrine.md** | Recommended | Recurring beliefs / principles. Use for “What were his recurring beliefs?” |
| **draft_heuristics_doctrine.md** | Optional | “When X, do Y” advice. Use for “What would he do if…?” |
| **core_principles.md** | Optional | Short “top principles” list. |

**Tip:** Upload fewer, larger files. This bundle uses one **STORIES_ALL.md** instead of 39 separate story files so retrieval behaves better.
