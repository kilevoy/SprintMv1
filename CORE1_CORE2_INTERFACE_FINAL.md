# Финальный интерфейс Core 1 → Core 2

Core 1 является source of structural truth. Core 2 считает количества, BOM и стоимость и не повторяет инженерный выбор профилей, шагов или нагрузок.

| Field | Type | Unit | Required | Source in Core 1 | Consumer in Core 2 |
|---|---|---|---|---|---|
| `scenario` | object | — | yes | нормализованные user inputs | идентификация расчёта, геометрия количеств |
| `frame_step_m` | number | m | yes | effective `вывод!F8` | число рам и длины элементов |
| `beam_profile`, `beam_steel` | string | profile/grade | yes | `D33:E33` | BOM балок |
| `beam_utilization` | number | % | yes | `F33` | traceability/QA, не повторный подбор |
| `column_profile`, `column_steel` | string | profile/grade | yes | `D34:E34` | BOM колонн |
| `column_utilization` | number | % | yes | `F34` | traceability/QA |
| `purlin_profile`, `purlin_steel` | string | profile/grade | yes | `D35:E35` / `P28,U28` | BOM прогонов |
| `purlin_assignment` | string | enum/text | yes | `Q28` | правила разнесения позиций |
| `purlin_step_mm` | number | mm | yes | `S28` | количество/раскладка прогонов |
| `purlin_kg_per_m2` | number | kg/m² | yes | `T28` | контроль массы |
| `purlin_weight_kg` | number | kg | yes | `V28` | итог BOM прогонов |
| `ties`, `suspensions`, `spacers` | component objects | profile/grade | yes | `D36:E38` | позиции и количества вторичных элементов |
| `horizontal_bracing`, `vertical_bracing` | component arrays | profile/grade | yes | `D39:E40,D43:E44` | BOM связей |
| `gable_posts`, `portal_bracing` | component objects | profile/grade | yes | `D41:E42` | BOM фахверка/портальных связей |
| `secondary_beams`, `secondary_columns` | component arrays | profile/grade | conditional | `D45:E47` | BOM перекрытий/вторичных конструкций |
| `plates` | component array | thickness/grade | yes | `D48:E49` | BOM листовых деталей |
| `bolts` | component array | patterns/count | yes | `D52:D55` | крепёж BOM |
| `M16_quantity` | integer | pcs | yes | `D56` | крепёж BOM |
| `fittings_weight_kg` | number | kg | yes | `D57` | масса фасонок/BOM |
| `window_girts` | component array | profile/checks | conditional | `Расчет!B21:B23,B26:B28` / presentation `Лист1!B24:D33,B37:D46` | BOM ригелей окон |
| `openings_weight_kg` | number | kg | conditional | точное преобразование `E68 × 1000` | добавочные конструкции/масса |
| `kg_per_m2` | number | kg/m² | yes | `D69` | контрольный итог parity, не абсолютная масса |
| `engineering_loads` | typed object | kN, kN/m² etc. | yes | Core 1 load modules | audit trail и quantity rules; Core 2 не пересчитывает |
| `compatibility_diagnostics` | array | — | yes | Excel errors/branch flags | блокировка недостоверного BOM, аудит |

Каждый component object должен содержать минимум `name`, `profile`, `steel`, `source_cell`, `status`. Числа передаются без округления для показа; отображаемое округление хранится отдельно.

Core 2 запрещено повторно выбирать балки, колонны, шаг рам, прогоны, шаг прогонов, инженерные сечения и инженерные нагрузки. При typed error от Core 1 Core 2 должен остановить затронутый BOM-раздел, а не выбирать запасной профиль самостоятельно.
