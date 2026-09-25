# Sprint M — Core 1 → Core 2 → Core 3 roadmap

This is the implementation order for the online preliminary-price calculator.
The layers are deliberately separated: a downstream layer may consume only
the typed, evidence-backed result of the preceding layer.

## Core 1 — structural calculation

**Goal:** reproduce the proven structural part of the legacy calculator.

Scope:

- ProjectInput and exact domain validation;
- climate and normative branch resolution;
- frame selection, geometry and frame count;
- beams, columns, purlins and secondary steel;
- proven window branch and typed legacy diagnostics;
- structural summary, mass and D69-compatible result;
- automatic connection/BOM branch where parity is proven.

Completion gate:

- supported-domain matrix is explicit;
- 22318, 22316 and 22329 remain real-project references;
- 24 m and other legacy-error paths return typed diagnostics;
- no speculative fallback or silent nearest-value substitution;
- Core1 result contract is frozen and regression-tested.

Current state: **structural parity proven for the reference projects; Core 1
is not yet frozen**. Remaining work includes the documented manual-step,
24 m boundary and unresolved legacy presentation branches.

## Core 2 — enclosure calculation

**Goal:** calculate the building envelope independently from the structural
core, then expose typed mass/quantity results to the commercial layer.

Implementation order:

1. Freeze the Core1 → Core2 adapter and provenance contract.
2. Complete cold profiled-sheet geometry for SIDE and END walls.
3. Complete proven automatic/manual wall-girt selection where applicable.
4. Encode the explicit sandwich-panel mounting direction. For the confirmed
   `SANDWICH_PANEL + HORIZONTAL` operational branch, do not select structural
   PS wall girts unless a project explicitly supplies a proven exception.
5. Implement sandwich panels, joints, trims, fasteners and opening framing
   from source-backed rules; keep unknown components typed until proven.
6. Add vertical sandwich and special-opening branches only after evidence is
   available.
7. Produce mass and quantity outputs with no fabricated zeros for unresolved
   components.

Completion gate:

- cold profiled-sheet and supported sandwich branches have source-backed
  formulas and fixtures;
- SIDE/END geometry and opening semantics are explicit;
- unsupported branches return typed diagnostics;
- Core2 mass/quantity contract is regression-tested independently of prices.

Current state: **partial (restricted cold profiled-sheet path proven)**.
The horizontal-sandwich wall-girt semantic is recorded, and the no-opening
profiled-sheet branch now replays quantities plus all available unit masses.
Generic ridge-seal mass, openings, broader panel parity and commercial pricing
are not finished.

## Core 3 — bill of materials and price

**Goal:** reproduce the legacy material quantities and calculate a preliminary
  commercial price from Core1 and Core2 results.

Implementation order:

1. Freeze Core1/Core2 output schemas and component identities.
2. Build a versioned local price/reference dataset from the approved workbook;
   preserve source workbook hash, sheet, cell/range and effective date.
3. Map every BOM component to a canonical product key and unit.
4. Implement quantity aggregation, waste/rounding rules and price lookup.
5. Separate engineering mass from commercial quantity and price.
6. Add historical workbook fixtures and price-regression scenarios.
7. Expose typed diagnostics for missing, ambiguous or stale prices.

Core 3 must not alter Core1/Core2 engineering results. Updating prices must
change only the commercial projection and must be traceable to the selected
price dataset version.

Current state: **not started as an implementation layer**. Price-workbook
audits exist, but no final commercial contract is frozen.

## Order and stop rules

- Do not start Core 3 implementation before the Core1 and Core2 output
  contracts are frozen.
- Do not use a price workbook to fill an unresolved engineering quantity.
- Do not infer panel orientation, wall-girt necessity or opening position from
  a product label alone.
- Preserve legacy errors as typed results; never replace them with zero,
  nearest lookup, extrapolation or an undocumented fallback.
- Source XLSX files remain read-only.

## Next execution target

Finish the smallest source-proven Core2 end-to-end branch (cold profiled sheet,
SIDE/END geometry, no openings), then add the first complete sandwich-panel
quantity branch. After the Core2 contract is frozen, begin the Core3 BOM/price
dataset and lookup layer.
