# Sprint M — CORE 1 PURLIN_DECK_GAP

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
