# Core3 commercial takeoff reconciliation

## Scope

This report covers the restricted Core2 path `PROFILED_SHEET_COLD` and the
takeoff produced by `calculateProfiledSheetTakeoff`. It reconciles commercial
marks only; it does not change engineering quantities or Core1/Core2 formulas.

## Current line classification

Every emitted commercial line now carries an explicit `costStatus`:
`KNOWN_COST`, `UNKNOWN_COST`, or `UNSUPPORTED`. Unknown prices never enter
`knownCost` and remain visible through `unknownCostComponents`/diagnostics.

| Core2 product | Unit | Status | Source / diagnostic |
|---|---|---|---|
| `С-18 0,5мм` | m² | `KNOWN_COST` | Working preliminary price dataset, `Профлист,доборы!E7` |
| `Уголок 50х50 нар` | pcs | `KNOWN_COST` | Archived `21874.xlsx!12м!E40` caches `640` and its formula is `=E39`; `12м!E39` is sourced from external `Профлист,доборы!E50`. Archive SHA256: `8429b1e91207c2fa047461ba33c2679e4d16434309c0d73057eb460e31e14cca`. The current working price workbook has the same exact `Профлист,доборы!E50 = 640` for a piece. This legacy price row has no 1C code cell; that absence is recorded rather than invented. |
| `С-44 0,7 оц` | m² | `KNOWN_COST` | Working preliminary price dataset, `Профлист,доборы!E15` |
| `С-44 0,7мм` | m² | `KNOWN_COST` | Working preliminary price dataset, `Профлист,доборы!E15` |
| `Конек плоский (2м)` | pcs | `KNOWN_COST` | Working preliminary price dataset, `Профлист,доборы!E53` |
| `Фронтон (2м)` | pcs | `KNOWN_COST` | Working preliminary price dataset, `Комплектушки!D179` |
| `Уплотнитель (2м)` | pcs | `KNOWN_COST` | Working preliminary price dataset, `Профлист,доборы!E57`; mass remains unknown |
| `Саморез 4,8x20 (стены)` | pcs | `KNOWN_COST` | Working preliminary price dataset, `Перекупные!F50` |
| `Саморез 4,8x20 (кровля)` | pcs | `KNOWN_COST` | Same exact source row through explicit alias |
| `[]ПП 145x45x1,5` | m | `KNOWN_COST` | Full 1C profile catalog `TDSheet!G927`; paired quantity is `2 ×` |
| Core 1 roof purlin result (explicit proven alias) | m | `KNOWN_COST` | Core1 total purlin mass divided by exact 1C `mass_kg_per_m`; price line carries the exact profile source row |
| wall-girt brackets | m | `KNOWN_COST` | Archived `21874.xlsx!12м!C38 = G38/0.75*0.2` and `E38 → Профлист,доборы!E79` identify `Угол специальный 90 гр. 2,0 П350 (Оцинк.)`; full 1C `TDSheet!861`, code `852`, gives `2278 ₽/м`. Core3 quantity is `bracketCount × 0.2 m`. |

No current restricted-path line is silently priced by a nearest profile,
price-per-ton conversion, or fuzzy name match. Unsupported envelope systems,
openings, and sandwich panels remain `UNSUPPORTED` outside this path.

## Project regression seeds

`docs/core3/evidence/real-project-commercial-fixtures.json` and
`src/core3/realProjectCommercial.test.ts` exercise the exact commercial marks
for projects 22318, 22316 and 22329. These fixtures validate price resolution
and diagnostic classification; they do not claim that the three historical
books share identical Core2 quantities.

## Remaining gaps

1. Add full end-to-end Core2 commercial fixtures once cold profiled-sheet
   geometry is available for each real project.
2. Core1 roof purlins and the proven gable-frame labels now enter the
   commercial result when their explicit alias and quantity contract are
   present. One-slope/unobserved frame branches and all secondary structural
   commercial quantities remain `UNKNOWN_COST` until their exact contracts are
   added.

`CORE1_FORMULAS_CHANGED = NO`
`CORE2_QUANTITY_FORMULAS_CHANGED = NO`
`XLSX_CHANGED = NO`
