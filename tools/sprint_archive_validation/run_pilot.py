from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from .archive_extractor import extract_archive
from .archive_scanner import scan_archive
from .comparator import compare_record
from .config import default_paths
from .report import write_outputs
from .template_replay import replay_one


def main():
    parser = argparse.ArgumentParser(description="Run the Sprint archive validation pilot")
    parser.add_argument("--archive-root", type=Path, required=True)
    parser.add_argument("--master-template", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    records = []
    scanned = scan_archive(args.archive_root, source_selection_only=True)
    for scan_record in scanned:
        print(f"Extracting {scan_record['project_id']}: {scan_record['source_file']}", flush=True)
        record = extract_archive(scan_record)
        if not record.get("parse_error"):
            print(f"Replaying {scan_record['project_id']} in Microsoft Excel", flush=True)
            replay = replay_one(args.master_template, record, args.output_dir / "replay_work")
            record.update(replay)
            record["replay_errors"] = replay.get("errors", [])
        else:
            record["replay"] = {}
            record["replay_error"] = None
            record["replay_errors"] = []
        record = compare_record(record)
        records.append(record)
    payload = write_outputs(records, args.output_dir)
    (args.output_dir / "pilot_records.json").write_text(json.dumps(records, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    builder = Path(__file__).with_name("build_database.mjs")
    node = Path(r"C:\Users\Deako\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
    if not builder.exists():
        raise FileNotFoundError(builder)
    subprocess.run([str(node), str(builder), str(args.output_dir)], check=True)
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
