# Project wall geometry override contract

The application now exposes `resolveProjectWallGeometry(project, override)` as a guarded bridge from `ProjectInput` to the proven `WallGeometryResolver`.

- `override = null` returns `ENCLOSURE_PROJECT_GEOMETRY_REQUIRED`.
- The resolver never substitutes `span_m`, `building_length_m` or `building_height_m` for B11/B12/B13.
- An explicit override must contain orientation, wall calculation length/height, corner-half length, support step and provenance.
- The override is validated by the existing positive-finite geometry contract and then passed unchanged to the resolver.

This is an explicit audited-input path, not a generic automatic ProjectInput mapping. Automatic mapping remains unsupported until real projects prove how the selected calculation wall is chosen.
