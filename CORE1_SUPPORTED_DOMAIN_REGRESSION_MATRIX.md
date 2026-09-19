# CORE1 — Supported-Domain Regression Matrix

Status: validation/read-only audit. Production logic, source XLSX and existing reference artifacts were not changed. No commit or push was performed.

## Method

The new boundary cases were run through disposable copies of the master workbook with `CalculateFullRebuild`. Core1 was then run against the same normalized inputs. The machine-readable evidence is in [core1/validation/supported_domain_matrix.json](core1/validation/supported_domain_matrix.json).

The matrix is intentionally boundary-oriented, not a Cartesian product. It covers all six span families at the 3.0 m low-height boundary, both responsibility factors, the 3.81 m and 5.01 m height transitions, and the first unsupported 6.21 m boundary. Existing 22318, 22316 and 22329 controls remain parity references.

## Results

| Measure | Count |
|---|---:|
| New boundary scenarios | 9 |
| FULL_PARITY | 3 |
| STRUCTURAL_PARITY | 0 |
| CONNECTION_PARITY only | 0 |
| CORE1_UNKNOWN_DOMAIN | 1 |
| UNEXPECTED_DIVERGENCE | 5 |
| SOURCE_SUSPICIOUS | 0 |
| Expected method delta | 0 |

### By span family

| Family | Result |
|---|---|
| 9 m | unexpected frame-beam profile divergence at 3.0 m |
| 12 m | unexpected frame-beam/column profile divergence at 3.0 m |
| 15 m | unexpected frame-beam/column profile divergence at 3.0 m |
| 18 m | full parity at 3.0 m / 3.81 m / 5.01 m controls |
| 21 m | structural-summary mass divergence after matching frame/purlin selections |
| 24 m | purlin-step divergence at 3.0 m; not an expansion of the proven 24 m scope |

### By height band

- `3.0 m`: all six families were exercised; 18 m was full parity, while 9/12/15/21/24 m exposed downstream divergences.
- `3.81 m`: 18 m full parity.
- `5.01 m`: 18 m full parity.
- `6.21 m`: Excel active chain returned `#VALUE!`; Core1 correctly stopped at `UNKNOWN_DOMAIN`. This is not a selectable implementation scope.

## FIRST_UNEXPECTED_DIVERGENCE

In the ordered matrix the first unexpected divergence is `rosa-09-h3-r08`: climate, D8 and effective frame step match (`6 m`), but the frame beam profile differs (`ПГС245/20х80х1,5` in Excel versus `ПГС245/20х80х2` in Core1), followed by frame mass and D69. This is a frame-selection/profile parity issue, not a climate or frame-step issue.

The independent high-value findings are:

- 18 m boundary cases at 3.0, 3.81 and 5.01 m are full parity in the recorded chain.
- 21 m has matching climate, D8, step, profiles, purlin and frame mass but a structural-summary mass delta; the next trace must isolate the summary intermediate rather than changing selection.
- 24 m at 3.0 m matches frame selection but diverges first at purlin step (`1715` Excel vs `1720` Core1). This remains outside the already proven active 24 m scope until separately audited.
- 6.21 m is a domain boundary with an active Excel error, not evidence that Core1 should extrapolate the 6.0 m key.

## Current CORE1_PROVEN_DOMAIN

The conservative proven domain after this pass is:

| Span | Height scope | Responsibility | Mode | Connection | Status |
|---|---|---|---|---|---|
| 9–21 m | proven cases and the audited 18 m transition points; automatic only | 0.8 and 1.0 where reference-tested | automatic | generic 9–21 model | partial by family; do not generalize 9/12/15/21 boundary results |
| 18 m | 3.0, 3.81, 5.01 m in this matrix | 0.8 / 1.0 | automatic | ROW14 tested | FULL_PARITY for the recorded scenarios |
| 24 m | existing automatic low-height ROW14 scope only | reference-tested factors | automatic | limited / no generic connection claim | proven only in existing scope; new 3.0 m case diverged at purlin |
| any family | 6.21 m and above | either | automatic | unsupported unless separately proven | CORE1_UNKNOWN_DOMAIN or legacy/source error |

Manual D9, upper-height 7–9 m branches, 24 m ROW15, stale-cache replay and window-enhanced paths remain outside this matrix.

## Status

`SUPPORTED_DOMAIN_MATRIX_COMPLETE = NO`

The boundary matrix is recorded and reproducible, but the supported domain is not closed because five unexpected divergences remain. `PRODUCTION CODE CHANGED = NO`.

`NEXT_HIGHEST_VALUE_PARITY_BLOCK = controlled frame-selection audit for the 9/12/15 m 3.0 m profiles, followed by the 21 m summary intermediate and the 24 m purlin-step branch.`
