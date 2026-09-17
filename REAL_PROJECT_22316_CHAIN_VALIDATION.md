# REAL PROJECT 22316 — END-TO-END CHAIN VALIDATION

## Scope and evidence

This is a parity audit after adding one explicitly proven climate tuple and
correcting the generic family-18 automatic frame-step lookup. No XLSX was
modified. The requested source path
`E:\\SprintMv1\\_reference\\22316\\22316\\_SOURCE\\_SELECTION.xlsx` does not
exist in this checkout; the verified source is
`E:\\SprintMv1_reference\\22316\\22316_SOURCE_SELECTION.xlsx`. The
downstream workbook is
`E:\\SprintMv1_reference\\22316\\22316.xlsx`.

The source and Core1 chains are compared in the requested order. Once a real
divergence is reached it is reported, but downstream values are shown only for
diagnostic confirmation and are not used to justify an automatic fix.

## ProjectInput and adapter

| Field | SOURCE workbook evidence | CORE1 replay | Result |
|---|---|---|---|
| city / country | `подбор!V6` → `Березовский`, RU | `CITY_LOOKUP`, RU, `Березовский` | MATCH |
| normative system | legacy SP-20 branch (`AJ9/AK9`, local workbook) | `SP_20` | MATCH |
| span | `вывод!D4 = 18` m | `span_m = 18` | MATCH |
| building length | `вывод!D5 = 30` m | `building_length_m = 30` | MATCH |
| building height | `вывод!D6 = 5` m | `building_height_m = 5` | MATCH |
| responsibility | `вывод!D7 = 1` | `responsibility_factor = 1.0` | MATCH |
| frame-step mode | `вывод!D9` blank (automatic) | `frame_step_override_m = null` | MATCH |
| snow-retention purlin | `вывод!D26 = есть` | `snow_retention_purlin = есть` | MATCH |
| enclosure purlin | `вывод!D27 = нет` | `enclosure_purlin = нет` | MATCH |
| roof covering | `вывод!D20 = С-П 150` | `С-П 150` | MATCH |
| deck grade | `вывод!D21 = С44-1000-0,7` | `С44-1000-0,7` | MATCH |
| gates / doors | `вывод!D60 = 1`, `D61 = 0`, `D62 = 1` | one ≤6 m gate, zero >6 m gates, one door | MATCH at proven count level |
| windows | `вывод!D64:D66 = 0` | windows disabled | MATCH |

The workbook stores gate/door counts, not a complete dimensional ProjectInput;
the adapter replay therefore uses the already-proven width-boundary policy.
That dimensional projection is not the first divergence.

## Ordered chain comparison after the family-18 automatic-step fix

| Chain field | SOURCE | CORE1 | Result |
|---|---:|---:|---|
| climate | `Березовский`, SP-20; snow IV / 1.5 kN/m², wind I / 0.23 kN/m² | exact `CITY_LOOKUP:RU:Березовский:SP_20`; snow IV / 1.5 kN/m², wind I / 0.23 kN/m² | MATCH |
| literal span | 18 m | 18 m | MATCH |
| design span family | 18 m (`подбор!AM9/BD9 = 18`) | 18 m | MATCH |
| selected frame step | 4.5 m (`вывод!D8 = подбор!AA14`, `18м!IG19`) | 4.5 m (`FrameResult.frame_step_m`) | MATCH |
| frame count | 8 (`ceil(30/4.5)+1`) | 8 (`ceil(30/4.5)+1`) | MATCH |
| beam | `ПГС300/20х80х3` (`подбор!V14`) | `ПГС300/20х80х3` | MATCH |
| column | `ПГС300/20х80х2,5` (`подбор!U14`) | `ПГС300/20х80х2,5` | MATCH |
| displayed frame mass | 985 kg (`подбор!Y15`) | 985 kg (`FrameResult.frame_mass_kg`) | MATCH |
| secondary / tube mass | 4.8689222222222224 kg/m² (`подбор!H5`, `18м!IF19`) | 4.868922222222222 kg/m² | MATCH |
| purlin profile | `2ПС 200х65х1,5` (`Подбор прогонов!P28`) | `2ПС 200х65х1,5` | MATCH |
| purlin steel | `М.п.350` (`Подбор прогонов!U28`) | `М.п.350` | MATCH |
| purlin step | 1800 mm (`Подбор прогонов!S28`) | 1800 mm | MATCH |
| purlin mass | 3174.6000000000004 kg (`Подбор прогонов!V28`) | 3174.6000000000004 kg | MATCH |
| purlin specific mass | 6.1728333333333341 kg/m² (`Подбор прогонов!T28`) | 6.172833333333334 kg/m² | MATCH |
| D68 | 0.79955555555555546 kg/m² (`вывод!D68 = Лист1!O28`) | included in final summary chain | VERIFIED THROUGH D69 |
| structural base | 28.12323703703704 kg/m² (`вывод!E8`) | included in final summary chain | VERIFIED THROUGH D69 |
| D69 | 28.922792592592597 kg/m² | 28.922792592592597 kg/m² | MATCH |

## Exact source formula path

The source structural path is:

```text
вывод!D69
  = IF(D9=0,E8,E9)+D68
вывод!E8
  = подбор!Z14 + 'Подбор прогонов'!$T$28
подбор!Z14
  = INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))
подбор!O5
  = (E5+G5*T5)/(18*$V$11)+H5
```

For 22316, `AM9=18`, `V11=30`, `G5=985`, `T5=8`, `H5=4.8689222222222224`,
and `T28=6.1728333333333341`, yielding `E8=28.12323703703704` and then
`D69=28.922792592592597`.

## First-divergence decision after the family-18 fix and input remapping

- The intermediate replay with `snow_retention_purlin = "нет"` was invalid
  because the source has `вывод!D26 = "есть"`.
- After mapping the source flag, purlin mass and specific mass match exactly
  within floating-point tolerance.
- `D69` also matches: SOURCE `28.922792592592597` versus Core1
  `28.922792592592597`.
- Classification: `INPUT_FIXTURE_MISMATCH`, now **CLOSED**.

No purlin algorithm was changed. 22326 remains `SOURCE_SUSPICIOUS` and is not
used here.

## 22318 regression check

The established 22318 reference remains unchanged: source `вывод!D69` is
`32.285826388888886` kg/m², and the existing Core1 real-project regression
continues to assert that value.

## Changes

Production changes include the exact climate key/tuple and the generic
family-18 automatic-step mapping, each with regression coverage. The 22316
replay now maps `D26=есть`; this closes the apparent purlin-mass divergence
without changing `PurlinCalculator`. No workbook was changed. No further
first divergence is observed through `D69`.

## Current classification

`22316 = REAL_PROJECT_REFERENCE`.

The earlier purlin-mass discrepancy was an input-fixture mapping error: the source
has `вывод!D26=есть`, while the intermediate fixture used `нет`. After correcting
the fixture mapping, the source-compatible chain reaches exact D69 parity without
changing the purlin algorithm.
