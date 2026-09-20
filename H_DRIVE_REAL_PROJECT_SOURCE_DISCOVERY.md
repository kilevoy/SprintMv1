# H: DRIVE REAL PROJECT SOURCE DISCOVERY

Mode: `READ ONLY`

No files on `H:\` were modified, renamed, moved, copied or deleted. Sprint M
production code, Core1, Enclosure, ProjectInput and UI were not changed.

## Search scope

The recursive search covered `H:\Мой диск`, including directory names and file
names, for:

- project `490918`, `490918 КМ`, `490918 КМД`, `7,7х17,7х3,5`, `7.7x17.7x3.5`,
  `Спринт АТ`, `Печеркин`, `Иняев`, `Власов`;
- fallback orders `455899`, `449863`, `454129`, `455943`, `455006` and their
  supplied dimension/customer variants;
- generic engineering filenames such as `КМ`, `КМД`, `АП`, `Расчет`,
  `Предрасчет`, `план`, `оси`, `разрез`, `рама`, and `фахверк` inside matching
  candidate directories.

## 490918 result

```ini
490918_SOURCE_FOUND = NO
PRIMARY_KM_FOUND = NO
PRIMARY_KMD_FOUND = NO
```

No directory or file identifying project 490918 or the supplied 7.7 x 17.7 x
3.5 project was found on H:. The production-register facts supplied in the
request remain register evidence only and do not provide frame coordinates.

## Fallback candidates found

The search found these non-divisible-length candidate directories:

| Project | Directory evidence | Files found | Classification |
|---|---|---|---|
| 21414 | `21414 (18х40х6, великан кр.б. опор. 5)` | `21414.xlsx` | `CALCULATION`; no KM/KMD drawing |
| 21430 | `21430 (18х40х6, спринт сп)` | `21430.pdf`, `21430.xlsx` | PDF is estimate/specification; XLSX is calculation |
| 21443 | `21443 (18х40х4, навес спринт, великан, атлант)` | three PDF/XLSX pairs | estimate/calculation variants; no KM/KMD drawing |
| 21931 | `21931 (18х40х3, великан сп)` | `21931.pdf`, `21931.xlsx` | estimate/calculation; no KM/KMD drawing |

The 21430 PDF was read-only inspected. It contains an estimate/specification
with steel and fastener quantities, but no primary longitudinal axis drawing or
dimension chain. The 21430 workbook has only calculation sheets (`12м`, `15`,
`18`, `21`, `1ск`) and no drawing sheet establishing frame coordinates. The
other fallback pairs were not promoted to oracles because their discovered
file classes are the same and no KM/KMD source was found in their candidate
directories.

No fallback project therefore satisfies all three oracle requirements:

1. known overall length;
2. known nominal/calculated frame step;
3. primary KM/KMD drawing with an explicit longitudinal dimension chain or
   frame-axis coordinates.

## Oracle selection

```ini
H_DRIVE_SCANNED = YES
490918_SOURCE_FOUND = NO
FALLBACK_PROJECTS_FOUND = 21414, 21430, 21443, 21931
SELECTED_ORACLE_PROJECT = NONE
PRIMARY_KM_FOUND = NO
PRIMARY_KMD_FOUND = NO

BUILDING_LENGTH = UNKNOWN_FROM_PRIMARY_SOURCE
NOMINAL_FRAME_STEP = UNKNOWN_FROM_PRIMARY_SOURCE
FRAME_COUNT = UNKNOWN
ACTUAL_FRAME_POSITIONS = UNKNOWN
ACTUAL_BAY_WIDTHS = UNKNOWN
FRAME_POSITIONING_RULE = UNKNOWN

CORE1_COUNT_PARITY = NOT_TESTABLE
CORE1_POSITION_RULE_PROVEN = NO
SAFE_TO_IMPLEMENT_FRAME_POSITION_RESOLVER = NO
SAFE_TO_MAP_SIDE_B13_FROM_CORE1 = NO
NEXT_STAGE = obtain a same-project KM/KMD plan or dimensioned frame/base layout for 490918 or a fallback project
```

No `REAL_PROJECT_NON_DIVISIBLE_FRAME_GRID` JSON oracle was created. No
coordinates, step redistribution, shortened last bay, or `length / bays`
substitution may be inferred from the available register/calculation files.
