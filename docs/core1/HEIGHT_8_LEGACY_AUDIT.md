# Height 8 m legacy audit

Read-only audit of local copies of archived workbooks 21477, 21653 and 22175. Source XLSX files were not modified.

## Findings

The ordinary active sheets of all three projects contain `C10 = 8` as the building-height input:

- 21477, sheet `12м`: `C10 = 8`, `C11 = 4`, `I17 = CEILING(C9/C11+1,1) = 10`;
- 21653, sheet `12м`: `C10 = 8`, `C11 = 4`, `I17 = 10`;
- 22175, sheet `12м`: `C10 = 8`, `C11 = 4`, `I17 = 10`.

The tie branches of 21653 and 22175 use sheet `18` with `C10 = 8`, `C11 = 4.5`, and `I17 = 9`. The tie workbook for 21477 uses a different active geometry (`C10 = 3`, `C11 = 6`) and is not a height-8 comparison.

## Critical provenance result

On these archived project sheets, primary frame profiles are stored as literal values in `B21`/`B22` (for example `ПГС-сигма 300х80х3` or `ПГС-S 300х80х2`). They are not formulas that select a row from a local height table. The sheets do not expose the producer lookup that originally selected those profiles.

Therefore these workbooks prove:

- a project-specific historical result at height 8 m;
- frame step and frame count for those saved projects;
- downstream mass/price outputs for those saved projects.

They do not yet prove a generic Core1 height-8 lookup dataset or a rule that maps arbitrary height 8 m inputs to sections.

## Current domain decision

`height = 8 m` remains outside the generic Core1 supported domain. It can be supported only through a provenance-bound `LEGACY_REPLAY` fixture when the source project snapshot is available. The first unknown dependency for a generic implementation is the frame-profile producer/lookup for height 8 m, followed by its coupled beam, column, purlin and secondary-steel tables.

No extrapolation from the 6 m dataset is allowed. No automatic rounding of 8 m to 6 m is allowed.