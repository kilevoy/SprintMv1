# Core 3 frame profile price audit

Status: `PARTIALLY_PROVEN`, not a missing price-file problem.

## Source evidence

The current 1C catalogue contains profile rows in the `ПГС и ТПГС` family,
including exact source rows for `ПГС-сигма 300х80x20` at several thicknesses
and `ПГС 300х80` at several thicknesses. Provenance is:

- workbook: `ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx`;
- SHA-256: `2f3a9ea415801dc4a93d6c4e3a1f95f95d429c8fd6100cd5d459806ec11433fe`;
- sheet: `TDSheet`;
- unit: `п.м` / `m`.

Archived calculation books expose frame marks such as:

```text
ПГС300/20х80х3
ПГС300/20х80х2,5
ПГС300/20х80х2
ПГС-сигма 300х80х3
ПГС-S 300х80х3
```

The archived row formulas prove that these are engineering result labels and
that their quantity and price cells are linked through workbook-specific
external price books. They do not, by themselves, prove that a current 1C
mark with a similar visual dimension is the same commercial nomenclature.

## Closed subset and remaining unknowns

The current Core 1 result exposes the complete scenario geometry, selected
beam/column labels and frame step. For the explicitly observed gable labels,
Core 3 now reproduces the archived quantities:

```text
beam   = 2 * literal_span * frameCount
column = 2 * 3.5 * 2 * (frameCount - 2)
```

The exact labels are mapped through a closed table to current 1C marks and the
line keeps the catalogue row provenance. The following cases remain unknown:

1. labels not present in the closed alias table;
2. one-slope quantities, whose historical column formula is different;
3. `ТПГС`/perforated variants, until a corresponding Core 1 output and source
   quantity chain is proven.

Only exact entries in the closed table are accepted. A new alias still needs
an archived result label and an exact source catalogue row; fuzzy/nearest
mapping and automatic `ПГС-S` normalization remain prohibited.

## Runtime behaviour

When Core 1 is supplied to Core 3, proven gable beam/column entries produce
known commercial lines. Unsupported labels or one-slope inputs produce:

- `CORE3_FRAME_PROFILE_PRICE_NOT_PROVEN` diagnostics;
- `UNKNOWN_COST` component labels in the commercial summary;
- no contribution to `knownCost`.

This preserves the engineering result and prevents a plausible-looking price
from being presented as proven.

## Safe next evidence

The next audit must use a source workbook where the frame line's exact
commercial mark, quantity formula and price source are available in the same
provenance chain. Until that evidence exists, the current implementation is
correctly conservative.
