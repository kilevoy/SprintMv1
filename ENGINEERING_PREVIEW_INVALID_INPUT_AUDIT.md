# Engineering Preview — `baseline_12m` INVALID_INPUT audit

## Root cause

`BrowserCore1DataRepository.loadFixture("baseline_12m")` loads the saved JSON envelope. Its `input` property is itself an envelope with metadata and the actual Core1 input under `input.input`.

The preview passed the outer envelope directly to `fromFixture()` and cast it as `Core1Input`. The adapter then read geometry, roof and special-condition fields from the wrong object level. Those reads became `undefined`, so the generated Core1 input failed the authoritative schema.

Classification: `FIXTURE_MAPPING_ERROR` at the fixture-envelope → `ProjectInput` boundary.

## Failed object before the fix

The affected adapter mappings were:

| JSON path | Expected | Actual | ProjectInput source | Mapping |
| --- | --- | --- | --- | --- |
| `/span_m` | number | `undefined` | `geometry.span_m` | `fromFixture` → geometry |
| `/building_length_m` | number | `undefined` | `geometry.building_length_m` | `fromFixture` → geometry |
| `/building_height_m` | number | `undefined` | `geometry.building_height_m` | `fromFixture` → geometry |
| `/responsibility_factor` | `0.8` or `1.0` | `undefined` | `geometry.responsibility_factor` | `fromFixture` → geometry |
| `/roof_covering` | Core1 roof enum | `undefined` | `envelope.roof_covering` | `fromFixture` → envelope |
| `/roof_deck_grade` | Core1 deck enum | `undefined` | `envelope.roof_deck_grade` | `fromFixture` → envelope |
| `/snow_retention_purlin` | `есть` or `нет` | `undefined` | `special_conditions.snow_retention_purlin` | `fromFixture` → special conditions |
| `/enclosure_purlin` | `есть` or `нет` | `undefined` | `special_conditions.enclosure_purlin` | `fromFixture` → special conditions |

The count and window fields were supplied by the default `ProjectInput`, so they were not the root cause.

## Fix boundary

The preview now unwraps the fixture envelope before calling `fromFixture()`. The Core1 schema and adapter remain authoritative; no defaults were added to Core1 and no formula was changed.

Regression coverage validates the adapter output with `validateCore1Input()` after loading the same envelope shape.

## Preview input contract audit

`ProjectInput` already has repeatable collections:

- `GateOpening`: `width_mm`, `height_mm`, `quantity`;
- `DoorOpening`: `width_mm`, `height_mm`, `quantity`;
- `WindowOpening`: `width_mm`, `height_mm`, `quantity`, `window_type`, `glazing_construction`;
- `StripWindowOpening`: `height_mm`, `length_mm`, `quantity`, `window_type`, `glazing_construction`.

The preview now edits these records directly. Gate classification remains the existing adapter policy (`width_mm`, explicit `gate_boundary_dimension: "width_mm"`); no new threshold rule was introduced in the UI.

`PREVIEW_INPUT_FIELDS_COMPLETE = YES`
