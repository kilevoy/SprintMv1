# CORE 1 REAL PROJECT 22329 — FULL END-TO-END REFERENCE VALIDATION

**Дата аудита:** 2026-09-17  
**Режим:** audit only  
**Ветка:** `checkpoint/22318-purlin-audit`  
**Классификация:** `UNSUPPORTED_FOR_PARITY`  
**First-divergence code:** `BEAM_PROFILE_MISMATCH`

**Climate-source integrity classification:** `SOURCE_CLIMATE_PROVEN`  
**Climate audit:** [`CLIMATE_22329_UVILDY_AUDIT.md`](CLIMATE_22329_UVILDY_AUDIT.md)

## 1. Audit boundary

The audit followed the requested chain in order:

```text
ProjectInput
→ projectInputToCore1Input
→ ClimateResolver
→ FrameSelector
→ SecondarySteel
→ PurlinCalculator
→ WindowGirtCalculator
→ OpeningMass
→ StructuralSummary
→ D69
```

The chain passed `ClimateResolver` after adding the exact proven lookup key
`RU|Увильды|SP_20`. The source XLSX was not modified. The sequential audit then
stopped at the first later divergence, the beam profile; no downstream profile,
mass, or D69 correction was made.

## 2. Source identity

The source workbook used for this audit is exactly:

```text
E:\SprintMv1_reference\22329\22329_SOURCE_SELECTION.xlsx
```

The downstream workbook is exactly:

```text
E:\SprintMv1_reference\22329\22329.xlsx
```

| File | Size, bytes | SHA-256 |
|---|---:|---|
| `22329_SOURCE_SELECTION.xlsx` | 9,903,133 | `2376B06809CF10136ABD688BD13A1C13C1213FA12F341CB98FDE1B44EC5CD4AA` |
| `22329.xlsx` | 282,405 | `23C2385808FFD677072641A2FFF1DC34D90A7F2D7041DA53F711A4521754BF1A` |

The two files are distinct workbooks. `22329_SOURCE_SELECTION.xlsx` contains
the calculation and source sheets; `22329.xlsx` contains downstream material
views (`12м`, `15`, `18`, `21`, `1ск`).

## 3. Source inputs from `вывод`

Values below are cached values from the verified source workbook. A formula is
shown where the cell is formula-driven; a literal value is not treated as a
formula result.

| Cell | Cached value | Formula / provenance | Meaning / mapping |
|---|---|---|---|
| `D2` | `Увильды` | literal | city |
| `E2` | `Rus` | literal | legacy country label → `RU` |
| `D3` | `4/3` | `=подбор!V7` | legacy snow/wind display |
| `D4` | `12` | literal | literal span, m |
| `D5` | `26` | literal | building length, m |
| `D6` | `4` | literal | building height, m |
| `D7` | `1` | literal | responsibility input → `1.0` |
| `D8` | `6` | `=подбор!AA14` | automatic nominal frame step, m |
| `D9` | blank | blank | no manual frame-step override |
| `D13` | `III (k=0,8)` | `=IF(подбор!W9=0.8,...)` | derived display, not used as the ProjectInput responsibility value |
| `D14` | `Увильды` | `=подбор!V6` | derived city display |
| `D20` | `С-П 150` | literal | roof covering |
| `D21` | `С44-1000-0,7` | literal | roof deck grade |
| `D22` | `6` | `=IF(E8>E9,подбор!AA15,подбор!AA14)` | selected frame-step display |
| `D23` | `2150` | `=INDEX($W$11:$W$63,MATCH($E$23,$X$11:$X$63,-1))` | deck/purlin maximum, mm |
| `D24` | blank | blank | manual purlin maximum override absent |
| `D25` | blank | blank | optional purlin control absent |
| `D26` | `нет` | literal | snow-retention purlin flag |
| `D27` | `нет` | literal | enclosure purlin flag |
| `D28` | `2150` | `='Подбор прогонов 2'!$S$28` | selected purlin limit display, mm |
| `D29` | blank | blank | horizontal bracing override absent |
| `D60` | `1` | literal | gates at or below 6 m, legacy bucket |
| `D61` | `0` | literal | gates above 6 m, legacy bucket |
| `D62` | `2` | literal | doors |
| `D64` | `0` | literal | window branch input 1 |
| `D65` | `0` | literal | window-strip branch input 2 |
| `D66` | `0` | literal | window branch input 3 |
| `D67` | `2ой стеклопакет` | literal | glazing display; inactive because window counts are zero |
| `D68` | `1.6625` | `=Лист1!O28` | cached opening/window contribution, kg/m² |
| `E68` | `0.5187` | `=Лист1!O29` | cached opening mass, tonnes |
| `D69` | `32.652530448717954` | `=IF(D9=0,E8,E9)+D68` | cached final specific steel consumption, kg/m² |

