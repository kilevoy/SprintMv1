# WALL GIRT AUTO DATA EXTRACTION AUDIT

## Scope and safety

This is an evidence-only extraction from the authoritative workbook
`Калькулятор ограждайки v1.5.xlsx`.

- SHA-256: `4a9343a1e3149954dec0f91d5398528f18016a8423ec204ce2b92a59f612deaf`
- source mode: XLSX/XML formulas plus cached values;
- fresh native Excel recalculation: not used;
- production AUTO selector: not changed;
- UI, Core1 formulas, manual replay, plus-stud implementation: not changed;
- source workbook: not modified;
- commit/push: not performed.

The extracted dataset is deliberately marked `evidence_only=true` and
`runtime_imported=false`. It must not be imported by production code without a
separate implementation decision.

## 1. Extraction result

The workbook contains two structurally parallel candidate branches:

| Branch | Sheet | Extracted rows | Restricted flag | Excluded rows |
|---|---|---:|---|---|
| corner | `Расчет Угловая` | 632 | `R=TRUE` | 639:870, plus-stud branch |
| typical | `Расчет Рядовая` | 632 | `R=TRUE` | 639:870, plus-stud branch |

The requested restricted dataset therefore contains **1,264 evidence records**
(632 rows in each branch). No `R=FALSE` row is included.

Output:

`src/enclosure/evidence-data/wall-girt-auto-no-stud-candidates.json`

Extraction runner:

`tools/enclosure_audit/extract_wall_girt_auto_evidence.py`

Each record preserves `source_row` and the cached/formula pair for columns
`G:AA`. This includes the candidate identity, section/profile fields, material,
filters, no-stud flag, insulation thickness, capacity inputs, mass fields and
all objective inputs. The dataset is audit data, not a normalized runtime
catalog.

## 2. Column dependency map

The following mapping is taken from the actual header row and formulas. A field
is not renamed or inferred from its position in the dataset.

| Field | Source column | Source evidence | Role in selector | Status |
|---|---|---|---|---|
| source order | `G` | `№` | tie/value term `G/1000000` and source ordering | PROVEN |
| profile family | `H` | `Вид профиля` | `I` lookup and profile identity | PROVEN |
| profile-family check | `I` | formula `INDEX(Лист1!W89:W94, MATCH(Hr, Лист1!V89:V94, 0), 1)` | candidate gate | PROVEN |
| section type | `J` | `Тип сечения` | `K` lookup, `AA`, visible designation | PROVEN |
| section-type check | `K` | formula `INDEX(Лист1!W102:W105, MATCH(Jr, Лист1!V102:V105, 0), 1)` | candidate gate | PROVEN |
| restraint | `L` | `раскреп` | source row property | PROVEN |
| profile thickness | `M` | `толщина` | thickness gate and `X` multiplier | PROVEN |
| profile height | `N` | `Высота профиля` | height bounds in `JW` | PROVEN |
| default utilization | `O` | `макс к-т исп по умолчанию` | `X` capacity adjustment | PROVEN |
| material | `P` | source material selector | `Q` lookup and material identity | PROVEN |
| material check | `Q` | formula `INDEX(Лист1!W97:W99, MATCH(Pr, Лист1!V97:V99, 0), 1)` | candidate gate | PROVEN |
| no-stud flag | `R` | `Без стоек` | `S` branch gate | PROVEN |
| active branch flag | `S` | corner: `IF(W107=FALSE,TRUE,Rr)`; typical: `IF(W107=FALSE,TRUE,Расчет Угловая!Rr)` | candidate gate | PROVEN; cross-branch dependency in typical |
| additional-stud mass | `T` | `IF(Rr,0,T5*INDEX(C14:C24,MATCH(Nr,B14:B24,0),1))` | final objective term | PROVEN formula; zero for all restricted rows |
| insulation thickness | `U` | `Толщина утепления` | equality gate `U=B11` | PROVEN |
| designation | `V` | `Профиль` | visible output and profile identity | PROVEN |
| raw capacity/profile term | `W` | source formulas/constants | feeds `X` | PROVEN as cached source field; formula variants retained |
| adjusted capacity | `X` | `W*IF(B32=0,Or,B32)*IF(Mr=1,P4,1)` | denominator of utilization grid | PROVEN formula |
| single-profile mass | `Y` | `Масса 1м профиля` | `TO=Y` | PROVEN |
| section mass | `Z` | `Y`, `Y*2`, or source formula | objective term `step_count*Z` | PROVEN |
| bracket-mass factor | `AA` | `IF(OR(Jr="[]",Jr="[-]"),1.5,0.75)` | objective term `step_count*AA` | PROVEN |

`AB` and `AC` contain no candidate-row values in rows 7:638. The helper headers
in row 6 are retained in the extraction notes but are not fabricated into
candidate fields.

## 3. Exact `JW` formula

Representative cells `JW7`, `JW46`, `JW161`, and `JW638` have one normalized
formula structure. The row-relative form is:

