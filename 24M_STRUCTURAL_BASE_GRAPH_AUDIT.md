# 24M STRUCTURAL BASE AGGREGATE AUDIT

Mode: read-only formula-graph reverse engineering.

No production code, XLSX/PDF, or `outputs/` was modified. No commit or push
was performed.

## Evidence boundary

The workbook XML supplies the exact formulas and cached values. The supplied
active-recalculation report supplies the active 24 m aggregate values. The
repository does not contain the saved active recalculated workbook itself;
therefore stale cached `#N/A` cells in the source-selection workbook are not
relabelled as active values.

Control: automatic 24 m, low height, `Роза`, responsibility `0.8`, zero
openings, the `С-П 150` branch used by the boundary audit.

Known active values:

```text
Excel Z14/Z15 = 26.979706743827165
Excel T28      = 4.956
Excel D68      = 0
Core1 base     = 24.858503040123463
Core1 T28      = 4.956
Core1 D68      = 0
```

## 1. Exact dependency graph

### Selector and family

```text
подбор!AM9  = IF($V$10<=9,9,AM10)
подбор!BD9  = IF($V$10<=9,9,BD10)
подбор!V10  = вывод!D4
подбор!V11  = вывод!D5
подбор!V8   = вывод!D6
подбор!V9   = вывод!D7
```

For the active span, the family selector returns `24`, so the exact-match
lookup rows are `A7` and `A14`:

```text
подбор!Z14 = INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))
подбор!Z15 = INDEX($O$9:$O$14,MATCH(BD9,$A$9:$A$14,0))
```

Therefore, for family 24:

```text
Z14 → O7
Z15 → O14
```

`O15` is not part of the family-24 `Z15` range. It is not an active
precedent of `Z15`.

### O7 branch

```text
подбор!O7 = (E7+G7*T7)/(24*$V$11)+H7
подбор!E7 = D7*S7
подбор!S7 = CEILING.MATH($V$11/I7)-1
подбор!T7 = CEILING.MATH($V$11/I7)+1
подбор!D7 = '24м'!KO19
подбор!G7 = '24м'!KQ19
подбор!H7 = '24м'!KR19
подбор!I7 = '24м'!KS19
```

The active branch is `O7` because `D9` is blank/zero and `D69` selects `E8`.

### O14 branch

```text
подбор!O14 = (E14+G14*T14)/(24*$V$11)+H14
подбор!E14 = D14*S14
подбор!S14 = IF($W$2=0,CEILING.MATH($V$11/I14)-1,
                CEILING.MATH($V$11/$W$2)-1)
подбор!T14 = IF($W$2=0,CEILING.MATH($V$11/I14)+1,
                CEILING.MATH($V$11/$W$2)+1)
подбор!D14 = '24м'!WQ19
подбор!G14 = '24м'!WS19
подбор!H14 = '24м'!WT19
подбор!I14 = '24м'!WU19
```

`O14` is the mirrored/second calculation branch. Its selector contains an
additional `$W$2` override. That is provenance only here; no ROW15/manual
implementation is inferred.

### 24 m selected-row chain

The first 24 m output row is selected by climate/branch key:

```text
24м!KM19 = INDEX(KM6:KM14,MATCH(KL18,KL6:KL14,0))
24м!KQ19 = INDEX(KQ6:KQ14,MATCH(KL18,KL6:KL14,0))
24м!KR19 = INDEX(KR6:KR14,MATCH(KL18,KL6:KL14,0))
24м!KS19 = INDEX(KS6:KS14,MATCH(KL18,KL6:KL14,0))
```

The row-14 candidate block is selected by height key:

```text
24м!KM14 = INDEX(JW15:JW19,MATCH(KL13,JV15:JV19,0))
24м!KQ14 = INDEX(KA15:KA19,MATCH(KL13,JV15:JV19,0))
24м!KR14 = INDEX(KB15:KB19,MATCH(KL13,JV15:JV19,0))
24м!KS14 = INDEX(KC15:KC19,MATCH(KL13,JV15:JV19,0))
24м!KL13 = подбор!AN9
24м!KL18 = INDEX(IF(подбор!V9=0.8,снегветер!M3:M600,
                    снегветер!K3:K600),
                MATCH(подбор!V6,снегветер!B3:B600,0))
```

The mirrored second branch uses the analogous `WN/VX:WM` ranges and feeds
`O14` through `WQ19`, `WS19`, `WT19`, and `WU19`.

The source candidate row for the low-height key is `JV15 = 6`. Its cached
candidate formulas include:

```text
JW15 = BO6
JX15 = BO7
JY15 = BO8
JZ15 = BN9
KA15 = BO10
KB15 = BO11
KC15 = BO12
KD15 = BO13
KE15 = BO9
KF15 = BP9
KG15 = BQ9
KH15 = BR9
KI15 = BO14
KJ15 = BO15
KK15 = BO16
```

This proves that `O7` is not a direct read of the displayed beam/column
profile or frame-mass cell. It is an aggregate built from several selected
24 m row outputs, counts, and a normalized addition `H7`.

## 2. Semantics of O7, O14, Z14, Z15

| Cell | Proven meaning | Unit | Active branch |
|---|---|---|---|
| `O7` | normalized structural aggregate for the first 24 m branch | kg/m² | active through `Z14 → E8` |
| `O14` | normalized structural aggregate for the mirrored/second branch | kg/m² | inactive in this control, provenance only |
| `Z14` | exact family lookup selecting `O7` for `AM9=24` | kg/m² | active |
| `Z15` | exact family lookup selecting `O14` for `BD9=24` | kg/m² | inactive in this control |

