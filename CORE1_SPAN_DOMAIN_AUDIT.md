# Core 1 — arbitrary span domain audit (real project 22326)

Audit-only reverse engineering.  The reference workbooks and production XLSX/TypeScript were not modified.  This document records the source workbook behaviour for `22326_SOURCE_SELECTION.xlsx` and the first divergence in the current Core 1 orchestration.

## 1. Executive result

`вывод!D4` is the user's numeric building span in metres.  In this project it is the literal value **10.4 m**; it is not a label, a rounded value, or an instruction to use the 12 m workbook.

The legacy workbook uses that value in two different ways:

1. it maps 10.4 into the **12 m standard family** for frame lookup (`подбор!AM9/BD9 = 12`), and
2. it retains **10.4 literally** in the purlin branch (`Подбор прогонов 2!B2`) and in area/mass denominators (`Лист1!O28`, `Подбор прогонов 2!L30`).

Therefore the source is a **standard-family lookup with literal geometry**, not an exact-only six-value span domain and not an implicit round-to-12 operation.

## 2. Active legacy path

For the saved scenario:

| Cell | Formula / value | Cached value | Role |
|---|---|---:|---|
| `вывод!D4` | `10.4` | `10.4` | user span, m |
| `вывод!D9` | blank | blank (numeric zero in `IF` tests) | automatic frame-spacing mode |
| `вывод!E8` | `=подбор!Z14+'Подбор прогонов'!$T$28` | `31.40198979846354` | automatic result branch 1 |
| `вывод!E9` | formula | `29.903935323755366` | alternate result branch |
| `вывод!D69` | `=IF(D9=0,E8,E9)+D68` | `33.342651277062764` | kg/m², not absolute tonnes |

Because `D9` is blank/zero, the automatic branch is active.  `E8>E9`, so `вывод!D22` selects `подбор!AA15` and the active frame family response row is row 15.  The displayed purlin output is the automatic `Подбор прогонов 2` branch; its selected values are `P28=2ПС 200х65х2`, `S28=1745`, `U28=М.п.390`, `V28=2214.312`.  The source `E8` formula itself adds `подбор!Z14` to `Подбор прогонов!T28`; this is distinct from the displayed `Подбор прогонов 2` values and is the reason the post-purlin structural aggregate must be compared separately.

The first active formulas and cached values are:

```text
подбор!V8  = вывод!D6                          → 4
подбор!V9  = вывод!D7                          → 1
подбор!V10 = вывод!D4                          → 10.4
подбор!V11 = вывод!D5                          → 25.7
подбор!W2  = вывод!D9                          → 0
вывод!D16  = IF(E8>E9,подбор!BA9,подбор!AJ9)   → III
вывод!D17  = IF(E8>E9,подбор!BB9,подбор!AK9)   → II
вывод!D22  = IF(E8>E9,подбор!AA15,подбор!AA14) → 6
вывод!D23  = INDEX($W$11:$W$63,MATCH($E$23,$X$11:$X$63,-1)) → 2150
вывод!D28  = 'Подбор прогонов 2'!$S$28        → 1745
вывод!D33  = IF(E8>E9,подбор!V15,подбор!V14)  → ПГС245/20х80х2
вывод!D34  = IF(E8>E9,подбор!U15,подбор!U14)  → ПГС300/20х80х2
вывод!D35  = 'Подбор прогонов 2'!$P$28         → 2ПС 200х65х2
вывод!E35  = 'Подбор прогонов 2'!$U$28         → М.п.390
```

## 3. Exact standard-family mapper

The source formulas are the following chained upper-bound tests:

```text
подбор!AM9  = IF($V$10<=9,9,AM10)
подбор!AM10 = IF($V$10<=12,12,AM11)
подбор!AM11 = IF($V$10<=15,15,AM12)
подбор!AM12 = IF($V$10<=18,18,AM13)
подбор!AM13 = IF($V$10<=21,21,AM14)
подбор!AM14 = IF($V$10<=24,24,AM15)
подбор!AM15 = "нужен расчет"
```

