# Enclosure XLSX input/output contract audit

Audit-only snapshot of `Калькулятор ограждайки v1.5 (1).xlsx`.

- SHA-256: `4a9343a1e3149954dec0f91d5398528f18016a8423ec204ce2b92a59f612deaf`
- authoritative sheets: `Лист1`, `Расчет Угловая`, `Расчет Рядовая`, `несушки`, `Ветер по СП`, `Ветер по СП EN`
- production code, UI, ProjectInput and XLSX were not changed.

## Evidence boundary

The workbook is a legacy calculation workbook. Literal cells, list validations,
formula dependents and cached values were treated as evidence. A label or a
position alone was not treated as proof of engineering meaning. In particular,
`Лист1!B12` is a single manual wall-calculation height in this workbook; it is
not proven to be the project eave height, side-wall height, end-wall/ridge
height, or `ProjectInput.geometry.building_height_m`.

## 1. Inputs and controls

| Cell / range | Legacy label / value | Evidence-backed role | Class | Current mapping | Status |
|---|---|---|---|---|---|
| B2 | location / city text | city used by the external climate lookup in B17 | CLIMATE | `ProjectInput.climate.city` | PARTIAL |
| B3 | responsibility, `0.8` | responsibility factor used in wind pressure and candidate capacity | PROJECT_GEOMETRY / CLIMATE | `geometry.responsibility_factor`; `AutoWallGirtRuntimeInput.responsibility` | EXACT |
| B6 | span, `24 m` | building span; used by wind and geometry | PROJECT_GEOMETRY | `geometry.span_m` | EXACT |
| B7 | length, `24 m` | building length; used by wind and wall branches | PROJECT_GEOMETRY | `geometry.building_length_m` | EXACT |
| B8 | height, `10.5 m` | building height used by wind branch; wind sheet clamps it to `MAX(5,B8)` | PROJECT_GEOMETRY | `geometry.building_height_m` | DERIVED |
| B11 | wall length, `24 m` | legacy wall calculation length; used by typical zone `B7=B11-C8` | WALL_GEOMETRY | `ColdEnclosureInput.geometry.side_wall_length_m` only after resolver | PARTIAL |
| B12 | wall height, `9.3 m` | one manually entered wall-calculation height used by candidate rows and F49/F50 | WALL_GEOMETRY | no unambiguous field; future side/end resolver input | MISSING |
| B13 | post step, `6 m` | support/post spacing; used by corner length and row quantities | WALL_GIRT_CONTROL | `AutoWallGirtRuntimeInput.postStep_m` | PARTIAL |
| B16 | terrain, `В` | wind terrain category | CLIMATE | `ProjectInput.other.terrain_type` | EXACT |
| B17 | wind pressure, `0.3 kPa` | formula lookup by city/normative system; not an independent input | CLIMATE / LEGACY INTERNAL | `Core1ClimateResult.wind_load` | DERIVED |
| D17 | normative selection | list: SP 20 / SP RK EN branch | NORMATIVE_CONTROL | `ProjectInput.climate.normative_system` | PARTIAL |
| B18 | wall enclosure, `профнастил` | selects wall/cladding branch and manual/automatic-step branch | WALL_GIRT_CONTROL | `ProjectInput.envelope.wall_system`, restricted AUTO mode | PARTIAL |
| B19 | wall sheet, `С18-1150-0,5` | selected cladding/profile from list `P87:P92`; also feeds B11 lookup helper | PROFILE_FILTER | no canonical current field | LEGACY_ONLY |
| B22 | corner minimum step override, `0` | if non-zero, explicit corner step; otherwise B24 is derived | MANUAL_OVERRIDE | `AutoWallGirtRuntimeInput.minStep_mm`/`manualStepMode` only after policy | PARTIAL |
| B23 | corner maximum step override, `0` | helper/limit input; E23 is B22*100 | MANUAL_OVERRIDE | no direct field | LEGACY_ONLY |
| B24 | corner effective/max step, `1500 mm` | formula `IF(B22=0,INDEX(B109:B158,MATCH(E22,N109:N158,-1)),B22)` | LEGACY_INTERNAL_CONTROL | derived AUTO restriction | DERIVED |
| B27 | typical minimum step override, `0` | explicit typical step when non-zero; otherwise B29 is derived | MANUAL_OVERRIDE | `minStep_mm`/manual override only after policy | PARTIAL |
| B28 | typical maximum step override, `0` | helper/limit input; E28 is B27*100 | MANUAL_OVERRIDE | no direct field | LEGACY_ONLY |
| B29 | typical effective/max step, `1500 mm` | same derived step lookup for typical branch | LEGACY_INTERNAL_CONTROL | derived AUTO restriction | DERIVED |
| B32 | utilization override, `0` | zero means use candidate O; non-zero replaces it in X/JW | MANUAL_OVERRIDE | `utilizationOverride` | EXACT |
| B33 | max profile height, `145 mm` | candidate filter N <= B33 | PROFILE_FILTER | `maxProfileHeight_mm` | EXACT |
| B34 | min profile height, `145 mm` | candidate filter N >= B34 | PROFILE_FILTER | `minProfileHeight_mm` | EXACT |
| B35:B36 | min/max thickness, `любая` | candidate material/thickness filter; list validation | PROFILE_FILTER | `minThickness_mm`/`maxThickness_mm` | PARTIAL |
| V89:W94 | profile-family labels and booleans | W is used by INDEX/MATCH for candidate family filter | PROFILE_FILTER | `profileFamily` | PARTIAL |
| V97:W99 | steel/material labels and booleans | W is used by candidate material filter | MATERIAL_FILTER | `material` | PARTIAL |
| V102:W105 | section labels and booleans | W is used by candidate section filter | PROFILE_FILTER | `sectionType` | PARTIAL |
| V107:W107 | `Без стоек`, TRUE | selects no-stud branch; plus-stud is a different candidate path | WALL_GIRT_CONTROL | fixed `withoutStuds: true` in restricted AUTO | PARTIAL |