Additional source controls used by the legacy path:

| Cell | Cached value | Role |
|---|---|---|
| `подбор!V2` | `стандарт` | selection mode → `стандарт` |
| `подбор!V9` | `1` | copied responsibility input from `вывод!D7` |
| `подбор!V10` | `12` | copied literal span |
| `подбор!V11` | `26` | copied literal length |
| `Подбор прогонов!B4` | `двускатное` | roof type → `двускатное` |
| `Подбор прогонов!B10` | `1` | copied responsibility input |
| `Лист1!B3` | `1` | window scheme default; inactive because windows are zero |
| `Лист1!B8` | `1` | window factor default; inactive because windows are zero |

No source cell in the inspected input path establishes a distinct `wall_system`
value for the current `ProjectInput` contract. This field is not consumed by the
current Core1 adapter calculation path and is therefore left unverified.

## 4. ProjectInput and adapter projection

The source-only projection is:

```text
climate:
  mode = CITY_LOOKUP
  country = RU
  city = Увильды
  normative_system = SP_20

geometry:
  span_m = 12
  building_length_m = 26
  building_height_m = 4
  responsibility_factor = 1.0
  frame_step_override_m = null

envelope:
  roof_covering = С-П 150
  roof_deck_grade = С44-1000-0,7

special_conditions:
  snow_retention_purlin = нет
  enclosure_purlin = нет
  horizontal_bracing_override = null

other:
  selection_mode = стандарт
  building_roof_type = двускатное
  purlin_max_step_override_mm = null
  purlin_min_step_mm = 0 (not represented by a source override)

openings:
  one legacy gate in D60 bucket
  zero legacy gates in D61 bucket
  two doors
  no windows / no window strip
```

The adapter mapping is source-preserving for the literal geometry and active
legacy counters:

```text
span=12, length=26, height=4, responsibility=1.0, frame_step_override=null
roof=С-П 150, deck=С44-1000-0,7
gates_le_6m=1, gates_gt_6m=0, doors=2, windows.enabled=false
climate=CITY_LOOKUP / RU / Увильды / SP_20
```

The legacy gate boundary remains an adapter policy, not a newly inferred
engineering rule. This audit uses the already established `width_mm` validation
harness policy only if a full projection is later executed; it does not resolve
the source meaning of the 6 m boundary.

## 5. Span contract and frame-step evidence available before the stop

The source literal span is `12 m`. Under the proven generic mapping:

```text
12 <= x <= 12 → design_span_family = 12
```

Therefore:

```text
literal_span_m   = 12
design_span_family = 12
```

No literal-span conversion or global rounding is required. Source automatic mode
is proven locally:

```text
вывод!D9 (blank)
  → вывод!F8 = IF(D9=0,D8,D9)
  → вывод!D8 = подбор!AA14
  → подбор!AA14 = INDEX(I2:I7,MATCH(AM9,A2:A7,0))
  → подбор!AM9 = 12
  → подбор!I3 = '12м'!IG19 = 6
```

The source therefore exposes nominal automatic frame step `6 m`. The downstream
`22329.xlsx` active `12м` view independently caches `C10=4` as the height and
`C11=6` as the displayed frame step; its `I17=6` is the downstream frame count
formula result (`CEILING(26/6+1,1)`). These are source-side facts only; Core1
was not allowed to reach `FrameSelector` in this audit.

