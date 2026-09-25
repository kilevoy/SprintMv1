# Core 3 frame-price provenance audit

## Scope

This is a read-only provenance record for the frame-member commercial lines
used by the historical result workbook. It does not change Core 1 formulas,
the XLSX files, or the runtime price resolver.

## Proven historical chain

For the 22318 result workbook the 12 m span sheet contains the following
commercial formulas:

| Result | Source cell | Formula / cached meaning |
|---|---|---|
| Beam mark | `12м!B21` | lookup result; cached mark `ПГС-сигма 300х80х3` |
| Beam quantity | `15!C46` | `=2*C8*I17`; cached `330` m in the archived sheet (that sheet has `C9=60`, `I17=11`) |
| Beam price | `12м!E21` | workbook-specific price link; cached `1712.55` ₽/m |
| Column mark | `12м!B22` | lookup result; cached mark `ПГС-сигма 300х80х2` |
| Column quantity | `15!C48` | `=2*3.5*2*(I17-2)`; cached `126` m in the same sheet |
| Column price | `12м!E22` | workbook-specific price link; cached `1161.30` ₽/m |

The same quantity pattern is present on the 15/18/21 m gable sheets. The
`1ск` sheet has a different, explicit column-length formula, so it must not be
collapsed into the gable formula.

## Price-source provenance

The result workbook external-link metadata identifies a historical price
family named `ПГС  ПГС-сигма` as a separate sheet/category. Other links point
to `ПГС и ТПГС`. Therefore the following labels cannot be treated as automatic
aliases:

`ПГС`, `ПГС-сигма`, `ПГС-S`, `ТПГС`.

The current 1C catalogue does contain rows visually matching several of these
families, but the available evidence does not prove the exact mapping from a
Core 1 slash label such as `ПГС300/20х80х3` to one current catalogue code.
The historical price workbook and the result workbook also use
version-specific external links.

## Decision

Frame quantities are **formula-proven** for the audited gable commercial
branch. Core 3
now prices the explicitly observed gable labels through a closed exact alias
table and preserves the 1C row provenance. The one-slope quantity branch and
unobserved/TPGS labels remain `UNKNOWN_COST` and emit
`CORE3_FRAME_PROFILE_PRICE_NOT_PROVEN`. No fuzzy, nearest, or family-name
fallback is allowed.

## Required evidence to close the gap

One source workbook must be retained with all three items in the same chain:

1. exact beam/column commercial mark;
2. quantity formula and unit;
3. price source cell/code and effective price version.

Until that evidence is available, implementing a frame-price alias would risk
changing the historical commercial result.
