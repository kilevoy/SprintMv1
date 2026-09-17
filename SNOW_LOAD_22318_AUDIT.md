# Snow-load first-divergence audit — project 22318

Дата: 2026-09-17
Источник: `E:\SprintMv1_reference\22318_SOURCE_SELECTION.xlsx`
SHA-256: `dbf29d01db4fe81e8e0a997a69f045330f715b64df3c828bc9d3cc4601116ac3`

Аудит выполнен до и после минимальной правки климатического lookup. XLSX не изменялся. Значение `1.8` не захардкожено по городу и не связано с идентификатором 22318.

## 1. Exact SOURCE path

Для автоматической пurlin-ветки:

```text
вывод!D2 = Сургут
  → Подбор прогонов!B5 = вывод!D2                         → Сургут
  → Подбор прогонов!B11 = новым                           → новая SP 20 ветка
  → Расчеты!C8 = IF(B11="старым", 0.7/1.1*D, IF(E="", G, E))
  → Города п.К!B138 = Сургут
  → Города п.К!C138 = IV; D138 = 2.4; E138 = 1.8;
     F138 = IV; G138 = 2.0
  → Расчеты!C8 = 1.8 кН/м²
  → Подбор прогонов!B12/B13
  → вывод!E23
  → вывод!D23 = 1900 мм
```

Cached values в исходной книге:

| Cell | Formula / source | Cached |
|---|---|---:|
| `вывод!D2` | user city | `Сургут` |
| `Подбор прогонов!B5` | `=вывод!$D$2` | `Сургут` |
| `Подбор прогонов!B11` | branch selector | `новым` |
| `Города п.К!B138` | city key | `Сургут` |
| `Города п.К!C138` | SP 20.13330.2011 snow region | `IV` |
| `Города п.К!D138` | 2011 table load | `2.4` |
| `Города п.К!E138` | 2016 normative load field | `1.8` |
| `Города п.К!F138` | second snow-region field | `IV` |
| `Города п.К!G138` | fallback/older snow-load field | `2.0` |
| `Расчеты!C8` | exact IF/INDEX/MATCH formula above | `1.8` |
| `Расчеты!C5` | coefficient | `1.4` |
| `Расчеты!C6` | coefficient | `1.1` |
| `Подбор прогонов!B8` | purlin wind addend | `0.2` |
| `Подбор прогонов!B9` | `=IF(B2>21,6,15)` | `15°` |
| `Подбор прогонов!B12` | `(C8*C5*C6*COS(B9*PI()/180)+B8)*100` | `287.75463904732976` кг/м² |
| `Подбор прогонов!B13` | `=B12/100` | `2.8775463904732974` кН/м² |
| `Подбор прогонов 2!B13` | same calculation branch | `2.8775463904732974` кН/м² |
| `вывод!E23` | `='Подбор прогонов 2'!B13*1.15` | `3.309178349044292` |

`вывод!D9` is blank, hence `D9=0`; `вывод!D69` uses `E8`, and `E8` reads `Подбор прогонов!T28`. The `Подбор прогонов 2` values are parallel cached results in this project, not the authoritative `D69` branch.

## 2. Meaning of the workbook snow fields

The workbook stores distinct fields. They must not be collapsed into one generic “snow load”.

| Meaning in this audit | SOURCE cell | Value | Units / interpretation |
|---|---|---:|---|
| city key | `Города п.К!B138` | Сургут | text |
| SP 20.13330.2011 snow region | `Города п.К!C138` | IV | region label |
| 2011 table snow load | `Города п.К!D138` | 2.4 | kN/m², not used by `B11=новым` branch |
| 2016 normative snow-load field | `Города п.К!E138` | **1.8** | kN/m², used by `Расчеты!C8` |
| second/new snow region field | `Города п.К!F138` | IV | region label |
| fallback/older snow-load field | `Города п.К!G138` | 2.0 | kN/m²; used only when E is blank |
| wind region | `Города п.К!H138` / `снегветер!H138` | I | region label |
| wind load | `Города п.К!I138` / `снегветер!I138` | 0.23 | kN/m² |
| purlin roof-demand intermediate | `Подбор прогонов!B12` | 287.75463904732976 | kg/m² after multiplying kN/m² by 100 |
| purlin roof-demand intermediate | `Подбор прогонов!B13` | 2.8775463904732974 | kN/m² |
| deck lookup demand | `вывод!E23` | 3.309178349044292 | kN/m² after legacy `×1.15` |

