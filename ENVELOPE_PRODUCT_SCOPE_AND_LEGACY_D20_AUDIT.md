# Envelope product scope и legacy D20 — semantic contract audit

Репозиторий: `E:\SprintMv1`
Ветка: `checkpoint/22318-purlin-audit`
Режим: semantic/business-contract audit.

Production TypeScript, XLSX, structural formulas, replay behavior, `outputs/`,
commit и push в этом этапе не изменялись.

## 1. Доказанный текущий runtime-контракт

### Core 1 / legacy D20

`src/core1/types/input.ts` определяет `RoofCovering` как exact enum, включающий:

- десять значений `наше ...` и вариантов с GVL;
- семь значений `С-П 50` ... `С-П 250`;
- `профлист`;
- два legacy low-slope значения.

Это compatibility-поле. Оно необходимо для воспроизведения Excel D20 и не может
быть удалено или сужено до нового product enum.

В `src/core1/legacy/data.ts` все перечисленные значения имеют отдельные строки
`LEGACY_ROOF_CORRECTIONS`. Различия correction/base value доказывают, что
`наше`, `С-П` и `профлист` не являются одной физической системой в legacy
данных.

`src/core1/legacy/LegacyClimateDeriver.ts` использует exact `roof_covering` для
legacy roof correction. Это расчётный compatibility-путь, а не product-scope
классификатор.

`src/core1/purlin/PurlinCalculator.ts` имеет две разные семантики одновременно:

```text
roofWeight(...)       → exact covering lookup, масса покрытия различается;
purlinFamily(...)     → "наше " ? "2ТПС" : "2ПС".
```
Следовательно, `С-П` и `профлист` в purlin profile-family branch временно
используют общий `2ПС` путь. Это ограниченная structural branch equivalence,
не утверждение, что sandwich и cold profiled-sheet envelope физически
эквивалентны.

### ProjectInput

`src/project/types.ts` сейчас содержит:

```text
ProjectEnvelope {
  roof_covering: RoofCovering;
  roof_deck_grade: RoofDeckGrade;
  wall_system: string;
}
```

Отдельных полей `intendedEnvelope`/`envelopeSystem` и `supplyScope` нет.
`wall_system` — свободная строка; `projectFile.ts` проверяет только тип строки,
но не product-domain enum и не legacy safety rule.

`ProjectInput` не различает:

1. оболочку, для которой проектируется здание;
2. что именно входит в текущую коммерческую поставку.

`src/project/adapter.ts` переносит `roof_covering` в Core1 и не переносит
`wall_system` в Core1. Это правильно для compatibility boundary, но не является
полным product contract.

`src/project/ui-input-contract.json` прямо помечает `envelope.wall_system` как
`CORE2_ONLY_EXPLICIT`, а `envelope.roof_covering` — как proven Core1 purlin
input. Поля для supply scope в контракте отсутствуют.

### Defaults/UI

`src/project/defaults.ts` по умолчанию задаёт:

```text
roof_covering = "С-П 200"
wall_system   = "Сэндвич-панель 200 мм"
```

Это фактически sandwich-oriented default, но текущая модель не выражает,
входит ли оболочка в поставку. Это accidental product implication, а не
доказанный `SupplyScope`.

`src/App.tsx` показывает пользователю весь legacy список `roofCoverings`,
включая `наше ...`. Поэтому новый UI сейчас позволяет выбрать legacy-only
INSI family как будто это обычный новый продукт. Это должно быть закрыто
будущим semantic guard, но в этом audit UI не меняется.

### EnclosureCore

`src/enclosure/types.ts` уже имеет внутренний cladding enum:

```text
COLD_PROFNASTIL | INSULATED_SANDWICH | UNKNOWN
```

Это полезный runtime hint, но он не является ProjectInput contract: `cladding`
передаётся в `projectInputToColdEnclosureInput` через optional adapter option,
а не выводится из `ProjectInput.envelope`.

`ColdEnclosureInput` содержит `wallSystem.system`, `wallSystem.cladding` и
roof system, однако `calculateColdEnclosure.ts` пока не меняет calculation
ветку по `cladding`. Он выбирает только manual/auto wall-girt путь и возвращает
typed `UNKNOWN` diagnostics для недоказанных wall studs, facade posts, opening
framing, sheets, brackets, fasteners и trims.

