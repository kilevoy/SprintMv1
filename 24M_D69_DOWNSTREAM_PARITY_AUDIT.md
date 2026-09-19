# 24M DOWNSTREAM D69 PARITY AUDIT

Mode: read-only first-divergence audit. No production code, XLSX/PDF, or
`outputs/` was modified. No commit or push was performed.

## Control scenario

The control is the already recalculated automatic 24 m, low-height scenario
used by the profile-boundary validation:

- city: `Роза`;
- span: `24 m`;
- length: `18 m`;
- height: `3.0 m` (the 3.8 m boundary gives the same downstream values);
- responsibility: `0.8`;
- automatic frame-step mode;
- roof/deck branch: `С-П 150` / `С44-1000-0,7`;
- zero openings;
- `D9` blank.

The separate default-roof active fixture remains a different proven case:
`active_24m_auto` reaches `D69 = 35.73278736728395`. This report concerns the
boundary case where the remaining downstream difference was observed.

## 1. Excel D69 chain

The active formulas are:

```text
вывод!D69 = IF(D9=0,E8,E9)+D68
вывод!E8  = подбор!Z14 + 'Подбор прогонов'!T28
вывод!E9  = подбор!Z15 + 'Подбор прогонов 2'!T28
вывод!D68 = Лист1!O28
```

For the control, `D9` is blank/zero, so the active branch is `E8`:

| Stage | Excel value | Formula/source | Status |
|---|---:|---|---|
| frame profile / frame mass | exact match; frame mass `1415.598896` | `24м` selected row | MATCH |
| automatic D8 | `5` | legacy automatic step output | MATCH |
| `подбор!Z14` | `26.979706743827165` | selected structural aggregate | FIRST DIVERGENCE |
| `подбор!Z15` | `26.979706743827165` | mirrored aggregate | same branch value |
| `Подбор прогонов!T28` | `4.956` | `IF(T25=0,T26,T25)` | MATCH |
| `Подбор прогонов 2!T28` | `4.956` | mirrored branch | MATCH |
| `вывод!E8` | `31.935706743827165` | `Z14 + T28` | differs only because Z14 differs |
| `вывод!E9` | `31.935706743827165` | `Z15 + T28` | same as E8 |
| `Лист1!O28` | `0` | zero-opening aggregate | MATCH |
| `вывод!D68` | `0` | `=Лист1!O28` | MATCH |
| `вывод!D69` | `31.935706743827165` | `=E8+D68` | final difference |

## 2. Core1 D69 chain

Core1 reaches the summary with the already matched 24 m frame selection:

| Stage | Core1 value | Core1 owner | Status |
|---|---:|---|---|
| frame profile / frame mass | exact match; `1415.598896` | `FrameSelector` / 24 m dataset | MATCH |
| effective frame step | `5 m` | `FrameSelector` | MATCH |
| `structural_base_kg_per_m2` | `24.858503040123463` | `FrameSelector` 24 m row | FIRST DIVERGENCE |
| purlin profile / step | exact profile; `1720 mm` | `PurlinCalculator` | profile/branch under audit |
| purlin specific mass | `4.956` | `PurlinCalculator` | MATCH with `T28` |
| structural summary | `24.858503040123463 + 4.956` | `StructuralSummary` | deterministic |
| opening mass `D68` equivalent | `0` | `OpeningMassCalculator` | MATCH |
| `D69` | `29.814503040123462` | `StructuralSummary` | final difference |

The arithmetic is:

```text
Core1 D69 = 24.858503040123463 + 4.956 + 0
          = 29.814503040123462
```

Therefore the downstream mismatch is not caused by a second independent D69
formula. It is inherited from the structural-base value supplied to the
summary.

## 3. Strict first-divergence order

| Order | Quantity | Excel | Core1 | Delta | Classification |
|---:|---|---:|---:|---:|---|
| A | frame/profile/mass | `1415.598896` | `1415.598896` | `0` | MATCH |
| B | `Z14` / structural base | `26.979706743827165` | `24.858503040123463` | `2.121203703703702` | FIRST DIVERGENCE |
| C | purlin `T28` | `4.956` | `4.956` | `0` | MATCH |
| D | `E8` | `31.935706743827165` | `29.814503040123462` | `2.121203703704` | propagated |
| E | `D68` | `0` | `0` | `0` | MATCH |
| F | `D69` | `31.935706743827165` | `29.814503040123462` | `2.121203703704` | propagated |

