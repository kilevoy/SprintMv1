# Girt capacity branches

`STATUS = PROVEN for observed numeric workbook formulas; semantic naming remains UNKNOWN`

## Authoritative formulas

The primary workbook confirms:

```text
несушки!N2 = 0.55
несушки!N4 = 1.1
несушки!Q123 = Q9*$N$4
несушки!Q159 = Q45*$N$4
несушки!R9 = Q9*IF(Лист1!$B$32=0,'Расчет Угловая'!O11,Лист1!$B$32)
             *IF(K9=1,$N$2,1)
```

The workbook therefore proves the observed 0.55 thickness-1 factor and the
1.1 relationship used by the relevant MP390 rows. The raw moment expressions
are stored in `несушки!Q`; predicted moment is `R`.

The neutral labels `sectionType`, `material`, and source row/block must be
preserved. The workbook does not prove that a future production field should
be named `capacityBranch`, so engineering branch semantics remain `UNKNOWN`.

```text
GIRT_RAW_MOMENT_RULE = PROVEN for stored Q expressions
GIRT_CAPACITY_BRANCH_NUMERIC_RULE = PROVEN for observed formulas
GIRT_CAPACITY_BRANCH_SEMANTICS = UNKNOWN
AUTO_CAPACITY_BRANCH_SELECTION = BLOCKED
```
