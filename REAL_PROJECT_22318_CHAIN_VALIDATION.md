# REAL PROJECT VALIDATION — 22318

**Дата:** 2026-09-16
**Статус:** `UNKNOWN — FRAME STEP CLOSED, PURLIN DIVERGES`
**Режим:** read-only validation. XLSX не изменялись; инженерные формулы не подгонялись; commit/push не выполнялись.

## SOURCE FILE

`E:\SprintMv1_reference\22318_SOURCE_SELECTION.xlsx`
SHA-256: `dbf29d01db4fe81e8e0a997a69f045330f715b64df3c828bc9d3cc4601116ac3`

Identity gate пройден: SHA-256 совпал с заданным. Cached values листа `вывод`:

| Cell | Value |
|---|---:|
| `D2` | `Сургут` |
| `D4:D6` | `15 / 24 / 5` |
| `D20:D21` | `С-П 150 / С44-1000-0,7` |
| `D60:D62` | `2 / 0 / 1` |
| `D68` | `2.2096666666666667` |
| `D69` | `32.285826388888886` |

## DOWNSTREAM FILE

`E:\SprintMv1_reference\22318.xlsx`
SHA-256: `40fa0c65da3551f04de1b6d66b502791631e472b0691ee2a315ad84175c395b5`
Листы: `12м`, `15`, `18`, `21`, `1ск`; использован active sheet `12м`. Фактический пролёт взят из `C8=15`, а не из имени листа.

## A. Input mapping

| Source cell | Cached value | ProjectInput → Core1Input | Confidence |
|---|---|---|---|
| `вывод!D2` | `Сургут` | `climate.city` → `climate.city` | HIGH, exact |
| `вывод!E2` | `Rus` | `country=RU` | MEDIUM, legacy label |
| `подбор!V2`, SP-ветка | `стандарт`, СП 20 | `normative_system=SP_20` | MEDIUM |
| `вывод!D4:D6` | `15 / 24 / 5` | `span_m / building_length_m / building_height_m` | HIGH, exact |
| `вывод!D7` | `1` | `responsibility_factor=1.0` | HIGH, exact |
| `вывод!D9` | blank | `frame_step_override_m=null` | HIGH; auto step preserved |
| `вывод!D8,D22` | `4` | derived frame step target | HIGH, not manual input |
| `вывод!D20:D21` | `С-П 150 / С44-1000-0,7` | `roof_covering / roof_deck_grade` | HIGH, exact |
| `вывод!D26:D27` | `нет / нет` | `snow_retention_purlin / enclosure_purlin` | HIGH, exact |
| `вывод!D29` | blank | `horizontal_bracing_override=null` | HIGH |
| `вывод!D60:D62` | `2 / 0 / 1` | gates `2/0`, `doors_count=1` | HIGH |
| `вывод!D64:D66` | `0 / 0 / 0` | `windows.enabled=false` | HIGH |
| `Подбор прогонов 2!B4` | `двускатное` | `building_roof_type` | HIGH |
| `подбор!V2` | `стандарт` | `selection_mode` | HIGH |
| `Лист1!B14` | `В` | `terrain_type` | HIGH |
| `Лист1!B3,B8,B20` | `1 / 1 / 0.85` | window defaults | HIGH; inactive without windows |

The adapter output was:

```text
span=15, length=24, height=5, responsibility=1.0, frame_step_override=null
roof=С-П 150, deck=С44-1000-0,7
gates_le_6m=2, gates_gt_6m=0, doors=1, windows.enabled=false
climate=CITY_LOOKUP / RU / Сургут / SP_20
```

Adapter status: `success`; diagnostics: none. Gate option `width_mm` was used only inside this validation harness and marked `LEGACY_REFERENCE_CLASSIFICATION`. It is not a production threshold rule.

Detailed openings from `22318.xlsx` active sheet:

| Cells | ProjectInput |
|---|---|
| `J163=3,K163=3,L163=2` | gate `3000×3000 mm`, quantity `2` |
| `J162=1,K162=2,L162=1` | door `1000×2000 mm`, quantity `1` |
| `L160=L161=0` | no windows |

## B. Source results

## B.1 Geometry domain proof

The audit was performed against the source workbook XML and cached values; the XLSX was not recalculated or modified.

