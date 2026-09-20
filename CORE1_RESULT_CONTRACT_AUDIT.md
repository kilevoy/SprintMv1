# Core1 public result contract audit

## Scope and conclusion

This is a read-only audit of the frozen Core1 calculation path. No formulas,
selection algorithms, UI, EnclosureCore, Core2 or commercial logic were
changed. The current public type is `src/core1/types/result.ts`; the assembly
path is `src/core1/engine/calculateCore1.ts`.

`Core1Result` is not yet a complete engineering-result contract. It already
exposes the selected profiles for the primary frame, purlins and most
secondary steel, but it does not expose the complete frame grid, the primary
frame mass, complete bolt quantities, or a structured provenance/diagnostic
separation. The existing result is therefore `PARTIAL`, not a reason to change
the frozen calculation logic.

## 1. Current public result inventory

| Field / group | Type | Source | Meaning | Public | Provenance | Status |
|---|---|---|---|---|---|---|
| `scenario` | `Core1Input` | normalized engine input | user/project inputs | yes | input contract | `PUBLIC / INPUT_ECHO` |
| `climate` | `Core1ClimateResult` | ClimateResolver | canonical climate tuple | yes | climate resolver | `PUBLIC / PROVEN_DOMAIN` |
| `frame_step_m` | number | `FrameResult.frame_step_m` | effective step | yes | `вывод!F8` equivalent | `PUBLIC / DERIVED_RESULT` |
| `beam_profile`, `beam_steel`, `beam_utilization` | scalar | `FrameSelector` | selected beam | yes | `вывод!D33:F33` | `PUBLIC / PROVEN_DOMAIN` |
| `column_profile`, `column_steel`, `column_utilization` | scalar | `FrameSelector` | selected column | yes | `вывод!D34:F34` | `PUBLIC / PROVEN_DOMAIN` |
| `purlin_*` | scalars | `PurlinCalculator` | selected purlin, step and masses | yes | `D35:E35`, `P28:V28` | `PUBLIC / PROVEN_DOMAIN` |
| `ties`, `suspensions`, `spacers` | `Core1Component` | `SecondarySteelCalculator` | selected secondary sections | yes | `вывод!D36:E38` | `PUBLIC / PROVEN_DOMAIN` |
| horizontal/vertical bracing | component arrays | `SecondarySteelCalculator` | selected bracing sections | yes | `D39:E40`, `D43:E44` | `PUBLIC / PROVEN_DOMAIN` |
| `gable_posts`, `portal_bracing` | components | `SecondarySteelCalculator` | gable/portal members | yes | `D41:E42` | `PUBLIC / PROVEN_DOMAIN` |
| `secondary_beams`, `secondary_columns` | component/list | `SecondarySteelCalculator` | secondary beam/column outputs | yes | `D45:E47` | `PUBLIC / PARTIAL_DOMAIN` |
| `plates` | component array | `SecondarySteelCalculator` | plate specification + steel | yes | `D48:E49` | `PUBLIC / PROVEN_OUTPUT` |
| `bolts` | `Core1Bolt[]` | `SecondarySteelCalculator` | bolt patterns | yes | `D52:D55` | `PUBLIC / PARTIAL` |
| `M16_quantity` | integer | secondary rules/cache | M16 count | yes | `D56` | `PUBLIC / PROVEN_BASELINE` |
| `fittings_weight_kg` | number | connection resolver/cache | fitting aggregate mass | yes | `D57` | `PUBLIC / PROVEN_AS_LEGACY_AGGREGATE` |
| `window_girts` | array of records | `WindowGirtCalculator` | selected window-girt presentation | yes | local window result mapping | `PUBLIC / PARTIAL_PARITY` |
| `openings` and opening mass fields | object/scalars | `OpeningMassCalculator` | gate/door/window mass components | yes | `D60:D68`, `O23:O29` | `PUBLIC / FORMULA_PROVEN; NONZERO PARITY PARTIAL` |
| `kg_per_m2` | number | `StructuralSummary` | D69-equivalent specific mass | yes | `вывод!D69` | `PUBLIC / LEGACY_CHECKPOINT` |
| `engineering_loads` | `Record` or null | none in final assembly | engineering load payload | null | no populated producer | `PUBLIC SHAPE / NOT_EXPOSED_RESULT` |
| `compatibility_diagnostics` | diagnostics[] | engine/domain | compatibility and error diagnostics | yes | diagnostic factory | `PUBLIC / PROVEN` |

