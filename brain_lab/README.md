# Cobb Brain Lab

Memoir → stories → decision DNA → principles cluster. Turn a leadership memoir into an auditable pipeline: TOC-based split, text cleanup, structured extraction, validation, library index, quote index, and principle clustering.

## Pipeline

1. **Split (01)** — TOC-based split → manifest + clean TXT + library-ready MD.
2. **Extract (human-in-loop)** — Run extraction (e.g. `run_extraction.py` or manual) → `out/extracted/<story_id>.json`.
3. **Validate coverage (02)** — Schema validation + coverage report (`out/extracted/coverage_report.md`).
4. **Build library index (04)** — `out/library/00_LIBRARY_INDEX.md` and `00_LIBRARY_INDEX.json`. When cluster outputs exist, each story entry is enriched with principle and heuristic cluster labels (themes); run `make index` after `make cluster` to refresh.
5. **Build quote index (05)** — `out/quotes/quotes.json`, `quotes.jsonl`, `quotes.md`.
6. **Cluster (03 + 03b)** — Principles and heuristics are clustered **separately**. Fingerprint-based dedup, frequency weighting, human-editable labels. Produces doctrine drafts in `out/doctrine/`. Optional **AI stages**: semantic merge (`make ai-merge`) before clustering for better frequency; AI-generated cluster labels (`make ai-labels`) after clustering for suggested titles (see **Optional AI stages** below).

**Manifest** (`out/manifest.csv` and `out/manifest.jsonl`) is the spine. Stable IDs: **P1_S01** (part + story). Fields: story_id, part, title, slug, printed_start, printed_end, pdf_start, pdf_end, txt_path, md_path, pdf_path, word_count, char_count.

## Prerequisites

- Python 3.10+
- Install deps: `python3 -m pip install -r requirements.txt`

## Workflow

1. Put your memoir PDF as **`book.pdf`** in the project root.
2. **(Optional)** Run `make inspect` to see total pages, TOC preview, and anchor location.
3. Run **`make split`** (or `python3 scripts/01_split_by_toc.py`). Produces:
   - Clean TXT and MD per story (OCR-style artifacts cleaned).
   - Manifest with story_id, paths, page ranges.
4. Run extraction: `python3 scripts/run_extraction.py [--limit N]` or paste story + prompt and save JSON to `out/extracted/<story_id>.json`. Each JSON must include **story_id**, **story_title**, **story_summary** (can be empty), and the rest of the schema.
5. Run **`make validate`** for schema validation and coverage report.
6. Run **`make index`** to build `out/library/00_LIBRARY_INDEX.md` and `00_LIBRARY_INDEX.json`.
7. Run **`make quotes`** to build the global quote library under `out/quotes/`.
8. Run **`make cluster`** to run **principles clustering** (03) and **heuristics clustering** (03b). Each step: fingerprint dedup → KMeans → cluster summaries and doctrine drafts.
9. Review `out/clusters/` (principles/heuristics cluster summaries) and `out/doctrine/` (draft doctrine + core principles). Edit **`out/clusters/labels_editable.json`** to set `human_label` for any cluster; re-run `make cluster` to regenerate doctrine using your labels.

## Makefile

| Target              | Action                              |
|---------------------|--------------------------------------|
| `inspect`           | Run 00_inspect_pdf.py                |
| `split`             | Run 01_split_by_toc.py               |
| `validate`          | Run 02_extract_units.py (schema + coverage) |
| `index`             | Run 04_build_library_index.py → out/library/ |
| `quotes`            | Run 05_build_quotes_index.py → out/quotes/ |
| `cluster`           | Run 03 (principles) + 03b (heuristics) |
| `ai-merge`          | Optional: AI semantic merge → ai_merged_principles/heuristics.json (run before cluster) |
| `ai-labels`         | Optional: AI-suggested cluster titles → labels_editable.json (run after cluster) |
| `doctrine`          | Same as cluster                      |
| `smoke`             | Run 99_smoke_pipeline.py (validate pipeline) |
| `smoke-ingest`      | Run 99_smoke_ingest.py (validate source ingestion) |
| `update-stories-md` | Run 06_update_stories_md.py (enrich MD from JSON) |

Scripts are **cwd-independent**: run from project root.

## Config and tuning

