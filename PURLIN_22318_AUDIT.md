# PURLIN 22318 — first-divergence audit

Дата аудита: 2026-09-17
Проект: `22318`, Сургут, 15 × 24 × 5 м
Источник: `E:\SprintMv1_reference\22318_SOURCE_SELECTION.xlsx`
SHA-256 источника: `dbf29d01db4fe81e8e0a997a69f045330f715b64df3c828bc9d3cc4601116ac3`

Указанный в задании путь `E:\SprintMv1\_reference\22318\_SOURCE_SELECTION.xlsx` в рабочем clone отсутствует; проверен подтверждённый файл из `E:\SprintMv1_reference`.

## 1. Authoritative legacy branch

Входной режим автоматический:

| Ячейка | Формула | Cached value | Роль |
|---|---|---:|---|
| `вывод!D8` | `=подбор!AA14` | `4` | автоматический шаг рам |
| `вывод!D9` | blank | blank (в Excel сравнивается как 0) | ручной override не задан |
| `вывод!F8` | `=IF(D9=0,D8,D9)` | `4` | эффективный шаг |
| `вывод!E8` | `=подбор!Z14+'Подбор прогонов'!$T$28` | `30.076159722222222` | ветка для `D9=0` |
| `вывод!E9` | `=подбор!Z15+'Подбор прогонов 2'!$T$28` | `30.076159722222222` | ручная ветка |
| `вывод!D69` | `=IF(D9=0,E8,E9)+D68` | `32.285826388888886` | итоговая удельная металлоёмкость |

Следовательно, для `D69` authoritative является **`Подбор прогонов!T28` через `вывод!E8`**. `Подбор прогонов 2` заполняется и содержит те же cached values в этом проекте, а `вывод!D28`, `D35`, `E35` напрямую читают его для отображения выбранного прогона; это не меняет ветку `D69`.

## 2. Exact origin of 1900 mm

Цепочка ограничения шага:

1. `Расчеты!C8` — формула lookup новой снеговой ветки; cached `1.8` кН/м².
2. `Подбор прогонов!B12` — `=(Расчеты!C8*Расчеты!C5*Расчеты!C6*COS('Подбор прогонов'!$B$9*PI()/180)+'Подбор прогонов'!$B$8)*100`; cached `287.75463904732976` кг/м².
3. `Подбор прогонов!B13` — `=B12/100`; cached `2.8775463904732974` кН/м².
4. `вывод!E23` — `='Подбор прогонов 2'!B13*1.15`; cached `3.309178349044292`.
5. `вывод!D23` — `=INDEX($W$11:$W$63,MATCH($E$23,$X$11:$X$63,-1))`; cached **`1900` мм**. В матрице `вывод`: `W40=1900`, `X40=3.416`; следующая строка `W41=1950`, `X41=3.303`, поэтому `MATCH(...,-1)` выбирает строку 40.
6. `Подбор прогонов!B14` — `=IF(вывод!D24=0,вывод!$D$23,вывод!D24)`; cached `1900` мм. `D24` blank/0, поэтому действует lookup `D23`.
7. В кандидатной таблице: `Подбор прогонов 2!E23=1900` и `E30=1900`; `S28=IF(S25=0,S26,S25)` → `1900`; `вывод!D28='Подбор прогонов 2'!$S$28` → `1900`.

Таким образом, 1900 мм — **максимально допустимый шаг настила по lookup**, а не уже выбранный шаг прогона.

## 3. Candidate steps

### SOURCE

После `B14=1900` и `B15=0` активные профильные кандидаты расчётных листов имеют шаг:

`SOURCE candidate steps = [1900]`.

Это `Расчеты 2!C28=1900` / `Расчеты МП390 2!C28=1900` (аналогично в ветке без суффикса `2`). Исходная ось расчёта содержит более широкую сетку шагов 500…3000 мм с шагом 5 мм, но `SMALL` в каждом профиле оставляет только допустимый для данного профиля шаг; в текущем сценарии это 1900 мм.

### CORE1

`CORE1 candidate steps = [500, 505, 510, …, 1750]` — 251 значений, шаг 5 мм. В текущем `PurlinCalculator.ts` фильтр `step <= deckLimit` исключает 1800 и выше.

## 4. Classification of 1900

**Case A — 1900 отсутствует среди Core1 candidates.**

Это следствие более раннего значения `deck_step_limit_mm=1750`; 1900 не является отвергнутым после проверки профиля и не проигрывает 1500 по сортировке.

## 5. SOURCE vs CORE1 before profile selection

