# UI ↔ ProjectInput ↔ Core1 input contract audit

Режим: read-only audit после `CORE1_FREEZE.md`. Production code, XLSX/PDF и
`outputs/` в рамках аудита не изменялись.

## Scope and evidence

Проверены `src/App.tsx`, `src/project/types.ts`,
`src/project/adapter.ts`, adapter tests, Core1 input/result types,
`CORE1_SUPPORTED_DOMAIN.md` и `CORE1_FREEZE.md`. Runtime не зависит от
создаваемого machine-readable файла; он является только артефактом аудита.

## Status summary

| Status | Result | Evidence / reason |
|---|---|---|
| `UI_PROJECTINPUT_MAPPING` | `PARTIAL` | Existing controls map explicitly, but UI hides literal decimal spans and presents limited 24 m alongside normal families. |
| `PROJECTINPUT_CORE1_MAPPING` | `PARTIAL` | Scalar mapping is explicit and tested; gates require an explicit unresolved boundary policy, and rich openings are lossy when projected to legacy fields. |
| `FRAME_STEP_UI_SEMANTICS` | `NEEDS_FIX` | D9 manual override is explicit and effective step is shown, but calculated D8 and frame count are not separately visible. |
| `ROOF_PURLIN_UI_SEMANTICS` | `CORRECT` | `Марка настила` is a deck grade and its help text correctly states the purlin-step limitation role; enclosure purlin is not treated as wall material. |
| `OPENINGS_UI_CONTRACT` | `PARTIAL` | Gate classification policy is intentionally blocked; window projection is limited to one compatible legacy shape. |
| `ENCLOSURE_FIELDS_SEPARATED_FROM_CORE1` | `PARTIAL` | `wall_system` is explicitly Core 2-only, while `enclosure_purlin` is a Core 1 purlin flag despite its enclosure wording. |
| `SUPPORTED_DOMAIN_UX` | `NEEDS_FIX` | Unsupported/partial domain is not sufficiently prominent for 24 m, manual D9, and nonzero opening parity. |

Priority counts: **P0 = 0, P1 = 5, P2 = 5, P3 = 4**. These are contract
findings, not automatic production-code defects.

## UI control inventory

