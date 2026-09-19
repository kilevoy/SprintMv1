# Frame profile audit — 18 m / 21 m / 24 m

Mode: read-only oracle comparison. No production changes were made for this
audit and the Excel workbook was opened only through disposable copies.

## Compared inputs

City `Роза`, length 18 m, roof covering `С-П 150`, automatic frame step,
heights 3.0 m, responsibilities 0.8 and 1.0. The 24 m cases are limited to
the already supported automatic low-height scope.

## Results

| Family | Responsibility | Excel beam | Excel column | Excel mass, kg | Excel step | Core1 result |
|---:|---:|---|---|---:|---:|---|
| 18 | 0.8 | ПГС300/20х80х3 | ПГС300/20х80х2,5 | 940 | 6 | FULL PARITY |
| 18 | 1.0 | ПГС300/20х80х3 | ПГС245/20х80х2,5 | 920 | 4.5 | FULL PARITY |
| 21 | 0.8 | ПГС300/20х80х3 | ПГС245/20х80х2,5 | 1066 | 5 | FULL PARITY |
| 21 | 1.0 | ПГС300/20х80х3 | ПГС245/20х80х2,5 | 1031 | 3.5 | FULL PARITY |
| 24 | 0.8 | ПГС300/20х80х3 | ПГС300/20х80х2 | 1415.598896 | 5 | FULL PARITY |
| 24 | 1.0 | ПГС300/20х80х3 | ПГС300/20х80х2 М.П.390 | 1405.598896 | 3.75 | FULL PARITY |

The Core1 values were obtained from the same input contract and matched the
Excel values for beam, column, frame mass and automatic step in all six cases.

## Scope classification

`18/21 m: PROVEN FOR THE TESTED LOW-HEIGHT AUTOMATIC CONTROLS`.

`24 m: PROVEN ONLY FOR THE EXISTING AUTOMATIC LOW-HEIGHT SCOPE`.

This is not evidence that every height band or every city is covered. The
remaining high-value audit is the height-transition matrix at 3.8/3.81,
5.0/5.01 and 6.0/6.21 for 18/21 m, followed by the already proven cities
Сургут, Березовский and Увильды. 24 m heights outside the active low-height
scope remain unverified and must not be enabled automatically.

## Decision

No new 18/21/24 profile resolver is justified by this control set. Continue
with read-only boundary validation first. Keep the 9/12/15 resolver isolated
from these families.