Таким образом, EnclosureCore знает различие cold/sandwich на типовом уровне,
но текущая calculation implementation ещё не доказала полную envelope-specific
engineering semantics.

## 2. Проверка эквивалентности legacy значений

| Сравнение | Результат | Доказательство |
|---|---|---|
| `наше ...` и `С-П ...` | НЕ эквивалентны | разные physical meanings и разные строки correction/weight; `purlinFamily` также выбирает `2ТПС` против `2ПС` |
| `С-П ...` и `профлист` | НЕ эквивалентны как envelope | roof-weight lookup и product meaning различаются |
| `С-П ...` и `профлист` в одной purlin profile branch | Да, ограниченно | `purlinFamily()` направляет оба в `2ПС`; это не product equivalence |
| `wall_system` и `roof_covering` | НЕ взаимозаменяемы | ProjectInput хранит их раздельно; adapter переносит в разные compatibility layers |

`наше` нельзя трактовать как sandwich: владелец domain определил его как
историческую INSI built-up insulated system, собранную послойно.

## 3. Предлагаемый typed product-domain contract

В этом этапе contract только зафиксирован в
`docs/enclosure/evidence/envelope-product-scope-contract.json`; production
types намеренно не изменены.

```ts
type ProjectEnvelopeSystem =
  | "PROFILED_SHEET_COLD"
  | "SANDWICH_PANEL";

type SupplyScope =
  | "FRAME_ONLY"
  | "FULL_BUILDING";

type LegacyEnvelopeSystem =
  | "INSI_BUILT_UP_PANEL_LEGACY";
```

### Mapping to Core1 compatibility input

```text
PROFILED_SHEET_COLD
  → legacy roof_covering = "профлист"

SANDWICH_PANEL
  → legacy roof_covering = explicit "С-П <thickness>"
  → thickness is required from an explicit supported value;
    no default thickness is invented here

INSI_BUILT_UP_PANEL_LEGACY
  → legacy roof_covering = one of exact "наше ..." values
  → import/replay/parity only
  → forbidden for new-project creation
```

The legacy `roof_covering` field remains in the adapter/Core1 contract so that
historical Excel projects and replay snapshots retain exact D20 behavior.

### Legacy safety guard

New-project mode must reject any `наше ...` value with a typed diagnostic:

```text
UNSUPPORTED_LEGACY_ENVELOPE
INSI_BUILT_UP_PANEL_LEGACY is retained only for historical Excel parity/replay
and is outside the supported product scope of new SprintMv1 projects.
```

The guard must not reject a historical import/replay path that explicitly marks
the source as legacy. It must not remove the values from `RoofCovering`.

## 4. Design calculation versus commercial supply

`SupplyScope` is a commercial filter, not a structural-calculation switch.
The engineering model must use `ProjectEnvelopeSystem` as the intended future
envelope even when the customer currently purchases only the steel frame.

| Component | Ownership status | Rule |
|---|---|---|
| Main frames | `STRUCTURAL_ALWAYS` | Required for every supported building calculation |
| Roof purlins | `STRUCTURAL_ALWAYS` | Existing Core1 structural path; not suppressed by `FRAME_ONLY` |
| Wall girts / wall purlins | `STRUCTURAL_IF_ENVELOPE_REQUIRES` | Required for future cold or sandwich envelope; current full ownership is partial |
| Facade/gable posts | `STRUCTURAL_IF_ENVELOPE_REQUIRES` | Required where the selected envelope/load path needs them; source ownership not fully proven |
| Opening framing | `STRUCTURAL_IF_ENVELOPE_REQUIRES` | Structural support remains required even when cladding is excluded from sale |
| Structural brackets/connections | `STRUCTURAL_IF_ENVELOPE_REQUIRES` | Structural hardware remains part of design; commercial inclusion is separate |
| Profiled sheet | `CLADDING_MATERIAL` | Commercial supply item; excluded from `FRAME_ONLY`, not a reason to remove supports |
| Sandwich panels | `CLADDING_MATERIAL` | Commercial supply item; excluded from `FRAME_ONLY`, not a reason to remove supports |
| Cladding fasteners | `CLADDING_MATERIAL` | Supply/BOM filter; exact structural fastener ownership may require separate proof |
| Trims | `CLADDING_MATERIAL` | Supply/BOM filter; no proven current Core1 structural owner |

