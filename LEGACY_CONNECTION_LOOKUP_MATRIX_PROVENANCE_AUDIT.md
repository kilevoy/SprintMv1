# Legacy connection lookup matrix provenance audit

Статус: read-only reverse engineering. Production TypeScript и XLSX не
изменялись; commit/push не выполнялись.

## Итог

Формулы lookup-матриц во всех пяти книгах имеют одинаковую структуру.
`MASTER` и `22318` байт-в-байт идентичны; `22316` имеет другой общий файл,
но те же формулы и те же значения во всех проверенных матрицах. Отличия
`22329` и `22326` — это не смена формульной версии: это cached/project state,
в том числе различающиеся hardcoded значения локального листа `снегветер`.

Итоговый статус происхождения:

```text
PROJECT_SCOPED_SNAPSHOT_REQUIRED
```

Формульная модель доказана, но для parity нужен точный project/workbook
snapshot локальных lookup-таблиц. `LegacyConnectionResolver` пока не
разрешён к реализации: `SAFE TO IMPLEMENT = NO`.

## Объём сравнения

Для 9/12/15/18/21 м проверены:

```text
snow row matrix: HZ6:HZ14,
                 ID/IH/II/IJ/IK/IL rows 6:14
wind row matrix: RP6:RP14,
                 RT/RX/RY/RZ/SA/SB rows 6:14
```

Для 24 м проверены аналогичные диапазоны:

```text
snow: KL6:KL14, KP/KT/KU/KV/KW/KX rows 6:14
wind: WN6:WN14, WR/WV/WW/WX/WY/WZ rows 6:14
```

В каждой ячейке сравнивались адрес, raw formula, normalized formula,
cached value и тип XML-значения.

## Книги, SHA и версия

| Обозначение | Файл | SHA-256 | Размер | Modified |
|---|---|---|---:|---|
| MASTER | `Таблица по подбору сечений ... версия 1,5.xlsx` | `dbf29d01db4fe81e8e0a997a69f045330f715b64df3c828bc9d3cc4601116ac3` | 10,366,625 | 2026-09-04 05:45:04Z |
| 22318 | `22318_SOURCE_SELECTION.xlsx` | `dbf29d01db4fe81e8e0a997a69f045330f715b64df3c828bc9d3cc4601116ac3` | 10,366,625 | 2026-09-04 05:45:04Z |
| 22316 | `22316_SOURCE_SELECTION.xlsx` | `e27b6b083e8b25f6f78522ec41febf0910531dc5f9dcbfc8865d2a23b8c11cdd` | 10,113,632 | 2026-09-04 04:49:27Z |
| 22329 | `22329_SOURCE_SELECTION.xlsx` | `2376b06809cf10136abd688bd13a1c13c1213fa12f341cb98fde1b44ec5cd4aa` | 9,903,133 | 2026-09-08 09:24:18Z |
| 22326 | `22326_SOURCE_SELECTION.xlsx` | `852f6f5df470a728f7aac5ef5a88c95e2ebc7a8fe0cb91082257801d38ee6f88` | 9,905,334 | 2026-09-08 05:06:48Z |

Во всех: `Application=Microsoft Excel`, `AppVersion=15.0300`, создано
`2006-09-16T00:00:00Z`. Все книги содержат те же span-листы, `Города п.к`,
`снегветер`, `подбор` и output sheets. Formula fingerprints:

```text
9–21 м: b8e858a0baec8915d4075f4c29e9959de5adf4c872605ba0fe74365ec49bcdc3
24 м:   d734ba3bb993740f3efa4be45fe4574a52ca072a14fae01cd1d7c9bcb98e1cf8
```

Эти fingerprints одинаковы у всех пяти книг.

Lookup-range fingerprints (9/12/15/18/21/24 м соответственно):

| Книга | 9 м | 12 м | 15 м | 18 м | 21 м | 24 м |
|---|---|---|---|---|---|---|
| MASTER | `0506742e...77cce` | `770497e3...f070f3` | `7b1a16a8...b65d0c` | `138da7ca...c487` | `fefb1ee8...294ac` | `c9f5336f...88bd` |
| 22318 | совпадает с MASTER | совпадает | совпадает | совпадает | совпадает | совпадает |
| 22316 | совпадает с MASTER | совпадает | совпадает | совпадает | совпадает | совпадает |
| 22329 | `674bc58a...6db1da1f9` | `632ede53...29a38879f` | `2dec6ae7...77005c909c` | `c6513d26...a6a069ee5` | `6f2dd32b...6026a48b42` | совпадает с MASTER |
| 22326 | `effd4649...745df8b57` | `47440ecd...f9461fef7f6` | `dbb1154f...2bf32661` | `fecfcabf...e9d6195940` | `8869c715...c21535580` | совпадает с MASTER |

Сокращение хешей используется только для читаемости; полные SHA файла
приведены выше.

Полные lookup fingerprints:

```text
MASTER/22318/22316:
9  0506742ee58f536b38068fa346d8236b22d71478af6318766806d4eb16977cce
12 770497e3fd889a36e7317fbf65a0d434a16922502a59e2d40e204c6adef070f3
15 7b1a16a8db6deaa175e6a3a313ee6a5742e1d3af4043a86a8e07f32ba4b65d0c
18 138da7ca7f80f83fc22034d775409cfe567816cfa674612df26d82f79280c487
21 fefb1ee85b212979d387c2ad8391567375cecb92d950a04e107e36a5e6f294ac
24 c9f5336fd0007e010840865dddf91a6e8e1dc6b0043613ba78d192e037dd88bd

22329:
9  674bc58a8705fc712ff68fe766f18e446248b42836fac77978f50cd6db1da1f9
12 632ede536f21601f4d577cfe2d46dd47f71547690d09649ce6dc27a29a38879f
15 2dec6ae79f7a3d53f0f11771b8e1a0ba7c2a7c0c6cc41b10274a4e77005c909c
18 c6513d26d1aa4882ee372b5dbbb3f6e677ed0758ab0f7bc2754f218a6a069ee5
21 6f2dd32b559043b367dffa26347cba24dcd4aa8107761649e985606026a48b42
24 c9f5336fd0007e010840865dddf91a6e8e1dc6b0043613ba78d192e037dd88bd

22326:
9  effd4649600db6d6675f18c060d1723188a84bb22f25776cf7d4bce745df8b57
12 47440ecd6aa7c1e219e39352a1556453807e974b7e4fc2452663ff9461fef7f6
15 dbb1154fc6d17cb475181c7a248807ee08a80e64d05b24bc14a3618f2bf32661
18 fecfcabf7e7ae9f8a673f9cfa26374f71685ddfc9124a668a48e98e9d6195940
21 8869c715d1aee9ebfc4e6b6c81a3c264dbd5d4428b7921d411454c7c21535580
24 c9f5336fd0007e010840865dddf91a6e8e1dc6b0043613ba78d192e037dd88bd
```

## Matrix diff

Все найденные отличия имеют одну классификацию: `SAME_FORMULA_DIFFERENT_VALUE`.
То есть адрес и raw formula совпадают, а cached value отличается; тип первых
числовых ячеек — `n`. Не найдено ни одного `DIFFERENT_FORMULA`,
`MISSING_CELL`, `ERROR_DIFFERENCE` или `HARDCODED_VALUE_DIFFERENCE` внутри
самих span-матриц.

| Сравнение | Семейство | Snow: count / first cell | Wind: count / first cell |
|---|---:|---|---|
| MASTER → 22318 | 9/12/15/18/21/24 | 0 / — | 0 / — |
| MASTER → 22316 | 9/12/15/18/21/24 | 0 / — | 0 / — |
| MASTER → 22329 | 9 | 9 / `ID6` | 9 / `RT6` |
|  | 12 | 5 / `ID6` | 5 / `RT6` |
|  | 15 | 5 / `ID14` | 5 / `RT14` |
|  | 18 | 8 / `ID6` | 8 / `RT6` |
|  | 21 | 8 / `ID6` | 8 / `RT6` |
|  | 24 | 0 / — | 0 / — |
| MASTER → 22326 | 9 | 9 / `ID6` | 8 / `RT6` |
|  | 12 | 5 / `ID6` | 7 / `RT6` |
|  | 15 | 5 / `ID14` | 7 / `RT14` |
|  | 18 | 8 / `ID6` | 8 / `RT6` |
|  | 21 | 8 / `ID6` | 6 / `RT6` |
|  | 24 | 0 / — | 0 / — |
| 22329 → 22326 | 9 | 0 / — | 11 / `RT6` |
|  | 12 | 0 / — | 9 / `RT6` |
|  | 15 | 0 / — | 3 / `RX6` |
|  | 18 | 0 / — | 6 / `RT6` |
|  | 21 | 0 / — | 9 / `RT6` |
|  | 24 | 0 / — | 0 / — |

Примеры первых различий:

```text
12 м, snow, ID6:
  =INDEX(HN7:HN9,MATCH(HZ5,HJ7:HJ9,0))
  MASTER cached 268; 22329 cached 300; 22326 cached 300; type n

12 м, wind, RT6:
  =INDEX(RD7:RD9,MATCH(RP5,QZ7:QZ9,0))
  MASTER cached 268; 22329 cached 300; 22326 cached 276; type n

15 м, wind, RT14:
  =INDEX(RD15:RD17,MATCH(RP13,QZ15:QZ17,0))
  MASTER cached 276; 22329 cached 300; 22326 cached 300; type n
```

Полные значения первых отличий (формулы в каждом столбце остаются
одинаковыми; тип всех этих span-cells — `n`):

| Family | Snow first | MASTER → 22329 | MASTER → 22326 | Wind first | MASTER → 22329 | MASTER → 22326 |
|---:|---|---:|---:|---|---:|---:|
| 9 | `ID6` | 236 → 260 | 236 → 260 | `RT6` | 236 → 260 | 236 → 228 |
| 12 | `ID6` | 268 → 300 | 268 → 300 | `RT6` | 268 → 300 | 268 → 276 |
| 15 | `ID14` | 276 → 300 | 276 → 300 | `RT14` | 276 → 300 | 276 → 300 |
| 18 | `ID6` | 316 → 308 | 316 → 308 | `RT6` | 316 → 308 | 316 → 292 |
| 21 | `ID6` | 332 → 340 | 332 → 340 | `RT6` | 332 → 340 | 332 → 348 |

