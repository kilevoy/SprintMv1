# Girt catalog source evidence

`STATUS = PROVEN for catalog fields and ordering; runtime import remains blocked`

## Source

- repository: `insicomet/SprintM`
- branch: `claude/start-session-l3r43f`
- commit: `7920b45979ed25e608310be6996ee63dfe680a5a`
- artifact: `src/data/girtBearingCatalog.json`
- declared source workbook/range: `Калькулятор ограждайки v1.5.xlsx`, `A1:U636`

The authoritative workbook contains the full `несушки` catalog. The source
columns are:

```text
I type of section
J раскреп
K thickness
L profile height
M default utilization coefficient
N material
O insulation thickness
P profile
Q raw moment expression
R Pred M
S mass of 1 m profile
T mass of 1 m section
U mass of node assemblies
```

The evidence dataset preserves 632 ordered rows and the source distinction
between profile mass and section mass. For `[]` and `][`, `T` is observed as
`S*2`; for `[-]`, `T` contains an additional source assembly term. A second
unconditional `×2` is therefore prohibited.

Runtime selectors must preserve material grade, section type, and source row
provenance. The evidence JSON remains non-runtime.
