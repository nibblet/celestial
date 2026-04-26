# Mission-log continuity audit

**Scope:** `content/raw/mission_logs_inventory.json` (69 logs across CH01–CH17), derived by `scripts/ingest-celestial-book.ts` from the published EPUB.

**Purpose:** Surface every mismatch found in the Day↔Date math, log-id vs chapter assignments, and character-name drift — and propose a per-row fix. **No edits have been applied.** Decide case-by-case whether each row is:

- **Source book typo** → fix in the inventory and note the deviation from the printed text.
- **Intentional** (forward-reference, in-story identity change) → leave, optionally annotate.
- **Ingestion bug** → fix in `ingest-celestial-book.ts`.

Canonical anchor: **Mission Day 1 = 2050-09-10 UTC (launch).** All "expected" dates below are computed from this anchor.

---

## 1. Day ↔ Date math mismatches

24 of 69 logs carry a `dateShipTime` whose UTC date does not match the stated Mission Day relative to launch. Grouped by likely root cause:

### 1a. Suspected Mission-Day typos (Day number is wrong; UTC date is internally consistent)

| Log | Stated | Likely canonical | Evidence |
|---|---|---|---|
| `VLK-A731-CH07-X` | Day 43 / 2050-11-01 | **Day 53** / 2050-11-01 | CH13 Day 53 → 2050-11-01 already matches the anchor. CH07's Osei log (Day 48) is also internally consistent, so this pair looks like a stray "43" that should read "53". |
| `VLK-A733-CH07-B` | Day 43 / 2050-11-01 | **Day 53** / 2050-11-01 | Same as above. |

**Recommendation:** fix Mission Day `43 → 53` in the inventory for these two logs. They are ALARA observations of Evelyn at the vault — chronologically belongs after CH13 "The Intercept", not alongside CH01.

### 1b. UTC-date normalization (Day retained as canonical)

| Log | Previous | Normalized | Status |
|---|---|---|---|
| `VLK-M001-CH05-B` | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | Fixed |
| `VLK-M001-CH06-B` | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | Fixed |
| `VLK-M001-CH10-A..F` (×6) | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | Fixed |
| `VLK-M001-CH11-A..C` (×3) | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | Fixed |
| `VLK-M001-CH09-A..B` | Day 86 / 2050-12-01 | Day 86 / **2050-12-04** | Fixed |
| `VLK-M001-CH12-A..E` (×5) | Day 59 / 2050-11-11 | Day 59 / **2050-11-07** | Fixed |
| `VLK-M011-CH06-C` | Day 58 / 2050-11-08 | Day 58 / **2050-11-06** | Fixed |
| `VLK-M011-CH11-A1` | Day 58 / 2050-11-08 | Day 58 / **2050-11-06** | Fixed |
| `VLK-A900-CH08-X` | Day 113 / 2051-01-14 | Day 113 / **2050-12-31** | Fixed |
| `VLK-M015-CH10-A` | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | Fixed |

**Policy applied:** story chronology is treated as generally linear; Mission Day is canonical unless an explicit in-text time jump is obvious. UTC dates in these rows were normalized to the Day-1 anchor.

---

## 2. Log-id vs inventory-chapter mismatches

Three log IDs carry a `CH##` token that disagrees with the `chapterId` field where they were grouped:

| Log ID | ID says | Inventory says | Likely truth |
|---|---|---|---|
| `VLK-M001-CH03-F` | CH03 | CH03 | Fixed: log ID token now matches CH03 grouping. |
| `VLK-M001-CH03-G` | CH03 | CH03 | Fixed: log ID token now matches CH03 grouping. |
| `VLK-M015-CH10-A` | CH10 | CH05 | Keep grouped in CH05. `CH10` appears to be an ID-token typo while chapter placement and Day 77 timing are canon for this entry. |

---

## 3. Character name drift

Likely draft-era continuity issues. Each needs an author decision:

| First name | Surnames in logs | Chapters | Notes |
|---|---|---|---|
| **Evelyn** | Tran, Sayre | CH01–CH11 → Tran; CH14, CH16 → Sayre | **Resolved:** canonical name is Evelyn Tran. Sayre variants corrected as editorial mistakes. |
| **Marco** | Ruiz, Silex, Dren | CH02/04/10 → Ruiz; CH13 → Silex; CH16 → Dren | **Resolved:** canonical name is Marco Ruiz. Silex/Dren variants corrected as editorial mistakes. |
| **Jax** | Reyes, Delcor | CH02 → Reyes; CH08 → Delcor | **Resolved:** canonical name is Jax Reyes. Delcor variant corrected as editorial mistake. |
| **ALARA** | "ALARA", "ALARA + [Vessel Merge Signature]" | CH17-E final log | **Intentional:** same identity, used as foreshadowing of ALARA's growth/merge state. Leave as authored. |

---

## 4. What Ask currently sees

Ask's chronology context (`getMissionTimelineContext()` in `src/lib/ai/prompts.ts`) uses the **raw inventory values**, so any lies in the inventory propagate to every answer. Likewise `getMissionLogsForChapter()` reads the raw records straight through.

The chronology note already tells the model "logs within a chapter are not always chronological — flashbacks, delayed filings, and parallel events occur", which covers legitimate out-of-order logs but *not* date typos. Until the audit above is resolved, Ask will occasionally say "CH10 takes place on 2050-12-14" when the canonical math says 2050-11-25.

---

## 5. Proposed path

1. **Author review pass** over §1–§3. Each decision = one of:
   - Fix in `content/raw/mission_logs_inventory.json` (with a `note` field flagging the change).
   - Patch `scripts/ingest-celestial-book.ts` and re-run.
   - Leave, add an annotation (e.g. `isForwardReference`, `identityShift`).
2. **Add a `continuityNotes` block** to `getMissionTimelineContext()` listing anything intentional ("Evelyn Tran → Sayre in CH14; ALARA merges in CH17"), so Ask stops flagging them as inconsistent.
3. **Add a schema check** to `scripts/ingest-celestial-book.ts` that fails the build if Day↔Date math drifts more than ±1 day without an explicit `override: true`. Prevents regressions in future book updates.

Audit generated: 2026-04-22. Regenerate by re-running the diagnostic script in the Run 10 chat history, or port that script to `scripts/audit-mission-logs.ts` if this becomes a recurring check.
