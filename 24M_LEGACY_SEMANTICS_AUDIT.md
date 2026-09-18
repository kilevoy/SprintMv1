# 24M legacy semantics audit

Режим: read-only audit. Исходная книга, XLSX и production TypeScript не изменялись.

## Итог

`24M_SEMANTICS_INCOMPLETE`.

Причина не в отсутствии таблицы `24м`, а в отсутствии сохранённого Excel-сценария,
в котором вход действительно установлен в 24 м и книга пересчитана. Проверенная
книга сохранена с `вывод!D4 = 12`, `D5 = 18`, `D6 = 3`, `D7 = 0,8`.
Поэтому кэшированный `#N/A` в листе `24м` доказывает состояние сохранённого
кэша, но сам по себе не доказывает активный результат для `span = 24`.

Одновременно формулы дают проверяемое противоречие с прежним контрактом
«24 м всегда возвращает `#N/A`»: при доказанном domain высоты `<= 6,2` ключ
24-метровой таблицы проходит как `6`, а `6` присутствует во всех четырёх
кандидатных осях. Таким образом, без пересчёта нельзя безопасно оставлять
`LEGACY_NA` безусловным следствием одного только `span = 24`.

Источник:

- `Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx`
- SHA-256: `0271b96c6fe725d3e50ad7891401958322a5ae97866bb0bf8cb190bc4bbeff3f`

## 1. Полная цепочка 24 м

| Этап | Локальный источник и формула | Сохранённый cached value | Эквивалент Core1 | Состояние |
|---|---|---:|---|---|
| ProjectInput | `вывод!D4`, `D5`, `D6`, `D7`, `D9` | `12`, `18`, `3`, `0,8`, blank | `Core1Input` | доказано для структуры входа; сохранённый span не 24 |
| Adapter | `подбор!V10 = вывод!D4`; `V11 = вывод!D5`; `V8 = вывод!D6`; `V9 = вывод!D7`; `V6 = вывод!D2` | `12`, `18`, `3`, `0,8`, `Роза` | input adapter | доказано |
| Design family | `подбор!AM9 = IF($V$10<=9,9,AM10)` … `AM14 = IF($V$10<=24,24,AM15)`; зеркальная цепочка `BD9:BD14` | cache `AM9=12`, `BD9=12` | `resolveDesignSpanFamily()` | для 24 формула возвращает family `24`; доказано |
| 24m frame branch | `подбор!B7:R7 → 24м!KM19:LA19`; второй блок `B14:R14 → 24м!WO19:XC19` | downstream cache `#N/A` | `FrameSelector` | cache stale/default; активный 24m result не пересчитан |
| 24m key | `24м!KL5 = подбор!AN9`, `KL13 = подбор!AN9`; `WN5/WN13 = подбор!BE9` | `3,6` при сохранённом span 12 | frame-table key | для span 24 и `height<=6,2`: `AN9→AN10→AN11→6`; key `6` существует |
| Climate key | `24м!KL18 = INDEX(IF(подбор!V9=0.8,снегветер!M3:M600,снегветер!K3:K600),MATCH(подбор!V6,снегветер!B3:B600,0))`; `WN18` — аналог через `BC/BA` | `1`, `1` | `ClimateResolver` | локальная exact lookup доказана для Розы; не blocker |
| Profile lookup, first block | `KM6:LA6 = INDEX(JW7:KK12, MATCH(KL5,JV7:JV12,0))` по столбцам | `#N/A` (15 cells) | frame dataset lookup | при cache key `3,6` ожидаемый exact miss; при active key `6` ось содержит `6` |
| Profile lookup, second block | `KM14:LA14 = INDEX(JW15:KK19, MATCH(KL13,JV15:JV19,0))` | `#N/A` (15 cells) | frame dataset lookup | тот же stale-cache miss; active key `6` присутствует |
| Mirrored 24m block | `WO6:XC6 = INDEX(VY7:WM11, MATCH(WN5,VX7:VX11,0))`; `WO14:XC14` — rows 15:19 | `#N/A` (30 cells) | second legacy branch | same exact-match condition |
| Climate selection | `KM19:LA19 = INDEX(KM6:LA14, MATCH(KL18,KL6:KL14,0))`; `WO19:XC19` — analogous | `#N/A` (30 cells) | selected frame result | climate key `1` is present at row 6; errors are propagated inputs, not a proven climate miss |
| Secondary/base row | `подбор!O7 = (E7+G7*T7)/(24*$V$11)+H7`; `O14` analogous; `E7=D7*S7` | `#N/A` because row 7 is `#N/A` in saved cache | `StructuralSummary` inputs | not recalculated for active 24 |
| Structural summary | `подбор!Z14 = INDEX($O$2:$O$7,MATCH(AM9,$A$2:$A$7,0))`; `Z15` uses `O9:O14` | numeric cache from family 12 | structural aggregate input | active 24 output unavailable |
| Purlin contribution | `вывод!E8 = подбор!Z14 + 'Подбор прогонов'!T28`; `E9` uses `Z15` and `'Подбор прогонов 2'!T28`; `T28 = IF(T25=0,T26,T25)` | cache is for span 12 | `PurlinCalculator` | active 24 not recalculated |
| Openings/secondary mass | `вывод!D68 = Лист1!O28`; `E68 = Лист1!O29`; `Лист1!O28=(O23+...+O27)/B10/B11` | `0`, `0` (zero-opening saved state) | `OpeningMassCalculator` / summary | formula path known; 24m active value not proven |
| D69 | `вывод!D69 = IF(D9=0,E8,E9)+D68` | `30.25967361111111` for saved 12m cache | `StructuralSummary` | no active 24m numeric result |

