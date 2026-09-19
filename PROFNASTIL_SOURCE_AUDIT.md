# Profnastil / Cladding + Fastener Source Audit

## Source and scope

Authoritative source inspected read-only:

```text
Калькулятор ограждайки v1.5.xlsx
SHA-256 = 4A9343A1E3149954DEC0F91D5398528F18016A8423EC204CE2B92A59F612DEAF
```

Sheets:

```text
Лист1
Расчет Угловая
Расчет Рядовая
несушки
Ветер по СП
Ветер по EN
```

The workbook contains two external links, both climate/normative lookup
sources. No external cladding or fastener price/area workbook is linked by the
authoritative book.

## Classification

The workbook is a structural wall-girt / profile-selection calculator. It
contains a material/profile selector input and a profile catalog used by the
structural branches, but it does not contain a cladding BOM or fastener
quantity model.

```text
WALL_PROFNASTIL_AREA_RULE = UNKNOWN
ROOF_PROFNASTIL_AREA_RULE = UNKNOWN
WALL_PROFNASTIL_QUANTITY_RULE = UNKNOWN
ROOF_PROFNASTIL_QUANTITY_RULE = UNKNOWN
WALL_FASTENER_RULE = UNKNOWN
ROOF_FASTENER_RULE = UNKNOWN
WALL_PROFNASTIL_OPENING_DEDUCTION = UNKNOWN
ROOF_PROFNASTIL_OPENING_INTERACTION = UNKNOWN
COLD_PROFNASTIL_BRANCH = PARTIAL
WARM_ENCLOSURE_BRANCH = UNKNOWN
```

`PARTIAL` for the cold branch means only that the structural book exposes the
literal input `профлист` and profiled-sheet candidates. It does not prove an
area or procurement calculation.

## Relevant source cells

| Sheet | Cell | Label / formula | Cached value | Direct precedents | Semantics | Status |
|---|---|---|---|---|---|---|
| `Лист1` | `B18` | `конструкция покрытия` / literal input | `профлист` | none | covering/material selector entering the structural workbook | `DIRECT_SOURCE`, no cladding quantity |
| `Лист1` | `B19` | `Профлист` / literal input | `С18-1150-0,5` | none | selected profile mark used by structural auxiliary branches | `DIRECT_SOURCE`, no cladding quantity |
| `Лист1` | `P87:P92` | candidate profile marks | `С44-1000-0,5`, `С44-1000-0,7`, `Н60-845-0,7`, `Н60-845-0,8`, `С18-1150-0,5`, `С18-1150-0,7` | none | profile candidate catalog | `DIRECT_SOURCE`, catalog only |
| `Лист1` | `K87:K92` | `=IF($B$19=$P$87,$O$87,IF(...))` | `1..6` | `B19`, `P87:P92`, `O87:O92` | selected profile index / auxiliary branch value | `DERIVED`, not area |
| `Лист1` | `B22` | `Макс. шаг` | `0` | manual input | wall-girt step override input | `DIRECT_SOURCE`, not cladding area |
| `Лист1` | `B24` | `=IF(B22=0,INDEX(B109:B158,MATCH(E22,N109:N158,-1),1),B22)` | `1500` | `B22`, `E22`, `B109:B158`, `N109:N158` | automatic corner wall-girt step | `DERIVED`, not cladding quantity |
| `Лист1` | `B27` | `Макс. шаг` | `0` | manual input | typical-zone wall-girt step override input | `DIRECT_SOURCE`, not cladding area |
| `Лист1` | `B29` | `=IF(B27=0,INDEX(B109:B158,MATCH(E27,N109:N158,-1),1),B27)` | `1500` | `B27`, `E27`, `B109:B158`, `N109:N158` | automatic typical wall-girt step | `DERIVED`, not cladding quantity |
| `Лист1` | `E24` | `='Расчет Угловая'!C8` | `12` | `Расчет Угловая!C8` | corner-zone length for wall-girt mass | `DERIVED`, not cladding area |
| `Лист1` | `E29` | `='Расчет Рядовая'!C8` | `12` | `Расчет Рядовая!C8` | typical-zone length for wall-girt mass | `DERIVED`, not cladding area |
| `Лист1` | `F49` | `CEILING.MATH($B$12*1000/D49,1)+IF(OR(K49="[]",K49="][",K49="[-]"),0,1)` | `7` | `B12`, `D49`, `K49` | wall-girt row count | `LEGACY_PROVEN`, not sheet area |
| `Лист1` | `I49` | `=F49*E24*INDEX('Расчет Угловая'!Z7:Z870,MATCH(...))` | `448.8288` | `F49`, `E24`, profile lookup | wall-girt profile mass | `LEGACY_PROVEN`, not sheet area |

