# Enclosure wall geometry and support-step source audit

Audit-only result for the authoritative enclosure workbook and the current
Sprint M Core1 contract. No production resolver, ProjectInput, Core1, UI,
selector, replay, XLSX, commit or push was changed.

## Sources and evidence boundary

Primary evidence:

- `Калькулятор ограждайки v1.5 (1).xlsx`, SHA-256
  `4a9343a1e3149954dec0f91d5398528f18016a8423ec204ce2b92a59f612deaf`;
- current `src/project`, `src/core1`, `src/enclosure` contracts;
- real-project fixtures 22316, 22318 and 22329;
- existing Core1 audit artifacts and cached datasets.

Secondary evidence was inspected at `insicomet/SprintM`, commit
`7920b45979ed25e608310be6996ee63dfe680a5a`. It is not imported as Sprint M
authority.

## 1. Orientation and lengths

The engineering orientation is rectangular-building geometry:

| Orientation | Physical direction | Current candidate length | Evidence status |
|---|---|---|---|
| SIDE | along building length | `ProjectInput.geometry.building_length_m` | `PARTIAL`: consistent with the current adapter and engineering meaning, but legacy enclosure workbook has one manually entered B11 and no orientation selector |
| END | across the building | `ProjectInput.geometry.span_m` | `PARTIAL`: consistent with `end_wall_width_m` in the current boundary, but not separately proven by a legacy B11 branch |

In the authoritative workbook, `Лист1!B11` is a single literal. The typical
branch uses `Расчет Рядовая!B7 = Лист1!B11 - Расчет Угловая!C8`; the corner
branch uses B11 indirectly through the wall-zone calculation. There is no
separate SIDE/END input and no source formula that binds B11 to either B6 or
B7. Thus B11 must not be copied blindly into both orientations.

## 2. Height semantics

The current `ProjectInput.geometry.building_height_m` is a proven Core1 input
for frame selection, purlin/secondary calculations and domain validation. The
available Sprint M evidence does not prove that it means “height to the bottom
of the bearing roof structure” as opposed to another project elevation. The
enclosure workbook's `B12` is independently a manually entered wall-calculation
height.

Therefore:

- `BUILDING_HEIGHT_SEMANTICS = PARTIAL`;
- `SIDE_HEIGHT_FROM_BUILDING_HEIGHT = PARTIAL`;
- `B12` is not evidence that `building_height_m` is an eave height;
- an engineering resolver must expose a side-wall calculation height separately
  until the elevation reference is source-backed.

## 3. Ridge and roof slope

The current Sprint M repository proves roof type as an input (`двускатное` or
`односкатное`) but does not contain an authoritative ridge-height output or an
orientation-aware eave/ridge geometry result. Core1's current result exposes
frame profiles and secondary profiles, not roof slope or ridge elevation.

The secondary research repository contains a `defaultRoofSlopeDeg` rule of
15° for spans up to 21 m and 6° above 21 m, and uses `span / cos(slope)` for
rafter length. That is useful corroboration for a future geometry investigation,
but it is not primary proof for the enclosure wall-height contract. The same
research explicitly treats some high-side heights in single-slope examples as
manual inputs. Consequently:

- `ROOF_SLOPE_RULE = RESEARCH_ONLY`;
- `END_RIDGE_HEIGHT_MAPPING = NO`;
- no `rise = span/2*tan(slope)` or other ridge formula is authorized here;
- future END AUTO must be restricted or return `UNSUPPORTED` until ridge
  geometry is proven;
- `односкатное` must not receive a guessed high-side height.

## 4. B13 and support structure

`Лист1!B13` is the legacy post/support step used by the proven wall-girt
formulas. It is not automatically identical to frame step in every orientation.

### SIDE

The candidate mapping is:

```text
SIDE supportStep_m -> Core1.canonical.frameGrid.effectiveFrameStepM
```

