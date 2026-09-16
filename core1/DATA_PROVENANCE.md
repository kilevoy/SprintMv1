# Provenance статических данных Core 1

## Источник и метод

- Source workbook: `Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx`.
- Source SHA-256: `0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f`.
- Extraction date: `2026-09-16`.
- Schema version: `1.0.0`.
- Method: read-only ZIP/XML extraction. Excel, Excel COM, LibreOffice and formula recalculation не использовались.

Каждая CSV-строка содержит `source_workbook`, checksum, `source_sheet`, `source_range`, `extraction_date`, `units`, адрес ячейки, исходную формулу, cached value и cell type. `data/manifest.json` хранит те же metadata, record count и SHA-256 каждого файла.

## Экспортированные datasets

| Группа | Files | Records | Назначение |
|---|---:|---:|---|
| Frame tables 9–21 м | 5 | 47 405 | балки, колонны, utilizations, масса рамы и табличные зависимости |
| Frame table 24 м | 1 | 25 080 | compatibility snapshot; `#N/A` сохранены |
| Frame selection rules | 1 | 162 | выбранные ветки, массы, крепёж и итоговые поля `подбор` |
| Proven local climate | 2 | 19 063 | `Города п.К` и `снегветер`; только непустые локальные ячейки |
| Roof/deck | 2 | 759 | 20 покрытий, deck keys и матрица допустимого шага |
| Purlin data | 7 | 6 308 | catalogue, axis, constants, literals, thresholds, special rules, steel grades |
| Secondary steel / bolts | 2 | 72 | связи, стойки, пластины, болты, М16 и фасонки |
| Window interface/profile data | 3 | 3 756 | локальные кандидаты и layout; расчёт ненулевых окон ограничен локальным domain |
| **Всего** | **22** | **102 416** | — |

## Blank и error policy

- В прямоугольных ranges пустые ячейки представлены явным `null`.
- В sparse/literal datasets отсутствующий адрес означает blank.
- Style-only ячейки без формулы и значения не экспортируются.
- Числовой ноль, строка `"0"`, `"-"`, пустая строка и blank не объединяются.
- `#N/A`, `#REF!`, `#VALUE!`, `#DIV/0!` сохраняются как cached values.
- Shared-formula metadata сохраняется как JSON-объект формулы; formula cache не пересчитывается.

## Разрешённые и запрещённые источники

Использованы только локальные листы основной книги и доказанные cached values. External ID 1/2 не нужны для runtime: локальная эквивалентность их 1 756 используемых ячеек доказана.

Не включены как canonical runtime datasets:

- файл таблицы городов с совпадением около 82,4% с ID 3;
- `Подбор оконых ригелей v2.0.xlsx` как замена локальным ветрам;
- внешние ID3/ID4/ID5: они сохранены только как historical formula tokens,
  а не как обязательные источники.

Оконные профильные таблицы экспортированы только для будущего интерфейса. Они не делают ненулевой оконный сценарий поддержанным.

## Воспроизводимость

`test_static_data_integrity.py` независимо читает XLSX как ZIP/XML. Для каждого dataset он проверяет checksum файла, количество строк, metadata и полное совпадение каждой экспортированной формулы, cached value и cell type с исходной ячейкой.
