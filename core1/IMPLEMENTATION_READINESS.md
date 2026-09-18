# Готовность данных Core 1

## Static datasets

Подготовлено 22 datasets, 102 416 записей. Они покрывают frame tables 9–24 м, локальные climate tables, roof/deck, purlin catalogue/constants/rules, secondary steel, plates/bolts/fittings и локальную структуру оконного подбора.

Для поддерживаемого non-window v1 исходные static snapshots подготовлены.
Оконные снеговые/ветровые листы также локальны; исторические ID3/4/5 не
являются runtime dependencies и не заменяются конфликтующими версиями.

## Golden fixtures

Создано 18 сценариев и 36 fixture files:

- 5 `READY`;
- 1 `EXPECTED_LEGACY_ERROR`;
- 0 `REQUIRED_MODULE_NOT_IMPLEMENTED`;
- 12 `UNKNOWN` (исторический saved-cache 24 м fixture относится сюда; active auto fixture доказан отдельно).

## Доказанные expected outputs

Сохранённый baseline 12 м доказывает 32 конкретных top-level поля результата, включая профили, стали, utilizations, frame step, прогон, вторичную сталь, крепёж, массы проёмов и `kg_per_m2`. Он также доказывает, что zero-window scenario имеет нулевой вклад и не требует ID 3/4/5.

Отдельно доказаны ожидаемые diagnostics:

- stale saved-cache 24 м `#N/A` не является active rule; typed `SPAN_24_LEGACY_NA` сохраняется только для реально выбранной активной ошибки;
- purlin step 500 → `PURLIN_STEP_500_REF` / `#REF!` при достижении кандидатом итогового выбора;
- nonzero windows → deterministic `WindowGirtResult`; отсутствие golden oracle блокирует только parity acceptance.

## Оставшиеся UNKNOWN

- числовые expected outputs нормальных fixtures 9, 15, 18 и 21 м;
- результаты флагов snow retention/enclosure `есть`;
- manual frame step fixture;
- альтернативные roof/deck combinations;
- responsibility `1,0`;
- единый typed объект `engineering_loads`;
- произвольные city inputs за пределами proven local successful lookup set;
- golden expected outputs всех ненулевых оконных сценариев.

## Итоговый статус Calculation Engine

- `CORE1_ENGINE_IMPLEMENTED: true`
- `CORE1_12M_PARITY_PROVEN: true` (32/32 proven fields)
- `CORE1_OTHER_SPANS_PARITY_STATUS: NOT_PROVEN` (9/15/18/21 deterministic path, golden values UNKNOWN)
- `WINDOW_PARITY_STATUS: NOT_PROVEN` (local non-zero chain implemented, oracle отсутствует)
- `KZ_PARITY_STATUS: NOT_PROVEN` для `SP_20` и `SP_RK_EN` (маршрутизация реализована, KZ golden oracle отсутствует)
- `KNOWN_LEGACY_ERRORS: selected active lookup #N/A; purlin step 500 → #REF!`
- `KNOWN_UNKNOWN_FIXTURES: 12` согласно manifest

## Можно ли использовать Calculation Engine

**Да, с ограничением области.** Можно реализовывать data loaders, Excel-compatible value/error semantics и non-window модули для baseline и доказанных локальных datasets. Нельзя объявлять полный parity или закрывать acceptance для 9/15/18/21 и вариантов с `UNKNOWN`, пока не появятся независимые expected values.

`WindowGirtCalculator`, `OpeningMassCalculator` и `StructuralSummary` реализованы
по доказанной локальной формульной границе. Для supported scenarios
orchestration возвращает полноценный `success` с `Core1Result`; `NOT_IMPLEMENTED`
больше не является штатным финальным статусом.
Непроверенные 24 м manual/upper-height/ROW15 branches и восстановление ссылки
шага 500 мм не входят в разрешённую реализацию.

## Exit criteria перед engine acceptance

1. Все 25 integrity/schema/manifest tests проходят.
2. Dataset checksum совпадает с source workbook checksum manifest.
3. Baseline 12 м воспроизводится по всем доказанным полям.
4. Legacy errors возвращаются без исправления.
5. UNKNOWN fixtures не используются как доказательство корректности.
6. Ненулевые окна возвращают `WindowGirtResult`; числовой parity oracle ещё не утверждён.
7. `calculateCore1()` возвращает полноценный `success` для supported 9/12/15/18/21 м и proven automatic low-height 24 м; шаг 500 мм сохраняет legacy error.
