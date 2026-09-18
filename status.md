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

## Sprint archive validation pilot

Current phase: bounded pilot implementation and Excel COM replay.

Done:

- Created `tools/sprint_archive_validation` with scanner, classifier, extractor, conservative profile parser, COM replay harness, comparator, report writer, and artifact-tool workbook builder.
- Created `MASTER_TEMPLATE_SCHEMA.md` and `ARCHIVE_EXTRACTION_SCHEMA.md`.
- Confirmed four unique local source-selection candidates after SHA-256 deduplication: 22318, 22316, 22326, and 22329.

Next:

- Run the four-project pilot and verify 22318/22316 against known D69 values before considering any archive-wide run.

Stop rules:

- Any failure to reproduce the known 22318 or 22316 D69 reference stops the pilot review and blocks mass processing.
- Any missing or ambiguous field is retained as NULL/typed status; no formula or source workbook is changed.

Pilot result (2026-09-17):

- 4 unique Sprint candidates scanned, 4 parsed, 4 replayed through Microsoft Excel COM.
- 3 comparable projects are `FULL_MATCH`: 22318, 22316, and 22329.
- 22318: Archive/Replay `D69 = 32.285826388888886 kg/m²`.
- 22316: Archive/Replay `D69 = 28.922792592592597 kg/m²`.
- 22329: Archive/Replay `D69 = 32.652530448717954 kg/m²`.
- 22326: `NOT_COMPARABLE`, preserved as `SOURCE_SUSPICIOUS / COMPATIBILITY_CASE`; Archive/Replay `D69 = 33.342651277062764 kg/m²` is shown only diagnostically.
- 0 mismatches and 0 replay errors in the pilot. No source/master checksum changed during the run.
- Outputs: `outputs/sprint_pilot/SPRINT_VALIDATION_DATABASE.xlsx`, CSV/JSON extracts, `report.html`, and the rendered `summary.png`.

Validation notes:

- `npm test -- --run`: 149/149 passed.
- `python -m compileall -q tools/sprint_archive_validation`: passed.
- `npm run typecheck`: fails on pre-existing legacy TypeScript errors in `src/core1/legacy`; no fixes were made because they are outside this request.
- Mass archive processing remains blocked pending pilot review and a separate explicit command.

### Expanded Sprint archive pilot (2026-09-17)

- Scope: 13 unique workbooks, comprising 4 known references and 9 new unseen Drive candidates (`21799`, `21800`, `21818`, `21843`, `21857`, `21865`, `21897`, `21906`, `22285`).
- Known controls remain stable: 22318, 22316, and 22329 are `FULL_MATCH`; 22326 is `NOT_COMPARABLE / SOURCE_SUSPICIOUS / COMPATIBILITY_CASE`.
- New workbooks were verified as Sprint result books by Drive titles/geometry metadata and workbook inspection. They contain geometry result sheets, but no standard `вывод` sheet, so the extractor records `UNSUPPORTED_ARCHIVE_LAYOUT` and `INPUTS_NOT_EXTRACTED` rather than inferring inputs.
- Expanded totals: Parsed 4; Replay completed 4; Comparable 3; `FULL_MATCH` 3; MISMATCH 0; `NOT_COMPARABLE` 10; ERROR 0.
- The database/report now expose known-vs-new counts, geometry, archive/replay D69, beam/column/purlin profiles, and quality flags.
- `READY_FOR_MASS_RUN = NO`. Reasons: zero new unseen projects were replayable/comparable; city/climate/input provenance is unavailable in the new result layout; the correct standard source-selection workbook for those projects has not yet been located.
- No Core 1 changes, source/master edits, commit, or push were made.

### SOURCE ↔ RESULT pair search (2026-09-17)

- Added a conservative pair-search stage that distinguishes source-selection books from result books by workbook fingerprint and never infers source inputs from result layouts.
- Pair inventory: 13 result projects; 5 source-selection books found (4 known references plus 22285); 8 new projects remain `RESULT_WORKBOOK_ONLY`.
- `22285` source/result identity matched on project ID, city, and `18x48x6` geometry. Its source replay is `FULL_MATCH`; archive D69 and replay D69 both equal `27.53232638888889 kg/m²`.
- Pair records include source/result filenames, paths, SHA-256 hashes, match method, source fingerprint, identity status, replay status, and archive-result status. They are included in the `SourceResultPairs` sheet of the validation database.
- `READY_FOR_MASS_RUN = NO`: source-selection books have not yet been located for the other eight new result projects.

## Parity milestone status (2026-09-18)

- `M1_FRAME_SELECTION_PARITY = PROVEN_FOR_REFERENCES`.
- `M2_STRUCTURAL_D69_PARITY = PROVEN` for 22318, 22316, and 22329.
- `M3_CONNECTION_BOM_PARITY = INCOMPLETE`.
- `M4_SUPPORTED_DOMAIN_MATRIX = PARTIAL`.
- `M5_CORE1_FROZEN = NO`.
- `M6_CORE2_SOURCE_PARITY = PARTIAL`.
- `M7_FULL_PROPOSAL_PARITY = NOT_READY`.

Current first missing dependency: project-specific selector state and lookup vectors behind `HZ18`, `RP18`, `KL18`, and `WN18`. The extracted master-workbook connection cache cannot reproduce all reference projects from design family and `ROW14/ROW15` alone.

Next work starts with the connection-selector dependency audit. `LegacyConnectionResolver` remains blocked until the minimal selector contract is proven and the model is classified `LEGACY_CONNECTION_MODEL_COMPLETE`.

Validation terminology is now split:

- `FULL PARITY`: input-bearing source-selection workbook available and replayable.
- `EXPRESS VALIDATION`: result-only workbook suitable for observable output checks, not for proving the internal formula path.

Final parity is reported independently as structural, connection/BOM, Core2 BOM, and commercial parity. A connection mismatch does not invalidate already proven structural D69 parity.