## 6. Climate trace and first divergence

The source workbook contains a complete cached climate row for `Увильды`:

| Source location | Cached values |
|---|---|
| `Города п.К!B303:G303` | `Увильды`, snow region `III`, characteristic snow value `1.8`, wind region `III`, wind value `1.5` |
| `снегветер!B335:I335` | `Увильды`, `E335=1.5`, snow region `F335=III`, `G335=1.5`, wind region `H335=II`, `I335=0.3` |
| `снегветер!AR335:AY335` | parallel cached branch: `AU335=1.5`, `AV335=III`, `AW335=1.5`, `AX335=II`, `AY335=0.3` |
| `Расчеты!C8` | `1.5`, using the populated `Города п.К!G` fallback path for the “new” branch |

The source contains two distinct climate representations that must not be
collapsed into one tuple:

* the populated source row and active structural load path give
  `snow_region=III`, `snow_load=1.5 kN/m²`, `wind_region=II`,
  `wind_load=0.3 kN/m²`;
* the active derived display path `вывод!D16 → подбор!AJ9 → снегветер!J335`
  gives snow region `IV`, while retaining the same snow load `1.5`.

Therefore the base SP 20 row matches the local dataset, but the source's active
derived snow-region display is not internally consistent with that base row.
The dedicated climate audit classifies the canonical source tuple as
`SOURCE_CLIMATE_PROVEN`. The source also contains
`снегветер!D335=#N/A`, which is an `INACTIVE_LEGACY_CELL`: `C335` is blank,
`E335` takes the populated `G335` fallback, and the active structural load path
does not depend on `D335`.

The current Core1 climate contract now includes this exact production key:

```text
RU|Роза|SP_20
RU|Сургут|SP_20
RU|Березовский|SP_20
RU|Увильды|SP_20
```

`RU|Увильды|SP_20` resolves to the canonical tuple
`III / 1.5`, `II / 0.30`. The legacy derived `вывод!D16=IV` remains a display
anomaly and does not replace the proven base-row tuple. The responsibility
branch `D7=1 → W9=0.8 → D13=III (k=0,8)` is tracked separately and is not a
climate divergence.

The post-climate sequential comparison is:

```text
climate       MATCH  III/1.5, II/0.30
frame step    MATCH  source 6 m / Core1 6 m
frame count   MATCH  source 6 / Core1 ceil(26/6)+1 = 6

beam profile  FIRST DIVERGENCE
  SOURCE  = вывод!D33 = ПГС300/20х80х2,5
  Core1   = ПГС245/20х80х2
```

Per the requested rule, the audit stops here. No column, frame-mass,
secondary-steel, purlin, opening, D68, structural-base, or D69 parity claim is
made after the beam mismatch.

## 7. Downstream chain status after the stop

| Chain stage | Source-side evidence | Core1 audit status |
|---|---|---|
| ProjectInput | all required literal geometry and main controls extracted | mapped, no mismatch found |
| `projectInputToCore1Input` | adapter mapping is source-preserving | projection contract documented; no production code changed |
| ClimateResolver | canonical `III/1.5`, `II/0.30`; exact key added | MATCH |
| FrameSelector | source D8/D22 nominal step `6 m` | MATCH: `6 m` |
| frame count | downstream `I17=6` | MATCH: `6` |
| beam | source `D33=ПГС300/20х80х2,5` | **FIRST DIVERGENCE: Core1 `ПГС245/20х80х2`** |
| column | source `D34=ПГС300/20х80х2` | NOT RUN after first divergence |
| frame mass | source-side result not promoted to Core1 comparison | NOT RUN by stop rule |
| structural aggregate frame mass | source-side branch exists | NOT RUN by stop rule |
| secondary steel | source D36:D57 listing exists | NOT RUN by stop rule |
| purlins | source D35/E35/D28/V28 path exists | NOT RUN by stop rule |
| openings | D60:D67 extracted; no windows | NOT RUN by stop rule |
| D68 | source `1.6625 kg/m²` | NOT RUN by stop rule |
| structural base | source `E8=30.990030448717953 kg/m²` | NOT RUN by stop rule |
| D69 | source `32.652530448717954 kg/m²` | NOT RUN by stop rule |

