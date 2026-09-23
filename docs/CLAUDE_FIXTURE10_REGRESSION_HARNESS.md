# Claude fixture 10 regression harness

This test-only harness is sourced from `insicomet/SprintM` commit `a24b92823c46b20157e26e0dccdb323a06e34727`, schema `1.2.0`.

It contains only proven scalar geometry and manual frame-step values for ten objects. It does not construct `ProjectInput`, normalize climate or envelope labels, invoke `WallGeometryResolver`, or assert wall-girt, post, opening, or axis-position behavior.

`claudeFixture10FrameCount.test.ts` is explicitly a **FORMULA_PARITY** test. A standalone production frame-count function is not exported by SprintMv1, so the test does not claim APP_FUNCTION_PARITY. It mirrors the current documented expression:

```text
Math.ceil(length_m / frameStep_m) + 1
```

The ten source values produce 10/10 scalar formula matches. The result does not prove invocation of a production frame-count API, frame-axis coordinates, or non-uniform bay placement. The harness exercises `nextDown`, exact boundary, `nextUp`, and practical decimal values for steps `3.4`, `3.5`, and `3.92`; it does not use `Number.EPSILON` as a boundary perturbation.

The boundary tests exercise the test-only formula oracle. Invalid-value tests exercise only a test-only finite-positive validator; they are not evidence of production validation.

Opening data is isolated in `claudeFixture10.openings.raw.json`. Dimensions are retained only for `count > 0`; inactive template dimensions are intentionally omitted. Opening positions remain `UNKNOWN`.

Invalid values are currently classified by the test-only finite-positive predicate. A standalone production typed diagnostic for frame-count input is not exposed; this remains a documented gap and is not manufactured by the harness.