| Величина | SOURCE | CORE1 | Состояние |
|---|---:|---:|---|
| frame step | 4 м (`вывод!D8`) | 4 м | MATCH |
| roof covering `D20` | `С-П 150` | `С-П 150` | MATCH |
| deck grade `D21` | `С44-1000-0,7` | `С44-1000-0,7` | MATCH |
| снеговой lookup input | `Расчеты!C8 = 1.8` кН/м² (`Города п.К!E138`) | `climate_lookup_sparse`: `G138 = 2.0` кН/м² | **MISMATCH** |
| wind city value | `I138 = 0.23` кН/м² | `I138/AY138 = 0.23` кН/м² | MATCH |
| purlin wind addend | `Подбор прогонов!B8 = 0.2` | тот же legacy addend | MATCH |
| roof self-weight | `Подбор прогонов!B7 = 32.028` кг/м² | trace `32.028` кг/м² | MATCH |
| snow retention purlin | `нет` (`B16`) | `нет` | MATCH |
| enclosure purlin | `нет` (`B17`) | `нет` | MATCH |
| purlin-driving demand | `E23 = 3.309178349044292` | при Core1 snow=2: `3.65130927671588` | derived mismatch |
| roof geometry / slope | `B9=IF(B2>21,6,15)` → 15° | 15° for span 15 м | MATCH |
| deck maximum | 1900 мм | 1750 мм | downstream consequence |

`FIRST_DIVERGING_VALUE = снеговая нагрузка: SOURCE 1.8 кН/м² vs CORE1 2.0 кН/м².`
`LAST_MATCHING_VALUE = D21 = С44-1000-0,7 (последний вход перед city snow lookup в проверяемом порядке).`
Независимые последующие входы также совпадают: `B7=32.028`, `B8=0.2`, `B16/B17=нет`, угол 15°.

## 6. Exact deck interpretation

`D20 = С-П 150` is the roof-covering key. `D21 = С44-1000-0,7` is the profiled-deck key used to select the deck matrix column (`вывод!AQ10` in the extracted static dataset).

`D23` is obtained from the descending deck-capacity axis `X11:X63` by `MATCH(E23, ..., -1)`. Therefore it is a **maximum allowable deck step** for the calculated demand. It is not the selected purlin step. `Подбор прогонов!B14` makes it the effective maximum unless the manual override `вывод!D24` is nonzero. `B15` is an independent minimum-step constraint. The profile candidate axis, utilization/capacity checks, and manual/zero sentinels are additional constraints.

The local Core1 deck table contains the 1900 row (`AQ40=3.416`), but the Core1 climate value 2.0 raises demand above that row; the last capacity still satisfying demand is the 1750 row (`AQ35=3.755`). This explains the 1750 trace without changing the prior `PURLIN_DECK_GAP` behavior.

## 7. Why SOURCE selects 2ПС195х45х1,5 / М.п.390

The active comparison in `Подбор прогонов 2` is:

| Row | Formula/result | Cached value |
|---|---|---|
| `D23` | `IF(OR(B6=N44,…,N53),"0",'Расчеты 2'!E28)` | `2ПС 200х65х1,5` |
| `E23` | `IF(D23="0","0",'Расчеты 2'!C28)` | `1900` |
| `M23` | mass-per-area branch | `5.698` кг/м² |
| `D30` | `IF(OR(B6=N44,…,N53),"0",'Расчеты МП390 2'!E28)` | `2ПС 195х45х1,5` |
| `E30` | `IF(D30="0","0",'Расчеты МП390 2'!C28)` | `1900` |
| `M30` | mass-per-area branch | `4.9559999999999995` кг/м² |
| `P26` | `=IF(M23>M30,D30,D23)` | `2ПС 195х45х1,5` |
| `S26` | `=IF(M23>M30,E30,E23)` | `1900` |
| `U26` | `=IF(M23>M30,A27,A20)` | `М.п.390` |
| `V26` | `=IF(N23>N30,N30,N23)` | `1699.1999999999998` кг |

Since `5.698 > 4.956`, the lower-mass М.п.390 branch wins. Final `P28/S28/U28/V28` propagate the same values.

## 8. Downstream mass confirmation

`Расчеты МП390 2!B28 = 283.2` кг is the per-frame-step purlin mass.
`Подбор прогонов 2!H30 = G30*$B$3/$B$1 = 283.2*24/4 = 1699.2` кг.
`L30 = H30/B2/B3*1.05 = 4.956` кг/м².
This reconstructs the reported SOURCE mass; it is downstream confirmation only.

## 9. Legacy switches and zero logic preserved in the audit

- blank `вывод!D9` is the automatic/manual switch (`D9=0`);
- `вывод!D24` is a manual maximum-step override; blank/0 falls back to `D23`;
- `Подбор прогонов!B15=0` means no separate manual minimum;
- `B16/B17="нет"` control snow-retention/enclosure additions;
- `D23/D30` use the `IF(OR(...),"0",...)` disabled-row sentinel;
- final rows use `IF(...=0,...)` zero-selection sentinels;
- calculation sheets contain `IF(...,9999999,...)` masking for steps outside the allowed interval.

These are compatibility behavior, not simplifications to be removed.

## 10. Audit conclusion

- First divergence is proven at the **city snow-load lookup** (1.8 vs 2.0 kN/m²).
- The 1900-mm source step is proven to be the deck maximum from `вывод!D23 → Подбор прогонов!B14`, and is present in the source candidate result.
- Core1 currently cannot reach 1900 because its derived deck limit is 1750; classification is **A**.
- The profile/steel selection and 1699.2-kg mass chain are proven downstream.
- **Fix is not implemented and parity after a fix is not yet proven.** This audit proves the first-divergence location and the required data-path correction only.

Files changed: `PURLIN_22318_AUDIT.md` only. No XLSX, TypeScript, commit, or push was performed.
