# PURLIN 22318 — 1900 vs 1875 selection audit

Дата: 2026-09-17
Проект: Сургут, 15 × 24 × 5 м
SOURCE: `E:\SprintMv1_reference\22318_SOURCE_SELECTION.xlsx`
DOWNSTREAM: `E:\SprintMv1_reference\22318.xlsx`

Аудит выполнен после закрытия `WRONG_SNOW_FIELD`. Снеговая нагрузка совпадает: `SOURCE=1.8`, `CORE1=1.8 кН/м²`. На основании этого аудита применён только доказанный generic tie-break; XLSX не изменялся.

## 1. Result

- Core1 **генерирует и оценивает 1900 мм**.
- 1900 мм **принимается** для профиля `2ПС 195х45х1,5` на ветке `М.п.390` (`utilization=0.9980623396181538 < 1`).
- 1875 мм также принимается (`utilization=0.9850639805489639`).
- Оба шага дают одинаковую массу `1699.2 кг` при текущей формуле линий прогонов.
- До исправления цикл Core1 шёл по возрастающим шагам и при строгом `current.weight < best.weight` сохранял первый 1875 мм.

Классификация до исправления: **B — 1900 accepted but 1875 wins by ordering/tie-break**. `CANDIDATE_ORDER_ERROR` теперь закрыт generic-правилом: равная масса → больший шаг.

## 2. Core1 candidate trace

В `src/core1/purlin/PurlinCalculator.ts`:

```text
numericSteps(bundle)
  → unique cached values from purlin_calculation_axis cells matching /^\w+3$/
steps = numericSteps(...).filter(step >= minStep && step <= maxStep)
```

После исправления снеговой нагрузки `deckLimit=1900`, поэтому вокруг divergence фактически оцениваются:

```text
... 1850, 1855, 1860, 1865, 1870, 1875, 1880, 1885,
1890, 1895, 1900
```

1900 присутствует в `steps` и передаётся в `chooseBest`. 1875 также присутствует. Для профиля `2ПС 195х45х1,5` на М.п.390 оба шага проходят `if (utilization > 1) continue`.

Источник `core1/data/purlin_calculation_axis.csv` содержит 5-мм ось, включая 1875 и 1900. Это не доказывает, что каждый такой шаг является активным legacy-результатом: legacy-профильная формула для 22318 разрешает/выдаёт только 1900.

## 3. Legacy automatic branch

The authoritative path remains:

```text
вывод!D9 = blank → D9=0 → вывод!E8
  → Подбор прогонов!T28
```

The step limit used by the automatic purlin calculation is:

```text
вывод!D23
  = INDEX($W$11:$W$63,MATCH($E$23,$X$11:$X$63,-1))
  = 1900

Подбор прогонов!B14
  = IF(вывод!D24=0,вывод!$D$23,вывод!D24)
  = 1900
```

`D24` is blank/0, so no manual override replaces the lookup. The source candidate rows then resolve:

| Branch | Formula/result | Cached |
|---|---|---:|
| `Расчеты 2!C28` | `=IF(B28>99999,999999,INDEX($B$12:$SH$12,1,MATCH(B28,B15:SH15,0)+IF(B49<3,0,(B49-1))))` | `1900` |
| `Расчеты МП390 2!C28` | same formula family | `1900` |
| `Подбор прогонов 2!E23` | `=IF(D23="0","0",'Расчеты 2'!C28)` | `1900` |
| `Подбор прогонов 2!E30` | `=IF(D30="0","0",'Расчеты МП390 2'!C28)` | `1900` |
| `Подбор прогонов 2!S28` | `=IF(S25=0,S26,S25)` | `1900` |
| `вывод!D28` | `='Подбор прогонов 2'!$S$28` | `1900` |

Legacy therefore uses a discrete formula-derived candidate result for each steel/profile branch. It does not search downward from 1900 in this scenario, and it does not use 1875 as the active profile result. The raw calculation axis is 5-mm, but `C28` resolves the branch candidate to 1900.

## 4. SOURCE / CORE1 values at 1900 and 1875

Common inputs after the snow correction:

| Input | Value |
|---|---:|
| span | 15 m |
| frame step | 4 m |
| responsibility factor | 1.0 |
| roof covering | `С-П 150` |
| deck | `С44-1000-0,7` |
| snow load | 1.8 kN/m² |
| roof self-weight | 32.028 kg/m² |
| slope | 15° |
| wind addend | 0.2 kN/m² |
| calculation factor | 1.13 |
| snow retention / enclosure | `нет` / `нет` |

The exact line-load term in SOURCE `Расчеты МП390 2!ADI4` at 1900 is:

```text
q = 6.86573326034617
```

Core1 uses the same numeric expression in `loadAtStep`; at 1875 only the final `step/1000` factor changes.

