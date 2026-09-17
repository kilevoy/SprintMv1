# 22329 Увильды — Climate Source Integrity Audit

**Дата аудита:** 2026-09-17  
**Режим:** audit only  
**Источник:** `E:\SprintMv1_reference\22329\22329_SOURCE_SELECTION.xlsx`  
**Downstream reference:** `E:\SprintMv1_reference\22329\22329.xlsx`  
**Итоговая классификация:** `SOURCE_CLIMATE_PROVEN`

## Boundary

The source XLSX was not modified. The exact production key
`RU|Увильды|SP_20` was added only after the canonical tuple was independently
verified. No commit or push is part of this audit. The full 22329 chain now
passes the climate gate and stops at the first later divergence: the beam
profile.

## 1. City trace

`вывод!D2` is the literal city input `Увильды`. The exact city string occurs
ten times in the source workbook; no fuzzy matching was used.

| Sheet | Cell | Formula / value | Cached or literal value | Role |
|---|---|---|---|---|
| `вывод` | `D2` | literal | `Увильды` | primary city input |
| `вывод` | `D14` | `=подбор!V6` | `Увильды` | output mirror |
| `подбор` | `V6` | `=вывод!D2` | `Увильды` | lookup key |
| `Подбор прогонов` | `B5` | `=вывод!$D$2` | `Увильды` | city lookup key |
| `Подбор прогонов 2` | `B5` | `=вывод!$D$2` | `Увильды` | parallel city lookup key |
| `Города п.К` | `B303` | literal | `Увильды` | climate dataset row |
| `снегветер` | `B335` | literal | `Увильды` | primary snow/wind row |
| `снегветер` | `AR335` | literal | `Увильды` | parallel derived row |
| `Лист1` | `B2` | `=вывод!D2` | `Увильды` | linked display/input |
| `Лист7` | `B2` | `=вывод!D2` | `Увильды` | linked display/input |

The active climate lookup path is `подбор!V6` into the `снегветер` row
matched by city. The `Города п.К` row is the active structural snow-load
source used by `Расчеты!C8`.

## 2. Snow trace

### Active structural snow load

The exact active chain is:

```text
Подбор прогонов!B5 = вывод!$D$2 = Увильды
Подбор прогонов!B11 = новым
Города п.К!B303 = Увильды
Города п.К!E303 = blank
Города п.К!G303 = INDEX($M$8:$T$8,1,MATCH(F303,$M$7:$T$7,0)) = 1.5
Расчеты!C8 = IF(..., E303, G303) = 1.5
```

The active structural snow formula in `Расчеты!C8` selects `Города п.К!G303`
because `B11=новым` and `E303` is blank. The old-table `D303=1.8` is not
the selected value in this branch.

### Base row and derived snow region

| Cell | Formula / value | Cached value | Meaning |
|---|---|---:|---|
| `Города п.К!C303` | literal | `III` | base snow region |
| `Города п.К!D303` | `INDEX(...MATCH(C303,...))` | `1.8` | old-table characteristic value |
| `Города п.К!F303` | literal | `III` | SP 20 snow region |
| `Города п.К!G303` | `INDEX(...MATCH(F303,...))` | `1.5` | SP 20 snow load |
| `снегветер!F335` | literal | `III` | copied/base snow region |
| `снегветер!G335` | `INDEX(...MATCH(F335,...))` | `1.5` | copied/base snow load |
| `снегветер!J335` | `INDEX($AC$5:$AC$58,MATCH(E335+$AM$26,$AB$5:$AB$58))` | `IV` | derived active displayed region |
| `снегветер!K335` | derived | `0.8` | derived coefficient |
| `снегветер!L335` | `INDEX($AG$5:$AG$58,MATCH(E335+$AM$26,$AB$5:$AB$58))` | `III` | alternate responsibility branch |
| `подбор!AJ9` | `IF(V9=0.8,L-branch,J-branch)` | `IV` | active derived snow region because `V9=1` |
| `вывод!D16` | `IF(E8>E9,подбор!BA9,подбор!AJ9)` | `IV` | active displayed snow region |

The source therefore has a populated canonical base tuple `III / 1.5`, and the
active structural calculation uses that load. The derived display path produces
`IV / 1.5`; this is retained as a legacy display/derived-branch anomaly and
does not redefine the canonical tuple.

### `снегветер!D335 = #N/A`

The row formulas are:

```text
C335 = blank
D335 = INDEX($P$5:$W$5,1,MATCH(C335,$P$4:$W$4,0)) = #N/A
E335 = IF(C335="",G335,0.7*D335) = 1.5
F335 = III
G335 = INDEX($P$8:$W$8,1,MATCH(F335,$P$7:$W$7,0)) = 1.5
```

