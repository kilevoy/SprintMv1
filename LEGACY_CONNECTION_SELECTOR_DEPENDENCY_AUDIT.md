# Legacy connection selector dependency audit

Статус: reverse engineering only. Production TypeScript и XLSX не изменялись.

Проверены source-selection книги `22318`, `22316`, `22329` и compatibility-control
`22326` из `E:\SprintMv1_reference`. Цель аудита — замкнуть цепочку

```text
project inputs
  → selector state
  → HZ18 / RP18 / KL18 / WN18
  → MATCH row
  → span-sheet connection cells
  → подбор family row
  → вывод!D52/E52/D53/D54/D55/D57
```

## 1. Proven project-input state

В исходной книге пользовательские значения находятся на листе `Города п.к` и
поднимаются на `подбор`:

```text
подбор!V6  = Города п.к!D2   (city)
подбор!V8  = Города п.к!D6   (height)
подбор!V9  = Города п.к!D7   (climate-column switch)
подбор!V10 = Города п.к!D4   (literal span)
подбор!V11 = Города п.к!D5   (building length)
подбор!V7  = INDEX(подбор!W19:W44,
                   MATCH(подбор!AJ11,подбор!V19:V44,0))
подбор!AJ11 = подбор!AF11 - подбор!AI11
```

`V9` во всех четырёх проверенных книгах имеет cached value `1`. Это не
означает одинаковую снеговую/ветровую категорию: выбор города в `V6` меняет
строку климатической таблицы.

| Project | `V6` (city, cached) | `V8` | `V9` | `V10` | `V11` | `V7` |
|---|---|---:|---:|---:|---:|---|
| 22318 | Сургут | 5 | 1 | 15 | 24 | 4/1 |
| 22316 | Березовский | 5 | 1 | 18 | 30 | 4/1 |
| 22329 | Увильды | 4 | 1 | 12 | 26 | 4/2 |
| 22326 | Увильды | 4 | 1 | 10.4 | 25.7 | 4/2 |

`AM9` и `BD9` являются двумя family selectors:

```excel
AM9 = IF($V$10<=9,9,AM10)
BD9 = IF($V$10<=9,9,BD10)
```

Их cached values: 22318 → `15`, 22316 → `18`, 22329 → `12`, 22326 → `12`.
Для 22326 это подтверждает разделение literal span `10.4` и design family `12`.

## 2. HZ18 / RP18 (9–21 m sheets)

На каждом листе `9м`…`21м` формулы selector cells одинаковы:

```excel
HZ18 = INDEX(
  IF(подбор!V9=0.8,снегветер!M3:M600,снегветер!K3:K600),
  MATCH(подбор!V6,снегветер!B3:B600,0))

RP18 = INDEX(
  IF(подбор!V9=0.8,снегветер!BC3:BC600,снегветер!BA3:BA600),
  MATCH(подбор!V6,снегветер!B3:B600,0))
```

`HZ18` и `RP18` — независимые cached selector values для двух connection
branches. В проверенных книгах они совпали численно, но это результат локальной
климатической таблицы, а не константа Core 1:

| Project | climate row in `снегветер` | `HZ18` | `RP18` | selected key |
|---|---:|---:|---:|---|
| 22318 / Сургут | city `V6` | 1 | 1 | row 6 (`HZ6/RP6=1`) |
| 22316 / Березовский | city `V6` | 0.8 | 0.8 | row 14 (`HZ14/RP14=0.8`) |
| 22329 / Увильды | city `V6` | 0.8 | 0.8 | row 14 (`HZ14/RP14=0.8`) |
| 22326 / Увильды | city `V6` | 0.8 | 0.8 | row 14 (`HZ14/RP14=0.8`) |

The cached climate row values were read directly from `снегветер!B` and the
selected `K/M/BA/BC` columns. No fuzzy city matching or nearest-city fallback
was used.

For 9–21 m, the actual span-sheet lookup formulas are:

```excel
<span>!ID19 = INDEX(ID6:ID14,MATCH(HZ18,HZ6:HZ14,0))
<span>!IH19 = INDEX(IH6:IH14,MATCH(HZ18,HZ6:HZ14,0))
<span>!II19 = INDEX(II6:II14,MATCH(HZ18,HZ6:HZ14,0))
<span>!IJ19 = INDEX(IJ6:IJ14,MATCH(HZ18,HZ6:HZ14,0))
<span>!IK19 = INDEX(IK6:IK14,MATCH(HZ18,HZ6:HZ14,0))
<span>!IL19 = INDEX(IL6:IL14,MATCH(HZ18,HZ6:HZ14,0))

<span>!RT19 = INDEX(RT6:RT14,MATCH(RP18,RP6:RP14,0))
<span>!RX19 = INDEX(RX6:RX14,MATCH(RP18,RP6:RP14,0))
<span>!RY19 = INDEX(RY6:RY14,MATCH(RP18,RP6:RP14,0))
<span>!RZ19 = INDEX(RZ6:RZ14,MATCH(RP18,RP6:RP14,0))
<span>!SA19 = INDEX(SA6:SA14,MATCH(RP18,RP6:RP14,0))
<span>!SB19 = INDEX(SB6:SB14,MATCH(RP18,RP6:RP14,0))
```