```excel
IF(AND(
  JW$2>=Лист1!$B$23,
  JW$2<=Лист1!$B$24,
  $Ir,
  $Kr,
  $Mr<=$M$4,
  $Mr>=$M$5,
  $Nr>=Лист1!$B$34,
  $Nr<=Лист1!$B$33,
  $Qr,
  $Ur=$B$11,
  AD_r<=1,
  IF($B$10="нет",TRUE,OR(JW$2=$D$10,JW$2=$E$10,JW$2=$F$10)),
  $Sr
),1,0)
```

The exact XML formula is preserved in each representative source field in the
JSON dataset. The later step columns use the same structure with the matching
step header, utilization cell and eligibility cell.

The gates are therefore:

1. step in `B23:B24`;
2. profile-family selector `I`;
3. section-type selector `K`;
4. thickness between `M5:M4`;
5. profile height between `B34:B33`;
6. material selector `Q`;
7. insulation equality `U=B11`;
8. utilization `AD:JT <= 1`;
9. optional manual step list `D10:F10` when `B10` is not `нет`;
10. active branch selector `S`.

`JW` is not a mass test and does not itself choose the winning row. It creates
the eligibility grid consumed by the objective grid.

## 4. Capacity / utilization chain

For the cached source state, the exact chain is:

```text
Лист1!B17 / wind helper
  → branch C3
  → branch AD4
  → branch AD5 = $C$3 * AD4
  → branch AD6 = (AD5 * AD2 / 1000) * Лист1!$B$13^2 / 8
  → branch AD[r] = AD$6 / X[r]
  → branch JW[r] checks AD[r] <= 1
  → branch TQ[r] objective cell checks JW[r]
```

The corresponding copied ranges are:

| Purpose | Corner | Typical |
|---|---|---|
| step axis | `AD2:JT2` | `AD2:JT2` |
| utilization grid | `AD7:JT638` | `AD7:JT638` |
| eligibility grid | `JW7:TM638` | `JW7:TM638` |
| raw objective grid | `TQ7:ADG638` | `TQ7:ADG638` |

The current source cache proves the formula chain and all current cached values.
It does not by itself prove a fresh recalculation for arbitrary new project
inputs. Therefore runtime-input completeness is classified below as `PARTIAL`,
not as a license to activate production AUTO.

## 5. Step axis and exact objective

The authoritative axis is proven directly from row 2:

```text
minimum = 500 mm
maximum = 3000 mm
increment = 10 mm
count = 251
```

Raw objective cells `TQ:ADG` use this normalized formula:

```excel
IF(JW_r=0,
   999999999,
   step_count*Z_r
   +TO_r*Лист1!$B$13
   +step_count*AA_r
   +G_r/1000000
   -step_mm/1000000000
   +TN_r*Лист1!$B$13
   +T_r)
```

The exact source references are preserved in the dataset and include the
branch-relative eligibility cell (`JW:TM`) and objective cell (`TQ:ADG`).

The objective terms are:

| Term | Source expression | Role / unit status |
|---|---|---|
| 1 | `step_count × Z` | section mass contribution; source labels `Z` as kg/m |
| 2 | `TO × Лист1!B13` | profile mass contribution; `TO=Y`, source kg/m |
| 3 | `step_count × AA` | bracket/assembly contribution; source factor, cached kg-like objective term |
| 4 | `G/1000000` | deterministic source-order tie term |
| 5 | `-step/1000000000` | deterministic step tie-break, prefers larger step when other terms tie |
| 6 | `TN × Лист1!B13` | second profile-mass contribution; `TN=TO` in the cached source |
| 7 | `T` | additional-stud objective contribution; zero in every extracted no-stud row |

The workbook does not select by “minimum mass” alone. It selects the minimum
full objective, including the tiny negative step term.

## 6. Golden cached replay

The replay below scans all 632 no-stud rows against all 251 cached step columns
in each branch. It uses the workbook's cached raw objective grid, not a guessed
minimum-mass algorithm.

| Branch | Expected row | Actual row | Expected step | Actual step | Cached minimum | Status |
|---|---:|---:|---:|---:|---:|---|
| corner | 161 | 161 | 1370 mm | 1370 mm | 233.41455363 | PASS |
| typical | 46 | 46 | 1380 mm | 1380 mm | 188.57523862 | PASS |

Selected cached output chain:

```text
raw objective grid
  → AWX:BGN = SMALL(raw objective column, AWW rank)
  → BGQ7 = MIN(AWX7:BGN7)
  → BGS7 = INDEX(AWX2:BGN2, MATCH(BGQ7, AWX7:BGN7, 0))
  → BGT7 = INDEX(AWX19:BGN19, MATCH(BGS7, AWX2:BGN2, 0))
  → BGU7 = INDEX(AWX31:BGN31, MATCH(BGS7, AWX2:BGN2, 0))
```

The cached winners are:

| Branch | Row | Step | Designation | Material | Objective |
|---|---:|---:|---|---|---:|
| corner | 161 | 1370 mm | `[]ПП 145x45x1,5` | `МП390` | `233.41455363` |
| typical | 46 | 1380 mm | `[]ПП 145x45x1,2` | `МП350` | `188.57523862` |

