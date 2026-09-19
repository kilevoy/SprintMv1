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
| 21876 | `NOT FOUND` in the workspace, reference folders, and Downloads | — | `UNKNOWN` | — |
| 21640 | `C:\Users\Deako\Downloads\21640.xlsx` | `4705A40DD3D1A6698937C793460AEC25243652FC44BFAC7DB55F780DAD6F519B` | `DOWNSTREAM_BOM` | `12м`, `15`, `18`, `21`, `1ск` |

`C:\Users\Deako\Downloads\21640 (1).xlsx` has the same SHA-256 and was
treated as a duplicate, not as a second independent source.

## 21876

No local workbook was available. No sheets, wall-girt rows, expected values,
or replay inputs were fabricated.

```text
PROJECT_21876_AVAILABLE = NO
PROJECT_21876_USABLE_GIRT_ZONES = 0
PROJECT_21876_EXACT_ZONES = 0
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

No replay call was made for 21640 because the minimum explicit input contract
cannot be established from the workbook. No replay call was made for 21876
because the workbook is unavailable.

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

The next useful step is to obtain `21876.xlsx` and a source or detailed BOM
workbook for 21640 that explicitly preserves wall-girt zone, section type, and
girt step. Only then can real-project golden fixtures be created without
guessing.
