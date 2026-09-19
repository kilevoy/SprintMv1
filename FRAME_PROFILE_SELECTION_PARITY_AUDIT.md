# FRAME PROFILE SELECTION PARITY AUDIT — 9 m / 12 m / 15 m

Mode: read-only reverse engineering. Production code, XLSX/PDF and `outputs/` were not modified. No commit or push was performed.

## 1. Proven Excel chain — `rosa-09-h3-r08`

The final output cells are:

```text
вывод!D33 = IF(E8>E9,подбор!V15,подбор!V14)   // beam
вывод!D34 = IF(E8>E9,подбор!U15,подбор!U14)   // column
```

For this scenario `E8 = E9`, therefore Excel uses row 14, not row 15:

```text
подбор!V14 = INDEX($C$2:$C$7,MATCH(AM9,$A$2:$A$7,0))
подбор!U14 = INDEX($B$2:$B$7,MATCH(AM9,$A$2:$A$7,0))

подбор!A2 = 9
подбор!B2 = '9м'!IA19
подбор!C2 = '9м'!IB19
```

For span 9, `AM9 = 9`, so the matched row is row 2. The active source cells are therefore:

```text
вывод!D34 → подбор!U14 → подбор!B2 → 9м!IA19
вывод!D33 → подбор!V14 → подбор!C2 → 9м!IB19
```

The span-sheet final selectors are:

```text
9м!IA19 = INDEX(IA6:IA14,MATCH(HZ18,HZ6:HZ14,0))
9м!IB19 = INDEX(IB6:IB14,MATCH(HZ18,HZ6:HZ14,0))
```

For Роза / responsibility `0.8`:

```text
9м!HZ18 = INDEX(
  IF(подбор!V9=0.8,снегветер!M3:M600,снегветер!K3:K600),
  MATCH(подбор!V6,снегветер!B3:B600,0)
)

подбор!V6 = вывод!D2 = Роза
подбор!V9 = вывод!D7 = 0.8
снегветер!B527 = Роза
снегветер!M527 = 1
```

Thus `HZ18 = 1` and `MATCH(HZ18,HZ6:HZ14,0)` selects row 6. The height branch is a separate upstream path:

```text
9м!HZ5  = подбор!AN9
9м!AN9  = IF(V10>21,AN10,IF(V8<=3.8,3.6,AN10))
9м!HZ5  = 3.6

9м!IA6  = INDEX(HK7:HK9,MATCH(HZ5,HJ7:HJ9,0))
9м!IB6  = INDEX(HL7:HL9,MATCH(HZ5,HJ7:HJ9,0))
9м!HJ7:HJ9 = 3.6 / 4.8 / 6
9м!HK7 = AG6 = ПГС245/20х80х1,5
9м!HL7 = AG7 = ПГС245/20х80х2
```

The Excel result is therefore:

```text
column = ПГС245/20х80х1,5
beam   = ПГС245/20х80х2
```

The profile selector is not the same mechanism as the D8 or connection branch selector.

## 2. Active branch

For the audited case:

- `подбор!V7 = 3/2` is the legacy frame-branch mapping result;
- it selects D8 and frame-step logic elsewhere;
- profile selection uses `подбор!U14/V14` because `E8>E9` is false;
- `U14/V14` select by span family and then delegate to `9м!IA19/IB19`;
- `HZ18` is a city/responsibility lookup key;
- `HZ5` is the height key;
- no direct `ROW14/ROW15` connection selector is used by this profile lookup.

Conclusion: frame-profile selection and connection selection are independent legacy branches.

## 3. Core1 comparison and first causal divergence

Core1 for the same case selects:

```text
selected branch: B10:3/2/3.6
beam:            ПГС245/20х80х2
column:          ПГС245/20х80х1,5
frame mass:      390.2 kg
```

Core1 is matching the climate-derived branch `3/2` against the generic frame block. Excel is using the dedicated profile pipeline `city/responsibility selector → height selector → IA19/IB19`.

The first causal divergence is therefore:

```text
WRONG_BRANCH_SELECTION / MISSING_LEGACY_RULE
```

It is not a wrong D8 key, wrong effective step, wrong climate tuple, or missing profile value.

## 4. 12 m and 15 m mechanism

The same generic pattern is present:

```text
подбор!B2/C2 → 12м!IA19/IB19
подбор!B3/C3 → 12м!IA19/IB19
подбор!B4/C4 → 15м!IA19/IB19

IA19/IB19 = INDEX(IA6:IA14 or IB6:IB14, MATCH(HZ18,HZ6:HZ14,0))
IA6/IB6 = INDEX(height candidate row, MATCH(HZ5,HJ7:HJ9,0))
```

The boundary oracle used fresh workbook copies at heights 3.0, 3.8 and 3.81 m:

