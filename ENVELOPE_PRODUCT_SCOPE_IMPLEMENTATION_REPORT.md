# Envelope Product Scope — Phase 1 Implementation Report

Status: implemented locally; no commit or push performed.

## Contract

`ProjectInput` now carries an explicit `envelope.system` and `supply.scope`.
The exact product mapping is:

- `профлист` → `PROFILED_SHEET_COLD`;
- every enumerated `С-П ...` covering → `SANDWICH_PANEL`;
- every enumerated `наше ...` covering → `INSI_BUILT_UP_PANEL_LEGACY`.

The existing `roof_covering` value remains unchanged because it is still a
Core 1 compatibility input. A semantic mismatch is rejected; values are never
rewritten. Legacy INSI is retained in the type union, but a new-project
adapter call returns `UNSUPPORTED_LEGACY_ENVELOPE`. Explicit
`LEGACY_REPLAY` mode is available for historical imports.

## Project files

Serialized files are now v2. The parser accepts v1 and v2. A v1 file is
migrated without recalculation: `envelope.system` is inferred from the exact
`roof_covering` label and `supply.scope` is set to `null` because v1 contains
no proven commercial-scope value. v2 requires the explicit fields and their
semantic consistency.

## Adapter boundaries

The Core 1 adapter validates envelope semantics before projection, preserves
the exact legacy covering, and ignores `FRAME_ONLY` versus `FULL_BUILDING` for
Core 1. The Enclosure adapter exposes the semantic system and emits an
explicit unsupported diagnostic for sandwich and legacy INSI systems; no
sandwich calculation or formula change was introduced.

## Verification

Implemented tests cover exact mapping, mismatch rejection, legacy new-project
guard, v1 migration, v2 round-trip/validation, replay mode, supply-scope
non-interference, and the existing structural regressions. Core 1 and
Enclosure engineering formulas were not changed. XLSX files and generated
outputs were not modified by this phase.

| Item | Status |
|---|---|
| Project envelope/supply types | YES |
| Exact D20 semantic mapping | YES |
| Legacy values preserved | YES |
| New-project legacy guard | YES |
| v1 readable and migrated | YES |
| v2 serialization and validation | YES |
| Core 1 projection unchanged by supply scope | YES |
| Sandwich enclosure calculation | NO (explicit unsupported state) |
| Legacy INSI enclosure calculation | NO (replay-only state) |
| Production calculation formulas changed | NO |
| XLSX changed | NO |

Next phase may wire UI selectors and a dedicated enclosure calculation core;
neither is part of this contract-only phase.
