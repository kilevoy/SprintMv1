# TN/TO rules

Source-backed rules from `Калькулятор ограждайки v1.5.xlsx`:

1. For every candidate row `r`, `TN[r]=TO[r]`.
2. `TO[r]=Y[r]`; `Y` is the profile mass in kg/m.
3. Candidate objective terms are `TO[r] × Лист1!B13` and
   `TN[r] × Лист1!B13`. The headers call these upper/lower girt mass, but
   physical geometry and final aggregation are not proven.
4. Candidate invalidity is handled by `JW[r]=0`, which makes the objective
   `999999999`; it is not a reason to delete TN/TO data.
5. TN/TO are not direct quantity fields and must not be exposed as final BOM
   counts without additional source evidence.

Status: `PROVEN_FOR_CANDIDATE_OBJECTIVE`, physical semantics and final
aggregation: `UNKNOWN`. The previous assertion `TN/TO = physical upper/lower
extra girts` is `SUPERSEDED`.