Thus `HZ18` drives ROW14 and `RP18` drives ROW15. The `MATCH` is exact (`0`);
blank or absent keys are not silently substituted.

## 3. 24 m selectors and the preserved #N/A path

On `24м`, the analogous selectors are:

```excel
KL18 = INDEX(
  IF(подбор!V9=0.8,снегветер!M3:M600,снегветер!K3:K600),
  MATCH(подбор!V6,снегветер!B3:B600,0))

WN18 = INDEX(
  IF(подбор!V9=0.8,снегветер!BC3:BC600,снегветер!BA3:BA600),
  MATCH(подбор!V6,снегветер!B3:B600,0))
```

They select `KP19:KX19` (ROW14) and `WR19:WZ19` (ROW15):

```excel
24м!KP19 = INDEX(KP6:KP14,MATCH(KL18,KL6:KL14,0))
24м!WR19 = INDEX(WR6:WR14,MATCH(WN18,WN6:WN14,0))
```

The master workbook caches `KL18=1` and `WN18=1`, so the selector itself is
not `#N/A`. The active error is one level earlier in the candidate rows:

```excel
24м!KP6 = INDEX(JZ7:JZ12,MATCH(KL5,JV7:JV12,0))
24м!WR6 = INDEX(WB7:WB11,MATCH(WN5,VX7:VX11,0))
```

with `KL5=WN5=4.8`, while `JV7:JV12`/`VX7:VX11` contain the discrete keys
`6, 7, 8, 9` (and blanks), not `4.8`. Therefore the cached `#N/A` in the
24 m connection outputs is a reproducible legacy lookup failure, not evidence
that `KL18` or `WN18` are missing.

## 4. Active ROW14/ROW15 branch

The output controller is explicit and common to the checked books:

```excel
вывод!D52 = IF(E8>E9,подбор!AC15,подбор!AC14)
вывод!E52 = IF(E8>E9,подбор!X15,подбор!X14)
вывод!D53 = IF(E8>E9,подбор!AD15,подбор!AD14)
вывод!D54 = IF(E8>E9,подбор!AE15,подбор!AE14)
вывод!D55 = IF(E8>E9,подбор!AF15,подбор!AF14)
вывод!D57 = IF(E8>E9,подбор!AB15,подбор!AB14)
```

`E8` and `E9` are the two connection-branch totals:

```excel
вывод!E8 = подбор!Z14 + 'Подбор прогонов'!T28
вывод!E9 = подбор!Z15 + 'Подбор прогонов 2'!T28
```

The observed branch and cached final outputs are:

| Project | `E8` | `E9` | active row | `E52` | `D52` | `D53` | `D54` | `D55` | `D57` |
|---|---:|---:|---|---:|---|---|---|---|---:|
| 22318 | 30.0761597222 | 30.0761597222 | ROW14 / HZ | 276 | 8х2 | 9х2 | 7х2 | 10х2 | 238 |
| 22316 | 28.1232370370 | 28.1232370370 | ROW14 / HZ | 308 | 10х2 | 10х2 | 7х2 | 10х2 | 264 |
| 22329 | 30.9900304487 | 30.9900304487 | ROW14 / HZ | 276 | 8х2 | 9х2 | 7х2 | 9х2 | 233 |
| 22326 | 31.4019897985 | 29.9039353238 | ROW15 / RP | 260 | 8х2 | 9х2 | 6х2 | 8х2 | 223 |

Equality selects ROW14 because the condition is strictly `E8>E9`; it does not
select ROW15 on equality.

## 5. First missing dependency

The selector equations and active-branch controller are proven. The model is
still **`LEGACY_CONNECTION_MODEL_INCOMPLETE`** because the row matrices are
project/workbook specific:

- 22318 family 15, ROW14 (`15м!ID19/IH19`) caches `276 / 238`;
- 22316 family 18, ROW14 caches `308 / 264`;
- 22329 family 12, ROW14 caches `276 / 233`;
- 22326 family 12, active ROW15 caches `260 / 223`.

The committed master extraction has different family snapshots (for example
family 15 ROW14 `308 / 264`, and family 12 ROW14 `260 / 233`). Consequently,
`design family + ROW14/ROW15 + HZ18/RP18` cannot reproduce the four reference
books. The missing dependency is the **versioned span-sheet lookup matrix and
its precedents for each source workbook**, or an equivalent project-scoped
connection snapshot. It is not an absent external ID and not an unresolved
city fuzzy-match problem.

## Gate decision

`LegacyConnectionResolver` remains blocked. The selector contract is
`PROVEN_FOR_HZ_RP_KL_WN`, but the overall implementation gate is **not**
`LEGACY_CONNECTION_MODEL_COMPLETE` until project-scoped row matrices (or a
proven immutable replacement) are supplied. No production code or workbook was
changed by this audit.
