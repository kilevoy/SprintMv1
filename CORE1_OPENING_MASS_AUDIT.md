# Core 1 — OpeningMassCalculator audit

Статус: `IMPLEMENTED` для доказанной локальной формульной цепочки; `PARITY_PROVEN=false` для ненулевых проёмов (в репозитории нет ненулевого golden oracle).

## Source of truth and units

Источник — локальные листы основной книги `Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx`.

| Input / output | Excel cell | Meaning | Unit |
|---|---|---|---|
| gate count ≤6 m | `вывод!D60` | number of small gates | pcs |
| gate count >6 m | `вывод!D61` | number of large gates | pcs |
| door count | `вывод!D62` | number of doors | pcs |
| separate window height | `вывод!D64` | height used by window branch | m |
| strip-window length | `вывод!D65` → `Лист7!N27` | length of ribbon window | m |
| separate-window count | `вывод!D66` | number of separate windows | pcs |
| glazing construction | `вывод!D67` | informational glazing selector | text |
| additional openings specific mass | `вывод!D68` ← `Лист1!O28` | total additional opening mass divided by span and building length | **kg/m²** |
| additional openings absolute mass | `вывод!E68` ← `Лист1!O29` | total additional opening mass | **t** |

`вывод!D69 = IF(D9=0,E8,E9)+D68` is total specific structural mass in **kg/m²**. It is not the tonne output and is not an absolute mass.

## Proven formulas

The local formula chain is:

```text
Лист1!O23 = 350 × D60 × 1.05
Лист1!O24 = 450 × D61 × 1.05
Лист1!O25 = (frame_step + 4) × D62 × 7.2 × 1.05
Лист1!O26 = (lower_mass × frame_step
             + upper_mass × window_height × 2
             + upper_mass × frame_step) × D66
Лист7!O27 = (D65 × window_height × (lower_mass + upper_mass)
             + strip_frame_bays × window_height × lower_mass) × 1.05
Лист1!O28 = (O23 + O24 + O25 + O26 + O27) / span / building_length
Лист1!O29 = (O23 + O24 + O25 + O26 + O27) / 1000
```

`strip_frame_bays` is the proven local equivalent of `Расчёт!AK15-1`; for the supported geometry it is `ceil(building_length / frame_step)`. `D65` therefore affects the ribbon-window component length/mass in `O27`; it does not alter the selected profile, utilization, or the separate-window count in `O26`. `D66` applies only to the separate-window branch `O26`.

`WindowGirtResult.window_girts_weight_kg` supplies `O26` exactly once. OpeningMassCalculator does not recalculate wind, glazing, profile selection, or utilization. The `O27` strip term is calculated separately from the selected profile unit masses.

Для ворот `O23`/`O24` в исходной книге нет отдельного выбора профиля или длины элемента: `Q23=350` и `Q24=450` — уже полная масса одной конструкции соответствующей ветки (kg/pcs), количество берётся из `D60`/`D61`, коэффициент изготовления — `1.05`. Для двери `O25` длина/размерная часть явно равна `(frame_step+4)`, удельная масса — `7.2 kg/m²`, количество — `D62`, тот же `1.05`; коммерческая цена не участвует.

## Branches and zero semantics

- `windows.enabled=false` produces zero window contribution and accepts `windowGirts=null`; gate and door branches remain active.
- `windows.enabled=true` requires a prior `WindowGirtResult`; missing result is `INVALID_INPUT` rather than a silent zero.
- `separate_window_count=0` makes `O26=0` even when the window branch is enabled.
- `window_strip_length_m=0` makes `O27=0`; no ribbon-window mass is invented.
- Gate and door counts are independent non-negative quantities; each branch is multiplied by its own count.
- Glazing (`D67`) is retained as an input/trace field and is not added as a commercial price or a second structural mass term.

## Double-count boundary

| Component | Included here | Source / boundary |
|---|---:|---|
| main frame | no | `FrameResult.frame_mass_kg` |
| roof purlins | no | `PurlinResult.purlin_weight_kg` |
| secondary steel, plates, bolts, fittings | no | `SecondarySteelResult`; passed only for audit context |
| separate-window girts | yes | `WindowGirtResult.window_girts_weight_kg` (`O26`) |
| ribbon-window girts/auxiliary strip term | yes | local `Лист7!O27` equivalent (`D65`) |
| gate framing ≤6 m | yes | `Лист1!O23`, 350 kg/pc ×1.05 |
| gate framing >6 m | yes | `Лист1!O24`, 450 kg/pc ×1.05 |
| door framing | yes | `Лист1!O25`, `(step+4)×7.2` kg/m² ×1.05 |
| glazing purchase/commercial value | no | `D67` informational only |
| Core 2 purchase data | no | outside Core 1 |

## Implementation and parity

`src/core1/opening/OpeningMassCalculator.ts` is a pure deterministic function. It returns kg components, total kg, kg/m² (`D68` equivalent), tonnes (`E68` equivalent), and provenance trace. No pricing fields and no `structural_weight_kg` alias are introduced.

The saved 12 m baseline and `zero_openings_windows` fixture prove the all-zero case (`D68=0`, `E68=0`). No repository fixture contains nonzero gate, door, or window golden cached outputs; therefore nonzero branches are implemented from formulas but remain `PARITY_PROVEN=false` until owner-approved golden scenarios are captured.
