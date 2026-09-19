import csv
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import pytest


CORE1_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = CORE1_DIR.parent
DATA_MANIFEST = json.loads((CORE1_DIR / "data" / "manifest.json").read_text(encoding="utf-8"))
WORKBOOK = REPO_DIR / DATA_MANIFEST["source_workbook"]
NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def _col_number(text):
    value = 0
    for char in text:
        value = value * 26 + ord(char) - 64
    return value


def _cell_sort_key(address):
    match = re.fullmatch(r"([A-Z]+)([0-9]+)", address)
    return int(match.group(2)), _col_number(match.group(1))


def _scalar(raw, cell_type, shared_strings):
    if raw is None:
        return None
    if cell_type == "s":
        return shared_strings[int(raw)]
    if cell_type == "b":
        return raw == "1"
    if cell_type in {"str", "e", "d"}:
        return raw
    try:
        number = float(raw)
        return int(number) if number.is_integer() else number
    except ValueError:
        return raw


@pytest.fixture(scope="session")
def workbook_cells():
    with zipfile.ZipFile(WORKBOOK) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS):
                shared_strings.append("".join(node.text or "" for node in item.iter(f"{{{NS['m']}}}t")))

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relations = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relations}
        paths = {}
        for sheet in workbook.find("m:sheets", NS):
            target = targets[sheet.attrib[f"{{{NS['r']}}}id"]].lstrip("/")
            paths[sheet.attrib["name"]] = target if target.startswith("xl/") else f"xl/{target}"

        result = {}
        for name, path in paths.items():
            root = ET.fromstring(archive.read(path))
            cells = {}
            for node in root.findall(".//m:c", NS):
                address = node.attrib["r"]
                cell_type = node.attrib.get("t", "n")
                formula_node = node.find("m:f", NS)
                value_node = node.find("m:v", NS)
                inline_node = node.find("m:is", NS)
                if inline_node is not None:
                    cached = "".join(part.text or "" for part in inline_node.iter(f"{{{NS['m']}}}t"))
                else:
                    cached = _scalar(value_node.text if value_node is not None else None, cell_type, shared_strings)
                formula = None
                if formula_node is not None:
                    formula = {
                        "text": formula_node.text,
                        "type": formula_node.attrib.get("t"),
                        "shared_index": formula_node.attrib.get("si"),
                        "ref": formula_node.attrib.get("ref"),
                    }
                cells[address] = {"formula": formula, "cached": cached, "cell_type": cell_type}
            result[name] = cells
    return result


def test_source_workbook_checksum():
    actual = hashlib.sha256(WORKBOOK.read_bytes()).hexdigest()
    assert actual == DATA_MANIFEST["source_workbook_sha256"]


def test_dataset_manifest_totals():
    datasets = DATA_MANIFEST["datasets"]
    assert DATA_MANIFEST["dataset_count"] == len(datasets)
    assert DATA_MANIFEST["record_count"] == sum(item["record_count"] for item in datasets)


@pytest.mark.parametrize("dataset", DATA_MANIFEST["datasets"], ids=lambda item: item["id"])
def test_exported_dataset_matches_xlsx(dataset, workbook_cells):
    path = CORE1_DIR / dataset["path"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == dataset["file_sha256"]
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == dataset["record_count"]
    source = workbook_cells[dataset["source_sheet"]]
    for row in rows:
        actual = source.get(row["cell"], {"formula": None, "cached": None, "cell_type": "n"})
        assert row["schema_version"] == dataset["schema_version"]
        assert row["source_workbook"] == dataset["source_workbook"]
        assert row["source_workbook_sha256"] == dataset["source_workbook_sha256"]
        assert row["source_sheet"] == dataset["source_sheet"]
        assert row["source_range"] == dataset["source_range"]
        assert row["extraction_date"] == dataset["extraction_date"]
        assert json.loads(row["formula_json"]) == actual["formula"]
        assert json.loads(row["cached_value_json"]) == actual["cached"]
        assert row["cell_data_type"] == actual["cell_type"]


def test_schemas_and_fixture_manifest_are_machine_readable():
    schema_files = sorted((CORE1_DIR / "schemas").glob("*.schema.json"))
    assert {path.name for path in schema_files} == {
        "Core1Diagnostic.schema.json",
        "Core1Input.schema.json",
        "Core1Result.schema.json",
    }
    for path in schema_files:
        assert json.loads(path.read_text(encoding="utf-8"))["$schema"].endswith("2020-12/schema")

    fixture_manifest = json.loads((CORE1_DIR / "fixtures" / "manifest.json").read_text(encoding="utf-8"))
    for fixture in fixture_manifest["fixtures"]:
        assert (CORE1_DIR / "fixtures" / fixture["input_file"]).is_file()
        assert (CORE1_DIR / "fixtures" / fixture["expected_file"]).is_file()


def test_legacy_connection_lookup_dataset_contract():
    path = CORE1_DIR / "data" / "legacy_connections" / "connection_lookup_rows.json"
    dataset = json.loads(path.read_text(encoding="utf-8"))
    assert dataset["schemaVersion"] == 1
    assert dataset["classification"] == "LEGACY_CONNECTION_MODEL_COMPLETE"
    assert dataset["source"]["sha256"] == DATA_MANIFEST["source_workbook_sha256"]
    assert dataset["statistics"] == {
        "rowCount": 599,
        "row14Count": 299,
        "row15Count": 300,
        "sharedEqualKeys": 299,
        "anomalyCount": 3,
    }
    rows = dataset["rows"]
    keys = {
        (row["designFamily"], row["candidate"], row["factor"], row["heightBandM"], row["branchKey"])
        for row in rows
    }
    assert len(keys) == len(rows) == 599

    expected = {
        (15, "ROW14", 1.0, 4.8, "4/1"): (276, 238, "8х2", "9х2", "7х2", "10х2"),
        (18, "ROW14", 0.8, 4.8, "4/1"): (308, 264, "10х2", "10х2", "7х2", "10х2"),
        (12, "ROW14", 0.8, 4.8, "4/3"): (276, 233, "8х2", "9х2", "7х2", "9х2"),
        (12, "ROW15", 0.8, 4.8, "3/2"): (260, 223, "8х2", "9х2", "6х2", "8х2"),
    }
    by_key = {
        (row["designFamily"], row["candidate"], row["factor"], row["heightBandM"], row["branchKey"]): row
        for row in rows
    }
    for key, values in expected.items():
        row = by_key[key]
        assert (
            row["ridgeBeamBoltQuantity"],
            row["fittingsWeightKg"],
            row["ridgeBeamBoltPattern"],
            row["eaveBeamBoltPattern"],
            row["supportColumnBoltPattern"],
            row["eaveColumnBoltPattern"],
        ) == values

    anomaly_classes = [item["classification"] for item in dataset["anomalies"]]
    assert anomaly_classes.count("LEGACY_LOOKUP_NO_MATCH") == 1
    assert anomaly_classes.count("LEGACY_NON_TEXT_BOLT_PATTERN") == 2
