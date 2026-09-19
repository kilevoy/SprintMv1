# Authoritative cold enclosure XLSX audit

Audit mode: read-only reverse engineering. No source workbook, production code,
Core1, UI, or runtime evidence data was modified.

## Source inventory

Primary source:

| File | Size | SHA-256 |
|---|---:|---|
| `Калькулятор ограждайки v1.5.xlsx` | 34,287,761 bytes | `4a9343a1e3149954dec0f91d5398528f18016a8423ec204ce2b92a59f612deaf` |

The workbook has six sheets:

| Sheet | Role | Evidence |
|---|---|---|
| `Лист1` | INPUT / OUTPUT / control area | project controls, zone outputs, selectors |
| `Расчет Угловая` | CALCULATION | corner-zone wind, candidate grid, selector |
| `Расчет Рядовая` | CALCULATION | typical-zone wind, candidate grid, selector |
| `несушки` | CATALOG / LOOKUP | section, material, capacity, mass and assembly rows |
| `Ветер по СП` | LOOKUP | wind coefficients |
| `Ветер по СП EN` | LOOKUP | EN wind coefficients |

The two supplied `21640` workbooks are byte-identical to each other
(SHA-256 `4705a40d...`) and are result workbooks, not copies of the primary
enclosure calculator. They were not used as formula authority.

The primary workbook contains two external-link parts: the cached city-load
source `Таблица нагрузок по городам.xlsx` and a network-path copy under
`\\INSI-FS\oppr$\Конструктивные расчеты\Прогоны\Для предрасчетов\...`.
The cached link contents are part of the workbook evidence; the external files
were not altered.

## Control and output chain

The active source cache contains `Лист1!B12=9.3`, `B13=6`, `B3=0.8`,
`E24=12`, `E29=12`, and active section type `[]`.

Corner geometry:

```text
Расчет Угловая!B7 = IF(Лист1!C21="по СП РК EN", 'Ветер по EN'!G28,
                         'Ветер по СП'!J31)
Расчет Угловая!C8 = 2*IF(B7/Лист1!B13<0.5,0,
                         CEILING.MATH(B7/Лист1!B13,1)*Лист1!B13)
Лист1!E24 = 'Расчет Угловая'!C8
```

Typical geometry:

```text
Расчет Рядовая!B7 = Лист1!B11 - 'Расчет Угловая'!C8
Расчет Рядовая!C8 = B7
Лист1!E29 = 'Расчет Рядовая'!C8
```

These formulas prove that the two zones are not interchangeable. The source
uses a derived corner span and then the remaining building width for the
typical zone.

Profile selection in the corner calculation is the minimum candidate objective
and a lookup back to the selected step:

```text
Расчет Угловая!BGQ7 = MIN(AWX7:BGN7)
Расчет Угловая!BGS7 = INDEX($AWX$2:$BGN$2,1,MATCH(BGQ7,AWX7:BGN7,0))
Расчет Угловая!BGT7 = INDEX(AWX19:BGN19,1,MATCH(BGS7,$AWX$2:$BGN$2,0))
Расчет Угловая!BGU7 = INDEX(AWX31:BGN31,1,MATCH(BGS7,$AWX$2:$BGN$2,0))
Расчет Угловая!BGR7 = BGQ7*$ADI$1
```

The same structural pattern exists on `Расчет Рядовая`, but its wind input
uses different source cells and its selected cached result is different.

## Exact manual wall-girt formulas

For the corner row:

```text
Лист1!F49 = CEILING.MATH($B$12*1000/D49,1)
            + IF(OR(K49="[]",K49="][",K49="[-]"),0,1)
Лист1!G49 = F49*$E$24/$B$13
Лист1!H49 = INDEX('Расчет Угловая'!AA7:AA870,
                  MATCH(Лист1!B49,'Расчет Угловая'!V7:V870,0),1)*G49
Лист1!I49 = F49*E24*INDEX('Расчет Угловая'!Z7:Z870,
                           MATCH(Лист1!B49,'Расчет Угловая'!V7:V870,0),1)
Лист1!K49 = INDEX('Расчет Угловая'!J7:J870,
                  MATCH(Лист1!B49,'Расчет Угловая'!V7:V870,0),1)
```

