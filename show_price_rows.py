import json, zipfile
from pathlib import Path
from analyze_price_xml import shared_strings, sheet_map, parse_sheet

for p in [
    Path(r"E:\SprintMv1\input_price_review\Прайс для предрасчетов (не изменять) — 23092026.xlsx"),
    Path(r"E:\SprintMv1\input_price_review\ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx"),
]:
    with zipfile.ZipFile(p) as z:
        ss = shared_strings(z)
        name, target = sheet_map(z)[0]
        cells, formulas, maxr, maxc = parse_sheet(z, target, ss)
        rows = []
        for r in range(1, 21):
            rows.append([cells.get((r, c)) for c in range(1, 11)])
    print(json.dumps({"file": p.name, "sheet": name, "rows": rows}, ensure_ascii=False, indent=2))
