# Legacy connection lookup dataset audit

Status: extraction and characterization only. Production logic, `StructuralSummary`, `D69`, XLSX files, tests, `plans.md`, `status.md`, `test-plan.md`, `outputs/` and `tools/` were not changed.

## Provenance

| Field | Value |
|---|---|
| Source workbook | `Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx` |
| Source path | `E:\Спринт М v1\Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx` |
| SHA-256 | `0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f` |
| Extraction date | `2026-09-17` |
| Schema | `1.0.0` |

## Extracted datasets

| Dataset | Exact source | Records | Purpose |
|---|---|---:|---|
| `connection_family_rows.csv` | `подбор!A2:O7`, `подбор!A9:O14` | 12 | Full row snapshots for both branches; each row retains a JSON object for every cell with address, raw formula, cached value and cached type. |
| `connection_span_sources.csv` | `9м`/`12м`/`15м`/`18м`/`21м`: `ID19`, `IH19:IL19`, `RT19`, `RX19:SB19`; `24м`: `KP19`, `KT19:KX19`, `WR19`, `WV19:WZ19` | 72 | Exact cells referenced by `F/J/K/L/M/N`. |
| `connection_branch_rows.csv` | `подбор!V10:V11`, `AM9`, `BD9`, `Z14:Z15`, `X14:X15`, `AB14:AF15`; `вывод!E8:E9`, `D52:E52`, `D53:D55`, `D57`; both purlin `T28` cells | 28 | Branch selection, family selection, lookup outputs and final output formulas. |
| `connection_metadata.json` | Dataset manifest | — | Provenance, schema and branch semantics. |

## Proven branch and family semantics

The final output formulas are:

```text
вывод!D52 = IF(E8>E9,подбор!AC15,подбор!AC14)
вывод!E52 = IF(E8>E9,подбор!X15,подбор!X14)
вывод!D53 = IF(E8>E9,подбор!AD15,подбор!AD14)
вывод!D54 = IF(E8>E9,подбор!AE15,подбор!AE14)
вывод!D55 = IF(E8>E9,подбор!AF15,подбор!AF14)
вывод!D57 = IF(E8>E9,подбор!AB15,подбор!AB14)
```

`E8 > E9` selects `ROW15`; equality selects `ROW14`. The family keys are selected independently by:

```text
подбор!AM9 = IF($V$10<=9,9,AM10)
подбор!BD9 = IF($V$10<=9,9,BD10)
подбор!V10 = вывод!D4
```

The extracted row lookups are exact `INDEX/MATCH` formulas. No new span-bucketing rule was introduced.

## Family-by-family source snapshot

The following is the cached result in the proven master workbook, not a universal engineering constant. The two branch rows are identical for these six output columns in this snapshot, but both formulas and both source ranges are retained.

| Family | E52 / F | D57 / J | D52 / K | D53 / L | D54 / M | D55 / N | 24m diagnostic |
|---:|---:|---:|---|---|---|---|---|
| 9 | 244 | 186 | 6х2 | 8х2 | 7х2 | 8х2 | — |
| 12 | 260 | 233 | 7х2 | 9х2 | 6х2 | 9х2 | — |
| 15 | 308 | 264 | 9х2 | 10х2 | 8х2 | 10х2 | — |
| 18 | 332 | 280 | 10х2 | 11х2 | 8х2 | 11х2 | — |
| 21 | 324 | 304 | 10х2 | 10х2 | 8х2 | 11х2 | — |
| 24 | `#N/A` | `#N/A` | `#N/A` | `#N/A` | `#N/A` | `#N/A` | Preserved in both branches |

For 24m, `подбор!A7:O7` and `подбор!A14:O14` are driven by `24м!KM:KX` and `24м!WO:WZ` respectively. The selected cells cache `#N/A`; this is a typed legacy diagnostic, not a repaired value.

## Characterization against project controls

The supplied project outputs are:

| Project | Expected family/branch result | E52 | D52 | D53 | D54 | D55 | D57 |
|---|---:|---:|---|---|---|---|---:|
| 22318 | 15 / project-selected branch | 276 | 8х2 | 9х2 | 7х2 | 10х2 | 238 |
| 22316 | 18 / project-selected branch | 308 | 10х2 | 10х2 | 7х2 | 10х2 | 264 |
| 22329 | 12 / project-selected branch | 276 | 8х2 | 9х2 | 7х2 | 9х2 | 233 |
| 22326 | 12 / alternate active branch | 260 | 8х2 | 9х2 | 6х2 | 8х2 | 223 |

These controls do **not** equal the single master-workbook cached family snapshot for all projects. In particular, the master snapshot has family 15 = `308 / 264 / 9х2 / 10х2 / 8х2 / 10х2`, while 22318 requires `276 / 238 / 8х2 / 9х2 / 7х2 / 10х2`. The same issue is visible for family 18 and for family 12 on 22329/22326.

## First missing dependency

`подбор!F/J/K/L/M/N` are not stored as immutable family constants. They are formulas linking to selected cells on each span sheet. Those span-sheet cells are themselves `INDEX/MATCH` results, for example:

```text
15м!ID19 = INDEX(ID6:ID14,MATCH(HZ18,HZ6:HZ14,0))
15м!IH19 = INDEX(IH6:IH14,MATCH(HZ18,HZ6:HZ14,0))
15м!II19 = INDEX(II6:II14,MATCH(HZ18,HZ6:HZ14,0))
```

The equivalent branch-15 selector uses `RP18`/`RP6:RP14`; 24m uses `KL18` or `WN18`. Therefore the first missing dependency is the **project-specific span-table selector state and its lookup vectors/precedents** (`HZ18`/`RP18` and equivalent 24m selectors plus the source ranges they match against), or a separately versioned connection snapshot for each reference project.

The extracted `ID19`/`IH19`/… cells preserve the formulas and current cache, but they cannot recalculate a different project by themselves.

## Classification

`LEGACY_CONNECTION_MODEL_INCOMPLETE`

All six outputs are reproducible from `design family + ROW14/ROW15` only **after** the project-specific span lookup result is supplied. They are not reproducible from the extracted master snapshot alone. The branch-selection calculation (`E8/E9`, including purlin `T28`) remains an upstream dependency and is not part of the six-column lookup table.

## Implementation gate

Safe to implement `LegacyConnectionResolver`: **NO**.

Safe next step: import either (a) versioned project-scoped lookup snapshots for 22318, 22316, 22329 and 22326, or (b) the complete span lookup matrices and all selector precedents needed to recompute `ID19`/`IH19`/`II19`/`IJ19`/`IK19`/`IL19` and their branch-15/24m equivalents. Do not replace the existing universal cache until that dependency is closed.
