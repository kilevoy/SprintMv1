# Minimal legacy connection snapshot audit

Статус: read-only reverse engineering. Production TypeScript и XLSX не
изменялись; commit/push не выполнялись.

## 1. Решение

Для исторического воспроизведения шести выходов достаточно доказанного
снимка:

```text
active branch (ROW14 или ROW15)
+ selected connection source row for that branch and design family:
  F / J / K / L / M / N equivalent
```

Для сохранения более раннего источника рекомендуется хранить не финальные
`D52/E52/D53/D54/D55/D57`, а шесть upstream cells span-sheet:

```text
ROW14: ID19, IH19, II19, IJ19, IK19, IL19
ROW15: RT19, RX19, RY19, RZ19, SA19, SB19
24 м:  KP19, KT19, KU19, KV19, KW19, KX19
       WR19, WV19, WW19, WX19, WY19, WZ19
```

Эти значения напрямую подаются в `подбор!F/J/K/L/M/N`, после чего уже
доказанные локальные формулы дают шесть outputs. Полная lookup-матрица и
полный `снегветер` snapshot для этих шести outputs избыточны.

Итоговая классификация:

```text
MINIMAL_LEGACY_CONNECTION_SNAPSHOT_PROVEN
```

Это доказывает только historical replay support. Generic
`LegacyConnectionResolver` по-прежнему не разрешён.

Проверенные provenance SHA:

| Project | Workbook SHA-256 |
|---|---|
| 22318 | `dbf29d01db4fe81e8e0a997a69f045330f715b64df3c828bc9d3cc4601116ac3` |
| 22316 | `e27b6b083e8b25f6f78522ec41febf0910531dc5f9dcbfc8865d2a23b8c11cdd` |
| 22329 | `2376b06809cf10136abd688bd13a1c13c1213fa12f341cb98fde1b44ec5cd4aa` |
| 22326 | `852f6f5df470a728f7aac5ef5a88c95e2ebc7a8fe0cb91082257801d38ee6f88` |

## 2. Формулы output и доказанный mapping

```text
вывод!D52 = IF(E8>E9,подбор!AC15,подбор!AC14)
вывод!E52 = IF(E8>E9,подбор!X15,подбор!X14)
вывод!D53 = IF(E8>E9,подбор!AD15,подбор!AD14)
вывод!D54 = IF(E8>E9,подбор!AE15,подбор!AE14)
вывод!D55 = IF(E8>E9,подбор!AF15,подбор!AF14)
вывод!D57 = IF(E8>E9,подбор!AB15,подбор!AB14)
```

Для `ROW14` формулы `подбор!F/J/K/L/M/N` выбирают соответственно
`ID19/IH19/II19/IJ19/IK19/IL19`; для `ROW15` —
`RT19/RX19/RY19/RZ19/SA19/SB19`. Поэтому output snapshot не добавляет
новой информации к этим шести source cells.

`designFamily` также не требуется хранить как независимый runtime input:
для проверенных книг он воспроизводится из literal span действующей
формулой `AM9/BD9 = IF(V10<=9,9,AM10/BD10)`. Для 22326 это подтверждает
`10.4 → 12`.

## 3. Project-scoped leaves

| Leaf | Пример значения | Классификация | Почему нужен |
|---|---|---|---|
| `Города п.к!D2`, `D4`, `D5`, `D6`, `D7` | city, span, length, height, climate switch | `PROJECT_SCOPED_INPUT` | Обычный `ProjectInput`; в snapshot не дублируется |
| `снегветер!AZ335` для Увильды | 22329=`IV`, 22326=`III`, formula token `=`, type `str` | `HARDCODED_LEGACY_VALUE` / `PROJECT_SCOPED_LOOKUP_VALUE` | Вызывает различие `BA9 → BA11 → W7` в wind branch; нужен generic resolver, но не minimal replay |
| `подбор!V7`, `W7`, `AJ11`, `BA11` | selectors such as `4/3`, `4/2`, `3/2` | `DERIVABLE_VALUE` | Получаются из ProjectInput и точного local lookup snapshot |
| `подбор!AM9`, `BD9` | 9/12/15/18/21/24 | `DERIVABLE_VALUE` | Выводятся из literal span |
| `вывод!E8`, `E9` | branch scores | `CACHED_FORMULA_RESULT` | Upstream result; для minimal replay достаточно его знака/active branch |
| `вывод!D52/E52/D53/D54/D55/D57` | final six outputs | `DERIVABLE_VALUE` | Формулы напрямую выбирают сохранённый source row |
| span `ID/IH/II/IJ/IK/IL19` или `RT/RX/RY/RZ/SA/SB19` | project-specific selected row | `PROJECT_SCOPED_LOOKUP_VALUE` | Минимальный доказанный replay payload |

