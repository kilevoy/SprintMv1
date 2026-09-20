# WALL GIRT AUTO SELECTION READINESS AUDIT

## Scope

Read-only audit of the authoritative workbook `Калькулятор ограждайки v1.5.xlsx`.

- SHA-256: `4a9343a1e3149954dec0f91d5398528f18016a8423ec204ce2b92a59f612deaf`
- Production code: unchanged
- Workbook: unchanged
- Commit/push: none
- Evidence mode: current XLSX formula/XML cache

Native Excel was available, but opening this workbook through COM did not complete
within the controlled audit window. Therefore no new input scenario is claimed as
freshly recalculated. All numeric values below are cached values from the supplied
authoritative workbook. This limitation is material for the `+ стойки` search.

```text
FRESH_EXCEL_RECALC = UNAVAILABLE
FRESH_EXCEL_RECALC_BLOCKER = external links / workbook size / native Excel hang
```

## 1. Proven source facts

The workbook contains 864 candidate rows in each calculation branch:

- rows 7:870: 864 candidates;
- rows without studs: 632;
- rows with `R=FALSE` / `+ стойки` branch: 232.

The two branches are:

- `Расчет Угловая`;
- `Расчет Рядовая`.

Their selector machinery is structurally parallel, but their geometry/wind helper
cells differ. The branch formulas are not interchangeable without preserving the
branch-specific inputs.

## 2. Current cached inputs

On `Лист1`:

| Cell | Cached value | Role evidenced by formulas |
|---|---:|---|
| `B12` | `9.3` | wall-height input used by visible row-count formulas |
| `B13` | `6` | support/spacing input used by objective and output formulas |
| `B3` | `0.8` | responsibility input |
| `V107` | `Без стоек` | selector display |
| `W107` | `TRUE` | selector gate used by `S[r]` |

The cached state is a no-stud state. The displayed value of `V107` is not itself
used by the candidate formulas; `W107` is.

## Current cached selected rows

```text
Расчет Угловая: selected row = 161; R = TRUE; branch = Без стоек
Расчет Рядовая: selected row = 46;  R = TRUE; branch = Без стоек
```

## 3. Selected no-stud candidate replay

### 3.1 `Расчет Угловая`

The selected visible result is the first result slot on `Лист1`:

| Field | Evidence | Cached value |
|---|---|---:|
| selected objective | `Лист1!E49 → Расчет Угловая!BGR7` | `466.82910726` |
| unscaled objective | `Расчет Угловая!BGQ7 = MIN(AWX7:BGN7)` | `233.41455363` |
| selected step | `Расчет Угловая!BGS7` | `1370 mm` |
| selected designation | `Расчет Угловая!BGT7` | `[]ПП 145x45x1,5` |
| selected material | `Расчет Угловая!BGU7` | `С390` |
| selected candidate row | `MATCH(AWX7,TQ7:TQ870,0)` path | `161` |
| `R161` | candidate branch flag | `TRUE` |
| `S161` | `IF(Лист1!$W$107=FALSE,TRUE,R161)` | `TRUE` |
| `JW161` | eligibility/helper gate | `TRUE` |
| `WZ161` | active objective cell for step 1370 | `233.41455363` |
| `T161` | +stud objective contribution | `0` |
| `TN161` / `TO161` | objective inputs | `2.6716 / 2.6716 kg/m` |
| `Y161` | profile mass per metre | `2.6716 kg/m` |
| `Z161` | objective profile term input | `5.3432 kg/m` |
| `AA161` | section bracket-mass factor | `1.5` |

The candidate row is a `R=TRUE` / no-stud candidate. Its visible `Лист1` output
is fed through `BGR/BGS/BGT/BGU`, not by directly copying the candidate row.

### 3.2 `Расчет Рядовая`

