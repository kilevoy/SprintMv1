# 24M active Excel recalculation audit

Режим: controlled read-only experiment. Production TypeScript и исходный XLSX
не изменялись. Каждый сценарий выполнялся на отдельной копии master через
Microsoft Excel COM `CalculateFullRebuild()`.

## Final classification

`24M_ACTIVE_RECALC_PARTIAL`

Полная активная цепочка успешно пересчиталась для трёх независимых случаев:

- baseline control (исходный span 12 м);
- span 24 м, Роза, высота 3 м, auto step;
- span 24 м, Сургут, высота 3 м, auto step;
- span 24 м, Роза, alternate roof/deck.

В этих случаях `24м!KM6`, `WO6`, `KM19`, `WO19`, `подбор!Z14/Z15`,
`E8/E9` и `D69` стали числовыми/текстовыми значениями, без `#N/A`.

Два дополнительных сценария не дали стабильного результата в текущем Excel
COM-сеансе: высота `6,2 м` и manual frame step `6 м`. Поэтому верхняя граница
высоты и manual-step branch остаются неполностью доказанными.

## Environment and source integrity

- Excel COM: `15.0`, build `4569`.
- Source SHA before: `0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f`.
- Source SHA after: `0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f`.
- Исходный master не открывался для записи.
- Временные copies находятся только в `%TEMP%\SprintM_24m_*`.

## Baseline control

Оригинальные сохранённые входы: `D4=12`, `D5=18`, `D6=3`, `D7=0,8`, `D9=blank`.
После `CalculateFullRebuild()` получено:

| Cell | Formula | Recalculated value |
|---|---|---:|
| `вывод!E8` | `=подбор!Z14+'Подбор прогонов'!$T$28` | `30.25967361111111` |
| `вывод!E9` | `=подбор!Z15+'Подбор прогонов 2'!$T$28` | `30.25967361111111` |
| `вывод!D68` | `=Лист1!O28` | `0` |
| `вывод!D69` | `=IF(D9=0,E8,E9)+D68` | `30.25967361111111` |
| `подбор!Z14` | `INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))` | `22.72067361111111` |
| `подбор!Z15` | `INDEX($O$9:$O$14,MATCH(BD9,$A$9:$A$14,0))` | `22.72067361111111` |
| `Подбор прогонов!T28` | `=IF(T25=0,T26,T25)` | `7.539` |

Baseline reproduces the known saved 12m result; the experiment continued.

## Active scenario A — 24m, baseline inputs

Inputs: `D4=24`, `D5=18`, `D6=3`, `D7=0,8`, `D9=blank`, city `Роза`,
default roof/deck, zero openings.

| Stage | Recalculated value |
|---|---:|
| `подбор!AM9`, `BD9` | `24`, `24` |
| `подбор!AN9`, `BE9` | `6`, `6` |
| `24м!KL5`, `KL13`, `WN5`, `WN13` | `6`, `6`, `6`, `6` |
| `24м!KL18`, `WN18` | `1`, `1` |
| `24м!KM6`, `WO6` | `ПГС300/20х80х2,5`, `ПГС300/20х80х2,5` |
| `24м!KM19`, `WO19` | `ПГС300/20х80х2,5`, `ПГС300/20х80х2,5` |
| `подбор!KO19`, `WQ19` | `458.18`, `458.18` |
| `подбор!O7`, `O14` | `31.39628736728395`, `31.39628736728395` |
| `подбор!Z14`, `Z15` | `31.39628736728395`, `31.39628736728395` |
| `Подбор прогонов!T28`, `T28` (2nd sheet) | `4.3365`, `4.3365` |
| `вывод!D68` | `0` |
| `вывод!E8`, `E9` | `35.73278736728395`, `35.73278736728395` |
| `вывод!D69` | `35.73278736728395` |

First recalculated 24m lookup `KM6` succeeds. No active `#N/A` exists in this
chain. Since `E8=E9`, the prompt's natural rule selects `ROW14` (the `E8>E9`
condition is false); no helper cell was edited.

## Active scenario C — 24m, second proven climate state

Inputs are scenario A with city `Сургут` (responsibility `0,8`).

