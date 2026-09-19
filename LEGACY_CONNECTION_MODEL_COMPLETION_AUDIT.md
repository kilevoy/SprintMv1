# Legacy connection model completion audit

Status: `LEGACY_CONNECTION_MODEL_COMPLETE` for the automatic 9–21 m domain.

This document supersedes the earlier conclusion
`PROJECT_SCOPED_SNAPSHOT_REQUIRED`. The XLSX files were not modified.

## Corrected root cause

The previous low-level XML audit read `снегветер!AZ335` as an empty shared
formula body (`=`) and treated its cached value as a manual project snapshot.
That interpretation was incorrect. In OOXML, `AZ335` is a child of shared
formula `si=131`; the master formula is stored at `AZ323` for range
`AZ323:AZ354`:

```text
снегветер!AZ335
  = INDEX($AC$5:$AC$58,
          MATCH(AU335+$AM$26,$AB$5:$AB$58))
```

OpenPyXL reconstructs the child formula correctly. The project-dependent
cached values are therefore normal recalculation state, not hardcoded data.

## Proven dependency graph

```text
вывод!D2/D4:D7
  → подбор!V6/V8:V11
  → снегветер city row

ROW14 / base candidate
  E + roof correction
  → J/K/L/M
  → подбор!AJ9:AJ11
  → подбор!V7

ROW15 / adjusted candidate
  AU = E × подбор!Z2
  подбор!Z2 = (span / CEILING.MATH(span,3))² × Y2
  automatic mode: Y2 = 1
  AU + roof correction
  → AZ/BA/BB/BC
  → подбор!BA9:BA11
  → подбор!W7

V7/W7 + responsibility-derived factor + height band
  → span-sheet connection matrix
  → candidate F/J/K/L/M/N

E8 = Z14 + Подбор прогонов!T28
E9 = Z15 + Подбор прогонов 2!T28
E8 > E9  → ROW15
E8 <= E9 → ROW14
  → вывод!D52/E52/D53/D54/D55/D57
```

`Z14/Z15` are candidate structural-base scores. For 9–21 m:

```text
frame_count = CEILING(building_length / frame_step) + 1
tie_bays = frame_count - 2
frame_base =
  (tie_unit_mass × tie_bays + frame_mass × frame_count)
  / (span × building_length)
  + tube_mass_kg_per_m2
```

`T28` is `purlin_kg_per_m2`. Equality deliberately selects `ROW14`.

## Formula-model identity

Formula-plus-literal fingerprints are identical across MASTER, 22318, 22316,
22329 and 22326 for `снегветер`, `подбор`, and all six span sheets. Cached
formula results were excluded from these hashes.

| Sheet/model | SHA-256 |
|---|---|
| `снегветер` | `bfe6adba7aa354e2e3ac482e852dbfeae85f16ba74f661f645f736167fd080f1` |
| `подбор` | `606b1399e0e185bbb7944350fca01ebebce65bcc90a00dcf5cffa596300e9dbe` |
| `9м` | `8d1a502a39c01bfc6b5caaab1c618889fc3f4fb27571557bc54c8f694bdc6838` |
| `12м` | `ab605fddfdd472d8f15dbfe3d32b7d104ebe733b82863b3a25a9dee5dfdb233c` |
| `15м` | `3058e9be47497f3bb7431d8560d3f748542283443251e185e2ddc701225e23ff` |
| `18м` | `04211af58812f39ad75f778098ff803d8aafbfde923248b0293180fc505ad19d` |
| `21м` | `d11f704098a60c02a6cb6719188cccdc8719a424236939597100432b0e783420` |
| `24м` | `2e72b84711a142f3b28e4017337eedf7b756ff8e0bdb0489260a92bc09d400e9` |

The canonical repo master SHA-256 is
`0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f`.

## Versioned lookup dataset

`tools/extract_legacy_connection_lookup.py` follows the actual nested
`INDEX/MATCH` formulas and writes
`core1/data/legacy_connections/connection_lookup_rows.json`.

Dataset statistics:

| Metric | Value |
|---|---:|
| Candidate-specific rows | 599 |
| `ROW14` rows | 299 |
| `ROW15` rows | 300 |
| Equal keys shared by both candidates | 299 |
| Preserved anomalies | 3 |

The anomalies are not repaired:

1. family 15 / `ROW14` / factor 1 / height 3.6 / branch `2/2` has no M16
   quantity match;
2. family 21 / factor 1 / height 4.8 / branch `2/2` contains numeric value
   `102` instead of a text eave-beam bolt pattern in both candidates.

## Reference parity

| Project | Candidate | E52 | D52 | D53 | D54 | D55 | D57 |
|---|---|---:|---|---|---|---|---:|
| 22318 | `ROW14` | 276 | 8х2 | 9х2 | 7х2 | 10х2 | 238 |
| 22316 | `ROW14` | 308 | 10х2 | 10х2 | 7х2 | 10х2 | 264 |
| 22329 | `ROW14` (exact E8/E9 equality) | 276 | 8х2 | 9х2 | 7х2 | 9х2 | 233 |
| 22326 | `ROW15` | 260 | 8х2 | 9х2 | 6х2 | 8х2 | 223 |

22326 remains `SOURCE_SUSPICIOUS / COMPATIBILITY_CASE`; its absolute score
values are diagnostic, not a normative oracle. It still proves the selector
direction and the expected alternate-row output.

## Runtime decision

`LegacyConnectionResolver` is implemented for automatic 9–21 m inputs and is
used by `calculateCore1`. It keeps canonical climate unchanged, calculates the
base and adjusted structural candidates independently, applies the strict
`E8>E9` selector, and reads the exact candidate lookup row.

The old `bolts_plates_fittings.csv` is now used as follows:

- `D48:E49`, `D56:E56`: proven static values;
- `D52:E52`, `D53:D55`, `D57`: deprecated project cache for canonical
  automatic 9–21 m calculation;
- retained for legacy/manual/24 m compatibility until those domains are
  closed.

## Remaining boundary

- manual frame-step connection semantics: `UNVERIFIED`;
- 24 m connection outputs: `LEGACY_ERROR / #N/A`;
- supported-domain regression matrix beyond the three real references:
  `PARTIAL`.

Final classification:

```text
LEGACY_CONNECTION_MODEL_COMPLETE
SAFE TO IMPLEMENT GENERIC 9–21 m AUTOMATIC RESOLVER = YES
STRUCTURAL D69 PARITY REMAINS INDEPENDENT = YES
```