Because `C335` is blank, `E335` takes the populated `G335` fallback and does
not use `D335` as the selected value. The same cell is not a precedent of the
active `Расчеты!C8` path. Classification: **`INACTIVE_LEGACY_CELL`**.

## 3. Wind trace

The exact active wind chain is:

```text
подбор!V6 = вывод!D2 = Увильды
подбор!AK9 = INDEX(снегветер!H3:H600,MATCH(V6,снегветер!B3:B600,0)) = II
снегветер!H335 = II
снегветер!I335 = INDEX($P$11:$W$11,1,MATCH(H335,$P$10:$W$10,0)) = 0.3
вывод!D17 = IF(E8>E9,подбор!BB9,подбор!AK9) = II
```

The active wind result is region `II`, load `0.3`. This is the SP 20 path.
`подбор!BB9=AK9` is the parallel branch and also caches `II`.

## 4. D7 versus D13

| Cell | Formula / value | Cached value | Exact semantics |
|---|---|---:|---|
| `вывод!D7` | literal | `1` | numeric responsibility input / branch selector |
| `подбор!V9` | `=вывод!D7` | `1` | responsibility value used by branch formulas |
| `подбор!W9` | `=IF(вывод!E8>вывод!E9,AJ15,AJ14)` | `0.8` | derived responsibility coefficient |
| `вывод!D13` | `=IF(подбор!W9=0.8,"III (k=0,8)","II (k=1,0)")` | `III (k=0,8)` | derived responsibility-class display |

`D7` is not a climate-region field. `D13` is also not a snow-region field;
it is a derived responsibility-class display. They are not two competing
representations of the same climate variable. They do conflict at the source
responsibility display/branch level because the numeric input is `1`, while the
derived coefficient resolves to `0.8` and displays class III. This is separate
from the base snow/wind row and must not be used to prove a climate key.

## 5. Local dataset comparison

The exact local dataset is `core1/data/climate_lookup_sparse.csv`, extracted
from the source sheet `снегветер`.

| Dataset row / field | Value |
|---|---|
| line 9169 (`B335`) | `Увильды` |
| line 9171 (`E335`) | `1.5` |
| line 9172 (`F335`) | `III` |
| line 9173 (`G335`) | `1.5` |
| line 9174 (`H335`) | `II` |
| line 9175 (`I335`) | `0.3` |
| line 9180 (`AR335`) | `Увильды` |
| line 9181 (`AU335`) | `1.5` |
| line 9182 (`AV335`) | `III` |
| line 9183 (`AW335`) | `1.5` |
| line 9184 (`AX335`) | `II` |
| line 9185 (`AY335`) | `0.3` |

Comparison:

```text
SOURCE base row:    snow III / 1.5; wind II / 0.3
LOCAL dataset row:  snow III / 1.5; wind II / 0.3
BASE ROW:           MATCH
ACTIVE D16 display: snow IV / 1.5; legacy display anomaly, not canonical input
OVERALL:            CANONICAL TUPLE MATCH
```

## 6. Duplicates and spelling variants

The exact string `Увильды` occurs ten times, as listed in the city trace. This
does not represent ten independent city records: it is one `Города п.К` row,
one primary `снегветер` row, one parallel `снегветер` row, and linked mirrors.

No exact entries were found for `Увельды`, `Увильды Челябинская`, `Увильды К`,
or other tested spelling variants. There is no duplicate/ambiguous city spelling
in the inspected source and local dataset. The ambiguity is in derived branch
semantics, not city identity.

## 7. Trust classification and implementation gate

**Classification: `SOURCE_CLIMATE_PROVEN`**

Reason: the source base row and local dataset agree on `III / 1.5` and
`II / 0.3`, independent SP 20 verification confirms the same tuple, and
`снегветер!D335=#N/A` is inactive legacy data. The active derived display
`IV / 1.5` is classified as a legacy display/derived-branch anomaly and is not
the canonical climate input. D7/D13 expose a separate responsibility branch
inconsistency, not a climate conflict.

```text
RU|Увильды|SP_20: ADDED
Ready for implementation: YES — climate gate only
Full 22329 parity audit: STOPPED at FIRST_DIVERGENCE_BEAM_PROFILE
```

The `J335/K335/L335` mapping and D7/W9/D13 responsibility branch remain
documented anomalies, but neither is allowed to replace the proven canonical
climate tuple. The next unresolved parity item is the beam profile after the
matching climate, frame step, and frame count.
