# Archive extraction schema

One record represents one unique source-selection workbook after SHA-256
deduplication. `source_file`, `source_folder`, `source_file_sha256`, and
`source_modified_date` provide traceability.

All user inputs are read from `вывод!D2:D67` at the explicit addresses in
`config.py`. Archive outputs are read from fixed cells in the same map plus the
selected branch of `подбор!G14:G15` and `H14:H15`. Canonical climate loads come
from the exact city row in `снегветер!F:I`; displayed regions remain separately
captured from `вывод!D16:D17`.

Each record stores a `provenance` map with `sheet!cell` references. Missing
fields remain `null`, and fields without a proved source are explicitly marked
in the generated report.
