# Restricted AUTO wall-girt integration report

The proven selector is now integrated into `calculateColdEnclosure()` through
an explicit AUTO configuration. ProjectInput and the project-file format remain
unchanged.

```text
AUTO_SELECTOR_CORE_USED = YES
AUTO_IN_CALCULATE_COLD_ENCLOSURE = YES
EXPLICIT_RUNTIME_INPUT_ONLY = YES
PROJECTINPUT_AUTO_WIRING = NO
AUTO_ZONES_PUBLIC = YES
MANUAL_ZONES_PRESERVED = YES
```

## Result model

`wallGirts` now exposes both additive branches:

```text
manualZones: ManualWallGirtZoneResult[]
autoZones: {
  selection: AutoWallGirtSelectedCandidate
  replay: ManualWallGirtZoneResult
}[]
```

The AUTO branch uses the existing `AutoWallGirtRuntimeInput` contract and the
existing `replayManualWallGirt()` quantity/mass/bracket formulas. No AUTO
values are derived from ProjectInput, frameGrid, roof geometry, or UI state.

## Golden integration

| branch | expected row | actual row | expected step | actual step |
|---|---:|---:|---:|---:|
| CORNER | 161 | 161 | 1370 mm | 1370 mm |
| TYPICAL | 46 | 46 | 1380 mm | 1380 mm |

The explicit source case produces deterministic replay results, including rows,
profile length, profile mass, bracket quantity, bracket mass and known mass.

```text
MANUAL_REPLAY_REUSED = YES
AUTO_KNOWN_MASS_AGGREGATED = YES
UNKNOWN_COMPONENTS_PRESERVED = YES
```

Unknown components are not converted to zero. Wall studs, facade posts,
opening framing, sheets, fasteners, trims and other unproven components remain
in `unknownMassComponents`.

## Domain guards

```text
OPENINGS_REJECTED = YES
PLUS_STUDS_REJECTED = YES
```

AUTO rejects openings before selector/replay. Only `SP_20` and explicit
`withoutStuds=true` are accepted. No-valid-candidate, unsupported-domain,
plus-stud and missing-source-input states use typed diagnostics:

```text
ENCLOSURE_AUTO_NO_VALID_CANDIDATE
ENCLOSURE_AUTO_DOMAIN_UNSUPPORTED
ENCLOSURE_AUTO_PLUS_STUDS_UNSUPPORTED
ENCLOSURE_AUTO_SOURCE_INPUT_MISSING
ENCLOSURE_OPENINGS_UNSUPPORTED
```

## Manual and adapter boundaries

Existing MANUAL configurations continue to use `manualZones` and the original
replay path. `projectInputToColdEnclosureInput()` still creates MANUAL only
when explicit `project.enclosure.wall_girts` exists; an ordinary ProjectInput
without zones does not start AUTO.

No mapping was introduced for:

- B11/B12/B13;
- SIDE versus END height;
- ridge height;
- `frameGrid.effectiveFrameStep_m` as post step;
- wall-system insulation;
- ProjectInput filter policy.

```text
PROJECTINPUT_CHANGED = NO
PROJECT_JSON_CHANGED = NO
CORE1_CHANGED = NO
UI_CHANGED = NO
SAFE_TO_BUILD_WALL_GEOMETRY_RESOLVER = YES
```

The geometry resolver remains a separate next stage and must supply explicit
side/end wall calculation heights and post step after source-backed mapping.

## Validation

```text
npm test = PASS
npm run typecheck = PASS
npm run build = PASS
py -m pytest core1/tests/test_static_data_integrity.py = PASS
git diff --check = PASS
```

The implementation is restricted AUTO integration only; full enclosure
calculation is not complete and unknown components remain intentionally
unknown.
