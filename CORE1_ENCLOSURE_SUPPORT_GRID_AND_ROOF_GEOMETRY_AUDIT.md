# Core1 → Enclosure support grid and roof geometry source-closure audit

Audit-only report. No production, Core1, ProjectInput, Enclosure, selector or
UI changes were made. No XLSX was modified and no commit/push was performed.

## Evidence used

- primary frame extraction under `core1/data/frame_*_cells.csv`;
- primary secondary-output extraction `core1/data/secondary_steel_rules.csv`;
- current Core1 result/engine contracts and real-project fixtures 22316, 22318,
  22329;
- authoritative enclosure workbook audit and previous wall-geometry audit.

The primary frame extraction contains frame-count/quantity formulas, but not a
coordinate list. The primary secondary extraction contains the gable-post
profile branch, but not a post-grid calculation.

## A. Main frame longitudinal grid

### Proven primary formulas

For the 9–21 m frame families, the extracted workbook formula pattern is:

```text
Y[row] = CEILING(AA[row] / D[row]) - 1
Z[row] = CEILING(AA[row] / D[row]) + 1
```

Examples:

| Source | Formula | Cached meaning |
|---|---|---|
| `15м!Y6` | `CEILING(AA6/D6)-1` | intermediate frame/bay quantity |
| `15м!Z6` | `CEILING(AA6/D6)+1` | frame count |
| `18м!Y6` | `CEILING(AA6/D6)-1` | intermediate frame/bay quantity |
| `18м!Z6` | `CEILING(AA6/D6)+1` | frame count |
| `24м!X6` | `CEILING(Z6/C6)-1` | intermediate quantity |
| `24м!Y6` | `CEILING(Z6/C6)+1` | frame count |

`AA[row]`/`Z[row]` are the extracted length controllers and `D[row]`/`C[row]`
are the corresponding step controllers. These formulas prove count rounding,
not physical placement.

No primary formula was found that produces:

- `positionsM[]`;
- `bayLengthsM[]`;
- a redistributed `length / bayCount` step;
- first/last-bay adjustments;
- opening-dependent frame coordinates.

Therefore the only safe classification is:

```text
FRAME_POSITIONING_RULE = UNKNOWN
CORE1_MAIN_FRAME_POSITIONS_PROVEN = NO
CORE1_MAIN_FRAME_GRID_EXTENSION_REQUIRED = YES
```

The current Core1 implementation reproduces the proven count rule:

```text
bayCount = CEILING(building_length_m / effectiveFrameStepM)
frameCount = bayCount + 1
```

That is not evidence that the physical rule is A, B, C or D. In particular,
22316 and 22329 are non-divisible cases:

| Project | Length | Effective step | Ratio | Bay count | Frame count | Positions |
|---|---:|---:|---:|---:|---:|---|
| 22318 | 24 m | 4.0 m | 6.000 | 6 | 7 | not present in source |
| 22316 | 30 m | 4.5 m | 6.667 | 7 | 8 | not present in source |
| 22329 | 26 m | 6.0 m | 4.333 | 5 | 6 | not present in source |

The last-bay shape for the latter two must remain unknown. A future contract
should prefer positions/bay lengths, but they cannot be populated from current
primary evidence.

## B. End/gable support grid

The extracted authoritative output branch is:

```text
вывод!D41 = IF(D4>21,
  IF(E8>E9, подбор!AI15, подбор!AI14),
  IF(D6<3, "кв. 120х4", "кв. 160х4")
)
вывод!E41 = steel value, cached С245
```

This proves a selected gable/facade-post profile and steel grade. It does not
prove that the output is a wall-girt support grid, nor does it provide:

- quantity;
- spacing;
- positions;
- bay lengths;
- a relation to openings;
- a separate end-wall scheme.

Current Core1 exposes this as `selectedSections.facadePosts` / `gable_posts`
with profile, steel, source cell and status only. Consequently:

