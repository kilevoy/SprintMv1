# Core 1 TypeScript data layer

Это browser-ready foundation для будущего Calculation Engine. На текущем этапе здесь нет расчётных модулей, React UI, backend или Core 2.

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
- лениво загружает только запрошенный frame dataset, например `frame_18m_cells.csv`;
- предоставляет отдельные методы для purlin, roof/deck, climate, secondary steel, constants и fixtures;
- не выполняет расчёты, округление или исправление Excel errors.

Небольшие JSON Schema импортируются в AJV для runtime validation. Большие CSV не превращаются в JS bundle и не импортируются статически.

## Test/development loading

`TestDataSource` реализован только в Vitest test support и предназначен для Node-тестов/tooling. Он читает локальные `core1/data`/`core1/fixtures`; production index его не экспортирует и production `src/core1` не содержит Node filesystem APIs.

Vitest проверяет путь GitHub Pages, lazy loading, кеширование, CSV quoting/numeric types, manifest, fixtures и schema validation. Python-тест отдельно проверяет `XLSX → exported data`; TypeScript-тесты проверяют `exported data → production runtime` и не дублируют XML integrity scan.

## Compatibility boundary

Типы `LEGACY_NA`, `LEGACY_REF`, `LEGACY_VALUE`, `LEGACY_DIV0` подготовлены для будущего движка. Excel functions пока не реализованы.

`kg_per_m2` остаётся в кг/м². `structural_weight_kg` отсутствует. UNKNOWN fixtures никогда не считаются numeric oracle. Пролёт 24 м и шаг прогона 500 мм должны сохранять legacy diagnostics согласно существующим контрактам.

## Input contract updates

Новый контракт разделяет `windows.window_type` (доказанные схемы `1..5`) и
`windows.glazing_construction`. Ненулевые окна являются обязательной частью
Core 1: до реализации `WindowGirtCalculator` они возвращают
`required_module_not_implemented` с диагностикой
`WINDOW_GIRT_MODULE_NOT_IMPLEMENTED`, а не `UNSUPPORTED_FOR_PARITY`.

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

`calculateCore1` реализует только этот orchestration boundary. Ожидаемые
legacy-сценарии возвращаются как `legacy_error`, неподдержанные ветви — как
`unsupported`, а обычный supported input пока завершается внутренним
`NOT_IMPLEMENTED`; инженерный результат не подставляется.
