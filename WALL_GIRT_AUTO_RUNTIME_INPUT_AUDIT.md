# Wall-girt AUTO runtime input audit

Status: audit-only. Production selector, `ProjectInput`, `ColdEnclosureInput`,
XLSX and `outputs/` were not changed.

## 1. Scope and verdict

The audit closes the restricted no-stud candidate/objective replay for the
cached source state of `Калькулятор ограждайки v1.5 (1).xlsx`. It does not prove
arbitrary-input production AUTO. The extracted evidence dataset remains
`evidence_only=true`, `runtime_imported=false`.

```text
CAPACITY_CHAIN_PROVEN = YES (restricted SP20/no-stud replay)
JW_RUNTIME_INPUTS_COMPLETE = PARTIAL (complete for the explicit restricted contract; not complete for arbitrary ProjectInput)
SAFE_TO_IMPLEMENT_RESTRICTED_AUTO = NO
PRODUCTION_CODE_CHANGED = NO
```

The reason for the final `NO` is not the candidate/objective algorithm. The
runtime contract still lacks proven authoritative mappings for wall calculation
length `Лист1!B11`, wall calculation height `Лист1!B12`, post/support step
`Лист1!B13`, insulation selector state, and the remaining workbook selectors.

## 2. Evidence and cache-independent replay

The replay uses only:

- `src/enclosure/evidence-data/wall-girt-auto-no-stud-candidates.json`;
- explicitly extracted wind tables and area-reduction table;
- the runtime contract listed below.

It does not read source-workbook cached `JW`, cached objective cells, or cached
selected-row outputs. The audit runner is
`tools/enclosure_audit/replay_wall_girt_runtime.py`.

The runner reproduces the exact source winners:

| branch | source row | step | objective | replay | status |
|---|---:|---:|---:|---|---|
| corner | 161 | 1370 mm | 233.41455363 | row 161 / 1370 mm / 233.41455363 | PASS |
| typical | 46 | 1380 mm | 188.57523862 | row 46 / 1380 mm / 188.57523862 | PASS |

The objective uses the exact row-count chain:

```text
row_count = CEILING(wall_height_m / (step_mm / 1000)) - 1
support_span = row_count * post_step_m
objective = support_span * Z
          + TO * post_step_m
          + row_count * AA
          + G / 1,000,000
          - step_mm / 1,000,000,000
          + TN * post_step_m
          + T
```

The capacity chain is:

```text
w0 / wind tables
→ branch C3 = branch wind pressure × responsibility
→ step-specific AD4 area factor
→ AD5 = C3 × AD4
→ AD6 = (AD5 × step_mm / 1000) × B13² / 8
→ utilization = AD6 / X[row]
→ JW[row, step] checks utilization ≤ 1 and all selector gates
→ objective grid
→ minimum objective
```

Validation over the representative ten-row sample from the extraction audit
covered rows `7, 8, 46, 161, 335, 336, 499, 507, 609, 614` in both branches
and all 251 steps. With the exact step-range gate included, utilization and JW
matched the cached source for all sampled corner and typical cells. This is a
validation of the extracted source state, not a fresh arbitrary-input Excel
recalculation.

## 3. Runtime input dependency map

| source cell / chain | meaning / unit | used by | current project field | status |
|---|---|---|---|---|
| `Лист1!B17 → branch C3` | normative wind pressure `w0`, kPa | capacity | `Core1Result.climate.wind_load` / canonical climate | PROVEN for CITY_LOOKUP + SP20 |
| `Лист1!B16 → Ветер по СП!C4` | terrain enum A/B/C | `kZe`, `zeta` lookup | `ProjectInput.other.terrain_type` | PROVEN direct mapping |
| `Лист1!B3 → branch C3` | responsibility factor | wind pressure | `geometry.responsibility_factor` | PROVEN |
| `Лист1!B6 → Ветер по СП!C6` | span, m | wind helper context | `geometry.span_m` | PROVEN source mapping; not the decisive wall-zone length in this chain |
| `Лист1!B7 → Ветер по СП!C7` | building length, m | `J30` / `J31` | `geometry.building_length_m` | PROVEN for this source state |
| `Лист1!B8 → C8=MAX(5,B8)` | building height, m | `kZe`, `zeta`, `J30` | `geometry.building_height_m` | PROVEN with the `MAX(5, ·)` rule |
| `Ветер по СП!J30=MIN(C7,2*C8)`; `J31=J30/5` | wind calculation length, m | corner zone formula | derived | PROVEN formula |
| `Лист1!B11` | wall calculation length, m | typical `B7`, typical zone length | no exact ProjectInput field | NEEDS EXPLICIT POLICY |
| `Лист1!B12` | wall calculation height, m | `row_count=CEILING(B12/step)-1` | no exact ProjectInput field | MISSING RUNTIME FIELD |
| `Лист1!B13` | structural post/support step, m | zone lengths, capacity `B13²`, objective | no exact ProjectInput field | MISSING RUNTIME FIELD; do not alias to frame step without proof |
| `B10` | manual-step mode selector | JW manual-step gate | no current AUTO field | RESTRICTED CONSTANT ONLY |
| `B23:B24` | corner step min/max, mm | JW step gate | no current AUTO field | RESTRICTED CONSTANT ONLY |
| `B27:B29` | typical step controls | typical branch controls | no current AUTO field | RESTRICTED CONSTANT ONLY |
| `B32` | manual utilization override | X denominator | no exact field (`other.window_utilization_limit` is unrelated) | DEFAULT-ONLY / NOT MAPPED |
| `B33:B34` | profile height max/min, mm | JW profile-height gate | no current AUTO field | RESTRICTED CONSTANT ONLY |
| `B35:B36` | thickness max/min | JW thickness gate | no current AUTO field | RESTRICTED CONSTANT ONLY |
| `B18 → B11` branch lookup | wall system / insulation thickness, mm | JW `U=B11` gate | wall system exists, exact insulation mapping not general | PARTIAL |
| `W89/W97/W102/W107` | profile/material/section/no-stud selectors | `I/K/Q/S` gates | no current user fields | RESTRICTED CONSTANT ONLY |
| candidate `W` | raw capacity coefficient / source candidate input | `X`, utilization | extracted candidate dataset | PROVEN for extracted rows; not a general catalog formula |
| candidate `O` | default utilization coefficient | `X` | extracted candidate dataset | PROVEN for extracted rows |
| candidate `M` + `P4=.55` | thickness correction | `X` | extracted candidate dataset | PROVEN for extracted rows |

