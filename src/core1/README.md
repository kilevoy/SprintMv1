# Core 1 TypeScript data layer

Это browser-ready foundation для Calculation Engine. Реализованы InputValidation, ClimateResolver, FrameSelector, PurlinCalculator, SecondarySteelCalculator, WindowGirtCalculator, OpeningMassCalculator и StructuralSummary; React UI, backend и Core 2 пока отсутствуют.

## Data flow

```text
XLSX
  → Python extraction/integrity tooling
  → versioned static datasets in core1/data
  → TypeScript Core1DataRepository
  → future Calculation Engine
  → future React UI
```

Python остаётся development/extraction/integrity tooling. В production browser загружает static assets через `fetch`; Excel runtime и Python runtime не требуются.

## Browser loading

`BrowserDataSource` строит URL относительно `import.meta.env.BASE_URL`. Поэтому `core1/data/manifest.json` корректно работает и на `/SprintMv1/`, и на другом Vite base path. Production code не использует `fs`, `path` или `process.cwd()`.

`BrowserCore1DataRepository`:

- загружает и кеширует `core1/data/manifest.json`;
- загружает CSV через Papa Parse с typed JSON fields;
  - лениво загружает только запрошенный design-family dataset, например `frame_18m_cells.csv`;
- предоставляет отдельные методы для purlin, roof/deck, climate, secondary steel, constants и fixtures;
- не выполняет расчёты, округление или исправление Excel errors.

Небольшие JSON Schema импортируются в AJV для runtime validation. Большие CSV не превращаются в JS bundle и не импортируются статически.

## Test/development loading

`TestDataSource` реализован только в Vitest test support и предназначен для Node-тестов/tooling. Он читает локальные `core1/data`/`core1/fixtures`; production index его не экспортирует и production `src/core1` не содержит Node filesystem APIs.

Vitest проверяет путь GitHub Pages, lazy loading, кеширование, CSV quoting/numeric types, manifest, fixtures и schema validation. Python-тест отдельно проверяет `XLSX → exported data`; TypeScript-тесты проверяют `exported data → production runtime` и не дублируют XML integrity scan.

## Compatibility boundary

Типы `LEGACY_NA`, `LEGACY_REF`, `LEGACY_VALUE`, `LEGACY_DIV0` подготовлены для будущего движка. Excel functions пока не реализованы.

`kg_per_m2` остаётся в кг/м². `structural_weight_kg` отсутствует. UNKNOWN fixtures никогда не считаются numeric oracle. Доказанный automatic low-height 24 м path вычисляется локально; manual/upper-height/ROW15 gaps и шаг прогона 500 мм сохраняют typed diagnostics.

## Input contract updates

Новый контракт разделяет `windows.window_type` (доказанные схемы `1..5`) и
`windows.glazing_construction`. При `windows.enabled=true` тип обязателен и
напрямую соответствует `Лист1!B8`; canonical labels — `Тип 1`…`Тип 5`.
Исторические ID3/ID4/ID5 не требуются runtime: снег и ветер берутся из
локальных листов основной книги. Формульная цепочка окон доказана для
реализации; `WindowGirtCalculator` реализован для доказанного локального
domain; отсутствие
non-zero golden oracle блокирует только `PARITY_PROVEN`.

Статусы оконной ветки: `WINDOW_CALCULATOR_IMPLEMENTED=true`,
`WINDOW_PARITY_PROVEN=false`.

Для пролёта используется `STANDARD_FAMILY_WITH_LITERAL_GEOMETRY`: `span_m`
остаётся конечным пользовательским числом в диапазоне `(0,24]`, а
`resolveDesignSpanFamily(span_m)` выводит только lookup-ключ `9|12|15|18|21|24`
по включительным верхним границам. Adapter не округляет и не меняет literal
span. Для 24 m family доказанный automatic low-height путь вычисляется локально;
`#N/A` возвращается только если выбранная и пересчитанная legacy lookup-ячейка
действительно ошибочна. `span_m>24` возвращает `UNKNOWN_DOMAIN`.

Климат задаётся discriminated union `ClimateInput`:

- `CITY_LOOKUP`: `country`, `city`, `normative_system`;
- `MANUAL`: `country`, `normative_system`, `snow_region`, `snow_load`,
  `wind_region`, `wind_load`, `seismicity` и необязательная `source_note`.

Районы и нагрузки хранятся раздельно; ручные значения не заменяются lookup.
Для Казахстана `normative_system` выбирается явно (`SP_20` = ветка «СП 20» или
`SP_RK_EN` = ветка «СП РК EN»).
Старые flat-поля принимаются только как compatibility input и нормализуются без
изменения Excel-методики.

