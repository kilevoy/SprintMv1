# Cold Enclosure Architecture Audit

Режим: architecture / contract only. Формулы холодного ограждения не
реализуются. Core1, legacy datasets, XLSX/PDF и `outputs/` не изменяются.

## 1. Current repository inventory

| Area / artifact | Current responsibility | Classification | Boundary finding |
|---|---|---|---|
| `src/App.tsx` wall selector | stores `envelope.wall_system`, displays project wall choice | `PROJECT_INPUT` / `UI_ONLY` | already marked future EnclosureCore; not passed to Core1 |
| `src/project/types.ts:ProjectEnvelope` | wall system, roof covering and deck grade | `PROJECT_INPUT` | one aggregate type currently contains both Core1 roof inputs and future wall inputs; split at adapter, not UI state |
| `src/project/adapter.ts` | projects roof/deck and purlin flags to Core1; intentionally drops `wall_system` | `CORE1` + boundary adapter | correct current separation; future EnclosureInput adapter should consume same ProjectInput |
| `src/core1/purlin/PurlinCalculator.ts` | roof purlin selection, deck limit, snow/enclosure purlin flags | `CORE1` | “enclosure purlin” is a proven roof/secondary flag, not a wall cladding calculation |
| `src/core1/opening/OpeningMassCalculator.ts` | legacy opening mass branches for gates, doors and windows; aggregates into Core1 D68/D69 path | `CORE1` / legacy compatibility | frozen output dependency; future wall/opening framing must not silently replace it |
| `src/core1/window/WindowGirtCalculator.ts` | local enhanced lower/upper window girt selection and mass | `ENHANCED_CORE1` | keep frozen as current Core1 result; provenance is ENHANCED, not assumed enclosure parity |
| `src/core1/secondary/SecondarySteelCalculator.ts` | ties, braces, gable posts, secondary frame components | `CORE1` | gable posts are frame/secondary structural outputs, not automatically wall studs or facade posts |
| `src/core1/types/result.ts` | exposes components, plates, bolts, openings and window-girt result | `CORE1` output contract | Core1Result is consumed by future Core2; it does not define wall-sheet quantities |
| `src/App.tsx` opening editor | detailed gate/door/window/strip-window project records | `UI_ONLY` / `PROJECT_INPUT` | rich records remain authoritative; legacy projection is explicit and may reject unsupported reduction |
| `core1/data` datasets | frame, purlin, climate, connection and enhanced window evidence | `CORE1` | no cold-wall catalog is proven here |
| pricing / commercial fields | not implemented in current Core1 path | `COMMERCIAL` / `NOT_IMPLEMENTED` | must consume later BOM outputs, not enter Core1 selection |
| wall girt / wall rail / profnastil / insulation catalogs | no proven implementation found in this repository | `NOT_IMPLEMENTED` | require external evidence before engineering implementation |

### Misplaced or potentially ambiguous responsibilities

No current Core1 formula was moved. The following are boundary risks to keep
explicit:

- `OpeningMassCalculator` contains legacy mass for opening-related branches;
  this is required for frozen D68/D69 compatibility, but it is not a complete
  cold-enclosure quantity engine.
- `WindowGirtCalculator` is an enhanced Core1 module. It must not be silently
  reinterpreted as proof of wall-girt, wall-sheet, facade-post, or opening-jamb
  engineering.
- `secondary_columns`/gable posts are not synonymous with wall studs or facade
  posts. They require separate evidence and terminology.
- `enclosure_purlin` is a Core1 purlin flag. It must not be confused with the
  future wall system/material model.

## 2. Target data flow

```text
ProjectInput (single project-level state)
   ├── projectInputToCore1Input()
   │       ↓
   │     Core1
   │       ↓
   │     Core1Result + provenance/diagnostics
   │
   └── projectInputToEnclosureInput()
           ↓
       EnclosureCore
           ↓
       EnclosureResult + provenance/diagnostics

Core1Result + EnclosureResult
           ↓
         Core2 / BOM / price / commercial result
```

`ProjectInput` remains the only UI state model. The enclosure adapter is a
derived projection, not a second form state and not a second frame calculator.
Core1 supplies structural geometry and proven frame-grid facts; EnclosureCore
owns wall-envelope quantities and cladding logic.

## 3. Draft `EnclosureInput` contract

Documentation-only draft; this is not a TypeScript runtime interface yet.