This is `PARTIAL`, not `PROVEN`, because current parity evidence shows the
main-frame grid is the likely support line for long side walls, but the legacy
enclosure workbook accepts B13 as a manual literal and does not link it to the
Core1 frame grid. The adapter has not yet established that policy.

### END

The plausible support is gable/facade posts or another secondary grid. Current
Core1 exposes:

```text
selectedSections.facadePosts -> profile, steel, source cell, status
selectedSections.secondaryColumns -> profile, steel, source cell, status
```

It does not expose spacing, count, positions, or a support-grid identifier for
either result. The current secondary calculator chooses a gable-post profile,
but that is not a grid calculation. Therefore:

- `END_SUPPORT_STRUCTURE = gable/facade post system is plausible but unproven`;
- `END_SUPPORT_STEP_SOURCE = UNKNOWN`;
- `END_B13_TO_FRAME_GRID = NO`.

This is a Core1 → Enclosure contract gap. The minimal future Core1 extension is
not another profile field; it is a proven support-grid result, for example:

```text
facadePostGrid {
  spacing_m: number | null
  count: number | null
  positions_m: number[] | null
  status: PROVEN | UNKNOWN | UNSUPPORTED
}
```

Exact field names remain provisional until a source row/formula proves them.

## 5. Non-divisible lengths

Current Core1 calculates:

```text
bayCount = CEILING(building_length_m / effectiveFrameStepM)
frameCount = bayCount + 1
```

It does not currently return frame positions or the shortened last-bay length.
This produces a non-uniform physical grid whenever the division is not exact.

| Project | Length | Effective frame step | Ratio | Frame count | Grid conclusion |
|---|---:|---:|---:|---:|---|
| 22318 | 24 m | 4.0 m | 6.000 | 7 | uniform nominal side step is possible |
| 22316 | 30 m | 4.5 m | 6.667 | 8 | shortened final bay is required; positions unavailable |
| 22329 | 26 m | 6.0 m | 4.333 | 6 | shortened final bay is required; positions unavailable |

`UNIFORM_SIDE_SUPPORT_STEP = PARTIAL`. A single scalar is sufficient only when
the legacy enclosure formula intentionally models nominal spacing. It is not a
complete physical support description for the non-divisible cases.

## 6. Zone input completeness

The proven corner/typical formulas themselves are not changed:

- corner length is derived from wind-zone geometry, building height and post
  step;
- typical length is wall calculation length minus corner length;
- corner bracket quantity and typical bracket quantity retain their distinct
  replay formulas.

Input readiness by orientation:

| Case | Status | Missing/provisional input |
|---|---|---|
| SIDE corner | `PARTIAL` | side calculation height and B13 policy |
| SIDE typical | `PARTIAL` | side calculation height and B13 policy |
| END corner | `NO` | end/ridge height and end support grid |
| END typical | `NO` | end/ridge height and end support grid |

## 7. Real-project geometry matrix

Only values present in current fixtures are reported. No roof slope, ridge
height, wall-height interpretation or end support step is fabricated.

| Project | Span | Length | Core1 building height | Effective frame step | Roof type | Side length candidate | End length candidate | Side height | End height | Side step | End step |
|---|---:|---:|---:|---:|---|---|---|---|---|---|---|
| 22318 | 15 | 24 | 5 | 4.0 | двускатное | 24 | 15 | UNKNOWN | UNKNOWN | 4.0 candidate | UNKNOWN |
| 22316 | 18 | 30 | 5 | 4.5 | двускатное | 30 | 18 | UNKNOWN | UNKNOWN | 4.5 candidate | UNKNOWN |
| 22329 | 12 | 26 | 4 | 6.0 | двускатное | 26 | 12 | UNKNOWN | UNKNOWN | 6.0 candidate | UNKNOWN |

The “candidate” labels mean current engineering projection only; they are not
legacy Excel proof. The enclosure source would need separate SIDE and END
recalculation cases to turn them into `PROVEN` mappings.

