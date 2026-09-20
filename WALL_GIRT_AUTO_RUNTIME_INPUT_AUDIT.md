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

## 8. Capacity-family inventory

The capacity decision has one common dynamic shell and four semantic raw-input
families in `W7:W638`:

| family | source rows | exact source form | dynamic inputs | units |
|---|---:|---|---|---|
| `CAP-RAW-STATIC` | 249 | cached literal `W[r]` | none at runtime; candidate constant | capacity coefficient, source-defined |
| `CAP-RAW-LITERAL` | 316 | row literal expressions such as `0.2/0.86*P4`, `0.3/1.03`, `3.6/0.96` | candidate literal and, where present, workbook `P4` | capacity coefficient, source-defined |
| `CAP-RAW-SELF-X1` | 51 | `W[prior-row]*1` | prior candidate `W` | capacity coefficient, source-defined |
| `CAP-RAW-SELF-P6` | 16 | `W[prior-row]*$P$6` | prior candidate `W`, workbook `P6` | capacity coefficient, source-defined |

The four counts sum to all 632 restricted rows. Source row identities and
original formulas remain in the evidence JSON; the counts are identical for
corner and typical branches.

The remaining capacity families are formula templates, not additional raw
catalog families:

| family | source rows / grid | formula |
|---|---|---|
| `CAP-X` | every candidate row | `X[r] = W[r] * IF(B32=0,O[r],B32) * IF(M[r]=1,P4,1)` |
| `CAP-AD` | every candidate × 251 steps | `AD[step] = AD6[step] / X[r]` |
| `CAP-AD6` | every 251-step column | `AD6 = (C3 * AD4 * step_mm/1000) * B13^2 / 8` |
| `CAP-JW` | every candidate × 251 steps | common AND gate; corner uses local `S[r]`, typical uses the branch-specific `S[r]` reference |

Workbook constants proven in this chain are `P4=0.55`, `gamma_f=1.4`, the
251-step axis, and the source area-reduction table. `P6` is a workbook helper
used by the 16 `CAP-RAW-SELF-P6` rows and is not a ProjectInput field.

For the two control rows, the complete capacity values are:

| branch / row | `W` | `O` | `M` | `X` | winner step | cached/replayed utilization at winner |
|---|---:|---:|---:|---:|---:|---:|
| corner / 161 | 5.8235294118 | 0.85 | 1.5 | 4.95 | 1370 | `0.99795902976` |
| typical / 46 | 3.75 | 0.85 | 1.2 | 3.1875 | 1380 | source-matched |

The same replay checked 10 additional rows (`7, 8, 335, 336, 499, 507, 609,
614, 620, 625`) over 251 steps in each branch:

```text
CELLS_CHECKED = 5020
UTILIZATION_MISMATCHES = 0
JW_MISMATCHES = 0
REPRESENTATIVE_CAPACITY_PARITY = PASS
```

The cached workbook is opened only for the comparison phase. The selector
replay itself reads neither cached utilization, cached JW, cached objective nor
cached selected-result cells.

## 9. Runtime mapping closure

