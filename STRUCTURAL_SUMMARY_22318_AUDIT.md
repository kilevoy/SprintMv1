# Structural Summary / D69 — project 22318 audit

Дата: 2026-09-17
Проект: Сургут, 15 × 24 × 5 м
Источник: `E:\\SprintMv1_reference\\22318_SOURCE_SELECTION.xlsx`
Core 1: `E:\\SprintMv1`

Аудит выполнен read-only. XLSX и production TypeScript не изменялись.

## 1. Exact legacy chain

Для автоматической ветки (`вывод!D9` blank, то есть `0`) активна формула:

```text
вывод!D69 = IF(вывод!D9=0, вывод!E8, вывод!E9) + вывод!D68
вывод!E8  = подбор!Z14 + 'Подбор прогонов'!T28
подбор!Z14 = INDEX($O$2:$O$7, MATCH(AM9, $A$2:$A$7, 0))
подбор!O4  = (E4 + G4*T4)/(15*$V$11) + H4
```

`AM9=15`, поэтому `Z14` выбирает `O4`. Cached values:

| Cell | Formula / resolved formula | Cached value | Units |
|---|---|---:|---|
| `подбор!Z14` | `INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))` → `O4` | `25.120159722222223` | kg/m² |
| `подбор!O4` | `(E4+G4*T4)/(15*$V$11)+H4` | `25.120159722222223` | kg/m² |
| `вывод!E8` | `подбор!Z14+'Подбор прогонов'!$T$28` | `30.076159722222222` | kg/m² |
| `вывод!D68` | `Лист1!O28` | `2.2096666666666667` | kg/m² |
| `вывод!D69` | `IF(D9=0,E8,E9)+D68` | `32.285826388888886` | kg/m² |

### Correction to the requested reconstruction

The requested `25.35615972222222` is not the cached `Z14` in the identified source workbook. The exact source arithmetic is:

```text
E8 - T28 = 30.076159722222222 - 4.9559999999999995
         = 25.120159722222223 = Z14
```

`V28/area = 1699.2/360 = 4.72 kg/m²` is not the term used by `E8`. `T28=4.956 kg/m²` is the purlin specific mass after the workbook's `1.05` reserve factor (`4.72×1.05`). No missing dependency is required to reconcile `Z14`; the alternative target is an arithmetic/unit interpretation error.

## 2. Exact decomposition of `подбор!Z14`

`V11='вывод'!D5=24 m`; the denominator in `O4` is `15×V11=360 m²`.

| Term | Source cell and formula | Cached value | Multiplier / contribution | Status |
|---|---|---:|---:|---|
| tie members | `подбор!S4 = CEILING.MATH($V$11/I4)-1` | `5` | count; `подбор!E4=181*S4=905 kg`, contribution `905/360 = 2.513888888888889 kg/m²` | ACTIVE |
| frame mass | `подбор!G4='15м'!IE19` | `827 kg/frame` | `T4=CEILING.MATH($V$11/I4)+1=7` frames; `827×7/360 = 16.080555555555557 kg/m²` | ACTIVE |
| tube/secondary aggregate | `подбор!H4='15м'!IF19` | `6.5257152777777767` | direct kg/m² term; no extra multiplier | ACTIVE |
| area | `подбор!V11=вывод!D5` | `24 m` | `15×24=360 m²` | SCENARIO_CONTROL |

The exact sum is:

```text
905/360 + 827×7/360 + 6.5257152777777767
= 25.120159722222223 kg/m²
```

The `H4` chain is local and cached in the source workbook:

```text
15м!IF19 = INDEX(IF6:IF14, MATCH(HZ18, HZ6:HZ14, 0))
HZ18 = 1; HZ6 = 1 → IF6
15м!IF6 = INDEX(HP7:HP9, MATCH(HZ5, HJ7:HJ9, 0))
HZ5 = 4.8; HJ8 = 4.8 → HP8 = DA11
15м!DA11 = INDEX(CQ6:CQ15, MATCH(CY5, BV6:BV15, 0))
→ 15м!CQ11 = 6.5257152777777767 kg/m²
```

The selected `15м!CQ11` shared formula resolves to:

```text
(CM11+CP11)/(15*CU11)
```

with `CU11=24`, `CM11=1282.24 kg` and `CP11=1067.0174999999999 kg`.

### Secondary aggregate terms inside `H4`

