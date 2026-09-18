# Sprint M work handoff — 2026-09-18

## Repository state

- Repository: `E:\Спринт М v1`
- Branch: `checkpoint/22318-purlin-audit`
- Last synchronized baseline before this handoff: `90633bd feat: add Sprint archive validation harness`
- Source XLSX, archive XLSX/PDF, and `outputs/` are local artifacts and must not be committed.

## Proven results

- Frame selection and structural D69 parity are proven for 22318, 22316, and 22329.
- 22326 remains `SOURCE_SUSPICIOUS / COMPATIBILITY_CASE` and is not a normative oracle.
- Canonical climate remains separate from legacy derived climate and frame-branch selection.
- The legacy climate/frame pipeline is implemented in checkpoint `3321612`.
- Connection extraction datasets and audit are committed in `fedd575`.
- Sprint archive validation harness is committed in `90633bd`.
- Source/result pair search found a verified 22285 source-selection workbook and exact replay D69 `27.53232638888889`.

## Decisions to preserve

- Do not mix structural parity with connection/BOM parity.
- Do not treat master-workbook cached connection outputs as universal constants.
- `D48:E49` and `D56:E56` are static; `D52:E52`, `D53:D55`, and `D57` are project-scoped cached outputs pending replacement.
- Do not implement `LegacyConnectionResolver` until the selector contract is proven.
- Use `FULL PARITY` for replayable source-selection workbooks and `EXPRESS VALIDATION` for result-only books.
- Audit 24 m semantics before adding 24 m to the supported regression matrix.
- Track progress by milestones, not percentages.

## Next task

Perform the connection selector dependency audit:

```text
project inputs
→ selector state
→ HZ18 / RP18 / KL18 / WN18
→ MATCH result and selected row
→ span-sheet connection cells
→ D52 / E52 / D53 / D54 / D55 / D57
```

Required references: 22318, 22316, 22329; use 22326 only as a compatibility control.

Stop at the first missing dependency. Production code must remain unchanged until the result is `LEGACY_CONNECTION_MODEL_COMPLETE`.

## Start at work

```powershell
cd "E:\Спринт М v1"
git fetch origin
git switch checkpoint/22318-purlin-audit
git pull --ff-only origin checkpoint/22318-purlin-audit
git status
git log -8 --oneline
```

Expected local-only items such as `outputs/` should remain untracked and must not be staged.
