# WallGeometryResolver — Phase 2 boundary

This phase implements only the explicit, source-proven zone geometry formula.

Inputs must already contain an evidence-backed wall calculation length,
wall calculation height, explicit corner half-length (`B7`), and support/post
step. The resolver computes:

```text
cornerZoneLength = 2 * IF(cornerHalfLength / supportStep < 0.5,
                           0,
                           CEILING(cornerHalfLength / supportStep, 1) * supportStep)
typicalZoneLength = MAX(0, length - cornerZoneLength)
```

This is the reconstruction of `Расчет Угловая!C8` and the proven typical-zone
subtraction path. It preserves the explicit `SIDE`/`END` orientation.

It intentionally does **not** infer:

- side/end wall height from `ProjectInput.geometry.building_height_m`;
- end-wall height from ridge geometry;
- B11/B12/B13 automatically;
- non-uniform frame or gable support positions;
- roof slope, eave datum, or ridge height.

Those mappings remain `PARTIAL`/`UNKNOWN` in
`docs/enclosure/evidence/wall-geometry-resolver-map.json`. Automatic
ProjectInput wiring is therefore not part of this phase.
