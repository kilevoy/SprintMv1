# REAL PROJECT 22316 — END-TO-END CHAIN VALIDATION

## Scope and evidence

This is a parity audit after adding one explicitly proven climate tuple. No
XLSX was modified. The requested source path
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
| roof covering | `вывод!D20 = С-П 150` | `С-П 150` | MATCH |
| deck grade | `вывод!D21 = С44-1000-0,7` | `С44-1000-0,7` | MATCH |
| gates / doors | `вывод!D60 = 1`, `D61 = 0`, `D62 = 1` | one ≤6 m gate, zero >6 m gates, one door | MATCH at proven count level |
| windows | `вывод!D64:D66 = 0` | windows disabled | MATCH |

The workbook stores gate/door counts, not a complete dimensional ProjectInput;
the adapter replay therefore uses the already-proven width-boundary policy.
That dimensional projection is not the first divergence.

## Ordered chain comparison

| Chain field | SOURCE | CORE1 | Result |
|---|---:|---:|---|
| climate | `Березовский`, SP-20; snow IV / 1.5 kN/m², wind I / 0.23 kN/m² | exact `CITY_LOOKUP:RU:Березовский:SP_20`; snow IV / 1.5 kN/m², wind I / 0.23 kN/m² | MATCH |
| literal span | 18 m | 18 m | MATCH |
| design span family | 18 m (`подбор!AM9/BD9 = 18`) | 18 m | MATCH |
| selected frame step | 4.5 m (`вывод!D8 = подбор!AA14`, `18м!IG19`) | 4 m (`FrameResult.frame_step_m`) | **FIRST DIVERGENCE** |
| frame count | 8 (`ceil(30/4.5)+1`) | 9 (`ceil(30/4)+1`) | MISMATCH |
| beam | `ПГС300/20х80х3` (`подбор!V14`) | `ПГС300/20х80х3` | MATCH (profile) |
| column | `ПГС300/20х80х2,5` (`подбор!U14`) | `ПГС300/20х80х3` | MISMATCH |
| displayed frame mass | 985 kg (`подбор!Y15`) | 1025 kg (`FrameResult.frame_mass_kg`) | MISMATCH |
| structural aggregate frame mass | 985 kg (`подбор!G5`, `18м!IE19`) | 1025 kg (same Core1 frame result) | MISMATCH |
| secondary / tube mass | 4.8689222222222224 kg/m² (`подбор!H5`, `18м!IF19`) | 4.68558888888889 kg/m² | MISMATCH |
| purlin profile | `2ПС 200х65х1,5` (`Подбор прогонов!P28`) | `2ПС 145х45х1,5` | MISMATCH |
| purlin steel | `М.п.350` (`Подбор прогонов!U28`) | `М.п.390` | MISMATCH |
| purlin step | 1800 mm (`Подбор прогонов!S28`) | 1510 mm | MISMATCH |
| purlin mass | 3174.6000000000004 kg (`Подбор прогонов!V28`) | 2478.0000000000005 kg | MISMATCH |
| D68 | 0.79955555555555546 kg/m² (`вывод!D68 = Лист1!O28`) | 0.7925555555555556 kg/m² | MISMATCH |
| structural base | 28.12323703703704 kg/m² (`вывод!E8`) | 29.4909592592593 kg/m² | MISMATCH |
| D69 | 28.922792592592597 kg/m² | 30.28351481481482 kg/m² | MISMATCH |

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

## First-divergence decision

- `LAST_MATCHING_VALUE`: exact climate tuple for `RU|Березовский|SP_20` and
  the preceding ProjectInput/adapter fields.
- `FIRST_DIVERGING_VALUE`: selected frame step, SOURCE 4.5 m versus Core1 4 m.
- Classification: `FRAME_STEP_FORMULA_ERROR` (the detailed trace is in
  `FRAME_STEP_22316_AUDIT.md`).
- Core1 reaches StructuralSummary and produces D69, but 22316 is **not
  promoted** to `REAL_PROJECT_REFERENCE` because the ordered chain diverges at
  frame selection.

This is a stale automatic-step map, not evidence for changing purlin or
structural-summary logic. 22326 remains
`SOURCE_SUSPICIOUS` and is not used here.

## 22318 regression check

The established 22318 reference remains unchanged: source `вывод!D69` is
`32.285826388888886` kg/m², and the existing Core1 real-project regression
continues to assert that value.

## Changes

Production changes are limited to the exact climate key/tuple in
`ClimateResolver.ts` and its regression test. No workbook was changed. The
next frame-step divergence was not fixed; no commit or push was made.
