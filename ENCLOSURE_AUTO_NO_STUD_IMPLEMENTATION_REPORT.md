# ENCLOSURE AUTO NO-STUD IMPLEMENTATION REPORT

## Scope and decision

This pass made the one independently proven production correction and stopped
before implementing an unproven AUTO selector.

The repository contains the ordered 632-row observed catalog, but it does not
contain the complete branch-specific runtime evidence needed to calculate `JW`
and the capacity/objective grid for arbitrary inputs. The authoritative evidence
also records `AUTO_CAPACITY_BRANCH_SELECTION = BLOCKED`. Implementing a selector
from the catalog alone would be an engineering heuristic, not a replay of the
legacy Excel algorithm.

## Manual replay correction

`src/enclosure/manualWallGirtReplay.ts` now preserves the two source formulas:

- `CORNER`: `rows * zoneLength_m / structuralPostStep_m`, without rounding or
  ceiling;
- `TYPICAL`: `ceil(rows * round(zoneLength_m / structuralPostStep_m, 1))`.

A regression uses `zoneLength=12 m`, `structuralPostStep=4.5 m`, and paired
section `[]`:

- corner: `7 * 12 / 4.5 = 18.6666666667`;
- typical: `ceil(7 * round(12/4.5, 1)) = 19`.

The two formulas are intentionally different.

## Required status

```text
MANUAL_CORNER_BRACKET_PARITY_FIX = YES
AUTO_SELECTOR_MODULE = NO
AUTO_NO_STUD_ONLY = NO
R_FALSE_EXCLUDED = YES

CORNER_SELECTED_ROW_EXPECTED = 161
CORNER_SELECTED_ROW_ACTUAL = NOT RUN: missing runtime candidate model

TYPICAL_SELECTED_ROW_EXPECTED = 46
TYPICAL_SELECTED_ROW_ACTUAL = NOT RUN: missing runtime candidate model

CORNER_PROFILE_PARITY = NOT RUN
TYPICAL_PROFILE_PARITY = NOT RUN
CORNER_STEP_PARITY = NOT RUN
TYPICAL_STEP_PARITY = NOT RUN
OBJECTIVE_REPLAY_PARITY = NOT RUN

MANUAL_REPLAY_REUSED = YES
OPENINGS_REJECTED = YES
PLUS_STUDS_REJECTED = YES
KNOWN_MASS_AGGREGATED = YES for successful manual replay only
UNKNOWN_COMPONENTS_PRESERVED = YES
SPRINT_M_PROJECT_V1_COMPATIBLE = YES
CORE1_CHANGED = NO
FULL_PLUS_STUD_AUTO_IMPLEMENTED = NO
```

## Why restricted AUTO was not activated

The following evidence is still missing from the repository:

1. the complete source-row model for all 864 rows, including branch-specific
   values and source order;
2. the exact `JW`/capacity input chain for both `Расчет Угловая` and
   `Расчет Рядовая`;
3. the source-backed step-grid inputs and their branch-specific values;
4. the exact `несушки` capacity branch data wired to each candidate;
5. an executable or extracted cached source fixture that proves the full
   candidate grid for the target input, not only the winning row/output;
6. a runtime-safe way to reproduce the source winner rows 161 and 46 without
   hard-coding those outcomes.

The existing catalog is evidence-only (`runtime_imported=false`) and is not
enough to satisfy the requested `candidate objective → MIN → MATCH → INDEX`
implementation.

## Consequence

No `AutoWallGirtSelector` module was added, and `calculateColdEnclosure()` still
returns its existing typed `ENCLOSURE_AUTO_GIRT_SELECTION_NOT_IMPLEMENTED`
diagnostic for AUTO mode. No unsupported AUTO result is presented as a selected
profile or mass.

The proven manual path remains intact, including known wall-girt mass aggregation
and preservation of unknown enclosure components.

## Validation status

Targeted enclosure tests after the bracket correction:

```text
2 test files passed
25 tests passed
```

Full validation must be run after the report is reviewed. No commit or push was
performed.

## Next stage

Import a complete source-backed candidate runtime dataset or an equivalent
replayable cache containing the branch-specific `JW`, capacity, objective and
step-grid values. Then implement and validate restricted no-stud AUTO before
considering any `+ стойки` behavior.