The source-side values above are not evidence of Core1 parity. They are retained
to make the stopping point explicit and to avoid jumping directly to D69.

## 8. Source-suspicious checks

The climate-only audit now classifies the canonical source tuple as proven. The
full project is blocked only at the later beam-profile divergence. The following
findings remain recorded without changing the source XLSX:

1. `вывод!D7=1` and `подбор!V9=1` preserve responsibility input `1.0`, while
   derived display `вывод!D13` shows `III (k=0,8)` because `подбор!W9=0.8`.
   `D7` is a numeric responsibility input/branch selector, not a climate
   region. `D13` is a derived responsibility-class display, not a snow-region
   field. They are nevertheless inconsistent at the responsibility display/
   branch level and require later source review.
2. The populated `Города п.К!C303:G303` / `снегветер!F335:I335` row matches
   the local sparse dataset (`III/1.5`, `II/0.3`). The active derived display
   path returns snow region `IV`, which is classified as a legacy display
   anomaly and does not redefine the canonical climate tuple.
3. `снегветер!D335=#N/A` coexists with populated SP 20 snow and wind values in
   the parallel branch. The source formula path for `Расчеты!C8` uses the
   populated SP 20-compatible value; the `#N/A` branch is preserved as an
   inactive legacy cell.
4. `D68` is nonzero despite `D64:D66=0`; the downstream workbook has opening
   rows and legacy output content that should be reconciled only after climate
   allows a valid Core1 run. This audit does not call it a Core1 mismatch.

## 9. Sequential chain result

| Stage | SOURCE | Core1 | Status |
|---|---|---|---|
| climate | `III/1.5`, `II/0.30` canonical tuple | `III/1.5`, `II/0.30` | MATCH |
| frame step | `6 m` | `6 m` | MATCH |
| frame count | `6` | `ceil(26/6)+1 = 6` | MATCH |
| beam profile | `ПГС300/20х80х2,5` | `ПГС245/20х80х2` | **FIRST DIVERGENCE** |
| column | `ПГС300/20х80х2` | not compared | STOP |
| frame mass onward | not compared | not compared | STOP |

The responsibility inconsistency `D7=1`, `W9=0.8` did not become the first
active calculation divergence. It remains a separate source-branch anomaly.

## 10. Comparison with existing references

| Rule | 22318 | 22316 | 22326 | 22329 result |
|---|---|---|---|---|
| exact city climate lookup | proven | proven | manual-equivalent only | **proven: exact key added** |
| literal span / family separation | proven | proven | proven for literal `10.4` → family `12` | source span `12` maps to family `12`; Core1 downstream not run |
| automatic frame-step lookup | proven | proven | not the current first divergence | source indicates `6 m`; Core1 comparison not run |
| D20/D21 purlin logic | proven in references | proven | purlin-compatible | source values extracted; comparison not run |
| D26 snow retention mapping | proven | `есть` mapping closed fixture mismatch | not first divergence | source is `нет`; comparison not run |
| displayed vs aggregate frame mass | no anomaly accepted | no anomaly accepted | `SOURCE_SUSPICIOUS` | not evaluated |

Existing classifications are unchanged. 22329 is not promoted to
`REAL_PROJECT_REFERENCE` by this audit.

## 11. Required closure for a future audit

To continue 22329 without violating the current contract, the project needs an
explicit climate-source closure for:

```text
RU|Увильды|SP_20
```

That closure is now documented in the climate audit and represented by the
exact production key. The next audit must address the beam-profile mismatch
without changing it automatically.

## 12. Verification requested by the audit prompt

The repository quality commands were run after the climate key and tests were
updated. Their exact results are recorded in the final response. The source
XLSX was not changed. No commit or push was performed.
