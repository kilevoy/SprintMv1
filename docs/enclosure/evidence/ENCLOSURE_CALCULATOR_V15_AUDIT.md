# Enclosure calculator v1.5 — primary geometry evidence

## Source

`Z:\Конструктивные расчеты\Прогоны\Для предрасчетов\Калькулятор ограждайки v1.5.xlsx`

The workbook contains the sheets `Лист1`, `Расчет Угловая`, `Расчет Рядовая`, `несушки`, `Ветер по СП` and `Ветер по EN`. This is a primary enclosure-calculator source, distinct from the structural span workbooks.

## Proven controller inputs

Cached values observed on `Лист1`:

| Cell | Meaning from label | Cached value |
|---|---|---:|
| `B6` | building width/span input | 10 |
| `B7` | building length input | 48 |
| `B8` | building height input | 4.75 |
| `B11` | side-wall calculation length | 10 |
| `B12` | side-wall calculation height | 4.7 |
| `B13` | support step | 5 |
| `B18` | enclosure material selector | `Профнастил` |
| `B19` | selected sheet | `С18-1150-0,5` |
| `D17` | normative branch selector | `СП 20.13330.2016` |

`J20` on `Лист1` is blank in this workbook and is not required by the local enclosure path.

## Formula chain

`Расчет Угловая!B7` is the direct end/remaining length input:

```excel
=IF(Лист1!C21="Расчёт по СП РК EN",...
```

The observed workbook variant uses the local normative branch to resolve wind data. The key geometry formulas are:

```excel
Расчет Угловая!C8
=2*IF('Расчет Угловая'!B7/Лист1!B13<0.5,0,
  CEILING.MATH('Расчет Угловая'!B7/Лист1!B13,1)*Лист1!B13)

Расчет Рядовая!B7
=Лист1!B11-'Расчет Угловая'!C8

Расчет Рядовая!C8
=B7
```

Thus the legacy sequence is:

```text
Лист1!B11 / B13
  → Расчет Угловая!B7
  → Расчет Угловая!C8 (corner-zone length)
  → Расчет Рядовая!B7
  → Расчет Рядовая!C8 (typical-zone length)
```

For the cached example, `Расчет Угловая!C8 = 0` and `Расчет Рядовая!C8 = 10`.

## What this proves

- B11, B12 and B13 are real enclosure-calculator controls, not guessed aliases from Core1 ProjectInput.
- The corner-zone formula is proven and matches the existing explicit `WallGeometryResolver` rule.
- The row/typical zone is explicitly `B11 - cornerZoneLength`.
- Normative routing is local: `СП 20.13330.2016` and the workbook's EN branch are selected inside the workbook; external ID3/ID4/ID5 are not needed for this source.
- The workbook provides a source for future orientation-specific geometry mapping, but one scenario does not yet prove that generic `ProjectInput.building_length_m`, `span_m` and `building_height_m` can be substituted for B11/B12/B13 in every branch.

## Remaining evidence gap

Before wiring ordinary ProjectInput, collect at least two independent real-project cases from this workbook family and record for each:

1. source cells/formulas and cached values for B11/B12/B13;
2. side and end wall interpretation;
3. frame/support positions and end-post step;
4. source of the corner-half length used by the active branch;
5. roof/enclosure type and normative branch;
6. workbook SHA-256.

Until that matrix is complete, the safe implementation boundary remains explicit geometry input → `WallGeometryResolver` → wall-girt selector/replay.

## Status

`ENCLOSURE_PRIMARY_SOURCE_FOUND`

`PROJECTINPUT_AUTO_WIRING = STILL_GATED`

`PRODUCTION_CODE_CHANGED = NO`

## Additional wind/e-zone finding

The `Расчет Угловая!B7` formula is backed by the local wind sheet:

```excel
Расчет Угловая!B7
=IF(Лист1!C21="Расчёт по СП РК EN",'Ветер по EN'!G28,'Ветер по СП'!J31)

Ветер по СП!J30 = MIN(C7,2*C8)
Ветер по СП!J31 = J30/5
```

