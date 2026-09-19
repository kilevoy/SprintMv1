# Girt catalog source evidence

`STATUS = PARTIAL`

## Source

- repository: `insicomet/SprintM`
- branch: `claude/start-session-l3r43f`
- commit: `7920b45979ed25e608310be6996ee63dfe680a5a`
- artifact: `src/data/girtBearingCatalog.json`
- declared source workbook: `Калькулятор ограждайки v1.5.xlsx`
- declared source range: `A1:U636`

The artifact contains **632 ordered rows**. It is imported into
`src/enclosure/evidence-data/girt-catalog-observed.json` plus eight ordered
chunk files for evidence review
only. It is not imported by EnclosureCore runtime.

## Observed fields

The artifact preserves profile, family/view, section type, material grade,
thickness, profile height, default utilization coefficient, reported predicted
moment, profile/section mass, node assembly mass, insulation thickness and the
raw `раскреп` flag.

It does not contain explicit `rawMoment`, material coefficient, original
workbook row number, or a field explicitly named `Без стоек`. Those fields are
preserved as `null` in the normalized evidence data rather than inferred.

## Counts observed

```text
rows = 632
section-type values = ] / [] / ][ / [-]
material grades = МП220 / МП350 / МП390
views = ПП / ТПП / ТПС / ПС / ТПГС / ПГССигма
raw раскреп values = true / false
```

## Implementation gate

The catalog data is safe to use as a source-backed candidate dataset only
after the missing source-row semantics and formula provenance are closed.
The normalized artifact is evidence, not a runtime selector.
