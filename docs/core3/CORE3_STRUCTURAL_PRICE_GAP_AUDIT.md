# Core 3 structural price gap audit

Status: `PURLIN_PRICE_PATH_IMPLEMENTED`, proven gable frame-price subset
implemented; secondary and unproven frame branches remain explicitly unknown.

## Scope

This note separates exact catalogue evidence from the still-unproven commercial
quantity contract for Core 1 structural results. It does not change Core 1
formulas, XLSX files, or the current Core 3 result status.

## Proven purlin price path

The full 1C catalogue is `src/core3/data/profile-price-catalog-v1.json`,
extracted from `ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx`:

- SHA-256: `2f3a9ea415801dc4a93d6c4e3a1f95f95d429c8fd6100cd5d459806ec11433fe`;
- sheet/range: `TDSheet!B1:J1746`;
- effective date: `2026-09-23`;
- unit for the profile rows: `m`.

The catalogue contains exact rows for the purlin families already emitted by
Core 1, including both steel branches. Examples:

| Core 1 result | Exact 1C mark | Code | Price | Mass |
|---|---|---:|---:|---:|
| `2ПС 195х45х1,5`, `М.п.390` | `ПС 195х45 без перфор. 1,5 П390 (Оцинк.)` | `119104` | 525 руб./m | 3.5396 kg/m |
| `2ПС 195х45х1,5`, `М.п.350` | `ПС 195х45 без перфор. 1,5 П350 (Оцинк.)` | `1175` | 525 руб./m | 3.5396 kg/m |
| `2ПС 200х65х1,5`, `М.п.350` | `ПС 200х65 без перфор. 1,5 П350 (Оцинк.)` | `1180` | 594 руб./m | 4.0721 kg/m |
| `2ПС 200х65х1,5`, `М.п.390` | `ПС 200х65 без перфор. 1,5 П390 (Оцинк.)` | `119107` | 594 руб./m | 4.0721 kg/m |
| `2ПС 150х65х1,5`, `М.п.350` | `ПС 150х65 без перфор. 1,5 П350 (Оцинк.)` | `1171` | 508 руб./m | 3.4848 kg/m |
| `2ПС 150х65х1,5`, `М.п.390` | `ПС 150х65 без перфор. 1,5 П390 (Оцинк.)` | `119103` | 508 руб./m | 3.4848 kg/m |

The exact commercial conversion for a paired purlin is:

```text
material_length_m = purlin_weight_kg / mass_kg_per_m
line_cost = material_length_m × price_per_unit
```

`purlin_weight_kg` is the total mass of the selected purlin assembly. For an
explicit `2ПС` pair, the catalogue mass is the mass of one profile per metre,
so the pair is already represented by the total mass; multiplying the ratio by
two would double-count the material.

The conversion must be implemented only after the resolver validates the
explicit profile/steel mapping and the mass basis. It must not use nearest
profiles, fuzzy text matching, or a fallback price.

## What is not proven yet

Core 1 exposes exact frame marks such as `ПГС300/20х80х3` and `ПГС300/20х80х2`.
The 1C catalogue uses a different naming family (`ПГС 300х80...`, without the
same slash/section notation). A generic string normalizer would therefore be
an engineering assumption. Until an explicit source-backed alias table and
mass/quantity contract are audited, the following remain `UNKNOWN_COST`:

- unobserved or one-slope main-frame branches and ТПГС variants;
- ties, plates, bracing and other Core 1 structural members whose commercial
  quantities are not exposed as a proven takeoff contract.

This is not a statement that prices do not exist in the 1C workbook; it is a
statement that the exact mapping from Core 1 result to a commercial line is
not yet proven.

## Implemented boundary

`resolveCore3PurlinPrice` now emits a `PURLIN` line when the Core 1 result
matches the closed alias table and exposes a positive total mass. The line
preserves the exact TDSheet provenance and computes material metres from the
catalogue mass basis. Unknown marks return `CORE3_PURLIN_PRICE_NOT_PROVEN`.

## Required next implementation boundary

The purlin and proven gable-frame resolvers are implemented. The next safe
boundary is to add secondary-material lines only after each component has an
explicit quantity formula and exact catalogue mark. Extend the closed frame
alias table only after additional ПГС/ТПГС labels and their corresponding
quantity contracts are proven from real-project outputs.

The adapter must emit typed `UNKNOWN_COST` diagnostics instead of fabricating
prices. Existing Core 1 values (`D68`, `D69`, profile selection and masses)
must remain unchanged.
