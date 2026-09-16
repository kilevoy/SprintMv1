# Sprint M — Execution Status

## Current phase

Core 1 geometry-domain closure → real project 22318 differential validation

## Status

`UNKNOWN_DOMAIN_GEOMETRY_GAP = CLOSED`. `PURLIN_DECK_GAP = CLOSED`. Project 22318 now reaches the full Core 1 structural chain through `ProjectInput → Core1Input → calculateCore1`; changes remain uncommitted and unpushed.

## Decisions

- The deck matrix is read from `core1/data/deck_properties.csv`.
- Its row-to-step axis is the audited legacy `вывод!W11:W63`; no profile-name parsing is used.
- `D24=0` means no manual maximum override, so the deck-derived limit is used.
- A nonzero manual maximum replaces the deck-derived maximum, matching `Подбор прогонов 2!B14`.
- The 500 mm legacy `#REF!` branch remains typed and reachable.
- City autocomplete and climate preview remain presentation/state; production climate calculation uses only exact source-proven lookup tuples.
- `вывод!D5/D6` geometry domain is proven from source formulas, 15 m height bands, and real project `22318`: length is finite-positive without an invented max; height is finite-positive and `<=6.2`.
- `RU|Сургут|SP_20` is now an exact production climate tuple because the source row and cached loads are present and the real project reaches structural calculation.
- The wall selector is UI/project state and is intentionally absent from `Core1Input`.
- `ProjectInput` is the only editable project model; legacy opening counters are derived by `projectInputToCore1Input()`.
- Gate classification remains blocked until the workbook proves whether width or height controls the 6 m boundary.

## Blockers

Geometry is no longer an implementation blocker. The first real-project divergence is in `FrameSelector`: Core 1 selects step 6 m and column `ПГС245/20х80х2,5`, while source 22318 has step 4 m and column `ПГС300/20х80х2`; purlin and D68/D69 then diverge. Do not fix by guessing or replacing formulas. Full parity for 22318 and the 2700/3000 mm N60 branches still needs a differential source audit/recalculated Excel golden source.

## Verification

- `npm test`: 119/119 passed across 12 test files, including geometry-domain and 22318 regression tests.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed (only normal Git line-ending warnings).
- `pytest core1/tests/test_static_data_integrity.py`: 25/25 passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- `pytest core1/tests/test_static_data_integrity.py`: 25/25 passed after exact-byte restoration; final rerun remains part of the quality gate.
- Project adapter/UI tests: 17/17 focused tests passed in the latest targeted run.