| Term | Formula | Cached value | Contribution to `CQ11` | Status |
|---|---|---:|---:|---|
| horizontal ties/bracing/spacers aggregate | `15м!CM11 = CU11*3*7.2*1.1+712` | `1282.24 kg` | `1282.24/360 = 3.561777777777777 kg/m²` | ACTIVE |
| first CM11 subterm | `CU11*3*7.2*1.1` | `570.24 kg` | included in CM11 | ACTIVE |
| CM11 fixed subterm | `712` | `712 kg` | included in CM11 | ACTIVE |
| vertical bracing/fachwerk aggregate | `15м!CP11 = 97*4+24.1*1.15*6.125*4` | `1067.0174999999999 kg` | `1067.0175/360 = 2.9639374999999996 kg/m²` | ACTIVE |
| CP11 first subterm | `97*4` | `388 kg` | included in CP11 | ACTIVE |
| CP11 reserve/geometry subterm | `24.1*1.15*6.125*4` | `679.0174999999999 kg` | included in CP11 | ACTIVE |

`CM11+CP11=2349.2574999999997 kg`; divided by `360 m²` this is exactly the cached `6.5257152777777767 kg/m²`. No `*0` term is dropped. The alternate `E9` branch is not active (`D9=0`) and is retained as a `MANUAL_SWITCH`, not treated as unused.

## 3. Core1 decomposition

`calculateStructuralSummary` performs only aggregation:

```text
area = span × building_length = 15×24 = 360 m²
frame_count = ceil(24/4)+1 = 7
tie_bays = 7-2 = 5
ties = 181×5 = 905 kg
frame = 827×7 = 5789 kg
frame_base = (905+5789)/360 + 6.5257152777777767
            = 25.120159722222223 kg/m²
D69 = frame_base + 4.956 + 2.2096666666666667
    = 32.285826388888886 kg/m²
```

Core1 upstream values:

| Component | Core1 provenance | Core1 value |
|---|---|---:|
| frame step | `FrameSelector.selectFrame` | `4 m` |
| frame count | `StructuralSummary.calculateStructuralSummary` | `7` |
| frame mass | `FrameResult.frame_mass_kg` | `827 kg/frame` |
| tie unit | `FrameResult.frame_tie_unit_mass_kg` | `181 kg` |
| ties | `tie_unit × (frame_count−2)` | `905 kg` |
| tube/secondary aggregate | `FrameResult.tube_mass_kg_per_m2` from local `frame_15m_cells.csv` with runtime `building_length_m=24` | `6.5257152777777767 kg/m²` |
| purlins | `PurlinResult.purlin_kg_per_m2` | `4.956 kg/m²` |
| openings | `OpeningMassResult.opening_mass_kg_per_m2` | `2.2096666666666667 kg/m²` |

`SecondarySteelCalculator` does not expose an aggregate steel-mass field. It returns profiles, bolt patterns, `M16_quantity=4` and `fittings_weight_kg=233`; these payload fields are not added separately by StructuralSummary. `purlin_weight_kg`, `opening_mass_kg` and `opening_mass_t` are likewise not re-added to the specific-mass sum.

## 4. Source versus Core1

| Component | SOURCE | CORE1 | Difference | Status | Provenance |
|---|---:|---:|---:|---|---|
| area denominator | `360 m²` | `360 m²` | `0` | MATCH | `подбор!15×V11` / `StructuralSummary.area` |
| frame step | `4 m` | `4 m` | `0` | MATCH | `вывод!D8` / `FrameResult` |
| frame count | `T4=7` | `ceil(24/4)+1=7` | `0` | MATCH | `подбор!T4` / `StructuralSummary` |
| combined frame mass | `G4=827 kg/frame` | `frame_mass_kg=827` | `0` | MATCH | `15м!IE19` / `frame_15m_cells.csv!CL11` |
| tie mass | `E4=905 kg` | `905 kg` | `0` | MATCH | `подбор!E4` / `FrameResult` |
| horizontal aggregate | `CM11=1282.24 kg` | local formula at runtime length24 = `1282.24 kg` | `0` | MATCH | `15м!CM11` / local frame dataset |
| vertical aggregate | `CP11=1067.0175 kg` | local equivalent `CP11=1067.0175 kg` | `0` | MATCH | `15м!CP11` / local frame dataset |
| secondary/tube total | `2349.2575 kg` | `2349.2575 kg` | `0` | MATCH | `CM11+CP11` |
| tube specific mass | `H4/CQ11=6.5257152777777767 kg/m²` | `6.5257152777777767 kg/m²` | `0` | MATCH | runtime `building_length_m=24` |
| purlin specific mass | `T28=4.956 kg/m²` | `4.956 kg/m²` | `0` | MATCH | purlin branch |
| D68 | `2.2096666666666667 kg/m²` | `2.2096666666666667 kg/m²` | `0` | MATCH | `вывод!D68` / OpeningMass |
| D69 | `32.285826388888886 kg/m²` | `32.285826388888886 kg/m²` | `0` | MATCH | `вывод!D69` / StructuralSummary |

