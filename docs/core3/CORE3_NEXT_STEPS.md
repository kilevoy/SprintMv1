# Core 3 continuation plan

## Checkpoint

Current branch: `checkpoint/22318-purlin-audit`.

Core 3 currently has a proven commercial path for cold profiled-sheet
enclosures. Known lines include profiled sheet, trims, fasteners, corner
angles, wall-girts, wall-girt brackets, roof purlins, and the observed gable
frame PGS labels for projects 22318, 22316 and 22329.

Every line keeps an explicit status: `KNOWN_COST`, `UNKNOWN_COST`, or
`UNSUPPORTED`. No fuzzy profile matching or silent fallback is allowed.

## Next goals

1. **Secondary steel quantity audit**
   - extract the active commercial BOM rows for ties, bracing, spacers,
     gable posts, plates and bolts;
   - record formulas, units, cached values and source cells for 22318, 22316
     and 22329;
   - separate commercial BOM quantities from Core 1 D68/D69 structural masses.

2. **Secondary price resolver**
   - map only exact profile/code rows in the full 1C catalogue;
   - preserve workbook SHA, sheet, row, unit, price and effective date;
   - return typed diagnostics for missing quantity or ambiguous nomenclature.

3. **End-to-end commercial fixtures**
   - connect ProjectInput → Core1 → Core2 → Core3 for the three real projects;
   - assert that D68, D69 and all Core1/Core2 engineering quantities are
     unchanged;
   - assert known totals and unknown components separately.

4. **Commercial reconciliation**
   - compare Core3 line totals against archived workbook BOM totals;
   - document intentional differences caused by price-version changes;
   - do not change engineering formulas to fit a commercial total.

5. **UI verification**
   - show known total, unknown components, line source and diagnostics;
   - keep unsupported sandwich/opening paths explicit until proven.

## Home continuation commands

```powershell
cd E:\SprintMv1
git switch checkpoint/22318-purlin-audit
git pull --ff-only origin checkpoint/22318-purlin-audit
git status
git log -1 --oneline
```

Then start with the secondary audit. Do not modify XLSX or Core 1:

```powershell
rg -n "secondary|ties|bracing|spacer|gable|профили|Связи|Распорки" docs src input_price_review
```

For each new source formula, add an evidence document and a focused test
before connecting a price line. Run the full quality gate before any future
commit:

```powershell
npm test
npm run typecheck
npm run build
py -m pytest core1/tests/test_static_data_integrity.py
git diff --check
```

Do not use `git add -A`: exclude `tmp/`, `_tmp_*`, generated analysis scripts,
XLSX/PDF files and unrelated documents. Commit only the reviewed Core 3 code,
datasets, tests and evidence.
