# Cold Enclosure Core skeleton report

Режим: contract/skeleton only. Engineering formulas, wall-girt catalogs,
wind selection, `+ стойки`, duplicate Pred semantics, Core1 and XLSX/PDF were
not changed.

## Files created

```text
src/enclosure/types.ts
src/enclosure/provenance.ts
src/enclosure/diagnostics.ts
src/enclosure/inputAdapter.ts
src/enclosure/calculateColdEnclosure.ts
src/enclosure/index.ts
src/enclosure/enclosure.test.ts
docs/enclosure/evidence/EVIDENCE_MANIFEST.md
```

The previous architecture checkpoint is committed separately as:

```text
16e50cb docs: define cold enclosure architecture
```

The skeleton itself is intentionally uncommitted and has not been pushed.

## Contracts implemented

- `ColdEnclosureInput` preserves literal geometry, project climate, wall/roof
  selections, detailed openings, responsibility and an explicit frame-grid
  context.
- `projectInputToColdEnclosureInput()` derives from the existing `ProjectInput`;
  it does not create a second UI state model or reduce openings to Core1
  legacy counts.
- `EnclosureStructuralContext` is a small public boundary. It contains only
  effective frame step, frame count, optional positions and provenance; the
  enclosure module does not import Core1 resolver internals.
- `ColdEnclosureResult` keeps wall girts, wall studs, facade posts, opening
  framing, sheets, brackets, fasteners and trims as separate concepts.
- `ColdEnclosureFixture` represents `GOLDEN_A`, `GOLDEN_B` and
  `REFERENCE_ONLY` source classes without committing original archives.

## Zero-engineering behavior

`calculateColdEnclosure()` is callable and deterministic, but every engineering
section returns empty items with an explicit `UNKNOWN`/unsupported diagnostic.
It does not fabricate profiles, rows, quantities, lengths, masses or costs.

Totals distinguish:

- `knownMass_kg = 0` as currently calculated known mass;
- `unknownMassComponents` for all unimplemented components;
- `knownCost = null`;
- `unknownCostComponents` for all commercial components.

Thus unknown is not represented as a physically absent zero.

## Diagnostics and provenance

Typed diagnostics include:

```text
ENCLOSURE_RULE_NOT_IMPLEMENTED
ENCLOSURE_SOURCE_EVIDENCE_MISSING
ENCLOSURE_WALL_GIRT_NOT_PROVEN
ENCLOSURE_OPENING_FRAMING_NOT_PROVEN
ENCLOSURE_STUD_RULE_NOT_PROVEN
ENCLOSURE_INPUT_INVALID
```

Provenance supports `LEGACY_PROVEN`, `REAL_PROJECT_VALIDATED`, `ENHANCED`,
`MANUAL`, `PROJECT_SPECIFIC`, `PARTIAL` and `UNKNOWN`, with workbook/sheet/cell,
formula, project/fixture identifiers and notes. The skeleton assigns
`UNKNOWN`; it cannot claim legacy proof.

## Evidence manifest

`docs/enclosure/evidence/EVIDENCE_MANIFEST.md` records only safe high-level
facts. Parallel-AI findings are not promoted to proven rules without source
provenance. No current wall-girt engineering rule is implementation-ready.

## Tests

Six enclosure tests cover:

1. ProjectInput projection;
2. literal geometry preservation;
3. wall state separation from Core1 aggregates;
4. detailed opening preservation;
5. deterministic unknown engineering diagnostics;
6. zero-vs-unknown totals and serializable provenance.

Core1 regression tests remain unchanged.

## Validation

```text
npm test                         205 passed
npm run typecheck               pass
npm run build                   pass
py -m pytest ...integrity.py    26 passed
git diff --check                pass
```

## Final status

```text
ENCLOSURE_CORE_SKELETON = READY
PROJECTINPUT_TO_ENCLOSURE_ADAPTER = READY
PROVENANCE_INFRASTRUCTURE = READY
REAL_PROJECT_FIXTURE_INFRASTRUCTURE = READY
WALL_GIRT_ENGINEERING_IMPLEMENTED = NO
ENCLOSURE_NUMERIC_ENGINEERING_IMPLEMENTED = NO
CORE1_RESULTS_CHANGED = NO
SAFE_TO_IMPORT_SOURCE_BACKED_RULES = YES
NEXT_STAGE = SOURCE_BACKED_ENCLOSURE_EVIDENCE_IMPORT
```