```text
FACADE_POST_PROFILE_PROVEN = YES
FACADE_POST_COUNT_PROVEN = NO
FACADE_POST_STEP_PROVEN = NO
FACADE_POST_POSITIONS_PROVEN = NO
END_B13_SOURCE = UNKNOWN
CORE1_END_SUPPORT_GRID_EXTENSION_REQUIRED = YES
```

The name `facadePosts` is not sufficient to equate it with `Лист1!B13`.
Opening-dependent post placement is also not proven. No source rule was found
for gates, doors or windows changing a gable-post grid.

## C. Roof/eave/ridge geometry

The primary Sprint M frame extraction contains fixed geometry-derived mass and
length calculations, but no authoritative slope/ridge chain. Search of the
primary extracted frame datasets found no source formula using `SIN`, `TAN`,
`COS`, `PI`, `3.14`, or an explicit roof-angle cell that can be connected to
the wall height contract.

Thus:

```text
PRIMARY_ROOF_SLOPE_RULE = NO
BUILDING_HEIGHT_DATUM = PARTIAL
EAVE_HEIGHT_SOURCE = not proven
ROOF_SLOPE_SOURCE = not proven
RIDGE_RISE_FORMULA = NO
RIDGE_HEIGHT_FORMULA = NO
```

`ProjectInput.geometry.building_height_m` is authoritative for current Core1
frame selection and domain validation, but its architectural datum—floor to
eave, underside of rafter, column top, or another elevation—is not established
by the available primary source. It must not be used as END/ridge height by
assumption.

The secondary research hypothesis 15° for spans up to 21 m and 6° above 21 m
remains research-only. It cannot be promoted to primary Sprint M policy.

The `0.07 m` eave offset is not present in the primary Sprint M evidence used
here:

```text
EAVE_OFFSET_PRIMARY_EVIDENCE = NO
EAVE_OFFSET_RELEVANT_TO_WALL_HEIGHT = UNKNOWN
```

It must not be added to or subtracted from enclosure wall height.

For `двускатное`, ridge geometry remains unproven. For `односкатное`, the
high-side datum is likewise unproven and must remain:

```text
SINGLE_SLOPE_WALL_GEOMETRY = UNSUPPORTED
```

## D. Legacy parity versus engineering geometry

These are intentionally separate modes:

| Mode | Meaning | Current status |
|---|---|---|
| LEGACY PARITY MODE | replay the enclosure workbook's single scalar B13, B11 and B12 inputs | restricted AUTO formulas are proven for explicit runtime inputs |
| ENGINEERING GEOMETRY MODE | use actual support positions, bay lengths, orientation-specific wall heights and roof geometry | not source-closed |

`LEGACY_AUTO_SCALAR_SUPPORT_STEP_VALID = PARTIAL`: valid for reproducing the
legacy formula contract because the source itself consumes a scalar B13; not
proven as a complete physical support model.

`ENGINEERING_SUPPORT_GRID_REQUIRES_POSITIONS = YES` for non-divisible grids if
the engineering model is expected to describe actual support geometry.

## E. Audit-only proposed contract

```text
ResolvedWallGeometry {
  orientation: SIDE | END
  wallLengthM: number
  wallHeightM: number | null
  supports: {
    mode: POSITIONS | UNIFORM_STEP | UNKNOWN
    positionsM: number[] | null
    bayLengthsM: number[] | null
    nominalStepM: number | null
    source: CORE1 | MANUAL_OVERRIDE | UNKNOWN
  }
  roof: {
    type: двускатное | односкатное
    eaveHeightM: number | null
    ridgeHeightM: number | null
    status: PROVEN | UNKNOWN | UNSUPPORTED
  }
  cornerZoneLengthM: number | null
  typicalZoneLengthM: number | null
  provenance: string[]
}
```

This contract is deliberately not an implementation request. The current AUTO
selector can continue to accept `postStep_m` in legacy parity mode; it is not
enough for a future position-aware engineering mode.

## Final status

