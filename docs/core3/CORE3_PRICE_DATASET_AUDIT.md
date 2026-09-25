# Core 3 price dataset audit

Status: **IMPLEMENTED FOR THE RESTRICTED PROFILED-SHEET PATH**

The first commercial layer consumes a versioned local dataset derived from the
current workbook `Z:\Предварительные расчеты\Калькуляторы\Прайс для предрасчетов (не изменять).xlsx`.
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

The gable trim mapping deliberately uses `Комплектушки!D179`: its unit mass
matches the archived `12м!H76 = 1.662 kg/pc`. The alternative
`Профлист,доборы!E54` is a zero-price row and is not used as a silent fallback.
The ridge seal price is proven, while its physical mass remains unknown because
the archived and current mass cells are blank.

## Runtime boundary

`calculateCore3ProfiledSheetScenario` accepts only a proven Core 2 profiled-sheet
takeoff. It multiplies each resolved quantity by the versioned price and sums
known line costs. Missing wall-girt mapping remains a typed partial result;
there is no generic profile-name or nearest-product fallback.

Not yet supported: openings, sandwich panels, generic `профлист` labels,
unproven wall-girt commercial mappings, and any price outside this dataset.

`PRODUCTION_XLSX_CHANGED = NO`
