# 24M ACTIVE INTERMEDIATE SNAPSHOT AUDIT

Mode: Excel oracle / read-only source.

Production code, source XLSX/PDF, and `outputs/` were not modified. No commit
or push was performed.

## Status of the requested active snapshot

`24M_ACTIVE_SNAPSHOT = FAILED_ACTIVE_EXCEL_SNAPSHOT_UNAVAILABLE`

The requested method was a fresh temporary copy plus Microsoft Excel COM
`CalculateFullRebuild()`. In this execution environment Excel COM could not
be started by the command runner. Consequently no new active intermediate
snapshot was captured. Cached `#N/A` cells from the source workbook are not
used as active values.

The machine-readable evidence envelope is:

`core1/validation/24m_structural_intermediate_snapshot.json`

It deliberately records known active values from the previous controlled
recalculation report, marks the active cell-level capture as unavailable, and
does not embed or rewrite the workbook.

## 1. Exact scenario and source identity

| Input | Value |
|---|---|
| city | `Роза` |
| span | `24 m` |
| length | `18 m` |
| height | `3 m` |
| responsibility | `0.8` |
| frame step | automatic |
| roof | `С-П 150` |
| deck | `С44-1000-0,7` |
| D9 | blank |
| openings | zero |
| area | `24 × 18 = 432 m²` |
| source SHA-256 | `0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f` |

## 2. Known active values

These values are carried forward from the earlier controlled Excel
recalculation audit; they are not newly recomputed in this run:

| Cell/result | Excel | Core1 |
|---|---:|---:|
| D8 / effective automatic step | `5` | `5` |
| frame mass | `1415.598896` | `1415.598896` |
| O7 / structural base | `26.979706743827165` | `24.858503040123463` |
| O14 / mirrored structural base | `26.979706743827165` | same aggregate path |
| Z14 | `26.979706743827165` | `24.858503040123463` |
| Z15 | `26.979706743827165` | same aggregate path |
| purlin T28 | `4.956` | `4.956` |
| D68 | `0` | `0` |
| D69 | `31.935706743827165` | `29.814503040123462` |

## 3. Formula graph captured from workbook XML

The exact top-level graph is proven:

```text
подбор!Z14 = INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))
подбор!Z15 = INDEX($O$9:$O$14,MATCH(BD9,$A$9:$A$14,0))

family 24:
Z14 → O7
Z15 → O14

подбор!O7  = (E7+G7*T7)/(24*$V$11)+H7
подбор!O14 = (E14+G14*T14)/(24*$V$11)+H14

E7  = D7*S7
S7  = CEILING.MATH($V$11/I7)-1
T7  = CEILING.MATH($V$11/I7)+1

E14 = D14*S14
S14 = IF($W$2=0,CEILING.MATH($V$11/I14)-1,
         CEILING.MATH($V$11/$W$2)-1)
T14 = IF($W$2=0,CEILING.MATH($V$11/I14)+1,
         CEILING.MATH($V$11/$W$2)+1)

D7 = 24м!KO19   G7 = 24м!KQ19   H7 = 24м!KR19   I7 = 24м!KS19
D14 = 24м!WQ19  G14 = 24м!WS19  H14 = 24м!WT19 I14 = 24м!WU19
```

The 24 m selected output row is itself a two-stage exact lookup:

```text
24м!KM19 = INDEX(KM6:KM14,MATCH(KL18,KL6:KL14,0))
24м!KQ19 = INDEX(KQ6:KQ14,MATCH(KL18,KL6:KL14,0))
24м!KR19 = INDEX(KR6:KR14,MATCH(KL18,KL6:KL14,0))
24м!KS19 = INDEX(KS6:KS14,MATCH(KL18,KL6:KL14,0))

24м!KM14 = INDEX(JW15:JW19,MATCH(KL13,JV15:JV19,0))
24м!KQ14 = INDEX(KA15:KA19,MATCH(KL13,JV15:JV19,0))
24м!KR14 = INDEX(KB15:KB19,MATCH(KL13,JV15:JV19,0))
24м!KS14 = INDEX(KC15:KC19,MATCH(KL13,JV15:JV19,0))
```

The unresolved active row values are exactly the cells listed in the JSON
fixture. They cannot be replaced with stale cache values.

## 4. Numeric reconciliation available now

The known aggregate difference is:

```text
Δ kg/m² = 26.979706743827165 - 24.858503040123463
        = 2.121203703703702

Δ kg = 2.121203703703702 × (24 × 18)
     = 916.3599999999993 kg
     ≈ 916.36 kg
```

This is an aggregate missing-mass equivalent, not yet an identified physical
component. No unexplained residual can be assigned to a profile, tie, brace,
end frame, or secondary member until the active `D/G/H` and count cells are
captured.

## 5. First component divergence

`24M_FIRST_COMPONENT_DIVERGENCE = UNKNOWN_PENDING_ACTIVE_SNAPSHOT`.

The first known numeric divergence remains `O7/Z14`, but the task explicitly
requires the first physical component. That cannot be classified safely as
`MISSING_COMPONENT`, `WRONG_COUNT`, `WRONG_LENGTH`, `WRONG_PROFILE`, or any
other physical category from the stale workbook cache.

The following hypotheses remain open and are not treated as findings:

- 24 m end/regular-frame count difference;
- 24 m tie count or end-frame tie omission;
- 24 m-specific secondary member in `H7`;
- dynamic length-dependent mass in `G7`;
- 24 m coefficient or normalization detail.

## 6. End frame versus regular frame

The formulas prove count-sensitive terms `S7/T7` and `S14/T14`. They do not,
without the active selected row values, prove a named end-frame/regular-frame
mass distinction. Therefore:

```text
END_FRAME_COUNT = UNKNOWN
REGULAR_FRAME_COUNT = UNKNOWN
END_FRAME_MASS = UNKNOWN
REGULAR_FRAME_MASS = UNKNOWN
```

No assembly documentation was used to fill these fields.

## 7. 21 m comparison

The proven 9–21 pattern contains the same normalized aggregate shape, for
example `O4 = (E4+G4*T4)/(15*V11)+H4`, and the 22318/22316 controls reach
structural parity. This supports a 24 m-specific missing branch rather than a
generic D69 or summary arithmetic defect. It does not identify the missing
24 m component.

## 8. Implementation decision

No production implementation is safe from this run. Required next evidence is
a fresh Excel-recalculated cell export for:

```text
подбор!D7:T7
подбор!D14:T14
24м!KM19:LA19
24м!WO19:WZ19
24м!JV15:KK19
24м!VX15:WM19
подбор!AM9,BD9,V11,W2
вывод!D4:D9,D68:D69,E8:E9
```

## Final statuses

```text
24M_ACTIVE_SNAPSHOT = FAILED
24M_O7_NUMERIC_RECONSTRUCTION = PARTIAL
24M_FIRST_COMPONENT_DIVERGENCE = UNKNOWN_PENDING_ACTIVE_SNAPSHOT
24M_MISSING_MASS_KG = 916.36 aggregate equivalent
24M_MISSING_MASS_KG_M2 = 2.121203703703702
24M_DIVERGENCE_SCOPE = 24M_SPECIFIC (component cause still open)
24M_STRUCTURAL_RULE = PARTIAL
SAFE_TO_IMPLEMENT_24M_STRUCTURAL_FIX = NO
PRODUCTION_CODE_CHANGED = NO
```
