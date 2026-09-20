# Restricted AUTO wall-girt selector core

Implementation scope: pure mathematical selector core only. The selector does
not access `ProjectInput`, Core1, UI, XLSX, or the project-file serializer.

## Result

```text
AUTO_SELECTOR_CORE = YES
PROJECTINPUT_WIRING = NO
NO_STUD_ONLY = YES
R_FALSE_EXCLUDED = YES
```

The production module is:

```text
src/enclosure/autoWallGirtSelector.ts
```

It consumes the extracted evidence dataset and an explicit
`AutoWallGirtRuntimeInput`. It preserves source-row traversal order and the
Excel step axis. It never sorts candidates.

## Exact implementation

Implemented source-equivalent components:

- four raw capacity families: static, literal arithmetic, `W[prior]*1`, and
  `W[prior]*P6`;
- source wind tables for `kZe`, `zeta`, aerodynamic coefficients, `gamma_f`,
  responsibility and area reduction;
- dynamic `X`, `AD6`, utilization and full `JW` gates;
- `999999999` invalid-objective behavior through exclusion from the eligible
  set;
- full objective including both profile-mass terms, bracket term, source-order
  term, `-step/1e9`, and stud term;
- Excel-equivalent first-minimum behavior from source order and step order;
- `NO_STUD` provenance and explicit selected-candidate result;
- adapter to the existing `replayManualWallGirt()` implementation.

No quantity, profile-length, profile-mass, bracket-count, bracket-mass or
manual replay formula was duplicated in the selector.

## Golden parity

| branch | expected row | actual row | expected step | actual step | expected objective | actual objective |
|---|---:|---:|---:|---:|---:|---:|
| CORNER | 161 | 161 | 1370 mm | 1370 mm | 233.41455363 | 233.41455363000006 |
| TYPICAL | 46 | 46 | 1380 mm | 1380 mm | 188.57523862 | 188.57523862 |

Floating-point difference in the corner value is below the test tolerance and
comes only from JavaScript number arithmetic.

## Tests

`src/enclosure/autoWallGirtSelector.test.ts` covers:

- corner golden result;
- typical golden result;
- deterministic repeat;
- explicit SP20/no-stud restriction;
- selected result → existing manual replay;
- exact selected step and tie-break term;
- unsupported no-candidate behavior without fallback.

The audit-only Python replay remains the independent 5,020-cell check:

```text
10 additional candidate rows × 251 steps × 2 branches
UTILIZATION_MISMATCHES = 0
JW_MISMATCHES = 0
```

## Provenance and architecture boundary

Every selected candidate returns:

```text
sourceRow
sourceSheet
branch = NO_STUD
designation / profile
sectionType
material
step_mm
profileMass_kg_m
sectionMass_kg_m
objective
objectiveTerms
utilization
capacityValue
jw = 1
provenance.status = LEGACY_PROVEN
```

The selector intentionally requires explicit values for wall calculation
height, wall calculation length and post/support step. It does not implement:

- SIDE/END height derivation;
- ridge-height calculation;
- `B12 → building_height_m` mapping;
- `B13 → effectiveFrameStep_m` mapping;
- wall-system → insulation inference;
- ProjectInput filter policy;
- plus-stud (`R=FALSE`) branch;
- UI or Core1 wiring.

The future `WallGeometryResolver` remains responsible for supplying distinct
side/end wall calculation heights.

```text
SIDE_END_GEOMETRY_WIRING = NOT_IMPLEMENTED_BY_DESIGN
SAFE_TO_BUILD_WALL_GEOMETRY_ADAPTER = YES
```

## Final status

```text
JW_PARITY = PASS
CORNER_ROW_EXPECTED = 161
CORNER_ROW_ACTUAL = 161
CORNER_STEP_EXPECTED = 1370
CORNER_STEP_ACTUAL = 1370
CORNER_OBJECTIVE_EXPECTED = 233.41455363
CORNER_OBJECTIVE_ACTUAL = 233.41455363000006
TYPICAL_ROW_EXPECTED = 46
TYPICAL_ROW_ACTUAL = 46
TYPICAL_STEP_EXPECTED = 1380
TYPICAL_STEP_ACTUAL = 1380
TYPICAL_OBJECTIVE_EXPECTED = 188.57523862
TYPICAL_OBJECTIVE_ACTUAL = 188.57523862
TIE_BREAK_PARITY = PASS
MANUAL_REPLAY_REUSED = YES
CORE1_CHANGED = NO
UI_CHANGED = NO
PROJECTINPUT_CHANGED = NO
```

The restricted selector core is ready for a later explicit geometry/input
adapter. Full enclosure calculation remains incomplete and unknown components
remain unknown.
