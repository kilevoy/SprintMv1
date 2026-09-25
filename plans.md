# Sprint M — CORE 1 PURLIN_DECK_GAP

## Product-layer roadmap

The implementation order is fixed in
[`ROADMAP_CORE1_CORE2_CORE3.md`](ROADMAP_CORE1_CORE2_CORE3.md): finish and
freeze Core 1, complete the evidence-backed Core 2 enclosure branches, then
start Core 3 BOM and price calculation. Core 3 must not repair or reinterpret
engineering outputs from the preceding cores.

## Current execution overlay — proven legacy climate/frame pipeline

Objective: connect the proven canonical-climate → legacy-derived-climate → legacy-frame-branch chain without changing canonical climate semantics or source XLSX files.

Milestones:

1. **L1 — Static legacy datasets** `[x]`
   - Preserve roof correction rows, ordered `AB5:AH58`, and `AJ11 → V7` rows including duplicate keys and text/error rows.
2. **L2 — Excel MATCH compatibility** `[x]`
   - Characterize the exact approximate binary lookup behavior against Excel COM and encode regression cases.
3. **L3 — Runtime pipeline** `[x]`
   - Add `LegacyClimateDeriver` and `LegacyFrameBranchResolver`; keep canonical `ClimateResolver` unchanged; pass mapped branch to `FrameSelector`.
4. **L4 — Real-project verification** `[~]`
   - Protect 22318 and 22316, rerun 22329, and stop at the next first divergence rather than repairing downstream logic.

Definition of done for this overlay: legacy branch datasets and matcher are characterized, 22318/22316 remain exact, 22329 beam parity is restored, and the next unresolved divergence is reported.

## Objective

Close the proven legacy chain `roof_deck_grade -> deck lookup -> maximum purlin step -> purlin selection` without changing source XLSX files or beginning Core 2.

## Milestones

1. **M1 — Source mapping**
   - Reuse the completed `CORE1_ROOF_INPUT_AUDIT.md`.
   - Bind the local deck matrix and the audited `вывод!W11:W63` step axis.
   - Preserve typed legacy `#REF!` behavior for 500 mm.
2. **M2 — Runtime closure**
   - Implement exact deck-key/header lookup and Excel-compatible descending lookup.
   - Apply deck limit, configured/manual inputs, minimum step, and deterministic purlin selection.
   - Expose trace fields needed for verification.
3. **M3 — Verification and docs**
   - Add Scenario A/B, baseline, parameterized deck, unknown-deck, determinism, and trace tests.
   - Run the requested quality gates.
   - Update the audit and Core 1 README with the closed status.
4. **M4 — Repository integrity and UI refinement**
   - `[x]` Diagnose exact static dataset byte mismatch before touching UI.
   - `[x]` Add dataset line-ending policy and restore only affected bytes from `HEAD`.
   - `[x]` Add local city autocomplete and explicit climate status.
   - `[x]` Refine roof/deck and wall inputs without changing Core 1 wall semantics.
   - `[x]` Expose safe purlin deck/step result context and add UI regression tests.
5. **M5 — ProjectInput architecture**
   - `[x]` Introduce one domain-level ProjectInput for the UI.
   - `[x]` Add explicit Core1InputAdapter and preserve Core1Input semantics.
   - `[x]` Replace legacy opening counters with stable-ID detailed opening records.
   - `[x]` Add dynamic gate, door, window, and strip-window editing.
   - `[x]` Document the Core 1/Core 2 adapter boundary and unresolved gate dimension proof.

## Constraints

- Do not edit XLSX files.
- Do not invent a structural formula or silently replace legacy values.
- Do not implement Core 2, UI redesign, commit, or push.
- For this phase, UI changes are limited to presentation/state; do not alter proven Core 1 engineering formulas.

## Sprint archive validation pilot

1. **P1 — Master and archive schema** `[x]`
   - Fix the input/output cell map and provenance rules in `tools/sprint_archive_validation/config.py`.
   - Document the master template and archive extraction schemas.
2. **P2 — Extract and classify a bounded pilot** `[x]`
   - Recursively scan only unique `*_SOURCE_SELECTION.xlsx` candidates under the local reference archive.
   - Extract typed inputs and archive outputs without guessing missing fields.
3. **P3 — Excel COM replay** `[x]`
   - Replay each pilot input in a temporary copy of the master template with `CalculateFullRebuild()`.
   - Stop before mass processing if 22318 or 22316 fails the known D69 references.
4. **P4 — Database/report package** `[x]`
   - Produce CSV, JSON, HTML, and `SPRINT_VALIDATION_DATABASE.xlsx` outputs.
   - Keep 22326 visible as a compatibility case and report missing/unproven fields.
5. **P5 — Mass archive pass** `[ ]`
   - Requires successful pilot review and a separate explicit user command.

### Pilot constraints

- Expanded pilot scope is limited to 13 unique workbooks: the four known references plus nine unseen Sprint candidates selected from Drive/local staging.
- Do not modify source XLSX, master template, Core 1, commit, or push.
- `frame_count`, absolute `frame_total_kg`, and absolute `secondary_mass_kg` remain NULL until a canonical source cell is proven.

