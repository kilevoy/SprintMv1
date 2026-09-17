# Sprint M — Execution Status

## Current phase

Legacy climate derivation and frame-branch implementation; 22329 post-branch parity audit

## Status

`UNKNOWN_DOMAIN_GEOMETRY_GAP = CLOSED`. `ARBITRARY_SPAN_DOMAIN_GAP = CLOSED` (generic literal-span validation and family mapping). `PURLIN_DECK_GAP = CLOSED`. `WRONG_SNOW_FIELD = CLOSED`. `CANDIDATE_ORDER_ERROR = CLOSED`. `FRAME_LENGTH_ERROR = CLOSED`. `22318 = REAL_PROJECT_REFERENCE`. `22316 = REAL_PROJECT_REFERENCE`. `22326 = SOURCE_SUSPICIOUS / COMPATIBILITY_CASE`. The 22318 and 22316 chains reach exact source D69 parity; 22326 retains its documented structural-summary mismatch and is not a normative reference. The branch contains the two local commits that establish these results; push remains pending due the current execution environment restriction.

## Decisions

- The deck matrix is read from `core1/data/deck_properties.csv`.
- Its row-to-step axis is the audited legacy `вывод!W11:W63`; no profile-name parsing is used.
- `D24=0` means no manual maximum override, so the deck-derived limit is used.
- A nonzero manual maximum replaces the deck-derived maximum, matching `Подбор прогонов 2!B14`.
- The 500 mm legacy `#REF!` branch remains typed and reachable.
- City autocomplete and climate preview remain presentation/state; production climate calculation uses only exact source-proven lookup tuples.
- `вывод!D5/D6` geometry domain is proven from source formulas, 15 m height bands, and real project `22318`: length is finite-positive without an invented max; height is finite-positive and `<=6.2`.
- `RU|Сургут|SP_20` is now an exact production climate tuple because the source row and cached loads are present and the real project reaches structural calculation.
- Equal-mass purlin candidates use the proven legacy tie-break: larger valid step wins within a `1e-9 kg` comparison tolerance; primary criterion remains lower total mass.
- The wall selector is UI/project state and is intentionally absent from `Core1Input`.
- `ProjectInput` is the only editable project model; legacy opening counters are derived by `projectInputToCore1Input()`.
- Gate classification remains blocked until the workbook proves whether width or height controls the 6 m boundary.
- Literal `span_m` is validated as finite positive `<=24`; `resolveDesignSpanFamily` maps inclusive upper bands without rounding. Family 24 retains downstream legacy `#N/A`; spans `>24` return `UNKNOWN_DOMAIN`.
- `ClimateResolver` remains canonical. City lookup now derives the proven legacy `E + AM26 → J/K/L/M` result separately and passes the mapped `AJ11 → V7` branch into `FrameSelector`.
- Excel approximate `MATCH` on the ordered non-monotonic `AB5:AB58` range is characterized by Excel COM; the compatibility matcher preserves binary-search behavior and does not sort or deduplicate the tail.
- 22329 branch parity is closed through beam/column/frame outputs; the next audit boundary is the first bolt pattern divergence (`вывод!D52`: source `8х2`, Core1 current `7х2`). No downstream repair was made.

## Blockers

Geometry, climate, purlin step-selection and the proven frame-length path are no longer implementation blockers. For 22318 and 22316, the audited structural chains reach source parity through D69. The 2700/3000 mm N60 branches and remaining secondary presentation fields still need a differential source audit/recalculated Excel golden source. 22326 remains a source-suspicious compatibility case because its structural-summary mass path diverges.

## Verification

- `npm test`: 147/147 passed across 14 test files, including family-boundary mapping, 22316 and 22318 real-project parity, 22326 literal-span routing and 24 m legacy error.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed (only normal Git line-ending warnings).
- `pytest core1/tests/test_static_data_integrity.py`: 25/25 passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- `pytest core1/tests/test_static_data_integrity.py`: 25/25 passed after exact-byte restoration; final rerun remains part of the quality gate.
- Project adapter/UI tests: 17/17 focused tests passed in the latest targeted run.
- FrameSelector + 22318 targeted tests: 15/15 passed.
- Legacy pipeline targeted tests: 6/6 passed; full Vitest run: 152/152 passed after the branch integration.
- `py -m pytest core1/tests/test_static_data_integrity.py`: 25/25 passed. The bundled `python` runtime has no pytest; the system Python launcher was used.
