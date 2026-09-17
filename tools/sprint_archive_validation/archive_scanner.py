from __future__ import annotations

import hashlib
import json
from pathlib import Path


EXCLUDE_TOKENS = ("великан", "рск", "атлант")
KNOWN_REFERENCE_IDS = {"22318", "22316", "22329", "22326"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _preliminary_sprint(path: Path) -> bool:
    text = str(path).lower()
    if any(token in text for token in EXCLUDE_TOKENS) and "спринт" not in text:
        return False
    return "спринт" in text or "source_selection" in path.stem.lower() or path.stem.isdigit()


def _load_manifest(root: Path) -> dict:
    manifest_path = root / "source_manifest.json"
    if not manifest_path.exists():
        return {}
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def scan_archive(root: Path, source_selection_only: bool = True) -> list[dict]:
    seen = set()
    records = []
    manifest = _load_manifest(root)
    for path in sorted(root.rglob("*.xlsx")):
        if path.name.startswith("~$"):
            continue
        if source_selection_only and not path.stem.lower().endswith("_source_selection"):
            continue
        if not _preliminary_sprint(path):
            continue
        file_hash = sha256(path)
        if file_hash in seen:
            continue
        seen.add(file_hash)
        project_id = path.stem.replace("_SOURCE_SELECTION", "")
        metadata = manifest.get(project_id, {}) if isinstance(manifest.get(project_id, {}), dict) else {}
        records.append({
            "project_id": project_id,
            "source_file": str(path),
            "source_folder": str(path.parent),
            "source_file_sha256": file_hash,
            "source_modified_date": path.stat().st_mtime,
            "preliminary_sprint": True,
            "reference_class": "KNOWN_REFERENCE" if project_id in KNOWN_REFERENCE_IDS else "NEW_UNSEEN",
            **metadata,
        })
    return records
