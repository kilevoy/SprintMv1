# Core1Result V2 implementation report

## Scope

Implemented an additive public result projection for the frozen Core1 engine.
No selection formula, engineering calculation, D8/D68/D69 arithmetic, UI,
EnclosureCore, Core2 or commercial total was changed.

The success result now has two parallel views:

- `canonical`: structured engineering data and explicit completeness/provenance;
- `excelOutput`: ordered legacy output sections and rows for intermediate
  calculator rendering.

All existing flat compatibility fields remain unchanged. In particular, the
old flat `bolts` shape remains unchanged; optional bolt quantities are present
only in the new projections where source evidence exists.

## Implemented contract

### Canonical view

`canonical.frameGrid` exposes:

- `automaticFrameStepM` from the existing D8 resolver result;
- `manualFrameStepOverrideM` from the existing D9 input;
- `effectiveFrameStepM` from the existing selected frame;
- `bayCount = ceil(length / effective step)`;
- `frameCount = bayCount + 1`.

`canonical.selectedSections` projects the existing beam, column, purlin,
secondary steel, plate and window-girt results without changing their
selection. `canonical.componentMasses` exposes independently calculated
values only. It reports `isComplete=false` and names unresolved component
mass classes; `knownMassKg` is not called a total mass.

`canonical.legacyCompatibility` exposes D8, D68 and D69 with units. D69 is
explicitly classified as a legacy compatibility/regression checkpoint and
not as canonical total structural mass.

### Legacy Excel view

`excelOutput.sections` preserves the requested section order:

1. `Подбор сечений` — 11 selected-section rows;
2. `Болты (по распоряжению №40)` — four bolt rows plus the M16 row;
3. `Фасонки` — `Вес фасонок, кг`;
4. `Проёмы` — gates, doors, window input echoes, D68 and D69 rows.

Every row has ordered `value1/value2/value3`, `unit`, `source_cell` and an
explicit status. Unsupported utilization or quantity remains `null`; no value
was fabricated.

## Deliberate boundaries

- Three non-ridge bolt quantities remain blank because the current source/API
  does not prove them.
- M16 preserves both the numeric quantity and raw legacy companion value
  (`200 кН`) without assigning that companion a new engineering meaning.
- Purlin utilization is blank because Core1 does not currently expose a proven
  selected utilization field.
- Component masses for ties, bracing, plates, bolts and most secondary members
  remain unknown; no zero was substituted.
- `excelOutput` is a rendering projection only. EnclosureCore must consume
  canonical fields and must not parse Excel labels or cell addresses.

## Validation

- Vitest: **224 passed** across 20 files;
- static integrity: **26 passed**;
- `npm run typecheck`: pass;
- `npm run build`: pass;
- `git diff --check`: pass, with only normal Git LF/CRLF conversion warnings.

## Final status

```text
CORE1_FORMULAS_CHANGED = NO
CANONICAL_RESULT_IMPLEMENTED = YES
LEGACY_EXCEL_OUTPUT_IMPLEMENTED = YES
LEGACY_SELECTED_SECTIONS_1_TO_1 = YES
LEGACY_BOLT_BLOCK_1_TO_1 = PARTIAL
LEGACY_OPENING_BLOCK_1_TO_1 = PARTIAL
FRAME_GRID_PUBLIC = YES
MAIN_FRAME_MASS_PUBLIC = YES
D8_PUBLIC_COMPATIBILITY = YES
D68_PUBLIC_COMPATIBILITY = YES
D69_PUBLIC_COMPATIBILITY = YES
OLD_FLAT_FIELDS_PRESERVED = YES
STRUCTURAL_CONTEXT_USES_CANONICAL_ONLY = YES
SAFE_TO_BUILD_INTERMEDIATE_CORE1_UI = YES
NEXT_STAGE = add a dedicated StructuralContext adapter from canonical fields,
then close source-proven bolt quantities and exact non-zero opening golden
projection cases before claiming complete Excel output parity
```

No commit or push was performed.
