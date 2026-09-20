# `Без стоек` / `+ стойки` source audit

## Source and scope

Authoritative source: `C:\Users\Deako\Downloads\Калькулятор ограждайки v1.5.xlsx`.
Both `Расчет Угловая` and `Расчет Рядовая` were inspected. The catalog is
structurally identical in the two sheets.

## Control

`Лист1!V107 = "Без стоек"` and `Лист1!W107 = TRUE` in the source cache.
The candidate-row control is:

```excel
S[r] = IF(Лист1!$W$107=FALSE,TRUE,R[r])
```

`R` is the row's catalog flag, labelled by `R6` as `Без стоек`.

- `R=TRUE`: no additional-stud mass term;
- `R=FALSE`: candidate is a `+ стойки` row;
- `W107=FALSE`: the source forces `S=TRUE` for the plus-stud mode;
- otherwise `S` follows the row's `R` flag.

The final candidate gate includes `$S[r]` in `JW[r]`, so this selector affects
candidate eligibility, not just display text.

## Additional-member branch (neutral physical name)

The source defines:

```excel
T4 = IF(Лист1!$B$13<=2,0,
        IF(Лист1!$B$13<=4,1,
           IF(Лист1!$B$13<=6,2,3)))
T5 = T4 * Лист1!$B$12
T[r] = IF(R[r],0,
          T5 * INDEX($C$14:$C$24,
                     MATCH(N[r],$B$14:$B$24,0),1))
```

For the cached workbook, `B12=9.3`, `B13=6`, hence `T4=2` and `T5=18.6`.
For row 639 (`]ПП 110x45x1 + стойки`), `N639=110`, the lookup returns
`C14=1.5106`, and the cached result is:

```text
T639 = 18.6 × 1.5106 = 28.09716 kg
```

`C14:C24` is a profile-mass table in `kg/m`, not a count table. `MATCH` uses
the candidate's `N[r]` width key against `B14:B24`; it is an exact lookup.
Thus `T[r]` is a total mass contribution in kg for the additional-member
branch (`length factor T5 × profile mass kg/m`). It is not itself kg/m or a
member count. `T5` has length units by arithmetic, but its physical member
meaning is not proven, so the neutral name `ADDITIONAL_STUD_BRANCH` is used.

The multiplication by `Лист1!B13` in `TQ[r]`/other objective cells proves the
additional-member mass enters candidate selection. No separate final material
mass output was found in this audit that consumes `T[r]`; therefore its effect
on final material mass remains `UNKNOWN`.

## Full candidate objective traces

### `Без стоек`, row 7

| Step | Cell | Formula / value |
|---|---|---|
| catalog designation | `V7` | `]ПП 110x45x1` |
| no-stud flag | `R7` | `=TRUE` → `TRUE` |
| eligibility | `S7` | `=IF(Лист1!$W$107=FALSE,TRUE,R7)` → `TRUE` |
| profile width | `N7` | `110` |
| section mass | `Y7` | `1.5106 kg/m` |
| section mass field | `Z7` | `=Y7` → `1.5106` |
| TN | `TN7` | `=TO7` → `1.5106 kg/m` |
| TO | `TO7` | `=Y7` → `1.5106 kg/m` |
| row additional mass | `T7` | `=IF(R7,0,...)` → `0 kg` |
| candidate gate | `JW7` | full `AND(...)` gate including `S7`; cached `0` |
| objective | `TQ7` | `=IF(JW7=0,999999999,TQ$4*$Z7+$TO7*Лист1!$B$13+TQ$3*$AA7+$G7/1000000-TQ$2/1000000000+$TN7*Лист1!$B$13+$T7)` → `999999999` |

The base profile, the two TN/TO terms and the zero additional-member term are
all explicit in the objective; the cached candidate is disabled by `JW7=0`.

### `+ стойки`, row 639