При blank `D9` активна первая ветка `E8`, то есть `подбор!Z14` плюс
`Подбор прогонов!T28`. Ненулевой `D9` переключает итог на `E9`/вторую ветку;
это отдельный controller, а не доказательство постоянной ошибки 24 м.

## 2. Все найденные `#N/A` и их непосредственные причины

В извлечённом диапазоне `24м!A1:XC40` найдено ровно 90 cached `#N/A`.
Они образуют шесть формульных блоков, а не 90 независимых причин:

| Блок | Количество | Формула | Ключ | Ось exact `MATCH(...,0)` | Сохранённый результат |
|---|---:|---|---|---|---|
| `24м!KM6:LA6` | 15 | `INDEX(JW7:KK12,MATCH(KL5,JV7:JV12,0))` | `KL5=3,6` | `[6,7,8,9,blank,blank]` | `#N/A` |
| `24м!KM14:LA14` | 15 | `INDEX(JW15:KK19,MATCH(KL13,JV15:JV19,0))` | `KL13=3,6` | `[6,7,8,9,blank]` | `#N/A` |
| `24м!WO6:XC6` | 15 | `INDEX(VY7:WM11,MATCH(WN5,VX7:VX11,0))` | `WN5=3,6` | `[6,7,8,9,blank]` | `#N/A` |
| `24м!WO14:XC14` | 15 | `INDEX(VY15:WM19,MATCH(WN13,VX15:VX19,0))` | `WN13=3,6` | `[6,7,8,9,blank]` | `#N/A` |
| `24м!KM19:LA19` | 15 | `INDEX(KM6:KM14,MATCH(KL18,KL6:KL14,0))` | `KL18=1` | `KL6:KL14` | propagated `#N/A` |
| `24м!WO19:XC19` | 15 | `INDEX(WO6:WO14,MATCH(WN18,WN6:WN14,0))` | `WN18=1` | `WN6:WN14` | propagated `#N/A` |

The first failing lookup in the saved cache is therefore the exact match of
`3,6` against an axis beginning with `6`. The final climate matches are not the
first failure: `KL18/WN18=1`, and row 6 of each final climate axis is `1`.

The `#N/A` values in `подбор!B7:R7` and `B14:R14`, `S/T`, `O7/O14`, and any
downstream `Z14/Z15`/`E8/E9` values are propagation from those 24m blocks,
not additional lookup origins.

No other Excel error type was found in the extracted `24м!A1:XC40` snapshot.
All lookup modes above are exact (`MATCH(...,0)`); no approximate match,
nearest value, zero fallback, or extrapolation is present.

### Classification of every 24m `#N/A`

The classification below separates the literal saved-cache observation from
the active 24m domain. Because the workbook is saved at span 12, none of the
90 cells can be classified as an active 24m `LEGACY_SOURCE_ERROR` without a
recalculated 24m run:

