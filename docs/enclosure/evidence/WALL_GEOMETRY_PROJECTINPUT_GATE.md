# EnclosureCore — ProjectInput geometry gate

Status: `BLOCKED_BEFORE_AUTO_WIRING`

This gate records the evidence boundary for the next EnclosureCore stage. The
existing `WallGeometryResolver`, `AutoWallGirtSelector`, and
`ManualWallGirtReplay` remain unchanged. No ProjectInput field is silently
connected to a legacy B11/B12/B13 control.

## Mapping status

| Field / relation | Status | Evidence conclusion |
|---|---|---|
| ProjectInput → SIDE wall length | PARTIAL | `building_length_m` is a candidate, but the source workbook's B11 orientation/meaning is not fully proven. |
| ProjectInput → END wall length | PARTIAL | `span_m` is a candidate; no primary source closes the END mapping. |
| ProjectInput → SIDE calculation height | PARTIAL | `building_height_m` is a candidate only; B12 is not equivalent by proof. |
| ProjectInput → END calculation height | UNKNOWN | Ridge/eave datum and end-wall height formula are absent. |
| ProjectInput → B11 | PROVEN_FOR_V15_FAMILY | Two independent project pairs show SIDE/longitudinal `B11=building_length` and END `B11=span`; this remains scoped to the audited calculator family. |
| ProjectInput → B12 | UNKNOWN | B12 is a single manual wall calculation height; global building height substitution is forbidden. |
| ProjectInput → B13 | PARTIAL | Comparable to a scalar support step in selected cases, but its physical mapping is not proven. |
| effective frame step → SIDE support | PARTIAL | Real projects expose a matching scalar step, but frame positions are not available. |
| frame step/positions → END support | UNKNOWN | Facade/gable post grid and positions are not exposed. |
| `cornerHalfLength` | PROVEN only when explicit | The C8 formula is proven; deriving its input from ProjectInput is not. |
| corner/typical zone formulas | PROVEN | Existing explicit resolver and manual replay reproduce the audited C8/C8 typical path. |

## Safe implementation boundary

The following path is implemented and testable only when a caller supplies an
evidence-backed explicit geometry fixture:

```text
explicit wall length + height + cornerHalfLength + support step
  → WallGeometryResolver
  → corner/typical zone lengths
  → explicit wall-girt runtime input
  → AutoWallGirtSelector or ManualWallGirtReplay
  → rows, profile length, brackets, mass
```

The ordinary `ProjectInput` adapter must not create those explicit values until
the unknown mappings are closed by primary workbook or real-project evidence.
The minimal cold profiled-sheet/SP20/no-stud/no-opening branch is therefore
not yet safe to expose as a normal ProjectInput calculation.

## Required primary evidence to unblock

At minimum, an independently checked fixture must provide:

1. orientation-specific side and end wall calculation lengths;
2. side and end calculation heights with their datum definitions;
3. the source cells/formulas and cached values for B11, B12 and B13;
4. effective frame step **and** frame positions, or an explicit proof that a
   uniform scalar grid is valid for the branch;
5. end/facade support step and positions;
6. the source of `cornerHalfLength` for each orientation;
7. source workbook SHA-256, project identity, roof type, climate branch and
   exact cell/range provenance for every value.

Until these fields are present and independently replayed, a typed diagnostic
is safer than an automatic enclosure result.

## New evidence: same-family orientation pair

The two 21604 calculator workbooks now provide an independent cross-check. The
`торец продольная` variant has `B11=48`, `B12=7.5`, `B13=5.35`; the `торец`
variant has `B11=18`, `B12=9.75`, `B13=6`, while both share `B6=18`, `B7=48`
and `B8=9.75`. Their local formulas are structurally identical, but the
selected wall controls and cached zone results differ. This confirms that B11
is orientation/selection state and that B12/B13 are independent controller
values. It strengthens the gate and rules out direct universal substitution of
`ProjectInput` dimensions; it does not yet supply a general side/end mapping.

## Second independent project pair: 22317

The same orientation split is reproduced in the 22317 workbooks:

| Orientation | `B11` | `B12` | `B13` | `B6/B7/B8` |
|---|---:|---:|---:|---|
| longitudinal wall | 45 | 6.8 | 6 | 12 / 45 / 7.4 |
| end wall | 12 | 7.4 | 6 | 12 / 45 / 7.4 |

Together with 21604 this proves a limited B11 rule for this workbook family:
side/longitudinal length equals building length and end-wall length equals
span. It does **not** close the gate for B12 (side wall height differs from
global height in both projects) or for a universal B13 rule. End support
positions and the height datum remain absent.

## Third independent pair: Kargaleyka

The Kargaleyka pair adds another controlled comparison:

| Orientation | `B11` | `B12` | `B13` | global `B6/B7/B8` |
|---|---:|---:|---:|---|
| length 30 m | 30 | 4.8 | 6 | 12 / 30 / 6.5 |
| end 12 m | 12 | 6.5 | 4 | 12 / 30 / 6.5 |

This makes the limited B11 mapping reproducible in three project pairs, while
showing that both B12 and B13 vary by orientation and project. They must remain
explicit controls until a primary datum/grid rule is found.

Across all six orientation workbooks in the matrix, `Лист1!B11`, `B12`, and
`B13` are literal cached inputs (no formulas in those cells). This confirms
that the unresolved values are manual project/controller state, not missing
formula links that can safely be reconstructed by the adapter.

The implementation now exposes `resolveProjectV15WallGeometry`: it applies only
the proven `B11` length mapping and still requires explicit `B12`, `B13`, and
`B7/e` controls. It is not a general ProjectInput adapter.

`calculateProjectV15WallGirt` now routes a `ProjectInput` through that same
boundary and returns `ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED` until the explicit
AUTO runtime is supplied. This is the proven orchestration boundary, not a
claim that ordinary ProjectInput alone contains all wall controls.