```ts
interface ColdEnclosureInput {
  geometry: {
    span_m: number;                 // ProjectInput.geometry.span_m, AUTO
    building_length_m: number;     // ProjectInput.geometry.building_length_m, AUTO
    building_height_m: number;     // ProjectInput.geometry.building_height_m, AUTO
    side_wall_length_m: number;    // derived from geometry, AUTO
    end_wall_width_m: number;      // derived from geometry, AUTO
  };
  climate: {
    country: string;               // ProjectInput/Core1 canonical climate, AUTO
    normative_system: string;      // ProjectInput climate, AUTO
    snow_region?: string|number;   // Core1 climate result, provenance required
    snow_load?: number;            // Core1 climate result, kN/m²
    wind_region?: string|number;   // Core1 climate result
    wind_load?: number;            // Core1 climate result, kPa/kN/m² contract required
    terrain_type?: string;         // ProjectInput.other.terrain_type, AUTO
  };
  wallSystem: {
    system: string;                // ProjectInput.envelope.wall_system, AUTO
    cladding: "COLD_PROFNASTIL"|"INSULATED_SANDWICH"|"UNKNOWN";
    insulation?: { thickness_mm?: number; material?: string; status: string };
  };
  roofSystem: {
    covering: string;              // ProjectInput.envelope.roof_covering, AUTO
    deck_grade: string;            // ProjectInput.envelope.roof_deck_grade, AUTO
  };
  openings: ProjectOpening[];      // detailed ProjectInput records, AUTO
  frameGrid: {
    effective_frame_step_m: number;// Core1 result, AUTO
    frame_count: number;           // Core1 result/derived proven geometry, AUTO
    frame_positions_m?: number[];  // derived, AUTO
  };
  responsibility: 0.8|1.0;        // ProjectInput/Core1, AUTO
  enclosureOverrides?: Record<string, unknown>; // explicit ENGINEERING_OVERRIDE
}
```

Every field must carry a source classification in the eventual implementation:

| Source class | Meaning |
|---|---|
| `AUTO` | derived from ProjectInput or proven Core1Result; user does not re-enter it |
| `LEGACY_MANUAL` | manual value preserved because Excel semantics are manual/opaque |
| `ENGINEERING_OVERRIDE` | explicit override with reason and audit trail |
| `UNKNOWN` | not enough evidence; must not be silently defaulted |

`projectInputToEnclosureInput()` must reject or diagnose missing/unknown
engineering facts rather than inventing wall geometry. It must not recalculate
Core1 frame profiles, D8/D9, purlin selection, or D69.

## 4. Draft `ColdEnclosureResult` contract

```text
ColdEnclosureResult
├── wallGirts
│   ├── sideWalls
│   └── endWalls
├── wallStuds
├── facadePosts
├── openingFraming
├── wallSheet
├── roofSheet
├── brackets
├── fasteners
├── trims
├── diagnostics
├── provenance
└── totals
```

Each structural line item should be representable as:

```text
EnclosureLineItem {
  component: WALL_GIRT | WALL_STUD | FACADE_POST | OPENING_JAMB |
             SHEET | BRACKET | FASTENER | TRIM;
  wall_zone: SIDE_WALL | END_WALL | ROOF | OPENING | PROJECT_WIDE;
  profile_or_product: string | null;
  section_type: string | null;
  single_or_paired: SINGLE | PAIRED | NOT_APPLICABLE | UNKNOWN;
  step_m: number | null;
  rows: number | null;
  quantity: number | null;
  length_m: number | null;
  unit_mass_kg_m: number | null;
  mass_kg: number | null;
  selection_status: PROVEN | MANUAL | ENHANCED | PARTIAL | UNKNOWN;
  source: ProvenanceRef[];
  diagnostics: DiagnosticRef[];
}
```

`totals` must keep mass and quantity totals separate by zone and component;
commercial price is downstream and must not be hidden inside mass fields.

## 5. Provenance model

Future enclosure outputs need to support:

```text
EvidenceStatus =
  LEGACY_PROVEN | REAL_PROJECT_VALIDATED | ENHANCED | MANUAL |
  PROJECT_SPECIFIC | PARTIAL | UNKNOWN

ProvenanceRef = {
  status: EvidenceStatus;
  sourceWorkbook?: string;
  sourceSheet?: string;
  sourceCell?: string;
  projectId?: string;
  formula?: string;
  fixtureId?: string;
  sourceHash?: string;
  notes?: string;
}
```

Parallel-AI findings are `UNKNOWN` until linked to source workbook/sheet/cell,
formula or a reproducible fixture. File-name similarity is not compatibility
evidence.

## 6. Domain terminology and ownership

