# Cross-project structural aggregate validation

Дата: 2026-09-17
Режим: read-only audit. Production TypeScript и все XLSX не изменялись.

## Scope and evidence

Сопоставление выполнено по source-selection книгам, когда они присутствуют:

- `E:\SprintMv1_reference\22318_SOURCE_SELECTION.xlsx`
- `E:\SprintMv1_reference\22326\22326_SOURCE_SELECTION.xlsx`
- `E:\SprintMv1_reference\22316\22316_SOURCE_SELECTION.xlsx`

Для 22304, 21777 и 22251 найдены только downstream-файлы размером около 275–283 kB с пятью листами `9м/12м/15м/18м/21м/1ск` и внешними формулами вида `[1]вывод!…`. В них отсутствуют листы `вывод`, `подбор`, `Подбор прогонов` и cached outputs `D69`; они не являются достаточным доказательством структурного агрегата.

## Comparison matrix

| Project | Literal span / design family | Length | Height | Frame step (mode / selected) | Displayed frame mass | Aggregate frame mass in D69 path | Secondary/tube kg/m² | Purlin kg/m² | D68 kg/m² | D69 kg/m² | Structural-base path | Classification |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 22318 Сургут | 15 / 15 | 24 | 5 | automatic / 4 | 827 (`подбор!Y15`) | 827 (`подбор!G4='15м'!IE19`) | 6.5257152777777767 | 4.956 | 2.2096666666666667 | 32.285826388888886 | `вывод!E8=подбор!Z14+'Подбор прогонов'!T28`; `подбор!O4=(E4+G4*T4)/(15*V11)+H4` | **DISPLAY_EQUALS_AGGREGATE** |
| 22326 Увильды | 10.4 / 12 | 25.7 | 4 | automatic / 6 | 548 (`подбор!Y15`, displayed branch) | 625 (`подбор!G3='12м'!IE19`, active aggregate) | 8.62402561608301 | 8.698846153846155 | 1.9406614785992218 | 33.342651277062764 | `вывод!E8=подбор!Z14+'Подбор прогонов'!T28`; `подбор!O3=(E3+G3*T3)/(12*V11)+H3` | **SOURCE_SUSPICIOUS** (display differs) |
| 22316 Березовский | 18 / 18 | 30 | 5 | automatic / 4.5 | 985 (`подбор!Y15`) | 985 (`подбор!G5='18м'!IE19`) | 4.8689222222222224 | 6.1728333333333341 | 0.79955555555555546 | 28.922792592592597 | `вывод!E8=подбор!Z14+'Подбор прогонов'!T28`; `подбор!O5=(E5+G5*T5)/(18*V11)+H5` | **DISPLAY_EQUALS_AGGREGATE** |
| 22304 спринт профлист | not proven | not proven | not proven | not proven | — | — | — | — | — | — | downstream five-sheet file only; no `вывод!D69`/`подбор!Z14` | **NOT_COMPARABLE** |
| 21777 12×36×4.5 односкат | not proven | 36 (name only) | 4.5 (name only) | not proven | — | — | — | — | — | — | downstream five-sheet file only; no authoritative aggregate | **NOT_COMPARABLE** |
| 22251 5×12×3 односкат | not proven | 12 (name only) | 3 (name only) | not proven | — | — | — | — | — | — | downstream five-sheet file only; no authoritative aggregate | **NOT_COMPARABLE** |

`22318` exact source values are also independently recorded in `STRUCTURAL_SUMMARY_22318_AUDIT.md`; `22326` in `STRUCTURAL_BASE_22326_AUDIT.md`.

## Exact mass cells and formulas

The three comparable source books use the same output formula:

```text
вывод!D69 = IF(D9=0,E8,E9)+D68
вывод!E8  = подбор!Z14+'Подбор прогонов'!$T$28
```

Automatic mode is active (`вывод!D9` is blank/zero) in all three comparable books. The aggregate branch is selected by `подбор!Z14`, which indexes the design-family row in `подбор!O2:O7`.

| Project | `подбор!Z14` | Aggregate formula / cache | Purlin formula / cache | `вывод!E8` cache |
|---|---:|---|---:|---:|
| 22318 | 25.120159722222223 | `подбор!O4=(E4+G4*T4)/(15*V11)` `+H4` → 25.120159722222223 | `Подбор прогонов!T28=IF(T25=0,T26,T25)` → 4.956 | 30.076159722222222 |
| 22326 | 22.703143644617384 | `подбор!O3=(E3+G3*T3)/(12*V11)` `+H3` → 22.703143644617384 | `Подбор прогонов!T28=IF(T25=0,T26,T25)` → 8.698846153846155 | 31.401989798463539 |
| 22316 | 21.950403703703707 | `подбор!O5=(E5+G5*T5)/(18*V11)` `+H5` → 21.950403703703707 | `Подбор прогонов!T28=IF(T25=0,T26,T25)` → 6.1728333333333341 | 28.12323703703704 |

Displayed frame mass is the manual/display branch `подбор!Y15 = INDEX($G$9:$G$14,MATCH(BD9,$A$9:$A$14,0))`. The D69 aggregate mass is the family row `подбор!G{row}` (`G4`, `G3`, `G5` respectively), linked to `IE19` on the corresponding span sheet. These are distinct legacy paths even when their cached values happen to agree.

## Cross-project interpretation

### Is 22326 normal?

No. Among the three comparable projects, 22318 and 22316 have `displayed frame mass = aggregate frame mass`; 22326 alone has `548` displayed versus `625 kg/frame` in the active D69 aggregate. It is therefore a **source-suspicious outlier**, not a rule to fit Core1.

### Correlation checks

- Literal span differs from design family only in 22326 (`10.4 → 12`). This is a plausible trigger for branch divergence, but not proven as a sufficient cause: 22318 and 22316 are exact-family cases and match.
- Roof type, frame spacing, height and length do not explain the outlier by themselves. 22318 (double-slope, 4 m, 5 m high, 24 m long) and 22316 (double-slope, 4.5 m, 5 m high, 30 m long) both match; 22326 is the only one-slope/short-literal-span case in the comparable set.
- Automatic/manual mode is not the discriminator: all three comparable books have automatic `D9=0` and still differ only in 22326.
- No general rule justifies replacing the displayed branch with the aggregate branch, or vice versa. The evidence supports preserving both legacy paths and flagging 22326 for manual review.

### Trustworthy reference candidates

For structural-aggregate parity, 22318 and 22316 are trustworthy reference candidates because both expose complete source-selection chains and the two frame-mass paths agree. 22326 is useful as a regression fixture for the known legacy mismatch, but not as a normative reference.

## Decision

No Core1 implementation change is justified by this audit. The evidence proves a project-specific (or human-factor) anomaly in 22326, not a general legacy rule. A future implementation may preserve the two source paths and add an explicit compatibility diagnostic for the 22326-like mismatch, but this audit does not authorize such a code change.
