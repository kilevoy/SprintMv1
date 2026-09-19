# Girt capacity branches

`STATUS = PARTIAL / NUMERIC STRUCTURE ONLY`

## Observed structure

The imported artifact has multiple section-type branches (`]`, `[]`, `][`,
`[-]`) and preserves them as neutral `capacityBranch` values. The material
grade is preserved independently. This proves that a candidate cannot be
represented only by display profile, mass and one scalar moment.

## Not proven by available artifact

The research branch does not provide the source workbook formulas or an
independent extracted raw-moment column. Therefore the following claims are
not promoted to proven rules:

- exactly 316 capacity pairs;
- `rawMoment upper / rawMoment lower = 1.1`;
- `PredMoment = rawMoment × defaultUtilization × materialCoefficient`;
- engineering meaning of any section-type branch.

The research production code describes these hypotheses and uses reported
`пред_момент`, but production code alone is not accepted as source proof for
this import.

## Classification

```text
CAPACITY_BRANCH_NUMERIC_RULE = PARTIAL
CAPACITY_BRANCH_ENGINEERING_MEANING = UNKNOWN
AUTO_CAPACITY_BRANCH_SELECTION = IMPLEMENTATION_BLOCKED
```
