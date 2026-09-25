# Core 2 — first profiled-sheet end-to-end path

## Proven slice

The fixture `project-wall-girt-core2-no-stud-v15.json` closes one restricted
path from an explicit `ProjectInput` through both wall orientations:

```text
ProjectInput
  → persisted v1.5 B12/B13/e controllers
  → SIDE or END wall length
  → corner / typical zone geometry
  → SP20/no-stud AUTO selector
  → manual quantity replay
  → profile length, brackets and wall-girt mass
  → profiled-sheet/trim/fastener quantities
```

The source-backed fixture selects `[]ПП 145x45x1,5` at 1.36 m, seven rows,
84 m of profile and 14 brackets. The known zone mass is `469.8288 kg` for
the tested corner branch.

`calculateCore2ProfiledSheetScenario` now composes the two proven wall-girt
replays (`SIDE` and `END`) with the takeoff. It refuses non-SP20, opening and
plus-stud inputs before producing an enclosure result. The composition does
not infer B12/B13/e controllers; they must remain persisted/proven inputs.

For exact mass replay the caller may provide the source-backed marks
`С-18 0,5мм` (wall) and `С-44 0,7мм` (roof) through the explicit
`profiledSheetProfiles` override. The generic ProjectInput selector
`"профлист"` is intentionally not treated as proof of a specific roof mark.

The archived profiled-sheet formulas are replayed separately by
`calculateProfiledSheetTakeoff`: wall sheet, roof deck/sheet, corner/ridge/
gable trims, seals and wall/roof fasteners. Their source cells and expected
values are recorded in `profiled-sheet-takeoff-archive-fixture.json`.

## Boundary

This is not a complete enclosure calculation. It deliberately excludes:

- openings;
- additional studs;
- the ridge-seal unit mass (the archived `12м!H80` cells are blank; all other
  proven line masses are replayed from the H column);
- opening deductions and trim framing;
- commercial costs and price-version selection;
- automatic inference of B12/B13/e from ordinary ProjectInput dimensions;
- normative branches other than SP20.

Missing controllers, climate, openings or unsupported branches return typed
diagnostics. No zero or nearest-value fallback is used.

The takeoff is also not executed when an explicit manual/AUTO wall-girt
configuration requests additional studs; that branch returns the existing
typed plus-stud diagnostic instead of silently mixing domains.

`PRODUCTION_CODE_CHANGED = YES`
`XLSX_CHANGED = NO`
