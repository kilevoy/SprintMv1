# Core 1 — SecondarySteelCalculator mapping

| Result | Legacy source | Dataset / dependency | Units | In module |
|---|---|---|---|---|
| `ties` | `вывод!D36:E36` | `secondary_steel_rules!D36:E36`; span and snow-region branch | profile + grade | yes |
| `suspensions` | `вывод!D37:E37` | `secondary_steel_rules!D37:E37`; same branch as ties | profile + grade | yes |
| `spacers` | `вывод!D38:E38` | `secondary_steel_rules!D38:E38`; `D29`, frame step | profile + grade | yes |
| `horizontal_bracing[0]` | `вывод!D39:E39` | `secondary_steel_rules!D39:E39`; `D29`, span, frame step | profile + grade | yes |
| `vertical_bracing[0]` | `вывод!D40:E40` | `secondary_steel_rules!D40:E40`; `D29`, span, frame step | profile + grade | yes |
| `gable_posts` | `вывод!D41:E41` | `secondary_steel_rules!D41:E41`; span, height, selected frame branch | profile + grade | yes |
| `portal_bracing` | `вывод!D42:E42` | literal `secondary_steel_rules!D42:E42` | profile + grade | yes |
| `horizontal_bracing[1]` | `вывод!D43:E43` | literal `secondary_steel_rules!D43:E43` | profile + grade | yes |
| `vertical_bracing[1]` | `вывод!D44:E44` | literal `secondary_steel_rules!D44:E44` | profile + grade | yes |
| `secondary_beams` | `вывод!D45:E46` | literal `secondary_steel_rules!D45:E46` | profile + grade | yes |
| `secondary_columns` | `вывод!D47:E47` | literal `secondary_steel_rules!D47:E47` | profile + grade | yes |
| `plates` | `вывод!D48:E49` | `bolts_plates_fittings!D48:E49` | thickness + grade | yes |
| `bolts` | `вывод!D52:D55` | `bolts_plates_fittings!D52:D55`; frame branch formulas preserved by source order | pattern; quantity unit `pcs` | yes |
| `M16_quantity` | `вывод!D56` | `bolts_plates_fittings!D56` | pcs | yes |
| `fittings_weight_kg` | `вывод!D57` | `bolts_plates_fittings!D57` | kg | yes |

The module does not include `вывод!D35:E35` (purlins), `D33:E34`
(primary beam/column), window girts, opening mass, prices or Core 2
procurement data. `D29="+"` is retained as a scenario branch and is not
coerced into a generic boolean.

No `*0`, `IF(...,0,...)` or manual zero coefficient occurs in the exported
secondary formulas. The result trace therefore keeps an empty
`zero_controlled_terms` list rather than deleting or inventing zero logic.