The neighboring eligible steps explain the previous 1330 mm observation. For
corner row 161, the cached objective values decrease from 1330 through 1370;
for typical row 46 they decrease from 1330 through 1380. The negative
`-step/1000000000` term is the exact reason the workbook chooses 1370/1380
instead of the smaller step at the start of the same near-flat mass plateau.
This is not an unresolved MATCH-first-hit issue in the authoritative path.

## 7. What the dataset closes

Closed by direct formula/XML evidence:

- full no-stud row inventory for both branches;
- source order and original row numbers;
- candidate identity, section type, material, thickness, height and insulation;
- `R`, `S`, `T`, `TN`, `TO`, `Y`, `Z`, and `AA` objective inputs;
- exact `JW` gate structure;
- exact 251-step axis;
- exact raw objective formula structure;
- exact minimum/SMALL/INDEX/MATCH output chain;
- corner row/step cached parity;
- typical row/step cached parity;
- the negative step tie-break semantics.

Still not closed for production arbitrary-input AUTO:

- a fresh recalculation fixture for changed project inputs;
- an executable replay of every helper table and branch input outside this
  cached workbook state;
- a proof of selected `R=FALSE` behavior and its final mass aggregation;
- any claim that `TN`, `TO`, or `T` must be added to EnclosureCore final mass;
- plus-stud implementation and output parity.

## 8. Parallel research repository comparison

Compared reference:
`insicomet/SprintM`, branch `claude/start-session-l3r43f`, commit
`7920b45979ed25e608310be6996ee63dfe680a5`.

| Parallel component | Classification | Evidence-based assessment |
|---|---|---|
| `girtBearingCatalog.json` field set | PARTIAL | It mirrors the `несушки`-style catalog fields and matches the source values for the catalog records it contains, but it is not the two-branch `Расчет Угловая`/`Расчет Рядовая` candidate/objective grid. |
| `selectGirt.ts` step axis 500…3000/10 | MATCHES_AUTHORITATIVE_SOURCE | Same row-2 axis proved above. |
| wind pressure / area reduction helpers | PARTIAL | The formulas and cached control values align with the source example, but the implementation is an independently reconstructed helper model, not the workbook's complete cached grid. |
| `moment_kNm` capacity model | PARTIAL | It expresses the visible `q·L²/8` relationship, but it does not reproduce the full `X`, `AD`, `JW`, selectors, manual step gates and branch cross-dependency. |
| minimum `totalMass` selector | HEURISTIC / SUPERSEDED | It selects the first lower-mass point and produced 1330 mm, while the authoritative objective selects 1370/1380 through the negative step tie term. Do not copy it into production. |
| `selectGirt.test.ts` profile/row/mass assertions | PARTIAL | The visible profile, rows and masses match the cached source case; exact source step parity was not achieved by that selector. |
| price/profile parser | OUTSIDE LEGACY SELECTOR | Useful for later commercial mapping, but not evidence for the legacy workbook's candidate selection. |

The comparison is secondary. The authoritative XLSX/XML evidence controls this
audit.

## 9. Final matrix

```text
NO_STUD_ROWS_EXTRACTED = 632 per branch / 1264 evidence records total
STEP_AXIS_PROVEN = YES
JW_FORMULA_PROVEN = YES
JW_RUNTIME_INPUTS_COMPLETE = NO for arbitrary production replay; PARTIAL for cached state
CAPACITY_CHAIN_PROVEN = PARTIAL
OBJECTIVE_FORMULA_PROVEN = YES
OBJECTIVE_TERM_MODEL_COMPLETE = YES for cached no-stud formula chain
TIE_BREAK_RULE_PROVEN = YES

CORNER_ROW_EXPECTED = 161
CORNER_ROW_ACTUAL = 161
CORNER_STEP_EXPECTED = 1370 mm
CORNER_STEP_ACTUAL = 1370 mm

TYPICAL_ROW_EXPECTED = 46
TYPICAL_ROW_ACTUAL = 46
TYPICAL_STEP_EXPECTED = 1380 mm
TYPICAL_STEP_ACTUAL = 1380 mm

PARALLEL_RESEARCH_REUSABLE = source-shaped catalog fields; step axis; partial wind helpers; test scaffolding
PARALLEL_RESEARCH_HEURISTIC = minimum total mass selector; incomplete capacity/JW replay; no branch-specific output grid
SAFE_TO_IMPLEMENT_RESTRICTED_AUTO = NO for production arbitrary inputs
```

## Conclusion

The extraction closes the missing **source evidence** for the restricted no-stud
candidate catalog and proves the cached legacy selection chain, including the
step tie-break that was missing from the parallel research implementation. It
does not yet establish a production-safe arbitrary-input AUTO selector because
the runtime still lacks a validated recalculable helper model and a changed-input
oracle.

The next safe stage is an audit-only replay model that consumes the extracted
catalog plus explicitly extracted helper tables, validates a controlled set of
freshly recalculated source cases when available, and only then proposes a
production `AUTO` selector. No selector is authorized by this report.

```text
SAFE_TO_IMPLEMENT_RESTRICTED_AUTO = NO
NEXT_STAGE = audit-only formula replay + fresh source cases
```