- **01_split_by_toc.py:** `TOC_PAGES`, `TOC_LINE_RE`, `SKIP_TITLES`, `START_SPLITTING_AT`, `ANCHOR_SEARCH_START_PAGE`.
- **scripts/lib/text_clean.py:** `UNICODE_LITERAL_REPLACEMENTS`, `SPLIT_WHITELIST`, `SPLIT_JOIN_PATTERN` for OCR fixes. Add to whitelist for new split-word patterns.
- **02_extract_units.py:** `REQUIRE_EVIDENCE` for strict principle/heuristic evidence.
- **03_cluster_principles.py / 03b_cluster_heuristics.py:** Fingerprint dedup + **near-duplicate merge** (cosine ≥ 0.82) so **frequency = # stories supporting an idea**, not just exact matches. `K_MIN`/`K_MAX`, `N_REP`. Heuristics use higher K (15–45) for more, smaller clusters.
- **Cluster labels:** Edit `out/clusters/labels_editable.json` — set `human_label` for each cluster. Doctrine uses **human_label** when set, else **ai_suggested_label** (from `make ai-labels`), else auto_label + **(needs rename)** and a review note until top clusters are labeled.
- **Optional AI stages:** Set `OPENAI_API_KEY` in `.env.local`. Run **`make ai-merge`** (after extraction) to write `out/clusters/ai_merged_principles.json` and `ai_merged_heuristics.json`; then **`make cluster`** will load these and skip fingerprint_dedup + near_duplicate_merge for better frequency. After clustering, run **`make ai-labels`** to fill `ai_suggested_label` in `labels_editable.json` for clusters missing a human_label.
- **Legacy:** Old combined artifacts (`clusters.json`, `draft_doctrine.md`, etc.) are moved to **out/legacy/** on run. Single source of truth: `principles_*` and `heuristics_*` only.

## Outputs

- **out/manifest.csv**, **out/manifest.jsonl** — story_id, part, title, slug, printed_start/end, pdf_start/end, txt_path, md_path, pdf_path, word_count, char_count.
- **out/pdf/**, **out/txt/** — Per-story PDFs and **clean** extracted text.
- **out/stories_md/** — One `.md` per story: title, Story ID, Part, Tags, Summary, Full Text (clean). Enrich with principles/heuristics via `make update-stories-md` after extraction.
- **out/extracted/** — One JSON per story (story_id, story_title, story_summary, context, principles, decision_heuristics, quotes, etc.). **out/extracted/coverage_report.md** — missing/orphan report.
- **out/library/** — **00_LIBRARY_INDEX.md**, **00_LIBRARY_INDEX.json** (story_id, title, part, paths; when clusters exist: principle_clusters, heuristic_clusters with cluster_id and label per story). **00_SOURCES_INDEX.md**, **00_SOURCES_INDEX.json** (ingested external sources: transcripts, articles, bios, etc.).
- **sources/** — **raw/**, **cleaned/**, **meta/**, **extract/** (per-source ingested files and derived extractions; see **Ingest New Sources**).
- **out/quotes/** — **quotes.json**, **quotes.jsonl**, **quotes.md** (global quote library).
- **out/clusters/** — `principles_clusters.json`, `principles_cluster_summary.md`, `heuristics_clusters.json`, `heuristics_cluster_summary.md`, **`labels_editable.json`** (set `human_label` per cluster; required for polished doctrine).
- **out/doctrine/** — **`draft_principles_doctrine.md`**, **`draft_heuristics_doctrine.md`** (frequency = stories supporting each idea; headers show “(needs rename)” until labeled), **`core_principles.md`** (top N by frequency).
- **out/legacy/** — Deprecated combined artifacts moved here (clusters.json, draft_doctrine.md, etc.); do not use for new work.

## Ingest New Sources

The **source ingestion** pipeline ingests any new source (video transcript, article, board bio, SEC filing, speech, letter) into the archive in a consistent, auditable way. No external API calls; extraction is deterministic (regex + heuristics only).

### How to run

From the project root:

```bash
python3 scripts/06_ingest_source.py --input path/to/file.txt --type video_transcript [--source-id ID] [--title "Title"] [--url "https://..."]
```

- **--input** (required): Path to `.txt` or `.md` file. For PDFs, pre-extract text to `.txt` or `.md` first (the script will error with instructions if you pass a PDF).
- **--type** (required): One of `video_transcript`, `article`, `board_bio`, `sec_filing`, `speech`, `letter`, `other`.
- **--source-id**: Stable ID. If omitted, derived from filename and type (e.g. `video_transcript_2024_06_15_slug` or `video_transcript_slug` if no date).
- **--title**, **--url**: Optional; stored in metadata stub.
- **--force**: Overwrite derived outputs if this source_id already exists (raw copy is preserved unless **--overwrite-raw**).

### Directories created

| Path | Purpose |
|------|--------|
| `sources/raw/` | Original file copy (same extension as input). |
| `sources/cleaned/` | Cleaned text (timestamps removed, whitespace normalized). |
| `sources/meta/` | Metadata JSON stub per source. |
| `sources/extract/` | Extractions: quotes, claims, timeline_candidates, date_candidates. |
| `out/library/00_SOURCES_INDEX.md` | Human-readable index by type. |
| `out/library/00_SOURCES_INDEX.json` | Machine-readable list of ingested sources. |

Directories are created automatically on first run.

### After stub creation

- Edit **`sources/meta/<source_id>.json`** to fill in `title`, `publisher`, `domain`, `date_published`, `date_event`, `url`, `rights`, `tier`, `credibility`, `notes` as you verify them.
- Tier defaults: letter/speech → A, video_transcript → B, sec_filing/board_bio/article → C, other → D.

### Smoke test

```bash
python3 scripts/99_smoke_ingest.py
```

Asserts: no timestamps remain in cleaned text, all quotes ≤25 words, meta stub produced, index updated. Optional Makefile target: `make smoke-ingest` (see below).

### Important

Do **not** add private or personally identifiable information that should not be in the archive. Prefer redacting before ingest.
