# Core 3 wall-girt price audit

Status: **PROVEN FOR THE RESTRICTED MANUAL WALL-GIRT PATH**

Source workbook (read-only):
`ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx`, лист `TDSheet`, строка `927`.

SHA256:
`2f3a9ea415801dc4a93d6c4e3a1f95f95d429c8fd6100cd5d459806ec11433fe`

Archived formula source: `21874.xlsx`, SHA256
`8429b1e91207c2fa047461ba33c2679e4d16434309c0d73057eb460e31e14cca`,
sheet `12м`, cells `C38/E38`.

## Compared source semantics

The proven Core2 wall-girt fixture selects the profile
`[]ПП 145x45x1,5` and preserves a section mass of `5.3432 kg/m` in the
archived wall-girt calculation. The source fixture also proves the paired
composition: `2 × 2.6716 kg/m`.

The exact 1C source row is:

`ПП 145х45 без перфор. 1,5 П390 (Оцинк.)` — `396.00 ₽/п.м.`,
`2.6716 kg/m`, code `00000119085`, cells `B927`, `D927`, `G927`, `H927`,
`I927`.

The source row says `П390`, matching the structural candidate material
`М.п.390` after explicit steel-grade notation normalization. The former
P350/P390 concern is therefore resolved. A paired `[]ПП` is not silently
treated as a new catalog product: Core3 applies the proven `2 ×` composition,
giving `792.00 ₽/m` before brackets.

## Runtime consequence

The exact single-profile row is included in the Core3 dataset. Core2 paired
sections are priced by the explicit composition rule. The associated bracket
line is also replayed from the archived commercial formula and included in
`knownCost`.

The implementation does not replace bracket data with zero, a nearby profile,
a price-per-ton conversion, or a name-only match; it uses only the explicit
archived `E38` chain and exact 1C mark.

## Remaining evidence gap

The archived workbook proves the bracket conversion: `12м!C38 = G38/0.75*0.2`
and `12м!E38 = [2]Профлист,доборы!E79`. The referenced name is
`Угол специальный 90 гр. 2,0 П350 (Оцинк.)`; the current full 1C source has
the exact canonical row `TDSheet!861`, code `852`, `2278 ₽/п.м.`. Core3
therefore emits `bracketCount × 0.2 m` at `2278 ₽/m`, preserving the original
unit conversion and provenance.

The full 1C catalog was also checked for bracket-like rows: candidates such as
codes `118151` (0.7592 kg/m) and `118154` (1.4972 kg/m) are sold in `m`, not
`pcs`, and are named angle/profile products. The legacy wall-girt formulas
require a per-bracket quantity and a 0.75/1.5 kg bracket assembly, so these
rows are not used because the archived chain identifies the special-angle
product above instead.

The raw `TDSheet` also contains genuine bracket products, for example
`118265` (КВГ, 19 ₽/шт, 0.137 kg), `118266` (КВП 125М, 14 ₽/шт,
0.119 kg), `118267` (КВП 200, 20 ₽/шт, 0.150 kg), and `118268`
(КВП 250, 28 ₽/шт, 0.223 kg), in rows `277:280` of the same 1C workbook.
Their names, dimensions, and mass do not identify them as the wall-girt
bracket assembly used by the legacy `AA` formula, and the workbook contains
no link from the selected wall-girt profile to one of these rows. They remain
candidate evidence, not a price mapping; they are unrelated to the proven
special-angle chain.
