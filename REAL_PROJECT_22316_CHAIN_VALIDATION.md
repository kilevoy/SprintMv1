# REAL PROJECT 22316 — END-TO-END CHAIN VALIDATION

## Scope and evidence

This is a read-only parity audit. No production TypeScript and no XLSX were
modified. The requested source path
`E:\\SprintMv1\\_reference\\22316\\22316\\_SOURCE\\_SELECTION.xlsx` does not
exist in this checkout; the verified source is
`E:\\SprintMv1_reference\\22316\\22316_SOURCE_SELECTION.xlsx`. The
downstream workbook is
`E:\\SprintMv1_reference\\22316\\22316.xlsx`.

The comparison stops at the first real divergence, as required. A field after
that point is `NOT_REACHED`, not an inferred Core1 result.

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
| climate | `Березовский`, SP-20; local branch resolves snow region IV, snow load 1.5 kN/m², wind region I, wind load 0.23 kN/m² | `UNKNOWN_CLIMATE_DATA` for `CITY_LOOKUP:RU:Березовский:SP_20` | **FIRST DIVERGENCE** |
| literal span | 18 m | not reached | NOT_REACHED |
| design span family | 18 m (`подбор!AM9/BD9 = 18`) | not reached | NOT_REACHED |
| selected frame step | 4.5 m (`вывод!D8 = подбор!AA14`) | not reached | NOT_REACHED |
| frame count | 8 (`ceil(30/4.5)+1`) | not reached | NOT_REACHED |
| beam | `ПГС300/20х80х3` (`подбор!V14`) | not reached | NOT_REACHED |
| column | `ПГС300/20х80х2,5` (`подбор!U14`) | not reached | NOT_REACHED |
| displayed frame mass | 985 kg (`подбор!Y15`) | not reached | NOT_REACHED |
| structural aggregate frame mass | 985 kg (`подбор!G5`, `18м!IE19`) | not reached | NOT_REACHED |
| secondary / tube mass | 4.8689222222222224 kg/m² (`подбор!H5`, `18м!IF19`) | not reached | NOT_REACHED |
| purlin profile | `2ПС 200х65х1,5` (`Подбор прогонов!P28`) | not reached | NOT_REACHED |
| purlin steel | `М.п.350` (`Подбор прогонов!U28`) | not reached | NOT_REACHED |
| purlin step | 1800 mm (`Подбор прогонов!S28`) | not reached | NOT_REACHED |
| purlin mass | 3174.6000000000004 kg (`Подбор прогонов!V28`) | not reached | NOT_REACHED |
| D68 | 0.79955555555555546 kg/m² (`вывод!D68 = Лист1!O28`) | not reached | NOT_REACHED |
| structural base | 28.12323703703704 kg/m² (`вывод!E8`) | not reached | NOT_REACHED |
| D69 | 28.922792592592597 kg/m² | not reached | NOT_REACHED |

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

- `LAST_MATCHING_VALUE`: adapter-projected project inputs through the explicit
  city/normative selection (`Березовский`, RU, `SP_20`), including span 18,
  length 30, height 5, responsibility 1, automatic frame mode, envelope, and
  opening counts.
- `FIRST_DIVERGING_VALUE`: climate resolution. Core1's proven sparse lookup
  contract currently guarantees only the audited RU city keys (including
  `Роза` and `Сургут`); it deliberately returns `UNKNOWN_CLIMATE_DATA` for
  `Березовский` rather than treating the unproven row as parity evidence.
- Classification: `UNSUPPORTED_FOR_PARITY / UNKNOWN_CLIMATE_DATA`.
- 22316 is **not promoted** to `REAL_PROJECT_REFERENCE` in this pass because
  the ordered chain does not reach calculation.

This is a data-contract blocker for this project, not evidence for changing
generic frame, purlin, or structural-summary logic. 22326 remains
`SOURCE_SUSPICIOUS` and is not used here.

## 22318 regression check

The established 22318 reference remains unchanged: source `вывод!D69` is
`32.285826388888886` kg/m², and the existing Core1 real-project regression
continues to assert that value.

## Changes

Only this audit document was added. No production code, fixture, or workbook
was changed; no commit or push was made.
