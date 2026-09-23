# Claude fixture 10 regression harness

## Provenance

The ten normalized fixtures were checked against `insicomet/SprintM` at
commit `a24b92823c46b20157e26e0dccdb323a06e34727` using source audit schema
`1.2.0`. Every normalized fixture carries `sourceRepo`, `sourceCommit`,
`sourceSchema`, `sourceFile`, `liveSheet`, and `projectId`.

The source scalar values for length, span, height, manual frame step, and
expected frame count match the normalized JSON. The openings companion is
checked against the same source commit and preserves `positionStatus = UNKNOWN`.

## Passing baseline

The test-only baseline is the existing successful fixture:

```text
core1/fixtures/baseline_12m.input.json
```

It is passed unchanged to `calculateCore1()` using the test-only filesystem
repository and produces `result.canonical.frameGrid.frameCount = 4`. For each
Claude fixture, the harness starts from `baseline.input` and changes only:

- `span_m`;
- `building_length_m`;
- `building_height_m`;
- `frame_step_override_m`.

The four changed fields are source-derived. All other fields are existing
baseline values, not synthetic values invented by this harness.

## Formula parity

`claudeFixture10FrameCount.test.ts` contains a test-only mathematical oracle:

```text
Math.ceil(length_m / frameStep_m) + 1
```

It proves `FORMULA_PARITY = 10/10` for the source-derived scalar fixtures. The
boundary cases cover `nextDown`, exact, `nextUp`, and practical decimal values
for steps `3.4`, `3.5`, and `3.92`. These tests compare only the mathematical
formula and do not claim application parity or axis-position parity.

## Core1 diagnostic isolation

Both variants call the real `calculateCore1()` with the unchanged baseline
repository and inspect only the diagnostic summary or, on success,
`result.canonical.frameGrid.frameCount`.

- Variant A: source span/length/height, baseline `frame_step_override_m`;
- Variant B: source span/length/height and source `manualFrameStep_m`.

| projectId | Variant A | Variant B |
|---|---|---|
| 21484 | `unknown_domain / UNKNOWN_DOMAIN / unsupported`: height outside `(0, 6.2]` | same geometry diagnostic; details also contain manual step `3.92` |
| 21501 | same height diagnostic | same geometry diagnostic; details also contain manual step `3.5` |
| 21627 | same height diagnostic | same geometry diagnostic; details also contain manual step `3.4` |
| 21628 | same height diagnostic | same geometry diagnostic; details also contain manual step `3.4` |
| 21629 | same height diagnostic | same geometry diagnostic; details also contain manual step `3.4` |
| 21639 | `success`; canonical frame count observable | `unknown_domain / UNKNOWN_DOMAIN / unsupported`: manual frame-step override outside proven domain; value `5` |
| 21640 | `success`; canonical frame count observable | same manual frame-step diagnostic; value `5` |
| 21873 | same height diagnostic | same height diagnostic; details also contain manual step `5` |
| 21892 | `unsupported / UNSUPPORTED_FOR_PARITY / unsupported`: incomplete profile lookup (`9м!HZ18`, `9м!HZ5`, `9м!IA19`, `9м!IB19`, `9м!IE19`) | `unknown_domain / UNKNOWN_DOMAIN / unsupported`: manual frame-step override; value `4` |
| 21998 | same height diagnostic | same height diagnostic; details also contain manual step `6` |

Diagnostic field/path values are the production `trigger` or `source_cells`;
the diagnostic message for the domain rows is
`Числовое значение находится вне доказанного domain Core 1 v1.`. The input
values above are source-derived geometry/manual-step values. Baseline fields
are not blockers. Variant A reaches a canonical result for 2/10 fixtures;
Variant B reaches a canonical result for 0/10.

The result is therefore:

```text
MANUAL_FRAME_STEP_DOMAIN_GAP = YES
CORE1_INTEGRATION_PARITY = 0/10 BLOCKED
```

The source manual steps were not replaced by nearby permitted values. The
production selector and validator were not changed. The other Variant A
blockers are independently visible: the current height domain rejects 7–8 m,
and project 21892 reaches an existing incomplete profile dataset branch.

The observable production field, when a calculation succeeds, is:

```text
result.canonical.frameGrid.frameCount
```

## Openings

The source opening classification is kept separate from the Core1 integration
input:

- active windows: `0` rows;
- active doors: `6` rows;
- active gates: `10` rows;
- `count = 0` is preserved;
- width/height/area fields are absent from normalized inactive entries and are
  `IGNORED/OMITTED`, not converted from template dimensions to zero;
- `positionStatus = UNKNOWN`.

The opening data is not connected to `calculateCore1` and is not a claim that
the production opening adapter has been validated against these fixtures.

## Boundary and invalid-input classification

- `FORMULA_BOUNDARY_TESTS`: test-only mathematical formula oracle;
- `CORE1_BOUNDARY_TESTS`: production calls are covered by the A/B diagnostic
  matrix; the source-step boundary itself is blocked by the domain gap;
- `INVALID_INPUT_VALIDATION`: test-only finite-positive predicate;
- `PRODUCTION_TYPED_DIAGNOSTIC`: `GAP` for a standalone frame-count diagnostic.

No production frame-count export, formula, adapter, schema, or selector was
changed. No opening values were connected to Core1.
