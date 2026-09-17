# FRAME STEP 22316 — AUTO-SELECTION FIRST-DIVERGENCE AUDIT

## Scope

Audit only. The source workbook and production TypeScript were not changed.

- Source: `E:\\SprintMv1_reference\\22316\\22316_SOURCE_SELECTION.xlsx`
- Downstream: `E:\\SprintMv1_reference\\22316\\22316.xlsx`

Project inputs are 18 m span, 30 m length, 5 m height, responsibility 1.0,
and blank `вывод!D9` (automatic frame-step mode). Climate is the proven
`RU|Березовский|SP_20` tuple: snow IV / 1.5 kN/m² and wind I / 0.23 kN/m².

## SOURCE automatic-step chain

| Sheet / cell | Formula | Cached value | Meaning / units |
|---|---|---:|---|
| `вывод!D9` | — | blank | Manual frame-step input; blank is treated as zero/automatic |
| `подбор!W2` | `вывод!D9` | 0 | Automatic/manual controller copy |
| `подбор!V10` | `вывод!D4` | 18 | Literal span, m |
| `подбор!V11` | `вывод!D5` | 30 | Building length, m |
| `подбор!V8` | `вывод!D6` | 5 | Building height, m |
| `подбор!V9` | `вывод!D7` | 1 | Responsibility factor |
| `подбор!AM9` | `IF($V$10<=9,9,AM10)` (nested through `AM14`) | 18 | Design span family |
| `подбор!I5` | — | 4.5 | Family-18 automatic step candidate, m |
| `подбор!AA14` | `INDEX($I$2:$I$7,MATCH(AM9,$A$2:$A$7,0))` | 4.5 | Automatic family lookup, m |
| `подбор!AA15` | `INDEX($I$9:$I$14,MATCH(BD9,$A$9:$A$14,0))` | 4.5 | Duplicate second lookup table, m |
| `вывод!D8` | `подбор!AA14` | 4.5 | Displayed automatic step, m |
| `вывод!F8` | `IF(D9=0,D8,D9)` | 4.5 | Effective step after blank/manual switch, m |

The active automatic path is therefore `D9 blank → W2=0 → AA14 → D8 → F8`,
and it produces exactly 4.5 m. No formula rounds 4.5 to 4.0.

## SOURCE climate/branch and selected row

The local branch controllers are:

| Cell | Formula | Cached value |
|---|---|---:|
| `подбор!AJ9` | responsibility-dependent lookup from `снегветер` | `IV` |
| `подбор!AK9` | exact city lookup in `снегветер!H3:H600` | `I` |
| `подбор!AJ10` | `INDEX(AP17:AX17,MATCH(AJ9,AP16:AX16,0))` | 4 |
| `подбор!AK10` | `INDEX(AP17:AX17,MATCH(AK9,AP16:AX16,0))` | 1 |
| `подбор!AJ11` | `AJ10&"/"&AK10` | `4/1` |
| `подбор!V7` | `INDEX($W$19:$W$44,MATCH($AJ$11,$V$19:$V$44,0))` | `4/1` |
| `подбор!AN9` | height-band formula | 4.8 |
| `подбор!W9` | `IF(вывод!E8>вывод!E9,AJ15,AJ14)` | 0.8 |

The authoritative SOURCE row is `18м!DF11:EA11`:

```text
DF11 = 4/1       (branch)
DG11 = 4.8       (height, m)
DH11 = 4.5       (nominal frame step, m)
DI11 = ПГС300/20х80х2,5   (column)
DJ11 = 65        (column utilization, %)
DK11 = ПГС300/20х80х3     (beam)
DL11 = 83        (beam utilization, %)
DV11 = 985       (frame mass, kg)
EA11 = 4.8689222222222224 (secondary/tube aggregate, kg/m²)
```

`DF2` identifies the k=0.8 block. Thus `W9=0.8`, `AJ11=4/1`, and `AN9=4.8`
identify this row without any project-ID special case.

## SOURCE frame-count semantics

The active row carries the project length in `EE11=30` m. The shared master
formulas are visible at `18м!EC6` and `18м!ED6` and apply to `EC11`/`ED11`:

```text
EC11 = CEILING(EE11/DH11) - 1 = CEILING(30/4.5) - 1 = 6
ED11 = CEILING(EE11/DH11) + 1 = CEILING(30/4.5) + 1 = 8
```

Therefore SOURCE frame count is 8. `подбор!T5` also has cached value 8; its
neighbouring formula pattern is `CEILING(V11/I5)+1`.

The 4.5 m value is a nominal lookup/spacing limit used by the count formula,
not an equalized geometric bay spacing: eight frames create seven bays, so
the equalized spacing implied by the count would be `30/7 = 4.2857142857 m`.
No separate SOURCE cell was found that stores this equalized value; downstream
aggregate formulas use the nominal step and the count independently.

## Core1 trace

For the same input, `resolveDesignSpanFamily(18)` returns family 18. The
current `FrameSelector` then applies:

```text
AUTOMATIC_FRAME_STEP_M[18] = 4
```

The extracted `frame_18m_cells.csv` does contain the SOURCE value 4.5. For the
active `4/1`, height-4.8 branch, the relevant static rows are:

| Static row | Factor block | Branch | Height | Step |
|---|---:|---|---:|---:|
| `BV11` | k=1.0 | 4/1 | 4.8 m | 4.0 m |
| `DF11` | k=0.8 | 4/1 | 4.8 m | 4.5 m |
| `LL11` | k=1.0 | 4/1 | 4.8 m | 4.0 m |
| `MV11` | k=0.8 | 4/1 | 4.8 m | 4.5 m |

Unique Core1 candidate steps are therefore `[4.0, 4.5]`; 4.5 is not missing.
For responsibility 1.0 the selector's observed factor preference starts with
k=0.8, but its automatic-step filter asks that block for step 4.0. Since no
k=0.8 row satisfies that filter, it falls back to the k=1.0 block and selects
`BV11`, yielding 4.0 m.

## First divergence and classification

- `LAST_MATCHING_VALUE`: climate tuple, literal span 18 m, design family 18,
  length 30 m, height 5 m, responsibility 1.0, and blank automatic D9 mode.
- `FIRST_DIVERGING_VALUE`: automatic family-18 step candidate — SOURCE
  `подбор!AA14 = подбор!I5 = 4.5 m`; Core1
  `AUTOMATIC_FRAME_STEP_M[18] = 4.0 m`.
- Root cause: **`FRAME_STEP_FORMULA_ERROR`**. The selector uses a stale
  hard-coded automatic-step map instead of the proven family lookup. This is
  not a missing static row, candidate-order tie-break, or project-specific
  condition.

All column, frame-mass, secondary, purlin, D68, structural-base, and D69
differences occur after this step divergence and were not treated as separate
root causes in this audit.

## Comparison with 22318

For 22318 (span family 15), the same SOURCE lookup path resolves
`подбор!AA14` from `подбор!I4 = 4.0 m`, and Core1's family-15 map is also 4.0 m.
Thus 22318 matches by data coincidence of the family row; the difference for
22316 is explained by family-18 data, not by project identity.

## Generic fix applied

The generic automatic-step map now uses the proven family-18 value `4.5 m`
(`AUTOMATIC_FRAME_STEP_M[18]`). The change is family-based, not a 22316 or
Березовский special case. Non-zero manual D9 overrides and the existing 22318
regression remain unchanged.

The targeted FrameSelector regression passes and selects the SOURCE row
`DF11`, producing 4.5 m and eight frames for 22316.
