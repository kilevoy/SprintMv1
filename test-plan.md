# Test Plan — Core 1 geometry closure and real project 22318

## Legacy climate/frame branch overlay

- `AB5:AB58` approximate `MATCH` characterization covers exact keys and between-boundary values, including the non-monotonic rows 54–58 and text/error rows 50–53.
- Roof correction rows preserve source order and `С-П 150 → 0.1`.
- `E + AM26` reproduces Uvildy `1.5 + 0.1 = 1.6 → IV/0.8 and III/0.8`.
- `V9=1.0` selects J/K; `V9=0.8` selects L/M; wind is taken from H independently.
- Duplicate `3/3` in the exact `AJ11 → V7` table returns the first occurrence.
- 22318 and 22316 retain their proven frame and D69 parity.
- 22329 canonical climate remains `III/1.5, II/0.30`, while the legacy branch is `4/2 → 4/3` and the beam is `ПГС300/20х80х2,5`.
- 22326 remains a compatibility case and is not promoted to a real-project oracle.
- The first post-branch divergence is recorded at the source bolt pattern `вывод!D52`; downstream parity is not used to justify an automatic fix.

## Automated checks

- Scenario A: `С-П 200` + `С44-1000-0,7` selects `2ПС 200х65х2`, 2140 mm, 1550.88 kg, and the audited baseline summary.
- Scenario B: `С-П 200` + `С44-1000-0,5` selects `2ПС 150х65х1,5`, 1015 mm, 1756.44 kg, and `D69 ≈ 31.25892361111111` (larger-step tie-break).
- Existing 12 m baseline remains 32/32 and parity-proven.
- Known deck grades expose audited limits and remain deterministic.
- Unknown deck returns typed `LOOKUP_NO_MATCH` / `#N/A`.
- 500 mm retains typed legacy `PURLIN_STEP_500_REF` / `#REF!`.
- Length 24 m and height 5 m are accepted by general proven geometry validation.
- Height 6.21 m remains `UNKNOWN_DOMAIN`; no unsupported geometry is silently extrapolated.
- Real `22318` reaches `FrameSelector`, `PurlinCalculator`, `SecondarySteelCalculator`, `OpeningMassCalculator`, and `StructuralSummary` through `ProjectInput → adapter → calculateCore1`.
- The real-project test asserts source-compatible frame aggregate (`tube_mass_kg_per_m2=6.5257152777777767`), purlin profile, steel, step `1900 mm`, mass `1699.2 kg` and D69 `32.285826388888886 kg/m²`.
- Frame length regression evaluates the same 15 m frame row at 18 m and 24 m, proving the runtime length changes only the length-dependent tube mass while frame step/count/profiles remain stable.
- Arbitrary-span mapping covers `8.5`, every proven upper boundary, `10.4→12`, `24→24`, and `24.01→null`; zero/negative/non-finite values are invalid and `>24` is `UNKNOWN_DOMAIN`.
- Real 22326 regression preserves literal `10.4`, derives family `12`, reaches frame step `6 m`, beam/column and purlin outputs, and exposes both values in the frame trace.
- Equal-mass candidates are regression-tested to select the larger step, while a materially lower mass remains primary over step ordering.
- Trace contains deck/configured/manual/effective limits and evaluated/selected steps.

## Quality gates

1. `npm test`
2. `npm run typecheck`
3. `npm run build`
4. `pytest core1/tests/test_static_data_integrity.py`
5. `git diff --check`
6. `git status`

## UI refinement checks

- City query, exact selection, keyboard selection, blur, invalidation, and manual CTA.
- Climate status card shows source, normative system, snow and wind values after selection.
- Roof D20/D21 labels, helper text, selectable deck options, and stale-result behavior.
- Wall system is one project/UI field and does not enter `Core1Input` or alter Core 1 results.
- Purlin card shows deck and selected/deck-limit step when available.

## Latest run

- Vitest: 144 passed across 13 test files; includes family-boundary mapping, 22326 literal-span routing, frame-length regression and 22318 source-parity assertions.
- Purlin tie-break regression: equal-mass `1875/1900` candidates select `1900`; lower mass remains primary.
- TypeScript typecheck: passed.
- Vite production build: passed.
- Static dataset integrity: 25 passed, 0 manifest SHA mismatches.
- `git diff --check`: passed.
- FrameSelector + 22318 targeted tests: 15 passed.
- Static data integrity: `py -m pytest core1/tests/test_static_data_integrity.py` — 25 passed (system Python launcher).
- TypeScript typecheck: passed.
- Vite production build: passed.
- Static dataset integrity: 25 passed, 0 manifest SHA mismatches.
- `git diff --check`: passed.

