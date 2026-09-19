# Real-Project Manual Wall-Girt Validation

## Scope and authority

This is a validation audit of the already implemented restricted manual
replay. It is not formula discovery and it does not change the authoritative
formulas from `Калькулятор ограждайки v1.5.xlsx`.

The validation rule is intentionally strict: a real-project row is usable only
when the project evidence supplies the explicit profile, section type, girt
step, wall/zone geometry, and a separable expected result. Missing inputs are
reported as `NOT_AVAILABLE`; they are not reconstructed from totals or labels.

## Source availability

| Project | Local source | SHA-256 | Classification | Relevant sheets |
|---|---|---|---|---|
| 21876 | `E:\SprintMv1\21876.xlsx` | `D77591C7DBE46C972945532BF9A8155B8A76646A29FF47B93470F70462106D20` | `DOWNSTREAM_BOM` | `12м`, `15`, `18`, `21`, `1ск` |
| 21640 | `C:\Users\Deako\Downloads\21640.xlsx` | `4705A40DD3D1A6698937C793460AEC25243652FC44BFAC7DB55F780DAD6F519B` | `DOWNSTREAM_BOM` | `12м`, `15`, `18`, `21`, `1ск` |

`C:\Users\Deako\Downloads\21640 (1).xlsx` has the same SHA-256 and was
treated as a duplicate, not as a second independent source.

## 21876 classification and candidate evidence

The workbook is available and was inspected as a read-only source. It has five
visible sheets and six external links, but no sheets named `Расчет Угловая`,
`Расчет Рядовая`, or `несушки`. The relevant content is a preliminary
material statement with project inputs and downstream wall-material rows.

The strongest candidate is `12м`, where the project-level inputs are direct
values:

| Field | Cell | Value | Status |
|---|---|---:|---|
| project id | `12м!G5` | `21876` | `DIRECT_SOURCE` |
| city | `12м!B6` | `Каргалейка` | `DIRECT_SOURCE` |
| span | `12м!C8` | `12 m` | `DIRECT_SOURCE` |
| building length | `12м!C9` | `30 m` | `DIRECT_SOURCE` |
| building height | `12м!C10` | `4.5 m` | `DIRECT_SOURCE` |
| frame step | `12м!C11` | `6 m` | `DIRECT_SOURCE`, project-level only |

Candidate wall rows are aggregate BOM rows, not explicit zones:

| Row | Profile | Formula | Cached quantity | Unit mass | Missing replay fields |
|---|---|---|---:|---:|---|
| `12м!B34:H34` | `ПП 145х45х1,5` | `C34=0` | `0` | `H34=2.67` | section type, girt step, zone type/length |
| `12м!B35:H35` | `ПП 145х45х1,2` | `C35=5*2*12*2+4*2*30*2` | `720` | `H35=2.14` | section type, girt step, zone decomposition, bracket result |

The row `12м!B35` is the closest apparent wall-girt candidate, but its
quantity is an aggregate formula with two terms. Treating `5`, `4`, `12`, or
`30` as a row count, section type, girt step, or zone length would be an
unsupported inference. The workbook does not identify whether this row is
corner, typical, side-wall, end-wall, or a mixture.

The bracket row is also aggregate:

```text
12м!B38 = "Кронштейны"
12м!C38 = G38/0.75*0.2       cached quantity = 24
12м!G38 = (15+30)*2          cached mass = 90 kg
```

It cannot be assigned to the `bracketCount` and `bracketMass` of one replay
zone. Other sheets contain analogous BOM rows and additional labels such as
`нс`, `сс`, and `цок`, but no explicit `]`, `[]`, `][`, or `[-]` section type.

```text
PROJECT_21876_AVAILABLE = YES
PROJECT_21876_WORKBOOK_TYPE = DOWNSTREAM_BOM
PROJECT_21876_GIRT_SHEETS_FOUND = 0 authoritative zone-level sheets
PROJECT_21876_USABLE_GIRT_ZONES = 0
PROJECT_21876_EXACT_ZONES = 0
```

