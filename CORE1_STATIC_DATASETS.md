# Core 1 v1 — статические наборы данных

Все таблицы экспортируются механически, без ручной правки значений. Для каждого артефакта сохраняются source workbook checksum, source address, raw type, row order и dataset checksum. `Estimated row count` — оценка границы экспорта по доказанным диапазонам; `unknown` означает, что source documents не фиксируют точный used range и его должен определить экспортный манифест, а не разработчик вручную.

| Dataset | Source sheet/range | Primary key | Fields | Units | Estimated row count | Confidence | External dependency |
|---|---|---|---|---|---:|---|---|
| `frame_selection_9m` | `9м`, полный используемый табличный блок | комбинация height/load/step по исходному порядку | profiles, utilization, mass, bolts, secondary outputs | mixed; зафиксировать по колонкам | unknown | high | none |
| `frame_selection_12m` | `12м`, полный используемый табличный блок | то же | то же | mixed | unknown | high | none |
| `frame_selection_15m` | `15м`, полный используемый табличный блок | то же | то же | mixed | unknown | high | none |
| `frame_selection_18m` | `18м`, полный используемый табличный блок | то же | то же | mixed | unknown | high | none |
| `frame_selection_21m` | `21м`, полный используемый табличный блок | то же | то же | mixed | unknown | high | none |
| `frame_selection_24m` | `24м`, полный используемый табличный блок | то же | values + Excel errors | mixed | unknown | low/legacy anomaly | none; содержит активные `#N/A` |
| `frame_selection_rules` | `подбор!U14:AI15`, `AJ9:BE14` и literal/formula rules, используемые `вывод!D33:F57` | branch/order | selected profiles, step, utilization, bolts, fittings | mixed | 2 result rows + lookup block | high | local climate tables |
| `main_city_climate` | `Города п.К` и используемые lookup-блоки `снегветер` | raw city string + first row order | city, snow/wind zones, loads, internal codes, errors | codes, kPa/kN/m² as labelled in source | unknown | high for local source; supported keys determined after export | none |
| `roof_load_mapping` | `снегветер!AM:AN`, consumed by `подбор!W5` | exact roof-covering key | load/coefficient raw value | source-labelled | unknown | high | none |
| `roof_properties` | `Подбор прогонов 2!N44:P63` | exact covering name | covering, auxiliary field, self weight | kg/m² | 20 | high | none |
| `deck_step_limits` | `вывод!O6:O9` plus lookup matrix `AP:AZ` consumed by `X11:X63/D23` | exact deck grade + governing lookup dimension | deck, allowed/max purlin step | mm | 4 deck keys; about 53 consumer rows | high | none |
| `purlin_profile_lookup` | `Расчеты!SK5:SM54` | exact profile string | profile, mass/property value | source-labelled | 50 | high; 1:1 external equality proved | external ID 1 redundant |
| `purlin_calculation_axis` | `Расчеты!SO3:BYK3` | original column order | calculation breakpoints/constants | source-labelled | 1 503 values | high | external ID 1 redundant |
| `purlin_calculation_block_1` | `Расчеты!SO58:ALU58`, `SM60:SM109` | original index/profile order | constants/results used by candidate matrix | source-labelled | 26 + 50 | high | external ID 1 redundant |
| `purlin_calculation_block_2` | `Расчеты!SO113:ALU113`, `SM115:SM164` | original index/profile order | constants/results used by candidate matrix | source-labelled | 26 + 50 | high | external ID 1 redundant |
| `purlin_validation_metadata` | names `нормы`, `утеплитель`; local list `L45:L47` | raw option string/value | `старым/новым`, 150/200/250, `по умолчанию/90/95` | enum, mm, % | 2 + 3 + 3 | medium/high | IDs 1/2 only as legacy validation cache; runtime not needed |
| `secondary_steel_rules` | output rules feeding `вывод!D36:E49` | component name + branch | profile, steel, condition, order | profile/grade | about 14 output rows | high for literal/formula contract | none |
| `bolts_plates_fittings` | `подбор!X14:AF15` and `вывод!D48:E57` | selected frame branch + component | plate thickness/steel, bolt patterns, M16 count, fittings mass | mm, grade, pcs, kg | 2 branch rows + 10 output rows | high | none |
| `window_profile_candidates` | `Расчет!P4:V413`, `X4:Y413` | original row/profile order | section properties, checks, mass criterion | source-labelled | 410 | high for profiles/selection structure | local load inputs still need domain proof |
| `window_result_layout` | `Расчет!B21:B23,B26:B28`; `Лист1!B24:D33,B37:D46` | window type/position | lower/upper girt result fields | profile/check/result | 6 selected cells + 20 presentation rows | medium | local wind/controller domain incomplete |
| `window_local_wind_sp20` | `Ветер СП` lookup/coefficient blocks, `G25:G26` | local scenario inputs | SP_20 wind components | source-labelled | local sheet | medium/high structure | historical ID4 token is redundant |
| `window_local_wind_sp_rk_en` | `Ветер по СП РК EN!B2:B12,D28:D29,Z:AC` | local EN scenario inputs | SP_RK_EN wind components | source-labelled | local sheet | medium structure | historical ID4/5 tokens redundant; selected by explicit normative_system |

## Приоритет экспорта

1. `roof_properties`, `deck_step_limits` и purlin datasets — ограниченные диапазоны и доказанная локальная эквивалентность.
2. frame tables 9–21 м и `frame_selection_rules`.
3. `main_city_climate` и `roof_load_mapping` с манифестом поддержанных city keys.
4. secondary steel, bolts, plates and fittings.
5. window profile candidates как локальная структура, но без объявления расчётного parity.
6. таблицу 24 м экспортировать вместе с ошибками только для compatibility tests.

Исторические внешние ID3/4/5 не экспортируются как runtime datasets: основная
книга с её локальными листами является canonical source. Конфликтующие файлы
не используются.
