# Core 2 — horizontal sandwich semantic contract

## Scope

This contract records the owner-confirmed operational default observed in the
archived Sprint M estimates. It does not replace an engineering proof for the
complete sandwich-panel envelope.

## Explicit input

`wallSystem.mountingOrientation` is optional and must be supplied explicitly:

- `HORIZONTAL` — the wall-girt selection branch is skipped for the current
  Core 2 boundary;
- `VERTICAL` — no automatic sandwich wall-girt rule is inferred;
- `UNKNOWN` or omitted — no orientation is inferred from `SANDWICH_PANEL`.

The adapter accepts this value through `mountingOrientation`; it never guesses
it from a product name or from the list of available claddings.

## Result semantics

For `SANDWICH_PANEL + HORIZONTAL`, the wall-girt section returns `EMPTY` with
`knownMass_kg = 0` and diagnostic
`ENCLOSURE_SANDWICH_HORIZONTAL_GIRTS_SKIPPED`. This means only that the
structural PS-girt branch is not selected. It does **not** make sheet, panel,
joint, trim, fastener, opening, or roof quantities known; those remain in the
unknown mass/cost components until their source-backed rules are implemented.

For vertical or unknown orientation, the existing `ENCLOSURE_WALL_GIRT_NOT_PROVEN`
diagnostic remains active. No fallback, nearest rule, or zero substitution is
allowed.

## Evidence boundary

The archive audit in
`docs/enclosure/evidence/SANDWICH_PROJECT_ARCHIVE_AUDIT.md` found zero PS wall
girt quantities in eight sampled insulated Sprint M workbooks. The repeated
pattern supports this operational default, but the sample is not a universal
proof that every sandwich layout needs no secondary support.
