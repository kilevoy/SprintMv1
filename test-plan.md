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