No separate cached “roof snow”, “reduced snow”, or “design snow” cell is used as the city input for this purlin path. `D138`, `E138`, `G138`, `B12`, `B13`, and `E23` are different stages/fields with different roles. The `×1.4`, `×1.1`, cosine, `+0.2`, and final `×1.15` are preserved legacy coefficients.

## 3. What IV/2 means locally

The local workbook does not store `IV/2` as one atomic value. It stores two paired fields:

- region `IV` in `Города п.К!C138` / `F138` and `снегветер!C138` / `F138`;
- numeric snow values `2.4`, `1.8`, and `2.0` in their respective columns.

The `IV/2` tuple used by the structural frame branch is therefore a local shorthand for the region label plus the `2.0` field exposed in the `снегветер` layout (`F138=IV`, `G138=2.0`). The authoritative automatic purlin branch, however, follows `Расчеты!C8` and selects the populated 2016 field `E138=1.8` when `B11=новым`. No external standard was used to reinterpret the tuple.

## 4. Core1 path and exact 2.0 origin (before correction)

Before the correction, `ClimateResolver.climateFromRow()` selected:

```text
numericValue(values.get("G")) ?? numericValue(values.get("AW"))
```

For dataset `core1/data/climate_lookup_sparse.csv`, row 138 is:

```text
B138=Сургут, F138=IV, G138=2.0, H138=I, I138=0.23
AR138=Сургут, AV138=IV, AW138=2.0, AX138=I, AY138=0.23
```

Therefore `ClimateResolver → climate.snow_load → PurlinCalculator` produced exactly `2.0 кН/м²`. The same dataset row also contains `E138=1.8` and `AU138=1.8`, so the source rule was recoverable from the existing local data; no city-specific data insertion was required.

## 5. Proven correction

`ClimateResolver` now applies the general workbook rule:

```text
E/AU when populated; otherwise G/AW
```

This is the same `IF(E="",G,E)` behavior in `Расчеты!C8`. It is a data-field mapping correction, not a purlin correction, a unit conversion, or a hardcoded city exception.

## 6. Роза baseline check

Source rows:

| City | `E` | `G` | Source `Расчеты!C8` under `B11=новым` |
|---|---:|---:|---:|
| Роза (`Города п.К!B500`) | blank | 1.5 | 1.5 |
| Сургут (`Города п.К!B138`) | 1.8 | 2.0 | 1.8 |

The Core1 Роза baseline previously passed because its old G/AW mapping happened to equal the source fallback value: E is blank and G is 1.5. It was not evidence that the mapping was generally correct. After the correction, Роза remains 1.5 through the same general fallback rule.

## 7. First-divergence result

Before correction:

```text
city / region / roof / deck / coefficients: MATCH
snow load: SOURCE 1.8, CORE1 2.0                         FIRST_DIVERGING_VALUE
deck demand: SOURCE 3.309178349044292, CORE1 3.65130927671588
deck limit: SOURCE 1900, CORE1 1750
```

Classification: **WRONG_SNOW_FIELD**. Core1 read the older/fallback G/AW field even when the normative E/AU field was populated. This is not a unit conversion error and not a missing coefficient.

After correction:

```text
snow load: SOURCE 1.8, CORE1 1.8                         MATCH
E23-equivalent demand: SOURCE 3.309178349044292, CORE1 same
deck limit: SOURCE 1900, CORE1 1900                      MATCH
1900: present in Core1 candidate set                     YES
```

The new first divergence is downstream purlin selection: SOURCE selects 1900 mm; Core1’s current deterministic candidate ordering selects 1875 mm. This audit intentionally does not alter `PurlinCalculator` or force 1900.

## 8. Regression and scope

- `Роза` remains `snow_load=1.5`.
- `Сургут` is now `snow_load=1.8`, region `IV`, wind `I/0.23`.
- frame step, beam, column, D68 and `PURLIN_DECK_GAP` behavior are not changed by this correction.
- no XLSX was recalculated or written.
- no commit or push was performed.
