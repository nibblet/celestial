# Phase 0A Lore Review Conflict Register

## Scope

This review covers the designated backstory corpus and compares it against current Book I canon represented in:
- `content/wiki/stories/CH01-CH17*.md`
- `content/wiki/mission-logs/index.md`
- `src/lib/wiki/static-data.ts`

Reviewed source docs:
- `celestial_original/🛰️ Valkyrie-1 Interior Specifications.docx`
- `celestial_original/Addendum Earth 2050 World Snapshot.docx`
- `celestial_original/Ancient Lore & Watcher Dossier.docx`
- `celestial_original/Celestial Heritage Series Bible.docx`
- `celestial_original/Celestial Heritage_ Character Dossier.docx`
- `celestial_original/Earth 2050_ World Snapshot.docx`
- `celestial_original/Parable Catalog v2 – Celestial Heritage Series.docx`
- `celestial_original/Style & Voice Guide Celestial Heritage.docx`
- `celestial_original/Valkyrie-1 Mission Log Framework.docx`
- `celestial_original/Valkyrie-1 Technical Brief.docx`
- `celestial_original/Valkyrie-1_ Visual & Structural Specification Brief.docx`
- `celestial_original/Vault Encounter Tracker v2.docx`

## Canon precedence rule (locked)

When conflict exists:
1. Book I chapter canon (`CH01-CH17`) wins.
2. Book I mission logs win next.
3. Lore docs are accepted only when compatible or explicitly marked as adjacent/future.

## Structured extraction outputs

### Timeline-impacting candidates
- Prehistory framing: resonant civilization and vault seeding (`Series Bible`, `Ancient Lore & Watcher Dossier`).
- 2034 Mars anomaly, 2049 precursor confirmation, 2050 mission launch (`Series Bible`).
- Earth-side containment arc entities (`CNV Rigel Ascendant`, `SOVRIN`) appears in addendum and chapter-linked mission logs.
- Multi-vault sequence (Vaults 001-010) from `Vault Encounter Tracker v2` likely spans beyond Book I.

### Entity definition candidates
- Crew baseline aligns broadly: Galen, Aven, Thane, Lena, Evelyn, Marco, Jax, Jonah, ALARA.
- New/additional entities for taxonomy staging:
  - `CNV Rigel Ascendant` (vessel)
  - `SOVRIN` (AI system)
  - `Watchers` / `Resonant` (lore constructs)
  - vault set beyond `Vault 002` (future-volume candidates)

### Mission-log framework candidates
- Explicit log field schema in `Valkyrie-1 Mission Log Framework`.
- Recommended log typing (`Command`, `Personal`, `ALARA`, `Event`) and optional privacy/coherence fields.
- Canon inventory currently contains valid but heterogeneous IDs (`VLK-M...`, `VLK-A...`, special fragments), so parser must support variants.

### Style/voice constraints (AI continuity)
- Third-person limited baseline with controlled POV shifts.
- Symbolic vault parables should remain sparse and consequential.
- Character voice signatures are well-defined and reusable for continuation prompts.

## Conflict register

| ID | Topic | Source Claim | Book I Canon | Impact | Disposition | Resolution |
|---|---|---|---|---|---|---|
| CR-001 | Valkyrie origin wording | `Series Bible` says "2050 CE – Valkyrie-1 Constructed" | Book I treats Valkyrie-1 as ancient vessel discovered under Mars | High (core lore) | **`resolved`** | **Approved:** Replace bible timeline line with discovery/activation/reactivation framing (see `docs/celestial/series-bible-timeline-wording.md`). |
| CR-002 | Christianity lineage explicitness | `Ancient Lore & Watcher Dossier` makes direct chronology-level Christian continuity claims | Book I tone is spiritually resonant but less doctrinally explicit | Medium (tone/canon) | **`resolved`** | **Approved (concur):** Remains `adjacent`; not elevated to hard canon in app metadata. |
| CR-003 | Mission log ID strict format | `Mission Log Framework` prescribes `VLK-M###-CH##-[A-Z]` | Canon mission inventory included `VLK-A...`, `VLK-X...`, suffix variants | Medium (parser/schema) | **`resolved`** | **Approved:** Normalize all mission log IDs to prescribed format; see `docs/celestial/mission-log-id-normalization.md`. |
| CR-004 | Jax naming variant | Sources mainly use `Jax Reyes`; one mission-log entry includes `Jax Delcor` | Book I character set is `Jax Reyes` | High (entity integrity) | **`resolved`** | **Approved:** Corrected to `Jax Reyes` in canon inventory and chapter markdown. |
| CR-005 | Earth transparency/governance emphasis | `Earth 2050` snapshot frames broad transparency/stability | Book I framing includes classified layers and mixed agenda tension | Medium (world framing) | **`resolved`** | **Approved (concur):** Dual-layer framing — public narrative vs canonical classified tension. |
| CR-006 | Future vaults as present structure | `Vault Encounter Tracker` details Vaults 003-010 | Early tracker artifact; Book I vault arc is authoritative | Medium (timeline pollution) | **`resolved`** | **Approved (defer):** Vault tracker doc deferred to future volume. **Follow-up:** Rebuild vault tracker from book text with expandable schema — key artifact; see `docs/celestial/vault-tracker-follow-up.md`. |
| CR-007 | Rigel/SOVRIN timing | Addendum introduces containment vessel and override AI | Book I mission logs already reference Rigel/SOVRIN threads in CH10+ | Low | **`resolved`** | **Approved (accept):** Canonical entities with chapter linkage and provenance. |
| CR-008 | Valkyrie interior/tech detail level | Interior/technical briefs add specific architecture and behavior | CH04 summary and mission logs are compatible with resonance-first command model | Low | **`resolved`** | **Approved (accept):** Ingest as canonical technical lore with provenance. |

## No-conflict acceptances (high confidence)

- Command dome as resonance-first, non-traditional bridge model.
- ALARA distributed presence and location-sensitive interaction behavior.
- Mission log purpose and narrative integration patterns.
- Character arc framing that does not alter Book I event order.

## Implementation gates satisfied for Phase 0

- Reviewed source corpus and extracted structured candidates.
- Identified concrete conflicts and assigned dispositions.
- Established canonical precedence policy.
- Ready to apply taxonomy and migration rules in Phase 0 contract.

## Outstanding reviewer decision (single)

- `CR-002`: Stakeholder concur — remains **adjacent** (not promoted to hard canon in app surfaces). Promotion in a later volume remains a separate decision.
