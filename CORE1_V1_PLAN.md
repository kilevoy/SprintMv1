# Core 1 v1 — решение о реализации

## 1. Что входит в v1

- строгая нормализация и валидация доказанных inputs;
- versioned static datasets, извлечённые из основной книги;
- climate resolution для локальной ветки основного каркаса;
- выбор балки, колонны и effective frame step для пролётов 9–21 м;
- автономный расчёт прогонов по локальным таблицам;
- вторичная сталь, пластины, болты, М16 и фасонки;
- масса ворот/дверей в утверждённых golden scenarios и нулевой оконный сценарий;
- локальная формульная цепочка оконных ригелей для `window_type=1..5`; parity acceptance для неё требует отдельного non-zero golden oracle;
- структурный итог `kg_per_m2` и полный payload Core 1 → Core 2;
- typed diagnostics и provenance каждого результата.

В v1 нет UI, corrected engineering mode, автоматического исправления формул и Excel runtime.

## 2. Что работает с Excel parity

- точные enum/string semantics и lookup order;
- frame tables 9–21 м после прохождения golden tests;
- активная ветка `Подбор прогонов 2!P28:V28` без старых книг ID 1/2;
- правила вторичной стали и крепежа из основной книги;
- saved workbook scenario;
- нулевой оконный/проёмный сценарий;
- единицы: `T28` и `D69` — кг/м², `V28` — кг, `E68` — т.

Parity означает совпадение текста/ошибки точно и чисел без промежуточного округления, с допуском только на машинный floating-point drift.

## 3. Что возвращает legacy error

- шаг прогона 500 мм → `PURLIN_STEP_500_REF` / `#REF!`;
- пролёт 24 м → `SPAN_24_LEGACY_NA` / `#N/A`;
- не найденный lookup → `LOOKUP_NO_MATCH` / `#N/A`;
- отсутствие допустимого кандидата → исходный `#N/A` или sentinel behavior;
- активные `#VALUE!` и `#DIV/0!` → одноимённые typed errors;
- legacy-запрос штатно недостижимой EN-ветки окон → `WINDOW_EN_SWITCH_UNREACHABLE`; новый API не использует этот switch.
- ошибочный/недоступный оконный dataset → typed diagnostic без подстановки числового результата; доказанный модуль возвращает `WindowGirtResult`.

## 4. Что временно unsupported

- parity-утверждение чисел оконного подбора до появления non-zero golden oracle;
- произвольный city membership вне подтверждённого локального snapshot;
- новый API не блокируется J20: EN выбирается `normative_system=SP_RK_EN`;
- числовые значения длины, высоты, ручного шага и количеств проёмов вне утверждённого golden-domain;
- нормальный конструктивный результат для пролёта 24 м;
- отдельный материал стены: такого legacy-входа нет;
- абсолютный `structural_weight_kg`: legacy source не доказан.

## 5. Порядок экспорта таблиц

1. Зафиксировать checksum исходной основной книги и export manifest.
2. Экспортировать `roof_properties` и `deck_step_limits`.
3. Экспортировать purlin profile/axis/calculation blocks и validation metadata.
4. Экспортировать frame tables 9–21 м и selection rules; 24 м — отдельно с raw errors.
5. Экспортировать локальные climate lookup и сформировать exact supported-city manifest.
6. Экспортировать secondary steel, bolts, plates and fittings.
7. Экспортировать window profile candidates, коэффициенты `I34:L38`, glazing
   mapping и локальные SP_20/SP_RK_EN sheets как доказанный data/trace слой.

Каждый экспорт проверяется количеством строк/ячеек, raw types, source addresses и checksum. Конфликтующие внешние кандидаты не смешиваются с canonical data.

## 6. Порядок реализации модулей

1. `InputValidation` и общие Excel-compatible value/error types.
2. Static dataset loaders и provenance validation.
3. `ClimateResolver` для frame context.
4. `FrameSelector` для 9–21 м и legacy-error path 24 м.
5. `PurlinCalculator`, включая candidate trace и шаг 500 error.
6. `SecondarySteelCalculator`.
7. `WindowGirtCalculator` по локальной формульной цепочке, с trace и branch-specific selection.
8. `OpeningMassCalculator` для поддержанных сценариев.
9. `StructuralSummary` и Core 1 → Core 2 payload.

## 7. Golden tests до UI

### Baseline

- сохранённый сценарий: `Роза`, 12×18×3 м, responsibility `0,8`, auto frame step, `С-П 200`, `С44-1000-0,7`, без дополнительных прогонов и проёмов;
- проверить все outputs контракта, raw types и единицы;
- обязательные anchors прогонов: `P28=2ПС 200х65х2`, `Q28=любая`, `R28=0`, `S28=2140`, `T28=7,539`, `U28=М.п.390`, `V28=1550,88`.

### Domain matrix

- каждый поддержанный пролёт 9/12/15/18/21 минимум в одном валидном сценарии;
- 24 м должен вернуть `SPAN_24_LEGACY_NA`, а не результат;
- оба responsibility values;
- auto frame step и минимум один утверждённый manual fixture;
- все 20 roof keys и четыре deck keys;
- все четыре сочетания `есть/нет` для snow-retention и enclosure purlin;
- exact unknown covering/deck/city lookup errors;
- низкое/среднее/высокое утверждённое значение length и height после получения Excel fixtures.

### Error and compatibility

- достижимый purlin step 500 → `#REF!`;
- отсутствие допустимого purlin profile → штатный `#N/A`;
- различие строки `"0"`, числа `0`, `"-"`, `""` и blank;
- first-match на дублирующемся ключе и tie-breaking равных кандидатов;
- no intermediate rounding;
- нулевые окна не вызывают window-source error;
- ненулевые окна с `window_type=1..5` доходят до реализованного WindowGirtCalculator;
- KZ: явный выбор «нет» маршрутизирует `SP_20`, «да» — `SP_RK_EN`;
- отсутствие ID3/ID4/ID5 не является runtime blocker: используются локальные листы основной книги;
- conflicting 82,4% city dataset никогда не загружается как canonical.

### Interface

- Core 2 payload содержит все обязательные fields и diagnostics;
- Core 2 не получает разрешение повторно выбирать профиль/шаг/нагрузку;
- `kg_per_m2` сопоставляется с `вывод!D69` и никогда не маркируется как тонна или абсолютная масса;
- поле `structural_weight_kg` отсутствует.

## Definition of done для Core 1 v1

V1 готов к подключению потребителя только когда экспортированные datasets воспроизводимы по checksum, все supported golden tests проходят, все обязательные legacy-error tests возвращают договорённые typed errors, а unsupported оконные сценарии не выдают числовой инженерный результат.