## 8. Secondary research comparison

| Research rule | Classification | Reason |
|---|---|---|
| BuildingGeometry has span, length, height, framePitch and roofSlope | `CORROBORATED` | aligns with the separation needed by the current boundary, but not a Sprint M source formula |
| frame count = ceiling(length / pitch) + 1 | `CORROBORATED` | identical to current Core1 calculation; source authority remains Core1 dataset/implementation |
| shortened/widened bays require more than one scalar step | `RESEARCH_ONLY` | relevant warning; not yet proven in Sprint M enclosure source |
| 15° / 6° default roof slope rule | `RESEARCH_ONLY` | external research only; not authorized for ridge calculation |
| single-slope high-side height may be manually entered | `RESEARCH_ONLY` | supports refusing a guessed high-side height, but is not Sprint M evidence |
| `height - 0.07` column geometry | `NOT_APPLICABLE` | frame-member geometry, not proven wall-girt height semantics |

## 9. Audit-only resolver contract

```text
ResolvedWallGeometry {
  orientation: SIDE | END
  wallCalculationLength_m: number
  wallCalculationHeight_m: number | null
  support: {
    mode: UNIFORM_STEP | POSITIONS | UNKNOWN
    step_m?: number | null
    positions_m?: number[] | null
    source: CORE1 | MANUAL_OVERRIDE | UNKNOWN
  }
  roof: {
    type: двускатное | односкатное
    ridgeHeight_m?: number | null
    status: PROVEN | UNSUPPORTED | UNKNOWN
  }
  provenance: string[]
}
```

The current AUTO selector accepts only `postStep_m`. If positions are required
for a non-divisible support grid, the selector/replay contract is a limitation
that must be addressed in a later design step; it is not silently solved here.

## Final status

```text
SIDE_WALL_LENGTH_MAPPING = PARTIAL
END_WALL_LENGTH_MAPPING = PARTIAL
BUILDING_HEIGHT_SEMANTICS = PARTIAL
SIDE_WALL_HEIGHT_MAPPING = PARTIAL
ROOF_SLOPE_RULE = RESEARCH_ONLY
END_RIDGE_HEIGHT_MAPPING = NO
SIDE_B13_TO_FRAME_GRID = PARTIAL
END_B13_TO_FRAME_GRID = NO
CORE1_END_WALL_SUPPORT_GRID_AVAILABLE = NO
CORE1_CONTRACT_EXTENSION_REQUIRED = YES
UNIFORM_SIDE_SUPPORT_STEP = PARTIAL
SIDE_CORNER_ZONE_INPUTS_COMPLETE = PARTIAL
SIDE_TYPICAL_ZONE_INPUTS_COMPLETE = PARTIAL
END_CORNER_ZONE_INPUTS_COMPLETE = NO
END_TYPICAL_ZONE_INPUTS_COMPLETE = NO
WALL_GEOMETRY_RESOLVER_CONTRACT_PROVEN = PARTIAL
SAFE_TO_IMPLEMENT_SIDE_RESOLVER = NO
SAFE_TO_IMPLEMENT_END_RESOLVER = NO
SAFE_TO_START_PROJECTINPUT_AUTO_WIRING = NO
```

### Missing evidence

1. A source-backed distinction between SIDE and END calculations in the
   enclosure workbook, including whether B11/B12/B13 are manually changed per
   orientation.
2. The authoritative semantics of `building_height_m` as eave/column height.
3. A proven ridge-height source or roof-slope formula for двускатное.
4. A proven single-slope high-side input policy.
5. End-wall/facade-post support spacing, count or positions.
6. Core1 frame positions/last-bay policy for non-divisible lengths.

### Next stage

Obtain one or more authoritative SIDE and END enclosure recalculations with
the same project geometry, plus a Core1/source record for facade-post grid and
frame positions. Then close the resolver contract before wiring AUTO from
ProjectInput.

