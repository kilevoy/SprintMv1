# REAL PROJECT WALL GEOMETRY ORACLE AUDIT

Status: `AUDIT ONLY` / `BLOCKED_BY_MISSING_DRAWING_SOURCE`

This audit checks whether the available real-project artifacts prove the
physical geometry needed to derive orientation-specific wall-girt inputs.
No production code, ProjectInput contract, selector, or XLSX was changed.

## 1. Sources and matching

The available same-project calculation artifacts are:

| Project | Calculation workbook | Source-selection workbook | Proven Core1 context |
|---|---|---|---|
| 22318 | `E:\SprintMv1_reference\22318.xlsx` | `E:\SprintMv1_reference\22318_SOURCE_SELECTION.xlsx` | span 15 m, length 24 m, height 5 m, двускатное, effective step 4.0 m, frame count 7 |
| 22316 | `E:\SprintMv1_reference\SprintMv1_reference\22316\22316.xlsx` | `E:\SprintMv1_reference\SprintMv1_reference\22316\22316_SOURCE_SELECTION.xlsx` | span 18 m, length 30 m, height 5 m, двускатное, effective step 4.5 m, frame count 8 |
| 22329 | `E:\SprintMv1_reference\22329\22329.xlsx` | `E:\SprintMv1_reference\22329\22329_SOURCE_SELECTION.xlsx` | span 12 m, length 26 m, height 4 m, двускатное, effective step 6.0 m, frame count 6 |

No matching standalone plan, gable elevation, section, or structural drawing was
found for these three projects. The only PDF in the inventory is associated
with compatibility project 22326 and is not a matched geometry drawing source
for the mandatory projects.

The embedded media/drawing parts in the XLSX files were inventoried. Their
presence and cell anchors do not provide a readable, dimensioned plan,
elevation, or section from which physical coordinates may be extracted. They
are therefore not treated as geometry evidence.

## 2. What the calculation workbooks prove

The workbooks prove calculation inputs and scalar outputs, not physical
support coordinates:

| Quantity | Evidence | Result |
|---|---|---|
| Effective frame step | Core1 result / project fixtures | proven for the listed projects |
| Frame count | legacy span formulas `CEILING(length / step) + 1` and Core1 | proven as a quantity |
| Frame axis coordinates | no source cells or dimensioned drawing | not proven |
| Last-bay distribution | non-divisible ratios for 22316 and 22329 | cannot be selected without drawing/source rule |
| Facade-post profile | `вывод!D41:E41` / Core1 facade-post component | profile and steel only; count/positions not proven |
| Side wall support grid | no axis schedule or wall support drawing | not proven |
| End wall support grid | no gable-post schedule or facade drawing | not proven |
| B11/B12/B13 physical meaning | scalar manual inputs in enclosure workbook | only legacy scalar semantics are available |
| Roof slope / ridge | no authoritative source chain in matched artifacts | not proven |

The frame-count formulas do not establish that positions are uniformly spaced,
that the final bay is shortened, or that wall-girt supports coincide with every
main frame axis. Those are separate physical claims.

## 3. Mandatory project comparison

| Project | length / effective step | frame count | axis positions | side support grid | end support grid |
|---|---:|---:|---|---|---|
| 22318 | 24 / 4.0 = 6.000 | 7 | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| 22316 | 30 / 4.5 = 6.667 | 8 | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| 22329 | 26 / 6.0 = 4.333 | 6 | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |

The ratios explain why an axis schedule is required; they do not prove the
physical distribution of the eight or six axes.

## 4. Orientation and B13

No matched drawing or orientation-specific recalculation was found that
connects `Лист1!B13` to actual side-wall or end-wall support coordinates.
Therefore:

- `SIDE B13` remains a legacy scalar support-step input, not a proven physical
  side-wall grid;
- `END B13` has no proven source mapping;
- the existing `selectedSections.facadePosts` value proves a profile component,
  not its quantity, positions, or equivalence to B13;
- no `SIDE`/`END` resolver may be wired from these artifacts.

## 5. Height and roof geometry

`ProjectInput.geometry.building_height_m` is a proven Core1 input for structural
selection. The available sources do not establish its physical datum as eave,
column top, wall top, or ridge level for the enclosure calculation.

The enclosure workbook's `Лист1!B12` is a scalar wall-calculation input. No
source evidence proves that it is automatically derived from the ordinary
building height, eave height, or ridge height, and no evidence proves that it
changes automatically by wall orientation.

The matched artifacts contain no authoritative roof-slope input/formula and no
ridge-height output. A ridge formula must not be introduced from span, a
research default, or a drawing convention.

## 6. Required missing primary sources

To close this audit, provide for each of 22318, 22316 and 22329:

1. dimensioned longitudinal plan with frame axes, coordinates and bay lengths;
2. dimensioned end/gable elevation with vertical supports, positions, roles and
   spacing;
3. section/elevation with eave/column/wall-top and ridge datums;
4. roof slope/type source tied to the same project;
5. enclosure recalculation or source sheet showing B11/B12/B13 separately for
   SIDE and END, if the workbook is operated one wall at a time;
6. facade-post schedule when the drawing does not expose post positions.

## 7. Final classification