The pre-fix mismatch in specific mass was:

```text
1.6472384259259283 kg/m² × 360 m²
= 593.0058333333342 kg
```

This was not a StructuralSummary arithmetic error. The summary added the already-wrong local tube value once; the upstream runtime-length correction now removes the mismatch.

### Beam and column mass boundary

The audited source and Core1 expose only the combined frame mass (`827 kg/frame`) for this branch. Beam and column profile names and utilizations match, but neither workbook exposes a separately attributable beam kg/m or column kg/m value in the active `Z14` chain. Therefore a beam/column split would be invented. The proven comparable value is the combined frame mass `827/827 kg per frame`.

### SecondarySteelCalculator boundary

The active source presentation rows are `вывод!D36:E57`. Profile/bolt differences exist for this 24 m building-length scenario (for example source `D40=80х3`, `D52=8х2`, `D54=7х2`, `D55=10х2`, `D57=238`; the current local rules expose different cached values in some of these presentation cells), but those rows do not feed `подбор!Z14` directly. The only secondary-mass aggregate in the D69 path is `15м!CM11+CP11`, carried into source `H4` and into Core1 as `FrameResult.tube_mass_kg_per_m2`.

## 5. Zero and switch logic

| Control | Observed state | Classification |
|---|---|---|
| `вывод!D9` | blank, numerically `0` | `MANUAL_SWITCH`; activates `E8` |
| `вывод!E9` / `подбор!Z15` | calculated alternate branch | `RESERVE_FORMULA`; inactive for 22318 |
| `вывод!D24` | blank/zero | `SCENARIO_CONTROL`; no manual purlin maximum |
| `подбор!S4` | `CEILING.MATH(24/4)-1=5` | `ACTIVE` |
| `подбор!T4` | `CEILING.MATH(24/4)+1=7` | `ACTIVE` |
| `15м!CM11`, `CP11` constants and multipliers | all nonzero | `ACTIVE` |

No relevant formula was classified `CONFIRMED_UNUSED` merely because it contains a zero-capable branch.

## 6. First-divergence conclusion

`LAST_MATCHING_VALUE` in the mass chain is the opening-mass result `D68=2.2096666666666667 kg/m²` (and, upstream, purlin mass `1699.2 kg` / `4.956 kg/m²`).

The pre-fix `FIRST_DIVERGING_VALUE` was **not** `StructuralSummary` arithmetic. It was:

```text
FrameSelector.selectFrame → FrameResult.tube_mass_kg_per_m2
SOURCE: 15м!CQ11 = 6.5257152777777767 kg/m² (CU11=24)
CORE1 : frame_15m_cells.csv!CQ11 = 8.172953703703705 kg/m² (CU11=18)
```

Classification: **`FRAME_LENGTH_ERROR`**. The local static frame row contained a length-dependent aggregate cached for `18 m`, while project 22318 has `building_length=24 m`. The implementation now passes `building_length_m` to `FrameSelector` and evaluates the proven formula at runtime; `StructuralSummary.calculateStructuralSummary` remains unchanged.

The correction boundary is `FrameSelector.selectFrame`/frame dataset interpretation. No `StructuralSummary`, purlin or D68 logic was changed.

## 7. Implementation result

The proven correction is implemented at the `FrameSelector` boundary. `FrameSelectorInput` now carries the live project `building_length_m`; for each selected frame row the local `CM` formula is evaluated with that runtime length, `CP` remains the cached local aggregate, and the result is normalized by `span × building_length`. This is the direct TypeScript equivalent of the source `CM/CP → CQ` relationship; no project, city or output hardcode was added.

The 22318 regression now reproduces `CQ11=6.5257152777777767 kg/m²` and `D69=32.285826388888886 kg/m²`, while preserving frame step/count, profiles, frame mass, purlin selection/mass and D68. The length regression proves the same row gives distinct tube masses for 18 m and 24 m inputs. `FRAME_LENGTH_ERROR = CLOSED`.
