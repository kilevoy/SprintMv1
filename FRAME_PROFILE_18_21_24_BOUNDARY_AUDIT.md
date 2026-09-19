# FRAME PROFILE BOUNDARY AUDIT — 18 m / 21 m / 24 m

Mode: read-only validation. No production code, XLSX/PDF or `outputs/` was
modified. No commit or push was performed.

## Oracle scope

Fresh Excel copies were recalculated for the requested height boundaries:

- 18 m and 21 m: 3.80, 3.81, 5.00, 5.01, 6.00, 6.20, 6.21;
- climate cross-check: Сургут, Березовский, Увильды at 18 m / 3.81 m;
- 24 m: 3.00 and 3.80 only, within the existing automatic low-height scope.

Core1 was run with the same automatic inputs and `С-П 150` roof covering.

`D28` in the oracle output is retained as the legacy displayed auxiliary
value. The independently compared frame-count invariant is
`ceil(length / effective_step) + 1`; raw `Z14`/`Z15` cells were not emitted by
the existing oracle runner and are therefore not silently substituted in this
report.

## 18 m boundary matrix — Роза, responsibility 0.8

| Height | Height key | Excel D8 | Core1 step | Excel beam / column | Core1 beam / column | Excel mass | Core1 mass | D69 Excel/Core1 | Class |
|---:|---:|---:|---:|---|---|---:|---:|---:|---|
| 3.80 | 3.6 | 6 | 6 | 300x3 / 300x2.5 | same | 940 | 940 | 26.73567284 / same | FULL_PARITY |
| 3.81 | 4.8 | 5 | 5 | 300x3 / 245x2.5 | same | 952 | 952 | 29.35203086 / same | FULL_PARITY |
| 5.00 | 4.8 | 5 | 5 | 300x3 / 245x2.5 | same | 952 | 952 | 29.35203086 / same | FULL_PARITY |
| 5.01 | 6.0 | 5 | 5 | 300x3 / 245x2.5 | same | 1002 | 1002 | 30.67003086 / same | FULL_PARITY |
| 6.00 | 6.0 | 5 | 5 | 300x3 / 245x2.5 | same | 1002 | 1002 | 30.67003086 / same | FULL_PARITY |
| 6.20 | 6.0 | 5 | 5 | 300x3 / 245x2.5 | same | 1002 | 1002 | 30.67003086 / same | FULL_PARITY |
| 6.21 | outside | Excel error state | UNKNOWN_DOMAIN | error | unsupported | — | — | — | EXPECTED_LEGACY_ERROR |

Frame counts derived from the same effective steps are 4 at 3.80, 5 at
3.81–6.20, and undefined at 6.21 because the legacy calculation is already
in an error state. Connection outputs changed with the active legacy row but
did not diverge from the corresponding Excel results in the calculable cases.

## 21 m boundary matrix — Роза, responsibility 0.8

| Height | Height key | Excel D8 | Core1 step | Excel beam / column | Core1 beam / column | Excel mass | Core1 mass | D69 Excel/Core1 | Class |
|---:|---:|---:|---:|---|---|---:|---:|---:|---|
| 3.80 | 3.6 | 5 | 5 | 300x3 / 245x2.5 | same | 1066 | 1066 | 26.83606349 / same | FULL_PARITY |
| 3.81 | 4.8 | 5 | 5 | 300x3 / 300x2.5 | same | 1124 | 1124 | 28.12177778 / same | FULL_PARITY |
| 5.00 | 4.8 | 5 | 5 | 300x3 / 300x2.5 | same | 1124 | 1124 | 28.12177778 / same | FULL_PARITY |
| 5.01 | 6.0 | 4 | 4 | 300x3 / 245x2.5 | same | 1127 | 1127 | 31.41539683 / same | FULL_PARITY |
| 6.00 | 6.0 | 4 | 4 | 300x3 / 245x2.5 | same | 1127 | 1127 | 31.41539683 / same | FULL_PARITY |
| 6.20 | 6.0 | 4 | 4 | 300x3 / 245x2.5 | same | 1127 | 1127 | 31.41539683 / same | FULL_PARITY |
| 6.21 | outside | Excel error state | UNKNOWN_DOMAIN | error | unsupported | — | — | — | EXPECTED_LEGACY_ERROR |

Frame counts derived from the effective steps are 5 at 3.80–5.00 and 6 at
5.01–6.20. No calculable boundary divergence was found.

## Climate cross-check — 18 m / 3.81 m / responsibility 0.8

| City | Legacy selector | Excel step | Core1 step | Excel beam / column | Core1 beam / column | Excel mass | Core1 mass | D69 | Class |
|---|---|---:|---:|---|---|---:|---:|---:|---|
| Сургут | active factor 1.0, branch 3/1 | 4.5 | 4.5 | 300x3 / 245x2.5 | same | 960 | 960 | 28.86030093 | FULL_PARITY |
| Березовский | active factor 0.8, branch 3/1 | 5 | 5 | 300x3 / 245x2.5 | same | 971 | 971 | 24.75707037 | FULL_PARITY |
| Увильды | active factor 0.8, branch 3/2 | 5 | 5 | 300x3 / 245x2.5 | same | 952 | 952 | 27.30320085 | FULL_PARITY |

Canonical climate remains separate from the legacy selector. The selector
changes D8/branch behavior without requiring a new profile resolver.

## 24 m proven scope

Only automatic low-height cases were checked:

| Height | Responsibility | Excel step | Core1 step | Profiles/mass | D69 | Class |
|---:|---:|---:|---:|---|---:|---|
| 3.00 | 0.8 | 5 | 5 | exact / 1415.598896 | 31.93570674 vs 29.81450304 | STRUCTURAL_PARITY |
| 3.80 | 0.8 | 5 | 5 | exact / 1415.598896 | 31.93570674 vs 29.81450304 | STRUCTURAL_PARITY |

The profile, frame mass and automatic step match. The remaining D69 difference
is downstream and outside this profile-boundary decision. No upper-height,
manual D9 or natural ROW15 support is claimed.

## First divergence

No unexpected frame-profile divergence was found for the calculable 18 m or
21 m boundary cases or the climate cross-check. At 24 m the first remaining
divergence is downstream D69, while profile/step/frame mass remain equal. At
6.21 m the Excel oracle itself enters its legacy error state; Core1 correctly
returns `UNKNOWN_DOMAIN` rather than manufacturing a profile.

## Final status

```text
FRAME_PROFILE_18M_BOUNDARIES = PROVEN
FRAME_PROFILE_21M_BOUNDARIES = PROVEN
FRAME_PROFILE_24M_LOW_HEIGHT = PROVEN (profile scope; D69 downstream delta remains)
NEW_RESOLVER_REQUIRED_18_21_24 = NO
FIRST_UNEXPECTED_DIVERGENCE = none in calculable 18/21 boundary cases
PRODUCTION_CODE_CHANGED = NO
```
