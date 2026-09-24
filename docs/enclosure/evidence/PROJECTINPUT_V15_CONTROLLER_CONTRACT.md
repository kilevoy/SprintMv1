# ProjectInput → EnclosureCore v1.5 controller contract

This contract describes the only currently proven bridge from `ProjectInput`
to the v1.5 enclosure calculator. It does not change the source workbooks and
does not infer engineering values that are stored as literal controller cells.

## Inputs

```ts
type Orientation = "SIDE" | "END";

interface V15WallControllers {
  orientation: Orientation;
  wallCalculationHeight_m: number; // Лист1!B12
  supportStep_m: number;           // Лист1!B13
  cornerHalfLength_m: number;      // Расчет Угловая!B7 / local wind branch
  provenance: EnclosureProvenance[];
}
```

The `B11` equivalent is derived only by the audited v1.5 rule:

| Orientation | derived wall length |
|---|---|
| `SIDE` | `ProjectInput.geometry.building_length_m` |
| `END` | `ProjectInput.geometry.span_m` |

This mapping is supported by the 21604, 22317, and Kargaleyka orientation
pairs. It is scoped to the audited v1.5 workbook family.

## Explicitly forbidden substitutions

- `ProjectInput.geometry.building_height_m → B12`;
- `ProjectInput.geometry.frame_step_override_m → B13`;
- automatic derivation of `cornerHalfLength_m` from rounded geometry;
- inferred facade-post positions or end-wall support grids.

All six audited workbooks contain literal `B11`, `B12`, and `B13` inputs. The
height and post-step values vary by orientation and project, so they must be
provided by a checked controller fixture or a future user input contract.

## Runtime boundary

`calculateProjectV15WallGirt` accepts `ProjectInput`, orientation, these
explicit controllers, and a proven AUTO runtime. It returns:

- `PROVEN` with corner/typical zone result, rows, profile length and mass;
- `UNSUPPORTED` with `ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED` when the runtime
  is absent;
- `INVALID` for malformed controller or geometry values.

The current supported engineering branch remains cold profiled sheet, SP20,
no additional studs, and no openings. Other branches must return typed
diagnostics until their primary formulas are audited.

For saved projects the controllers may be persisted under
`project.enclosure.wall_geometry.SIDE` / `.END`. The parser validates their
positive numeric values and provenance; absence remains a normal unsupported
state, never an invitation to infer values.

## Status

`B11_ORIENTATION_MAPPING = PROVEN_FOR_V15_FAMILY`

`B12_MAPPING = EXPLICIT_ONLY`

`B13_MAPPING = EXPLICIT_ONLY`

`PROJECTINPUT_AUTO_ENCLOSURE = NOT_YET_GENERAL`
