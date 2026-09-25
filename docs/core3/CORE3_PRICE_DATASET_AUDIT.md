# Core 3 price dataset audit

Status: **IMPLEMENTED FOR THE RESTRICTED PROFILED-SHEET PATH; PROFILE CATALOG V1 IMPORTED**

The first commercial layer consumes two explicitly versioned local sources:
the working preliminary-price workbook
`Z:\Предварительные расчеты\Калькуляторы\Прайс для предрасчетов (не изменять).xlsx`
and the full 1C profile catalog `ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx`.
The workbook was read-only; it was not copied into the application and was not
modified. Dataset provenance is recorded in
`src/core3/data/price-dataset-v1.json`.

## Proven mappings

| Runtime product | Source | Price/unit | Unit |
|---|---|---:|---|
| `С-18 0,5мм` | `Профлист,доборы!E7`, name `B7`, unit `F7` | 794.65 | m² |
| `С-44 0,7мм` | `Профлист,доборы!E15`, name `B15`, unit `F15` | 691.98 | m² |
| `С-44 0,7 оц` | same exact source row 15 | 691.98 | m² |
| `Конек плоский (2м)` | `Профлист,доборы!E53` | 321 | pcs |
| `Фронтон (2м)` | `Комплектушки!D179` | 529 | pcs |
| `Уплотнитель (2м)` | `Профлист,доборы!E57` | 612 | pcs |
| `Саморез 4,8x20` | `Перекупные!F50` | 2.346 | pcs |
| `Уголок 50х50 нар` | `Профлист,доборы!E50` (archived chain `12м!E40 → E39`) | 640 | pcs |
| `ПП 145x45 без перфор. 1,5 П390 (Оцинк.)` | `ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx!TDSheet!G927` | 396 | m |
| wall-girt bracket angle | archived `21874.xlsx!12м!E38 → Профлист,доборы!E79`; full 1C `TDSheet!G861` | 2278 | m |

Every entry in `price-dataset-v1.json` carries its own workbook, SHA256, and
effective date in addition to dataset-level provenance. This keeps the 1C
wall-girt row distinct from the legacy preliminary-price rows at runtime.

The full 1C profile catalog is stored separately in
`src/core3/data/profile-price-catalog-v1.json`. It contains 735 exact source
rows with pogonny-metre units, 731 rows with source mass, and four source rows
whose mass cell is blank. The catalog source is the workbook dated
`2026-09-23`, SHA256
`2f3a9ea415801dc4a93d6c4e3a1f95f95d429c8fd6100cd5d459806ec11433fe`.
The detailed coverage and category counts are recorded in
`docs/core3/CORE3_PROFILE_PRICE_CATALOG_AUDIT.md`.

The gable trim mapping deliberately uses `Комплектушки!D179`: its unit mass
matches the archived `12м!H76 = 1.662 kg/pc`. The alternative
`Профлист,доборы!E54` is a zero-price row and is not used as a silent fallback.
The ridge seal price is proven, while its physical mass remains unknown because
the archived and current mass cells are blank.

## Runtime boundary

`calculateCore3ProfiledSheetScenario` accepts only a proven Core 2 profiled-sheet
takeoff. It multiplies each resolved quantity by the versioned price and sums
known line costs. The outer-corner trim is now mapped to the archived exact
chain `12м!E40 → 12м!E39 → Профлист,доборы!E50 = 640 ₽/шт`. The wall-girt
bracket angle uses the separately proven `C38 = bracketCount × 0.2 m`
conversion and full-1C row `TDSheet!861 = 2278 ₽/m`;
there is no generic profile-name or nearest-product fallback.

Engineering Preview now exposes the same restricted commercial result in the
Enclosure tab after selecting `Холодный профнастил` and calculating the
project. The UI shows each line, known total, dataset version/date and all
unknown-cost diagnostics; an unknown amount is never rendered as zero.

Not yet supported: openings, sandwich panels, generic `профлист` labels, and
any price outside this dataset.

Core 1 roof purlins use a separate closed alias table. Their commercial metres
are derived from the Core 1 total purlin mass and the exact catalogue mass per
metre. Observed gable-frame PGS labels now use a closed exact alias table and
the audited beam/column quantity formulas. TPGS, one-slope, unobserved frame
labels and secondary members are not silently mapped from similar-looking
catalogue names; they remain typed `UNKNOWN_COST` until exact aliases and
commercial quantities are proven.

`PRODUCTION_XLSX_CHANGED = NO`