| Status | Classification |
|---|---|
| `FRAME_POSITIONING_RULE` | `NOT_PROVEN` |
| `SIDE_SUPPORT_GRID_PROVEN` | `NO` |
| `SIDE_B13_MEANING` | `UNKNOWN_PHYSICAL_MAPPING` |
| `END_SUPPORT_GRID_PROVEN` | `NO` |
| `END_B13_MEANING` | `UNKNOWN` |
| `BUILDING_HEIGHT_DATUM` | `NOT_PROVEN` |
| `SIDE_HEIGHT_MAPPING` | `NO` |
| `PRIMARY_ROOF_SLOPE_RULE` | `NOT_PROVEN` |
| `RIDGE_HEIGHT_MAPPING` | `NO` |
| `B11_AUTOMATIC_MAPPING` | `NO` |
| `B12_AUTOMATIC_MAPPING` | `NO` |
| `B13_AUTOMATIC_MAPPING` | `NO` |
| `SAFE_TO_IMPLEMENT_SIDE_RESOLVER` | `NO` |
| `SAFE_TO_IMPLEMENT_END_RESOLVER` | `NO` |
| `SAFE_TO_START_PROJECTINPUT_AUTO_WIRING` | `NO` |

Conclusion: the currently available workbooks validate scalar Core1 and legacy
enclosure inputs, but they do not provide a physical geometry oracle. The next
step is source import of the matched drawings/recalculations, not a formula or
adapter change.

## 8. Real project geometry oracle #1: 489593-2025

The supplied primary-source report identifies the following same-project
package from Google Drive:

- `КМ.pdf`
- `КМ(для заказчика).pdf`
- `KMD/KMD1/KMD_V5`
- `20323(18х30х4,7 Предрасчет Спринт СП.pdf`

The package is for garage 18 x 30 x 4.7 m in Chita. The facts below are
recorded as project-specific primary evidence supplied for this audit. The
binary package is not present in the local workspace, so this section is not a
claim that the files were independently re-parsed in this environment.

### Project-specific proven facts

| Item | Result | Status |
|---|---|---|
| axes/building size | 18 x 30 m | `PROVEN_FOR_PROJECT` |
| nominal clear height | 4.7 m to bottom of projecting structures | `PROVEN_FOR_PROJECT` |
| side frame step | 6.0 m | `PROVEN_FOR_PROJECT` |
| side axis coordinates | 0, 6, 12, 18, 24, 30 m | `PROVEN_FOR_PROJECT` |
| side positioning rule | repeated nominal step | `PROVEN_FOR_PROJECT` |
| end major span divisions | 18,000 = 6,000 + 6,000 + 6,000 mm | `PROVEN_FOR_PROJECT` |
| end major grid | 0, 6, 12, 18 m across span | `PROVEN_FOR_PROJECT` |
| main fakhwerk posts | 140x140x4, L=6250 mm, qty 4 total | `PROVEN_FOR_PROJECT` |
| 80x80x3 fakhwerk posts | L=2078 mm, qty 4 | `PROVEN_FOR_PROJECT` |
| gate posts | 120x120x4, L=4568 mm, qty 4 | `PROVEN_FOR_PROJECT` |
| gate beams | 120x120x4, L=4080 mm, qty 2 | `PROVEN_FOR_PROJECT` |
| roof slope | 15 degrees | `PROVEN_FOR_PROJECT` |
| drawn ridge-region levels | +7.210 and +7.337 m | `DRAWN_LEVELS_ONLY` |

The two main fakhwerk posts per end establish a major end grid, not a complete
uniform physical support grid. The additional fakhwerk and gate members are
opening/elevation-dependent candidates; their coordinates and effective
vertical ranges remain unproven here.

### Height interpretation

The 4.7 m project datum is explicitly “to the bottom of projecting structures”.
It is not equal to the ridge and is not directly equal to either structural
eave-region level +4.830 or +4.948. The ridge-region levels +7.210 and +7.337
are recorded without choosing one as `endWallCalculationHeight_m`.

No B11/B12/B13 automatic mapping is proven by this single project. In
particular, the project proves that a richer support object may be required:

```text
WallVerticalSupport { x_m, zMin_m, zMax_m, role, profile? }
```

This does not authorize production implementation or ProjectInput wiring.

### Generalization boundary

| General question | Result |
|---|---|
| general frame positioning rule | `NOT_PROVEN` beyond this divisible 30 m project |
| general end support grid | `NOT_PROVEN`; project has non-uniform/opening-dependent supports |
| general roof-slope rule | `NOT_PROVEN`; 15 degrees is project-specific evidence |
| general B11 mapping | `UNKNOWN` |
| general B12 mapping | `UNKNOWN` |
| general B13 mapping | `UNKNOWN` |

### Updated final status

```ini
REAL_PROJECT_489593_SIDE_LENGTH = 30 m / PROVEN_FOR_PROJECT
REAL_PROJECT_489593_SIDE_GRID = [0, 6, 12, 18, 24, 30] m / PROVEN
REAL_PROJECT_489593_END_LENGTH = 18 m / PROVEN_FOR_PROJECT
REAL_PROJECT_489593_END_MAJOR_GRID = [0, 6, 12, 18] m / PROVEN
REAL_PROJECT_489593_BUILDING_HEIGHT_DATUM = 4.7 m to bottom of projecting structures / PROVEN
REAL_PROJECT_489593_ROOF_SLOPE = 15 deg / PROVEN
REAL_PROJECT_489593_RIDGE_LEVELS = +7.210, +7.337 m / DRAWN LEVELS ONLY

GENERAL_FRAME_POSITIONING_RULE = NOT_PROVEN
GENERAL_END_SUPPORT_GRID_RULE = NOT_PROVEN
GENERAL_ROOF_SLOPE_RULE = NOT_PROVEN
B11_GENERAL_MAPPING = UNKNOWN
B12_GENERAL_MAPPING = UNKNOWN
B13_GENERAL_MAPPING = UNKNOWN

SAFE_TO_IMPLEMENT_PROJECT_489593_GEOMETRY = NO
SAFE_TO_IMPLEMENT_GENERAL_SIDE_RESOLVER = NO
SAFE_TO_IMPLEMENT_GENERAL_END_RESOLVER = NO
SAFE_TO_START_PROJECTINPUT_AUTO_WIRING = NO
```