| Field | Evidence | Cached value |
|---|---|---:|
| selected objective | `Лист1!E50 → Расчет Рядовая!BGR7` | `377.15047724` |
| unscaled objective | `Расчет Рядовая!BGQ7 = MIN(AWX7:BGN7)` | `188.57523862` |
| selected step | `Расчет Рядовая!BGS7` | `1380 mm` |
| selected designation | `Расчет Рядовая!BGT7` | `[]ПП 145x45x1,2` |
| selected material | `Расчет Рядовая!BGU7` | `С350` |
| selected candidate row | `MATCH(AWX7,TQ7:TQ870,0)` path | `46` |
| `R46` | candidate branch flag | `TRUE` |
| `S46` | `IF(Лист1!$W$107=FALSE,TRUE,Расчет Угловая!R46)` | `TRUE` |
| `JW46` | eligibility/helper gate | `TRUE` |
| `XA46` | active objective cell for step 1380 | `188.57523862` |
| `T46` | +stud objective contribution | `0` |
| `TN46` / `TO46` | objective inputs | `2.1378 / 2.1378 kg/m` |
| `Y46` | profile mass per metre | `2.1378 kg/m` |
| `Z46` | objective profile term input | `4.2756 kg/m` |
| `AA46` | section bracket-mass factor | `1.5` |

The `Расчет Рядовая` `S` formula explicitly references the corner `R` value when
`W107=TRUE`. This is a cross-branch legacy dependency and must be preserved in a
future replay model until independently disproven.

## 4. Exact objective formula and decomposition

The active raw candidate objective formula is present in the objective grid, for
example `Расчет Угловая!WZ161` and `Расчет Рядовая!XA46`:

```excel
IF(NF161=0,999999999,
  WZ$4*$Z161
  +$TO161*Лист1!$B$13
  +WZ$3*$AA161
  +$G161/1000000
  -WZ$2/1000000000
  +$TN161*Лист1!$B$13
  +$T161)
```

The row/column-relative equivalent is used for every candidate and step. The
formula has seven additive terms plus the eligibility fallback.

### Corner winner: `WZ161`

Inputs: `WZ$4=36`, `Z161=5.3432`, `TO161=2.6716`, `B13=6`,
`WZ$3=6`, `AA161=1.5`, `G161=155`, `WZ$2=1370`, `TN161=2.6716`,
`T161=0`.

| Term | Formula | Value |
|---|---|---:|
| step × profile term | `36 × 5.3432` | `192.3552` |
| `TO × B13` | `2.6716 × 6` | `16.0296` |
| step-count × `AA` | `6 × 1.5` | `9` |
| tie/value term | `155 / 1000000` | `0.000155` |
| ranking tie-break | `-1370 / 1000000000` | `-0.00000137` |
| `TN × B13` | `2.6716 × 6` | `16.0296` |
| `T` | `0` | `0` |
| **sum** |  | **`233.41455363`** |

The sum equals the cached `BGQ7` value within floating-point precision.

### Typical winner: `XA46`

Inputs: `XA$4=36`, `Z46=4.2756`, `TO46=2.1378`, `B13=6`,
`XA$3=6`, `AA46=1.5`, `G46=40`, `XA$2=1380`, `TN46=2.1378`,
`T46=0`.

| Term | Formula | Value |
|---|---|---:|
| step × profile term | `36 × 4.2756` | `153.9216` |
| `TO × B13` | `2.1378 × 6` | `12.8268` |
| step-count × `AA` | `6 × 1.5` | `9` |
| tie/value term | `40 / 1000000` | `0.00004` |
| ranking tie-break | `-1380 / 1000000000` | `-0.00000138` |
| `TN × B13` | `2.1378 × 6` | `12.8268` |
| `T` | `0` | `0` |
| **sum** |  | **`188.57523862`** |

The sum equals the cached `BGQ7` value within floating-point precision.

## 5. Minimum and lookup chain

The proven cached chain is:

```text
candidate row r
  → JW[r] / branch eligibility grid
  → raw objective grid (TQ:...)
  → sorted result grid AWX:BGN via SMALL(..., AWW7)
  → BGQ7 = MIN(AWX7:BGN7)
  → BGS7 = INDEX(AWX2:BGN2, MATCH(BGQ7, AWX7:BGN7, 0))
  → BGT7 = INDEX(AWX19:BGN19, MATCH(BGS7, AWX2:BGN2, 0))
  → BGU7 = INDEX(AWX31:BGN31, MATCH(BGS7, AWX2:BGN2, 0))
  → Лист1!B49:D50 / E49:E50
```

Visible outputs:

- `Лист1!B49 = Расчет Угловая!BGT7`;
- `Лист1!C49 = Расчет Угловая!BGU7`;
- `Лист1!D49 = Расчет Угловая!BGS7`;
- `Лист1!E49 = Расчет Угловая!BGR7`;
- analogous `B50:E50` references `Расчет Рядовая`.

