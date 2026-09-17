# Контракт входов Core 1

## USER INPUT

| Name | Excel cell | Type | Unit / allowed values | Required | Default | Downstream effect | Auto |
|---|---|---|---|---|---|---|---|
| `city` | `вывод!D2` | string | точный ключ города | yes | `Роза` | снег, ветер, нормативная ветка, окна | no |
| `normative_system` | новый Core API; legacy ветки `Ветер СП` / `Ветер по СП РК EN` | enum | `SP_20` / `SP_RK_EN`; для `country=KZ` обязателен явный выбор | yes | — | выбор локальной снеговой/ветровой ветки | no |
| `span_m` | `D4` | finite positive number | м; `0 < span_m <= 24`; frame lookup derives family `9/12/15/18/21/24` by inclusive upper bounds; literal value remains for geometry/mass | yes | 12 | таблица пролёта, профили, масса | no |
| `building_length_m` | `D5` | number | м | yes | 18 | число рам, прогоны, массы | no |
| `building_height_m` | `D6` | number | м | yes | 3 | таблица высоты, ветер, профили | no |
| `responsibility_factor` | `D7` | number/enum | 0,8 / 1,0 (наблюдаемые) | yes | 0,8 | нагрузки и выбор веток | no |
| `frame_step_override_m` | `D9` | number/blank | м; blank = auto | conditional | blank | шаг рам, нагрузки, массы | yes, when blank |
| `roof_covering` | `D20` | string enum | ключ `Подбор прогонов 2!N44:N63`: «наше» 100/150/200/250 мм и варианты ГВЛ, С-П 50/80/100/120/150/200/250, две малоуклонные кровли, профлист | yes | `С-П 200` | собственный вес, снег/ветер, прогоны, каркас | no |
| `roof_deck_grade` | `D21` | string enum | `С44-1000-0,5`, `С44-1000-0,7`, `Н60-845-0,7`, `Н60-845-0,8` (`O6:O9`; `O10:O11` пусты) | yes | `С44-1000-0,7` | допустимый шаг прогонов | no |
| `snow_retention_purlin` | `D26` | enum | `есть` / `нет` | yes | `нет` | количество и масса прогонов | no |
| `enclosure_purlin` | `D27` | enum | `есть` / `нет` | yes | `нет` | дополнительный прогон; не материал стены | no |
| `horizontal_bracing_override` | `D29` | string/blank | `+` или blank | conditional | blank | сечения распорок/связей | no |
| `gates_le_6m_count` | `D60` | integer | шт. | conditional | 0 | масса проёмов | no |
| `gates_gt_6m_count` | `D61` | integer | шт. | conditional | 0 | масса проёмов | no |
| `doors_count` | `D62` | integer | шт. | conditional | 0 | масса проёмов | no |
| `window_height_m` | `D64` | number | м | conditional | 0 | оконные ригели и масса | no |
| `window_strip_length_m` | `D65` | number | м | conditional | 0 | оконные ригели и масса | no |
| `separate_windows_count` | `D66` | integer | шт. | conditional | 0 | оконные ригели и масса | no |
| `window_construction` | `D67` | string enum | тип конструкции окна | conditional | `2ой стеклопакет` | нагрузка/масса окна | no |

## EXPERT SETTING

| Name | Excel cell | Type / allowed values | Default | Effect / auto |
|---|---|---|---|---|
| `selection_mode` | `подбор!V2` | `стандарт` / `подбор` | текущий режим листа | стратегия основного подбора; вручную |
| `building_roof_type` | `Подбор прогонов 2!B4` | `двускатное` / `односкатное` | `двускатное` | геометрия/число прогонов; в UI может выводиться автоматически из типа здания |
| `purlin_max_step_override_mm` | `вывод!D24` | number/blank | blank/0 | заменяет derived `D23`; вручную |
| `purlin_min_step_mm` | `вывод!D25` | number | 0 | нижняя граница специальной ветки |
| `terrain_type` | `Лист1!B14` | `А` / `В` / `С` | `В` | ветер окон; должен быть явным или определяемым проектом |
| `window_scheme_factor` | `Лист1!B3` | 1,1 / 1 / 0,8 | 1 | множитель оконной нагрузки |
| `window_type` | `Лист1!B8` | enum `1 | 2 | 3 | 4 | 5` | обязателен при `windows.enabled=true`; canonical labels: `Тип 1`…`Тип 5` | выбор схемы ригелей |
| `window_utilization_limit` | `Лист1!B20` | number | workbook value | предел подбора ригеля |
| `wind_code_choices` | `Лист1!D15:D16` | строки СП / СП РК EN | workbook values | legacy подписи; новый Core использует `normative_system`, не `J20` |
| `purlin_candidate_limits` | `Подбор прогонов 2!B21:B24,B28:B31` | `по умолчанию`, 90, 95 | `по умолчанию` | ограничения использования кандидатов |

## SYSTEM DEFAULT

| Name | Excel cell | Value | Effect |
|---|---|---|---|
| `purlin_wind_surcharge_kn_m2` | `Подбор прогонов 2!B8` | 0,2 | добавляется к нагрузке покрытия |
| `purlin_code_mode` | `B11` | `новым` | выбор нормативной таблицы; текущее значение — литерал |
| `legacy_purlin_utilization_output` | `вывод!F35` | 85 | отображаемая константа, не вычисленный `P28:V28` result |

## DERIVED VALUE

| Name | Excel cell | Type/unit | Source |
|---|---|---|---|
| `auto_frame_step_m` | `вывод!D8` / `подбор!AA14` | number, м | основной подбор |
| `effective_frame_step_m` | `вывод!F8` и выбор `D9` | number, м | auto либо manual override |
| `roof_self_weight_kg_m2` | `Подбор прогонов 2!B7` | number, кг/м² | lookup по `D20` |
| `purlin_load_kg_m2` | `B12` | number, кг/м² | снег/ветер/покрытие |
| `purlin_load_kn_m2` | `B13` | number, кН/м² | `B12/100` по legacy-конверсии |
| `max_purlin_step_mm` | `вывод!D23` | number, мм | lookup по настилу |
| `roof_insulation_mm` | `Подбор прогонов 2!B18` | number, мм | выводится из специальных названий `D20` |
| `kazakhstan_city_flag` | `Лист1!J19` | `да` / `нет` | exact lookup ID 3 через `J18/K18` |

## LEGACY CONTROL

| Name | Excel cell/name | Status |
|---|---|---|
| `purlin_norms_validation` | local name `нормы` → external ID 2 | список Data Validation; активное `B11` уже literal |
| `purlin_insulation_validation` | name `утеплитель` → external ID 1 | список 150/200/250; активный `B18` derived |
| `window_en_switch` | `Лист1!J20` | legacy-only, blank без producer | не является API input; учитывается только при проверке старого Excel-поведения |

## UNKNOWN

- Точное пользовательское назначение `Подбор прогонов 2!R28` не доказано; поле без заголовка и не выходит на `вывод`.
- Допустимые диапазоны числовых входов в книге не заданы формальной валидацией; приложение должно сначала повторять допустимость Excel, а новые инженерные ограничения вводить отдельным решением.
- Отдельного пользовательского входа материала стены нет.