`seismicity` сохраняется как входное климатическое поле, но его роль сейчас
классифицирована как `UNKNOWN`: доказанного влияния на structural formulas нет,
поэтому в инженерный расчёт оно не включается.

## Climate resolution flow

```text
CITY_LOOKUP: city → climate_lookup_sparse (exact match) → ClimateResult
MANUAL:     manual values → ClimateResult
```

В runtime используется только `climate_lookup_sparse`; для production calculation
доказаны exact tuples `RU|Роза|SP_20`, `RU|Сургут|SP_20` и
`RU|Березовский|SP_20` (для Березовского подтверждены `IV/1,5` и `I/0,23`). Неизвестный город даёт
`CITY_NOT_FOUND`, а найденная строка без доказанной ветки страны/норматива —
`UNKNOWN_CLIMATE_DATA`. Fuzzy/nearest-city fallback отсутствует.

Новый Core не использует `Лист1!J20`: это legacy implementation detail для
проверки старого Excel-поведения, а не пользовательский input или blocker.

После успешного разрешения `calculateCore1` помещает `ClimateResult` в typed
`context.climate`; последующие модули получают его без повторного lookup.

## Window girt calculation lifecycle

```text
windows.enabled + window_type + ClimateResult + FrameResult
  → local window_profile_candidates dataset
  → SP_20/SP_RK_EN branch selected by normative_system
  → lower/upper candidate checks and first-order selection
  → WindowGirtResult with utilization, profile, steel, mass and trace
```

`WindowGirtCalculator` не читает `Core1Input` целиком, не использует J20 или
внешние ID3/ID4/ID5 и не вызывается при `windows.enabled=false`. Его результат
доступен в `context.windows`; затем `OpeningMassCalculator` агрегирует только
доказанную дополнительную массу проёмов и доступен в `context.openings`.

## Structural summary lifecycle

```text
FrameResult + PurlinResult + SecondarySteelResult + OpeningMassResult
  → exact legacy D69 aggregation
  → StructuralSummaryResult.kg_per_m2
```

`StructuralSummary` не пересчитывает upstream-модули. В `D69` используется
только `OpeningMassResult.opening_mass_kg_per_m2` (эквивалент `D68`); `E68`
в тоннах и отдельная масса оконных ригелей повторно не суммируются.

`FrameSelector` получает live `building_length_m`. Для length-dependent строки
рамы он воспроизводит локальную legacy-связь `CM/CP → CQ`: формула `CM`
оценивается с текущей длиной проекта, `CP` берётся из локального dataset, а
итог нормируется на `span × building_length`. Это устраняет доказанный
`FRAME_LENGTH_ERROR` проекта 22318 без изменения выбора профиля, шага или
арифметики `StructuralSummary`.

## Frame selection lifecycle

```text
ClimateResult
  → design span family → frame dataset (только выбранный frame_<family>m_cells)
  → candidate branches (снег/ветер, высотная группа, legacy reliability branch)
  → first-match / exact manual-step selection
  → FrameResult
```

`FrameSelector` — чистая функция: загрузка выполняется репозиторием, а выбор
балки, колонны, шага и коэффициентов — по cached values локального dataset.
В сохранённом baseline подписи reliability-блоков листа инвертированы
относительно входного `responsibility_factor`; это сохранено как legacy mapping.
`FrameSelector` получает literal `span_m`, но выбирает dataset по
`design_span_family`; trace содержит оба значения (`literal_span_m` и
`design_span_family`). Пролёты в `(0,24]` проходят generic family mapping;
семейство 24 m использует proven automatic low-height local row. Высота проходит
через доказанные legacy bands `3,6/4,8/6,0` при пользовательском диапазоне
`(0,6,2]`; длина является положительным арифметическим входом без придуманного
максимума. Доказанная
Excel parity зафиксирована только для сохранённого 12‑м baseline. Пролёт 24 м
вычисляет local structural base для proven row, а отсутствие строки или ручного шага — typed
`FRAME_NO_MATCH`/`UNKNOWN_FRAME_DOMAIN` без исключения.

После выбора рамы результат доступен как `context.frame`; затем оркестрация
лениво загружает локальные purlin/profile/roof/deck datasets и вызывает
`PurlinCalculator`. Результат доступен как `context.purlin`; следующий этап
оркестрации — `SecondarySteelCalculator`. Результат `IMPLEMENTED` для остальных
пролётов не следует называть `PARITY_PROVEN` без отдельного golden oracle.

## Purlin calculation lifecycle

```text
ClimateResult + FrameResult + roof/deck inputs
  → local purlin datasets (selection rules, profile catalogue, axis, constants)
  → exact D21 header/matrix lookup (deck limit from вывод!W11:W63)
  → Excel-compatible SO/BFE candidate evaluation within effective step limit
  → MP350/MP390 branch and mass calculation
  → PurlinResult in context.purlin
```