## 4. Exact geometry derivation

The source case has `B7=24`, `B8=10.5`, `B11=24`, `B12=9.3`, `B13=6`.

```text
height_for_wind = MAX(5, B8) = 10.5 m
a = MIN(B7, 2 × height_for_wind) / 5 = 4.2 m
corner_zone_length = 2 × CEILING(a / B13) × B13 = 12 m
typical_zone_length = B11 - corner_zone_length = 12 m
row_count(step) = CEILING(B12 / step) - 1
```

`B11`, `B12`, and `B13` are literal workbook inputs in the authoritative
source; they are not formulas proving aliases to the current Core1 geometry.
Therefore the adapter must not silently substitute frame step for `B13`, or
building height for `B12`, in a future production implementation.

## 5. Selector and restricted state

The proven restricted state is:

```yaml
normative_system: SP_20
manual_step_mode: none
min_step_mm: 0
max_step_mm: 1500
insulation_mm: 0
utilization_override: 0
min_profile_height_mm: 145
max_profile_height_mm: 145
max_utilization: 100
profile_family: all
section_type: all
material: all
without_studs: true
```

The active selectors are `W89`, `W97`, `W102`, and `W107`; the cached source
has all catalog selectors active and `W107=TRUE` (no studs). `R=TRUE` rows are
the restricted candidate population. The `R=FALSE` plus-stud branch is not
closed by this audit.

The `JW` gate is proven as:

```excel
AND(
  step >= B23, step <= B24,
  I, K,
  M <= M4, M >= M5,
  N >= B34, N <= B33,
  Q,
  U = B11,
  AD <= 1,
  IF(B10="нет", TRUE, OR(step=D10, step=E10, step=F10)),
  S
)
```

## 6. Wind-source comparison

The source SP20 chain uses `w0`, `kZe`, `zeta`, aerodynamic coefficient,
responsibility factor, and the area-reduction table. The parallel repository
contains corresponding wind helpers, but its selector is not authoritative for
this workbook: it does not reproduce the full branch-specific `X → AD → JW →
objective` chain or all workbook selector gates.

Classification:

```text
windLoad.ts: PARTIALLY REUSABLE / INDEPENDENT RECONSTRUCTION
bearingCatalog.ts: PARTIAL CATALOG FIELD MATCH
selectGirt.ts: NOT AUTHORITATIVE FOR LEGACY SELECTION
```

The parallel minimum-total-mass selector is specifically superseded for this
legacy replay because the workbook objective includes the negative step
tie-break and the full assembly terms. Reuse is safe only after differential
verification against this source-shaped contract.

## 7. What is safe next

Safe to implement now: an audit-only or explicitly restricted resolver whose
contract requires the missing fields and declares the no-stud/SP20 domain.

Not safe yet: a general AUTO selector accepting ordinary `ProjectInput` and
silently deriving wall height, calculation length, post step, insulation, or
selectors. The next evidence needed is a set of fresh source recalculations
with controlled changes to `B11`, `B12`, `B13`, wind/terrain, height, and
selector states, plus a proven mapping from those workbook inputs to the
application contract.

```text
CAPACITY_CHAIN_PROVEN = YES for restricted source-state replay
JW_RUNTIME_INPUTS_COMPLETE = PARTIAL
SAFE_TO_IMPLEMENT_RESTRICTED_AUTO = NO
```