Для 22329 и 22326 city одинаков (`Увильды`), но `снегветер!AZ335` различается.
Это подтверждает, что local climate snapshot нельзя считать универсальной
константой. Одновременно snow path для этих двух книг совпадает, поэтому
сохранять весь `снегветер` ради шести outputs не требуется.

ProjectInput leaves (они не дублируются в connection snapshot):

| Source cell | Consumer | 22318 | 22316 | 22329 | 22326 |
|---|---|---|---|---|---|
| `Города п.к!D2` | `подбор!V6` | Сургут | Березовский | Увильды | Увильды |
| `Города п.к!D4` | `подбор!V10` | 15 | 18 | 12 | 10.4 |
| `Города п.к!D5` | `подбор!V11` | 24 | 30 | 26 | 25.7 |
| `Города п.к!D6` | `подбор!V8` | 5 | 5 | 4 | 4 |
| `Города п.к!D7` | `подбор!V9` | 1 | 1 | 1 | 1 |

Детализация минимальных span leaves (formula template у всех cells — exact
`INDEX/MATCH` selector; cached type: `n` для F/J, `s` для K/N):

| Project | Source cells | Cached tuple `(F,J,K,L,M,N)` | First consumer |
|---|---|---|---|
| 22318 | `15м!ID19,IH19,II19,IJ19,IK19,IL19` | `(276,238,8х2,9х2,7х2,10х2)` | `подбор!F4,J4,K4:N4` |
| 22316 | `18м!ID19,IH19,II19,IJ19,IK19,IL19` | `(308,264,10х2,10х2,7х2,10х2)` | `подбор!F5,J5,K5:N5` |
| 22329 | `12м!ID19,IH19,II19,IJ19,IK19,IL19` | `(276,233,8х2,9х2,7х2,9х2)` | `подбор!F3,J3,K3:N3` |
| 22326 | `12м!RT19,RX19,RY19,RZ19,SA19,SB19` | `(260,223,8х2,9х2,6х2,8х2)` | `подбор!F10,J10,K10:N10` |

Для 22318/22316/22329 row14 и row15 cached tuples совпадают. Для 22326
row14 tuple равен `(276,233,8х2,9х2,7х2,9х2)`, но active ROW15 требует
отдельный row15 tuple из таблицы.

Отдельный climate leaf, показавший реальное project-scoped отличие:

| Sheet/cell | 22329 | 22326 | Formula/raw | Cached type | First consumer |
|---|---|---|---|---|---|
| `снегветер!AZ335` | `IV` | `III` | `=` (hardcoded cached table entry) | `str` | `подбор!BA9` |

`подбор!BA9 → BA10 → BA11 → W7 → JU5 → JV9 → RD7 → RT6` — это wind branch.

## 4. Минимизация кандидатов

| Кандидат | Достаточен для шести outputs | Решение |
|---|---|---|
| A. Full lookup matrix + branch state | Да | Отклонён как избыточный |
| B. Только selector state `HZ18/RP18/KL18/WN18` | Нет | Не содержит F/J/K/L/M/N outputs |
| C. Полный `снегветер` + project state | Теоретически да | Не доказано как минимальный; требует полного upstream recalc |
| D. Active branch + selected span source row | Да, доказано | Выбранный минимальный replay model |