`подбор!V10 = вывод!D4` and the parallel `BD9:BD15` chain has the same semantics.  Cached values for 22326 are `V10=10.4`, `AM9=12`, `AM10=12`, `BD9=12`.

The proven intervals are:

| Literal D4 | Standard family |
|---|---:|
| `x <= 9` | 9 m |
| `9 < x <= 12` | 12 m |
| `12 < x <= 15` | 15 m |
| `15 < x <= 18` | 18 m |
| `18 < x <= 21` | 21 m |
| `21 < x <= 24` | 24 m |
| `x > 24` | `"нужен расчет"` |

The formulas prove the upper bands and inclusivity at each upper boundary.  They do not prove a formal workbook lower-bound validation; the defensible future API contract is therefore finite positive span plus this band mapper, with non-positive values rejected by input validation rather than silently treated as engineering cases.

Examples directly implied by the chain: `8.99→9`, `9→9`, `9.01→12`; `11.99→12`, `12→12`, `12.01→15`; `14.99→15`, `15→15`, `15.01→18`; `17.99→18`, `18→18`, `18.01→21`; `20.99→21`, `21→21`, `21.01→24`; `23.99→24`, `24→24`, `25→"нужен расчет"`.

## 4. What 10.4 changes downstream

The 10.4 input remains literal wherever the formula references the project span:

```text
Подбор прогонов 2!B2  = вывод!$D$4                 → 10.4
Подбор прогонов 2!L30 = +H30/B2/B3*1.05            → denominator uses 10.4 × 25.7
Лист1!B10             = вывод!D4                   → 10.4
Лист1!O28             = SUM(O23:O27)/B10/B11       → denominator uses 10.4 × 25.7
```

`10.4 × 25.7 = 267.28 m²`.  The frame-selection lookup, however, consumes the mapped family 12; the selected response row supplies the frame beam/column and automatic step.  The source response row 15 has `U15=ПГС300/20х80х2`, `V15=ПГС245/20х80х2`, `Y15=548 kg/frame`, `Z15=21.20508916990921 kg/m²`, and `AA15=6 m`.

The row-15 formulas are explicit family lookups:

```text
подбор!U15  = INDEX($B$9:$B$14,MATCH(BD9,$A$9:$A$14,0)) → ПГС300/20х80х2
подбор!V15  = INDEX($C$9:$C$14,MATCH(BD9,$A$9:$A$14,0)) → ПГС245/20х80х2
подбор!Y15  = INDEX($G$9:$G$14,MATCH(BD9,$A$9:$A$14,0)) → 548 kg/frame
подбор!Z15  = INDEX($O$9:$O$14,MATCH(BD9,$A$9:$A$14,0)) → 21.20508916990921 kg/m²
подбор!AA15 = INDEX($I$9:$I$14,MATCH(BD9,$A$9:$A$14,0)) → 6 m
```

Since `BD9=12`, these lookups are the 12 m family response.  This is why 10.4 m receives the stated beam, column, and 6 m automatic frame spacing; no interpolation or nearest-value rounding is involved.

The resulting mass path is intentionally mixed: frame-family tables use the selected standard family (12 m), while purlin and opening-specific area/mass formulas use literal 10.4 m.  `D69` is the final specific metal intensity in **kg/m²**.

The active purlin branch also retains the literal span:

```text
Подбор прогонов 2!B1  = вывод!$F$8                    → 6 m frame step
Подбор прогонов 2!B2  = вывод!$D$4                    → 10.4 m
Подбор прогонов 2!B3  = вывод!$D$5                    → 25.7 m
Подбор прогонов 2!B9  = IF(B2>21,6,15)                → 15°
Подбор прогонов 2!H30 = G30*$B$3/$B$1                 → 2214.312 kg
Подбор прогонов 2!L30 = +H30/B2/B3*1.05              → 8.698846153846155 kg/m²
Подбор прогонов 2!B14 = IF(вывод!D24=0,вывод!$D$23,вывод!D24) → 2150 mm
```

