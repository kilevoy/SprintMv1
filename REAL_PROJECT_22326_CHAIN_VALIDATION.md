# Real project 22326 — Core 1 end-to-end validation

Audit date: 2026-09-17
Production XLSX and TypeScript were not modified for this audit.

## 1. Source identity

| Artifact | Path | SHA-256 |
|---|---|---|
| Reference source | `E:\SprintMv1_reference\22326\22326_SOURCE_SELECTION.xlsx` | `852f6f5df470a728f7aac5ef5a88c95e2ebc7a8fe0cb91082257801d38ee6f88` |
| Downstream reference | `E:\SprintMv1_reference\22326\22326.xlsx` | `8b7b29c193c39f1b97b2f387bdab5d57976f0ed6e95e77fbc73136e38dd40a80` |
| Project TZ | `E:\SprintMv1_reference\22326\22326_TZ.pdf` | not an XLSX oracle |

The source workbook has `вывод` as sheet 7 (zero-based index 6). The downstream workbook contains only the five result sheets `12м`, `15`, `18`, `21`, `1ск`; it has no `вывод` sheet and is used only as an identity artifact here.

## 2. Exact source scenario

Values below are cached values from `22326_SOURCE_SELECTION.xlsx`; formulas are included where they define the active path.

| Input | Cell | Formula/value | Cached value |
|---|---|---|---:|
| city | `вывод!D2` | `Увильды` | `Увильды` |
| span | `вывод!D4` | `10.4` | `10.4 m` |
| length | `вывод!D5` | `25.7` | `25.7 m` |
| height | `вывод!D6` | `4` | `4 m` |
| responsibility | `вывод!D7` | `1` | `1.0` |
| manual frame step | `вывод!D9` | blank | blank / numeric zero in IF branches |
| roof covering | `вывод!D20` | `С-П 150` | `С-П 150` |
| deck grade | `вывод!D21` | `С44-1000-0,7` | `С44-1000-0,7` |
| snow-retention purlin | `вывод!D26` | `нет` | `нет` |
| enclosure purlin | `вывод!D27` | `нет` | `нет` |
| horizontal bracing override | `вывод!D29` | blank | blank |
| gates ≤6 m | `вывод!D60` | `1` | `1` |
| gates >6 m | `вывод!D61` | `0` | `0` |
| doors | `вывод!D62` | `2` | `2` |
| window height | `вывод!D64` | `0` | `0` |
| strip-window length | `вывод!D65` | `0` | `0` |
| separate windows | `вывод!D66` | `0` | `0` |
| glazing label | `вывод!D67` | `2ой стеклопакет` | `2ой стеклопакет` |
| opening mass | `вывод!D68 = Лист1!O28` | formula | `1.9406614785992218 kg/m²` |
| total specific mass | `вывод!D69 = IF(D9=0,E8,E9)+D68` | formula | `33.342651277062764 kg/m²` |

The source climate branch is `вывод!D16=III` snow and `вывод!D17=II` wind. `подбор!V7` caches `4/3`; the active response branch is selected because `D9` is blank and `E8=31.40198979846354` exceeds `E9=29.903935323755366`.

## 3. TZ cross-check

The PDF independently describes the same principal geometry `10.4 × 25.7 × 4 m`, roof/deck `С-П 150` and `С44-1000-0,7`, and gate/door quantities consistent with the workbook’s `D60:D62` projection. It does not provide a competing calculated D68/D69 oracle. The workbook remains authoritative for Core 1 parity. No TZ value was silently substituted.

## 4. Required ProjectInput and adapter route

The exact source projection is:

```text
span_m = 10.4
building_length_m = 25.7
building_height_m = 4
responsibility_factor = 1.0
frame_step_override_m = null
roof_covering = С-П 150
roof_deck_grade = С44-1000-0,7
gates_le_6m_count = 1
gates_gt_6m_count = 0
doors_count = 2
windows.enabled = false
climate = CITY_LOOKUP / RU / Увильды / SP_20
```

With the confirmed adapter policy `gate_boundary_dimension=width_mm`, `projectInputToCore1Input()` preserves these values and returns `success`. The generic span contract now accepts `10.4` literally. `FrameSelector` resolves `design_span_family=12` and loads `frame_12m_cells`; no normalization or rounding occurs.

For the deterministic end-to-end replay, the source climate values are supplied as an equivalent `MANUAL` climate (`III/1.5`, `II/0.3`, `SP_20`), because the current city-lookup proof gate does not yet include `Увильды`. The calculation reaches purlin, openings and summary instead of stopping at schema validation.

