# Core 1 v1 — спецификация модулей

Все модули чистые: одинаковые inputs + dataset version дают одинаковый typed result. Ни один модуль не открывает Excel, не читает произвольные файлы и не скрывает Excel errors.

## InputValidation

- Inputs: raw поля из `CORE1_INPUT_CONTRACT.md`.
- Outputs: normalized scenario, exact enum values, typed validation diagnostics.
- Static datasets: supported-domain manifest, roof/deck enums, expert-setting enums.
- Excel source: `вывод` input cells, validation lists, `Подбор прогонов 2` validation metadata.
- Known anomalies: общие числовые min/max не доказаны; строка `"0"`, число `0` и blank различаются.

## ClimateResolver

- Inputs: `city`, `responsibility_factor`, consumer context; для окна — `terrain_type` и normative request.
- Outputs: frame climate codes/loads with provenance; window membership flag or typed unsupported error.
- Static datasets: `main_city_climate`, `roof_load_mapping`; позднее — точный `window_city_legacy`.
- Excel source: `Города п.К`, `снегветер`, `Лист1!J18:K18,J19`.
- Known anomalies: ID 3 version conflict; exact/first-match обязателен; current `Роза` window lookup gives `#N/A → нет`.

## FrameSelector

- Inputs: span, length, height, responsibility, climate result, auto/manual frame step, roof load context, selection mode.
- Outputs: beam/column profile and steel, utilizations, auto/effective frame step, selected frame branch, engineering loads needed downstream.
- Static datasets: `frame_selection_9m`…`frame_selection_24m`, `frame_selection_rules`, `main_city_climate`.
- Excel source: `подбор`, sheets `9м`…`24м`, output `вывод!D8:F9,D33:F34`.
- Known anomalies: span 24 active `#N/A`; unknown general bounds for length/height/manual step; preserve row order and tie-breaking.

## PurlinCalculator

- Inputs: span/length, effective frame step, roof type, roof covering/deck, climate/load values, responsibility, max/min step overrides, snow-retention/enclosure flags, candidate limits.
- Outputs: profile, assignment, raw auxiliary `R28`, step mm, kg/m², steel, total kg, candidate trace.
- Static datasets: roof/deck properties, purlin profile lookup, calculation axis/blocks, validation metadata.
- Excel source: `Подбор прогонов 2`, `Расчеты 2`, `Расчеты МП390 2`, local equivalents on `Расчеты`.
- Known anomalies: step 500 conditional `#REF!`; normal candidate `#N/A`; external IDs 1/2 redundant; `R28` meaning unknown; `F35=85` is separate display constant.

## SecondarySteelCalculator

- Inputs: normalized geometry, `ClimateResult`, `FrameResult`, `PurlinResult`,
  effective frame step and horizontal-bracing override. The calculator does not
  re-run climate, frame or purlin selection.
- Outputs: ties, suspensions, spacers, horizontal/vertical bracing, gable posts, portal bracing, secondary beams/columns, plates, bolts, M16 quantity, fittings weight.
- Static datasets: `secondary_steel_rules`, `bolts_plates_fittings`.
- Excel source: `подбор!U14:AI15`, `вывод!D36:E57`.
- Known anomalies: часть результатов — literal legacy rules; нельзя «оптимизировать» фиксированные профили/стали. `D29="+"` is a scenario branch;
  exported secondary formulas contain no proven `*0` term.

## WindowGirtCalculator

- Inputs: window geometry/type/construction, building geometry, terrain, responsibility, climate/window membership, normative request.
- Outputs: lower/upper window girts, checks, mass criterion or typed unsupported/error.
- Static datasets: `window_profile_candidates`, `window_result_layout`; для полного parity нужны `window_city_legacy`, `window_wind_legacy` и ID 5 inputs.
- Excel source: `Лист1`, `Расчет`, `Ветер СП`, `Ветер по СП РК EN`.
- Known anomalies: `J20` unreachable EN switch; IDs 3/4/5 incomplete; sentinel `999999999`; v2.0 запрещён как fallback.
- V1 boundary: вычисление профиля разрешено только для будущих approved fixtures; при ненулевых окнах сейчас возвращается `WINDOW_LEGACY_SOURCE_UNAVAILABLE`.

## OpeningMassCalculator

- Inputs: gate/door counts, window inputs, supported `WindowGirtCalculator` result, building plan area.
- Outputs: `openings_weight_kg_per_m2`, `openings_weight_t`, exact derived `openings_weight_kg`.
- Static datasets: local opening rules and supported window result layout.
- Excel source: `вывод!D60:D68`, `Лист1!O28:O29`.
- Known anomalies: ненулевые окна наследуют window unsupported/error; не заменять ошибку нулевой массой; доказанный сохранённый fixture имеет нулевые openings.

## StructuralSummary

- Inputs: FrameSelector, PurlinCalculator, SecondarySteelCalculator and OpeningMassCalculator results plus diagnostics.
- Outputs: полный `CORE1_OUTPUT_CONTRACT`, Core 1 → Core 2 payload, `kg_per_m2`, compatibility diagnostics and provenance.
- Static datasets: none beyond output schema/unit registry.
- Excel source: `вывод!D33:F69`, особенно `D69=IF(D9=0,E8,E9)+D68`.
- Known anomalies: `D69` строго кг/м²; отсутствует доказанный `structural_weight_kg`; активная ошибка любого включённого компонента блокирует соответствующий итог.

## Зависимости модулей

```text
InputValidation
  ├─ ClimateResolver ── FrameSelector ──┬─ PurlinCalculator
  │                                     └─ SecondarySteelCalculator
  └─ ClimateResolver ── WindowGirtCalculator ── OpeningMassCalculator

FrameSelector + PurlinCalculator + SecondarySteelCalculator
  + OpeningMassCalculator → StructuralSummary → Core 2 contract
```

`WindowGirtCalculator` не должен блокировать сценарий без окон. При ненулевых окнах его unsupported/error обязан блокировать оконный вклад и итог, зависящий от него.