| Family | Height | Excel beam | Excel column | Core1 beam | Core1 column | Result |
|---:|---:|---|---|---|---|---|
| 9 | 3.0 | ПГС245/20х80х1,5 | ПГС245/20х80х1,5 | ПГС245/20х80х2 | ПГС245/20х80х1,5 | beam divergence |
| 9 | 3.8 | ПГС245/20х80х1,5 | ПГС245/20х80х1,5 | ПГС245/20х80х2 | ПГС245/20х80х1,5 | beam divergence |
| 9 | 3.81 | ПГС245/20х80х2 | ПГС245/20х80х2 | ПГС245/20х80х2 | ПГС245/20х80х2 | profile match |
| 12 | 3.0 | ПГС245/20х80х2 | ПГС300/20х80х1,5 | ПГС300/20х80х2,5 | ПГС245/20х80х2 | both diverge |
| 12 | 3.8 | ПГС245/20х80х2 | ПГС300/20х80х1,5 | ПГС300/20х80х2,5 | ПГС245/20х80х2 | both diverge |
| 12 | 3.81 | ПГС245/20х80х2 | ПГС300/20х80х2 | ПГС300/20х80х2,5 | ПГС245/20х80х2 | beam diverges |
| 15 | 3.0 | ПГС300/20х80х2,5 | ПГС245/20х80х2 | ПГС300/20х80х3 | ПГС245/20х80х2,5 | both diverge |
| 15 | 3.8 | ПГС300/20х80х2,5 | ПГС245/20х80х2 | ПГС300/20х80х3 | ПГС245/20х80х2,5 | both diverge |
| 15 | 3.81 | ПГС300/20х80х2,5 | ПГС245/20х80х2 | ПГС300/20х80х3 | ПГС245/20х80х2,5 | both diverge |

The transition at 3.81 m is correctly reflected by the Excel height key, but Core1 still uses the wrong profile-selection semantics in the affected families.

## 5. Dataset integrity

The extracted datasets are complete rectangular snapshots of `A1:SE19` for 9/12/15 m and preserve formulas, cached values, duplicate rows and blank cells.

Evidence that the source path exists:

```text
9м!IA19 = INDEX(IA6:IA14,MATCH(HZ18,HZ6:HZ14,0))
9м!IB19 = INDEX(IB6:IB14,MATCH(HZ18,HZ6:HZ14,0))
9м!IA6  = INDEX(HK7:HK9,MATCH(HZ5,HJ7:HJ9,0))
9м!IB6  = INDEX(HL7:HL9,MATCH(HZ5,HJ7:HJ9,0))
```

The correct profile candidates are present in the extracted source cells. The issue is not a missing `ПГС245/20х80х1,5` value. The issue is that Core1 does not evaluate the `HZ18 → IA19/IB19` selector path and instead selects a generic `branch/height/step` row.

The cached `IA19/IB19` values must not be treated as universal constants: they are scenario-dependent Excel results. The formulas and their source candidate ranges are the authoritative extraction.

## 6. Mass consequence — 9 m control

For `rosa-09-h3-r08`:

| Value | Excel | Core1 | Delta |
|---|---:|---:|---:|
| beam profile | ПГС245/20х80х1,5 | ПГС245/20х80х2 | different |
| column profile | ПГС245/20х80х1,5 | ПГС245/20х80х1,5 | — |
| frame step | 6 | 6 | 0 |
| frame count / Z14/Z15 | 4 / 4 | 4 / 4 | 0 |
| frame mass | 353.56 kg | 390.2 kg | +36.64 kg |
| E8/E9 | 27.89704506172839 | — | — |
| D69 | 27.89704506172839 | 28.801736419753084 | +0.904691358024694 |

The first numeric mass divergence is the frame mass. D69 is downstream; it is not the root cause. D8, step and frame count are already equal.

## 7. Minimal correction boundary

The evidence supports a dedicated generic resolver with this shape:

```text
city + responsibility
    → legacy profile selector key (HZ18 semantics)
height key (HZ5 / AN9 semantics)
    → span-specific IA19/IB19 or row-15 equivalents
    → beam / column profiles
```

This must remain separate from `ClimateResolver`, because the selector key is a legacy structural lookup value, not canonical climate.

No production correction was applied in this audit turn. The exact correction is proven sufficiently to implement as a separate change with focused regression tests.

## 8. Supported-domain status

The 3×3 boundary oracle was rerun. The previous full supported-domain counts remain the baseline because production code was not changed:

```text
FULL_PARITY = 3
UNEXPECTED_DIVERGENCE = 5
CORE1_UNKNOWN_DOMAIN = 1
```

The boundary rerun confirms that the first divergence is generic across 9/12/15 m, with a partial match at the 3.81 m 9 m boundary.

## Final statuses

```text
FRAME_PROFILE_9M_PARITY = NOT_PROVEN
FRAME_PROFILE_12M_PARITY = NOT_PROVEN
FRAME_PROFILE_15M_PARITY = NOT_PROVEN
FRAME_PROFILE_SELECTOR_GENERIC_MODEL = PARTIAL
PRODUCTION_CODE_CHANGED = NO
SUPPORTED_DOMAIN_MATRIX_RERUN = YES (boundary subset; no post-fix full rerun applicable)
FIRST_REMAINING_DIVERGENCE = Core1 uses generic branch-row selection instead of Excel HZ18 → IA19/IB19 profile selection
```