| Stage | Recalculated value |
|---|---:|
| `подбор!V7` | `4/1` |
| `подбор!AN9`, `BE9` | `6`, `6` |
| `24м!KL18`, `WN18` | `0.8`, `0.8` |
| `24м!KM6`, `WO6` | `ПГС300/20х80х2`, `ПГС300/20х80х2` |
| `24м!KM19`, `WO19` | `ПГС300/20х80х2`, `ПГС300/20х80х2` |
| `подбор!Z14`, `Z15` | `29.00852826234568`, `29.00852826234568` |
| `Подбор прогонов!T28`, `T28` (2nd sheet) | `4.64625`, `4.64625` |
| `вывод!D68` | `0` |
| `вывод!E8`, `E9` | `33.65477826234568`, `33.65477826234568` |
| `вывод!D69` | `33.65477826234568` |

This proves that a different local climate result also traverses the 24m
chain without `#N/A`.

## Active scenario D — alternate roof/deck

Inputs are scenario A with `D20 = С-П 150` and
`D21 = С44-1000-0,7`.

| Stage | Recalculated value |
|---|---:|
| `подбор!AN9`, `BE9` | `6`, `6` |
| `24м!KL18`, `WN18` | `0.8`, `0.8` |
| `24м!KM6`, `WO6` | `ПГС300/20х80х2,5`, `ПГС300/20х80х2,5` |
| `24м!KM19`, `WO19` | `ПГС300/20х80х2`, `ПГС300/20х80х2` |
| `подбор!Z14`, `Z15` | `26.979706743827165`, `26.979706743827165` |
| `Подбор прогонов!T28`, `T28` (2nd sheet) | `4.956`, `4.956` |
| `вывод!D68` | `0` |
| `вывод!E8`, `E9` | `31.935706743827165`, `31.935706743827165` |
| `вывод!D69` | `31.935706743827165` |

The roof/deck branch is therefore active and numeric for this 24m case.

## Scenarios that did not reach a stable oracle

| Scenario | Observation | Classification |
|---|---|---|
| `span=24`, `height=6,2`, auto | Excel COM session did not finish with a saved result within the controlled run; no cell-level error can be asserted | `24M_UPPER_HEIGHT_RECALC_UNRESOLVED` |
| `span=24`, manual `D9=6` | Excel COM session did not finish with a saved result; no internal selector cells were edited | `24M_MANUAL_STEP_RECALC_UNRESOLVED` |
| natural ROW15 search | A/C/D all had `E8=E9`; no natural `E8>E9` case was found | `24M_ROW15_ACTIVE_CASE_NOT_FOUND` |

These are not converted to `#N/A`, zero, nearest-step, or extrapolated values.

## First error and branch conclusion

For the three successful active 24m runs there is no recalculated Excel error.
The previously observed `24м!KM6`/`WO6` `#N/A` was caused by the stale saved
key `3,6` from a workbook saved at span 12. After setting `D4=24` and running
Excel's full rebuild, the key is `6`, exact MATCH succeeds, and the full chain
reaches `D69`.

The natural branch rule was evaluated without forcing helper cells:

```text
if E8 > E9: ROW15
else:       ROW14
```

All successful cases had `E8=E9`, hence active `ROW14`. ROW15 remains an
unobserved branch, not an assumed error.

## Core1 comparison and decision

Current Core1 still returns `LEGACY_NA` immediately for `span=24`, before running
the frame/purlin/summary chain. That is the first divergence for scenarios A,
C and D: Excel produces a complete numeric 24m chain, while Core1 exits with
the old unconditional diagnostic.

No production fix was applied in this audit. The evidence now supports changing
the contract in a separate implementation task:

- 24m geometry: `SUPPORTED`;
- 24m frame lookup: `SUPPORTED` for the successfully recalculated cases;
- 24m purlin/secondary/D69 path: numeric and locally calculated in A/C/D;
- unconditional `span=24 → LEGACY_NA`: disproven;
- upper-height/manual-step behavior: still requires separate stable oracles;
- ROW15: not yet observed naturally.

`SAFE TO IMPLEMENT 24m diagnostics = YES`, provided diagnostics are based on
the actual active cell/error. Do not retain an unconditional `LEGACY_NA` solely
from `span_m === 24` without a new parity decision.

`PRODUCTION CODE CHANGED = NO`

`XLSX CHANGED = NO`

`COMMIT/PUSH = NO`