The current source does not prove a complete procurement/BOM owner for every
cladding component. Those fields remain separate from structural outputs.

## 5. Product scopes

### `PROFILED_SHEET_COLD`

Supported new-project envelope system. Legacy bridge is exact `профлист`.
Structural support calculation must remain active for `FRAME_ONLY` and
`FULL_BUILDING`; current wall-girt implementation is restricted/partial and
does not prove sheet-area or procurement formulas.

### `SANDWICH_PANEL`

Supported new-project envelope system. Legacy bridge is an explicitly selected
`С-П <thickness>` value. Structural support calculation must remain active for
`FRAME_ONLY` and `FULL_BUILDING`; the current code has no generic thickness
field and no complete sandwich procurement implementation.

### `INSI_BUILT_UP_PANEL_LEGACY`

Legacy-only. It may be retained for historical import, replay snapshots and
parity validation. It must not be selectable when creating a new SprintMv1
project.

There is currently no `OPEN`/`NONE` building mode in this product contract.

## 6. Required extension, not performed here

`ProjectInput` extension is required because the current model cannot represent
commercial scope and intended envelope independently:

```text
envelope.system: PROFILED_SHEET_COLD | SANDWICH_PANEL
supply_scope: FRAME_ONLY | FULL_BUILDING
```

The exact sandwich thickness field/default remains a separate decision and must
not be guessed from the existing default string.

No production change is made in this audit. In particular, no changes were made
to `RoofCovering`, FrameSelector, PurlinCalculator, StructuralSummary, D69,
wall-girt replay/AUTO formulas, wall geometry or opening calculations.

## 7. Explicit final statuses

```text
LEGACY_NASHE_MEANING = INSI_BUILT_UP_PANEL
LEGACY_NASHE_THERMAL_CLASS = INSULATED
LEGACY_NASHE_NEW_PROJECT_SUPPORT = NO

LEGACY_SP_MEANING = SANDWICH_PANEL
LEGACY_SP_NEW_PROJECT_SUPPORT = YES

LEGACY_PROFLIST_MEANING = PROFILED_SHEET_COLD
LEGACY_PROFLIST_NEW_PROJECT_SUPPORT = YES

DESIGN_ENVELOPE_AND_SUPPLY_SCOPE_SEPARATED = YES

FRAME_ONLY_PROFILED_SHEET_REQUIRES_ENVELOPE_SUPPORT_CALC = YES
FRAME_ONLY_SANDWICH_REQUIRES_ENVELOPE_SUPPORT_CALC = YES

PROJECTINPUT_CURRENT_CONTRACT_SUFFICIENT = NO
PROJECTINPUT_EXTENSION_REQUIRED = YES

CORE1_ROOFCOVERING_ENUM_CHANGE_REQUIRED = NO
CORE1_FORMULA_CHANGE_REQUIRED = NO

COLD_ENCLOSURE_SCOPE = SUPPORTED_PRODUCT_TARGET; STRUCTURAL_IMPLEMENTATION_PARTIAL
SANDWICH_ENCLOSURE_SCOPE = SUPPORTED_PRODUCT_TARGET; STRUCTURAL_IMPLEMENTATION_PARTIAL
LEGACY_BUILT_UP_ENCLOSURE_SCOPE = PARITY_ONLY

SAFE_TO_IMPLEMENT_PRODUCT_SCOPE_TYPES = YES (next controlled implementation stage)
SAFE_TO_CHANGE_PROJECT_DEFAULTS = NO (requires explicit product decision)
SAFE_TO_CHANGE_UI = NO (contract must be wired and reviewed first)

NEXT_STAGE = add typed ProjectEnvelopeSystem/SupplyScope at ProjectInput boundary,
             preserve RoofCovering compatibility, add the new-project legacy guard,
             then wire EnclosureCore from intendedEnvelope without using
             SupplyScope to suppress structural support calculations.
```