Internal-only context exists in `Core1EngineResult.context`: legacy climate,
legacy frame branch, legacy D8 resolver result, connection resolution,
`FrameResult`, `PurlinResultValue`, secondary steel, windows and openings.
These are not part of the public `Core1Result` object.

## 2. Authoritative engineering output inventory

| Legacy output | Core1 calculates? | Public result has it? | Source proven? | Action needed |
|---|---|---|---|---|
| Балки: profile/steel/utilization | `YES` | `YES` | `YES` | expose through structured `selectedSections.beams`, preserve flat aliases |
| Колонны: profile/steel/utilization | `YES` | `YES` | `YES` | same |
| Прогоны: profile/steel/utilization | `YES/PARTIAL` | `YES/PARTIAL` | profile/steel/step/mass proven; utilization not public | add only proven utilization when source field is closed |
| Затяжки | `YES` | `YES` | `D36:E36` | preserve component object; quantity/mass not calculated |
| Подвески | `YES` | `YES` | `D37:E37` | preserve component object; quantity/mass not calculated |
| Распорки | `YES` | `YES` | `D38:E38` | preserve component object; quantity/mass not calculated |
| Связи горизонтальные | `YES` | `YES` | `D39:E39,D43:E43` | preserve array |
| Связи вертикальные | `YES` | `YES` | `D40:E40,D44:E44` | preserve array |
| Стойки фахверка | `YES` | `YES` | `D41:E41` | preserve as `facadePosts`; physical quantity not calculated |
| Пластина карниз/конёк | `YES` | `YES` | `D48:E48` | preserve specification; no quantity |
| Пластина опора | `YES` | `YES` | `D49:E49` | preserve specification; no quantity |
| Main frame mass | `YES` internally | `NO` | `FrameResult.frame_mass_kg` | expose as a separately named mass, not only through D69 |
| Frame count / bay count | `YES` in downstream formulas | `NO` | `ceil(length/effectiveStep)+1` where used | add to frame-grid result after contract approval |

### Connections

| Legacy output | Core1 calculates? | Public result has it? | Source / current representation |
|---|---|---|---|
| Балки конёк bolts | `YES` | `PARTIAL` | `D52`; pattern public, resolver quantity exists internally but engine mapping drops it |
| Балки карниз bolts | `YES` | `PARTIAL` | `D53`; pattern public, quantity not proven/public |
| Колонны опора bolts | `YES` | `PARTIAL` | `D54`; pattern public, quantity not proven/public |
| Колонны карниз bolts | `YES` | `PARTIAL` | `D55`; pattern public, quantity not proven/public |
| Затяжка M16 | `YES` | `YES` for count | `D56`; `M16_quantity` in pcs. Any force/capacity meaning is not inferred. |
| Вес фасонок | `YES` | `YES` | `D57`; `fittings_weight_kg`. This is a legacy aggregate, not plate specification. |

`Core1Bolt` currently contains `name`, `pattern` and `source_cell` only. The
internal `SecondarySteelBolt` has optional quantity, but
`calculateCore1.ts` deliberately maps it away. This is the concrete reason
connection exposure is `PARTIAL`.

## 3. Frame grid and geometry

| Value | Current state | Classification |
|---|---|---|
| `span` | `scenario.span_m` | input echo |
| `length` | `scenario.building_length_m` | input echo |
| `height` | `scenario.building_height_m` | input echo |
| automatic D8 | internal `context.legacyFrameStep.automaticFrameStepM` | calculated, not public |
| manual D9 | `scenario.frame_step_override_m` | input/override echo |
| effective step | `frame_step_m` | derived result, public |
| bay count | used by connection/summary calculations | not public |
| frame count | used by connection/summary calculations | not public |
| roof slope/geometry | no populated final Core1 field | not exposed; do not invent |
| design span family | internal resolver trace | not public |
| selected structural family | internal frame trace/branch | not public |

The contract must not duplicate `ProjectInput`: geometry inputs remain in
`scenario`; `frameGrid` should contain only derived values and provenance.

## 4. Openings classification

