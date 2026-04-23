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

### 1b. Suspected UTC-date typos (Day number is correct; date is wrong)

| Log | Stated | Expected | Delta |
|---|---|---|---|
| `VLK-M001-CH05-B` | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | +19 days |
| `VLK-M001-CH06-B` | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | +19 days |
| `VLK-M001-CH10-A..F` (×6) | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | +19 days |
| `VLK-M001-CH11-A..C` (×3) | Day 77 / 2050-12-14 | Day 77 / **2050-11-25** | +19 days |
| `VLK-M001-CH09-A..B` | Day 86 / 2050-12-01 | Day 86 / **2050-12-04** | −3 days |
| `VLK-M001-CH12-A..E` (×5) | Day 59 / 2050-11-11 | Day 59 / **2050-11-07** | +4 days |
| `VLK-M011-CH06-C` | Day 58 / 2050-11-08 | Day 58 / **2050-11-06** | +2 days |
| `VLK-M011-CH11-A1` | Day 58 / 2050-11-08 | Day 58 / **2050-11-06** | +2 days |
| `VLK-A900-CH08-X` | Day 113 / 2051-01-14 | Day 113 / **2050-12-31** | +14 days |
| `VLK-M015-CH10-A` | Day 112 / 2051-01-08 | Day 112 / **2050-12-30** | +9 days |

**Interpretation:** most drifts cluster around the **Day 77 = 2050-12-14** anchor (16 logs!). That could mean the author used a different mental anchor (e.g. launch on 2050-09-28 instead of 2050-09-10) for mid-book logs, or it's an editorial slip in a batch of Chapter 10-11 logs that was copied forward.

**Recommendation:** confirm with the author which is canonical — the Mission Day counter or the calendar date. Then fix whichever side is wrong in the inventory and leave a `note` field indicating the printed text differs.

---

## 2. Log-id vs inventory-chapter mismatches

Three log IDs carry a `CH##` token that disagrees with the `chapterId` field where they were grouped:

| Log ID | ID says | Inventory says | Likely truth |
|---|---|---|---|
| `VLK-M001-CH02-F` | CH02 | CH03 | Content (Evelyn on resonant memory) fits CH03 "Resonant Memory". The **log id is probably the typo**, not the grouping. Propose rename to `VLK-M001-CH03-F` in a future ingestion pass. |
| `VLK-M001-CH02-G` | CH02 | CH03 | Same as above. |
| `VLK-M015-CH10-A` | CH10 | CH05 | Day 112 is far past CH05's other logs (Days 42–77). Appearance in CH05 might be **intentional forward-reference**: the author planted a future ALARA log as foreshadowing. The `VLK-M015` prefix (a different mission series) supports that reading. Recommend leaving the grouping and adding an `isForwardReference: true` hint the UI can render. |

---

## 3. Character name drift

Likely draft-era continuity issues. Each needs an author decision:

| First name | Surnames in logs | Chapters | Notes |
|---|---|---|---|
| **Evelyn** | Tran, Sayre | CH01–CH11 → Tran; CH14, CH16 → Sayre | Sudden switch mid-book. No intermediate "legally changed her name" log that I can see in the metadata. Most likely editorial drift. |
| **Marco** | Ruiz, Silex, Dren | CH02/04/10 → Ruiz; CH13 → Silex; CH16 → Dren | Three distinct surnames for what reads like the same character (ship-command officer). Needs canon pick. |
| **Jax** | Reyes, Delcor | CH02 → Reyes; CH08 → Delcor | Two names. Could be distinct characters or the same person mis-named. |
| **ALARA** | "ALARA", "ALARA + [Vessel Merge Signature]" | CH17-E final log | Intentional — marks the in-story merge at the end of Book I. **Leave.** |

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