The visible manual calculations then use the selected profile/step:

- `F49/F50`: `CEILING(B12*1000/D,1) + IF(single section,1,0)`;
- `G49`: `F49*E24/B13`;
- `G50`: `CEILING(F50*ROUND(E29/B13,1),1)`;
- `H49/H50`: selected section bracket unit mass × bracket quantity;
- `I49/I50`: row count × zone length × selected profile mass per metre;
- `K49/K50`: selected section type lookup.

Cached visible outputs are:

| Branch | Profile | Material | Step | Rows | Brackets | Bracket mass | Profile mass |
|---|---|---|---:|---:|---:|---:|---:|
| Corner | `[]ПП 145x45x1,5` | `С390` | `1.37 m` | `7` | `14` | `21 kg` | `448.8288 kg` |
| Typical | `[]ПП 145x45x1,2` | `С350` | `1.38 m` | `7` | `14` | `21 kg` | `359.1504 kg` |

## 6. `+ стойки` selector semantics

The exact selector formula is:

```excel
S[r] = IF(Лист1!$W$107=FALSE, TRUE, R[r])
```

Therefore:

- `W107=TRUE`: only candidates with `R=TRUE` pass this selector gate;
- `W107=FALSE`: both `R=TRUE` and `R=FALSE` candidates pass this selector gate,
  subject to all other capacity, geometry, profile and branch gates.

The selector classification is:

```text
PLUS_STUD_SELECTOR_SEMANTICS = ALL_CANDIDATES
```

`W107=FALSE` is not an exclusive `+ стойки` mode. It makes both `R=TRUE` and
`R=FALSE` candidates eligible for this selector gate; the remaining candidate
constraints still apply.

## 7. `+ стойки` objective contribution

The exact candidate formula is:

```excel
T[r] = IF(R[r], 0,
  $T$5 * INDEX($C$14:$C$24, MATCH(N[r], $B$14:$B$24, 0), 1))
```

The source cache proves the following mechanics:

- `T4 = IF(B13<=2,0,IF(B13<=4,1,IF(B13<=6,2,3)))`;
- `T5 = T4 * B12`;
- `T[r] = 0` for `R=TRUE`;
- `T[r]` is a lookup mass contribution for `R=FALSE` rows;
- objective adds `+T[r]` as the final term.

The final selected-output and final material-mass consumer of `T[r]` is not
proven. The visible `Лист1` profile mass formula uses selected rows, geometry and
catalogue mass; it does not visibly add `T[r]`, `TN[r]`, or `TO[r]`.

No genuinely selected `R=FALSE` winner was found in the current cached state.
This does **not** prove that such a winner cannot exist. A controlled search over
supported inputs was not completed because fresh Excel recalculation is
unavailable.

## 8. TN/TO final aggregation

Already proven source semantics remain:

```text
TN[r] = TO[r]
TO[r] = Y[r]
Y[r]  = profile mass per metre, kg/m
```

`TN` and `TO` each enter the candidate objective multiplied by `Лист1!B13`.
The visible selected profile-mass formulas use the selected profile catalog mass,
row count and zone length. No downstream final aggregation of `TN/TO` as separate
physical members was found in the visible output chain. A separate hidden or
external consumer cannot be excluded without a completed dependency scan in a
recalculated workbook.

The downstream search covered the selected-output and visible final-output chain,
not every hidden workbook object or external-link target. Accordingly the safe
classification remains:

```text
PLUS_STUD_FINAL_MASS_CONSUMER = UNKNOWN
TN_TO_FINAL_MASS_CONSUMER = UNKNOWN
```

These statuses do not authorize adding either contribution to EnclosureCore mass.

## 9. Manual replay comparison

The selected no-stud values reproduce the existing restricted manual replay:

### Corner

`[]`, height `9.3 m`, zone length `12 m`, step `1.37 m`, structural-post step
`6 m`, profile mass `5.3432 kg/m`:

- rows: `ceil(9.3 / 1.37) = 7`;
- profile length: `7 × 12 = 84 m`;
- profile mass: `84 × 5.3432 = 448.8288 kg`;
- bracket quantity: `ceil(7 × round(12/6,1),1) = 14`;
- paired-section bracket mass: `14 × 1.5 = 21 kg`.

