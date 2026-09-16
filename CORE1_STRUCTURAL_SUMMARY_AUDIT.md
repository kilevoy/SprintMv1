# Core 1 — StructuralSummary audit

Статус: `CORE1_ENGINE_IMPLEMENTED=true`. Модуль агрегирует upstream-результаты и не выполняет повторный инженерный подбор.

## Exact legacy formula

В основной книге:

```text
вывод!D69 = IF(вывод!D9=0, вывод!E8, вывод!E9) + вывод!D68
вывод!E8  = подбор!Z14 + 'Подбор прогонов'!T28
вывод!E9  = подбор!Z15 + 'Подбор прогонов 2'!T28
вывод!D68 = Лист1!O28
```

For the saved 12 m baseline `D9` is blank/zero, therefore the `E8` branch is active. No intermediate rounding is present in this chain; the implementation preserves full floating-point values and only exposes the final result.

## Component dependency map

| Component | Legacy source | Value / unit | Included in D69 | Contribution |
|---|---|---:|---:|---|
| primary frame mass | `Расчёт!G3:G14` → frame dataset total mass | kg per frame | yes | `frame_mass × frame_count / (span×length)` |
| tie members | `Расчёт!E2:E6`, `S2:S14` | kg per tie bay × bays | yes | `tie_unit × (frame_count−2) / area` |
| tube component | `Расчёт!H2:H14` → frame dataset `W` | kg/m² | yes | added directly |
| roof purlins | `Подбор прогонов*!T28` | kg/m² | yes | `purlin_kg_per_m2` only |
| windows/gates/doors | `вывод!D68` → `Лист1!O28` | kg/m² | yes | `OpeningMassResult.opening_mass_kg_per_m2` once |
| secondary steel listing | `вывод!D36:D49` | profiles/text | no separate term in D69 | already represented only where legacy `E8/E9` includes it; no re-sum |
| plates, bolts, M16, fittings | `вывод!D48:D57` | profiles, pcs, kg | no separate term | not added by summary |
| `E68` | `Лист1!O29` | tonnes | no | informational absolute opening mass; never added to kg/m² |

For the baseline: area = `12×18 = 216 m²`, frame count = `ceil(18/6)+1 = 4`, tie bays = `2`, tie mass = `148×2 = 296 kg`, frame mass = `577 kg/frame`, tube component = `10.665118055555556 kg/m²`, purlin = `7.539000000000001 kg/m²`, openings = `0`. The resulting `D69` is `30.25967361111111 kg/m²` (floating-point equivalent of the cached Excel value).

## D68 / E68 boundary

`OpeningMassCalculator` owns `O23:O27`, `D68` and `E68` equivalents. StructuralSummary receives the resulting specific mass and adds only that kg/m² value. It does not add `opening_mass_t`, `opening_mass_kg`, or `window_girts_weight_kg` separately. This prevents mixing tonnes with kg/m² and prevents duplicate window-girt mass.

## Zero and conditional logic

- `IF(D9=0,E8,E9)` is retained as branch provenance; blank/zero manual step selects the automatic branch.
- Opening zero terms remain active zero values: `D60=D61=D62=D64=D65=D66=0` gives `D68=0` and `E68=0`.
- `*0`/`IF(...,0,...)` terms are not silently deleted. Summary does not invent a `structural_weight_kg` or total tonnes field.
- 24 m and purlin step 500 errors terminate upstream; StructuralSummary is not invoked.

## Double-count audit

| Boundary | Summary action |
|---|---|
| FrameSelector | consumes selected frame mass/intermediates; no re-selection |
| PurlinCalculator | consumes `purlin_kg_per_m2`; ignores `purlin_weight_kg` for D69 |
| SecondarySteelCalculator | consumes no component mass again; its profile/bolt payload remains available in result |
| WindowGirtCalculator | consumed indirectly through OpeningMassResult only |
| OpeningMassCalculator | consumed once as D68-equivalent kg/m² |
| E68 tonnes | excluded from D69 arithmetic |
| pricing/Core 2 | excluded |

## Parity matrix

| Scenario | Implemented | Parity proven |
|---|---:|---:|
| 12 m zero openings | yes | yes, 32/32 expected fields |
| 9 / 15 / 18 / 21 m | yes, deterministic | no, expected fixtures UNKNOWN |
| windows=true non-zero | yes | no, no non-zero golden oracle |
| KZ `SP_20` / `SP_RK_EN` | yes, explicit routing | no, no KZ golden oracle |
| 24 m | legacy `#N/A` | n/a |
| purlin step 500 mm | legacy `#REF!` | n/a |
