# Manual Wall-Girt Replay Implementation Report

## Scope

This implementation is deliberately restricted to the source-backed manual
replay of one explicit gross wall zone. The caller supplies the wall, zone
kind, wall height, zone length, girt step, structural-post/support step,
section type, and an explicit profile with section mass per metre.

The implementation does **not** select a profile, recalculate openings,
activate `+стойки`, derive upper/lower extra members, or perform automatic
selection, pricing, or Core1/Core2 integration.

## Implemented formulas

The formulas reproduce the audited workbook branches:

```text
rows = CEILING.MATH(wallHeight_m / girtStep_m, 1)
        + IF(sectionType IN {"[]", "][", "[-]"}, 0, 1)

profileLength_m = rows * zoneLength_m
profileMass_kg = profileLength_m * sectionMass_kg_m

bracketCount = CEILING.MATH(
  rows * ROUND(zoneLength_m / structuralPostStep_m, 1), 1
)

bracketUnitMass_kg = IF(sectionType IN {"[]", "][", "[-]"}, 1.5, 0.75)
bracketMass_kg = bracketCount * bracketUnitMass_kg
totalKnownMass_kg = profileMass_kg + bracketMass_kg
```

The positive `ROUND(..., 1)` branch is implemented explicitly rather than
delegated to a locale-dependent formatting operation.

## Evidence and parity

The four source-backed fixture patterns are covered by tests:

| Section | Rows | Profile length | Profile mass | Brackets | Bracket mass |
|---|---:|---:|---:|---:|---:|
| `]` | 8 | 96 m | 256.4736 kg | 16 | 12 kg |
| `[]` | 7 | 84 m | 448.8288 kg | 14 | 21 kg |
| `][` | 7 | 84 m | 448.8288 kg | 14 | 21 kg |
| `[-]` | 7 | 84 m | 448.8288 kg | 14 | 21 kg |

The fixture source and workbook hash are recorded in
`docs/enclosure/evidence/fixtures/wall-girt-manual-replay-fixtures.json`.

## Status

```text
MANUAL_WALL_GIRT_REPLAY = PROVEN
AUTOMATIC_PROFILE_SELECTION = NOT_IMPLEMENTED
OPENING_INTERACTION = NOT_IMPLEMENTED
PLUS_STUDS = NOT_IMPLEMENTED
UPPER_LOWER_EXTRA_GIRTS = NOT_IMPLEMENTED
PRICING = NOT_IMPLEMENTED
CORE1_INTEGRATION = NOT_IMPLEMENTED
```