| UI section / control | ProjectInput field | Core1 field / consumer | Type / unit / default | Status |
|---|---|---|---|---|
| Страна | `climate.country` | climate lookup input | enum `RU/KZ` / — / `RU` | PROVEN |
| Режим климатических данных | `climate.mode` | climate resolver | enum / — / `CITY_LOOKUP` | PROVEN |
| Населённый пункт | `climate.city` | exact climate lookup | string / — / `Роза` | PROVEN for exact dataset keys |
| Нормативная ветка | `climate.normative_system` | climate/window routing | enum / — / `SP_20` | PROVEN for exposed choices |
| Снеговой район, нагрузка | manual climate fields | `climate.snow_region`, `snow_load` | string/number, kN/m² | PROVEN mapping; validation of engineering values remains Core1 |
| Ветровой район, нагрузка | manual climate fields | `wind_region`, `wind_load` | string/number, kN/m² | PROVEN mapping |
| Сейсмичность / источник | manual climate fields | informational/manual climate | string / — / empty | UNKNOWN active engineering use; preserved, not silently used |
| Пролёт, м | `geometry.span_m` | family resolver and literal geometry | number / m / `12` | P1: UI only exposes 9/12/15/18/21/24 although Core1 preserves literal spans |
| Ответственность | `geometry.responsibility_factor` | frame/purlin branches | enum `0.8/1.0` / — / `0.8` | PROVEN |
| Длина, м | `geometry.building_length_m` | frame count, purlin, summary/openings | number / m / `18` | PROVEN mapping; UI min 0 while Core1 rejects non-positive |
| Высота, м | `geometry.building_height_m` | frame selector/profile | number / m / `3` | PROVEN mapping; UI min 0 while proven domain is positive and ≤6.2 |
| Задать шаг рам вручную | `geometry.frame_step_override_m` | D9/effective frame step | nullable number / m / `null` | P1: D9 is explicit, but parity outside proven manual cases is UNKNOWN |
| Ручной шаг рам, м | same | effective step override | number / m / `6` on enable | P2: hard-coded convenience default, not proven legacy default |
| Покрытие | `envelope.roof_covering` | purlin family/selection | exact enum / — / `С-П 200` | PROVEN exact-key mapping |
| Марка настила | `envelope.roof_deck_grade` | deck step limit / purlin | exact enum / — / `С44-1000-0,7` | PROVEN; correct D21 semantics |
| Стены | `envelope.wall_system` | no Core1 consumer | string / — / sandwich 200 | PROVEN separated as Core2 field |
| Снегозадержание | `special_conditions.snow_retention_purlin` | purlin line/weight | enum / — / `нет` | PROVEN |
| Прогон ограждения | `special_conditions.enclosure_purlin` | purlin line/weight | enum / — / `нет` | PROVEN Core1 purlin flag, not wall material |
| Спец. горизонтальные связи | `special_conditions.horizontal_bracing_override` | secondary steel | `+`/null / — / null | PROVEN explicit override, parity scope remains scenario-dependent |
| Ворота: ширина/высота/количество | `openings[]` gate | legacy ≤6/>6 count branches | mm, integer / — / 4000×4200×1 | P1: no wall side; 6 m dimension is not proven, adapter refuses implicit guess |
| Двери: ширина/высота/количество | `openings[]` door | `doors_count` only | mm, integer / — / 900×2100×1 | PARTIAL: dimensions are retained in ProjectInput but Core1 consumes count |
| Окна: dimensions/count/type/glazing | `openings[]` window | legacy window projection + enhanced girt module | mm/count/enums / — / 1200×1500×1 | PARTIAL: compatible groups only; rich groups are rejected rather than collapsed |
| Ленточное окно | `openings[]` strip window | `window_strip_length_m` legacy projection | mm/count/enums / — / 1500×6000×1 | PARTIAL: one strip, quantity 1 only |
| Режим подбора | `other.selection_mode` | Core1 selection mode | enum / — / `стандарт` | PROVEN transport; broad parity not universal |
| Тип кровли | `other.building_roof_type` | Core1 input | enum / — / `двускатное` | PROVEN transport; branch coverage limited |
| Max/min шаг прогона | `other.purlin_*_override` | purlin selection | mm / `null`, 0 / — | PARTIAL: manual branches outside proven parity are typed/limited |
| Тип местности | `other.terrain_type` | wind/purlin-related input | enum / — / `В` | PROVEN transport; exact branch coverage varies |
| Коэффициент оконной схемы/limit | `other.window_*` | enhanced window module | number / — / 1.0, 0.85 | PARTIAL; not a proven universal legacy parity contract |

## ProjectInput → Core1 adapter

The adapter is explicit for climate, geometry, roof/deck, purlin flags,
responsibility, length, height, frame override, counts, and other scalar
fields. It trims city lookup text, preserves literal span values, and does not
coerce unknown values into a nearest legacy choice.

Known intentional loss boundaries:

1. Gates are rejected unless the caller supplies `gate_boundary_dimension`.
   The UI calls the adapter without that option, so a gate produces the typed
   `CORE1_GATE_CLASSIFICATION_UNVERIFIED` diagnostic rather than a guess.
2. Doors project to a count; width/height are not consumed by Core1.
3. Compatible window groups collapse to one legacy-compatible projection.
   Multiple incompatible dimensions/types/glazing or multiple strip groups
   produce `CORE1_OPENINGS_NOT_REPRESENTABLE`.
4. `wall_system` remains in ProjectInput but is deliberately not passed to
   Core1 as an engineering input.
5. Deprecated flat Core1 window fields remain compatibility fields in the
   type, but the adapter uses `windows`.

No P0 wrong engineering mapping was found. The adapter tests cover decimal
literal span preservation, gate-policy refusal, door aggregation, and
incompatible windows.

## D8 / D9 contract

| Contract item | Finding |
|---|---|
| `D8_EDITABLE` | `NO`: no UI control edits the automatic calculated D8. |
| `D9_EDITABLE` | `YES`: checkbox + numeric `frame_step_override_m` are the manual override. |
| `AUTOMATIC_MODE_CLEAR` | `YES`: unchecked “Задать шаг рам вручную” means automatic mode, but the calculated D8 value itself is not shown. |
| `EFFECTIVE_STEP_VISIBLE` | `YES`: result card shows `Шаг рам`, which is the effective step. |
| `FRAME_COUNT_VISIBLE` | `NO`: frame count exists in Core1 summary/context but is not presented in the result card. |
| Effective rule | `D9 manual override` when present, otherwise `D8 automatic`; no UI evidence justifies another rule. |

