# Core 3 secondary/commercial BOM audit

## Scope

Read-only extraction from archived result workbooks. The XLSX files were not
modified and the formulas are not copied into Core 1. This audit separates
commercial BOM quantities from the engineering D68/D69 mass calculations.

## Proven commercial rows

The active gable sheets expose a separate commercial section after the main
structural rows. The recurring rows are:

| Role | Typical source row | Formula | Unit |
|---|---|---|---|
| Main beam | `15!C46` / `18!C63` / `12м!C46` | `=2*C8*I17` | m |
| Secondary beam | `15!C47` / `18!C64` / `12м!C47` | span/step-specific formula, e.g. `=(C8/0.9+1)*C9` | m |
| Commercial column | `15!C48` / `18!C65` / `12м!C48` | `=2*3.5*2*(I17-2)` | m |
| Facon plates | `15!C49:C50` or equivalent | derived from beam/column quantities | pcs |
| Fasteners | active sheet fastener rows | derived from bolt/plate rows | pcs |

The main-beam and commercial-column formulas are now implemented in the
closed gable frame resolver. They are not the same formulas as the structural
`вывод!D33:E33` / `D34:E34` quantities used for D68/D69.

## Project observations

The three regression projects use different active span sheets and therefore
different secondary-beam formula branches:

- `22318`: `15!C47 = (C8/0.9+1)*C9`;
- `22316`: `18!C64 = (C8/0.9+1)*C9`;
- `22329`: `12м!C47 = (C8/1.5+1)*C9`.

This proves that the secondary-beam quantity cannot be replaced by a single
generic `span × frameCount` expression.

## Price provenance status

The archived rows point to historical external price cells such as `J19`,
`J20`, `J21` and `E29:E30`. The current full 1C catalogue contains visually
similar PGS/TPGS families, but the exact historical `ПГС-S` commercial marks
and the corresponding external workbook version are not proven equivalent.
The current working dataset also has no exact rows for the `ФС11/ФС14` and
`ФС12` plate labels.

Therefore these lines remain:

- quantity: `PROVEN` for the listed workbook branch;
- price: `UNKNOWN_COST` until an exact source row/code is available;
- no nearest-profile or fuzzy alias is allowed.

## Safe next implementation boundary

Add a secondary commercial resolver only after each branch has:

1. an exact Core1/legacy output label;
2. a source cell and formula for quantity;
3. an exact current or versioned price row with code, unit, SHA-256 and date.

Until then Core3 must expose `secondary-steel` as an unknown component and
must not include an invented amount in `knownCost`.