The denominator in both O-formulas is explicitly `24*$V$11`, i.e. literal
24 m span multiplied by the live building length. The formulas therefore
prove the normalizing area `span × length` for this branch. They do not prove
that every component uses the same denominator before entering `O7`.

`O7` and `O14` are structurally parallel, not synonyms: `O14` has the `$W$2`
count override and reads the mirrored `WO:XC` output block.

## 3. Component comparison

The following table separates proven formula components from values that are
not recoverable from the stale saved cache.

| Component | Excel source | Excel active value | Core1 source/module | Core1 value | Status |
|---|---|---:|---|---:|---|
| selected 24 m frame profile | `24м!KM19:KN19` / mirrored row | matched | `FrameSelector` | matched | MATCH |
| displayed frame mass | selected 24 m row / `подбор!O7` inputs | `1415.598896` in control | `FrameSelector` frame mass | `1415.598896` | MATCH |
| regular/end count term | `S7`, `T7`, `E7=D7*S7` | active intermediate not retained | no separately proven 24 m equivalent | not isolated | UNKNOWN |
| selected aggregate term | `G7*T7` | active intermediate not retained | 24 m structural-base lookup | included in `24.858503040123463` | FIRST_DIVERGENCE |
| normalized extra term | `H7` | active intermediate not retained | no proven one-cell equivalent | not isolated | UNKNOWN |
| `O7` / `Z14` | `O7`, then `Z14` | `26.979706743827165` | structural base passed to summary | `24.858503040123463` | FIRST_DIVERGENCE |
| purlin contribution | `Подбор прогонов!T28` | `4.956` | `PurlinCalculator` | `4.956` | MATCH |
| openings contribution | `Лист1!O28 → вывод!D68` | `0` | `OpeningMassCalculator` | `0` | MATCH |

No formula evidence permits assigning `D7`, `G7`, or `H7` solely to “frame
mass”, “ties”, or “secondary steel” without the active recalculated row
snapshot. The stale cache contains `#N/A` in the selected 24 m output row, so
such a decomposition would be speculative.

## 4. First numeric divergence

```text
Excel Z14 = 26.979706743827165
Core1 base = 24.858503040123463
delta      = 2.121203703703702
```

The frame profile, displayed frame mass, purlin `T28`, and `D68` already
match. Consequently the first divergence is the 24 m structural aggregate,
not the frame profile selector, purlin selector, opening mass, or D69 formula.

The difference propagates exactly:

```text
Excel: 26.979706743827165 + 4.956 + 0 = 31.935706743827165
Core1: 24.858503040123463 + 4.956 + 0 = 29.814503040123462
```

## 5. End-frame and secondary-steel findings

The formulas prove that the 24 m branch has separate count inputs `S7/T7`
and `S14/T14`, and that `E7/E14` are derived from a selected quantity-like
cell (`D7/D14`) multiplied by the lower count. This is evidence of a
regular/end or count-sensitive aggregate, but it is not enough to name the
members or assert “end frame without tie”. The active selected row values and
their precedents are required to make that semantic assignment.

The current evidence also does not prove that `SecondarySteelCalculator`
components are direct contributors to `Z14`. `D69` receives `Z14/Z15`, purlin
T28, and D68; adding all secondary-steel outputs would risk double counting.

Thus the following remain unresolved rather than silently mapped:

- exact quantity/profile/length/unit-mass decomposition of `D7`, `G7`, `H7`;
- active 24 m values of `BO8`, `BO10`, `BO11`, `BO12` after full rebuild;
- whether the 24 m aggregate includes an end-frame adjustment not represented
  by Core1's displayed frame mass;
- whether a 24 m-only helper member is included in `H7`.

## 6. Generic versus 24 m-specific

The same O-formula pattern exists in the proven 9–21 domain. For example, the
15 m audited branch uses:

```text
подбор!O4 = (E4+G4*T4)/(15*V11)+H4
```

and its family lookup feeds the corresponding Z cell. That branch reaches
proven structural parity in the real-project controls. The 24 m formulas
change the literal span and selected source block (`24м!KM:LA` / `WO:WZ`),
while retaining the same aggregate shape.

Classification: `24M_SPECIFIC` pending the active row decomposition. There is
no evidence for a generic Core1 summary bug because purlin and D68 parity hold
and the 9–21 aggregate pattern is already validated.

## 7. Implementation decision

The exact top-level formulas are proven, but the exact active component values
and Core1 ownership mapping are not. Conditions for implementation are not
all satisfied: the active source row snapshot is missing, the semantic role of
`H7` is unresolved, and no exact replacement formula has been demonstrated.

No production change is justified. The next required artifact is a fresh
recalculated 24 m workbook or cell-level export containing at least:

```text
подбор!D7:T7
подбор!D14:T14
подбор!O7:O14
24м!JV15:KK19
24м!VX15:WM19
подбор!AM9,BD9,V11,W2
вывод!D4:D9,D68:D69,E8:E9
```

## Final statuses

```text
24M_O7_SEMANTICS = PROVEN
24M_O14_SEMANTICS = PROVEN
24M_Z14_COMPONENT_GRAPH = PARTIAL
24M_FIRST_STRUCTURAL_DIVERGENCE = O7/Z14 structural aggregate
24M_DIVERGENCE_SCOPE = 24M_SPECIFIC
SAFE_TO_IMPLEMENT_24M_STRUCTURAL_FIX = NO
PRODUCTION_CODE_CHANGED = NO
```
