# Sprint M — CORE 1 PURLIN_DECK_GAP

## Current execution overlay — proven legacy climate/frame pipeline

Objective: connect the proven canonical-climate → legacy-derived-climate → legacy-frame-branch chain without changing canonical climate semantics or source XLSX files.

Milestones:

1. **L1 — Static legacy datasets** `[x]`
   - Preserve roof correction rows, ordered `AB5:AH58`, and `AJ11 → V7` rows including duplicate keys and text/error rows.
2. **L2 — Excel MATCH compatibility** `[x]`
   - Characterize the exact approximate binary lookup behavior against Excel COM and encode regression cases.
3. **L3 — Runtime pipeline** `[x]`
   - Add `LegacyClimateDeriver` and `LegacyFrameBranchResolver`; keep canonical `ClimateResolver` unchanged; pass mapped branch to `FrameSelector`.
4. **L4 — Real-project verification** `[~]`
   - Protect 22318 and 22316, rerun 22329, and stop at the next first divergence rather than repairing downstream logic.

Definition of done for this overlay: legacy branch datasets and matcher are characterized, 22318/22316 remain exact, 22329 beam parity is restored, and the next unresolved divergence is reported.

## Objective

Close the proven legacy chain `roof_deck_grade -> deck lookup -> maximum purlin step -> purlin selection` without changing source XLSX files or beginning Core 2.

## Milestones

1. **M1 — Source mapping**
   - Reuse the completed `CORE1_ROOF_INPUT_AUDIT.md`.
   - Bind the local deck matrix and the audited `вывод!W11:W63` step axis.
   - Preserve typed legacy `#REF!` behavior for 500 mm.
2. **M2 — Runtime closure**
   - Implement exact deck-key/header lookup and Excel-compatible descending lookup.
   - Apply deck limit, configured/manual inputs, minimum step, and deterministic purlin selection.
   - Expose trace fields needed for verification.
3. **M3 — Verification and docs**
   - Add Scenario A/B, baseline, parameterized deck, unknown-deck, determinism, and trace tests.
   - Run the requested quality gates.
   - Update the audit and Core 1 README with the closed status.
4. **M4 — Repository integrity and UI refinement**
   - `[x]` Diagnose exact static dataset byte mismatch before touching UI.
   - `[x]` Add dataset line-ending policy and restore only affected bytes from `HEAD`.
   - `[x]` Add local city autocomplete and explicit climate status.
   - `[x]` Refine roof/deck and wall inputs without changing Core 1 wall semantics.
   - `[x]` Expose safe purlin deck/step result context and add UI regression tests.
5. **M5 — ProjectInput architecture**
   - `[x]` Introduce one domain-level ProjectInput for the UI.
   - `[x]` Add explicit Core1InputAdapter and preserve Core1Input semantics.
   - `[x]` Replace legacy opening counters with stable-ID detailed opening records.
   - `[x]` Add dynamic gate, door, window, and strip-window editing.
   - `[x]` Document the Core 1/Core 2 adapter boundary and unresolved gate dimension proof.

## Constraints

- Do not edit XLSX files.
- Do not invent a structural formula or silently replace legacy values.
- Do not implement Core 2, UI redesign, commit, or push.
- For this phase, UI changes are limited to presentation/state; do not alter proven Core 1 engineering formulas.