### Typical

`[]`, height `9.3 m`, zone length `12 m`, step `1.38 m`, profile mass
`4.2756 kg/m`:

- rows: `ceil(9.3 / 1.38) = 7`;
- profile length: `84 m`;
- profile mass: `84 × 4.2756 = 359.1504 kg`;
- cached visible bracket quantity and mass: `14` and `21 kg`.

The manual replay can therefore reproduce the selected profile, section type,
step, rows, profile length, profile mass, bracket quantity and bracket mass for
this restricted no-opening, no-stud gross-zone domain. It must not add `T/TN/TO`
without a proven final aggregation consumer.

These are two separate claims:

- `MANUAL_RESULT_REPLAY_PARITY = YES` for the restricted cached no-stud values;
- `AUTO_SELECTION_PARITY = YES` for the cached workbook chain from candidate
  objective → minimum → selected step/profile/material → visible output.

Neither claim is a parity claim against a newly recalculated workbook or against
the current Core1 runtime.

## 10. Readiness matrix

| Area | Status | Evidence / limitation |
|---|---|---|
| candidate catalog | PROVEN | 864 rows and source catalog columns |
| eligibility gate `JW` | PROVEN | formula and cached active values inspected |
| section capacity/utilization gates | PARTIAL | helper formulas/cached gates visible; no fresh recalc |
| candidate objective | PROVEN | exact formula and numeric decomposition |
| minimum selection | PROVEN | `BGQ7 = MIN(AWX7:BGN7)` |
| selected profile | PROVEN | `BGT7` lookup and cached value |
| selected step | PROVEN | `BGS7` lookup and cached value |
| corner branch | PROVEN | cached selected row 161 replay complete |
| typical branch | PROVEN | cached selected row 46 replay complete |
| TN/TO objective role | PROVEN | exact objective terms |
| TN/TO final aggregation | NOT_FOUND | not present in visible final chain |
| +stud control | PROVEN | exact `S[r]` formula |
| +stud objective mass `T` | PROVEN | exact formula and objective term |
| +stud selected-output path | UNKNOWN | no genuine selected `R=FALSE` winner |
| +stud final mass aggregation | UNKNOWN | no downstream consumer proven |
| manual result replay | PROVEN restricted domain | no openings, no studs, explicit manual zones |
| AUTO parity | YES restricted | cached selector/output chain is fully replayed; fresh recalc unavailable |

## 11. Implementation gates

```text
SELECTED_NO_STUD_REPLAY = YES
PLUS_STUD_SELECTOR_SEMANTICS = ALL_CANDIDATES
SELECTED_PLUS_STUD_CASE_FOUND = NO
SELECTED_PLUS_STUD_REPLAY = NOT_AVAILABLE
PLUS_STUD_FINAL_MASS_CONSUMER = UNKNOWN
TN_TO_FINAL_MASS_CONSUMER = UNKNOWN
CORNER_SELECTION_REPLAY = YES
TYPICAL_SELECTION_REPLAY = YES
AUTO_SELECTED_PROFILE_PARITY = YES
AUTO_SELECTED_STEP_PARITY = YES
SAFE_TO_IMPLEMENT_AUTO_SELECTOR_WITHOUT_PLUS_STUD = YES
SAFE_TO_IMPLEMENT_AUTO_SELECTOR_FULL = NO
SAFE_TO_IMPLEMENT_PLUS_STUD_MANUAL_REPLAY = NO
SAFE_TO_IMPLEMENT_PLUS_STUD_FINAL_MASS = NO
FRESH_EXCEL_RECALC = UNAVAILABLE
FRESH_EXCEL_RECALC_BLOCKER = external links / workbook size / native Excel hang
```

## 12. Conclusion and next stage

The cached workbook proves the no-stud candidate selection/output chain far
enough to define and implement a restricted replay model: eligibility grid →
objective grid → minimum → selected step → profile/material lookup → visible
output. This is sufficient for a restricted AUTO selector with `W107=TRUE`,
`R=TRUE` only, no openings, and source-proven domain/branch inputs.

It does not prove a full AUTO selector because fresh recalculation and a genuine
selected `R=FALSE` case are missing. It also does not prove any `+ стойки` final
material-mass aggregation.

```text
NEXT_STAGE = restricted no-stud AUTO implementation
```