## 5. Sequential comparison

| Stage / field | SOURCE | Core1 | Classification |
|---|---|---|---|
| adapter geometry and openings | exact values above | exact values preserved by adapter | MATCH |
| schema/domain gate | numeric span 10.4 accepted by workbook | accepted; family resolves to 12 | MATCH |
| climate | `III/1.5 kN/m²`, `II/0.3 kN/m²` in source branch | equivalent manual values | MATCH (calculation replay) |
| frame family | 12 m lookup family | `frame_12m_cells` | MATCH |
| frame step | `6 m` (`вывод!D22`) | `6 m` | MATCH |
| frame count | `ceil(25.7/6)+1 = 6` | `6` | MATCH |
| beam | `ПГС245/20х80х2`, М.п.350, 85% (`вывод!D33:F33`) | same | MATCH |
| column | `ПГС300/20х80х2`, М.п.350, 75% (`вывод!D34:F34`) | same | MATCH |
| frame mass | `548 kg/frame` (`подбор!Y15`) | `548 kg/frame` | MATCH |
| tube/secondary contribution | `подбор!H3='12м'!IF19=8.62402561608301 kg/m²` | `FrameResult.tube_mass_kg_per_m2=9.950798787788086 kg/m²` | MISMATCH (after frame-mass mismatch) |
| purlin profile | `2ПС 200х65х2` (`вывод!D35`) | `2ПС 200х65х2` | MATCH |
| purlin steel | `М.п.390` (`вывод!E35`) | `М.п.390` | MATCH |
| purlin step | `1745 mm` (`вывод!D28`) | `1745 mm` | MATCH |
| purlin mass | `2214.312 kg` (`вывод!E24`) | `2214.312 kg` | MATCH |
| openings / D68 | `1.9406614785992218 kg/m²` | `1.9406614785992218 kg/m²` | MATCH |
| structural base | `31.40198979846354 kg/m²` (`вывод!E8`) | `33.16625673451062 kg/m²` before D68 | downstream aggregate mismatch |
| D69 | `33.342651277062764 kg/m²` | `35.10691821310985 kg/m²` | downstream mismatch |

`LAST_MATCHING_VALUE` is the source-compatible purlin result and D68. `FIRST_DIVERGING_VALUE` inside the structural-base chain is the frame mass per frame used by the aggregate: source `подбор!G3=625 kg/frame` versus Core1 `FrameResult.frame_mass_kg=548 kg/frame`. The subsequent tube mismatch is source `8.62402561608301` versus Core1 `9.950798787788086 kg/m²`; both are documented in `STRUCTURAL_BASE_22326_AUDIT.md`.

## 6. Generic-fix applicability

- `WRONG_SNOW_FIELD`: **NOT_APPLICABLE**. Equivalent manual climate replay uses the source `III/1.5` and `II/0.3` values.
- `CANDIDATE_ORDER_ERROR`: **NOT_APPLICABLE**; purlin profile/step/mass match before the summary divergence.
- `FRAME_LENGTH_ERROR`: **NOT_APPLICABLE**; literal `10.4` is preserved through the frame length-dependent path.
- Windows: `D64:D66=0`; `windows.enabled=false`, so `WindowGirtCalculator` contribution is zero by contract. No unexpected windows were found.

## 7. Conclusion

The arbitrary-span contract is implemented generically.  The remaining 22326 mismatch begins in the structural aggregate's legacy frame-mass branch and continues through its tube denominator; purlin and D68 agree. It was not fixed in this audit.

The companion `CORE1_SPAN_DOMAIN_AUDIT.md` records the source proof and implementation trace: `10.4 m` maps to the 12 m frame family while purlin/area formulas retain literal 10.4 m. The contract is `STANDARD_FAMILY_WITH_LITERAL_GEOMETRY`; no silent rounding is used.

## Current classification

`22326 = SOURCE_SUSPICIOUS / COMPATIBILITY_CASE`.

The purlin and opening branches are source-compatible, but the remaining structural
aggregate mismatch begins in the legacy frame-mass branch. Therefore 22326 is not a
normative real-project reference; it remains a compatibility case pending the
corresponding source/methodology clarification.

If the span contract is later widened, the next independent gate must be revisited: `Увильды` is present in the local climate cache with `III/1.5` and `II/0.3`, but it is not currently in the production `PROVEN_LOOKUP_KEYS` set. That is a separate climate-proof decision, not evidence for changing the current span result.