| Step | Cell | Formula / value |
|---|---|---|
| catalog designation | `V639` | `]ПП 110x45x1 + стойки` |
| plus-stud flag | `R639` | `=FALSE` → `FALSE` |
| eligibility | `S639` | `=IF(Лист1!$W$107=FALSE,TRUE,'Расчет Рядовая'!R639)` → `FALSE` in cached `Без стоек` mode |
| profile width | `N639` | `110` |
| section mass | `Y639` | `1.5106 kg/m` |
| TN / TO | `TN639` / `TO639` | `=TO639` / `=Y639` → `1.5106 kg/m` |
| step factor | `T4` | `=IF(B13<=2,0,IF(B13<=4,1,IF(B13<=6,2,3)))` → `2` |
| branch length factor | `T5` | `=T4*Лист1!$B$12` → `18.6` |
| mass lookup | `INDEX(C14:C24,MATCH(N639,B14:B24,0),1)` | `C15=1.5106 kg/m` |
| additional mass | `T639` | `=IF(R639,0,T5*INDEX(...))` → `28.09716 kg` |
| candidate gate | `JW639` | full `AND(...)` gate including `S639`; cached `0` |
| objective | `TQ639` | same objective formula with `+$T639`; cached `999999999` |

This is a computed branch, not merely a static label attached to the base
candidate.

## Cross-sheet comparison

Both sheets contain 864 rows (7:870), with 632 `R=TRUE` and 232 `R=FALSE`
rows. The catalog designation, width, section properties, TN/TO, T, and
candidate formulas match across the two sheets. The only observed key-field
formula-text difference is the redundant sheet qualification in `S` on the
corner sheet versus the row sheet; cached branch values and catalog data are
the same. Therefore the two sheets do not represent two different catalogs.

## Runtime classification

The 232 rows are `COMPUTED_BRANCH`, not `STATIC_CATALOG_ROWS`: each row carries
catalog properties, but its additional mass `T[r]` is computed from `B12`,
`B13`, and the width-to-mass table. They are not proven to be derived copies of
the 632 base rows, and they cannot be imported as immutable final outputs.

## Explicit impact answers

| Question | Status | Formula evidence |
|---|---|---|
| `PLUS_STUD_CHANGES_PROFILE_LENGTH` | `UNKNOWN` | no final profile-length output tied to `R/T` found |
| `PLUS_STUD_CHANGES_BASE_PROFILE_MASS` | `NO` | `Y[r]`, `Z[r]` are unchanged profile fields; `T[r]` is separate |
| `PLUS_STUD_ADDS_SEPARATE_MASS` | `YES` | `T[r]=IF(R[r],0,T5×INDEX(...))` and `+T[r]` in objective |
| `PLUS_STUD_CHANGES_BRACKET_COUNT` | `UNKNOWN` | no bracket-count dependent formula traced |
| `PLUS_STUD_CHANGES_ROW_COUNT` | `NO` | rows remain 864; `S/JW` filters eligibility |
| `PLUS_STUD_CHANGES_CAPACITY` | `NO` | no capacity formula references `R`, `S`, or `T`; `S` only gates candidate eligibility in `JW` |
| `PLUS_STUD_CHANGES_SELECTION_OBJECTIVE` | `YES` | objective contains `+$T[r]`; `JW` gates candidate |

## Catalog inventory

Rows 7:870 contain 864 candidate rows per calculation sheet:

| Catalog branch | Rows | Count | Evidence |
|---|---:|---:|---|
| `Без стоек` (`R=TRUE`) | 7:638 | 632 | row flag and zero `T` branch |
| `+ стойки` (`R=FALSE`) | 639:870 | 232 | `V` designation includes `+ стойки`, nonzero `T` |

The plus-stud rows are not a universal selected result. They are catalog
candidates and must not be imported as one fixed runtime profile.

## Catalog lookup table

The additional-stud mass lookup is the exact table `B14:C24`:

| Row | B: width key | C: profile mass kg/m |
|---:|---:|---:|
| 14 | 105 | 1.5106 |
| 15 | 110 | 1.5106 |
| 16 | 145 | 1.7846 |
| 17 | 150 | 1.8237 |
| 18 | 170 | 1.9803 |
| 19 | 195 | 2.1759 |
| 20 | 200 | 2.2151 |
| 21 | 220 | 2.3716 |
| 22 | 245 | 3.5004 |
| 23 | 250 | 3.5004 |
| 24 | 300 | 4.7534 |