Classification: `FRAME_STEP_UI_SEMANTICS = NEEDS_FIX` because the UI does not
separate automatic D8, manual D9, effective step, and frame count for audit or
user interpretation. This is not evidence that the underlying Core1 resolver
is wrong.

## Openings and enclosure boundary

The UI has width, height, quantity, window type and glazing controls, but no
wall-side field. No wall-side dependency is proven in the current Core1
contract. Gate threshold semantics are intentionally unresolved: the adapter
requires an explicit width/height policy and emits
`CORE1_GATE_CLASSIFICATION_UNVERIFIED` otherwise. This is safer than silently
choosing width or height, but means the UI contract is not complete for gates.

Windows are a two-level contract: compatible legacy-shaped inputs can be
projected to Core1; the local enhanced window-girt calculation is not evidence
of parity with the external legacy v2 workbook. Nonzero window parity therefore
remains `PARTIAL`/golden-oracle dependent.

## Supported-domain UX

The Core1 contract supports literal positive spans up to 24 m and maps them to
families, while the current select exposes only six canonical values. This is a
UI limitation (`ARBITRARY_SPAN_DOMAIN_GAP`), not a reason to round literal
input in Core1. More importantly, 24 m is displayed as a normal option although
the frozen contract is limited: automatic low-height selection/D8/profile and
some purlin/D68 controls are proven, while D69 is partial and upper heights,
manual D9, ROW15 and canonical connections remain unknown. Legacy errors and
`UNKNOWN_DOMAIN` must remain visible rather than being converted into a normal
success.

## Default provenance

The default project (`Роза`, 12 m, 18 m length, 3 m height, responsibility
0.8, `С-П 200`, deck `С44-1000-0,7`, no openings and no purlin flags) matches the
saved `baseline_12m` fixture for the structural scalar fields. Opening defaults
(gate 4000×4200, door 900×2100, window 1200×1500 and strip 6000) are UI
convenience examples, not proven legacy defaults. The manual 6 m frame step is
also a UI convenience. These should not be treated as engineering provenance.

## Priority register

### P1

- `UI_SPAN_LITERAL_DECIMAL_NOT_EXPOSED`: the UI select hides literal spans that
  ProjectInput/Core1 preserve.
- `UI_24M_LIMITED_DOMAIN_NOT_PROMINENT`: 24 m has partial downstream parity but
  is presented with the same affordance as fully frozen 9–21 m.
- `UI_D8_NOT_SEPARATE_FROM_EFFECTIVE`: automatic D8 is not shown separately
  from effective `Шаг рам`.
- `UI_FRAME_COUNT_NOT_VISIBLE`: frame count is not shown in the result UI.
- `UI_GATE_CONTRACT_PARTIAL`: no wall side and no proven width/height policy;
  gate calculation is correctly blocked, but the control contract is partial.

### P2

- Geometry controls allow zero in HTML while Core1 rejects non-positive values.
- Manual 6 m override is a convenience default with no universal parity claim.
- Gate/door dimension-only edits do not mark the result stale; this is safe for
  current blocked gate projection but can become misleading when gate policy is
  closed.
- Opening examples look like defaults but are not legacy-derived defaults.
- Result cards omit explicit provenance/status for several partial enhanced
  outputs.

### P3

- Document D8/D9 and effective-step vocabulary in the UI.
- Add explicit Core1/Core2 ownership badges for every non-Core1 field.
- Surface source/provenance for defaults and exact climate dataset selection.
- Keep the machine-readable contract synchronized with UI changes.

## Final classification

```text
UI_PROJECTINPUT_MAPPING = PARTIAL
PROJECTINPUT_CORE1_MAPPING = PARTIAL
FRAME_STEP_UI_SEMANTICS = NEEDS_FIX
ROOF_PURLIN_UI_SEMANTICS = CORRECT
OPENINGS_UI_CONTRACT = PARTIAL
ENCLOSURE_FIELDS_SEPARATED_FROM_CORE1 = PARTIAL
SUPPORTED_DOMAIN_UX = NEEDS_FIX
P0_COUNT = 0
P1_COUNT = 5
P2_COUNT = 5
P3_COUNT = 4
SAFE_TO_FREEZE_UI_INPUT_CONTRACT = NO
NEXT_ACTION = clarify D8/effective-step/frame-count presentation and limited-domain/opening diagnostics before freezing the UI contract
PRODUCTION_CODE_CHANGED = NO
```