| Cells | Literal saved-cache classification | Active-24m classification | Evidence |
|---|---|---|---|
| `KM6:LA6`, `KM14:LA14`, `WO6:XC6`, `WO14:XC14` | `LEGACY_SOURCE_ERROR` in the saved snapshot | `MISSING_DATA` | exact key is cached `3,6`, while span-24 formula path changes it to `6`; no active cache exists |
| `KM19:LA19`, `WO19:XC19` | propagated `LEGACY_SOURCE_ERROR` in the saved snapshot | `MISSING_DATA` | final climate key is present; the error is inherited from the preceding blocks |
| `подбор!B7:R7`, `B14:R14`, `O7/O14`, `S/T` | propagated error | `MISSING_DATA` | downstream cells have no independent failing lookup |

No 24m cell is proven `SUPPORTED` by a numeric active result yet, and no
24m cell is proven `TYPED_UNSUPPORTED_CASE` merely from the cached `#N/A`.

## 3. Why the saved `#N/A` is not yet an active 24m proof

The height-key formulas are explicit:

```text
подбор!AN9  = IF(V10>21,AN10,IF(V8<=3.8,3.6,AN10))
подбор!AN10 = IF(V10>21,AN11,IF(V8<=5,4.8,AN11))
подбор!AN11 = IF(V8<=6.2,6,AN12)
подбор!AN12 = IF(V8<=7,7,AN13)
подбор!AN13 = IF(V8<=8,8,AN14)
подбор!AN14 = IF(V8<=9,9,AN15)
```

For `span=24` and every currently proven Core1 height (`height<=6,2`),
the first two `V10>21` branches are true and `AN11` returns `6`. The mirrored
`BE9` chain has the same thresholds. The candidate axes are `[6,7,8,9]`
plus unused blank rows, so the first exact lookup is structurally matchable.

The workbook was not saved with `D4=24`, and no recalculated 24m workbook is
available in the repository. Consequently we cannot claim, from this XLSX
alone, the recalculated values of the internal profile lookups, purlin sheets,
connection output, `D68`, or `D69` for a real 24m run. The former fixture
`legacy_24m_na` is therefore a cache-based oracle, not an independently
recalculated 24m oracle.

## 4. Special 24m ranges

| Range | Meaning | Completeness / error state |
|---|---|---|
| `JV7:JV12`, `JV15:JV19` | first 24m exact step axes | values `6,7,8,9` plus blanks; no duplicate nonblank key |
| `VX7:VX11`, `VX15:VX19` | mirrored exact step axes | values `6,7,8,9` plus blank; no duplicate nonblank key |
| `KL6:LA14` | first climate/step output matrix | row 6 climate key `1`; rows 7–10 are selected step outputs; cached errors are stale-key dependent |
| `WN6:XC14` | mirrored climate/step output matrix | same structure |
| `KL18` | snow/climate selector | exact city match, responsibility branch `M`/`K`; cached `1` |
| `WN18` | mirrored snow/climate selector | exact city match, responsibility branch `BC`/`BA`; cached `1` |
| `KP:KX` | first matrix output columns (including purlin/profile/bolt fields) | formula outputs in rows 6/14/19; 15 cells per selected row, currently propagated `#N/A` |
| `WR:WZ` | mirrored matrix output columns | same semantics for second block |

The row-6/row-14 candidates are actual data rows. Header labels in row 6 or
row 14 of the output blocks are not candidate keys. Blank rows are not valid
engineering candidates and must not be treated as nearest-step fallbacks.

## 5. Core1 domain matrix