| Legacy point | Evidence | Conclusion |
|---|---|---|
| `вывод!D5` length | no data-validation list and no explicit min/max; cached `24`; direct formula consumers: `вывод!D40`, `вывод!D41`, `подбор!V11`, `Подбор прогонов 2!B3`, `Лист1!B11` | finite-positive arithmetic input; no proven upper limit |
| `вывод!D6` height | no data-validation list and no explicit min/max; cached `5`; direct formula consumers: `вывод!D41`, `подбор!V8`, `Лист1!B9` | finite-positive input routed into proven height buckets |
| `15м` structural table | `B11=4/1`, `BW11=4.8`, `BX11=4`, plus analogous 3.6/4.8/6.0 blocks | `height=5` is covered by the existing `<=5 → 4.8` bucket; source `step=4` is present in the legacy table |
| `9м/12м/18м/21м/1ск` analogues | the same workbook contains local lookup/table cells, but their local `D6`/height columns are not the output `вывод!D6` | do not conflate sheet-local table coordinates with the output geometry field |
| external references in this chain | no external workbook token is required by the `D5/D6` precedent/dependent chain; all observed references are intra-workbook | geometry domain is not blocked by an external source |

The source workbook therefore proves a general validation rule, not an enumeration of `18/24` or `3/5`. The upper height guard `6.2` is taken from the already implemented and source-derived `FrameSelector` bands; values above that remain `UNKNOWN_DOMAIN`.

### B.2 Exact automatic frame-step audit

The legacy automatic path is now traced from cached values and formulas, without recalculating or modifying the XLSX:

```text
вывод!D9 (blank)
  → вывод!F8 = IF(D9=0,D8,D9)                         → 4
  → вывод!D8 = подбор!AA14                           → 4
  → подбор!AA14 = INDEX(I2:I7,MATCH(AM9,A2:A7,0))     → 4
  → подбор!AM9 = IF(V10<=9,9,AM10)                   → 15
  → подбор!AM10=IF(V10<=12,12,AM11)                  → 15
  → подбор!AM11=IF(V10<=15,15,AM12)                  → 15
  → MATCH(15,A2:A7,0)=row 4; подбор!I4              → 4
```

The second branch is equivalent for this case: `AA15 = INDEX(I9:I14,MATCH(BD9,A9:A14,0))` also caches `4`; `вывод!D22` selects the same value because `E8=E9`. `D9` is not a length-derived formula and is blank in the source, so the automatic result is `D8`, not a manual override.

The proven automatic step table is:

| Span | Cached legacy step |
|---:|---:|
| 9 m | 6 m |
| 12 m | 6 m |
| 15 m | 4 m |
| 18 m | 4 m |
| 21 m | 4 m |
| 24 m | `#N/A` in the legacy table |

No length-divisibility test is present in the `D9→D8→AA14` precedent chain. For 22318, `24/4=6` bays and `6+1=7` frames. Height (`D6`) selects the `4.8` table band elsewhere; climate and responsibility select other table branches, but neither is a precedent of `D8` in this automatic path.

The previous Core 1 result selected `DF11` by the first-match approximation: step `6`, column `ПГС245/20х80х2,5`. The source-compatible row is `BV11`: branch `4/1`, height `4.8`, step `4`, column `ПГС300/20х80х2`, beam `ПГС300/20х80х3`. The minimal fix therefore makes the proven automatic step authoritative while retaining the observed reliability-block preference and manual override path.

### Source output values

| Result | Source cell(s) | Exact cached value |
|---|---|---:|
| beam profile / steel / utilization | `D33/E33/F33` | `ПГС300/20х80х3` / `М.п.350` / `85` |
| column profile / steel / utilization | `D34/E34/F34` | `ПГС300/20х80х2` / `М.п.350` / `79` |
| frame step | `D8,D22` | `4 m` |
| purlin profile / steel | `D35/E35`, `P28/U28` | `2ПС 195х45х1,5` / `М.п.390` |
| purlin utilization display | `F35` | `85` |
| purlin selected step | `D28`, `S28` | `1900 mm` |
| purlin kg/m² | `T28` | `4.9559999999999995` |
| purlin total mass | `V28` | `1699.1999999999998 kg` |
| D68 | `вывод!D68` | `2.2096666666666667 kg/m²` |
| D69 | `вывод!D69` | `32.285826388888886 kg/m²` |

## C. 22318 transfer verification

| Downstream cells | Cached value | Result |
|---|---|---|
| `B21,H21` | `ПГС-сигма 300х80х3`, `11.7 kg/m` | beam profile normalized |
| `B22,H22` | `ПГС -сигма 300х80х2`, `7.86 kg/m` | column profile normalized |
| `B24,A24,H24,G24` | `ПС 195х45х1,5`, `390/1,9`, `3.54 kg/m`, `1699.2 kg` | purlin and mass transferred |
| `C11`, `I17/K90` | `4`, `7` | frame step/count consistent |
| `J163:L163` | `3 / 3 / 2` | gates transferred |
| `J162:L162` | `1 / 2 / 1` | door transferred |

