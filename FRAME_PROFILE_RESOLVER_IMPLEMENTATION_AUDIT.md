# Legacy frame profile resolver implementation audit

## Scope

This checkpoint implements the proven legacy profile-selection branch for the
9 m, 12 m and 15 m design families. It does not change the canonical climate
resolver, legacy climate derivation, frame-branch mapping, D8/D9 semantics,
frame count, purlin selection, connections, or the 18/21/24 m profile paths.

## Implemented Excel chain

The resolver reproduces the extracted chain using the frame-family cell
datasets:

```text
legacyClimate.activeSnowFactor + legacyFrameBranch
    -> HZ18 / branch selector cells
    -> IA19 / IB19 / IE19
    -> HZ5 or HZ13 height key (3.6 / 4.8 / 6.0)
    -> IA/IB/IE candidate row
    -> column profile / beam profile / frame mass
```

The branch selector is passed explicitly from the already-proven
`LegacyFrameBranchResolver`; canonical climate values are not rewritten.
Relative Excel shared formulas are evaluated with their row offset preserved,
so a selected row does not accidentally reuse the first cached row's mass.

## Boundary coverage

The resolver has direct regression coverage for all nine boundary scenarios:

| Family | Height band | Beam | Column | Frame mass, kg |
|---:|---:|---|---|---:|
| 9 | 3.0 / 3.8 | ПГС245/20х80х1,5 | ПГС245/20х80х1,5 | 353.56 |
| 9 | 3.81 | ПГС245/20х80х2 | ПГС245/20х80х2 | 427.2 |
| 12 | 3.0 / 3.8 | ПГС245/20х80х2 | ПГС300/20х80х1,5 | 487 |
| 12 | 3.81 | ПГС245/20х80х2 | ПГС300/20х80х2 | 548 |
| 15 | 3.0 / 3.8 | ПГС300/20х80х2,5 | ПГС245/20х80х2 | 715 |
| 15 | 3.81 | ПГС300/20х80х2,5 | ПГС300/20х80х2 | 792 |

## Validation status

- Vitest: 197 passed.
- TypeScript typecheck: passed.
- Production build: passed; existing bundle-size warning only.
- Static-data integrity: 26 passed.
- `git diff --check`: passed.
- Real-project regressions 22318, 22316 and 22329: passed.
- Compatibility control 22326: passed in its existing compatibility scope.

## Classification

`PROVEN_FOR_9_12_15_AUTOMATIC_CITY_LOOKUP`.

The resolver is intentionally not classified as a universal profile selector
for manual climate inputs or for 18/21/24 m. Those domains remain on their
previous proven paths until separately audited.