Validation evidence includes lists for B3, B16, B18, B19, D17 and B35:B36.
B11:B13 have no list validation, no note, and General number format; their
semantics therefore come from formulas/dependents, not UI metadata.

### Climate and wind chain

`Расчет Угловая!C3` and `Расчет Рядовая!C3` use a normative branch and the
wind-sheet result, multiplied by B3. `Ветер по СП!C4` = B16, C6 = B6, C7 =
B7, C8 = `MAX(5,B8)`, C9 = B17, C11/C12 are terrain/height lookups, and
F7/G7 are the corner/typical wind pressures. `Расчет Угловая!C3` uses the
corner pressure; `Расчет Рядовая!C3` uses the typical pressure. This is a
duplicate legacy climate source only at the workbook boundary. The future
enclosure boundary should consume `Core1ClimateResult` and terrain, not perform
a second city lookup.

### Wall-height warning

The workbook has one B12 value at a time. It does not prove whether a user
manually changes B12 between SIDE and END calculations. Therefore the future
engineering contract must keep `sideWallCalculationHeight_m` and
`endWallCalculationHeight_m` conceptually separate. A ridge-height derivation
is not present in this audit and must not be invented.

## 2. Visible outputs on `Лист1`

The active block is `B48:K51`; row 51 is a total/helper row.

| Cell | Formula / cached value | Proven semantics | Output class | Current contract |
|---|---|---|---|---|
| E24 | `='Расчет Угловая'!C8` / 12 m | corner zone length | ZONE_LENGTH | not exposed as Excel output |
| E29 | `='Расчет Рядовая'!C8` / 12 m | typical zone length | ZONE_LENGTH | not exposed as Excel output |
| B49:B50 | branch BGT7 / `[] С...` | selected profile designation, corner and typical | SELECTED_PROFILE | `AutoWallGirtSelectedCandidate.profile` / replay profile |
| C49:C50 | BGU7 / `С390`, `С350` | selected material/steel designation or workbook catalog label | OTHER | partially exposed as `material`; exact label not preserved |
| D49:D50 | BGS7 / 1370, 1380 mm | selected girt step | SELECTED_STEP | `step_mm` / `girtStep_m` |
| E49:E50 | BGR7 / kg/m | profile/section mass per metre from catalog | PROFILE_MASS | `sectionMass_kg_m` and `profileMass_kg_m` |
| F49:F50 | `CEILING(B12*1000/D,1)+IF(single,0,1)` / 7 | number of wall-girt rows | ROWS | replay `rows` |
| G49:G50 | corner `F*E24/B13`; typical `CEILING(F*ROUND(E29/B13,1),1)` / 14 | bracket/support quantity | BRACKET_QUANTITY | replay `bracketCount` |
| H49:H50 | `INDEX(AA...)*G` / 21 kg | bracket mass | BRACKET_MASS | replay `bracketMass_kg` |
| I49:I50 | `F*zoneLength*INDEX(Z...)` / 448.83, 359.15 kg | selected profile mass | PROFILE_MASS | replay `profileMass_kg` |
| K49:K50 | `INDEX(J...` / `[]` | section type used by row-count formula | SECTION_TYPE | `sectionType` |
| E51 | `SUM(E49:E50)` / 843.98 kg | displayed unit-mass total, not total profile mass | OTHER | no direct canonical field |

`D49:D50`, `F49:F50`, `G49:G50`, `H49:H50`, `I49:I50`, and `K49:K50`
are direct presentation formulas over selected row/catalog data. `E49:E50`
is the source catalog mass field; E51 is a legacy presentation total and is
not interchangeable with the calculated total profile mass.

The additional rows 54:73 are a fitting/connection presentation table. They
are not part of the selected two-zone wall-girt block and are not currently a
canonical enclosure result. Their source rows are catalog projections and
must be mapped separately before exposing them as a result.

## 3. Internal engineering outputs

The selector dataset and workbook helper columns carry: source row, objective,
step, JW, utilization, capacity W/X, designation/profile, material, section
type, thickness, profile height, section mass Z, profile mass TO, bracket mass
AA, zone lengths and row count. These are `CANONICAL_ENGINEERING_OUTPUT`
values for diagnostics and replay, even where the legacy visible sheet hides
them. The current `AutoWallGirtSelectedCandidate` already exposes most of this
set. A future `EnclosureExcelOutput` must preserve the ordered B49:K50 block
separately from the canonical candidate object.

