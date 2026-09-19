# Enclosure Manual Wall-Girt Integration Report

## Result

The source-proven `replayManualWallGirt` is now the only calculation delegate
used by `calculateColdEnclosure` for explicit manual wall-girt zones. No
formula was copied into `calculateColdEnclosure` and no Core1 path was changed.

```text
INTEGRATION_IMPLEMENTED = YES
MANUAL_WALL_GIRT_SOURCE_PARITY = PROVEN
MANUAL_WALL_GIRT_REAL_PROJECT_PARITY = NOT_TESTED
```

## Supported contract

The optional `ColdEnclosureInput.wallGirts` field accepts:

```text
wallGirts:
  mode: MANUAL
  zones: [
    {
      wall: SIDE | END
      zoneType: CORNER | TYPICAL
      wallHeight_m
      zoneLength_m
      structuralPostStep_m
      girtStep_m
      sectionType: ] | [] | ][ | [-]
      profile: { profileId, sectionMass_kg_m }
    }
  ]
```

Every value is explicit. The integration does not infer a profile, step,
section type, or zone geometry. Each returned zone retains the replay fields:
rows, lengths, profile mass, bracket count/unit mass/mass, known mass,
provenance, and diagnostics.

`mode: AUTO` is rejected with a typed diagnostic. The existing no-configuration
path remains the deterministic unknown skeleton.

## Mass boundary

```text
KNOWN_MASS = profileMass + bracketMass
```

The result is `PARTIAL` because the following remain unknown or unsupported:

```text
TN_TO = NOT_IMPLEMENTED
opening framing = NOT_IMPLEMENTED
+стойки = NOT_IMPLEMENTED
automatic selection = NOT_IMPLEMENTED
pricing = NOT_IMPLEMENTED
```

Known mass is not replaced by zero and unsupported components are retained in
`unknownMassComponents` (`wallGirtExtraMembers` for valid manual zones).

## Diagnostics

The integrated path reports typed diagnostics for:

- `ENCLOSURE_OPENINGS_UNSUPPORTED`;
- `ENCLOSURE_PLUS_STUDS_UNSUPPORTED`;
- `ENCLOSURE_AUTO_GIRT_SELECTION_NOT_IMPLEMENTED`;
- `ENCLOSURE_INVALID_MANUAL_GIRT_INPUT`;
- `ENCLOSURE_PROFILE_NOT_FOUND`;
- `ENCLOSURE_SECTION_TYPE_UNSUPPORTED`.

## Provenance and project status

Valid integrated zones default to:

```text
status = LEGACY_PROVEN
sourceWorkbook = Калькулятор ограждайки v1.5.xlsx
```

They are not marked `REAL_PROJECT_VALIDATED`. The available 21640 and 21876
workbooks are downstream BOM sources and did not provide zone-level inputs;
therefore real-project parity remains independently untested.

## Architectural boundaries

```text
Project/Core1 inputs (unchanged)
          ↓
ColdEnclosureInput.wallGirts, explicit MANUAL zones
          ↓
calculateColdEnclosure
          ↓ delegates only
replayManualWallGirt
```

No UI, Core1, Core2, commercial totals, automatic selector, openings, or
generalized TN/TO implementation was added.

```text
CORE1_RESULTS_CHANGED = NO
CORE2_RESULTS_CHANGED = NO
COMMERCIAL_RESULTS_CHANGED = NO
SAFE_TO_BEGIN_MANUAL_GIRT_UI_DESIGN = NO
```

The next stage is to obtain a zone-level authoritative or real-project source,
then create validated fixtures before designing UI exposure.
