# Vault tracker follow-up (CR-006)

The file `celestial_original/Vault Encounter Tracker v2.docx` was an **early planning artifact**. Per conflict resolution it is **deferred** — not imported as canonical timeline truth for Book I.

## Next build (future phase)

1. **Derive vault rows from Book I canon** (`content/wiki/stories`, mission logs, chapter Vault references).
2. **Expandable schema** — each vault record should support:
   - `vaultId`, `displayName`, `status`, `discoveryOrder`, `activationOrder` (nullable)
   - `chapterRefs`, `missionLogRefs`, `location`, `symbolicRole`
   - `canonStatus` (`canon` vs `planned` vs `adjacent`)
3. **Single source of truth** in-repo (e.g. `content/wiki/vaults/` or generated JSON) with UI reading the same structure.

This remains a **key artifact** for the series; implementation is scheduled after Book I tracker content is authored from the text.