`E8/E9` не нужно хранить оба: output formulas используют только условие
`E8>E9`. Для replay достаточно `activeBranch`. Сами `E8/E9` можно хранить
только как audit evidence, не как обязательные calculation inputs.

`HZ18/RP18/KL18/WN18` также не являются обязательными полями minimal
snapshot: они нужны для generic recalculation, но не нужны после того, как
выбранный span source row зафиксирован.

## 5. Reconstruction matrix

Реконструкция ниже использует только literal/design family из ProjectInput,
зафиксированный active branch и шесть source values выбранной строки.

| Project | Family | Active branch | F / E52 | J / D57 | K / D52 | L / D53 | M / D54 | N / D55 |
|---|---:|---|---:|---:|---|---|---|---|
| 22318 | 15 | ROW14 | 276 | 238 | `8х2` | `9х2` | `7х2` | `10х2` |
| 22316 | 18 | ROW14 | 308 | 264 | `10х2` | `10х2` | `7х2` | `10х2` |
| 22329 | 12 | ROW14 | 276 | 233 | `8х2` | `9х2` | `7х2` | `9х2` |
| 22326 | 12 | ROW15 | 260 | 223 | `8х2` | `9х2` | `6х2` | `8х2` |

Получаются ровно ожидаемые значения `D52`, `E52`, `D53`, `D54`, `D55`,
`D57`. Для 22318/22316/22329 row14 и row15 cached outputs совпадают; для
22326 различие row14/row15 реально и active `ROW15` обязателен.

## 6. Proposed evidence-based schema

```ts
interface LegacyConnectionReplaySnapshot {
  provenance: {
    projectId: string;              // metadata only, never a selector
    sourceWorkbookName: string;
    sourceWorkbookSha256: string;
    formulaFingerprint: string;
    sourceRanges: string[];
  };

  activeBranch: "ROW14" | "ROW15";

  selectedSpanSourceRow: {
    sheet: string;                  // e.g. 12м, 15м, 18м
    cells: {
      F: number | string;            // ID19 or RT19 equivalent
      J: number | string;            // IH19 or RX19 equivalent
      K: string;                     // II19 or RY19
      L: string;                     // IJ19 or RZ19
      M: string;                     // IK19 or SA19
      N: string;                     // IL19 or SB19
    };
    sourceAddresses: string[];
  };
}
```

Justification:

- `provenance` обязательна для аудита и не участвует в выборе по project ID;
- `activeBranch` обязателен, потому что upstream `E8/E9` branch score chain
  ещё не доказан для всех проектов в текущем Core1;
- `selectedSpanSourceRow` — минимальный upstream набор, непосредственно
  потребляемый `подбор!F/J/K/L/M/N`;
- final outputs, selectors, `V7/W7`, `E8/E9` и full matrix не дублируются;
- для 24 м сохраняется тот же schema shape, но `#N/A` остаётся typed legacy
  result и не заменяется значением.

## 7. Execution modes

Разделение режимов требуется доказательствами:

```text
CANONICAL_MASTER
  ProjectInput → canonical datasets → future calculation modules

LEGACY_REPLAY
  ProjectInput → proven family mapping
  + injected project-scoped snapshot
  → exact historical connection outputs
```

`LEGACY_REPLAY` не должен silently fallback к MASTER snapshot. Если snapshot
отсутствует или provenance не совпадает, результат должен быть diagnostic,
а не предположительный connection output.

## 8. Gate

```text
MINIMAL_LEGACY_CONNECTION_SNAPSHOT: PROVEN
SAFE TO IMPLEMENT historical replay support: YES (после отдельной реализации)
SAFE TO IMPLEMENT generic LegacyConnectionResolver: NO
PRODUCTION CODE CHANGED: NO
```

Следующий implementation task должен быть отдельным и ограниченным
`LegacyReplaySnapshot`/diagnostics. Generic resolver можно открывать только
после доказательства полного upstream расчёта selector и branch-score chain.
