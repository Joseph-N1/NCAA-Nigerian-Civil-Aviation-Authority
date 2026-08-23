from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

APP_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = APP_ROOT.parent
DATABASE_DIR = PROJECT_ROOT / "database"
CONTENT_INDEX_DIR = APP_ROOT / "content_index"
MANIFEST_PATH = CONTENT_INDEX_DIR / "manifest.json"

DOCUMENT_FAMILY_LABELS = {
    "nig_cars": "Nig. CARs",
    "advisory_circulars": "Advisory Circulars",
    "technical_guidance": "Technical Guidance",
    "manuals": "Manuals",
}

DOCUMENT_FAMILY_ORDER = {
    "nig_cars": 0,
    "advisory_circulars": 1,
    "technical_guidance": 2,
    "manuals": 3,
}

TITLE_FIXES = {
    "Nig Cars": "Nig. CARs",
    "Ncaa": "NCAA",
    "Co2": "CO2",
    "Vol Iv": "Vol. IV",
    "Vol Iii": "Vol. III",
    "Vol Ii": "Vol. II",
    "Vol I": "Vol. I",
    "Rpas": "RPAS",
    "Aoc": "AOC",
    "Ato": "ATO",
    "Amo": "AMO",
    "Ans": "ANS",
}


def default_manifest() -> Dict:
    return {
        "version": "2.0",
        "created": datetime.now().isoformat(),
        "files": {},
    }


def load_manifest() -> Dict:
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
            if "files" not in data:
                data["files"] = {}
            return data
    return default_manifest()


def save_manifest(manifest: Dict) -> None:
    CONTENT_INDEX_DIR.mkdir(parents=True, exist_ok=True)
    manifest.setdefault("created", datetime.now().isoformat())
    manifest["version"] = "2.0"
    manifest["updated"] = datetime.now().isoformat()
    with open(MANIFEST_PATH, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)


def scan_database_pdfs() -> List[Path]:
    if not DATABASE_DIR.exists():
        return []
    return sorted(
        [path for path in DATABASE_DIR.rglob("*.pdf") if path.is_file()],
        key=lambda path: path.relative_to(DATABASE_DIR).as_posix().lower(),
    )


def extract_regulatory_part(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    match = re.search(r"(?:^|-)part-(\d+)(?:-|$)", value.lower())
    if not match:
        return None
    return f"Part {int(match.group(1))}"


def infer_document_family(relative_path: str) -> str:
    path = Path(relative_path)
    if path.parts:
        candidate = path.parts[0]
        if candidate in DOCUMENT_FAMILY_LABELS:
            return candidate
    return "nig_cars"


def humanize_slug(value: str) -> str:
    title = re.sub(r"[-_]+", " ", value).strip().title()
    for source, replacement in TITLE_FIXES.items():
        title = title.replace(source, replacement)
    title = re.sub(r"\bAnd\b", "and", title)
    title = re.sub(r"\bBy\b", "by", title)
    title = re.sub(r"\bOf\b", "of", title)
    title = re.sub(r"\bTo\b", "to", title)
    title = re.sub(r"\bWithin\b", "within", title)
    return title


def build_display_title(doc_id: str, document_family: str) -> str:
    part = extract_regulatory_part(doc_id)
    stem = doc_id

    if doc_id.startswith("nig-cars-"):
        stem = doc_id[len("nig-cars-"):]

    if part:
        remainder = re.sub(r"^part-\d+-?", "", stem, flags=re.IGNORECASE)
        pretty_remainder = humanize_slug(remainder) if remainder else "Untitled"
        return f"{part} - {pretty_remainder}"

    if document_family == "nig_cars" and "schedule-of-fees-and-charges" in doc_id:
        return "Schedule of Fees and Charges"

    return humanize_slug(stem)


def build_document_record(pdf_path: Path, manifest_entry: Optional[Dict] = None) -> Dict:
    manifest_entry = manifest_entry or {}
    relative_path = pdf_path.relative_to(DATABASE_DIR).as_posix()
    document_family = infer_document_family(relative_path)
    doc_id = pdf_path.stem
    regulatory_part = manifest_entry.get("regulatory_part") or extract_regulatory_part(doc_id)
    quiz_enabled = manifest_entry.get("quiz_enabled", True)
    computed_title = build_display_title(doc_id, document_family)

    record = {
        "doc_id": doc_id,
        "filename": pdf_path.name,
        "title": computed_title,
        "document_family": document_family,
        "document_family_label": DOCUMENT_FAMILY_LABELS.get(document_family, humanize_slug(document_family)),
        "relative_path": relative_path,
        "regulatory_part": regulatory_part,
        "quiz_enabled": quiz_enabled,
        "indexed_at": manifest_entry.get("indexed_at"),
        "index_file": manifest_entry.get("index_file"),
        "stats": manifest_entry.get("stats"),
        "hash": manifest_entry.get("hash"),
        "absolute_path": str(pdf_path),
    }
    return record


def part_sort_key(record: Dict) -> int:
    part = record.get("regulatory_part")
    if not part:
        return 999
    try:
        return int(part.split()[1])
    except (IndexError, ValueError):
        return 999


def get_document_catalog(quiz_only: bool = False) -> List[Dict]:
    manifest = load_manifest()
    records = [
        build_document_record(pdf_path, manifest["files"].get(pdf_path.stem))
        for pdf_path in scan_database_pdfs()
    ]

    if quiz_only:
        records = [record for record in records if record.get("quiz_enabled")]

    records.sort(
        key=lambda record: (
            DOCUMENT_FAMILY_ORDER.get(record["document_family"], 99),
            part_sort_key(record),
            record["title"].lower(),
        )
    )
    return records


def get_document_record(doc_id: Optional[str] = None, pdf_name: Optional[str] = None) -> Optional[Dict]:
    normalized_name = (pdf_name or "").strip().lower()
    normalized_stem = Path(normalized_name).stem if normalized_name else ""

    for record in get_document_catalog():
        if doc_id and record["doc_id"] == doc_id:
            return record

        if normalized_name:
            if record["filename"].lower() == normalized_name:
                return record
            if record["relative_path"].lower() == normalized_name.replace("\\", "/"):
                return record
            if record["doc_id"].lower() == normalized_stem:
                return record

    return None


def load_indexed_document(doc_id: str) -> Optional[Dict]:
    manifest = load_manifest()
    manifest_entry = manifest["files"].get(doc_id, {})

    index_file = manifest_entry.get("index_file") or f"{doc_id}.json"
    index_path = CONTENT_INDEX_DIR / index_file

    if not index_path.exists():
        index_path = CONTENT_INDEX_DIR / f"{doc_id}.json"

    if not index_path.exists():
        return None

    with open(index_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)

    if "doc_id" not in data:
        data["doc_id"] = doc_id

    return data
