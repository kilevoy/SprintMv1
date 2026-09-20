# `Без стоек` / `+ стойки` rules

1. `Лист1!V107` is the selector label; `Лист1!W107` is its boolean state.
2. `R[r]` is the catalog no-stud flag (`R6` label: `Без стоек`).
3. `S[r]=IF(Лист1!$W$107=FALSE,TRUE,R[r])` controls candidate eligibility.
4. `T4` is a step-based integer factor derived from `Лист1!B13`.
5. `T5=T4×Лист1!B12`.
6. `T[r]=0` for `R=TRUE`; otherwise
   `T5×INDEX(C14:C24,MATCH(N[r],B14:B24,0))`.
7. Rows 639:870 are the 232 `+ стойки` candidate rows in both calculation
   sheets. Their `T` value is computed from `T4`, `T5`, and `C14:C24`; they are
   not immutable final catalog outputs.

Status: control and arithmetic branch `PROVEN`; physical interpretation and
selected-output replay `UNKNOWN`; static row import and automatic selector
implementation `NO`.