| runtime field | Excel source cell | current field | transformation | status |
|---|---|---|---|---|
| `w0_kPa` | `Лист1!B17 → Ветер по СП!C9` | `Core1Result.climate.wind_load` | canonical SP20 climate load is passed to branch pressure | PROVEN |
| `terrain` | `Лист1!B16 → Ветер по СП!C4` | `ProjectInput.other.terrain_type` | direct A/B/C enum | PROVEN |
| `responsibility_factor` | `Лист1!B3` | `geometry.responsibility_factor` | multiply branch wind pressure | PROVEN |
| `building_height_m` | `Лист1!B8 → C8=MAX(5,B8)` | `geometry.building_height_m` | clamp only inside wind helper | PROVEN |
| `wall_height_m` | `Лист1!B12` | none | direct input to `CEILING(B12/step)-1` | MISSING |
| `post_step_m` | `Лист1!B13` | none | direct in zone lengths, capacity `B13²`, objective | MISSING |
| `wall_calculation_length_m` | `Лист1!B11` | no exact field | typical length = `B11-cornerLength` | PARTIAL |
| `corner_zone_length_m` | `Ветер по СП!J30:J31`, `Расчет Угловая!C8` | derived | `a=MIN(B7,2*MAX(5,B8))/5`; then `2*CEILING(a/B13)*B13` | PROVEN formula / inputs missing |
| `typical_zone_length_m` | `Расчет Рядовая!B7:C8` | derived | `B11-corner_zone_length` | PARTIAL because B11 is not mapped |
| `insulation_mm` | branch `B11`, candidate `U`, wall-system lookup | `ProjectInput.envelope.wall_system` only | lookup to insulation thickness, then `U=B11` | PARTIAL |
| `utilization_override` | `Лист1!B32` | none | `0 → O[r]`, otherwise use B32 | MISSING; default-only is proven |
| `profile_family_filter` | `W89:W94`, selector `W89` | none | candidate `I` gate | MISSING except restricted `all` constant |
| `section_type_filter` | `W102:W105`, selector `W102` | none | candidate `K` gate | MISSING except restricted `all` constant |
| `material_filter` | `W97:W99`, selector `W97` | none | candidate `Q` gate | MISSING except restricted `all` constant |
| `min/max_profile_height_mm` | `Лист1!B34:B33` | none | candidate `N` range gate | MISSING except restricted `145..145` |
| `min/max_wall_girt_step_mm` | `Лист1!B23:B24` / typical controls | none | step gate in JW | MISSING except restricted `0..1500` |
| `without_studs` | `W107`, candidate `R/S` | no user field | restrict `R=TRUE`, no-stud branch | PARTIAL / restricted constant |

## 10. Audit-only contract

The minimum contract required by the proven formulas is:

```ts
type WallGirtAutoRuntimeInput = {
  normativeSystem: "SP_20";
  w0_kPa: number;
  terrain: "A" | "B" | "C";
  responsibilityFactor: number;
  buildingHeight_m: number;
  wallHeight_m: number;
  wallCalculationLength_m: number;
  postStep_m: number;
  insulation_mm: number;
  utilizationOverride: number; // 0 means candidate O[r]
  minProfileHeight_mm: number;
  maxProfileHeight_mm: number;
  minStep_mm: number;
  maxStep_mm: number;
  profileFamily: "all" | string;
  sectionType: "all" | string;
  material: "all" | string;
  withoutStuds: true;
};
```

This is an audit contract only. It is intentionally not added to production
types or adapters. `wallHeight_m`, `wallCalculationLength_m`, and `postStep_m`
must be supplied explicitly until a source-backed application mapping exists.

## 11. Parallel-source classification

The comparison against `insicomet/SprintM` commit
`7920b45979ed25e608310be6996ee63dfe680a5` is limited to `windLoad.ts` and
`bearingCatalog.ts` as requested. The parallel wind helper has reusable
`kZe`/`zeta` table shapes and pressure ingredients, while the catalog mirrors
some profile/material fields. Neither file contains the authoritative
workbook-specific `W → X → AD → JW → objective` chain, selector state, or
branch geometry. Classification:

```text
WIND_CHAIN_PROVEN = YES for the authoritative workbook chain
PARALLEL_windLoad.ts = PARTIAL / reusable helper evidence
PARALLEL_bearingCatalog.ts = PARTIAL / catalog-field evidence
PARALLEL_SELECTOR_LOGIC = NOT_USED
```

## 12. Final status

```text
CAPACITY_FORMULA_FAMILIES = 4 semantic raw families + common X/AD/AD6/JW shell
CAPACITY_CHAIN_PROVEN = YES (restricted SP20/no-stud contract)
WIND_CHAIN_PROVEN = YES (authoritative workbook chain)
W0_RUNTIME_MAPPING = PROVEN
TERRAIN_RUNTIME_MAPPING = PROVEN
RESPONSIBILITY_RUNTIME_MAPPING = PROVEN
POST_STEP_RUNTIME_MAPPING = MISSING
WALL_HEIGHT_RUNTIME_MAPPING = MISSING
CORNER_ZONE_RUNTIME_MAPPING = PROVEN formula / MISSING inputs
TYPICAL_ZONE_RUNTIME_MAPPING = PARTIAL
FILTER_RUNTIME_MAPPING = PARTIAL (restricted constants only)
JW_RUNTIME_INPUTS_COMPLETE = NO
CACHE_INDEPENDENT_CORNER_REPLAY = PASS
CACHE_INDEPENDENT_TYPICAL_REPLAY = PASS
REPRESENTATIVE_CAPACITY_ROWS = 10 additional rows × 251 steps × 2 branches
REPRESENTATIVE_CAPACITY_PARITY = PASS
SAFE_TO_IMPLEMENT_RESTRICTED_AUTO = NO
MISSING_INPUTS = wall_height_m, post_step_m, exact B11 policy, insulation lookup, selector/filter policy, B32 override policy
NEXT_STAGE = fresh source cases varying B11/B12/B13 and selectors, then explicit adapter contract
```

