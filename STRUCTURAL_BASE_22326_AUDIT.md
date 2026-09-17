# Structural base first-divergence audit — real project 22326

Audit-only.  No XLSX or production TypeScript was modified; no commit/push was performed.

## Result

The source non-opening base is `вывод!E8 = 31.401989798463539 kg/m²`.  Core1 computes `33.16625673451062 kg/m²` before D68.  Purlin and D68 already match.

The first upstream mismatch inside the structural base is the **frame mass branch**:

```text
SOURCE structural aggregate: подбор!G3 = '12м'!IE19 = 625 kg/frame
CORE1 structural aggregate:  FrameResult.frame_mass_kg = подбор!Y15 = 548 kg/frame
```

The displayed source beam/column branch uses `подбор!U15/V15` and `Y15=548`, but active `вывод!E8` does not use `Y15`; it uses `Z14`, whose family-12 aggregate uses `G3=625`.  This is a legacy branch mismatch that must be preserved for parity, not inferred away from the displayed profile row.

## 1. Exact legacy path

For 22326, `вывод!D4=10.4`, so `подбор!V10=10.4` and `подбор!AM9=12`.  The automatic branch is active because `вывод!D9` is blank/zero and `E8>E9`.

```text
вывод!E8  = подбор!Z14+'Подбор прогонов'!$T$28
          → 31.401989798463539 kg/m²

подбор!Z14 = INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))
           → 22.703143644617384 kg/m²

подбор!AM9 = IF($V$10<=9,9,AM10) → 12
```

The matched family-12 row is row 3 of `подбор`:

| Cell | Formula | Cached value | Units / meaning |
|---|---|---:|---|
| `подбор!S3` | `CEILING($V$11/I3)-1` | `4` | tie bays |
| `подбор!E3` | `148*S3` | `592` | ties, kg |
| `подбор!G3` | `'12м'!IE19` | `625` | frame mass per frame, kg |
| `подбор!I3` | `'12м'!IG19` | `6` | family automatic spacing, m |
| `подбор!T3` | `CEILING($V$11/I3)+1` | `6` | frame count |
| `подбор!H3` | `'12м'!IF19` | `8.62402561608301` | secondary/tube, kg/m² |
| `подбор!O3` | `(E3+G3*T3)/(12*$V$11)+H3` | `22.703143644617384` | family structural aggregate, kg/m² |
| `подбор!Z14` | `INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))` | `22.703143644617384` | selected family aggregate, kg/m² |
| `Подбор прогонов!T28` | `IF(T25=0,T26,T25)` | `8.698846153846155` | purlin, kg/m² |
| `вывод!E8` | `подбор!Z14+'Подбор прогонов'!$T$28` | `31.401989798463539` | structural/non-opening base, kg/m² |
| `вывод!D68` | `Лист1!O28` | `1.9406614785992218` | openings, kg/m² |
| `вывод!D69` | `IF(D9=0,E8,E9)+D68` | `33.342651277062764` | total, kg/m² |

The 12 m sheet values behind the family row are cached as `12м!IE19=625`, `12м!IF19=8.62402561608301`, `12м!IG19=6`.  The secondary value is also represented by the 12 m row's shared formula `(CM+CP)/(12*CU)`; for the active cached row `CM11=1520.632`, `CP11=1139.0175`, `CU11=25.7`, giving `8.62402561608301 kg/m²`.

## 2. Span semantics by structural term