| Metric | SOURCE @1900 | CORE1 @1900 | CORE1 @1875 | Match / effect |
|---|---:|---:|---:|---|
| evaluated step | 1900 | 1900 | 1875 | expected branch difference |
| purlin line-load term `q` | 6.86573326034617 | 6.86573326034617 | 6.775394664815299 | step-scaled |
| profile | `2ПС 195х45х1,5` | `2ПС 195х45х1,5` | `2ПС 195х45х1,5` | MATCH |
| steel | `М.п.390` | `М.п.390` | `М.п.390` | MATCH |
| thickness / mass per m | 1.5 mm / 7.08 kg/m | 1.5 mm / 7.08 kg/m | 1.5 mm / 7.08 kg/m | MATCH |
| section capacity | 13.900000000000002 | 13.9 (MP390 map) | 13.9 | MATCH |
| utilization | 0.9980623396181538 (`Расчеты МП390 2!ADI22`) | 0.9980623396181538 | 0.9850639805489639 | all accepted |
| purlin lines | 5 | 5 | 5 | tie |
| purlin mass | 1699.2 kg | 1699.2 kg | 1699.2 kg | tie |
| purlin kg/m² | 4.9559999999999995 | 4.956 | 4.956 | tie |
| moment / deflection / inertia checks | not exposed as separate cached outputs in this branch audit | not separate Core1 gates | not separate Core1 gates | no additional reject observed |

SOURCE `Расчеты МП390 2!ADI22` formula is:

```text
=((ADI$4+$SM22/100)*'Подбор прогонов 2'!$B$1^2/8*'Подбор прогонов 2'!$B$10)/$SL22
```

with cached `SM22=7.08`, `SL22=13.900000000000002`, `ADI4=6.86573326034617`, result `0.9980623396181538`. Core1's corresponding utilization expression is the `((loadAtStep(step) + candidate.mass / 100) * frame_step^2 / 8 * responsibility_factor) / capacity` line in `chooseBest`.

## 5. Profile and steel branch

Both legacy steel branches are evaluated:

| Branch | Profile | Step | Mass per m² | Total mass | Result |
|---|---|---:|---:|---:|---|
| М.п.350 (`Подбор прогонов 2!D23/E23/M23/N23`) | `2ПС 200х65х1,5` | 1900 | 5.698 | 1953.6 kg | candidate |
| М.п.390 (`Подбор прогонов 2!D30/E30/M30/N30`) | `2ПС 195х45х1,5` | 1900 | 4.9559999999999995 | 1699.2 kg | candidate |

The legacy decision is:

```text
P26 = IF(M23>M30,D30,D23) → 2ПС 195х45х1,5
S26 = IF(M23>M30,E30,E23) → 1900
U26 = IF(M23>M30,A27,A20) → М.п.390
V26 = IF(N23>N30,N30,N23) → 1699.1999999999998
```

Core1 searches `chooseBest("М.п.350")` and `chooseBest("М.п.390")`, then chooses the lower `kgPerM2`. At 1900 it evaluates the exact target profile and MP390 branch; it does not reject them. At 1875 the same profile/steel remains accepted and has equal computed weight. After the fix, the local `1e-9` kg tolerance treats the two masses as equal and selects the larger 1900-mm step.

## 6. First-divergence trace

| Value | SOURCE | CORE1 | Status |
|---|---:|---:|---|
| snow load | 1.8 | 1.8 | MATCH |
| deck `D21` | `С44-1000-0,7` | same | MATCH |
| deck maximum | 1900 | 1900 | MATCH |
| 1900 generated | yes | yes | MATCH |
| 1900 evaluated | branch candidate | yes | MATCH |
| 1900 accepted for 2ПС195 / М.п.390 | yes | yes | MATCH |
| 1875 accepted | not active legacy result | yes | accepted but loses tie-break |
| final selected step | 1900 | **1900** | MATCH after tie-break fix |

`LAST_MATCHING_VALUE = 1900 candidate acceptance for 2ПС195х45х1,5 / М.п.390.`
Before the fix, `FIRST_DIVERGING_VALUE = final step selection: SOURCE 1900 vs CORE1 1875.` After the fix this divergence is closed; the remaining comparison continues at StructuralSummary/D69.

1875 is a legitimate value on the raw Core1/Excel 5-mm axis, but it is **not the active legacy candidate result for this automatic 22318 branch**. The mismatch is therefore a candidate-selection/tie-break compatibility issue, not a claim that 1875 is physically invalid in all Excel scenarios.

## 7. Switch and zero logic

The following legacy controls remain part of the explanation and were not simplified:

- `вывод!D9` blank/0 selects automatic `E8`;
- `вывод!D24` blank/0 selects lookup maximum `D23`;
- `Подбор прогонов!B15=0` is the lower-step boundary;
- `D23/D30` use `IF(OR(...),"0",...)` disabled-row sentinels;
- `P25/P26` and `S25/S26/T25/T26/U25/U26/V25/V26` use zero-sentinel branch selection;
- calculation cells mask out-of-range steps with `IF(...,9999999,...)`.

## 8. Implementation boundary

Implemented fix: the step-selection block in `src/core1/purlin/PurlinCalculator.ts` now compares primary total mass first, then uses `1e-9 kg` tolerance and larger `step` as the sole equal-mass tie-break. Candidate generation, acceptance formulas, profile search and steel search are unchanged. No project/profile/step value is hardcoded.

Files changed for this implementation: `src/core1/purlin/PurlinCalculator.ts`, `src/core1/purlin.test.ts`, `src/core1/realProject22318.test.ts`, and this audit. No XLSX, commit, or push was performed.