### Normalization classification

- `ПГС300/20х80х3` → `ПГС-сигма 300х80х3`: **`PROFILE_MATCH_NORMALIZED`**. Same section dimensions and same 15 m source catalogue row (`подбор!C4`); downstream uses a sigma naming convention.
- `ПГС300/20х80х2` → `ПГС-сигма 300х80х2`: **`PROFILE_MATCH_NORMALIZED`**. Same section dimensions and same source row (`подбор!B4`).
- `2ПС 195х45х1,5` → `ПС 195х45х1,5`: **`PROFILE_MATCH_NORMALIZED`**, with an explicit BOM rule, not a text-only substitution. `C24` contains the pair multiplier and `480×3.54=1699.2 kg`, equal to source `V28` within floating-point precision.

No `2ПС → ПС` normalization is accepted without this quantity/mass evidence.

## D. Core 1 result after geometry-domain closure

The required chain was executed using only the adapter output:

```text
ProjectInput → projectInputToCore1Input() → calculateCore1()
status = success
code   = —
result = structural result available
```

The geometry gate now accepts finite-positive length and height in the proven FrameSelector range. The source row `Сургут` is also an exact production lookup tuple (`RU|Сургут|SP_20`) with `IV/2` and `I/0.23` cached values. Core 1 therefore reaches all structural modules without a bypass.

```text
FrameSelector: success, dataset=frame_15m_cells, branch=BV11:4/1/4.8, selection_reason=automatic_step_match
PurlinCalculator: success
SecondarySteelCalculator: success
OpeningMassCalculator: success
StructuralSummary: success
```

Core 1 result after the FrameSelector-only fix: frame step `4 m`; beam `ПГС300/20х80х3`, utilization `85`; column `ПГС300/20х80х2`, utilization `79`; purlin profile/steel `2ПС 195х45х1,5` / `М.п.390`, step `1500 mm`, `5.9472 kg/m²`, `2039.04 kg`; D68-equivalent opening mass `2.2096666666666667 kg/m²`; D69-equivalent summary `34.92426481481481 kg/m²`.

The frame branch now matches the source. Purlin profile and steel also match, but purlin step, purlin mass and the final structural specific mass remain divergent. `PurlinCalculator` was not changed in this audit.

## E. Three-way comparison

| Parameter | SOURCE | 22318 | NEW CORE 1 | Status / note |
|---|---|---|---|---|
| city | `Сургут` | `Сургут` | adapter `Сургут`, no result | MATCH source→downstream |
| span | `15` | `15` | adapter `15`, no result | MATCH |
| length | `24` | `24` | adapter `24`, no result | MATCH |
| height | `5` | `5` | adapter `5`, no result | MATCH |
| frame step | `4 m` | `4 m` | `4 m` | source→downstream MATCH; Core1 MATCH after audited fix |
| frame count | derived `7` | `7` | derived `7` | MATCH: `ceil(24/4)+1` |
| beam profile | `ПГС300/20х80х3` | `ПГС-сигма 300х80х3` | `ПГС300/20х80х3` | PROFILE_MATCH_NORMALIZED + Core1 MATCH |
| beam steel | `М.п.350` | no direct field | `М.п.350` | Core1 MATCH; downstream NOT_COMPARABLE |
| beam utilization | `85` | no direct field | `85` | Core1 MATCH; downstream NOT_COMPARABLE |
| column profile | `ПГС300/20х80х2` | `ПГС-сигма 300х80х2` | `ПГС300/20х80х2` | source→downstream and Core1 PROFILE_MATCH_NORMALIZED |
| column steel | `М.п.350` | no direct field | `М.п.350` | Core1 MATCH; downstream NOT_COMPARABLE |
| column utilization | `79` | no direct field | `79` | Core1 MATCH; downstream NOT_COMPARABLE |
| purlin profile | `2ПС 195х45х1,5` | `ПС 195х45х1,5` | `2ПС 195х45х1,5` | source→downstream and Core1 PROFILE_MATCH_NORMALIZED |
| purlin steel | `М.п.390` | `390/1,9` | `М.п.390` | source→downstream and Core1 MATCH |
| purlin step | `1900 mm` | `1.9 m` | `1500 mm` | source→downstream MATCH; Core1 MISMATCH; next divergence |
| purlin utilization | `85` display | no direct field | no direct equivalent | NOT_COMPARABLE |
| purlin total mass | `1699.1999999999998 kg` | `1699.2 kg` | `2039.04 kg` | source→downstream MATCH; Core1 MISMATCH |
| purlin kg/m² | `4.9559999999999995` | no direct field | no result | NOT_COMPARABLE |
| purlin kg/m² | `4.9559999999999995` | no direct field | `5.9472` | MISMATCH after purlin step divergence |
| D68 | `2.2096666666666667` | no direct field | `2.2096666666666667` | Core1 MATCH after frame-step correction |
| D69 | `32.285826388888886` | no direct field | `34.92426481481481` | MISMATCH; downstream of purlin branch |
| gate quantity | `2 / 0` | `2` | adapter `2 / 0` | MATCH |
| door quantity | `1` | `1` | adapter `1` | MATCH |