| Component | Legacy formula / Core1 equivalent | Span used | SOURCE | CORE1 | Result |
|---|---|---|---:|---:|---|
| user input | `вывод!D4`; `Core1Input.span_m` | literal 10.4 | 10.4 | 10.4 | MATCH |
| design lookup | `AM9/BD9` → family key | family 12 | 12 | 12 (`design_span_family`) | MATCH |
| automatic frame spacing | `I3/AA15` | family 12 | 6 m | 6 m | MATCH |
| tie bays | `S3=CEILING(25.7/6)-1`; `tieUnit×(frameCount-2)` | family step + literal length | 4 bays / 592 kg | 4 bays / 592 kg | MATCH |
| frame count | `T3=CEILING(25.7/6)+1` | family step + literal length | 6 | 6 | MATCH |
| frame mass per frame in D69 aggregate | `G3='12м'!IE19` | family 12 | 625 kg | 548 kg (`Y15`) | **MISMATCH / FIRST** |
| total frame/tie mass | `E3+G3*T3` | family aggregate | 4342 kg | 3880 kg | MISMATCH |
| frame/tie kg/m² | `(E3+G3*T3)/(12×25.7)` | family 12 × literal length | 14.079118028534372 | 14.516611792876382 | MISMATCH |
| secondary/tube | `H3='12м'!IF19`; Core1 `tube_mass_kg_per_m2` | source family denominator; Core1 currently literal denominator | 8.62402561608301 | 9.950798787788086 | MISMATCH |
| purlin | `Подбор прогонов!T28`; Core1 purlin result | literal 10.4 in `L30`/area | 8.698846153846155 | 8.698846153846153 | MATCH |
| structural base | `Z14+T28`; Core1 frame base + purlin | mixed | 31.401989798463539 | 33.16625673451062 | MISMATCH |
| opening denominator | `Лист1!O28` | literal 10.4 × 25.7 | 1.9406614785992218 | 1.9406614785992218 | MATCH |

The physical area is `10.4×25.7=267.28 m²`, and Core1 correctly retains it for purlin/opening/summary area.  The legacy `подбор!O3` frame aggregate intentionally uses `12×25.7=308.4 m²`; replacing that denominator with physical area would not preserve source parity.

## 3. Core1 reconstruction

Core1 trace/result components for the deterministic 22326 replay are:

```text
literal area                         = 10.4 × 25.7 = 267.28 m²
frame step / frame count             = 6 m / 6
frame mass per frame                 = 548 kg
tie unit mass / tie bays             = 148 kg × 4 = 592 kg
total frame + ties                   = 548 × 6 + 592 = 3880 kg
frame/ties contribution              = 3880 / 267.28 = 14.516611792876382 kg/m²
tube_mass_kg_per_m2                 = 9.950798787788086 kg/m²
purlin_kg_per_m2                    = 8.698846153846153 kg/m²
structural base                     = 14.516611792876382 + 9.950798787788086 + 8.698846153846153
                                    = 33.16625673451062 kg/m²
opening contribution (D68)          = 1.9406614785992218 kg/m²
D69                                 = 35.10691821310985 kg/m²
```

Windows are disabled (`D64:D66=0`), so `WindowGirtCalculator` contributes exactly `0 kg` and `0 kg/m²`; it is not part of the divergence.

## 4. Classification and stopping point

`LAST_MATCHING_VALUE` is the purlin result (`1745 mm`, `2214.312 kg`) and D68 (`1.9406614785992218 kg/m²`).

`FIRST_DIVERGING_VALUE` is the frame mass per frame used by the structural aggregate: source `подбор!G3=625 kg/frame` versus Core1 `FrameResult.frame_mass_kg=548 kg/frame`.

Classification: **`OTHER_PROVEN_CAUSE: LEGACY_STRUCTURAL_AGGREGATE_BRANCH_MISMATCH`**, with a concrete parity consequence equivalent to `FRAME_MASS_FORMULA_ERROR`.  The source display branch (`Y15=548`) and source D69 aggregate branch (`G3=625`) are different legacy paths.  The later tube mismatch (`8.62402561608301` versus `9.950798787788086`) is independently caused by `DESIGN_FAMILY_REQUIRED` denominator semantics (`12×25.7` in source versus literal `10.4×25.7` in current Core1), but it is not the first divergence.

No correction is proposed in this audit.  The likely future correction surface is the structural aggregate contract consumed by `calculateStructuralSummary`, not `span` validation, adapter, climate, FrameSelector profile lookup, PurlinCalculator, or OpeningMass.
