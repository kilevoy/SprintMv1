# AUTO wall-girt runtime: implementation boundary

Статус на текущем этапе: `PARTIALLY_PROVEN`.

## Поля, которые уже имеют источник

| Runtime field | Источник | Статус |
|---|---|---|
| `wall` | v1.5 orientation branch | PROVEN |
| `wallCalculationLength_m` | B11 mapping: SIDE → длина здания, END → пролёт | PROVEN для v1.5 |
| `wallCalculationHeight_m` | Лист1!B12 | EXPLICIT CONTROLLER |
| `postStep_m` | Лист1!B13 | EXPLICIT CONTROLLER |
| `cornerHalfLength_m` | explicit `e` controller | EXPLICIT CONTROLLER |
| `buildingHeight_m` | ProjectInput geometry | PROJECT INPUT |
| `terrain` | ProjectInput `other.terrain_type` | PROVEN |
| `responsibility` | ProjectInput `geometry.responsibility_factor` | PROVEN |
| `w0_kPa` | canonical `Core1ClimateResult.wind_load` / v1.5 B17 mapping | PROVEN only after climate resolution |
| `normativeSystem` | ProjectInput climate branch | PROVEN for SP_20 branch |
| `withoutStuds` | v1.5 selector branch | PROVEN only for no-stud domain |

## Поля, которые нельзя пока выводить автоматически

| Runtime field | Причина |
|---|---|
| `insulationThickness_mm` | B18/B11 profile-dependent branch is only partial; wall product mapping is not canonical |
| `profileFamily` | selector groups are extracted, but product semantics are not complete |
| `sectionType` | selector groups are extracted, but full UI/product mapping is not complete |
| `material` | selector groups and legacy labels are partial |
| `minThickness_mm`, `maxThickness_mm` | B35:B36 contain validation-list semantics, not a complete canonical range |
| `minStep_mm`, `maxStep_mm` | override helpers B22/B27/B23/B28 require branch-specific normalization |
| `manualStepMode`, `manualSteps_mm` | explicit override contract is not yet wired to ProjectInput |
| `utilizationOverride` | literal B32 is known, but product-domain ownership is not yet finalized |

## Safe orchestration rule

`calculateProjectV15WallGirt` may calculate an AUTO zone only when every field
above is supplied by an explicit, source-backed runtime contract. The UI must
not derive missing fields from a wall-system string, use the nearest material,
or silently replace an absent value with zero.

Until that contract is complete, the correct result is a typed
`ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED` diagnostic. This is an intentional
compatibility boundary, not a failed calculation.