### Expanded pilot result (2026-09-17)

- 13 unique projects scanned: 4 known references and 9 new unseen candidates.
- The four standard source-selection books parsed and replayed; 22318, 22316, and 22329 remain `FULL_MATCH`; 22326 remains the documented compatibility case.
- All nine new Drive result workbooks are recognized Sprint layouts but lack the standard `вывод` input/output sheet. They are retained as `NOT_COMPARABLE / UNSUPPORTED_ARCHIVE_LAYOUT` with NULL inputs, outputs, and replay values.
- The archive pipeline now records `reference_class`, Drive title/geometry metadata, layout flags, and the requested project comparison columns.
- `READY_FOR_MASS_RUN = NO`: no new unseen workbook reached automatic input extraction and replay, so the mass-run readiness criteria are not met.

### SOURCE ↔ RESULT pair search (2026-09-17)

- Added `pair_search.py` with a workbook fingerprint for `вывод`, `подбор`, `снегветер`, and the span-family sheets. Result workbooks are never used as input sources.
- Inspected all nine new project folders and ran a global Drive search for the exact master-template filename.
- Found and verified a source-selection candidate for `22285`; its result sheet matches project ID `22285`, city `Коркино`, and geometry `18x48x6`.
- Replayed the verified `22285` source against the master template: `FULL_MATCH`, `D69 = 27.53232638888889`.
- Eight new projects remain `RESULT_WORKBOOK_ONLY`; their result files are retained for downstream BOM/result validation.

## Accepted parity roadmap (2026-09-18)

Progress is tracked by evidence-backed milestones, not by a percentage.

### Milestone status

- **M1 — Frame selection parity:** `PROVEN FOR REFERENCES`.
- **M2 — Structural D69 parity:** `PROVEN` for 22318, 22316, and 22329.
- **M3 — Connection/BOM parity:** `MODEL COMPLETE / REFERENCE PARITY PROVEN` for automatic 9–21 m; manual and 24 m remain outside the proven domain.
- **M4 — Supported-domain regression matrix:** `PARTIAL`.
- **M5 — Core1 frozen:** `NOT READY`.
- **M6 — Core2 source parity:** `PARTIAL`.
- **M7 — Full proposal parity:** `NOT READY`.

### Critical path

1. Protect the corrected shared-formula proof and reproducible 599-row connection dataset; do not regress to project-scoped cached snapshots.
2. Expand the automatic 9–21 m regression matrix across design families, factors, height bands and branch keys, including the two preserved lookup anomalies.
3. Audit the manual frame-step selector separately; do not extrapolate automatic `Y2=1` semantics into that branch.
4. Preserve 24 m connection `#N/A` as a typed legacy boundary until a different source is proven.
5. Expand validation using two evidence levels:
   - `FULL PARITY`: source-selection workbook available; inputs, formulas, branches, and outputs can be replayed.
   - `EXPRESS VALIDATION`: result workbook only; observable profiles, masses, BOM, and totals can be checked, but the internal formula path is not proven.
6. Audit only registry entries marked `PARTIAL` or `UNVERIFIED`; retain `PROVEN`, `LEGACY_ERROR`, and `OUT_OF_SCOPE` classifications.
7. Freeze the Core1 → Core2 contract with `provenance`, `diagnostic_behavior`, `supported_domain`, `nullable`, and `fallback_allowed` metadata.
8. Close Core2 external sources, preserve `*0` branches, then implement Core2.
9. Track final validation independently as `STRUCTURAL_PARITY`, `CONNECTION_BOM_PARITY`, `CORE2_BOM_PARITY`, and `COMMERCIAL_PARITY`.

### Cached connection data disposition

- `D48:E49` and `D56:E56` in `bolts_plates_fittings.csv`: `PROVEN_STATIC`.
- `D52:E52`, `D53:D55`, and `D57`: `DEPRECATED_PROJECT_CACHE`; canonical automatic 9–21 m calculation uses `LegacyConnectionResolver` and the versioned full lookup matrix.
- Do not delete or replace cached rows until the resolver passes the reference regression matrix.

## Current enclosure AUTO selector milestone

1. **E1 — Restricted selector core** `[x]`
   - Implement the pure `AutoWallGirtRuntimeInput` selector from the extracted
     no-stud dataset and proven wind/capacity/JW/objective formulas.
2. **E2 — Manual replay handoff** `[x]`
   - Convert the selected candidate to the existing manual replay input; do not
     duplicate quantity or bracket formulas.
3. **E3 — Project wiring** `[ ]`
   - Requires proven side/end wall-height, B11, B13, insulation and filter
     mappings. ProjectInput and UI remain intentionally disconnected.

### Assumptions and stop rules

- `SP_20` and `R=TRUE`/no-stud are the only supported production selector state.
- B12 is not globally mapped to building height; side/end geometry remains a
  future resolver responsibility.
- Stop before wiring if any source-to-ProjectInput mapping is inferred rather
  than proven.

### Validation gates

- `npm test`
- `npm run typecheck`
- `npm run build`
- `py -m pytest core1/tests/test_static_data_integrity.py`
- `git diff --check`