Для прямого сравнения `22329 → 22326` snow-матрицы 9–21 м совпадают; wind
первые отличия: `9м RT6 260→228`, `12м RT6 300→276`, `15м RX6 249→264`,
`18м RT6 308→292`, `21м RT6 340→348`. В 24 м обе матрицы совпадают.

## Trace to the first true origin

### Snow branch

Для первого отличия `ID6` доказана цепочка:

```text
<span>!ID6
  = INDEX(HN7:HN9,MATCH(HZ5,HJ7:HJ9,0))
  → HN7 = AF9
  → AF9 = INDEX(O6:O15,MATCH(AE5,B6:B15,0))
  → AE5 = подбор!V7
  → V7 = INDEX(W19:W44,MATCH(AJ11,V19:V44,0))
  → AJ11 = AJ10&"/"&AK10
  → AK10 = INDEX(AP17:AX17,MATCH(AK9,AP16:AX16,0))
  → AK9 = INDEX(снегветер!H3:H600,
                MATCH(подбор!V6,снегветер!B3:B600,0))
  → подбор!V6 = Города п.к!D2
```

В 22329 и 22326 `V6` — один и тот же город (`Увильды`), а `V7=4/3`,
`AJ11=4/2`, `AK9=II`, `AK10=2`. Поэтому отличия MASTER→22329/22326
являются проектным состоянием климатической/connection lookup-ветки, а не
изменением формулы.

### Wind branch и пара 22329 ↔ 22326

Первое отличие `RT6`:

```text
RT6 = INDEX(RD7:RD9,MATCH(RP5,QZ7:QZ9,0))
→ RD7 = JV9
→ JV9 = INDEX(JE6:JE15,MATCH(JU5,IR6:IR15,0))
→ JU5 = подбор!W7
→ W7 = INDEX($Z$19:$Z$43,MATCH($BA$11,$Y$19:$Y$43,0))
→ BA11 = BA10&"/"&BB10
  → BA10 = INDEX(BG17:BO17,MATCH(BA9,BG16:BO16,0))
→ BA9 = IF(V9=0.8,
           INDEX(снегветер!BB3:BB600,MATCH(V6,снегветер!B3:B600,0)),
           INDEX(снегветер!AZ3:AZ600,MATCH(V6,снегветер!B3:B600,0)))
```

Для города `Увильды` это строка `снегветер!335`:

```text
22329: снегветер!AZ335 = "=" → cached IV; BA9=IV; BA11=4/2; W7=4/3
22326: снегветер!AZ335 = "=" → cached III; BA9=III; BA11=3/2; W7=3/2
```

Здесь `=` — сохранённый Excel formula token для hardcoded cached table
entry, а не вычислительная формула. Это прямое доказательство
project/workbook-scoped snapshot различия в локальном `снегветер`; внешний
источник не требуется. В параллельной ветке `V10` также различается
(`22329=12`, `22326=10.4`) и меняет `X2=(V10/CEILING.MATH(V10,3))^2`, что
влияет на другие wind-table cells.

## Формульная и workbook-классификация

1. `MASTER` и `22318` — одна и та же книга (одинаковый SHA).
2. `22316` — другой project workbook, но lookup formulas и cached values
   проверенных connection matrices полностью совпадают с MASTER.
3. `22329` и `22326` — та же формульная версия; их 9–21 м matrix values
   отличаются из-за project inputs и локального `снегветер` snapshot.
4. 24 м structurally относится к той же provenance model: fingerprints и
   значения матриц совпадают во всех пяти книгах. Существующий legacy `#N/A`
   в 24 м не нормализуется и остаётся отдельным ошибочным путём
   (`KL5/WN5=4.8` против дискретных lookup keys).

Следовательно, различия не коррелируют с новой calculation version, но часть
значений не выводится из одних пользовательских inputs: для parity нужен
точный локальный климатический/table snapshot конкретной книги.

## Ответ на critical question

```text
project inputs + exact local снегветер snapshot + proven formulas
    → воспроизводят lookup matrices
```

Без exact snapshot `снегветер` (включая hardcoded cells вроде `AZ335`) одна
универсальная таблица не гарантирует parity для 22329/22326. Поэтому выбран
статус `PROJECT_SCOPED_SNAPSHOT_REQUIRED`, а не fuzzy/nearest-city fallback и
не versioned formula model.

## Gate

```text
LOOKUP_MATRIX_PROVENANCE: PROJECT_SCOPED_SNAPSHOT_REQUIRED
SAFE TO IMPLEMENT LegacyConnectionResolver: NO
PRODUCTION CODE CHANGED: NO
XLSX CHANGED: NO
```

Следующий допустимый шаг — отдельно экспортировать и version-control exact
project-scoped `снегветер`/lookup snapshots и только после этого пересмотреть
implementation gate. В рамках данного аудита код не менялся.