| Concept | Meaning | Owner |
|---|---|---|
| Main frame column | primary portal column selected by Core1 frame branch | Core1 |
| Wall girt / wall rail | horizontal cold-wall member carrying cladding | EnclosureCore |
| Wall stud | vertical wall member in enclosure system | EnclosureCore |
| Facade post | end-wall/facade vertical member; not automatically a wall stud | EnclosureCore, evidence required |
| Opening jamb | vertical/horizontal framing around gate/door/window opening | EnclosureCore |
| Side wall | longitudinal wall zone | EnclosureCore |
| End wall | gable/facade wall zone | EnclosureCore |
| Cold profnastil | uninsulated sheet/cladding branch | EnclosureCore |
| Insulated sandwich | sandwich-panel branch with different product/fastener logic | EnclosureCore |
| Roof deck/covering | roof inputs already consumed by Core1 purlin path | Core1; roof-sheet extension later |

No implementation may collapse these concepts into a generic “стойка”.

## 7. Evidence intake area

The repository now reserves `docs/enclosure/evidence/` for source-backed
findings. Its index must record category, source, provenance, status and
whether the finding is safe to implement. Required categories are:

- wall-girt catalogue;
- wind calculation;
- single/paired sections;
- `Без стоек` and duplicate Pred moment semantics;
- upper/lower girts;
- openings;
- real-project fixtures;
- profnastil;
- fasteners and brackets.

No imported parallel-AI result becomes `LEGACY_PROVEN` merely by being copied
into this directory.

## 8. Real-project fixture schema

Original XLSX/PDF archives stay outside Git. A fixture may contain only the
minimum reproducible inputs and source references:

```json
{
  "schema_version": "1.0.0",
  "projectId": "21640",
  "source": {
    "archive": "external archive reference",
    "driveFileId": "optional external id",
    "classification": "CLEAN_SPRINT",
    "sourceHash": "optional sha256"
  },
  "geometry": {"span_m": 12, "length_m": 18, "height_m": 3},
  "enclosure": {"cladding": "COLD_PROFNASTIL", "wallSystem": "source-backed key"},
  "expected": {},
  "evidenceLevel": "GOLDEN_A"
}
```

Fixture classes:

- `GOLDEN_A`: source selection and result workbook/formulas are available;
  expected values are traceable.
- `GOLDEN_B`: real result is available with enough provenance for selected
  outputs but not full formula replay.
- `REFERENCE_ONLY`: useful project context, not an assertion fixture.

An empty `expected` object is valid for a reference-only intake; expected
values must never be invented to make a test pass.

## 9. Core1 / EnclosureCore / Core2 boundaries

Core1 owns canonical climate resolution, frame selection, effective frame step,
frame count, purlins, secondary structural components, frozen legacy opening
mass and its own diagnostics. EnclosureCore owns wall-cladding geometry,
wall-girts, studs, facade posts, opening framing, sheets, brackets, fasteners
and trims. Core2 combines proven outputs into BOM, weight and commercial logic;
it must not duplicate either engineering selector.

## 10. Recommended implementation order

Evidence changes the naive order slightly. First establish the input/result
contracts and fixture harness, then implement only evidence-backed branches:

1. basic cold-wall geometry and zone model;
2. source-backed wall-girt manual replay;
3. wind calculation and automatic wall-girt selection;
4. cold profnastil quantities;
5. single/paired section semantics and wall rows;
6. opening framing (only after gate/door/window side and dimensions are proven);
7. brackets and fasteners;
8. facade posts / vertical studs;
9. trims;
10. roof sheet extension, only after confirming it does not duplicate Core1 roof
    purlin/deck logic.

No engineering formula should be implemented before its evidence status is at
least `LEGACY_PROVEN`, `REAL_PROJECT_VALIDATED`, or explicitly approved
`ENHANCED` with a separate parity label.

## 11. Evidence still required

Before wall-girt engineering implementation, obtain and provenance-link:

- authoritative wall-girt catalogue and section unit masses;
- wind formulas, coefficients, terrain and zone semantics;
- single/paired and `Без стоек` rules;
- upper/lower row and step rules;
- wall side vs end-wall geometry formulas;
- cold profnastil product/thickness/overlap rules;
- brackets, fasteners and trims catalogues;
- opening wall-side and jamb/header semantics;
- at least one `GOLDEN_A` and one `GOLDEN_B` real project where available.

## Final status

```text
CORE1_ENCLOSURE_BOUNDARY = PROVEN
ENCLOSURE_INPUT_CONTRACT = READY
ENCLOSURE_RESULT_CONTRACT = READY
REAL_PROJECT_FIXTURE_SCHEMA = READY
SAFE_TO_IMPLEMENT_ENCLOSURE_CORE_SKELETON = YES
SAFE_TO_IMPLEMENT_WALL_GIRT_ENGINEERING = NO
PRODUCTION_CODE_CHANGED = NO
NEXT_STAGE = import source-backed enclosure evidence, then freeze fixture corpus
```