For the inspected SP20 scenario, `Ветер по СП!J30` has cached value `10` and `J31` has cached value `2`, while the current input cells are `C7=48` and `C8=4.75`. This is a legacy cached-value/formula-state discrepancy (the formula path is the authoritative rule; the cached result reflects the workbook's last recalculation state). It must not be generalized into a universal `max(5,height)` heuristic.

The current Core1 automatic selector therefore remains restricted evidence code. A future ProjectInput adapter must either supply the source-backed effective corner-half length or reproduce the exact local wind formula and its recalculation semantics; it must not silently substitute a rounded value.

## ProjectInput mapping boundary

The inspected default workbook has `Лист1!B6=10` (span), `B7=48` (building length), `B8=4.75` (height), but `B11=10` under the separate `Расчётная стена` block. Therefore `B11` is a manually selected calculation-wall length in this source; it is not equal to `building_length_m` for this scenario. A generic adapter must not map `ProjectInput.building_length_m → B11` without an orientation/selected-wall rule proven by real projects.

`B12=4.7` is also distinct from the global `B8=4.75`, so `building_height_m → B12` is not an exact identity either. `B13=5` is a manual post step and is not proven equivalent to the effective frame step in every project.

This closes the immediate question negatively: the source proves the local B11/B12/B13 formulas and controls, but does not prove automatic ProjectInput substitution.

## Independent orientation-specific source pair: project 21604

Two saved workbooks from the same calculator family were inspected without
modifying them. Their SHA-256 values are:

| Workbook | SHA-256 | B6 | B7 | B8 | B11 | B12 | B13 |
|---|---|---:|---:|---:|---:|---:|---:|
| `21604 ... торец продольная.xlsx` | `DAE79A7266A558D9DBDA71FB32958BADAA7330AE119AC17A877FA1AB9F43E44A` | 18 | 48 | 9.75 | 48 | 7.5 | 5.35 |
| `21604 ... торец.xlsx` | `668A7BB463BBD72B80B6728F356EE4AD98B4D50D75EDC1A242E35099DA988363` | 18 | 48 | 9.75 | 18 | 9.75 | 6 |

The formula structure is identical in both files:

```excel
Расчет Угловая!B7 = IF(Лист1!C21="Расчёт по СП РК EN",'Ветер по EN'!G28,'Ветер по СП'!J31)
Расчет Угловая!C8 = 2*IF(B7/Лист1!B13<0.5,0,CEILING.MATH(B7/Лист1!B13,1)*Лист1!B13)
Расчет Рядовая!B7 = Лист1!B11-'Расчет Угловая'!C8
Расчет Рядовая!C8 = B7
```

Cached branch values differ by orientation/workbook state:

| Variant | `Расчет Угловая!B7` | `Расчет Угловая!C8` | `Расчет Рядовая!C8` |
|---|---:|---:|---:|
| продольная | 3.9 | 10.7 | 37.3 |
| торец | 3.9 | 12 | 6 |

This is stronger evidence that B11 is an orientation-specific selected wall
length, not a universal alias for `ProjectInput.building_length_m`. It also
shows B12 and B13 can vary independently from global B8 and from one another.
The pair proves that a future adapter needs an explicit orientation/selected
wall rule; it does not prove such a rule from ordinary ProjectInput fields.

An independent 22317 pair confirms the limited length mapping: longitudinal
`B11=45` equals `B7=45`, while end-wall `B11=12` equals `B6=12`. In the same
pair, `B12` is `6.8` for the longitudinal wall and `7.4` for the end wall,
despite global `B8=7.4`; therefore this evidence still does not authorize a
generic height substitution or a universal `B13` mapping.

The source labels are explicit: `Лист1!A11` is `Длина`, `Лист1!A12` is
`Высота`, and `Лист1!A13` is `Шаг стоек`. These are manual calculation-wall
controls, not hidden derived cells.

The Kargaleyka pair repeats the same length rule (`B11=30` for the 30 m side,
`B11=12` for the 12 m end), but changes the independent controls to
`B12=4.8/B13=6` and `B12=6.5/B13=4`. This is additional evidence against
automatic height or frame-step substitution.