## 4. Application mapping and ownership

### Current mapping

- EXACT: responsibility, span, length, terrain, utilization override, profile
  height limits, and selected candidate step/profile/section/rows/masses have
  direct or already-proven runtime representations.
- DERIVED: B8 wind height handling, B17 wind load, B24/B29 effective step,
  E24/E29 zone lengths, and candidate capacity/JW values.
- PARTIAL: wall length, post step, wall system, normative selector, thickness
  bounds, family/material/section filters, no-stud branch and B13 because the
  app has the value but not a proven policy for deriving it from the same
  workbook input.
- MISSING: an authoritative side/end wall-height resolver, exact B19 cladding
  contract, and an Excel-order output projection for the full block.
- LEGACY_ONLY: B23/B28 helper maximums, manual catalog selector presentation,
  fitting table presentation, and the raw B17 city-cache cell.

### Ownership matrix

| Parameter | Owner | Source of truth |
|---|---|---|
| city, country, span, building length, ordinary building height | PROJECT | ProjectInput |
| canonical snow/wind tuple | CORE1 | Core1ClimateResult |
| terrain and responsibility | PROJECT / CORE1 input | ProjectInput + Core1 contract |
| side/end wall calculation heights | WALL_GEOMETRY_RESOLVER | not yet proven from this workbook |
| effective structural post step | CORE1 | Core1 frame grid output, where applicable |
| selected wall-girt profile, step, filters, JW | ENCLOSURE_AUTO | restricted selector and evidence dataset |
| manual profile/step/zone override | MANUAL_OVERRIDE | explicit enclosure configuration |
| rows, profile length, bracket quantity/mass | ENCLOSURE_AUTO / replay | proven replay formulas |
| legacy ordered B49:K50 display | ENCLOSURE_AUTO projection | future EnclosureExcelOutput |

## 5. Duplicates and gaps

Duplicated sources are city/wind lookup state (B2/B17 versus Core1 climate),
responsibility multiplied into both Core1 and legacy wind pressure, and the
geometry values B6/B7/B8 versus the separate legacy wall block B11:B13.

The main gaps are: explicit orientation-aware wall heights; a proven mapping
from Core1 frame grid to B13; a canonical cladding/product field for B19;
complete filter policy for all selector checkboxes; and ordered Excel output
for the selected/fitting blocks. The current fields safe to reuse are project
span/length, terrain, responsibility, canonical wind load, selected candidate
metadata, and replay mass formulas.

## 6. Proposed next contract (not implemented)

```text
ColdEnclosureResult.canonical
  wallGirts: selected candidates + replayed engineering quantities
  unresolved: explicit unknown components

ColdEnclosureResult.excelOutput: EnclosureExcelOutput
  selectedWallGirts: ordered rows corresponding to B49:K50
  totals: ordered legacy totals corresponding to E51
  fittingRows: ordered rows corresponding to B54:F73
```

The projection must be a view of canonical results and must not recalculate
selection, capacity, quantity or mass. It must retain source cells, units,
status and provenance for every row.

## 7. Summary

| Metric | Result |
|---|---:|
| TOTAL_EXCEL_INPUTS | 29 logical cells/ranges |
| TOTAL_EXCEL_OUTPUTS | 18 audited cells in E24/E29 + B49:K51 |
| TOTAL_INTERNAL_CONTROLS | 4 selector groups + 8 helper/control cells |
| INPUTS_EXACTLY_MAPPED | 6 |
| INPUTS_DERIVED | 4 |
| INPUTS_PARTIAL | 11 |
| INPUTS_MISSING | 3 |
| INPUTS_LEGACY_ONLY | 5 |
| OUTPUTS_ALREADY_EXPOSED | 9 |
| OUTPUTS_MISSING_CANONICAL | 3 |
| OUTPUTS_LEGACY_PRESENTATION_ONLY | 6 |
| PROJECTINPUT_CHANGES_REQUIRED | NO |
| PROJECTINPUT_NEW_FIELDS_REQUIRED | none proven; orientation-aware wall-height resolver is required before a field decision |
| CORE1_CANONICAL_REUSE | wind load/region, terrain, responsibility, span/length/frame-grid where proven |
| COLDENCLOSURE_INPUT_NEW_FIELDS | sideWallCalculationHeight_m, endWallCalculationHeight_m only as provisional boundary concepts |
| WALL_GEOMETRY_RESOLVER_REQUIRED | YES |
| ENCLOSURE_EXCEL_1_TO_1_READY | PARTIAL |
| SAFE_TO_START_PROJECTINPUT_WIRING | NO |
| NEXT_STAGE | prove orientation-aware wall-height and B13/frame-grid mapping, then freeze the AutoWallGirtRuntimeInput adapter contract |

The count is by audited logical cells/ranges, not every repeated helper formula
cell in the workbook. It is deliberately not a claim that all hidden/catalog
cells are user inputs.