No production selector, UI, Core1, ProjectInput, XLSX or heuristic fallback
was changed. No commit or push was performed.

## 13. Remaining input-semantics audit

This section closes only the remaining input semantics. The candidate rows,
capacity formulas, JW, objective, tie-break and the two proven winners are not
re-audited here.

### 13.1 Source labels and workbook metadata

Authoritative workbook: `Калькулятор ограждайки v1.5 (1).xlsx`, sheet `Лист1`.
The label cells are shared-string entries in the workbook and are displayed as
the following Russian labels:

| cell | visible label | cached value | format | comment/note | validation | source type |
|---|---|---:|---|---|---|---|
| `A11/B11` | `Длина` | `24` | `General` | none | none | literal input |
| `A12/B12` | `Высота` | `9.3` | `General` | none | none | literal input |
| `A13/B13` | `Шаг стоек` | `6` | `General` | none | none | literal input |

The nearby `A10` label is the section/header for the additional wall geometry
inputs. There are no comments/notes, data-validation rules, or defined names
attached to `B11:B13`.

Relevant direct dependents are:

```text
Лист1!B11
  → Расчет Рядовая!B7 = Лист1!B11 - Расчет Угловая!C8
  → Расчет Рядовая!C8 = B7
  → typical-zone length and its downstream capacity/objective grids

Лист1!B12
  → Расчет Угловая!TQ3:ADG3 = CEILING(B12/(step/1000))-1
  → objective row-count term and support-span term
  → same row-count chain in Расчет Рядовая

Лист1!B13
  → Расчет Угловая!C8 = 2*CEILING(B7/B13)*B13 (with the <0.5 branch)
  → branch AD3/AD6 capacity area and B13² term
  → branch TQ4:ADG4 = row_count*B13
  → typical-zone geometry through the corner-zone subtraction
```

`B11:B13` are therefore not merely cached copies of `B7:B8` or of the frame
grid. Their literal input status is directly evidenced by the XML and by the
absence of formulas, validation, comments and named-range bindings.

### 13.2 Secondary research case

The parallel research note describes Blagoveshchensk with
`buildingHeight_m=10.5`, `wallHeight_m=9.3`, and `postStep_m=6`. These numbers
match the authoritative case values `Лист1!B8=10.5`, `B12=9.3`, and `B13=6`,
but this is secondary corroboration only. The source labels and dependents—not
the numeric coincidence—establish the semantics.

```text
RESEARCH_CASE_NUMERIC_MATCH = YES
RESEARCH_CASE_PROOF_OF_MAPPING = NO
```

### 13.3 B13 versus the current frame grid

`B13` is labelled `Шаг стоек` and is used as the wall-girt support/post spacing:
it controls the corner-zone rounding, the loaded area in `B13²`, and the
objective support-span term. `ColdEnclosureInput.frameGrid.effectiveFrameStep_m`
is the structural frame grid delivered by Core1. The current code has no direct
source-backed formula or provenance assertion that the two fields are always
identical; a numerical match in the Blagoveshchensk case is not sufficient.

```text
B13_TO_EFFECTIVE_FRAME_STEP = PARTIAL
```

For a future implementation, `postStep_m` may be populated from a structural
context only after that context explicitly declares it to be the source-backed
wall support step. It must not be silently aliased merely because both values
are measured in metres.

### 13.4 B12 and B11

`B12` is the wall calculation height. It is distinct from `B8` because the
authoritative case has `B12=9.3` and `B8=10.5`, and its only relevant formula
role is the wall-girt row-count chain. It is not proven to be eave height,
column height, or total building height derived from existing ProjectInput.

```text
B12_RUNTIME_SOURCE = NEW FIELD REQUIRED
B12_RUNTIME_MAPPING = NO
```

`B11` is the wall calculation length used to obtain the typical zone after the
corner-zone length is subtracted. Its label is `Длина`, but it is a literal
input separate from `B7`; the cached equality `B11=B7=24` does not prove an
alias for other projects.

