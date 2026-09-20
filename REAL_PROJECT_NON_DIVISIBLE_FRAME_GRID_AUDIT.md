# REAL PROJECT NON-DIVISIBLE FRAME GRID AUDIT

## Scope

Read-only discovery for project `490918`, `Спринт АТ 7,7х17,7х3,5`.
No production code, Core1, Enclosure, ProjectInput, UI, XLSX or PDF was
changed. No commit or push was performed.

## Search result

The following local scopes were searched by filename and text:

- `E:\Спринт М v1`
- `E:\SprintMv1_reference`
- `C:\Users\Deako\Downloads`
- `E:\` local archive search

Search terms included `490918`, `490918 КМ`, `490918 КМД`,
`7,7х17,7х3,5`, `7.7x17.7x3.5`, `Спринт АТ`, `Печеркин`, and `Иняев`.

No local KM/KMD drawing, project PDF, predcalc PDF/XLSX, or production file
containing a dimension chain for project 490918 was found. The local
`E:\SprintMv1_reference` inventory contains only the previously known 22316,
22318, 22326 and 22329 workbooks/PDFs; none is a 490918 source.

The production-register facts supplied in the task establish that project
490918 exists and provide its nominal dimensions and mass values, but they do
not establish frame-axis coordinates or bay dimensions.

## Required oracle status

```ini
ORACLE_490918_PRIMARY_DRAWINGS_FOUND = NO
ORACLE_490918_PRIMARY_SOURCE = MISSING_LOCAL_SOURCE
ORACLE_PROJECT = NONE
ORACLE_PRIMARY_SOURCE = NONE

BUILDING_LENGTH = 17.7 m / REGISTER_ONLY
NOMINAL_FRAME_STEP = UNKNOWN_FROM_PRIMARY_SOURCE
BAY_COUNT = UNKNOWN
FRAME_COUNT = UNKNOWN
ACTUAL_FRAME_POSITIONS = UNKNOWN
ACTUAL_BAY_WIDTHS = UNKNOWN
LAST_BAY_SHORTENED = UNKNOWN
BAYS_REDISTRIBUTED = UNKNOWN
OTHER_GRID_RULE = UNKNOWN

CORE1_BAY_COUNT_PARITY = NOT_TESTABLE
CORE1_PHYSICAL_POSITION_RULE_PROVEN = NO
GENERAL_FRAME_POSITIONING_RULE = UNKNOWN
SAFE_TO_IMPLEMENT_FRAME_POSITION_RESOLVER = NO
SAFE_TO_USE_FRAMEGRID_EFFECTIVE_STEP_AS_PHYSICAL_POST_STEP = NO
```

## Why the three candidate grids remain unresolved

The following alternatives cannot be selected from the register facts:

```text
A: [0, 6, 12, 17.7]
B: [0, 5.9, 11.8, 17.7]
C: another arrangement
```

`17.7 / 6 = 2.95` does not prove either a shortened final bay or redistributed
bays. The Core1 expression `CEILING(length / effectiveFrameStep) + 1`, when
available, proves only a frame quantity. It does not prove physical positions
or bay widths.

No `real-project-non-divisible-frame-grid-oracle.json` was created because no
primary engineering dimension chain was found. Creating one from register
values would convert an unverified hypothesis into evidence.

## Next source required

Provide or make accessible the project 490918 package, preferably:

1. KM plan/foundation or frame layout with the 17.7 m dimension chain;
2. KMD erection/grid drawing with every longitudinal axis;
3. project PDF or predcalc containing explicit frame count and step;
4. side/end facade drawings if support-grid positions are also required.

The audit can be resumed as soon as one same-project primary drawing with
explicit axis dimensions is available.