For the typical row:

```text
Лист1!F50 = CEILING.MATH($B$12*1000/D50,1)
            + IF(OR(K50="[]",K50="][",K50="[-]"),0,1)
Лист1!G50 = CEILING.MATH(F50*ROUND($E$29/$B$13,1),1)
Лист1!H50 = INDEX('Расчет Угловая'!AA7:AA870,
                  MATCH(Лист1!B50,'Расчет Угловая'!V7:V870,0),1)*G50
Лист1!I50 = F50*E29*INDEX('Расчет Угловая'!Z7:Z870,
                           MATCH(Лист1!B50,'Расчет Угловая'!V7:V870,0),1)
Лист1!K50 = INDEX('Расчет Угловая'!J7:J870,
                  MATCH(Лист1!B50,'Расчет Угловая'!V7:V870,0),1)
```

The source therefore proves different bracket rounding for corner and typical
zones. It also proves that the base profile mass uses the selected section-mass
lookup (`Z`), not an unconditional multiplication of a single-profile mass.

## Section and mass semantics

In `несушки`, the relevant columns are:

```text
I = Тип сечения
J = раскреп
K = толщина
L = Высота профиля
M = макс к-т исп по умолчанию
N = material coefficient input / 1.1 control
O = Толщина утепления, мм
P = Профиль
Q = raw moment expression
R = Пред М
S = Масса 1м профиля, кг
T = Масса 1м сечения, кг
U = Масса узловых сборок
```

Observed source formulas prove:

```text
несушки!T45  = S45*2                         for []
несушки!T102 = S102*2                        for ][
несушки!T497 = S497*2+2*7895*0.001*0.09      for [-]
несушки!U45  = IF(OR(I45="[]",I45="[-]"),4.8,2.4)
```

Thus `[-]` is not safely reducible to a plain paired profile: its section mass
contains an additional assembly term. The mass used by `Лист1!I49:I50` is the
selected `Z`/section mass. A second `×2` must not be added in the replay.

The source row-count correction groups `[]`, `][`, and `[-]` together for row
count, but bracket unit mass groups only `[]` and `[-]`:

```text
Расчет Угловая!AA7 = IF(OR(J7="[]",J7="[-]"),1.5,0.75)
```

For the requested boundary `height=6.0`, `step=1.5`, the exact formula gives
four rows for `[]`, `][`, `[-]` and five rows for `]`. The same ceiling result
holds at `6.01` and `5.99`; the section correction remains the differentiator.

## Upper/lower members and the selector flag

`Расчет Угловая!TN6` is `масса верхнего ригеля`, `TO6` is `масса нижнего
ригеля`; both are populated as `TN7=TO7` and `TO7=Y7`. They enter the candidate
objective, for example `TQ7`, together with `T`, but they are not separate
base rows in `Лист1!D48:I50`. Their final takeoff rule remains `PARTIAL`.

`Расчет Угловая!R6` is `Без стоек`. The row-level branch includes:

```text
Расчет Угловая!T7 = IF(R7,0,$T$5*INDEX($C$14:$C$24,
                                      MATCH(N7,$B$14:$B$24,0),1))
Расчет Угловая!S7 = IF(Лист1!$W$107=FALSE,TRUE,R7)
Лист1!V107 = "Без стоек"
```

This proves a selector and a zero/non-zero additional weight branch. It does
not by itself prove the business meaning of every `+ стойки` row or the full
232-row relationship, so that branch remains `PARTIAL`.

## Openings and windows

No labels or formulas for `окно`, `дверь`, `ворота`, `проем`, `оконный
ригель`, `стойка окна`, or strip glazing were found in the six-sheet primary
workbook. Therefore this workbook does not provide a legacy window-framing
rule. It cannot prove that ordinary girts continue through or are deducted at
openings in another project workbook.

## Evidence gate

The source now proves a restricted manual replay slice: explicit zone, explicit
profile, explicit section type, explicit step, gross wall zone, and no opening
interaction. Automatic selector parity, `+ стойки` completeness, upper/lower
takeoff separation, and opening framing remain outside that slice.

See the numeric fixtures in
`docs/enclosure/evidence/fixtures/wall-girt-manual-replay-fixtures.json`.