```text
B11_RUNTIME_MAPPING = PARTIAL
B11_RUNTIME_SOURCE = NEW FIELD REQUIRED unless an explicit project policy proves B11=building_length_m
```

### 13.5 Insulation mapping

The JW gate compares candidate `U[r]` with branch `B11`, where branch `B11` is
an insulation-thickness lookup driven by the wall-system choice. In the
authoritative `профлист` state the lookup returns `0`, and all restricted
candidate rows have `U=0`.

Current `ProjectInput.envelope.wall_system` is a descriptive string and the
adapter can accept an optional enclosure insulation object, but there is no
complete authoritative mapping from every wall-system string to the workbook
insulation selector. Therefore:

```text
INSULATION_RUNTIME_MAPPING = PARTIAL
0_mm_for_proven_профлист = PROVEN
arbitrary_wall_system_to_U = UNSUPPORTED
```

No thickness is inferred from the current UI text.

### 13.6 Restricted AUTO filter policy

| selector | workbook source | policy class | status |
|---|---|---|---|
| profile family | `W89:W94`, candidate `I` | fixed legacy default `all` in restricted mode | PARTIAL |
| section type | `W102:W105`, candidate `K` | fixed legacy default `all` in restricted mode | PARTIAL |
| material | `W97:W99`, candidate `Q` | fixed legacy default `all` in restricted mode | PARTIAL |
| insulation | branch `B11`, candidate `U` | must be explicit; `0` only for proven `профлист` | PARTIAL |
| profile height | `B34:B33`, candidate `N` | restricted default `145..145`; not user-controlled today | PARTIAL |
| no-stud | `W107`, candidate `R/S` | fixed `withoutStuds=true`; plus-stud branch unsupported | PARTIAL |
| min/max step | `B23:B24` and typical controls | restricted `0..1500` from source case; not current ProjectInput | PARTIAL |

There is no evidence that these selectors are user inputs in the current
ProjectInput. They are therefore not treated as “allow all” application
defaults outside the explicitly restricted audit contract, and the cached
selector state is not silently promoted to a general policy.

### 13.7 B32 utilization override

`Лист1!B32` is a literal, unvalidated cell with cached value `0`. The exact
candidate formula is:

```excel
X[r] = W[r] * IF(Лист1!B32=0, O[r], Лист1!B32) * IF(M[r]=1, P4, 1)
```

Thus `0` means “use the candidate row's default utilization coefficient
`O[r]`”; a non-zero value is an optional manual utilization override. It is
not the existing `window_utilization_limit`, which belongs to openings and is
not part of this chain.

```text
B32_RUNTIME_POLICY = fixed 0 in restricted AUTO; expose later as OPTIONAL_OVERRIDE
```

### 13.8 Final contract classification

The audit-only `WallGirtAutoRuntimeInput` contract is now classified as:

| field | classification |
|---|---|
| `w0_kPa`, `terrain`, `responsibilityFactor`, `buildingHeight_m` | AVAILABLE_NOW / DERIVED_NOW |
| `wallHeight_m` | NEW_PROJECT_FIELD_REQUIRED |
| `wallCalculationLength_m` | NEW_PROJECT_FIELD_REQUIRED unless explicit alias policy is approved |
| `postStep_m` | NEW_PROJECT_FIELD_REQUIRED; structural-context alias remains PARTIAL |
| `insulation_mm` | AVAILABLE_NOW only for proven `профлист→0`; otherwise UNSUPPORTED |
| filters | fixed restricted policy only; general user mapping UNSUPPORTED |
| `utilizationOverride` | OPTIONAL_OVERRIDE; restricted value fixed at `0` |

This is an audit contract only. No production types or adapters were modified.

## 14. Updated decision

```text
B11_RUNTIME_MAPPING = PARTIAL
B12_RUNTIME_MAPPING = NO
B13_RUNTIME_MAPPING = PARTIAL
INSULATION_RUNTIME_MAPPING = PARTIAL
FILTER_RUNTIME_MAPPING = PARTIAL
B32_RUNTIME_POLICY = fixed 0 for restricted AUTO; later optional advanced override

NEW_PROJECT_FIELDS_REQUIRED = wallHeight_m, wallCalculationLength_m, postStep_m
JW_RUNTIME_INPUTS_COMPLETE = NO
SAFE_TO_IMPLEMENT_RESTRICTED_AUTO_CORE = YES
SAFE_TO_WIRE_AUTO_FROM_CURRENT_PROJECTINPUT = NO
```

