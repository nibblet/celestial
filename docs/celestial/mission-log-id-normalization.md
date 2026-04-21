# Mission log ID normalization (CR-003)

Prescribed format: **`VLK-M###-CH##-[A-Z]`** (see `celestial_original/Valkyrie-1 Mission Log Framework.docx`).

## Applied mappings

| Previous ID | Normalized ID | Notes |
|-------------|----------------|-------|
| `VLK-A731-CH07-X` | `VLK-M731-CH07-X` | ALARA observational batch → `M` prefix |
| `VLK-A733-CH07-B` | `VLK-M733-CH07-B` | |
| `VLK-A811-CH08-B` | `VLK-M811-CH08-B` | |
| `VLK-A900-CH08-X` | `VLK-M900-CH08-X` | |
| `VLK-X041-CH04-D` | `VLK-M041-CH04-D` | Recovered fragment → `M` mission batch |
| `VLK-M001-CH03-A1` | `VLK-M001-CH03-B` | Single-letter suffix |
| `VLK-M001-CH09-C (Unindexed Private Fragment)` | `VLK-M001-CH09-F` | Single-letter suffix; fragment |
| `VLK-M011-CH11-A1` | `VLK-M011-CH11-D` | Single-letter suffix |
| Duplicate second `VLK-M001-CH17-A` (extended body) | `VLK-M001-CH17-F` | Removed duplicate `A` |

IDs already in prescribed form (e.g. `VLK-M001-CH01-A`, `VLK-M015-CH10-A`) were left unchanged.
