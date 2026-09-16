# Sprint M — ProjectInput architecture

## Purpose

`ProjectInput` is the single source of truth for user-entered project data. The UI edits this model once. Core 1 receives only an explicit compatibility projection; future Core 2 will receive the same project model through its own adapter.

```text
ProjectInput
├─ Core1InputAdapter
│  └─ Core 1
└─ Core2InputAdapter
   └─ Core 2 (future)
```

The Core 2 adapter is intentionally not implemented in this phase.

## Where it lives

- Domain contract: `src/project/types.ts`
- Core 1 projection: `src/project/adapter.ts`
- Public exports: `src/project/index.ts`
- UI state: `projectInput` in `src/App.tsx`
- UI-only climate interaction state: `cityQuery`, `selectedCity`, `climatePreview`

`Core1Input` remains the compatibility contract of the existing engineering engine. It is not the form model.

## ProjectInput shape

```text
ProjectInput
├─ climate
│  ├─ CITY_LOOKUP: country, city, normative_system
│  └─ MANUAL: regions, loads, seismicity, source_note
├─ geometry
│  ├─ span_m, building_length_m, building_height_m
│  ├─ responsibility_factor
│  └─ frame_step_override_m
├─ envelope
│  ├─ roof_covering
│  ├─ roof_deck_grade
│  └─ wall_system
├─ openings[]
│  ├─ gate: id, width_mm, height_mm, quantity
│  ├─ door: id, width_mm, height_mm, quantity
│  ├─ window: id, width_mm, height_mm, quantity, window_type, glazing_construction
│  └─ strip_window: id, height_mm, length_mm, quantity, window_type, glazing_construction
├─ special_conditions
└─ other
```

Every opening has a stable ID. The UI can add, edit and delete multiple groups without creating parallel legacy fields.

## Field mapping

| Project field | UI | Core 1 | Core 2 | Transformation |
|---|---|---|---|---|
| `climate` | climate section | `climate` | climate/load consumers | direct typed projection |
| `geometry.span_m` | Пролёт | `span_m` | frame and BOM geometry | direct |
| `geometry.building_length_m` | Длина | `building_length_m` | area, quantities, BOM | direct |
| `geometry.building_height_m` | Высота | `building_height_m` | geometry and enclosure | direct |
| `envelope.roof_covering` | Покрытие | `roof_covering` | roof materials | direct |
| `envelope.roof_deck_grade` | Марка настила | `roof_deck_grade` | deck materials and cost | direct |
| `envelope.wall_system` | Стены | not passed | wall catalogue, panel area, BOM | retained only in ProjectInput for now |
| gate openings | dynamic gate rows | `D60`/`D61` equivalent counts | exact dimensions, quantities, BOM | count by verified 6 m dimension only |
| door openings | dynamic door rows | `D62` equivalent count | exact dimensions, BOM | sum quantities; dimensions retained |
| window openings | dynamic window rows | `D64:D67` where lossless | dimensions, framing, BOM | compatible groups aggregate; incompatible groups diagnostic |
| special conditions | additional conditions | corresponding legacy flags | secondary steel/BOM | direct |

## Opening projection rules

### Gates

The workbook exposes separate legacy inputs `вывод!D60` (“ворота до 6 м”) and `вывод!D61` (“ворота более 6 м”). The workbook does not expose gate width or height as a source input and the saved formulas do not prove which dimension controls the boundary. Therefore the adapter refuses to classify nonzero gate records unless an explicit, externally verified `gate_boundary_dimension` policy is supplied. It never silently assumes `width_mm`.

When the policy is supplied, `<= 6000 mm` maps to D60 and `> 6000 mm` maps to D61. Exactly 6000 mm belongs to the D60 branch.

### Doors

All door quantities sum to the legacy D62 equivalent. Door dimensions remain in `ProjectInput`; the legacy opening-mass formula uses only the count and frame step.

### Windows

Core 1 has one legacy window projection: height, strip length, separate-window count, type and glazing construction. Compatible window groups with identical legacy-relevant geometry/type/glazing are aggregated. Groups with incompatible height, width, type or glazing are rejected with `CORE1_OPENINGS_NOT_REPRESENTABLE`; they are not averaged, reordered or silently collapsed. A legacy strip branch cannot represent multiple strip groups or a strip quantity above one.

## Staleness policy

- climate, geometry, roof, special conditions, window fields and opening quantities mark a calculated result stale;
- wall system is persisted in ProjectInput but does not mark the numerical Core 1 result stale;
- gate and door dimensions do not mark a Core 1 result stale because the proven legacy calculation consumes category/count fields, not those dimensions;
- changing a gate quantity, door quantity or any representable window quantity affects the adapter projection and marks the result stale.

## Compatibility boundary

`projectInputToCore1Input()` returns a typed adapter result. Unsupported projection is reported before Core 1 runs. This keeps Core 1 semantics unchanged and leaves detailed dimensions available for the future Core 2 adapter.