The `F49/I49` formulas are included to distinguish proven wall-girt logic from
the absent cladding logic. They must not be repurposed as profnastil formulas.

## Search results for cladding and openings

The authoritative workbook contains the literal `профлист` in the selector and
profile-catalog context. It contains no source labels or formulas for:

```text
профнастил
обшивка
площадь
саморез
крепеж / крепёж
ворота
дверь
окно
проем / проём
сэндвич
```

The only `стен` / `кровл` hits describe the structural input and wall-girt
branches, not cladding area or procurement. There is no authoritative cell
whose formula can establish gross wall area, roof slope area, waste, overlap,
or opening deductions.

## Wall area and quantity

No formula equivalent to `2 * (length + span) * height`, nor any alternative
wall-sheet area formula, is present in the authoritative workbook. No opening
deduction branch can be traced because openings are absent from this source
model.

Therefore:

```text
WALL_AREA = UNKNOWN
WALL_PROCUREMENT_QUANTITY = UNKNOWN
WALL_OPENING_DEDUCTION = UNKNOWN
```

The absence of a formula is not evidence for gross-area behavior.

## Roof area and quantity

The workbook has a roof/profile selector (`Лист1!B18:B19`, `P87:P92`) and
structural load inputs, but no roof-sheet area, slope, overlap, waste, or
commercial quantity formula. No roof opening interaction is present.

```text
ROOF_AREA = UNKNOWN
ROOF_PROCUREMENT_QUANTITY = UNKNOWN
ROOF_OPENING_INTERACTION = UNKNOWN
```

## Fasteners

No fastener type, unit, screw size, quantity formula, area basis, or rounding
rule is present. In particular, the workbook does not prove either:

```text
wall screws = wall area * 10
roof screws = roof area * 8
```

Those coefficients remain unverified historical observations and must not be
implemented from this source.

```text
WALL_FASTENER_RULE = UNKNOWN
ROOF_FASTENER_RULE = UNKNOWN
```

## Opening distinction

This source does not contain opening cells at all. Consequently it proves
neither a wall-girt opening rule nor a cladding opening rule:

```text
WALL_GIRT_OPENING_INTERACTION = UNKNOWN
WALL_PROFNASTIL_OPENING_INTERACTION = UNKNOWN
```

These statuses remain independent. Absence of openings in the cladding source
does not justify changing the existing wall-girt status.

## Implementation decision

```text
SAFE_TO_IMPLEMENT_COLD_PROFNASTIL = NO
SAFE_TO_IMPLEMENT_PROFNASTIL_FASTENERS = NO
CORE1_RESULTS_CHANGED = NO
ENCLOSURE_RUNTIME_CHANGED = NO
CORE2_RESULTS_CHANGED = NO
COMMERCIAL_RESULTS_CHANGED = NO
```

The next source required is a dedicated cladding/profnastil calculation or
authoritative BOM workbook containing wall/roof area, profile lengths or sheet
counts, overlap/waste rules, and fastener quantities. No production code is
authorized by this audit.
