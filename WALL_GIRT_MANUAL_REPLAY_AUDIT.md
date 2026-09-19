# Wall-girt manual replay audit

Status: `AUDIT ONLY`; no enclosure runtime, Core1, UI, or selector code was
changed.

## Scope and source provenance

The preferred source workbook is reported by the parallel research repository
as `Калькулятор ограждайки v1.5.xlsx`, with a reported SHA-256 beginning
`4A9343A1...`, and ranges `Лист1!B49:K51`, `Расчет Угловая`, and
`Расчет Рядовая`. That workbook and a formula-preserving export are not present
in the supplied project or in the inspected research commit
`7920b45979ed25e608310be6996ee63dfe680a5a`. The claims below are therefore
separated into source evidence, real-project observations, and hypotheses.

The inspected research artifact does provide an ordered 632-row catalog. It
preserves `тип_сечения`, `материал`, `масса_1м_профиля_кг`,
`масса_1м_сечения_кг`, and `масса_узловых_сборок_кг`, but not the wall-zone
geometry formulas or source workbook row formulas.

## Zone semantics

The parallel artifact names the two manual zones `Угловая` and `Рядовая` and
maps them to `corner` and `typical`. This is a provenance lead, not an
independent source proof. No authoritative distinction for `Торцевая` versus
`Боковая` was found. Accordingly, side/end wall behavior is `UNKNOWN` and must
not be generalized from the two zone labels.

## Rule audit

| Rule | Evidence found | Status | Implementation gate |
|---|---|---|---|
| row count / rounding | parallel comment reports `CEILING(height/step) + correction` | `UNKNOWN` | blocked |
| correction for section mode | reported `+1` single / `+0` paired | `UNKNOWN` | blocked |
| profile length | reported `rows × zoneLength` | `UNKNOWN` | blocked |
| base profile mass | reported `length × mass/m` | `PARTIAL` | blocked; source field not proven |
| single/composite distinction | catalog preserves `]`, `[]`, `][`, `[-]` | `PARTIAL` | blocked |
| composite mass authority | catalog has separate profile/section masses | `PARTIAL` | blocked |
| corner bracket quantity | reported unrounded `rows × zoneLength / postStep` | `UNKNOWN` | blocked |
| typical bracket quantity | reported nested round/ceiling formula | `UNKNOWN` | blocked |
| bracket unit mass | reported 0.75 / 1.5 kg | `UNKNOWN` | blocked |
| bracket total mass | depends on unproven quantity and unit mass | `UNKNOWN` | blocked |
| upper/lower/TN/TO members | parallel comments say not reproduced | `UNKNOWN` | separate scope |
| opening interaction | 21604 references are project observations only | `UNKNOWN` | no generalization |

The reported parallel formulas are retained as hypotheses only. They are not
implemented and are not used to populate expected fixture values.

## Boundary cases

The requested boundaries `6.0`, `6.01`, and `5.99` m at a 1.5 m girt step are
registered in the audit fixture, but have no expected values because the source
formula/cache is unavailable. This prevents a plausible ceiling rule from
being mistaken for a proven Excel rule.

## Real-project cross-check

The parallel repository reports one live numerical observation for Благовещенск
(24×24×10.5): corner and typical outputs were reported with seven rows, 14
brackets, and profile masses 448.8288 kg and 359.1504 kg respectively. This is
`REAL_PROJECT_PARITY` evidence only. It is not `SOURCE_FORMULA_PARITY`, and the
source workbook cells needed to reproduce it are absent here. One project is
insufficient to promote a universal rule.

No second independently source-backed wall-girt zone was available in the
current evidence set.

## Implementation matrix

```text
WALL_GIRT_ROW_COUNT_RULE = UNKNOWN
WALL_GIRT_PROFILE_LENGTH_RULE = UNKNOWN
WALL_GIRT_PROFILE_MASS_RULE = PARTIAL
SINGLE_PAIRED_SECTION_SEMANTICS = PARTIAL
CORNER_BRACKET_QUANTITY_RULE = UNKNOWN
TYPICAL_BRACKET_QUANTITY_RULE = UNKNOWN
BRACKET_MASS_RULE = UNKNOWN
OPENING_INTERACTION = UNKNOWN
UPPER_LOWER_EXTRA_GIRTS = UNKNOWN

SAFE_MANUAL_REPLAY_DOMAIN = NONE (until authoritative source formulas/cache arrive)
SAFE_TO_IMPLEMENT_MANUAL_GIRT_REPLAY = NO
SAFE_TO_IMPLEMENT_AUTO_GIRT_SELECTION = NO
CORE1_RESULTS_CHANGED = NO
ENCLOSURE_RUNTIME_CHANGED = NO
```

## Required next evidence

To close the audit, provide the exact source workbook or formula-preserving
export containing the named ranges/cells, plus at least two cached real-project
zone outputs covering one corner and one typical zone. The import must preserve
section type, material grade, profile mass versus section mass, bracket quantity,
and any opening/edge-member branch.
