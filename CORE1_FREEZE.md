# CORE1 FREEZE RULES

This document freezes the evidence-backed Core1 boundary before work moves to
the UI input contract and Cold Enclosure reverse engineering.

## Frozen rules

1. Proven 9–21 m legacy logic is frozen. Any result-changing refactor requires
   a golden regression comparison.
2. Excel formulas containing `*0` remain part of the legacy evidence. They are
   not removed or treated as disabled logic without proof.
3. Exact and approximate `MATCH` ordering, including legacy lookup direction,
   must be preserved.
4. Project-specific calculation branches are prohibited. Project files may
   provide evidence or fixtures, not hidden algorithm switches.
5. Source anomalies remain classified and observable; they are not silently
   corrected.
6. `22326` remains `SOURCE_SUSPICIOUS / COMPATIBILITY_CASE`.
7. The unresolved 24 m structural aggregate must not be guessed or filled by
   a nearest row, universal constant, or profile-mass substitution.
8. Future Core2 and Cold Enclosure work consumes Core1 outputs and provenance;
   it must not reimplement Core1 engineering selection.
9. Manual D9, upper-height 24 m, natural ROW15, and unproven connection
   snapshots remain outside the frozen 24 m contract.
10. A new 24 m structural rule requires a fresh Excel `CalculateFullRebuild`
    snapshot of the active intermediate cells before implementation.

## Freeze status

```text
CORE1_9_21_SUPPORTED_DOMAIN = FROZEN
CORE1_24M = PARTIAL
CORE1_24M_BLOCKER = FRESH_EXCEL_RECALC_REQUIRED
CORE1_PRODUCTION_FREEZE = YES
NEXT_STAGE = UI_INPUT_CONTRACT_AUDIT
FOLLOWING_STAGE = COLD_ENCLOSURE_REVERSE_ENGINEERING
```

The freeze is a parity boundary, not a claim that every engineering or
commercial branch of the original calculator is implemented.
