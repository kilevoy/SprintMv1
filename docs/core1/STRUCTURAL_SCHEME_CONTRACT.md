# Core 1 structural scheme contract

`ProjectInput.construction_scheme` is the explicit user/project selector for
these proven legacy Sprint structural branches:

- `SPRINT` — ordinary Sprint branch;
- `SPRINT_WITH_TIE` — Sprint branch with the historical tie construction.

The names `ПГС-сигма` and `ПГС-S` are retained as raw workbook labels. They
may be aliases of one profile family, but they are not a safe branch selector:
the two branches also change frame step, frame count, beam formulas, purlin
quantities, secondary steel formulas, and price/mass paths.

Older saved project files may omit `construction_scheme`; the compatibility
default is `SPRINT`. New inputs should set it explicitly.

This contract does not yet implement the `SPRINT_WITH_TIE` engineering
formulas. Until its calculation branch is ported and proven, the field is
proven input/provenance state only.