| Legacy item | Classification | Current exposure |
|---|---|---|
| Ворота до 6 м | `PROJECT_INPUT` + `DERIVED_VALUE` | count in `scenario`; mass in `openings.gate_le_6m_mass_kg` |
| Ворота свыше 6 м | `PROJECT_INPUT` + `DERIVED_VALUE` | count in `scenario`; mass in `openings.gate_gt_6m_mass_kg` |
| Двери | `PROJECT_INPUT` + `DERIVED_VALUE` | count in `scenario`; mass in `openings.door_mass_kg` |
| Высота окон | `PROJECT_INPUT` | `scenario.windows.window_height_m` when normalized |
| Длина ленты | `PROJECT_INPUT` | `scenario.windows.window_strip_length_m` when normalized |
| Количество отдельных окон | `PROJECT_INPUT` | `scenario.windows.separate_window_count` when normalized |
| Конструкция окна | `PROJECT_INPUT` | `scenario.windows.glazing_construction` when normalized |
| МЕ окон/ворот/дверей | `DERIVED_VALUE` | `openings_weight_kg_per_m2`, `openings_weight_t`, `openings_weight_kg` |
| D68 | `LEGACY_COMPATIBILITY_VALUE` | public equivalent `openings_weight_kg_per_m2` |

Opening masses are Core1 engineering-derived compatibility values, but they
must not be confused with the raw user inputs. Non-zero golden parity is still
limited by the documented source evidence.

## 5. Legacy totals

| Value | Classification | Current field |
|---|---|---|
| D8 | `LEGACY_COMPATIBILITY_VALUE / DERIVED_INPUT` | not public; internal D8 trace only |
| D68 | `LEGACY_COMPATIBILITY_VALUE / DERIVED_RESULT` | `openings_weight_kg_per_m2` |
| D69 | `LEGACY_COMPATIBILITY_VALUE / REGRESSION_CHECKPOINT` | `kg_per_m2` |

`kg_per_m2` is a specific mass in `kg/m²`, not absolute structural mass and
not tonnes. It remains public for parity and diagnostics, but it is not a
substitute for a componentized engineering result.

## 6. Separate component masses

| Component mass | Separate in Core1? | Source / current field |
|---|---|---|
| main frame mass | `YES internal / NO public` | `FrameResult.frame_mass_kg` |
| purlin mass per area | `YES / YES` | `purlin_kg_per_m2` |
| total purlin mass | `YES / YES` | `purlin_weight_kg` |
| ties | `NO` | profile only in `ties` |
| suspensions | `NO` | profile only in `suspensions` |
| spacers | `NO` | profile only in `spacers` |
| horizontal/vertical bracing | `NO` | profiles only in arrays |
| facade posts | `NO` | profile only in `gable_posts` |
| plates | `NO` | specification only in `plates` |
| bolts | `NO` | pattern only; no total quantity model |
| M16 | `NO mass / YES count` | `M16_quantity` |
| fittings | `YES` | `fittings_weight_kg` |
| window girts | `YES` when selected | `window_girts_weight_kg` |
| gates/doors/windows | `YES` | opening component masses |
| aggregate specific result | `YES` | `kg_per_m2` / D69 checkpoint |

No absolute `structural_weight_kg` field is justified by the current source
contract.

## 7. Public contract proposal (not implemented)

The safe additive target is:

```text
Core1Result
├── scenario                         # existing input echo
├── climate                          # existing canonical climate
├── geometry                         # derived geometry only, if proven
├── frameGrid                        # auto/manual/effective step, bays, frames
├── selectedSections                 # structured aliases over existing fields
│   ├── beams
│   ├── columns
│   ├── roofPurlins
│   ├── ties / suspensions / spacers
│   ├── horizontalBracing / verticalBracing
│   ├── facadePosts
│   ├── eaveRidgePlate / basePlate
│   └── windowGirts
├── connections                      # patterns plus quantities only when proven
├── componentMasses                  # only separately calculated masses
├── openingCompatibility             # input echo separated from derived masses
├── diagnostics                      # structured public diagnostics
├── provenance                       # source/module provenance
└── legacyCompatibility              # D8, D68, D69 and typed legacy values
```

The proposal must be additive and keep the current flat fields during
migration. It must not expose Excel addresses, `INDEX/MATCH` internals, or
resolver state to EnclosureCore. Unknown values must remain `null`/typed
diagnostic; no guessed quantities or masses may be added.

## 8. StructuralContext for EnclosureCore

Proposed small downstream contract:

