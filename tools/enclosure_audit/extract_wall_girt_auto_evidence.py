"""Extract source-backed no-stud wall-girt evidence from the authoritative XLSX.

This is an audit tool only. It deliberately writes an evidence dataset with
formula text and cached values; it does not implement or call the production
AUTO selector.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"C:\Users\Deako\Downloads\Калькулятор ограждайки v1.5 (1).xlsx"
)
OUTPUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(
    "src/enclosure/evidence-data/wall-girt-auto-no-stud-candidates.json"
)


def column_number(column: str) -> int:
    result = 0
    for char in column:
        result = result * 26 + ord(char) - ord("A") + 1
    return result


def column_name(number: int) -> str:
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(ord("A") + remainder) + result
    return result


def text_value(cell: ET.Element | None, shared_strings: list[str]) -> str | None:
    if cell is None:
        return None
    value = cell.find("m:v", NS)
    if value is None:
        if cell.attrib.get("t") == "inlineStr":
            return "".join((text.text or "") for text in cell.findall(".//m:t", NS))
        return None
    raw = value.text
    if cell.attrib.get("t") == "s" and raw is not None:
        return shared_strings[int(raw)]
    return raw


def number_value(value: str | None) -> float | int | str | None:
    if value is None:
        return None
    try:
        number = float(value)
    except ValueError:
        return value
    return int(number) if number.is_integer() else number


def load_sheet(archive: zipfile.ZipFile, sheet_number: int) -> dict[str, ET.Element]:
    root = ET.fromstring(archive.read(f"xl/worksheets/sheet{sheet_number}.xml"))
    return {
        cell.attrib["r"]: cell
        for cell in root.findall(".//m:sheetData/m:row/m:c", NS)
    }


def cell_evidence(
    cells: dict[str, ET.Element],
    ref: str,
    shared_strings: list[str],
) -> dict[str, object | None]:
    cell = cells.get(ref)
    formula = cell.find("m:f", NS) if cell is not None else None
    cached = text_value(cell, shared_strings)
    return {
        "cached_value": number_value(cached),
        "formula": formula.text if formula is not None else None,
        "type": cell.attrib.get("t") if cell is not None else None,
    }


def normalized_formula(formula: str | None) -> str | None:
    if formula is None:
        return None
    return re.sub(r"(?<=[A-Z])\d+", "{row}", formula)


def main() -> None:
    sha256 = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    with zipfile.ZipFile(SOURCE) as archive:
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        shared_strings = [
            "".join((text.text or "") for text in item.findall(".//m:t", NS))
            for item in shared_root.findall("m:si", NS)
        ]

        branches = []
        for sheet_number, branch in ((2, "corner"), (3, "typical")):
            cells = load_sheet(archive, sheet_number)
            rows = []
            for row_number in range(7, 639):
                fields = {
                    column: cell_evidence(
                        cells, f"{column}{row_number}", shared_strings
                    )
                    for column in (
                        "G",
                        "H",
                        "I",
                        "J",
                        "K",
                        "L",
                        "M",
                        "N",
                        "O",
                        "P",
                        "Q",
                        "R",
                        "S",
                        "T",
                        "U",
                        "V",
                        "W",
                        "X",
                        "Y",
                        "Z",
                        "AA",
                        "TN",
                        "TO",
                    )
                }
                r_value = fields["R"]["cached_value"]
                if r_value not in (1, 1.0, "1"):
                    raise RuntimeError(
                        f"restricted no-stud range contains non-R=true row: {branch}!{row_number}"
                    )
                rows.append({"source_row": row_number, "fields": fields})

            step_axis = [
                number_value(
                    text_value(cells.get(f"{column_name(column)}2"), shared_strings)
                )
                for column in range(column_number("TQ"), column_number("ADG") + 1)
            ]
            jw_formula = cells["JW7"].find("m:f", NS).text
            objective_formula = cells["TQ7"].find("m:f", NS).text
            branches.append(
                {
                    "branch": branch,
                    "sheet": "Расчет Угловая" if branch == "corner" else "Расчет Рядовая",
                    "sheet_number": sheet_number,
                    "source_rows": rows,
                    "row_range": "7:638",
                    "row_count": len(rows),
                    "step_axis_mm": step_axis,
                    "step_axis_range": "TQ2:ADG2",
                    "raw_objective_range": "TQ7:ADG638",
                    "jw_range": "JW7:TM638",
                    "representative_formula_templates": {
                        "JW": normalized_formula(jw_formula),
                        "objective": normalized_formula(objective_formula),
                    },
                    "selection_cache": {
                        "rank_cell": "AWW7",
                        "sorted_objective_range": "AWX7:BGN7",
                        "minimum_cell": "BGQ7",
                        "selected_step_cell": "BGS7",
                        "selected_designation_cell": "BGT7",
                        "selected_material_cell": "BGU7",
                        "cached_values": {
                            "minimum": number_value(text_value(cells["BGQ7"], shared_strings)),
                            "step_mm": number_value(text_value(cells["BGS7"], shared_strings)),
                            "designation": text_value(cells["BGT7"], shared_strings),
                            "material": text_value(cells["BGU7"], shared_strings),
                        },
                    },
                }
            )

        payload = {
            "evidence_only": True,
            "runtime_imported": False,
            "source_workbook": SOURCE.name,
            "source_sha256": sha256,
            "source_recalculation": "cached XML values; no fresh Excel recalc",
            "scope": {
                "candidate_rows": "7:638",
                "candidate_count_per_branch": 632,
                "restricted_branch": "R=TRUE / no-stud",
                "excluded_rows": "639:870 / R=FALSE plus-stud branch",
            },
            "formula_model": {
                "jw_formula": "IF(step eligibility AND candidate gates AND utilization<=1,1,0)",
                "objective_formula": "IF(JW=0,999999999, step_count*Z + TO*B13 + step_count*AA + G/1000000 - step/1000000000 + TN*B13 + T)",
                "note": "Exact formula text is preserved in each branch representative_formula_templates and source fields.",
            },
            "branches": branches,
        }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT), "sha256": sha256, "branches": [b["row_count"] for b in branches]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
