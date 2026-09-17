# PURLIN 22316 — MASS DIFFERENCE AUDIT

Дата аудита: 2026-09-17

Reference source: `E:\SprintMv1_reference\SprintMv1_reference\22316\22316_SOURCE_SELECTION.xlsx`

## Result

The `244.2 kg` difference was caused by an input-mapping mismatch, not by a
profile, steel, step, or purlin-mass algorithm defect.

The source workbook has:

| Source field | Cell / path | Value |
|---|---|---:|
| snow-retention purlin | `вывод!D26` → `Подбор прогонов 2!B16` | `есть` |
| enclosure purlin | `вывод!D27` → `Подбор прогонов 2!B17` | `нет` |
| profile | `Подбор прогонов 2!P28` | `2ПС 200х65х1,5` |
| steel | `Подбор прогонов 2!U28` | `М.п.350` |
| step | `Подбор прогонов 2!S28` | `1800 mm` |
| mass per metre | `Подбор прогонов 2!F23` / `F30` | `8.14 kg/m` |
| building length | `Подбор прогонов 2!B3` | `30 m` |

The first 22316 replay incorrectly supplied `snow_retention_purlin = "нет"`.
That produced `2930.4 kg`, while the source control is `"есть"`.

## Quantity reconstruction

Core1 uses the audited generic quantity expression:

```text
purlin_lines_per_slope
  = ceil(span / sides / (step / 1000))
    + snow_retention_addition
    + enclosure_addition

total_weight
  = purlin_lines_per_slope × profile_mass × building_length × sides
```

For 22316:

```text
span = 18 m
sides = 2
step = 1.8 m
profile_mass = 8.14 kg/m
building_length = 30 m
enclosure_addition = 0
ceil(18 / 2 / 1.8) = 5
```

With the incorrectly mapped `"нет"` flag:

```text
(5 + 1 + 0) × 8.14 × 30 × 2 = 2930.4 kg
```

With the source-proven `"есть"` flag, Core1's audited conditional branch
adds `1.5` per slope:

```text
(5 + 1.5 + 0) × 8.14 × 30 × 2 = 3174.6 kg
```

The difference is therefore exactly:

```text
3174.6 - 2930.4 = 244.2 kg
= 8.14 kg/m × 30 m
```

That is one additional effective purlin line over the building length.

## Differential verification

After correcting only the 22316 input mapping to `snow_retention_purlin =
"есть"`:

| Value | SOURCE | CORE1 | Result |
|---|---:|---:|---|
| profile | `2ПС 200х65х1,5` | `2ПС 200х65х1,5` | MATCH |
| steel | `М.п.350` | `М.п.350` | MATCH |
| step | `1800 mm` | `1800 mm` | MATCH |
| mass | `3174.6000000000004 kg` | `3174.6000000000004 kg` | MATCH |
| specific mass | `6.172833333333334 kg/m²` | `6.172833333333334 kg/m²` | MATCH |
| final `kg_per_m2` / source `D69` | `28.922792592592597` | `28.922792592592597` | MATCH |

No change was made to `PurlinCalculator`. No XLSX was modified. The result is
covered by `src/core1/realProject22316.test.ts`.

## Classification

- Previous purlin-mass divergence: **CLOSED**.
- Root cause: **INPUT_FIXTURE_MISMATCH**.
- The purlin formula was not changed.
- No further first divergence is observed through the tested 22316 `D69`
  chain after the source input is mapped correctly.