```text
FRAME_POSITIONING_RULE = UNKNOWN
CORE1_MAIN_FRAME_POSITIONS_PROVEN = NO
CORE1_MAIN_FRAME_GRID_EXTENSION_REQUIRED = YES

FACADE_POST_PROFILE_PROVEN = YES
FACADE_POST_COUNT_PROVEN = NO
FACADE_POST_STEP_PROVEN = NO
FACADE_POST_POSITIONS_PROVEN = NO
END_B13_SOURCE = UNKNOWN
CORE1_END_SUPPORT_GRID_EXTENSION_REQUIRED = YES

PRIMARY_ROOF_SLOPE_RULE = NO
BUILDING_HEIGHT_DATUM = PARTIAL
RIDGE_RISE_FORMULA = NO
RIDGE_HEIGHT_FORMULA = NO
EAVE_OFFSET_PRIMARY_EVIDENCE = NO
EAVE_OFFSET_RELEVANT_TO_WALL_HEIGHT = UNKNOWN

SIDE_LENGTH_MAPPING = PARTIAL
SIDE_HEIGHT_MAPPING = PARTIAL
SIDE_SUPPORT_MAPPING = PARTIAL
END_LENGTH_MAPPING = PARTIAL
END_HEIGHT_MAPPING = NO
END_SUPPORT_MAPPING = NO

LEGACY_AUTO_SCALAR_SUPPORT_STEP_VALID = PARTIAL
ENGINEERING_SUPPORT_GRID_REQUIRES_POSITIONS = YES

SAFE_TO_IMPLEMENT_SIDE_WALL_GEOMETRY_RESOLVER = NO
SAFE_TO_IMPLEMENT_END_WALL_GEOMETRY_RESOLVER = NO
CORE1_CONTRACT_EXTENSION_REQUIRED = YES
CORE1_CONTRACT_EXTENSION_FIELDS = frameGrid.positionsM, frameGrid.bayLengthsM, facadePostGrid.status/count/positionsM/bayLengthsM
NEXT_STAGE = obtain primary SIDE/END recalculation evidence and close frame/facade grids plus eave/ridge datum before any wiring
```

## Addendum: project 489593-2025 primary geometry oracle

The earlier conclusions above were made **before the real-project primary
oracle** for project 489593-2025 became available. That project-specific
evidence proves a divisible side frame grid `[0, 6, 12, 18, 24, 30]` m and a
major end grid `[0, 6, 12, 18]` m, plus a 4.7 m datum to the bottom of
projecting structures and a 15° roof slope.

It does not overturn the general conclusions: the project has additional
fakhwerk and gate supports of different profiles and lengths, so a complete
end support grid is not a single uniform step. The two ridge levels are drawn
structural levels only; neither is selected as an enclosure wall calculation
height. The evidence is not sufficient for general B11/B12/B13 mappings,
non-divisible frame positioning, or automatic ProjectInput wiring.

Updated classification:

```ini
REAL_PROJECT_489593_SIDE_GRID = PROVEN
REAL_PROJECT_489593_END_MAJOR_GRID = PROVEN
REAL_PROJECT_489593_SUPPORT_GRID = PARTIAL
REAL_PROJECT_489593_HEIGHT_DATUM = PROVEN_PROJECT_SPECIFIC
REAL_PROJECT_489593_ROOF_SLOPE = PROVEN_PROJECT_SPECIFIC
GENERAL_FRAME_POSITIONING_RULE = NOT_PROVEN
GENERAL_END_SUPPORT_GRID_RULE = NOT_PROVEN
GENERAL_ROOF_SLOPE_RULE = NOT_PROVEN
SAFE_TO_IMPLEMENT_PROJECT_489593_GEOMETRY = NO
SAFE_TO_IMPLEMENT_GENERAL_SIDE_RESOLVER = NO
SAFE_TO_IMPLEMENT_GENERAL_END_RESOLVER = NO
SAFE_TO_START_PROJECTINPUT_AUTO_WIRING = NO
```
