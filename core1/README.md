# Core 1 data baseline

`core1` содержит данные и эталоны для будущего автономного расчётного движка. Расчётные модули на этом этапе не реализованы.

## Состав

- `data/` — 22 deterministic snapshots из основной книги и manifest с checksum.
- `fixtures/` — 17 сценариев, разделённых на input и expected files.
- `schemas/` — JSON Schema для `Core1Input`, `Core1Result`, `Core1Diagnostic`.
- `tests/test_static_data_integrity.py` — read-only сверка CSV с XLSX как ZIP/XML.

Основной источник:

`Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx`

SHA-256 источника:

`0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f`

## Проверка

Из корня репозитория:

```powershell
pytest core1/tests/test_static_data_integrity.py
```

Проверка не использует Excel runtime, COM или LibreOffice. Она читает исходный XLSX как ZIP/XML и сравнивает metadata, формулы, cached values, типы ячеек, количество записей и checksum каждого dataset.

## Ограничения v1

- Пролёт 24 м сохраняет legacy `#N/A`.
- Выбранный шаг прогонов 500 мм сохраняет legacy `#REF!`.
- Ненулевые окна возвращают `REQUIRED_MODULE_NOT_IMPLEMENTED` до реализации обязательного оконного модуля.
- Конфликтующая таблица городов с совпадением 82,4% не используется.
- ID 1/2 не являются runtime dependencies.
- `kg_per_m2` измеряется в кг/м².
- Поле общей абсолютной массы каркаса не добавлено, потому что его legacy formula не доказана.
