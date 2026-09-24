# Structural scheme cost audit

Read-only comparison of archived workbook pairs copied from `Z:/Предварительные расчеты/архив расчетов`. Source XLSX files were not modified.

## Results

| Project | Base active sheet | Tie active sheet | Base step / frames | Tie step / frames | Base total price | Tie total price | Classification |
|---|---|---|---:|---:|---:|---:|---|
| 21408 | 12м | 18 | 3.0 / 20 | 4.5 / 13 | 16,356,114.51 | 15,771,687.80 | tie cheaper |
| 21452 | 12м | 18 | 2.86 / 15 | 4.0 / 11 | 14,633,808.13 | 14,433,680.85 | tie cheaper |
| 21376 | 12м | 18 | 3.5 / 24 | 5.0 / 17 | 18,741,773.97 | 20,835,687.33 | tie more expensive |
| 21653 | 12м | 18 | 4.0 / 10 | 4.5 / 9 | 13,120,262.90 | 12,938,291.30 | tie cheaper |
| 22175 | 12м | 18 | 4.0 / 10 | 4.5 / 9 | 13,246,771.73 | 12,980,789.52 | tie cheaper |
| 21477 | 12м | 12м | 4.0 / 10 | 6.0 / 7 | 10,499,885.69 | 6,857,504.45 | not comparable: active branch geometry differs |

Prices are the workbook total-price cells (`F151` for the ordinary branch and `F145` for the tie branch). Values are cached workbook results, not recalculated by Core1.

## Formula evidence

The recurring frame-count formula is `I17 = CEILING(C9/C11+1,1)`. The ordinary branch commonly uses `C22 = I17*4*(C10-0.07)`, while the tie branch commonly uses `C22 = I17*4*(C10+1.3)`. The purlin quantity formulas also differ, for example `C24 = 5*2*2*C9+2*C9` versus `C24 = 6*2*2*(C9)+C9*2` in the 22175/21653 pair.

## Decision boundary

The evidence does not support an automatic rule that `SPRINT_WITH_TIE` is always cheaper from 18 m onward. Four comparable pairs are cheaper with ties, but 21376 (18 m span, 80 m length, 4.8 m height) is more expensive with ties. Cost depends on the complete branch, geometry and workbook-specific formulas.

Therefore `construction_scheme` remains an explicit user input. The application must not silently choose a scheme from span or profile label, and it must not promise savings without a complete branch calculation.

The 21477 pair is not a valid price comparison because the selected tie sheet has different active geometry (`C10 = 3`, `C11 = 6`) from the ordinary sheet (`C10 = 8`, `C11 = 4`).