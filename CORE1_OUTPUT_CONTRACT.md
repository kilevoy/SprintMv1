# Контракт выходов Core 1

## Основные результаты

| Name | Excel cell | Type | Unit | Source module | Confidence |
|---|---|---|---|---|---|
| `beam_profile` | `вывод!D33` | string | profile | основной подбор | high |
| `beam_steel` | `E33` | string | grade | legacy constant `М.п.350` | high |
| `beam_utilization` | `F33` | number | % | `подбор!AH14:AH15` | high |
| `column_profile` | `D34` | string | profile | основной подбор | high |
| `column_steel` | `E34` | string | grade | legacy constant `М.п.350` | high |
| `column_utilization` | `F34` | number | % | `подбор!AG14:AG15` | high |
| `frame_step_m` | `вывод!F8` (effective), `D8` (auto), `D9` (override) | number | m | основной подбор/input resolution | high |
| `purlin_profile` | `D35` ← `Подбор прогонов 2!P28` | string | profile | purlin selection | high |
| `purlin_steel` | `E35` ← `U28` | string | grade | purlin selection | high |
| `purlin_step_mm` | `Подбор прогонов 2!S28` | number | mm | purlin selection | high |
| `purlin_kg_per_m2` | `T28` | number | kg/m² | purlin mass / plan area × 1,05 | high |
| `purlin_weight_kg` | `V28` | number | kg | purlin selection | high |
| `purlin_assignment` | `Q28` | string | enum/text | purlin selection | medium |
| `ties` | `вывод!D36:E36` | object | profile + grade | output rules | high |
| `suspensions` | `D37:E37` | object | profile + grade | output rules | high |
| `spacers` | `D38:E38` | object | profile + grade | output rules | high |
| `horizontal_bracing` | `D39:E39`, также `D43:E43` | object/list | profile + grade | output rules | high |
| `vertical_bracing` | `D40:E40`, также `D44:E44` | object/list | profile + grade | output rules | high |
| `gable_posts` | `D41:E41` | object | profile + grade | основной подбор/output rules | high |
| `portal_bracing` | `D42:E42` | object | profile + grade | legacy fixed rule | high |
| `secondary_beams` | `D45:E46` | list | profile + grade | legacy output (`Г.Балка`, `В.Балка`) | medium |
| `secondary_columns` | `D47:E47` | object | profile + grade | legacy output (`Ст. перекрытия`) | medium |
| `plates` | `D48:E49` | list | thickness + grade | legacy output | high |
| `bolts` | `D52:D55` | list | bolt patterns | основной подбор | high |
| `M16_quantity` | `D56` | integer | pcs | legacy rule | high |
| `fittings_weight_kg` | `D57` | number | kg | основной подбор | high |
| `window_girts` | выбранные результаты `Расчет!B21:B23,B26:B28`; представление `Лист1!B24:D33,B37:D46` | object/list | profile/checks | window-girt selection | medium; exact scenario parity needs legacy `[3]/[4]` closure |
| `openings_weight_kg_per_m2` | `вывод!D68` ← `Лист1!O28` | number | kg/m² | openings/window module | high |
| `openings_weight_t` | `E68` ← `Лист1!O29` | number | t | openings/window module | high |
| `openings_weight_kg` | derived API field `E68 × 1000` | number | kg | exact unit conversion from proved tonnes cell | high |
| `kg_per_m2` | `вывод!D69` | number | kg/m² | `IF(D9=0,E8,E9)+D68` | high |

`вывод!D69` — удельная металлоёмкость здания в **кг/м²**, не абсолютная масса и не тонны. Значение порядка `0,85596 т`, если встречается в расчёте, относится к абсолютной массе дополнительных конструкций/проёмов, а не к `D69`.

Поле `structural_weight_kg` в контракт не включено: отдельная каноническая legacy-ячейка общей абсолютной массы конструкций не доказана.

## Compatibility-only outputs

- `вывод!F35=85` следует выдавать как `legacy_purlin_utilization_display`, а не подменять им `purlin_kg_per_m2`.
- `Подбор прогонов 2!R28=0` можно сохранять как raw compatibility field, но нельзя давать ему инженерское имя без доказательства.
- Ошибки Excel являются частью результата: выбранная ветка может вернуть `#N/A`, `#REF!`, `#VALUE!` или `#DIV/0!`; API должен передавать typed error, а не молча заменять нулём.
