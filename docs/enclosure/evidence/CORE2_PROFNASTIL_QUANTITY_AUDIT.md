# Core 2 — profiled-sheet quantity audit

Status: **PARTIAL — quantity and most unit masses proven; ridge-seal mass remains unproven**

This is an evidence gate for the Core 2 replay slice. No XLSX was modified;
the isolated `ProfiledSheetTakeoff` module now replays only the source-backed
quantity and unit-mass rows documented below.

## What is proven

The authoritative enclosure workbook
`Калькулятор ограждайки v1.5.xlsx` contains:

- `Лист1!B18 = "профлист"` — product selector/input;
- `Лист1!B19` — selected profiled-sheet mark;
- candidate marks in `Лист1!P87:P92`;
- wall-girt formulas in `Лист1!F49:I50`, already used by the restricted Core 2
  wall-girt path;
- explicit SP20 and v1.5 wall geometry/controller evidence.

These cells prove product selection and structural wall-girt replay only. The
archived result sheets additionally expose the H-column unit masses used by
the legacy BOM.

## Newly confirmed quantity formulas

Archived cold Sprint/AХ books `21874.xlsx` and `21985.xlsx` contain the local
quantity formulas now replayed by `calculateProfiledSheetTakeoff`:

| Output | Source cell | Formula |
|---|---|---|
| wall sheet | `12м!C41` | `(2*span + 2*length)*(height + 0.5)*1.1 + 2*span*1.1` |
| outer corner trim | `12м!C40` | `4*height/2.9` |
| roof deck sheet | `12м!C50` | `span*length*1.1` |
| roof sheet | `12м!C78` | `(span + 0.6)*(length + 1)*1.1` |
| ridge/gable trims | `12м!C74`, `C76` | `CEILING(length/1.9,1)`, `CEILING(2*span/1.8,1)` |
| ridge seal | `12м!C80` | `2*C74` |
| wall/roof fasteners | `12м!C106`, `C137` | `10*C41`, `8*C78` |

## Unit-mass evidence

The same archived rows expose the following H-column values (the E/F columns
are commercial price and line total, not mass):

| Component | Source | Unit mass |
|---|---|---:|
| wall `С-18 0,5мм` | `12м!H41` | 5.3 kg/m² |
| outer corner `Уголок 50х50 нар` | `12м!H40` | 2.3 kg/pc |
| roof deck `С-44 0,7 оц` | `12м!H50` | 7.0 kg/m² |
| roof sheet `С-44 0,7мм` | `12м!H78` | 7.4 kg/m² |
| ridge trim | `12м!H74` | 1.7 kg/pc |
| gable trim | `12м!H76` | 1.662 kg/pc |
| wall/roof screw | `12м!H106`, `H137` | 0.0026 kg/pc |
| ridge seal | `12м!H80` | **blank / unknown** |

The role-specific 7.0 versus 7.4 values are preserved; they must not be
collapsed into one generic C-44 weight.

Runtime applies these weights only to the exact source-backed legacy marks
listed above. A non-empty but unknown profile label still gets a quantity
formula, but its mass is `null` and the typed mass diagnostic lists the label;
no profile-name guess or generic fallback is allowed.

## Price-source cross-check

The current price workbook and the two available price snapshots all contain
`Профлист,доборы!B57 = "Уплотнитель конька (2м)"`, but the corresponding weight
field `G57` is blank. The same absence is present in the archived result rows
`12м!H80` for both 21874 and 21985. Therefore no physical kg/pc value is
available for this line. The legacy line total is zero because the blank mass
multiplied by quantity evaluates to zero; this is not evidence that the seal
has zero physical mass and is intentionally not normalized as such.

A read-only sample of additional cold Sprint/AХ books (`21876`, `21892` and
`21953`, alongside `21873` and `21985`) shows the same pattern where row 80
is the seal line: `G80 = 0` and `H80` is blank. This strengthens the
legacy-zero observation but still does not establish a physical unit mass.

Cross-check workbook SHA256:

`Прайс для предрасчетов (не изменять).xlsx` —
`08ea5728ad901409b651081b849dfb6db2c182c6b71c972224674365c0372b87`.

An independent 1C export (`ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx`) contains weights
for two named sealing profiles (`Banga 50х70` and `Monterrey 40х50`, both
`0.08 кг/шт`), but neither is the generic ridge product named in `12м!C80`.
They therefore cannot be substituted without a proven product mapping.

The two projects reproduce the expected quantities in the source-backed
fixture `profiled-sheet-takeoff-archive-fixture.json`.

## Remaining missing formulas

No source-backed formula has been found for any of the following:

| Component | Required rule | Current status |
|---|---|---|
| wall profiled sheet | area, width/length, overlap, edge trim deductions | QUANTITY PROVEN / SEMANTICS PARTIAL |
| roof profiled sheet | slope area, overlap, end laps, waste | QUANTITY PROVEN / SEMANTICS PARTIAL |
| wall fasteners | type, spacing, quantity, rounding | QUANTITY PROVEN / SEMANTICS PARTIAL |
| roof fasteners | type, spacing, quantity, rounding | QUANTITY PROVEN / SEMANTICS PARTIAL |
| trims/flashings | perimeter/opening/joint rules | PARTIAL |
| openings | sheet-area deduction and trim framing | UNKNOWN |
| product mass | kg/m² or piece mass for proven lines | PROVEN except ridge seal |

The existing evidence explicitly records:

- `PROFNASTIL_RULES.md`: `WALL_AREA_RULE`, `ROOF_AREA_RULE`,
  `WALL_QUANTITY_RULE`, `ROOF_QUANTITY_RULE`, `OPENING_DEDUCTION` are
  `UNKNOWN`;
- `FASTENER_RULES.md`: wall/roof fastener rules, type, area basis and
  rounding are `UNKNOWN`;
- `PROFNASTIL_EVIDENCE.md`: observations from historical BOMs are not a
  universal formula and must not be imported into the runtime.

## Consequence for the requested end-to-end path

The proven path currently ends at:

```text
ProjectInput
 → SIDE/END geometry
 → corner/typical zones
 → wall-girt selection
 → wall-girt quantity and mass
```

It can now continue through quantities and all proven unit masses. The result
remains `PARTIAL` because the source does not provide a ridge-seal unit mass;
the historical wall-girt formulas must not be generalized into cladding
area/procurement logic. The cladding formulas and mass values are implemented
separately and retain their source-cell provenance.

## Required evidence to unblock

Provide at least one source-backed profiled-sheet calculation with:

1. the source workbook and its result/BOM workbook;
2. exact cells/formulas or a documented manual takeoff rule;
3. selected profile width, effective cover width and overlap semantics;
4. separate wall and roof quantity/mass outputs (including H-column unit mass);
5. fastener and trim identities, units and rounding;
6. a no-opening fixture for both SIDE and END, followed by an opening fixture.

Until the ridge-seal mass and opening rules are available, the correct Core 2
result is `PARTIAL` with `ENCLOSURE_MATERIAL_MASS_NOT_PROVEN`; the quantity
lines, proven unit masses, and proven wall-girt result remain usable.

`PRODUCTION_CODE_CHANGED = NO`
`XLSX_CHANGED = NO`