## 21876 field-level availability

| Field | Status | Evidence |
|---|---|---|
| wall side (`SIDE`/`END`) | `MISSING` | no side attached to `12м!B35` |
| zone (`CORNER`/`TYPICAL`) | `MISSING` | no zone field; BOM labels are not reinterpreted |
| wall height | `DIRECT_SOURCE` at sheet level | `12м!C10=4.5`, not zone-specific |
| zone length | `MISSING` | building length exists, zone length does not |
| support/post/frame spacing | `DIRECT_SOURCE` at sheet level | `12м!C11=6`, not proven as girt support step |
| selected profile | `DIRECT_SOURCE` | `12м!B35` |
| section type | `MISSING` | no exact section-type marker |
| girt step | `MISSING` | no explicit girt-step source for the row |
| reported row count | `MISSING` | aggregate linear quantity only |
| profile total length | `DERIVED_FROM_SOURCE_FORMULA` | `12м!C35=720`, aggregate quantity |
| profile mass | `DERIVED_FROM_SOURCE_FORMULA` | `12м!G35=C35*H35`, aggregate mass `1540.8 kg` |
| bracket quantity/mass | `DIRECT_SOURCE` only as aggregate | `12м!C38`, `12м!G38` |

## Replay decision

No `manualWallGirtReplay` call was made. The required explicit input contract
cannot be constructed from `21876.xlsx` without guessing. No real-project
fixture was created.

```text
REAL_PROJECT_GIRT_VALIDATION = BLOCKED_BY_ZONE_LEVEL_SOURCE
BLOCKING_FIELDS = wall side, zone type, zone length, exact section type,
                  girt step, row count, separable profile length,
                  separable profile mass, per-zone bracket quantity,
                  per-zone bracket mass
REAL_PROJECT_GIRT_FIXTURES_CREATED = 0
MANUAL_WALL_GIRT_REAL_PROJECT_PARITY = NOT_TESTED
```

## 21640 classification

The workbook is a preliminary material statement rather than the authoritative
wall-girt calculator. It contains project inputs on each variant sheet and
downstream material rows, but not the source workbook's `Лист1` / `несушки`
manual-zone model.

Evidence that the rows are downstream BOM rows:

| Sheet | Direct source row | Profile value | Quantity formula/cache | Unit mass | Why not replayable |
|---|---|---|---:|---:|---|
| `12м` | `B34:H37` | `ПП 150х45х1,5`, `ПП 150х45х1,2`, `ПС 195х45х1,2`, `ПП 195х45х1,2` | `200`, `400`, `288`, `168` | `2.73`, `2.18`, `3.56`, `3.26` | no explicit section type, girt step, or separable corner/typical zone |
| `15` | `B34:H36` | `ТПП 150х1,5`, `ТПС 145х1,5`, `ТПП 150х1` | `1058.75`, `357.5`, `300` | `2.559`, `2.8`, `1.727` | rows `нс`, `сс`, `цок` are BOM labels, not proven replay zone types |
| `18` | `B34:H36` | `ПС 145х1,5`, `ТПС 145х1,5`, `ТПП 150х1` | `2202.2`, `0`, `312` | `2.8`, `2.8`, `1.727` | aggregate downstream quantities; no explicit manual replay inputs |
| `21` | `B34:H36` | `ТПП 150х1,2`, `ТПС 145х1,5`, `ТПП 150х1` | `1143.45`, `579.15`, `356.4` | `2.02`, `2.8`, `1.727` | no section type or independent zone geometry |
| `1ск` | `B34:H36` | `ТПП 150х1,5`, `ТПС 145х1,5`, `ТПП 150х1` | `950.4`, `316.8`, `288` | `3`, `2.8`, `1.727` | seismic/special context does not prove a different replay rule |

