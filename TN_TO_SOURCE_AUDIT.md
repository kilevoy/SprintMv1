# TN/TO source audit

## Scope

Source: `C:\Users\Deako\Downloads\Калькулятор ограждайки v1.5.xlsx`.
SHA-256: `4A9343A1E3149954DEC0F91D5398528F18016A8423EC204CE2B92A59F612DEAF`.

The audit covers both `Расчет Угловая` and `Расчет Рядовая`. No workbook or
production runtime file was changed.

## Proven formulas

The two sheets use the same TN/TO pattern for candidate row `r`:

```excel
TN[r] = TO[r]
TO[r] = Y[r]
```

`Y` is labelled `Масса 1м профиля, кг`; `Z` is `Масса 1м сечения, кг`.
Examples:

| Sheet | Row | TN | TO | Y | Cached TN/TO |
|---|---:|---|---|---|---:|
| `Расчет Угловая` | 7 | `=TO7` | `=Y7` | `1.5106` | `1.5106` |
| `Расчет Угловая` | 639 | `=TO639` | `=Y639` | `1.5106` | `1.5106` |
| `Расчет Рядовая` | 7 | `=TO7` | `=Y7` | `1.5106` | `1.5106` |
| `Расчет Рядовая` | 639 | `=TO639` | `=Y639` | `1.5106` | `1.5106` |

The direct candidate objective is repeated across `TQ:ADE` for candidate rows
7:870. Its relevant formula is:

```excel
=IF(JW[r]=0,999999999,
    TQ$4*$Z[r]
    +$TO[r]*Лист1!$B$13
    +TQ$3*$AA[r]
    +$G[r]/1000000
    -TQ$2/1000000000
    +$TN[r]*Лист1!$B$13
    +$T[r])
```

Therefore the proven calculation role is:

- `TN` and `TO` are per-metre profile-mass fields (`kg/m`) used in two
  separately named objective terms; the header labels call them `масса
  верхнего ригеля` and `масса нижнего ригеля`;
- each is multiplied by `Лист1!B13` in that objective;
- `T` is a separate additional-member mass term and is zero for `Без стоек`;
- `JW=0` disables the candidate by returning `999999999`, but does not erase
  or deactivate the TN/TO formulas themselves.

No direct final BOM quantity or final physical member length is defined by TN
or TO. The formulas prove their objective role and the header labels, but do
not prove the physical geometry or final aggregation of an upper/lower member.

## Dependency chain

`TN → TO → Y → candidate profile mass`

`TN/TO → TQ:ADE candidate objectives → minimum/selection machinery`.

The TN/TO formulas do not directly reference city, climate, responsibility,
opening fields, or a manual selector. Their candidate validity is controlled
downstream through `JW` (including `S`, capacity and other candidate gates).

## Status

| Item | Status | Boundary |
|---|---|---|
| TN semantics | `PROVEN` | `kg/m`, first named mass term in objective; physical member not proven |
| TN condition | `PARTIAL` | validity is downstream in `JW`; TN itself has no IF gate |
| TN quantity | `NOT_A_QUANTITY_FIELD` | no count formula exists |
| TN length | `PROVEN_FOR_OBJECTIVE_ONLY` | objective multiplies by `B13`; physical member length unknown |
| TN mass | `PROVEN_FOR_OBJECTIVE_ONLY` | `TN × B13` contribution |
| TO semantics | `PROVEN` | `kg/m`, second named mass term in objective; physical member not proven |
| TO condition | `PARTIAL` | same `JW` boundary |
| TO quantity | `NOT_A_QUANTITY_FIELD` | no count formula exists |
| TO length | `PROVEN_FOR_OBJECTIVE_ONLY` | objective multiplies by `B13`; physical member length unknown |
| TO mass | `PROVEN_FOR_OBJECTIVE_ONLY` | `TO × B13` contribution |

## Implementation decision

Do not implement TN/TO as standalone enclosure output quantities. Preserve them
as candidate-objective inputs until a source workbook proves the selected
candidate and final output aggregation.

## Superseded findings

Previous interpretation: `TN/TO = upper/lower extra girts` and
`UPPER_LOWER_EXTRA_GIRTS = PARTIAL`.

New source evidence: `TN=TO=Y`, `Y` is explicitly `Масса 1м профиля, кг`, and
the fields occur in the objective as `TN×B13` and `TO×B13`. The headers name the
two terms as upper/lower girt mass, but no independent geometry or final-BOM
chain proves those are physical extra-girt members.

Replacement interpretation: `TN/TO = two upper/lower-labelled kg/m fields in
the candidate objective; physical semantics and final aggregation UNKNOWN`.
The old physical assertion is `SUPERSEDED`; the formula role remains proven.
