# Sprint archive validation database

Инструмент для аудируемого сравнения старых расчётов Sprint с повторным расчётом
в чистой копии master template v1.5.

## Границы

- исходные XLSX и master template открываются только для чтения или через
  временную копию;
- Excel COM используется как единственный движок TEMPLATE REPLAY;
- `openpyxl` используется только для чтения архивных книг;
- неизвестные и неоднозначные значения остаются `null` и попадают в provenance;
- пилот запускается явно через `run_pilot.py`; массовый проход отдельной командой
  пока не реализован.

## Запуск пилота

```powershell
python -m tools.sprint_archive_validation.run_pilot `
  --archive-root E:\SprintMv1_reference `
  --master-template "Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx" `
  --output-dir outputs\sprint_pilot
```

После Python-прохода создаётся XLSX через `build_database.mjs` с использованием
`@oai/artifact-tool` из bundled runtime.

## Что считается доказанным

Replay не объявляется успешным только по отсутствию исключения. Сравнение выполняется
по typed values, Excel errors, raw profile strings и conservative normalized profile
keys. `D69` сравнивается как удельная металлоёмкость в кг/м².

`22326` сохраняется в dataset как `SOURCE_SUSPICIOUS / COMPATIBILITY_CASE` и не
используется как нормативный эталон.
