# Structural scheme evidence boundary

## Proven source observations

The archived calculator workbooks contain two recurring construction branches:

- `SPRINT` — ordinary Sprint branch;
- `SPRINT_WITH_TIE` — Sprint branch with the historical tie construction.

Across the audited workbook pairs, the branches differ in more than the profile label (`ПГС-сигма` versus `ПГС-S`). Observed differences include frame step, frame count, beam formulas, purlin quantities, secondary steel and total mass/price paths. Therefore the profile text is retained as provenance only and is not used as an implicit selector.

## Current implementation boundary

`ProjectInput.construction_scheme` is now an explicit, validated input and is preserved by the ProjectInput → Core1Input adapter. Existing files that omit the field default to `SPRINT` for backward compatibility.

The `SPRINT_WITH_TIE` engineering calculation is not yet implemented. No production selector, frame formula, purlin formula, secondary-steel formula or price/mass formula may infer this branch until its source tables and formulas are exported and independently checked.

## Required evidence before implementation

For each supported span and at least one ordinary/tie workbook pair, capture the source cell/formula/value for frame step, frame count, primary frame, purlin, secondary steel, mass and price. The resulting fixture must preserve workbook provenance and distinguish raw labels from the canonical scheme.