| Submodule / output | Contract from evidence | Classification for this audit |
|---|---|---|
| 24m geometry | `resolveDesignSpanFamily(24)=24`; literal geometry is representable | `SUPPORTED` geometrically |
| 24m frame selection | local `24м` tables and exact keys exist for supported heights; active recalculation not saved | `MISSING_DATA`; current unconditional `FRAME_LEGACY_NA` is unsafe to generalize |
| 24m purlins | `подбор!Z14/Z15` feeds `'Подбор прогонов'!T28`/`'Подбор прогонов 2'!T28`; no active 24m cached result | `MISSING_DATA` for parity evidence |
| 24m secondary steel | `вывод!D68/E68` and `Лист1!O28/O29` are local; saved zero-opening cache is `0` | `SUPPORTED` formula path, numeric 24m parity not proven |
| 24m connections | local outputs are downstream of selected frame/connection sheets; exact historical replay requires a snapshot | `SNAPSHOT_REQUIRED` for replay; canonical 24m result not proven |
| 24m D69 | `IF(D9=0,E8,E9)+D68` is known exactly, but active `E8/E9` and `D68` were not recalculated | `NOT_COMPUTABLE` from the supplied saved cache |

This is not a claim that every possible 24m input is valid. Height above the
proven `6,2` domain, unknown climate, unsupported manual overrides, or a real
exact-match miss must produce typed diagnostics rather than fallback values.

## 6. Minimal test matrix

No XLSX was edited or recalculated during this audit. The following matrix is
the minimum required before changing the runtime contract:

| Case | Input | Legacy evidence currently available | Core1 result today | Status / first divergence |
|---|---|---|---|---|
| A | auto, first branch, span 24, height 3, Роза, `.8`, default roof/deck | saved cache shows `#N/A`, but saved span is 12 | unconditional `LEGACY_NA` before FrameSelector | `UNKNOWN_ACTIVE_RECALC`; saved first miss `24м!KM6` key `3,6` |
| B | manual frame-step override, span 24 | no recalculated source snapshot | domain currently returns `UNKNOWN_DOMAIN` for nonzero manual override | `UNKNOWN_DOMAIN`; active legacy result unproven |
| C | second/ROW15 branch, span 24, height 3 | saved cache contains mirrored `WO*` errors under span 12 cache | current engine exits before branch | `UNKNOWN_ACTIVE_RECALC`; saved first miss `24м!WO6` key `3,6` |
| D | auto, second proven climate city, span 24 | no saved 24m recalculated workbook | climate resolver can only use exact exported key | `UNKNOWN_CLIMATE_DATA` or unknown active result depending city |
| E | alternate roof/deck inputs | no active 24m golden oracle | no constructive 24m result is allowed | `MISSING_DATA`; do not approximate |
| F | connection replay snapshot present | resolver can replay supplied snapshot values, including literal `#N/A` | typed replay result | `SUPPORTED` only for snapshot provenance |
| G | canonical calculation without snapshot | no verified 24m output chain | no safe result | `SNAPSHOT_REQUIRED` / `MISSING_DATA` |

At minimum cases A–E need genuinely recalculated source results for auto and
manual branches, two climate states, and two roof/deck combinations. Case F
must remain separate from canonical calculation and must not silently import a
master snapshot.

## 7. Recommended typed diagnostics

These are audit recommendations only; no code was changed:

- `UNKNOWN_DOMAIN` — height/manual override outside proven domain;
- `UNKNOWN_CLIMATE_DATA` — exact city/climate key is absent;
- `LEGACY_NA` — emit only when the active recalculated lookup actually returns
  `#N/A`, not merely because `span_m === 24`;
- `LEGACY_REF` — preserve a real purlin `#REF!` without normalization;
- `LEGACY_CONNECTION_SNAPSHOT_REQUIRED` — historical replay requested without
  a project-scoped snapshot;
- `24M_ACTIVE_RECALC_REQUIRED` — temporary audit diagnostic if the application
  must distinguish a stale source cache from a verified active 24m result.

## Final decision

- Final classification: **`24M_SEMANTICS_INCOMPLETE`**.
- First unknown dependency: the active recalculated value of the first selected
  24m profile output (`24м!KM6` and mirrored `WO6`) after changing `D4` to 24;
  downstream unknowns are `подбор!B7:R7`/`B14:R14`, purlin `T28`,
  `Лист1!O28`, and `вывод!D69`.
- `SAFE TO IMPLEMENT 24m diagnostics`: **NO** for an unconditional
  `span=24 → LEGACY_NA` rule. Safe only to add diagnostics that report the
  active recalculated cell/error after the chain has been verified.
- `PRODUCTION CODE CHANGED = NO`.
- `XLSX CHANGED = NO`.
- `COMMIT/PUSH = NO`.
