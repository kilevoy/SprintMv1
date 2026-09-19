# `+ стойки` / `Без стоек` evidence

`STATUS = UNKNOWN / RUNTIME BLOCKED`

The observed 632-row artifact contains a raw `раскреп` boolean, but it does
not contain an explicit `Без стоек` field or a proven mapping from that flag to
the business meaning “without studs”. The repository also does not contain a
source-backed 232-row `+ стойки` extraction in the inspected branch.

Accordingly:

```text
BASE_CATALOG_ROWS = SOURCE_PRESENT (632 observed rows)
WITHOUT_STUDS_SEMANTICS = UNKNOWN
PLUS_STUD_ROWS = NOT_VERIFIED
PLUS_STUD_ENGINEERING_SEMANTICS = UNKNOWN
PLUS_STUD_RUNTIME_IMPORT = BLOCKED
```
No 232 rows are added to runtime or to the normalized observed catalog.