Source → downstream count remains **11 MATCH**, **3 PROFILE_MATCH_NORMALIZED**, **0 MISMATCH**, **8 NOT_COMPARABLE**. New Core1 comparison: geometry, climate, frame step/count, beam, column, purlin profile/steel and D68 match; purlin step/mass and D69 remain divergent.

## F. First divergence analysis

```text
ProjectInput                 LAST_MATCHING_VALUE: all active source inputs
  ↓
Core1InputAdapter            LAST_MATCHING_VALUE: exact fields and 2/0 gate classification
  ↓
InputValidation              MATCH: finite-positive length=24, height=5 within (0,6.2]
  ↓
ClimateResolver              MATCH: RU|Сургут|SP_20 → IV/2, I/0.23
FrameSelector                MATCH after audit: step=4/column=ПГС300/20х80х2; beam=ПГС300/20х80х3
PurlinCalculator             FIRST_DIVERGING_VALUE: profile/steel match, source step=1900; Core1 step=1500
SecondarySteelCalculator    REACHED; output is downstream of divergent frame step
OpeningMassCalculator       MATCH: D68-equivalent=2.2096666666666667
StructuralSummary            REACHED; Core1 D69-equivalent=34.92426481481481
```

`LAST_MATCHING_VALUE` — the corrected frame branch and opening-mass result. `FIRST_DIVERGING_VALUE` — the purlin step-selection result. The FrameSelector fix is limited to the proven automatic step path; no purlin value was forced from the source, and no XLSX was modified.

## G. Fixture suitability

`real_project_22318` **не создан как `REAL_PROJECT_REFERENCE`**: the frame branch is now source-compatible and deterministic, but purlin step/mass and D69 still diverge. The case remains a differential-validation reference, not a parity fixture. `PARITY_PROVEN` не выставлялся.

## Executive summary

1. Exact legacy automatic path: `D9(blank) → F8 → D8 → AA14 → I2:I7`; for span `15`, `AM9=15`, `I4=4`.
2. Why `4 m`: the 15 m source table row for branch `4/1`, height band `4.8` is `BV11`, whose cached step is `4`.
3. Why the old Core1 selected `6 m`: it used the first row in the observed preferred reliability block (`DF11`) instead of the proven automatic step target.
4. Bug classification: **LEGACY RULE UNDER-MODELLED / FIRST-MATCH APPROXIMATION** in `FrameSelector`; not a purlin, climate, or geometry bug.
5. Source frame count: `7` (`ceil(24/4)+1`).
6. Core1 frame count after fix: `7` (same deterministic derivation).
7. Source/Core1 beam: `ПГС300/20х80х3` / `ПГС300/20х80х3`, utilization `85` / `85`.
8. Source/Core1 column: `ПГС300/20х80х2` / `ПГС300/20х80х2`, utilization `79` / `79`.
9. Source/Core1 purlin: `2ПС 195х45х1,5` / `2ПС 195х45х1,5`, steel `М.п.390` / `М.п.390`.
10. Source/Core1 purlin step: `1900 mm` / `1500 mm`.
11. Source/Core1 purlin mass: `1699.2 kg` / `2039.04 kg`; source downstream transfer is verified.
12. Source/Core1 D69: `32.285826388888886` / `34.92426481481481 kg/m²`.
13. Remaining first divergence: `PurlinCalculator` step-selection algorithm; `D68` now matches, so it is no longer an open first divergence.
14. Tests: targeted audit `14/14`; full Vitest `119/119`; static integrity `25/25`; typecheck, build and diff check passed.
15. Ready to commit: **NO** — user explicitly requested no commit/push for this audit; purlin parity remains open.

## Validation commands

The FrameSelector and real-project regression tests passed after the minimal fix. Full Vitest `119/119`, typecheck, build, static integrity `25/25` and `git diff --check` passed. The bundled Python runtime did not include `pytest`; the available system Python ran the same static suite successfully. No commit or push was performed.
