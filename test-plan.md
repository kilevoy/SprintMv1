# Test Plan — Core 1 geometry closure and real project 22318

## Automated checks

- Scenario A: `С-П 200` + `С44-1000-0,7` selects `2ПС 200х65х2`, 2140 mm, 1550.88 kg, and the audited baseline summary.
- Scenario B: `С-П 200` + `С44-1000-0,5` selects `2ПС 150х65х1,5`, 1000 mm, 1756.44 kg, and `D69 ≈ 31.25892361111111`.
- Existing 12 m baseline remains 32/32 and parity-proven.
- Known deck grades expose audited limits and remain deterministic.
- Unknown deck returns typed `LOOKUP_NO_MATCH` / `#N/A`.
- 500 mm retains typed legacy `PURLIN_STEP_500_REF` / `#REF!`.
- Length 24 m and height 5 m are accepted by general proven geometry validation.
- Height 6.21 m remains `UNKNOWN_DOMAIN`; no unsupported geometry is silently extrapolated.
- Real `22318` reaches `FrameSelector`, `PurlinCalculator`, `SecondarySteelCalculator`, `OpeningMassCalculator`, and `StructuralSummary` through `ProjectInput → adapter → calculateCore1`.
- The real-project test records deterministic Core 1 output but does not assert Excel parity where source values diverge.
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

- Vitest: 119 passed across 12 test files, including the new geometry and 22318 regression tests.
- TypeScript typecheck: passed.
- Vite production build: passed.
- Static dataset integrity: 25 passed, 0 manifest SHA mismatches.
- `git diff --check`: passed.
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