```text
StructuralContext {
  span_m: number
  building_length_m: number
  building_height_m: number
  effective_frame_step_m: number
  bay_count: number
  frame_count: number
  roof_geometry: proven-or-null
  selected_primary_sections: proven-or-null
}
```

Only fields actually required by enclosure quantity formulas should be passed.
Excel cell addresses, D8/D68/D69, resolver traces and lookup mechanics must
remain outside `StructuralContext`.

The shape is ready as a design proposal, but `roof_geometry` and complete
frame-grid values still require an implementation contract decision.

## 9. Gap matrix

| Legacy output | Core1 calculates? | Public result has it? | Source proven? | Action |
|---|---|---|---|---|
| Балки | yes | yes | yes | structured alias |
| Колонны | yes | yes | yes | structured alias |
| Прогоны | yes | partial | partial utilization | close utilization only if sourced |
| Затяжки | yes | yes | yes | no mass/quantity yet |
| Подвески | yes | yes | yes | no mass/quantity yet |
| Распорки | yes | yes | yes | no mass/quantity yet |
| Связи горизонтальные | yes | yes | yes | preserve arrays |
| Связи вертикальные | yes | yes | yes | preserve arrays |
| Стойки фахверка | yes | yes | yes | no quantity yet |
| Пластина карниз/конёк | yes | yes | yes | specification only |
| Пластина опора | yes | yes | yes | specification only |
| Балки конёк bolts | yes | partial | pattern yes, quantity partial | preserve quantity only when proven |
| Балки карниз bolts | yes | partial | pattern yes | close quantity |
| Колонны опора bolts | yes | partial | pattern yes | close quantity |
| Колонны карниз bolts | yes | partial | pattern yes | close quantity |
| Затяжка M16 | yes | yes count | count proven; force not proven | keep count only |
| Вес фасонок | yes | yes | legacy aggregate proven | label as aggregate |
| Ворота ≤6 | yes | yes derived mass | formula proven; nonzero parity partial | retain input/mass split |
| Ворота >6 | yes | yes derived mass | formula proven; nonzero parity partial | same |
| Двери | yes | yes derived mass | formula proven; nonzero parity partial | same |
| Окна | yes partial | yes partial | local window branch | keep parity boundary |
| МЕ проёмов | yes | yes | D68 equivalent proven | legacy compatibility field |
| D8 | yes internally | no | formula chain proven | expose only in legacyCompatibility |
| D68 | yes | yes equivalent | formula chain proven | label legacy checkpoint |
| D69 | yes | yes equivalent | formula chain proven | keep as parity checkpoint |

## Final status

```text
CORE1_CALCULATION_LOGIC_CHANGED = NO
CORE1_PUBLIC_RESULT_COMPLETE = PARTIAL
SELECTED_BEAM_EXPOSED = YES
SELECTED_COLUMN_EXPOSED = YES
SELECTED_ROOF_PURLIN_EXPOSED = YES
TIE_EXPOSED = YES
HANGER_EXPOSED = YES
SPACER_EXPOSED = YES
HORIZONTAL_BRACING_EXPOSED = YES
VERTICAL_BRACING_EXPOSED = YES
FACADE_POST_EXPOSED = YES
EAVE_RIDGE_PLATE_EXPOSED = YES
BASE_PLATE_EXPOSED = YES
CONNECTION_BOLTS_EXPOSED = PARTIAL
FITTING_MASS_EXPOSED = YES
COMPONENT_MASSES_EXPOSED = PARTIAL
OPENING_INPUTS_CLASSIFIED = YES
D8_CLASSIFICATION = LEGACY_COMPATIBILITY_VALUE_NOT_PUBLIC
D68_CLASSIFICATION = LEGACY_COMPATIBILITY_VALUE_PUBLIC_EQUIVALENT
D69_CLASSIFICATION = LEGACY_COMPATIBILITY_VALUE_PUBLIC_REGRESSION_CHECKPOINT
STRUCTURAL_CONTEXT_CONTRACT_READY = YES
SAFE_TO_IMPLEMENT_RESULT_CONTRACT = YES
NEXT_STAGE = implement an additive Core1Result v2 projection containing only
proven selected sections, frameGrid values, component masses and structured
provenance; preserve flat fields and D8/D68/D69 compatibility aliases, then
add contract/schema tests before exposing it to EnclosureCore
```

No implementation was performed in this audit. No commit or push was made.
