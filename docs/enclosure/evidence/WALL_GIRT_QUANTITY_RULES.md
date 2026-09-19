# Wall-girt quantity rules

`STATUS = LEGACY_PROVEN for restricted manual replay; extras remain PARTIAL`

## Authoritative formulas

Source: `Калькулятор ограждайки v1.5.xlsx`, `Лист1!F49:I50,K49:K50`.

```text
rows = CEILING(wallHeight_mm / girtStep_mm)
       + IF(sectionType IN ["[]", "][", "[-]"], 0, 1)
corner brackets = rows × zoneLength / postStep
typical brackets = CEILING(rows × ROUND(zoneLength / postStep, 1), 1)
profile length = rows × zoneLength
profile mass = profile length × selected section mass per metre
```

The corner and typical bracket formulas are different. `Лист1!I49:I50`
look up the selected section mass from `Расчет Угловая!Z7:Z870`; they do not
multiply a single-profile mass by two unconditionally.

At wall height 6.0, 6.01, and 5.99 m with step 1.5 m, the ceiling term is 4
at all three values. The exact source formula therefore gives 4 rows for
`[]`, `][`, `[-]`, and 5 rows for `]`.

## Scope

```text
MANUAL_WALL_GIRT_REPLAY = explicit gross zone, profile, section type and step;
                          no opening interaction
IMPLEMENTATION_ALLOWED = YES for this restricted slice
AUTO_WALL_GIRT_SELECTION = NO
```

The source formulas do not by themselves close opening zoning, upper/lower
member takeoff, price, or automatic profile-selection semantics.

Audit fixtures:
`docs/enclosure/evidence/fixtures/wall-girt-manual-replay-fixtures.json`.