The workbook does contain project inputs such as `12м!C8:C11` (span 18 m,
length 30 m, height 6 m, frame step 5 m), but these do not identify the
manual wall-girt zone used by any individual BOM row. `12м!C34` is the formula
`=5*2*10*2`, for example; interpreting `5`, `2`, or `10` as a girt step,
zone count, or corner/typical geometry would be an unsupported inference.

The bracket row `12м!B41:G41` is also an aggregate BOM row:
`C41=G41/0.75*0.2`, cached quantity `39.2`, cached mass `147 kg`. It does not
provide the source workbook's explicit `F49/F50` row count and cannot be
compared to a single-zone bracket calculation without additional evidence.

## Per-field availability for 21640

| Field | Status | Evidence |
|---|---|---|
| wall side (`SIDE`/`END`) | `NOT_AVAILABLE` | no explicit side field attached to rows `B34:B37` |
| zone (`CORNER`/`TYPICAL`) | `NOT_AVAILABLE` | no explicit zone field; `нс`/`сс`/`цок` not reinterpreted |
| wall height | `DIRECT_SOURCE` at sheet level | e.g. `12м!C10=6`, but not zone-specific |
| zone length | `NOT_AVAILABLE` | project length exists, but no separable zone length per BOM row |
| support/frame/post spacing | `DIRECT_SOURCE` at sheet level | e.g. `12м!C11=5`, not proven as the row's support step |
| selected profile | `DIRECT_SOURCE` | e.g. `12м!B34:B37` |
| section type | `NOT_AVAILABLE` | no `]`, `[]`, `][`, or `[-]` evidence |
| girt step | `NOT_AVAILABLE` | no explicit source cell for the row |
| reported row count | `NOT_AVAILABLE` | BOM gives aggregate linear quantity only |
| profile total length | `DIRECT_SOURCE` as aggregate quantity | e.g. `12м!C34=200`, not a replay-zone length |
| profile mass | `DERIVED_FROM_SOURCE_FORMULA` | e.g. `12м!G34=C34*H34`, aggregate BOM mass |
| bracket quantity/mass | `DIRECT_SOURCE` only as aggregate | `12м!C41`, `12м!G41`; not separable by zone |

Therefore:

```text
PROJECT_21640_USABLE_GIRT_ZONES = 0
PROJECT_21640_EXACT_ZONES = 0
REAL_PROJECT_GIRT_FIXTURES_CREATED = 0
```

## Replay comparison

No replay call was made for 21640 or 21876 because the minimum explicit input
contract cannot be established from either downstream BOM workbook.

There are consequently no `EXACT`, `ROUNDING_ONLY`, or `MISMATCH` claims.

```text
ROW_COUNT_REAL_PROJECT_PARITY = NOT_TESTED
PROFILE_LENGTH_REAL_PROJECT_PARITY = NOT_TESTED
PROFILE_MASS_REAL_PROJECT_PARITY = NOT_TESTED
CORNER_BRACKET_REAL_PROJECT_PARITY = NOT_TESTED
TYPICAL_BRACKET_REAL_PROJECT_PARITY = NOT_TESTED
BRACKET_MASS_REAL_PROJECT_PARITY = NOT_TESTED
MANUAL_WALL_GIRT_REAL_PROJECT_PARITY = NOT_TESTED
```

This is a provenance limitation, not evidence against the replay formula.

## Scope conclusion

```text
PRODUCTION_FORMULAS_CHANGED = NO
CORE1_RESULTS_CHANGED = NO
AUTO_SELECTION_IMPLEMENTED = NO
OPENING_FRAMING_IMPLEMENTED = NO
SAFE_TO_INTEGRATE_MANUAL_GIRT_INTO_ENCLOSURE_CORE = NO
```

The next useful step is to obtain the original wall-girt calculation workbook,
an explicit enclosure calculation sheet, or a KM drawing/BOM that preserves
wall-girt zone, section type, girt step, and per-zone quantities for 21876.
Only then can a real-project golden fixture be created without guessing.