`Z14` is the first numeric divergence. The evidence does not justify changing
the frame-profile resolver, climate resolver, or purlin selector.

## 4. Z14 decomposition

Excel's active structural aggregate is the selected `подбор!O7`/`O14` path
through the 24 m branch and its current roof/deck-dependent source values. For
this control it yields `26.979706743827165`.

Core1 uses the cached 24 m structural-base value associated with the selected
local 24 m frame row, yielding `24.858503040123463`. The matched frame profile
and frame mass do not prove that the row's structural aggregate is equivalent
to Excel's active `O7/O14 → Z14/Z15` result. The aggregate includes more than
the displayed beam/column identity and can vary with 24 m-specific helper
cells and roof/deck branch inputs.

The precise unresolved dependency is therefore:

```text
24m selected branch + roof/deck inputs
→ active O7/O14 helper chain
→ Z14/Z15
```

No evidence was found that `SecondarySteelResult` components should be added
to `D69` at this point. The legacy formula uses `Z14/Z15` plus purlin `T28`
and `D68`; adding secondary-steel totals would double-count or change the
legacy contract.

## 5. Purlin T28

The Excel formula is:

```text
Подбор прогонов!T28 = IF(T25=0,T26,T25)
```

For the control both Excel purlin branches return `4.956`. Core1 also returns
specific purlin mass `4.956`; its selected step is `1720 mm`. The current
evidence therefore classifies the purlin specific-mass contribution as
`PROVEN/MATCH` for this case. The step cell itself is a selector detail and is
not the first D69 divergence.

The separately proven legacy 500 mm `#REF!` behavior was not active in this
control and was not changed.

## 6. D68 and E8/E9 branch

`Лист1!O28 = 0`, so `вывод!D68 = 0` in both models. There are no openings in
the control; this is not evidence for nonzero-window or enhanced-window
branches.

`D9` is blank/zero, therefore Excel uses `E8`. In this control `E8 = E9`.
This equality does not prove that ROW14 and ROW15 are universally identical;
it only means the two aggregate branches produce the same value for this
zero-opening automatic case.

## 7. Root cause and safe next step

**FIRST_24M_DOWNSTREAM_DIVERGENCE:** `подбор!Z14` / Core1
`structural_base_kg_per_m2`.

**ROOT CAUSE:** the current Core1 24 m structural-base lookup is not yet
proven equivalent to the active Excel `O7/O14 → Z14/Z15` aggregate for the
`С-П 150` boundary branch. Frame profile parity and purlin parity are
insufficient to establish aggregate parity.

**CLASSIFICATION:** `STRUCTURAL_BASE_AGGREGATE / 24M_BRANCH_DEPENDENT`.

**MINIMAL FIX:** not justified by this audit. The exact O7/O14 precedent chain
and the corresponding Core1 component mapping must be extracted first. No
production code was changed.

## 8. Regression and limitations

The existing 9/12/15/18/21 real-project controls remain outside this
read-only audit and were not modified. The default 24 m automatic fixture is
already covered by `active_24m_auto` with numeric D69 parity. This report does
not expand support to:

- 24 m upper heights;
- manual D9;
- natural ROW15 cases;
- nonzero opening/window enhanced branches;
- unproven 24 m connection snapshots.

## Final statuses

```text
24M_FRAME_PROFILE_PARITY = PROVEN
24M_D8_PARITY = PROVEN
24M_Z14_PARITY = FAILED (first divergence in the С-П 150 boundary case)
24M_PURLIN_T28_PARITY = PROVEN for specific mass 4.956
24M_D68_PARITY = PROVEN for zero-opening control
24M_D69_PARITY = PARTIAL
FIRST_24M_DOWNSTREAM_DIVERGENCE = Z14 / structural-base aggregate
PRODUCTION_CODE_CHANGED = NO
XLSX_CHANGED = NO
COMMIT/PUSH = NO
```
