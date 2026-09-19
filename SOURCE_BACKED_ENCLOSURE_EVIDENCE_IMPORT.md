# Source-backed enclosure evidence import

Research source inspected:

```text
https://github.com/insicomet/SprintM
branch: claude/start-session-l3r43f
commit: 7920b45979ed25e608310be6996ee63dfe680a5a
```

## Imported safely

- 632 ordered observed rows from `src/data/girtBearingCatalog.json` into
  `src/enclosure/evidence-data/girt-catalog-observed.json` and its eight ordered
  chunk files.
- profile/family/section/material/thickness/height/default utilization/
  reported predicted moment/mass/node assembly/insulation/raw flag are
  preserved.
- missing raw-moment, material-coefficient, explicit `Без стоек` and original
  workbook-row fields remain `null`, not guessed.
- provenance points back to the repository commit and declared workbook range.

The data is evidence-only and not imported into the runtime selector.

## Rule matrix

| Rule | Evidence status | Implementation allowed |
|---|---|---|
| observed 632-row catalog and ordering | `LEGACY_PROVEN` as artifact observation | YES for evidence tooling, NO runtime selector yet |
| girt profile structural identity includes material grade and section type | `LEGACY_PROVEN` as data-model requirement | YES in evidence model |
| rawMoment extraction | `PARTIAL` | NO |
| `PredMoment = rawMoment × defaultUtilization × materialCoefficient` | `PARTIAL` | NO |
| 1.1 capacity branch numeric relationship | `PARTIAL` | NO |
| capacity branch engineering meaning | `UNKNOWN` | NO |
| MP220/MP350/MP390 coefficients 0.55/1.0/1.0 | `UNVERIFIED_IN_ARTIFACT` | NO |
| 632 rows are all `Без стоек` | `UNKNOWN` | NO |
| 232 `+ стойки` rows | `NOT_VERIFIED` | NO |
| rows/length/mass manual replay formulas | `PARTIAL` | NO |
| bracket mass | `PARTIAL` for research hypothesis | NO |
| bracket cost | `UNKNOWN` | NO |
| automatic wind/profile selection | `PARTIAL` | NO |
| 21604 opening zoning | `PROJECT_SPECIFIC / MANUAL` | NO universal rule |
| profnastil project observations | `REAL_PROJECT_OBSERVATION` | NO universal rule |
| universal profnastil formula | `UNKNOWN` | NO |

## Final status

```text
GIRT_SOURCE_DATA_IMPORTED = YES
GIRT_RAW_MOMENT_RULE = PARTIAL
GIRT_CAPACITY_BRANCH_NUMERIC_RULE = PARTIAL
GIRT_CAPACITY_BRANCH_SEMANTICS = UNKNOWN
MATERIAL_GRADE_PRESERVED = YES
PLUS_STUD_RUNTIME_IMPORT = BLOCKED
WALL_GIRT_QUANTITY_RULES = PARTIAL
PROFNASTIL_RULES = PARTIAL
OPENING_ZONING_RULE = UNKNOWN
SAFE_FIRST_NUMERIC_SLICE = MANUAL_WALL_GIRT_REPLAY (CONDITIONAL)
SAFE_TO_IMPLEMENT_MANUAL_GIRT_REPLAY = NO
SAFE_TO_IMPLEMENT_AUTO_GIRT_SELECTION = NO
CORE1_RESULTS_CHANGED = NO
ENCLOSURE_RUNTIME_CHANGED = NO
NEXT_STAGE = import authoritative girt workbook/formula artifacts and close rawMoment/material/Без стоек semantics
```
