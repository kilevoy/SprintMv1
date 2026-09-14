# SOURCE_IMPORT_REPORT

Накопительный отчёт A.2 — External Source Import & Differential Verification.

## Run A.2-000 — preflight без exact external source

Дата проверки: 2026-09-15. Исходный `22285.xlsx` не изменялся. Фактический импорт в external ID не выполнен, потому что точный внешний файл из `SOURCE_REQUIREMENTS.md` не найден.

| Кандидат | SHA-256 | Структура | Сопоставление с ожидаемым источником | Статус |
|---|---|---|---|---|
| `C:\Users\Deako\Downloads\прайс март2026.xlsx` | `4f80f15d36762a7448880be9df446a1aceedc0f63f5a45c1eee325cf77c7826b` | один лист `TDSheet`, 2175×10, без формул; дата цен внутри книги `12.03.2026`; есть цена, единица и вес 1 ед. | не совпадает со структурой ID 1 (`Основные`, `Перекупные`, `СП`) и не предоставляет адреса `[1]...!F342/D278/...`; может быть более новый плоский прайс, но адресная совместимость не доказана | DIFFERENT METHODOLOGY / PARTIALLY VERIFIED |
| `sigma-profili-insi-gost-lgs2.xlsx` | `14f0c06a98316a9ff18d95b1786d6d127c2aeac882552b82b6c476ade865715f` | 5 листов, 1140 формул; диапазоны сигмы, ГОСТ, методика | не совпадает с ожидаемым external ID; скорее отдельный сортамент/методика Core 1 | WRONG SOURCE FOR CURRENT ID / CANDIDATE FOR CORE 1 |
| `pgs-profili-gost-insi-lgs2.xlsx` | `c4f0d6436c519ca091d49b5d91080cd12876c13b64e0fb29022101e25e7daaf4` | 6 листов, 3456 формул; ПГС, ГОСТ-LGS, редукция, допуски | нет листов и адресной структуры ожидаемых ID 1/2 | WRONG SOURCE FOR CURRENT ID / CANDIDATE FOR CORE 1 |
| `pp-profili-gost-insi-lgs2.xlsx` | `bda53cb145495d12a7b8155ddcb2db01c334b94c1e0f212e4deebaac4b3fabbd` | 6 листов, 4408 формул; ПП, ГОСТ-LGS, редукция, допуски | не совпадает с ID 2 и не даёт адрес `[3]ПП!H42` в ожидаемой книге | WRONG SOURCE FOR CURRENT ID / CANDIDATE FOR CORE 1 |
| `z-profili-gost-insi-lgs2.xlsx` | `2392c75bd96de8e3fc08963edfb648dc7658cb168d0b44031032d4176dc104f` | 6 листов, 3434 формулы; Z, ГОСТ-LGS, редукция, допуски | не совпадает с ожидаемой структурой external ID | WRONG SOURCE FOR CURRENT ID / CANDIDATE FOR CORE 1 |

## Differential verification result

Для этих кандидатов нельзя построить карточки `external source → cache → formula`, потому что нет доказанного соответствия `external_id` и внешнего листа/адреса. В частности, нельзя сравнить `прайс март2026.xlsx!TDSheet` с формулой `[1]Основные!F342`: это разные адресные пространства.

Legacy cache не заменён. Ни один `MISSING EXTERNAL SOURCE` не закрыт.

## Результаты

- `CLOSED`: 0 external IDs.
- `PARTIALLY CLOSED`: 0 external IDs; `прайс март2026.xlsx` только структурно признан потенциальным кандидатом.
- `VERSION CONFLICT`: потенциальный конфликт для `прайс март2026.xlsx`: дата 12.03.2026 новее по календарю, но совместимость методики не доказана.
- `STILL MISSING`: external IDs 1–10.
- `NEW UNKNOWN`: является ли `прайс март2026.xlsx` заменой ID 1, и являются ли профильные ГОСТ-LGS файлы частью будущего Core 1 или самостоятельными сортаментами.

## Следующий допустимый шаг

Нужен либо точный файл с листами и адресами ожидаемого external ID, либо явная таблица mapping `новый лист/поле → legacy external ID/ячейка` от владельца источника. До этого запрещена автоматическая подмена legacy cache.