## ProjectInput architecture checks

- One `ProjectInput` owns climate, geometry, envelope, special conditions, and detailed openings.
- Core 1 receives only `projectInputToCore1Input()` output.
- Wall state is retained in ProjectInput and excluded from Core1Input.
- Stable-ID gates, doors, windows, and strip windows support add/edit/delete.
- Incompatible window groups return `CORE1_OPENINGS_NOT_REPRESENTABLE`.
- Unproven gate width/height boundary returns `CORE1_GATE_CLASSIFICATION_UNVERIFIED` instead of guessing.

## Sprint archive validation pilot

### Critical fixtures

- `22318`: city Сургут, 15 × 24 × 5 m, known archive `D69 = 32.285826388888886`.
- `22316`: city Березовский, 18 × 30 × 5 m, known archive `D69 = 28.922792592592597`.
- `22326`: Увильды, 10.4 × 25.7 × 4 m, source-suspicious compatibility case, not a normative oracle.
- `22329`: Увильды, 12 × 26 × 4 m, exact legacy-behavior case.

### Pilot gates

1. Scanner returns four unique source-selection books and no duplicate hashes.
2. Inputs and archive outputs retain `sheet!cell` provenance.
3. Excel COM replay uses a temporary copy and `CalculateFullRebuild()`; source and master hashes remain unchanged.
4. 22318 and 22316 replay `D69` within `1e-9` of the known references.
5. Missing `frame_count`, `frame_total_kg`, and absolute `secondary_mass_kg` remain explicit NULLs.
6. XLSX, CSV, JSON, and HTML outputs are written to the pilot output directory.
7. Mass archive processing remains blocked until the pilot gates pass and the user explicitly requests it.

### Pilot execution result

- Scanner: 4 unique candidates.
- Extraction: 4/4.
- Excel COM replay: 4/4.
- Comparable: 3.
- `FULL_MATCH`: 3.
- `NOT_COMPARABLE`: 1 (`22326`).
- Mismatches: 0.
- Replay errors: 0.
- Known `D69` references for 22318 and 22316 reproduced exactly within `1e-9`.
- Source/master checksums unchanged.
- `npm test -- --run`: 149/149 passed.
- `npm run typecheck`: pre-existing failures under `src/core1/legacy`; this task did not modify those files.

### Expanded pilot gates

- 13 unique records are present after SHA-256 deduplication: 4 known and 9 new unseen.
- Known D69 controls remain exact; no archive/replay mismatches or replay errors were introduced.
- New result workbooks are not silently treated as source-selection books: missing `вывод` is a typed `UNSUPPORTED_ARCHIVE_LAYOUT` / `NOT_COMPARABLE` outcome with NULL inputs and outputs.
- Requested HTML/database fields and known/new summary counts are present.
- Expanded pilot outcome: `READY_FOR_MASS_RUN = NO` until a standard input-bearing XLSX is found for new projects and at least one unseen project completes automatic extraction and replay.

### SOURCE ↔ RESULT pair-search gates

- Source candidates must contain the standard `вывод`, `подбор`, `снегветер`, and span-family sheet fingerprint.
- Result-only workbooks must remain retained and classified as `RESULT_WORKBOOK_ONLY`; no inputs are guessed from them.
- A found source candidate must be checked against the result workbook using project ID, city, and available geometry before replay.
- A verified pair must record both SHA-256 hashes, match method, identity status, replay status, and archive-result status.
- `22285` is the current unseen pair fixture: identity match and `FULL_MATCH` replay at D69 `27.53232638888889`.

## Next regression gates: connection selector model

1. Trace `project inputs → selector state → selected span row → D52/E52/D53/D54/D55/D57` for 22318, 22316, 22329, and compatibility control 22326.
2. Preserve exact formula and cached-value provenance for `HZ18`, `RP18`, `KL18`, `WN18` and their lookup vectors.
3. Demonstrate that the minimal selector contract reproduces all six connection outputs before production implementation.
4. After implementation, assert connection parity independently from structural D69 parity.
5. Keep `D48:E49` and `D56:E56` as proven static constants; reject universal-cache use of `D52:E52`, `D53:D55`, and `D57`.
6. Classify 24 m before including it in the supported matrix. Preserve typed `#N/A` unless evidence proves another behavior.
7. Mark each archive fixture as `FULL PARITY` or `EXPRESS VALIDATION`; result-only fixtures must not be promoted to formula-path oracles.
8. Protect exact structural D69 references for 22318, 22316, and 22329 throughout connection work.

Implementation gate: `LEGACY_CONNECTION_MODEL_COMPLETE`. Until that status is reached, no `LegacyConnectionResolver` production change is allowed.