`вывод!D23=2150 mm` is the deck-derived **maximum allowable** purlin step for `С44-1000-0,7` under the active demand; it is not the selected step.  The selected 1745 mm is a separate profile/resistance result below that limit, so the deck cap is one of several constraints (along with manual limits, minimum step, and profile utilization).

## 5. Standard spans are lookup bands, not title-only labels

The six standard values `9, 12, 15, 18, 21, 24` are active lookup keys and upper-band boundaries.  They are not merely worksheet titles and the formulas do not require `D4` to equal one of them.  For 10.4 the frame table is the 12 m family, while geometry-dependent formulas still see 10.4.

The 24 m band is mathematically reachable (`21 < x <= 24`) but its legacy table is not a normal successful case: `подбор!D7 = '24м'!KO19` has cached `#N/A`, and the 24 m active path contains `#N/A` cells.  Thus 24 m is a **legacy-anomaly boundary**, not a generally parity-proven successful span.

## 6. Core 1 implementation and first divergence

The schema now validates `span_m` as a finite positive number (`exclusiveMinimum: 0`).  The domain layer returns `UNKNOWN_DOMAIN`/unsupported for `span_m>24`; it does not clamp or round.  `resolveDesignSpanFamily` is the single explicit mapper used by `FrameSelector` and the repository.  The adapter preserves `10.4` exactly.

For 22326 the chain now reaches calculation with `literal_span_m=10.4` and `design_span_family=12`.  Frame outputs match the source: step `6 m`, beam `ПГС245/20х80х2`, column `ПГС300/20х80х2`.  Purlin and opening outputs also match: `2ПС 200х65х2`, `М.п.390`, `1745 mm`, `2214.312 kg`, and `D68=1.9406614785992218 kg/m²`.

`LAST_MATCHING_VALUE`: purlin mass/step and D68 in the ordered comparison.

`FIRST_DIVERGING_VALUE`: the frame mass per frame used by the structural aggregate. Source `подбор!G3=625 kg/frame` (from family row `12м!IE19`) while current Core1 uses `FrameResult.frame_mass_kg=548 kg/frame` (the displayed response row `Y15`). The later tube mismatch is source `8.62402561608301` versus Core1 `9.950798787788086 kg/m²`. These produce source base `31.401989798463539 kg/m²` and Core1 base `33.16625673451062 kg/m²`, hence D69 `33.342651277062764` versus `35.10691821310985 kg/m²`. Per the first-divergence rule, no correction was attempted.

## 7. Static dataset readiness

The current static frame datasets expose canonical family blocks (9/12/15/18/21/24).  The 12 m family data needed by this scenario is reused through the generic mapper; literal span remains available to length-, area-, purlin-, opening-, and mass-dependent calculations.

Recommended future contract name: `STANDARD_FAMILY_WITH_LITERAL_GEOMETRY` — accept a finite positive literal span, map it to the proven standard band for frame tables, and preserve the literal span for geometry, purlin, openings, area, and mass formulas.  Keep `x>24` as the legacy `"нужен расчет"`/unsupported boundary and preserve the 24 m `#N/A` anomaly.

## 8. Audit conclusion

The arbitrary-span domain gap is now closed generically: 22326 is calculated without changing its literal span, while frame lookup uses family 12.  A separate structural-summary parity gap remains for this scenario and is intentionally not fixed in this task.

Files changed in this implementation: this document, `REAL_PROJECT_22326_CHAIN_VALIDATION.md`, `CORE1_SUPPORTED_DOMAIN.md`, `src/core1/README.md`, `status.md`, `test-plan.md`, and the span-contract TypeScript/tests.  XLSX remains untouched.