Catalog examples:

- row 7: `]ПП 110x45x1`, `R=TRUE`, `T=0`;
- row 639: `]ПП 110x45x1 + стойки`, `R=FALSE`, `T=28.09716`.

## Boundaries and implementation safety

| Status | Result |
|---|---|
| `PLUS_STUD_CONTROL` | `PROVEN` |
| `PLUS_STUD_PHYSICAL_SEMANTICS` | `UNKNOWN` |
| `PLUS_STUD_QUANTITY` | `PROVEN_AS_T4_SELECTOR_FACTOR`; physical count not proven |
| `PLUS_STUD_LENGTH` | `PROVEN_AS_T5 = T4 × B12`; final member length not independently proven |
| `PLUS_STUD_MASS` | `PROVEN_FOR_CANDIDATE_OBJECTIVE`; final material mass `UNKNOWN` |
| `PLUS_STUD_CAPACITY_INTERACTION` | `PROVEN_AS_S/JW_CANDIDATE_GATE` |
| `PLUS_STUD_CATALOG_ROWS` | `PROVEN`, 232 rows, not a selected universal result |
| `SAFE_TO_IMPORT_PLUS_STUD_CATALOG_ROWS` | `NO` — rows are computed branch candidates, not final static outputs |
| `SAFE_TO_IMPLEMENT_PLUS_STUD_MANUAL_REPLAY` | `NO` — selected-row/output aggregation is not proven |
| `SAFE_TO_IMPLEMENT_PLUS_STUD_AUTO_SELECTION` | `NO` |

No production code was changed. The next safe step is source-backed replay of
one selected plus-stud candidate through the full objective and output path,
not automatic selection implementation. Until that replay exists, do not
import the 232 rows into runtime as an independent static catalog.

## Superseded findings

Previous interpretation: `+ стойки` was treated as a physically identified
wall-stud catalog branch and its rows were considered safe to import.

New evidence: `T4 → T5 → INDEX(C14:C24)` proves a computed additional-member
mass branch, while the workbook does not prove the physical member identity or
final material-mass consumer.

Replacement: use `ADDITIONAL_STUD_BRANCH`; classify the 232 rows as computed
candidate variants; keep physical semantics and final output aggregation
unknown.

## Final status

```text
TOTAL_GIRT_CANDIDATES = 864
WITHOUT_STUD_ROWS = 632
WITH_STUD_ROWS = 232

TN_DATA_TYPE = candidate profile mass field
TN_UNIT = kg/m
TN_CALCULATION_ROLE = first named mass term in candidate objective
TN_PHYSICAL_SEMANTICS = UNKNOWN

TO_DATA_TYPE = candidate profile mass field
TO_UNIT = kg/m
TO_CALCULATION_ROLE = second named mass term in candidate objective
TO_PHYSICAL_SEMANTICS = UNKNOWN

PREVIOUS_TN_TO_EXTRA_GIRT_INTERPRETATION = SUPERSEDED
PLUS_STUD_CONTROL_RULE = PROVEN
PLUS_STUD_ADDITIONAL_MASS_RULE = PROVEN
PLUS_STUD_PHYSICAL_SEMANTICS = UNKNOWN
PLUS_STUD_SELECTION_OBJECTIVE_EFFECT = PROVEN
PLUS_STUD_ROWS_RUNTIME_MODEL = COMPUTED_BRANCH
SAFE_TO_IMPORT_PLUS_STUD_CATALOG_ROWS = NO
SAFE_TO_IMPLEMENT_PLUS_STUD_MANUAL_REPLAY = NO
SAFE_TO_IMPLEMENT_PLUS_STUD_AUTO_SELECTION = NO
SAFE_TO_IMPLEMENT_TN_TO_AS_EXTRA_GIRTS = NO
CORE1_RESULTS_CHANGED = NO
ENCLOSURE_RUNTIME_CHANGED = NO
NEXT_STAGE = obtain one recalculated source case with a selected + стойки
candidate and trace its final output/material-mass consumer; only then specify
manual replay, while keeping automatic selection out of scope
```
