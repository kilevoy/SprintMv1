# Core 1 — оконная ветка: локальная формульная спецификация

## Итоговый статус

`WINDOW_BRANCH_STATUS: FULLY_PROVEN_FOR_IMPLEMENTATION`.

`PARITY_PROVEN` пока не заявляется: независимого non-zero golden scenario нет.
Это ограничивает acceptance и числовой oracle, но не блокирует реализацию
модуля по доказанной локальной формульной цепочке.

Основная книга — source of truth. ID3/ID4/ID5 — historical formula tokens и
`LEGACY_REDUNDANT` runtime-зависимости. `Лист1!J20` — legacy implementation
detail, не пользовательский input и не маршрутизатор нового TypeScript Core.

## Новый target flow

```text
Core1Input.country + normative_system
  → ClimateResult
  → normative_system=SP_20    → локальный лист Ветер СП
  → normative_system=SP_RK_EN → локальный лист Ветер по СП РК EN

windows.enabled=false → skip
windows.enabled=true + window_type 1..5 + geometry + glazing + ClimateResult
  → WindowGirtCalculator
  → lower girt → upper girt → utilization/pass → mass
  → Лист1!O28/O29 → вывод!D68:E68
```

## Доказанный локальный dependency graph

```text
Core1Input
  → вывод!D2,D4:D9,D20,D64:D67
  → Лист1!B2:B3,B6:B8,B10:B11,B14:B17,B20
  → ClimateResult + explicit normative_system
  → local SP_20 / SP_RK_EN wind calculation
  → Расчет!D8:F9,D17:D18
  → Расчет!AH,AK,AN,AQ,AT,AV,AX (candidate checks)
  → Расчет!B21:B23,B26:B28 (SMALL + INDEX selection)
  → Лист1!B24:E33,B37:E46 (lower/upper presentation)
  → Лист1!O28 (кг/м²), O29 (т)
  → вывод!D68 (кг/м²), E68 (т)
```

## Казахстан и нормативная ветка

Для `country=KZ` пользователь обязан передать явный `normative_system`:

| UI выбор «Расчёт по евронормам» | API `normative_system` | Локальная ветка |
|---|---|---|
| Нет | `SP_20` | `Ветер СП` |
| Да | `SP_RK_EN` | `Ветер по СП РК EN` |

`J20` не читается новым Core. В legacy Excel blank `J20` выбирает SP-ветку,
но это только compatibility trace. Для `SP_RK_EN` TypeScript маршрутизирует
непосредственно по `ClimateResult.normative_system`.

## Типы окон 1–5

`windows.enabled=true` требует обязательный `window_type: 1 | 2 | 3 | 4 | 5`.
`window_type` напрямую соответствует `Лист1!B8`; canonical labels — только
`Тип 1`, `Тип 2`, `Тип 3`, `Тип 4`, `Тип 5`. Текстовые инженерные названия не
добавляются.

| Тип | `Лист1!J` момент | `Лист1!K` длина | `Лист1!L` прогибы |
|---:|---:|---:|---:|
| 1 | 0,125 | 1 | 1 |
| 2 | 0,055 | 5/6 | 0,13 |
| 3 | 0,062 | 0,33 | 0,24 |
| 4 | 0,078 | 0,5 | 0,5 |
| 5 | 0,073 | 0,75 | 0,2 |

Переключение доказано локальными формулами:

- `Лист1!F8 = INDEX(J34:J38; MATCH(B8; I34:I38; 0))` — коэффициент момента;
- `Расчет!D18 = Лист1!B7 × INDEX(K34:K38; MATCH(B8; I34:I38; 0))` — effective
  длина для гибкости;
- `Расчет!AQ/AT` используют `INDEX(L34:L38; MATCH(B8; I34:I38; 0))` в
  вертикальной части прогиба.

## Нагрузки

Локальные исходные входы оконной ветки:

- `Лист1!D17` — glazing load из `P13:Q15` по `window_construction`:
  первый/второй/третий стеклопакет дают 0,30/0,42/0,54 кПа;
- `Расчет!D8/F8` — вертикальная ветка;
- `Расчет!D9/F9` — горизонтальная ветка, выбираемая новым Core напрямую по
  `SP_20` или `SP_RK_EN`;
- `Лист1!B3` — явный window load factor;
- `Лист1!B14` — terrain; `B10/B11/B9` — span/length/height context.

## Нижний и верхний ригель

В `Расчет!P4:V413,X4:Y413` для каждого кандидата вычисляются:

- `AH` — гибкость;
- `AK` / `AN` — utilization по прочности нижнего/верхнего ригеля;
- `AQ` / `AT` — utilization по прогибу нижнего/верхнего ригеля.

Критерии прохода локальны:

```text
lower: MAX(AH, AQ) <= 1 AND AK <= Лист1!B20 AND N <> "-"
upper: MAX(AH, AT) <= 1 AND AN <= Лист1!B20 AND N <> "-"
```

`AV/AX` получают `Y × Лист1!B7 + 0,0001 × O` либо sentinel
`999999999`. Далее:

- `Расчет!B21:B23` — `SMALL/INDEX` для нижнего ригеля;
- `Расчет!B26:B28` — `SMALL/INDEX` для верхнего ригеля;
- `Лист1!D24:D33` и `D37:D46` — выбранный mass key/profile/steel;
- `O28` — масса проёмов в кг/м², `O29` — абсолютная масса в тоннах.

Таким образом, utilization используется внутри candidate checks; наружу
legacy layout выводит выбранный mass key и профиль, а не отдельный полный
utilization trace.

## Локальные листы и внешние ссылки

| ID | Исторический токен | Локальный equivalent | Runtime |
|---:|---|---|---|
| 3 | city membership для `J18` | `Города п.К`, `снегветер`, local snapshots | `LEGACY_REDUNDANT` |
| 4 | `Ветер СП`, `Ветер по СП РК EN` | одноимённые локальные листы и формулы | `LEGACY_REDUNDANT` |
| 5 | `[5]Подбор!B8/B18` в EN | локальный EN calculation block | `LEGACY_REDUNDANT` |

Cached `#N/A` внутри локальной ветки сохраняются как Excel errors. v2.0 не
используется как fallback.

## `Лист1!J20`

`J20` пуст, без formula/validation/producer; legacy `Расчет!D9/F9` читает его
для выбора SP/EN. Это `RESERVE_FORMULA / UNKNOWN_ZERO_LOGIC`, не
`MANUAL_SWITCH` и не новый `SCENARIO_CONTROL`. Новый Core его не использует:
`SP_20` и `SP_RK_EN` выбираются напрямую через `normative_system`.

## Решение по WindowGirtCalculator

Локальной формульной цепочки достаточно для реализации `WindowGirtCalculator`
в режиме `IMPLEMENTED`. Отсутствие non-zero golden scenario блокирует только
маркировку `PARITY_PROVEN` и acceptance-тест, но не сам модуль.

До завершения кода текущий orchestration может возвращать typed
`WINDOW_GIRT_MODULE_NOT_IMPLEMENTED`; это implementation boundary, а не
блокер J20/ID3/ID4/ID5.
