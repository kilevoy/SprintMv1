# Price data provenance audit

## Scope

Read-only audit of the supplied price workbooks. Neither workbook was modified. The current Core 1 calculation path was inspected separately to determine whether changing either workbook can change application output.

## Sources

| Source | Sheet | Role |
|---|---|---|
| `ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx` | `TDSheet` | 1C export supplied by the user; code, price, unit, mass and price-per-ton fields |
| `Прайс для предрасчетов (не изменять) — 23092026.xlsx` | `Вставить из 1с сюда` plus category sheets | Existing calculator price workbook; dated 12.03.2026 |

The stable join key is the numeric 1C nomenclature code. Names are descriptive and are not safe as a primary key because spelling, steel grade and finish qualifiers vary.

## Reconciliation

The prepared code-based comparison reports:

- base workbook: 2,165 unique codes;
- 1C export: 1,617 unique codes;
- common codes: 1,608;
- added in the 1C export: 9;
- absent from the 1C export: 557;
- changed prices: 915 (910 increases, 5 decreases);
- unchanged prices: 693;
- changes of at least 50%: none;
- new export rows without a unit-ton price: 109;
- duplicate codes in either source: none.

These are different dated snapshots, not interchangeable copies. The 109 missing ton prices must be represented explicitly; they must not be silently inferred from another unit or mass.

## Current application behavior

The current Core 1 production graph contains no price catalog, price repository, workbook adapter or price-bearing calculation result. Secondary-steel tests explicitly assert that the result has no `price` property.

**Changing the Excel price workbook currently does not change prices in the web application.** Core 1 currently calculates engineering quantities/masses and compatibility diagnostics. A future commercial-price layer must consume a normalized, versioned dataset; it cannot read an arbitrary workbook at runtime or infer prices from names.

## Required next implementation boundary

Before showing prices to a manager, implement a separate price data layer with:

1. normalized rows keyed by `nomenclatureCode`;
2. explicit units and `pricePerUnit`, `massPerUnit`, `pricePerTon` fields;
3. source workbook, sheet, date and SHA-256 provenance;
4. missing-price and missing-ton-price diagnostics;
5. deterministic mapping from Core1 material/profile labels to 1C codes;
6. regression fixtures for steel, profiled sheet, sandwich panels, fasteners and secondary steel.

Until then, the application must not claim that its engineering result includes current 1C prices.

## Audit conclusion

The supplied 1C export is a valid candidate for the next price-data import, and the workbook on `Z:\Предварительные расчеты\Калькуляторы` is a useful historical calculator snapshot. Neither is connected to the browser-side Core 1 engine. Safe status: `PRICE_DATA_EXTERNAL_NOT_CONNECTED`.
