# Wall-girt quantity rules

`STATUS = PARTIAL`

The research branch contains a wall-girt implementation and comments naming
the source workbook and cells (`Лист1!B49:K51`). That is useful hypothesis and
provenance lead, but the source workbook itself was not present in the cloned
research branch, so the formula is not promoted to immediate implementation
evidence here.

Candidate rules requiring source closure:

```text
rows = CEILING(wallHeight_mm / girtStep_mm) + section correction
corner brackets = rows × zoneLength / postStep
typical brackets = CEILING(rows × ROUND(zoneLength / postStep, 1))
profile length = rows × zoneLength
profile mass = profile length × section mass per metre
```
The research code reports a real-project check for Благовещенск and a source
hash, but no independent workbook artifact is available in this import. The
rules remain `PARTIAL`; bracket price is explicitly `UNKNOWN`.

```text
MANUAL_WALL_GIRT_REPLAY = candidate smallest slice
IMPLEMENTATION_ALLOWED = NO until workbook/formula evidence is imported
AUTO_WALL_GIRT_SELECTION = NO
```
