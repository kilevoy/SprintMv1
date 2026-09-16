# Готовность данных Core 1

## Static datasets

Подготовлено 22 datasets, 102 416 записей. Они покрывают frame tables 9–24 м, локальные climate tables, roof/deck, purlin catalogue/constants/rules, secondary steel, plates/bolts/fittings и локальную структуру оконного подбора.

Для поддерживаемого non-window v1 исходные static snapshots подготовлены. Точные legacy datasets ID 3/4/5 отсутствуют и намеренно не заменены конфликтующими версиями.

## Golden fixtures

Создано 17 сценариев и 34 fixture files:

- 4 `READY`;
- 2 `EXPECTED_LEGACY_ERROR`;
- 1 `REQUIRED_MODULE_NOT_IMPLEMENTED` (ненулевые окна до реализации обязательного модуля);
- 10 `UNKNOWN`.

## Доказанные expected outputs

Сохранённый baseline 12 м доказывает 31 конкретное top-level поле результата, включая профили, стали, utilizations, frame step, прогон, вторичную сталь, крепёж, массы проёмов и `kg_per_m2`. Он также доказывает, что zero-window scenario имеет нулевой вклад и не требует ID 3/4/5.

Отдельно доказаны ожидаемые diagnostics:

- span 24 м → `SPAN_24_LEGACY_NA` / `#N/A`;
- purlin step 500 → `PURLIN_STEP_500_REF` / `#REF!` при достижении кандидатом итогового выбора;
- nonzero windows → `WINDOW_GIRT_MODULE_NOT_IMPLEMENTED` до реализации обязательного модуля.

## Оставшиеся UNKNOWN

- числовые expected outputs нормальных fixtures 9, 15, 18 и 21 м;
- результаты флагов snow retention/enclosure `есть`;
- manual frame step fixture;
- альтернативные roof/deck combinations;
- responsibility `1,0`;
- единый typed объект `engineering_loads`;
- произвольные city inputs за пределами proven local successful lookup set;
- все ненулевые оконные расчёты.

## Можно ли начинать Calculation Engine

**Да, с ограничением области.** Можно реализовывать data loaders, Excel-compatible value/error semantics и non-window модули для baseline и доказанных локальных datasets. Нельзя объявлять полный parity или закрывать acceptance для 9/15/18/21 и вариантов с `UNKNOWN`, пока не появятся независимые expected values.

`WindowGirtCalculator` на первом этапе может существовать только как support gate, возвращающий contract diagnostic. Инженерский оконный расчёт, исправление 24 м и восстановление ссылки шага 500 мм не входят в разрешённую реализацию.

## Exit criteria перед engine acceptance

1. Все 25 integrity/schema/manifest tests проходят.
2. Dataset checksum совпадает с source workbook checksum manifest.
3. Baseline 12 м воспроизводится по всем доказанным полям.
4. Legacy errors возвращаются без исправления.
5. UNKNOWN fixtures не используются как доказательство корректности.
6. Ненулевые окна не возвращают числовой инженерный результат.