Для baseline 12 м значения `P28:V28` совпадают с локальным cached результатом
(`2ПС 200х65х2`, `М.п.390`, 2140 мм, 7.539 кг/м², 1550.88 кг). Шаг 500 мм
сохраняет typed legacy `#REF!`; отсутствие допустимого кандидата — typed
`#N/A` diagnostic. `roof_deck_grade` выбирает exact колонку D21 в локальной
матрице настила, а `trace` содержит `deck_step_limit_mm`,
`configured_step_limit_mm`, `manual_step_limit_mm`, `effective_step_limit_mm`,
`evaluated_steps_mm` и `selected_step_mm`. Ненулевой manual max заменяет
deck-derived max как в `Подбор прогонов 2!B14`; cached `B14` не используется как
неподтверждённый глобальный cap. Для Scenario B (`С-П 200` + `С44-1000-0,5`)
воспроизведены `2ПС 150х65х1,5`, 1000 мм, 1756.44 кг и `D69 ≈ 31.2589236111`.
Внешние книги ID 1/2 runtime не используются.

`PURLIN_DECK_GAP = CLOSED`: deterministic local calculation is implemented;
`PARITY_PROVEN` остаётся только для сохранённого 12‑м baseline и проверенного
Scenario B replay. Для Н60-845-* требуются отдельные Excel golden outputs для
полного parity.

## Secondary steel lifecycle

```text
FrameResult + PurlinResult + geometry + climate flags
  → secondary element rules (`secondary_steel_rules`)
  → quantities/masses from `bolts_plates_fittings`
  → SecondarySteelResult in context.secondarySteel
```

Модуль включает затяжки, подвесы, распорки, горизонтальные и вертикальные
связи, торцевые стойки, портальные связи, вторичные балки/стойки, пластины,
болтовые схемы, количество M16 и массу фасонок. Оконные ригели, прогоны,
основные балки/колонны и цены в него не входят.

Zero-controlled expressions не удаляются: trace хранит
`calculated_value`, `inclusion_factor`, `effective_value` и классификацию.
В экспортированных secondary datasets выражений `*0` или `IF(...,0,...)` не
обнаружено; управляющий `D29="+"` сохраняется как отдельная ветка.

Для baseline 12 м статус `PROVEN_12M_BASELINE`; для остальных пролётов
реализованный локальный путь имеет статус `LOCAL_DETERMINISTIC`, но не
`PARITY_PROVEN`. Коммерческие цены и Core 2 закупочные данные остаются за
границей Core 1.

## Execution lifecycle

```text
Core1Input
  → Schema validation
  → Domain validation
  → Lazy dataset loading
  → Early compatibility diagnostics
  → Future calculation modules
  → Core1Result
```

`calculateCore1` реализует полный orchestration boundary до
`StructuralSummary`. Ожидаемые legacy-сценарии возвращаются как
`legacy_error`, неподдержанные ветви — как `unsupported`, а supported input
возвращает типизированный `success` с `Core1Result`. Следующий этап — UI/Core 2.

## Legacy connection calculation and replay

Canonical automatic connection/BOM calculation is proven for 9–21 m:

```text
canonical climate
  → base legacy branch (V7 / ROW14)
  → span-scaled legacy branch (W7 / ROW15)
  → FrameSelector + PurlinCalculator for both candidates
  → strict E8 > E9 selector (equality keeps ROW14)
  → versioned connection lookup matrix
  → D52/E52/D53/D54/D55/D57
```

`LegacyConnectionResolver` uses
`core1/data/legacy_connections/connection_lookup_rows.json`, generated by
`tools/extract_legacy_connection_lookup.py`. It does not change canonical
climate values. Manual frame-step remains unverified; 24 m retains the proven
legacy `#N/A` connection boundary.

Historical snapshot replay remains available as a separate provenance path:

```text
CANONICAL
  ProjectInput → canonical Core1 datasets → current calculation

LEGACY_REPLAY
  ProjectInput → literal span/design family
  + project-scoped LegacyConnectionSnapshot
  → LegacyConnectionReplayResolver
  → D52/E52/D53/D54/D55/D57 semantic result
```

`LegacyConnectionReplayResolver` принимает только доказанный snapshot,
проверяет provenance, design family и source range, а затем отображает
`F/J/K/L/M/N` в семантические outputs. При отсутствии snapshot он возвращает
`LEGACY_CONNECTION_SNAPSHOT_REQUIRED`; fallback на MASTER запрещён. Исторический
24 м saved-cache `#N/A` сохраняется только в replay snapshot и не навязывается
generic calculation. Replay resolver не вызывается каноническим
`calculateCore1` без явного replay snapshot.