The selector core can now be implemented against the explicit audit contract
without heuristic fallback. It must not yet be wired to ordinary current
`ProjectInput`, because the three independent workbook geometry inputs and the
general insulation/filter policy are not represented with proven semantics.

## 15. Orientation-dependent wall-height correction

The earlier global interpretation of `Лист1!B12` as a building-height mapping
is superseded by this section. `B12` must not be mapped globally to
`ProjectInput.geometry.building_height_m`.

### Authoritative workbook evidence

The workbook has one shared `Лист1!B12` literal input labelled `Высота`, with
cached value `9.3`. It is consumed by both `Расчет Угловая` and `Расчет
Рядовая` row-count/objective grids through:

```excel
CEILING(Лист1!$B$12/(step/1000))-1
```

The source contains the branches `Расчет Угловая` and `Расчет Рядовая`, but
these are corner/typical wall-girt zones, not an explicit SIDE-versus-END wall
orientation switch. There is no separate `B12` for a side wall and an end/gable
wall, no orientation selector, and no formula changing `B12` from `B8` or from
roof geometry.

The same workbook exposes:

```text
B6 = span, m
B7 = building length, m
B8 = building height, m
B11 = wall-calculation length, m
B12 = wall-calculation height, m
B13 = post/support step, m
```

For the cached case, `B8=10.5` and `B12=9.3`. This proves that `B12` is a
distinct wall-calculation input in this workbook. It does not prove that `9.3`
is an eave height, a side-wall height, or a derived height from `B6/B7/B8`.

### Span, roof and ridge trace

`B6` is used by the wind helper as span context (`Ветер по СП!C6=B6`). The
authoritative wall-girt chain does not contain a roof-slope input, roof pitch,
eave-height formula, ridge-height formula, or SIDE/END orientation branch.
Searches of the relevant workbook sheets find no source-backed transformation
of the form:

```text
ridge_height = eave_height + f(span, roof_slope)
```

The workbook therefore cannot establish an end-wall height from roof geometry.
The parallel research case repeats the numbers `buildingHeight_m=10.5`,
`wallHeight_m=9.3`, and `postStep_m=6`, but that is secondary corroboration and
does not supply a missing ridge formula.

### Required runtime semantics

The future runtime contract must distinguish:

```ts
sideWallCalculationHeight_m: number | null;
endWallCalculationHeight_m: number | null;
```

However, based on this workbook alone:

```text
SIDE_WALL_HEIGHT_MAPPING = NO
END_WALL_HEIGHT_MAPPING = NO
B12_SEMANTICS = single manual wall-calculation height input;
                 orientation-dependent interpretation is NOT proven
```

If a future source proves that the workbook is run one wall orientation at a
time, the value must be recorded as a manually changed `B12` per run—not
collapsed into one global `building_height_m`. Until that evidence exists,
`sideWallCalculationHeight_m` and `endWallCalculationHeight_m` remain separate
required inputs with `UNKNOWN`/unsupported status, and no ridge height is
invented.

### Corrected final decision

```text
B11_RUNTIME_MAPPING = PARTIAL
B12_RUNTIME_MAPPING = NO (orientation-specific source mapping unavailable)
B13_RUNTIME_MAPPING = PARTIAL
B13_TO_EFFECTIVE_FRAME_STEP = PARTIAL
SIDE_WALL_HEIGHT_MAPPING = NO
END_WALL_HEIGHT_MAPPING = NO
INSULATION_RUNTIME_MAPPING = PARTIAL
FILTER_RUNTIME_MAPPING = PARTIAL
B32_RUNTIME_POLICY = fixed 0 for restricted AUTO; later optional override

NEW_PROJECT_FIELDS_REQUIRED =
  wallCalculationLength_m,
  sideWallCalculationHeight_m,
  endWallCalculationHeight_m,
  postStep_m,
  explicit insulation/filter policy

JW_RUNTIME_INPUTS_COMPLETE = NO
SAFE_TO_IMPLEMENT_RESTRICTED_AUTO_CORE = YES
SAFE_TO_WIRE_AUTO_FROM_CURRENT_PROJECTINPUT = NO
```
