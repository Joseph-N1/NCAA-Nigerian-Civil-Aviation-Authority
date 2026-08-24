from __future__ import annotations

from datetime import date, datetime, timedelta
from difflib import get_close_matches
from itertools import product
from io import BytesIO
from pathlib import Path
import random
import re
import sqlite3
import json

import pandas as pd
import streamlit as st


SCENARIO_MARKS = {
    "Assigned aircraft example": "5N-ABC",
    "Reusable historical mark": "5N-AAD",
    "Reserved special mark": "5N-CCA",
    "Unused fresh mark": "5N-ZZZ",
}

NOTICE_STATES = [
    "Pending Review",
    "Call Logged",
    "Email Drafted",
    "Ready for Reuse",
]

DATA_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DATA_DIR / "ncaa_demo.db"

KNOWN_OPERATORS = [
    "Rano Air",
    "Air Peace",
    "Arik Air",
    "Ibom Air",
    "Overland Airways",
    "Max Air",
    "Private Owner",
    "Aero Contractors",
    "NCAA",
]

KNOWN_MANUFACTURERS = [
    "Airbus",
    "ATR",
    "Boeing",
    "Cessna",
    "Diamond",
    "Embraer",
    "Leonardo",
    "RUAG Aerospace Services GmbH",
]

KNOWN_MODELS = [
    "A320",
    "72-600",
    "737-500",
    "737-800",
    "208B Grand Caravan",
    "DA42",
    "Dornier 228-201",
    "ERJ-145",
    "AW139",
]

KNOWN_AIRCRAFT_TYPES = [
    "Fixed Wing",
    "Rotorcraft",
]

TYPE_OF_OPERATION_OPTIONS = [
    "CAT Scheduled",
    "CAT Unscheduled",
    "General Aviation",
    "Aerial Work",
    "Training",
]

REGISTRATION_BASIS_OPTIONS = [
    "Ownership",
    "Operator",
    "Other",
]

OPERATOR_ALIASES = {
    "rano ar": "Rano Air",
    "ranoair": "Rano Air",
    "airpeace": "Air Peace",
    "air pece": "Air Peace",
    "arikair": "Arik Air",
    "ibomair": "Ibom Air",
    "overland air": "Overland Airways",
    "overland": "Overland Airways",
    "aero contractor": "Aero Contractors",
    "aerocontractors": "Aero Contractors",
}

MANUFACTURER_ALIASES = {
    "air bus": "Airbus",
    "boing": "Boeing",
    "boeingg": "Boeing",
    "embraar": "Embraer",
    "embroer": "Embraer",
    "leonado": "Leonardo",
    "ruag": "RUAG Aerospace Services GmbH",
    "ruag aerospace": "RUAG Aerospace Services GmbH",
}

MODEL_ALIASES = {
    "737800": "737-800",
    "737 800": "737-800",
    "737500": "737-500",
    "737 500": "737-500",
    "72600": "72-600",
    "72 600": "72-600",
    "aw 139": "AW139",
    "aw139": "AW139",
    "erj145": "ERJ-145",
    "erj 145": "ERJ-145",
    "grand caravan": "208B Grand Caravan",
    "208b grandcaravan": "208B Grand Caravan",
    "dornier228201": "Dornier 228-201",
    "dornier 228 201": "Dornier 228-201",
}

TYPE_OF_OPERATION_ALIASES = {
    "cat scheduled": "CAT Scheduled",
    "cat sheduled": "CAT Scheduled",
    "cat schedulled": "CAT Scheduled",
    "cat unscheduled": "CAT Unscheduled",
    "cat unsheduled": "CAT Unscheduled",
    "general aviation": "General Aviation",
    "general aviaton": "General Aviation",
    "aerial work": "Aerial Work",
    "training": "Training",
}

REGISTRATION_BASIS_ALIASES = {
    "ownership": "Ownership",
    "owner": "Ownership",
    "operator": "Operator",
    "other": "Other",
}

TCDS_LOOKUP = {
    ("Boeing", "737-800"): {
        "mtow_kg": "79015",
        "mtow_lbs": "174200",
        "engine_type": "CFM56-7B",
        "engine_quantity": "2",
        "aircraft_type": "Fixed Wing",
    },
    ("Airbus", "A320"): {
        "mtow_kg": "77000",
        "mtow_lbs": "169756",
        "engine_type": "CFM56 / IAE V2500",
        "engine_quantity": "2",
        "aircraft_type": "Fixed Wing",
    },
    ("ATR", "72-600"): {
        "mtow_kg": "23000",
        "mtow_lbs": "50706",
        "engine_type": "PW127M",
        "engine_quantity": "2",
        "aircraft_type": "Fixed Wing",
    },
    ("Leonardo", "AW139"): {
        "mtow_kg": "6800",
        "mtow_lbs": "14991",
        "engine_type": "PT6C-67C",
        "engine_quantity": "2",
        "aircraft_type": "Rotorcraft",
    },
    ("RUAG Aerospace Services GmbH", "Dornier 228-201"): {
        "mtow_kg": "",
        "mtow_lbs": "",
        "engine_type": "Garrett TPE331",
        "engine_quantity": "2",
        "aircraft_type": "Fixed Wing",
    },
}

ACRONYM_WORDS = {
    "NCAA": "NCAA",
    "DAWS": "DAWS",
    "C of R": "C of R",
    "TCDS": "TCDS",
}


def all_suffixes() -> list[str]:
    return ["".join(chars) for chars in product("ABCDEFGHIJKLMNOPQRSTUVWXYZ", repeat=3)]


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value.lower())).strip()


def normalize_mark_input(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "", value).upper()
    if cleaned.startswith("5N"):
        cleaned = cleaned[2:]
    letters = re.sub(r"[^A-Z]+", "", cleaned)
    return letters[-3:]


def fuzzy_match_value(query: str, choices: list[str], cutoff: float = 0.78) -> str | None:
    if not query or not choices:
        return None
    match = get_close_matches(query, choices, n=1, cutoff=cutoff)
    return match[0] if match else None


def clean_spacing_and_punctuation(value: str) -> str:
    text = re.sub(r"\s+", " ", value).strip()
    text = re.sub(r"\s+([,.;:/-])", r"\1", text)
    text = re.sub(r"([,.;:])(?!\s|$)", r"\1 ", text)
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"\s*/\s*", "/", text)
    return text.strip()


def smart_title_case(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return ""

    words: list[str] = []
    for word in cleaned.split(" "):
        plain = re.sub(r"[^A-Za-z0-9]", "", word)
        if plain.upper() in ACRONYM_WORDS:
            words.append(ACRONYM_WORDS[plain.upper()])
        elif plain.isupper() and 2 <= len(plain) <= 5:
            words.append(word.upper())
        elif "/" in word:
            words.append("/".join(part.capitalize() if part else part for part in word.split("/")))
        elif "-" in word and not any(char.isdigit() for char in word):
            words.append("-".join(part.capitalize() if part else part for part in word.split("-")))
        else:
            words.append(word.capitalize())
    return " ".join(words)


def canonicalize_from_choices(
    value: str,
    choices: list[str],
    aliases: dict[str, str] | None = None,
    fallback_title: bool = True,
) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return ""

    normalized = normalize_text(cleaned)
    if aliases:
        alias_match = aliases.get(normalized)
        if alias_match:
            return alias_match

    normalized_map = {normalize_text(choice): choice for choice in choices}
    if normalized in normalized_map:
        return normalized_map[normalized]

    match = fuzzy_match_value(normalized, list(normalized_map.keys()), cutoff=0.7)
    if match:
        return normalized_map[match]

    return smart_title_case(cleaned) if fallback_title else cleaned


def canonicalize_serial_number(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value).upper()
    cleaned = re.sub(r"[^A-Z0-9/-]", "", cleaned)
    return cleaned


def canonicalize_note(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return ""
    cleaned = cleaned[0].upper() + cleaned[1:] if len(cleaned) > 1 else cleaned.upper()
    if cleaned[-1] not in ".!?":
        cleaned = cleaned + "."
    return cleaned


def canonicalize_full_mark(value: str) -> tuple[str, str] | tuple[None, None]:
    suffix = normalize_mark_input(value)
    if len(suffix) != 3:
        return None, None
    return f"5N-{suffix}", suffix


def canonicalize_operator_name(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_OPERATORS, OPERATOR_ALIASES)


def canonicalize_manufacturer(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_MANUFACTURERS, MANUFACTURER_ALIASES)


def canonicalize_model(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_MODELS, MODEL_ALIASES, fallback_title=False)


def canonicalize_aircraft_type(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_AIRCRAFT_TYPES, fallback_title=False)


def canonicalize_address(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return ""
    return smart_title_case(cleaned)


def canonicalize_cor_number(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value).upper()
    cleaned = re.sub(r"[^A-Z0-9/-]", "", cleaned)
    return cleaned


def canonicalize_year(value: str) -> str:
    cleaned = re.sub(r"[^0-9]", "", value)
    if len(cleaned) == 4:
        return cleaned
    return ""


def canonicalize_numeric_text(value: str) -> str:
    cleaned = re.sub(r"[^0-9.]", "", clean_spacing_and_punctuation(value))
    if cleaned.count(".") > 1:
        parts = cleaned.split(".")
        cleaned = parts[0] + "." + "".join(parts[1:])
    return cleaned


def canonicalize_integer_text(value: str) -> str:
    return re.sub(r"[^0-9]", "", clean_spacing_and_punctuation(value))


def canonicalize_engine_type(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    return cleaned.upper()


def canonicalize_type_of_operation(value: str) -> str:
    return canonicalize_from_choices(value, TYPE_OF_OPERATION_OPTIONS, TYPE_OF_OPERATION_ALIASES, fallback_title=False)


def canonicalize_registration_basis(value: str) -> str:
    return canonicalize_from_choices(value, REGISTRATION_BASIS_OPTIONS, REGISTRATION_BASIS_ALIASES, fallback_title=False)


def compute_mtow_pair(mtow_kg: str, mtow_lbs: str) -> tuple[str, str]:
    clean_kg = canonicalize_numeric_text(mtow_kg)
    clean_lbs = canonicalize_numeric_text(mtow_lbs)
    if clean_kg and not clean_lbs:
        clean_lbs = str(int(round(float(clean_kg) * 2.20462)))
    elif clean_lbs and not clean_kg:
        clean_kg = str(int(round(float(clean_lbs) / 2.20462)))
    return clean_kg, clean_lbs


def technical_defaults_for(manufacturer: str, model: str) -> dict[str, str]:
    return TCDS_LOOKUP.get((manufacturer, model), {})


def source_summary(cor_uploaded: bool, supporting_uploaded: bool) -> str:
    sources = ["manual"]
    if cor_uploaded:
        sources.insert(0, "cor")
    if supporting_uploaded:
        sources.append("supporting_file")
    return json.dumps(sources)


def uploaded_file_signature(uploaded_file: object | None) -> str:
    if uploaded_file is None:
        return "none"
    return f"{getattr(uploaded_file, 'name', 'unnamed')}:{getattr(uploaded_file, 'size', 0)}:{getattr(uploaded_file, 'type', '')}"


def uploaded_document_rows(cor_file: object | None, supporting_file: object | None) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for label, uploaded_file in [("C of R", cor_file), ("Application / Supporting File", supporting_file)]:
        if uploaded_file is None:
            rows.append({"Document": label, "File": "Not uploaded", "Type": "-", "Size": "-"})
            continue
        size = getattr(uploaded_file, "size", 0) or 0
        rows.append(
            {
                "Document": label,
                "File": getattr(uploaded_file, "name", "uploaded file"),
                "Type": getattr(uploaded_file, "type", "-") or "-",
                "Size": f"{size / 1024:.1f} KB",
            }
        )
    return rows


def supporting_source_label(uploaded_file: object | None) -> str:
    if uploaded_file is None:
        return "Manual"
    name = normalize_text(getattr(uploaded_file, "name", ""))
    if any(term in name for term in ["tcds", "type certificate", "type cert", "technical"]):
        return "TCDS"
    return "Application"


def dependency_status_rows() -> list[dict[str, str]]:
    dependencies = [
        ("pypdf", "Selectable-text PDF extraction"),
        ("fitz", "PDF page rendering for scanned PDFs"),
        ("PIL", "Image loading and contrast cleanup"),
        ("cv2", "Advanced thresholding and denoising"),
        ("pytesseract", "Local OCR text recognition"),
    ]
    rows: list[dict[str, str]] = []
    for module_name, purpose in dependencies:
        try:
            __import__(module_name)
            status = "Available"
        except Exception:
            status = "Missing"
        display_name = "PyMuPDF" if module_name == "fitz" else "Pillow" if module_name == "PIL" else module_name
        rows.append({"Library": display_name, "Purpose": purpose, "Status": status})
    return rows


def uploaded_file_to_images(uploaded_file: object | None, label: str, max_pages: int = 2) -> tuple[list[dict[str, object]], list[str]]:
    if uploaded_file is None:
        return [], [f"{label} was not uploaded."]

    warnings: list[str] = []
    images: list[dict[str, object]] = []
    file_name = getattr(uploaded_file, "name", "uploaded file")
    file_type = getattr(uploaded_file, "type", "")
    suffix = Path(file_name).suffix.lower()
    raw = uploaded_file.getvalue()

    try:
        from PIL import Image
    except Exception:
        return [], ["Pillow is required to load and preview scanned images."]

    if file_type.startswith("image/") or suffix in {".png", ".jpg", ".jpeg"}:
        try:
            image = Image.open(BytesIO(raw)).convert("RGB")
            images.append({"document": label, "page": 1, "image": image})
            return images, warnings
        except Exception:
            return [], [f"{label} image could not be opened for preprocessing."]

    if file_type == "application/pdf" or suffix == ".pdf":
        try:
            import fitz  # type: ignore

            document = fitz.open(stream=raw, filetype="pdf")
            for page_index in range(min(max_pages, len(document))):
                page = document.load_page(page_index)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
                image = Image.open(BytesIO(pixmap.tobytes("png"))).convert("RGB")
                images.append({"document": label, "page": page_index + 1, "image": image})
            document.close()
            if len(images) == max_pages:
                warnings.append(f"{label} OCR preview is limited to the first {max_pages} pages for demo speed.")
            return images, warnings
        except ModuleNotFoundError:
            return [], ["PyMuPDF is required to convert scanned PDF pages into images for OCR."]
        except Exception:
            return [], [f"{label} PDF could not be rendered into images for OCR."]

    return [], [f"{label} file type is not supported for scan preprocessing."]


def preprocess_scan_image(image: object) -> tuple[object, list[str]]:
    notes: list[str] = []
    try:
        from PIL import ImageEnhance, ImageOps

        processed = ImageOps.grayscale(image)
        width, height = processed.size
        if width < 1800:
            scale = 1800 / max(width, 1)
            processed = processed.resize((1800, int(height * scale)))
            notes.append("Upscaled low-resolution page")
        processed = ImageOps.autocontrast(processed)
        processed = ImageEnhance.Contrast(processed).enhance(1.8)
        processed = ImageEnhance.Sharpness(processed).enhance(1.7)
    except Exception:
        return image, ["Basic Pillow preprocessing failed; using original image."]

    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
        from PIL import Image

        array = np.array(processed)
        denoised = cv2.fastNlMeansDenoising(array, None, 18, 7, 21)
        blurred = cv2.GaussianBlur(denoised, (3, 3), 0)
        thresholded = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )
        processed = Image.fromarray(thresholded)
        notes.append("Applied denoise and adaptive thresholding")
    except Exception:
        notes.append("OpenCV not available; used Pillow contrast/sharpen cleanup")

    return processed, notes


def run_tesseract_ocr(image: object) -> tuple[str, list[str]]:
    try:
        import pytesseract  # type: ignore
    except Exception:
        return "", ["pytesseract is not installed in this environment."]

    try:
        text = pytesseract.image_to_string(image, lang="eng", config="--psm 6")
        return text, []
    except Exception as exc:
        message = str(exc)
        if "tesseract is not installed" in message.lower() or "not in your path" in message.lower():
            return "", ["Tesseract OCR is not installed or is not available on PATH."]
        return "", ["Tesseract OCR could not read the preprocessed image."]


def ocr_uploaded_file(uploaded_file: object | None, label: str) -> tuple[str, list[str], list[dict[str, object]]]:
    rendered_pages, warnings = uploaded_file_to_images(uploaded_file, label)
    preview_images: list[dict[str, object]] = []
    ocr_text_parts: list[str] = []

    for page in rendered_pages:
        original = page["image"]
        processed, preprocess_notes = preprocess_scan_image(original)
        page_label = f"{page['document']} page {page['page']}"
        preview_images.append({"caption": f"{page_label}: original", "image": original})
        preview_images.append({"caption": f"{page_label}: cleaned for OCR", "image": processed})
        warnings.extend(f"{page_label}: {note}" for note in preprocess_notes)
        text, ocr_warnings = run_tesseract_ocr(processed)
        warnings.extend(f"{page_label}: {warning}" for warning in ocr_warnings)
        if text.strip():
            ocr_text_parts.append(text)

    if rendered_pages and not ocr_text_parts:
        warnings.append(f"{label} was preprocessed, but no OCR text was returned.")

    return "\n\n".join(ocr_text_parts), warnings, preview_images


def loose_pdf_text(raw: bytes) -> str:
    decoded = raw.decode("latin-1", errors="ignore")
    chunks = re.findall(r"\((.{1,240}?)\)", decoded, flags=re.S)
    cleaned_chunks: list[str] = []
    for chunk in chunks:
        cleaned = chunk.replace("\\n", " ").replace("\\r", " ").replace("\\t", " ")
        cleaned = cleaned.replace("\\(", "(").replace("\\)", ")").replace("\\\\", "\\")
        cleaned = re.sub(r"[^A-Za-z0-9.,:/()#'&+ -]", " ", cleaned)
        cleaned = clean_spacing_and_punctuation(cleaned)
        if len(cleaned) >= 3:
            cleaned_chunks.append(cleaned)
    return "\n".join(cleaned_chunks)


def extract_text_from_uploaded_file(
    uploaded_file: object | None,
    label: str,
    use_scan_ocr: bool = False,
) -> tuple[str, list[str], list[dict[str, object]]]:
    if uploaded_file is None:
        return "", [f"{label} was not uploaded."], []

    file_name = getattr(uploaded_file, "name", "uploaded file")
    file_type = getattr(uploaded_file, "type", "")
    raw = uploaded_file.getvalue()

    if file_type.startswith("image/") or Path(file_name).suffix.lower() in {".png", ".jpg", ".jpeg"}:
        if use_scan_ocr:
            return ocr_uploaded_file(uploaded_file, label)
        return "", [f"{label} is an image. Enable scan preprocessing/OCR to extract text from image uploads."], []

    if file_type == "application/pdf" or Path(file_name).suffix.lower() == ".pdf":
        warnings: list[str] = []
        extracted_text = ""
        try:
            from pypdf import PdfReader  # type: ignore

            reader = PdfReader(BytesIO(raw))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            if text.strip():
                extracted_text = text
                if len(compact_document_text(text)) >= 120:
                    return extracted_text, warnings, []
            warnings.append(f"{label} PDF opened, but no selectable text was found.")
        except ModuleNotFoundError:
            warnings.append(f"{label} selectable-text PDF parser is not installed in this environment.")
        except Exception:
            warnings.append(f"{label} PDF text parser could not read the file.")

        fallback_text = loose_pdf_text(raw)
        if fallback_text.strip():
            warnings.append(f"{label} used a fallback PDF text scan; results may be incomplete.")
            extracted_text = "\n\n".join(part for part in [extracted_text, fallback_text] if part.strip())
            if not use_scan_ocr:
                return extracted_text, warnings, []

        if use_scan_ocr:
            ocr_text, ocr_warnings, preview_images = ocr_uploaded_file(uploaded_file, label)
            warnings.extend(ocr_warnings)
            combined = "\n\n".join(part for part in [extracted_text, ocr_text] if part.strip())
            if ocr_text.strip():
                warnings.append(f"{label} OCR text was added after scan preprocessing.")
            return combined, warnings, preview_images

        warnings.append(f"{label} did not return readable text. This is likely a scanned PDF and needs OCR.")
        return extracted_text, warnings, []

    return "", [f"{label} file type is not supported for extraction in this demo."], []


def normalize_document_text(value: str) -> str:
    text = value.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def compact_document_text(value: str) -> str:
    return re.sub(r"\s+", " ", normalize_document_text(value)).strip()


def find_first_match(text: str, patterns: list[str]) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I | re.S)
        if match:
            return clean_spacing_and_punctuation(match.group(1))
    return ""


def parse_document_date(value: str) -> date | None:
    cleaned = clean_spacing_and_punctuation(value)
    cleaned = re.sub(r"(\d{1,2})(st|nd|rd|th)", r"\1", cleaned, flags=re.I)
    cleaned = cleaned.replace(",", "")
    for fmt in ("%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def split_manufacturer_and_model(value: str) -> tuple[str, str]:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return "", ""

    normalized = normalize_text(cleaned)
    manufacturer = ""
    model = ""
    for known in KNOWN_MANUFACTURERS:
        if normalize_text(known) in normalized:
            manufacturer = known
            break
    for known in KNOWN_MODELS:
        if normalize_text(known) in normalized:
            model = known
            break

    if manufacturer and model:
        return manufacturer, model

    lines = [clean_spacing_and_punctuation(line) for line in value.splitlines() if clean_spacing_and_punctuation(line)]
    if len(lines) >= 2:
        return canonicalize_manufacturer(lines[0]), canonicalize_model(lines[1])
    return canonicalize_manufacturer(cleaned), model


def extract_cor_fields_from_text(text: str) -> dict[str, object]:
    fields: dict[str, object] = {}
    if not text.strip():
        return fields

    compact = compact_document_text(text)
    mark_match = re.search(r"\b5N\s*[- ]?\s*([A-Z]{3})\b", compact, flags=re.I)
    if mark_match:
        fields["full_mark"] = f"5N-{mark_match.group(1).upper()}"

    cor_number = find_first_match(
        compact,
        [
            r"Certificate\s+Number\s*[:#.-]*\s*([A-Z0-9/-]{1,24})",
            r"C\s*of\s*R\s*(?:No\.?|Number)\s*[:#.-]*\s*([A-Z0-9/-]{1,24})",
        ],
    )
    if cor_number:
        fields["cor_number"] = canonicalize_cor_number(cor_number)

    year = find_first_match(
        compact,
        [
            r"Date\s+of\s+Manufacture\s*[:#.-]*\s*((?:19|20)\d{2})",
            r"Year\s+of\s+Manufacture\s*[:#.-]*\s*((?:19|20)\d{2})",
        ],
    )
    if year:
        fields["year_of_manufacture"] = canonicalize_year(year)

    serial = find_first_match(
        compact,
        [
            r"Aircraft\s+Serial\s+Number\s*[:#.-]*\s*([A-Z0-9/-]{2,40})",
            r"Serial\s+Number\s*[:#.-]*\s*([A-Z0-9/-]{2,40})",
        ],
    )
    if serial:
        fields["serial_number"] = canonicalize_serial_number(serial)

    date_raw = find_first_match(
        compact,
        [
            r"Date\s+of\s+Issue\s*[:#.-]*\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s*,?\s*(?:19|20)\d{2})",
            r"Issue\s+Date\s*[:#.-]*\s*([0-9]{1,2}[/-][0-9]{1,2}[/-](?:19|20)\d{2})",
        ],
    )
    parsed_date = parse_document_date(date_raw) if date_raw else None
    if parsed_date:
        fields["cor_date"] = parsed_date

    manufacturer_block = find_first_match(
        text,
        [
            r"Manufacturer\s+and\s+Manufacturer'?s\s+Designation\s+of\s+aircraft\s*[:#.-]*\s*(.{3,180}?)(?:Aircraft\s+Serial\s+Number|Serial\s+Number|3\.)",
            r"Manufacturer\s*(?:/|and)?\s*(?:Aircraft\s+Type|Type)?\s*[:#.-]*\s*(.{3,160}?)(?:Serial\s+Number|Aircraft\s+Serial|$)",
        ],
    )
    manufacturer, model = split_manufacturer_and_model(manufacturer_block)
    if manufacturer:
        fields["manufacturer"] = manufacturer
    if model:
        fields["model"] = model

    holder = find_first_match(
        compact,
        [
            r"(?:Issued\s+to|Certificate\s+Holder)\s*[:#.-]*\s*([A-Z0-9&'.,()/ -]{3,90}?)(?:Basis\s+of\s+registration|Address\s+of\s+certificate|4b|$)",
        ],
    )
    if holder:
        cleaned_holder = canonicalize_operator_name(holder)
        fields["certificate_holder_name"] = cleaned_holder
        fields["operator_name"] = cleaned_holder

    holder_address = find_first_match(
        compact,
        [
            r"Address\s+of\s+certificate\s+holder\s*[:#.-]*\s*([A-Z0-9&'.,()/ -]{5,160}?)(?:Name\s+and\s+contact|Owner|Date\s+of\s+Issue|5\.|$)",
            r"Registered\s+Address\s*[:#.-]*\s*([A-Z0-9&'.,()/ -]{5,160}?)(?:Owner|Date\s+of\s+Issue|$)",
        ],
    )
    if holder_address:
        cleaned_address = canonicalize_address(holder_address)
        fields["certificate_holder_address"] = cleaned_address
        fields["operator_address"] = cleaned_address

    if re.search(r"same\s+as\s+above", compact, flags=re.I):
        fields["owner_same_as_holder"] = True
        if "certificate_holder_name" in fields:
            fields["owner"] = fields["certificate_holder_name"]
        if "certificate_holder_address" in fields:
            fields["owner_address"] = fields["certificate_holder_address"]

    if re.search(r"ownership\s+of\s+aircraft", compact, flags=re.I):
        fields["registration_basis"] = "Ownership"
    elif re.search(r"operator\s+of\s+aircraft", compact, flags=re.I):
        fields["registration_basis"] = "Operator"

    return fields


def extract_supporting_fields_from_text(text: str) -> dict[str, object]:
    fields: dict[str, object] = {}
    if not text.strip():
        return fields

    compact = compact_document_text(text)
    kg = find_first_match(
        compact,
        [
            r"(?:MTOW|Maximum\s+Take[- ]?Off\s+Weight)[^0-9]{0,40}([0-9,]{4,7})\s*kg",
            r"([0-9,]{4,7})\s*kg[^A-Za-z0-9]{0,30}(?:MTOW|Maximum\s+Take[- ]?Off\s+Weight)",
        ],
    )
    lbs = find_first_match(
        compact,
        [
            r"(?:MTOW|Maximum\s+Take[- ]?Off\s+Weight)[^0-9]{0,40}([0-9,]{4,7})\s*(?:lb|lbs|pounds)",
            r"([0-9,]{4,7})\s*(?:lb|lbs|pounds)[^A-Za-z0-9]{0,30}(?:MTOW|Maximum\s+Take[- ]?Off\s+Weight)",
        ],
    )
    if kg:
        fields["mtow_kg"] = canonicalize_numeric_text(kg)
    if lbs:
        fields["mtow_lbs"] = canonicalize_numeric_text(lbs)

    engine_type = find_first_match(
        compact,
        [
            r"(?:Engine\s+Type|Powerplant|Power\s+Plant)\s*[:#.-]*\s*([A-Z0-9 /+-]{3,60}?)(?:Engine\s+Quantity|Quantity|MTOW|$)",
            r"\b(CFM56[-A-Z0-9/ ]+|IAE\s+V2500|PW[0-9A-Z-]+|PT6[A-Z0-9-]+|TPE331[A-Z0-9-]*)\b",
        ],
    )
    if engine_type:
        fields["engine_type"] = canonicalize_engine_type(engine_type)

    engine_qty = find_first_match(
        compact,
        [
            r"(?:Engine\s+Quantity|Number\s+of\s+Engines|No\.?\s+of\s+Engines)\s*[:#.-]*\s*([1-9])",
            r"\b([1-9])\s*(?:engines|engine aircraft)\b",
        ],
    )
    if engine_qty:
        fields["engine_quantity"] = canonicalize_integer_text(engine_qty)

    operation_matches = {
        "CAT Scheduled": ["cat scheduled", "scheduled commercial air transport", "scheduled commercial airline transport"],
        "CAT Unscheduled": ["cat unscheduled", "unscheduled commercial air transport", "charter"],
        "General Aviation": ["general aviation", "private operation"],
        "Aerial Work": ["aerial work"],
        "Training": ["training"],
    }
    normalized = normalize_text(compact)
    for label, phrases in operation_matches.items():
        if any(phrase in normalized for phrase in phrases):
            fields["type_of_operation"] = label
            break

    return fields


def build_document_extraction(
    cor_file: object | None,
    supporting_file: object | None,
    use_scan_ocr: bool = False,
) -> dict[str, object]:
    cor_text, cor_warnings, cor_previews = extract_text_from_uploaded_file(cor_file, "C of R", use_scan_ocr)
    supporting_text, supporting_warnings, supporting_previews = extract_text_from_uploaded_file(
        supporting_file,
        "Supporting file",
        use_scan_ocr,
    )
    cor_fields = extract_cor_fields_from_text(cor_text)
    supporting_fields = extract_supporting_fields_from_text(supporting_text)
    fields = dict(cor_fields)
    cor_source = "C of R OCR" if cor_previews else "C of R"
    field_sources = {key: cor_source for key in cor_fields}
    supporting_source = supporting_source_label(supporting_file)
    if supporting_previews and supporting_source != "Manual":
        supporting_source = f"{supporting_source} OCR"
    fields.update({key: value for key, value in supporting_fields.items() if value})
    field_sources.update({key: supporting_source for key, value in supporting_fields.items() if value})

    if "manufacturer" in fields and "model" in fields:
        defaults = technical_defaults_for(str(fields["manufacturer"]), str(fields["model"]))
        for key in ("aircraft_type", "mtow_kg", "mtow_lbs", "engine_type", "engine_quantity"):
            if defaults.get(key) and not fields.get(key):
                fields[key] = defaults[key]
                field_sources[key] = "TCDS"

    expected_fields = [
        ("Registration Mark", "full_mark"),
        ("Manufacturer", "manufacturer"),
        ("Aircraft Designation / Model", "model"),
        ("Serial Number", "serial_number"),
        ("C of R Number", "cor_number"),
        ("Date of Issue of C of R", "cor_date"),
        ("Year of Manufacture", "year_of_manufacture"),
        ("Certificate Holder", "certificate_holder_name"),
        ("Certificate Holder Address", "certificate_holder_address"),
        ("Registered Operator", "operator_name"),
        ("Registered Owner", "owner"),
        ("Registration Basis", "registration_basis"),
        ("MTOW (kg)", "mtow_kg"),
        ("MTOW (lbs)", "mtow_lbs"),
        ("Engine Type", "engine_type"),
        ("Engine Quantity", "engine_quantity"),
        ("Type of Operation", "type_of_operation"),
    ]
    high_confidence_cor_fields = {
        "full_mark",
        "manufacturer",
        "model",
        "serial_number",
        "cor_number",
        "cor_date",
        "year_of_manufacture",
        "certificate_holder_name",
        "certificate_holder_address",
        "operator_name",
        "owner",
        "registration_basis",
    }
    required_review_fields = {
        "full_mark": "Registration mark",
        "manufacturer": "Manufacturer",
        "model": "Aircraft designation / model",
        "serial_number": "Serial number",
        "cor_number": "C of R number",
        "cor_date": "Date of issue of C of R",
        "certificate_holder_name": "Certificate holder",
        "operator_name": "Registered operator",
        "owner": "Registered owner",
        "type_of_operation": "Type of operation",
    }
    rows = []
    for label, key in expected_fields:
        value = fields.get(key, "")
        if isinstance(value, date):
            display_value = value.isoformat()
        elif isinstance(value, bool):
            display_value = "Yes" if value else "No"
        else:
            display_value = str(value) if value else ""
        source = field_sources.get(key, "Manual")
        if not display_value:
            confidence = "Needs Review"
            source = "Manual"
        elif source == "C of R" and key in high_confidence_cor_fields:
            confidence = "High"
        elif source == "TCDS" and key in {"mtow_kg", "mtow_lbs", "engine_type", "engine_quantity", "aircraft_type"}:
            confidence = "High"
        elif "OCR" in source:
            confidence = "Medium"
        elif source == "Application":
            confidence = "Medium"
        else:
            confidence = "Medium"
        rows.append(
            {
                "Field": label,
                "Extracted Value": display_value or "Not found",
                "Source": source,
                "Confidence": confidence,
                "Status": "Detected" if display_value else "Needs review",
            }
        )

    missing_rows = [
        {
            "Field": label,
            "Priority": "Required before save",
            "Next Action": "Review document and enter manually",
        }
        for key, label in required_review_fields.items()
        if not fields.get(key)
    ]
    for optional_key, label in {
        "mtow_kg": "MTOW (kg)",
        "mtow_lbs": "MTOW (lbs)",
        "engine_type": "Engine type",
        "engine_quantity": "Engine quantity",
        "owner_address": "Owner address",
    }.items():
        if not fields.get(optional_key):
            missing_rows.append(
                {
                    "Field": label,
                    "Priority": "Supporting review",
                    "Next Action": "Confirm from application, TCDS, or technical file",
                }
            )

    combined_preview = "\n\n".join(part for part in [cor_text, supporting_text] if part.strip())
    return {
        "fields": fields,
        "rows": rows,
        "missing_rows": missing_rows,
        "preview_images": cor_previews + supporting_previews,
        "dependency_rows": dependency_status_rows(),
        "warnings": cor_warnings + [warning for warning in supporting_warnings if "was not uploaded" not in warning],
        "text_preview": normalize_document_text(combined_preview)[:2500],
    }


def ensure_table_columns(conn: sqlite3.Connection, table_name: str, columns: dict[str, str]) -> None:
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table_name})")}
    for column_name, column_type in columns.items():
        if column_name not in existing:
            conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


def init_demo_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS registry_overrides (
                full_mark TEXT PRIMARY KEY,
                suffix TEXT NOT NULL,
                owner TEXT NOT NULL,
                operator_name TEXT NOT NULL,
                manufacturer TEXT NOT NULL,
                model TEXT NOT NULL,
                serial_number TEXT NOT NULL,
                aircraft_type TEXT NOT NULL,
                registration_date TEXT NOT NULL,
                operator_address TEXT NOT NULL DEFAULT '',
                owner_address TEXT NOT NULL DEFAULT '',
                cor_number TEXT NOT NULL DEFAULT '',
                year_of_manufacture TEXT NOT NULL DEFAULT '',
                mtow_kg TEXT NOT NULL DEFAULT '',
                mtow_lbs TEXT NOT NULL DEFAULT '',
                engine_type TEXT NOT NULL DEFAULT '',
                engine_quantity TEXT NOT NULL DEFAULT '',
                type_of_operation TEXT NOT NULL DEFAULT '',
                certificate_holder_name TEXT NOT NULL DEFAULT '',
                certificate_holder_address TEXT NOT NULL DEFAULT '',
                registration_basis TEXT NOT NULL DEFAULT '',
                owner_same_as_holder INTEGER NOT NULL DEFAULT 0,
                field_sources_json TEXT NOT NULL DEFAULT '[]',
                reviewer TEXT NOT NULL,
                reviewer_note TEXT NOT NULL,
                saved_at TEXT NOT NULL
            )
            """
        )
        ensure_table_columns(
            conn,
            "registry_overrides",
            {
                "operator_address": "TEXT NOT NULL DEFAULT ''",
                "owner_address": "TEXT NOT NULL DEFAULT ''",
                "cor_number": "TEXT NOT NULL DEFAULT ''",
                "year_of_manufacture": "TEXT NOT NULL DEFAULT ''",
                "mtow_kg": "TEXT NOT NULL DEFAULT ''",
                "mtow_lbs": "TEXT NOT NULL DEFAULT ''",
                "engine_type": "TEXT NOT NULL DEFAULT ''",
                "engine_quantity": "TEXT NOT NULL DEFAULT ''",
                "type_of_operation": "TEXT NOT NULL DEFAULT ''",
                "certificate_holder_name": "TEXT NOT NULL DEFAULT ''",
                "certificate_holder_address": "TEXT NOT NULL DEFAULT ''",
                "registration_basis": "TEXT NOT NULL DEFAULT ''",
                "owner_same_as_holder": "INTEGER NOT NULL DEFAULT 0",
                "field_sources_json": "TEXT NOT NULL DEFAULT '[]'",
            },
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_mark TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def load_saved_overrides() -> pd.DataFrame:
    init_demo_db()
    with sqlite3.connect(DB_PATH) as conn:
        query = """
            SELECT
                full_mark,
                suffix,
                owner,
                operator_name,
                manufacturer,
                model,
                serial_number,
                aircraft_type,
                registration_date,
                operator_address,
                owner_address,
                cor_number,
                year_of_manufacture,
                mtow_kg,
                mtow_lbs,
                engine_type,
                engine_quantity,
                type_of_operation,
                certificate_holder_name,
                certificate_holder_address,
                registration_basis,
                owner_same_as_holder,
                field_sources_json,
                reviewer,
                reviewer_note,
                saved_at
            FROM registry_overrides
        """
        return pd.read_sql_query(query, conn)


def save_registry_override(payload: dict[str, str]) -> None:
    init_demo_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO registry_overrides (
                full_mark,
                suffix,
                owner,
                operator_name,
                manufacturer,
                model,
                serial_number,
                aircraft_type,
                registration_date,
                operator_address,
                owner_address,
                cor_number,
                year_of_manufacture,
                mtow_kg,
                mtow_lbs,
                engine_type,
                engine_quantity,
                type_of_operation,
                certificate_holder_name,
                certificate_holder_address,
                registration_basis,
                owner_same_as_holder,
                field_sources_json,
                reviewer,
                reviewer_note,
                saved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(full_mark) DO UPDATE SET
                suffix=excluded.suffix,
                owner=excluded.owner,
                operator_name=excluded.operator_name,
                manufacturer=excluded.manufacturer,
                model=excluded.model,
                serial_number=excluded.serial_number,
                aircraft_type=excluded.aircraft_type,
                registration_date=excluded.registration_date,
                operator_address=excluded.operator_address,
                owner_address=excluded.owner_address,
                cor_number=excluded.cor_number,
                year_of_manufacture=excluded.year_of_manufacture,
                mtow_kg=excluded.mtow_kg,
                mtow_lbs=excluded.mtow_lbs,
                engine_type=excluded.engine_type,
                engine_quantity=excluded.engine_quantity,
                type_of_operation=excluded.type_of_operation,
                certificate_holder_name=excluded.certificate_holder_name,
                certificate_holder_address=excluded.certificate_holder_address,
                registration_basis=excluded.registration_basis,
                owner_same_as_holder=excluded.owner_same_as_holder,
                field_sources_json=excluded.field_sources_json,
                reviewer=excluded.reviewer,
                reviewer_note=excluded.reviewer_note,
                saved_at=excluded.saved_at
            """,
            (
                payload["full_mark"],
                payload["suffix"],
                payload["owner"],
                payload["operator_name"],
                payload["manufacturer"],
                payload["model"],
                payload["serial_number"],
                payload["aircraft_type"],
                payload["registration_date"],
                payload["operator_address"],
                payload["owner_address"],
                payload["cor_number"],
                payload["year_of_manufacture"],
                payload["mtow_kg"],
                payload["mtow_lbs"],
                payload["engine_type"],
                payload["engine_quantity"],
                payload["type_of_operation"],
                payload["certificate_holder_name"],
                payload["certificate_holder_address"],
                payload["registration_basis"],
                payload["owner_same_as_holder"],
                payload["field_sources_json"],
                payload["reviewer"],
                payload["reviewer_note"],
                payload["saved_at"],
            ),
        )
        conn.execute(
            """
            INSERT INTO audit_log (full_mark, action, details, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                payload["full_mark"],
                "C_OR_UPLOAD_CONFIRMED",
                f"Saved by {payload['reviewer']} for operator {payload['operator_name']} with C of R number {payload['cor_number']}",
                payload["saved_at"],
            ),
        )
        conn.commit()


def recent_saved_overrides(limit: int = 10) -> pd.DataFrame:
    init_demo_db()
    with sqlite3.connect(DB_PATH) as conn:
        query = f"""
            SELECT
                full_mark,
                operator_name,
                manufacturer,
                model,
                cor_number,
                type_of_operation,
                reviewer,
                saved_at
            FROM registry_overrides
            ORDER BY saved_at DESC
            LIMIT {int(limit)}
        """
        return pd.read_sql_query(query, conn)


def similar_phrase_in_text(text: str, phrases: list[str], cutoff: float = 0.82) -> bool:
    normalized_text = normalize_text(text)
    if not normalized_text:
        return False

    normalized_phrases = [normalize_text(phrase) for phrase in phrases]
    if any(phrase in normalized_text for phrase in normalized_phrases):
        return True

    words = normalized_text.split()
    windows: list[str] = []
    max_window = min(5, len(words))
    for size in range(1, max_window + 1):
        for start in range(0, len(words) - size + 1):
            windows.append(" ".join(words[start:start + size]))

    for window in windows:
        if fuzzy_match_value(window, normalized_phrases, cutoff=cutoff):
            return True
    return False


def format_date(value: object) -> str:
    if pd.isna(value):
        return "-"
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    return str(value)


def format_sources(value: object) -> str:
    if pd.isna(value) or not value:
        return "-"
    try:
        parsed = json.loads(str(value))
        if isinstance(parsed, list):
            return ", ".join(str(item).upper() for item in parsed)
    except Exception:
        pass
    return str(value)


def display_status(record: pd.Series) -> str:
    if record["current_status"] == "Available" and bool(record["previously_used"]):
        return "Available Again"
    return str(record["current_status"])


def status_class(record: pd.Series) -> str:
    label = display_status(record).lower().replace(" ", "-")
    return label


def metric_card(column: st.delta_generator.DeltaGenerator, title: str, value: str, subtitle: str, tone: str) -> None:
    column.markdown(
        f"""
        <div class="metric-card {tone}">
            <div class="metric-label">{title}</div>
            <div class="metric-value">{value}</div>
            <div class="metric-subtitle">{subtitle}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def info_panel(title: str, body: str, tone: str = "slate") -> None:
    st.markdown(
        f"""
        <div class="info-panel {tone}">
            <div class="info-title">{title}</div>
            <div class="info-body">{body}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def inject_styles() -> None:
    st.markdown(
        """
        <style>
            .stApp {
                background: #f7f8fa;
            }
            .block-container {
                padding-top: 4.25rem;
                padding-bottom: 2.5rem;
            }
            [data-testid="stHeader"] {
                background: rgba(247, 248, 250, 0.95);
                border-bottom: 1px solid #e5e7eb;
                backdrop-filter: blur(6px);
            }
            [data-testid="stToolbar"] {
                right: 0.75rem;
            }
            [data-testid="stSidebar"] {
                background: #fbfbfc;
                border-right: 1px solid #e6e8eb;
            }
            .metric-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-left-width: 4px;
                border-radius: 12px;
                padding: 0.95rem 1rem 0.9rem 1rem;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
                min-height: 128px;
            }
            .metric-card.blue { border-left-color: #1f4f82; }
            .metric-card.green { border-left-color: #4b647d; }
            .metric-card.gold { border-left-color: #6b7280; }
            .metric-card.red { border-left-color: #7c8796; }
            .metric-card.slate { border-left-color: #64748b; }
            .metric-label {
                color: #6b7280;
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                margin-bottom: 0.55rem;
            }
            .metric-value {
                color: #0f172a;
                font-size: 1.85rem;
                font-weight: 700;
                margin-bottom: 0.25rem;
            }
            .metric-subtitle {
                color: #64748b;
                font-size: 0.92rem;
                line-height: 1.45;
            }
            .status-chip {
                display: inline-block;
                padding: 0.32rem 0.78rem;
                border-radius: 999px;
                font-weight: 700;
                font-size: 0.82rem;
                margin-right: 0.45rem;
                margin-bottom: 0.35rem;
                border: 1px solid #dbe2ea;
            }
            .status-chip.assigned {
                background: #eef4f8;
                color: #244565;
                border-color: #d7e2ec;
            }
            .status-chip.available {
                background: #f4f7f9;
                color: #334155;
                border-color: #dde4ea;
            }
            .status-chip.available-again {
                background: #f6f7f9;
                color: #475569;
                border-color: #dbe1e7;
            }
            .status-chip.reserved {
                background: #f8f5ef;
                color: #5b6470;
                border-color: #e3ddd2;
            }
            .status-chip.special {
                background: #f5f5f5;
                color: #4b5563;
                border-color: #e5e7eb;
            }
            .info-panel {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 1rem 1.05rem;
                margin-bottom: 0.95rem;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            }
            .info-panel.navy { border-top: 3px solid #274c77; }
            .info-panel.green { border-top: 3px solid #5b6b7d; }
            .info-panel.gold { border-top: 3px solid #6b7280; }
            .info-panel.slate { border-top: 3px solid #7c8796; }
            .info-title {
                font-size: 0.98rem;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 0.35rem;
            }
            .info-body {
                color: #4b5563;
                line-height: 1.5;
                font-size: 0.94rem;
            }
            .stage-card {
                border-radius: 12px;
                padding: 0.95rem 0.95rem 0.85rem 0.95rem;
                min-height: 116px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
            }
            .stage-card.ready {
                background: #f8fafc;
                border-color: #dbe2ea;
            }
            .stage-card.pending {
                background: #ffffff;
                border-color: #e5e7eb;
            }
            .stage-label {
                font-size: 0.82rem;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.45rem;
            }
            .stage-title {
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 0.3rem;
            }
            .stage-body {
                color: #4b5563;
                font-size: 0.92rem;
                line-height: 1.45;
            }
            .trust-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 1rem 1.05rem;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            }
            .trust-answer {
                font-size: 1.25rem;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 0.5rem;
            }
            .trust-basis {
                color: #4b5563;
                line-height: 1.55;
                font-size: 0.95rem;
            }
            .small-note {
                color: #6b7280;
                font-size: 0.9rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def seed_registry() -> pd.DataFrame:
    rng = random.Random(42)
    suffixes = all_suffixes()
    frame = pd.DataFrame(
        {
            "suffix": suffixes,
            "full_mark": [f"5N-{suffix}" for suffix in suffixes],
            "current_status": "Available",
            "previously_used": False,
            "aircraft_type": "",
            "manufacturer": "",
            "model": "",
            "serial_number": "",
            "owner": "",
            "operator": "",
            "registration_date": pd.NaT,
            "release_date": pd.NaT,
            "previous_owner": "",
            "operator_address": "",
            "owner_address": "",
            "cor_number": "",
            "year_of_manufacture": "",
            "mtow_kg": "",
            "mtow_lbs": "",
            "engine_type": "",
            "engine_quantity": "",
            "type_of_operation": "",
            "certificate_holder_name": "",
            "certificate_holder_address": "",
            "registration_basis": "",
            "owner_same_as_holder": False,
            "field_sources_json": "[]",
            "special_mark": False,
            "notes": "",
            "previous_assignment_count": 0,
            "reuse_notice_status": "Fresh Mark",
            "reuse_ready": False,
            "review_flag": "",
            "last_action": "Mark preloaded into registry",
            "last_action_on": pd.Timestamp(date(2026, 1, 5)),
        }
    )

    operators = [
        "Rano Air",
        "Air Peace",
        "Arik Air",
        "Ibom Air",
        "Overland Airways",
        "Max Air",
        "Private Owner",
        "Aero Contractors",
    ]
    aircraft_pool = [
        ("Airbus", "A320", "Fixed Wing"),
        ("ATR", "72-600", "Fixed Wing"),
        ("Boeing", "737-500", "Fixed Wing"),
        ("Boeing", "737-800", "Fixed Wing"),
        ("Cessna", "208B Grand Caravan", "Fixed Wing"),
        ("Diamond", "DA42", "Fixed Wing"),
        ("Embraer", "ERJ-145", "Fixed Wing"),
        ("Leonardo", "AW139", "Rotorcraft"),
    ]

    assigned_suffixes = [
        "AAA",
        "AAB",
        "AAC",
        "AAE",
        "ABA",
        "ABC",
        "ACD",
        "ADF",
        "AKA",
        "BCA",
        "BCC",
        "CBA",
        "CCC",
        "CCD",
        "CCF",
        "CCG",
        "CCH",
        "CCI",
        "CCJ",
        "CCK",
        "CCL",
        "CCM",
    ]
    reusable_suffixes = [
        "AAD",
        "AAF",
        "AAG",
        "ABE",
        "ABB",
        "ABD",
        "ACA",
        "ACB",
        "BAA",
        "BAB",
        "BAC",
        "CAA",
    ]
    reserved_suffixes = ["CCA", "CCB", "CCE"]

    chosen_assigned = set(assigned_suffixes)
    while len(chosen_assigned) < 220:
        chosen_assigned.add(rng.choice(suffixes[350:6000]))

    chosen_reusable = {suffix for suffix in reusable_suffixes if suffix not in chosen_assigned}
    while len(chosen_reusable) < 48:
        candidate = rng.choice(suffixes[:2500])
        if candidate not in chosen_assigned:
            chosen_reusable.add(candidate)

    for index, suffix in enumerate(sorted(chosen_assigned)):
        manufacturer, model, aircraft_type = rng.choice(aircraft_pool)
        operator = operators[index % len(operators)]
        owner = operator if operator != "Private Owner" else f"Private Owner {index + 1}"
        reg_date = date(2006, 1, 1) + timedelta(days=(index * 97) % 6200)
        frame.loc[frame["suffix"] == suffix, [
            "current_status",
            "aircraft_type",
            "manufacturer",
            "model",
            "serial_number",
            "owner",
            "operator",
            "registration_date",
            "certificate_holder_name",
            "certificate_holder_address",
            "operator_address",
            "owner_address",
            "cor_number",
            "year_of_manufacture",
            "type_of_operation",
            "registration_basis",
            "owner_same_as_holder",
            "field_sources_json",
            "notes",
            "previous_assignment_count",
            "reuse_notice_status",
            "last_action",
            "last_action_on",
        ]] = [
            "Assigned",
            aircraft_type,
            manufacturer,
            model,
            f"SN-{suffix}-{1000 + index}",
            owner,
            operator,
            pd.Timestamp(reg_date),
            operator,
            f"Office Address {index + 1}, Lagos",
            f"Office Address {index + 1}, Lagos",
            f"Office Address {index + 1}, Lagos",
            f"COR-{1000 + index}",
            str(2003 + (index % 18)),
            "CAT Scheduled" if operator in {"Rano Air", "Air Peace", "Arik Air", "Ibom Air"} else "General Aviation",
            "Ownership",
            True,
            json.dumps(["seed", "manual"]),
            "Active aircraft registration",
            1 + (index % 2),
            "Not Applicable",
            "Assignment confirmed",
            pd.Timestamp(reg_date) + pd.Timedelta(days=8),
        ]

    for index, suffix in enumerate(sorted(chosen_reusable)):
        manufacturer, model, aircraft_type = rng.choice(aircraft_pool)
        previous_owner = operators[index % len(operators)]
        release_date = date(1998, 1, 1) + timedelta(days=(index * 131) % 7000)
        notice_status = NOTICE_STATES[index % len(NOTICE_STATES)]
        frame.loc[frame["suffix"] == suffix, [
            "current_status",
            "previously_used",
            "aircraft_type",
            "manufacturer",
            "model",
            "serial_number",
            "previous_owner",
            "release_date",
            "year_of_manufacture",
            "registration_basis",
            "field_sources_json",
            "notes",
            "previous_assignment_count",
            "reuse_notice_status",
            "reuse_ready",
            "review_flag",
            "last_action",
            "last_action_on",
        ]] = [
            "Available",
            True,
            aircraft_type,
            manufacturer,
            model,
            f"OLD-{suffix}-{2000 + index}",
            previous_owner,
            pd.Timestamp(release_date),
            str(1989 + (index % 20)),
            "Ownership",
            json.dumps(["seed", "history"]),
            "Previously assigned and now reusable after deregistration review",
            1 + (index % 3),
            notice_status,
            notice_status == "Ready for Reuse",
            "Supervisor review recommended" if index % 4 == 0 else "",
            "Historical reuse review updated",
            pd.Timestamp(release_date) + pd.Timedelta(days=25),
        ]

    for offset, suffix in enumerate(reserved_suffixes):
        hold_date = pd.Timestamp(date(2026, 2, 10) + timedelta(days=offset * 5))
        frame.loc[frame["suffix"] == suffix, [
            "current_status",
            "special_mark",
            "notes",
            "reuse_notice_status",
            "last_action",
            "last_action_on",
        ]] = [
            "Reserved",
            True,
            "Special mark held pending payment and approval review",
            "Reserved Hold",
            "Reservation placed",
            hold_date,
        ]

    frame.loc[frame["suffix"] == "ABC", [
        "operator",
        "owner",
        "manufacturer",
        "model",
        "aircraft_type",
        "notes",
    ]] = [
        "Rano Air",
        "Rano Air",
        "Boeing",
        "737-800",
        "Fixed Wing",
        "Assigned example used in stakeholder demo",
    ]
    frame.loc[frame["suffix"] == "ABC", [
        "operator_address",
        "owner_address",
        "cor_number",
        "year_of_manufacture",
        "mtow_kg",
        "mtow_lbs",
        "engine_type",
        "engine_quantity",
        "type_of_operation",
        "certificate_holder_name",
        "certificate_holder_address",
        "registration_basis",
        "owner_same_as_holder",
        "field_sources_json",
    ]] = [
        "22 Aviation Road, Kano",
        "22 Aviation Road, Kano",
        "COR-ABC-018",
        "2016",
        "79015",
        "174200",
        "CFM56-7B",
        "2",
        "CAT Scheduled",
        "Rano Air",
        "22 Aviation Road, Kano",
        "Ownership",
        True,
        json.dumps(["cor", "manual"]),
    ]
    frame.loc[frame["suffix"] == "CCC", [
        "operator",
        "owner",
        "manufacturer",
        "model",
        "aircraft_type",
        "notes",
    ]] = [
        "Ibom Air",
        "Ibom Air",
        "Airbus",
        "A320",
        "Fixed Wing",
        "Recent current registration example",
    ]
    frame.loc[frame["suffix"] == "CCC", [
        "operator_address",
        "owner_address",
        "cor_number",
        "year_of_manufacture",
        "mtow_kg",
        "mtow_lbs",
        "engine_type",
        "engine_quantity",
        "type_of_operation",
        "certificate_holder_name",
        "certificate_holder_address",
        "registration_basis",
        "owner_same_as_holder",
        "field_sources_json",
    ]] = [
        "Victor Attah International Airport, Uyo",
        "Victor Attah International Airport, Uyo",
        "COR-CCC-024",
        "2019",
        "77000",
        "169756",
        "CFM56 / IAE V2500",
        "2",
        "CAT Scheduled",
        "Ibom Air",
        "Victor Attah International Airport, Uyo",
        "Ownership",
        True,
        json.dumps(["cor", "manual", "tcds"]),
    ]
    frame.loc[frame["suffix"] == "AAD", [
        "previous_owner",
        "release_date",
        "reuse_notice_status",
        "reuse_ready",
        "review_flag",
        "notes",
    ]] = [
        "Rano Air",
        pd.Timestamp(date(2012, 8, 14)),
        "Ready for Reuse",
        True,
        "",
        "Historical mark fully reviewed and ready for controlled reuse",
    ]
    frame.loc[frame["suffix"] == "ABE", [
        "previous_owner",
        "reuse_notice_status",
        "reuse_ready",
        "review_flag",
    ]] = [
        "Aero Contractors",
        "Pending Review",
        False,
        "Ownership evidence still being reconciled",
    ]
    frame.loc[frame["suffix"] == "ABB", [
        "previous_owner",
        "reuse_notice_status",
        "reuse_ready",
    ]] = [
        "Air Peace",
        "Call Logged",
        False,
    ]

    return frame.sort_values("suffix").reset_index(drop=True)


def load_registry() -> pd.DataFrame:
    frame = seed_registry()
    overrides = load_saved_overrides()
    if overrides.empty:
        return frame

    for _, row in overrides.iterrows():
        frame.loc[frame["suffix"] == row["suffix"], [
            "full_mark",
            "current_status",
            "aircraft_type",
            "manufacturer",
            "model",
            "serial_number",
            "owner",
            "operator",
            "registration_date",
            "operator_address",
            "owner_address",
            "cor_number",
            "year_of_manufacture",
            "mtow_kg",
            "mtow_lbs",
            "engine_type",
            "engine_quantity",
            "type_of_operation",
            "certificate_holder_name",
            "certificate_holder_address",
            "registration_basis",
            "owner_same_as_holder",
            "field_sources_json",
            "notes",
            "previously_used",
            "reuse_notice_status",
            "reuse_ready",
            "review_flag",
            "last_action",
            "last_action_on",
        ]] = [
            row["full_mark"],
            "Assigned",
            row["aircraft_type"],
            row["manufacturer"],
            row["model"],
            row["serial_number"],
            row["owner"],
            row["operator_name"],
            pd.Timestamp(row["registration_date"]),
            row["operator_address"],
            row["owner_address"],
            row["cor_number"],
            row["year_of_manufacture"],
            row["mtow_kg"],
            row["mtow_lbs"],
            row["engine_type"],
            row["engine_quantity"],
            row["type_of_operation"],
            row["certificate_holder_name"],
            row["certificate_holder_address"],
            row["registration_basis"],
            bool(row["owner_same_as_holder"]),
            row["field_sources_json"],
            row["reviewer_note"],
            False,
            "Not Applicable",
            False,
            "",
            "C of R upload confirmed",
            pd.Timestamp(row["saved_at"]),
        ]
    return frame


def metric_value(frame: pd.DataFrame, status: str) -> int:
    return int((frame["current_status"] == status).sum())


def recent_registrations(frame: pd.DataFrame, years: int) -> int:
    cutoff = pd.Timestamp(date.today() - timedelta(days=365 * years))
    return int((frame["registration_date"].notna() & (frame["registration_date"] >= cutoff)).sum())


def known_operators(frame: pd.DataFrame) -> list[str]:
    names = set(frame["operator"].dropna().tolist()) | set(frame["previous_owner"].dropna().tolist()) | set(KNOWN_OPERATORS)
    return sorted(name for name in names if name)


def current_operator_records(frame: pd.DataFrame, operator_name: str) -> pd.DataFrame:
    return frame[frame["operator"].fillna("").str.lower() == operator_name.lower()]


def historic_operator_records(frame: pd.DataFrame, operator_name: str) -> pd.DataFrame:
    return frame[frame["previous_owner"].fillna("").str.lower() == operator_name.lower()]


def history_count(frame: pd.DataFrame, operator_name: str) -> int:
    current = current_operator_records(frame, operator_name)
    historic = historic_operator_records(frame, operator_name)
    return int(len(pd.concat([current[["suffix"]], historic[["suffix"]]]).drop_duplicates()))


def reusable_candidates(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame[(frame["current_status"] == "Available") & (frame["previously_used"])].copy()
    result["display_status"] = result.apply(display_status, axis=1)
    return result.sort_values(["reuse_ready", "release_date"], ascending=[False, True])


def match_operator(text: str, frame: pd.DataFrame) -> str | None:
    normalized_text = normalize_text(text)
    operators = known_operators(frame)
    normalized_map = {normalize_text(operator): operator for operator in operators}

    for normalized_operator, original_operator in sorted(normalized_map.items(), key=lambda item: len(item[0]), reverse=True):
        if normalized_operator in normalized_text:
            return original_operator

    words = normalized_text.split()
    windows: list[str] = []
    max_window = min(4, len(words))
    for size in range(1, max_window + 1):
        for start in range(0, len(words) - size + 1):
            windows.append(" ".join(words[start:start + size]))

    for window in windows:
        matched = fuzzy_match_value(window, list(normalized_map.keys()), cutoff=0.72)
        if matched:
            return normalized_map[matched]

    direct = fuzzy_match_value(normalized_text, list(normalized_map.keys()), cutoff=0.72)
    if direct:
        return normalized_map[direct]

    for operator in operators:
        if operator.lower() in normalized_text:
            return operator
    return None


def answer_question(question: str, frame: pd.DataFrame) -> dict[str, str | bool]:
    text = question.strip()
    normalized_text = normalize_text(text)
    active_count = metric_value(frame, "Assigned")
    available_count = metric_value(frame, "Available")
    reserved_count = metric_value(frame, "Reserved")
    recent_five = recent_registrations(frame, 5)
    reusable_ready = int(reusable_candidates(frame)["reuse_ready"].sum())
    operator = match_operator(text, frame)

    if similar_phrase_in_text(normalized_text, ["registered planes", "active aircraft", "currently registered", "current registered planes", "current aircraft total"]):
        return {
            "supported": True,
            "answer": f"There are {active_count} currently assigned aircraft in this demo dataset.",
            "basis": "Count registration marks where current status is Assigned.",
        }
    if similar_phrase_in_text(normalized_text, ["last 5 years", "last five years", "past 5 years", "past five years", "recent registrations"]):
        return {
            "supported": True,
            "answer": f"There are {recent_five} aircraft registrations in the last 5 years in this demo dataset.",
            "basis": "Count registrations with a registration date within the last five years.",
        }
    if similar_phrase_in_text(normalized_text, ["available marks", "available registration marks", "free marks", "unused marks"]):
        return {
            "supported": True,
            "answer": f"There are {available_count} available registration marks, including reusable marks with prior history.",
            "basis": "Count marks where current status is Available, then keep previously used marks visible rather than deleting their history.",
        }
    if similar_phrase_in_text(normalized_text, ["reserved marks", "special marks", "reserved special marks", "marks on hold"]):
        return {
            "supported": True,
            "answer": f"There are {reserved_count} reserved special marks in the current demo data.",
            "basis": "Count marks where current status is Reserved.",
        }
    if similar_phrase_in_text(normalized_text, ["ready for reuse", "reusable marks", "available again", "historical marks ready"]):
        preview = reusable_candidates(frame)
        ready_marks = preview[preview["reuse_ready"]]["full_mark"].head(5).tolist()
        mark_text = ", ".join(ready_marks) if ready_marks else "No marks are currently flagged ready."
        return {
            "supported": True,
            "answer": f"{reusable_ready} historical marks are currently flagged ready for reuse. Example marks: {mark_text}",
            "basis": "Count available marks with previous history where the reuse review state is marked Ready for Reuse.",
        }
    if operator and similar_phrase_in_text(normalized_text, ["history", "their history", "ever registered", "in history", "all time"]):
        return {
            "supported": True,
            "answer": f"{operator} appears in {history_count(frame, operator)} registrations across current and historical records in this demo dataset.",
            "basis": "Combine current operator records and previous-owner records, then deduplicate by registration mark.",
        }
    if operator and similar_phrase_in_text(normalized_text, ["current", "running", "active", "currently have", "current fleet"]):
        current_total = len(current_operator_records(frame, operator))
        return {
            "supported": True,
            "answer": f"{operator} currently has {current_total} active registrations in this demo dataset.",
            "basis": "Count records where the current operator matches the requested operator and status is Assigned.",
        }
    if operator:
        current_total = len(current_operator_records(frame, operator))
        total = history_count(frame, operator)
        return {
            "supported": True,
            "answer": f"{operator} has {current_total} current registrations and {total} current-plus-historical registrations in this demo dataset.",
            "basis": "Show both current operator count and current-plus-historical mark count for the selected operator.",
        }

    return {
        "supported": False,
        "answer": "This demo assistant only answers approved registry questions. Please use one of the supported examples below.",
        "basis": "Unsupported questions are intentionally refused so the assistant does not guess or hallucinate.",
    }


def filtered_registry(frame: pd.DataFrame, status_filter: str, search_text: str, operator_filter: str) -> pd.DataFrame:
    result = frame.copy()
    if status_filter == "Available Again":
        result = result[(result["current_status"] == "Available") & (result["previously_used"])]
    elif status_filter != "All":
        result = result[result["current_status"] == status_filter]

    if operator_filter != "All":
        result = result[
            (result["operator"] == operator_filter)
            | (result["previous_owner"] == operator_filter)
        ]

    if search_text:
        text = search_text.strip().upper().replace("5N-", "")
        result = result[
            result["suffix"].str.contains(text, na=False)
            | result["full_mark"].str.contains(text, na=False)
            | result["owner"].str.upper().str.contains(text, na=False)
            | result["operator"].str.upper().str.contains(text, na=False)
            | result["previous_owner"].str.upper().str.contains(text, na=False)
            | result["serial_number"].str.upper().str.contains(text, na=False)
            | result["cor_number"].str.upper().str.contains(text, na=False)
            | result["certificate_holder_name"].str.upper().str.contains(text, na=False)
            | result["operator_address"].str.upper().str.contains(text, na=False)
            | result["owner_address"].str.upper().str.contains(text, na=False)
        ]

        if result.empty:
            mark_guess = fuzzy_match_value(
                normalize_mark_input(search_text),
                frame["suffix"].tolist(),
                cutoff=0.67,
            )
            if mark_guess:
                result = frame[frame["suffix"] == mark_guess]

        if result.empty:
            operator_guess = match_operator(search_text, frame)
            if operator_guess:
                result = frame[
                    (frame["operator"] == operator_guess)
                    | (frame["previous_owner"] == operator_guess)
                ]

    result = result.copy()
    result["display_status"] = result.apply(display_status, axis=1)
    return result


def mark_timeline(record: pd.Series) -> pd.DataFrame:
    events: list[dict[str, str]] = []

    if pd.notna(record["release_date"]):
        previous_span = 4 + int(record["previous_assignment_count"])
        original_assignment = record["release_date"] - pd.Timedelta(days=365 * previous_span)
        events.append(
            {
                "date": format_date(original_assignment),
                "action": "Original assignment created",
                "note": f"Mark assigned to {record['previous_owner'] or 'legacy owner'}",
            }
        )
        events.append(
            {
                "date": format_date(record["release_date"]),
                "action": "Mark released / deregistered",
                "note": "Historical assignment closed and mark returned for review",
            }
        )

    if pd.notna(record["registration_date"]):
        events.append(
            {
                "date": format_date(record["registration_date"]),
                "action": "Current assignment created",
                "note": f"Assigned to {record['operator'] or record['owner']}",
            }
        )

    events.append(
        {
            "date": format_date(record["last_action_on"]),
            "action": str(record["last_action"]),
            "note": str(record["notes"]),
        }
    )

    timeline = pd.DataFrame(events).drop_duplicates()
    return timeline.sort_values("date", ascending=False).reset_index(drop=True)


def render_mark_header(record: pd.Series) -> None:
    chips = [
        f'<span class="status-chip {status_class(record)}">{display_status(record)}</span>'
    ]
    if bool(record["special_mark"]):
        chips.append('<span class="status-chip special">Special Mark</span>')
    if bool(record["previously_used"]):
        chips.append('<span class="status-chip available-again">Previous Owner History Stored</span>')

    st.markdown(f"### {record['full_mark']}")
    st.markdown("".join(chips), unsafe_allow_html=True)


def render_mark_detail(frame: pd.DataFrame, query: str) -> None:
    cleaned = normalize_mark_input(query)
    if not cleaned:
        st.info("Enter a registration mark like 5N-ABC or ABC.")
        return

    match = frame[frame["suffix"] == cleaned]
    matched_label = cleaned
    used_fuzzy_match = False
    if match.empty:
        fuzzy = fuzzy_match_value(cleaned, frame["suffix"].tolist(), cutoff=0.67)
        if fuzzy:
            match = frame[frame["suffix"] == fuzzy]
            matched_label = fuzzy
            used_fuzzy_match = True
        else:
            st.error("Registration mark not found.")
            return

    record = match.iloc[0]
    if used_fuzzy_match and matched_label != cleaned:
        st.caption(f"Showing closest match for `{query}`: `{record['full_mark']}`")
    render_mark_header(record)

    if record["current_status"] == "Available" and bool(record["previously_used"]):
        info_panel(
            "Reuse review view",
            f"{record['full_mark']} is available again, but its previous owner history is preserved. Current notice state: {record['reuse_notice_status']}.",
            tone="gold",
        )
    elif record["current_status"] == "Reserved":
        info_panel(
            "Reserved mark",
            f"{record['full_mark']} is currently held as a special mark pending payment and approval workflow.",
            tone="navy",
        )
    else:
        info_panel(
            "Current assignment snapshot",
            f"{record['full_mark']} is currently mapped to {record['operator'] or record['owner'] or 'an internal placeholder record'} in the demo dataset.",
            tone="green",
        )

    col1, col2, col3, col4 = st.columns(4)
    metric_card(col1, "Current Status", display_status(record), "Current lifecycle state", "blue")
    metric_card(
        col2,
        "Previous Uses",
        str(record["previous_assignment_count"]),
        "Historical assignments retained",
        "slate",
    )
    metric_card(
        col3,
        "Notice State",
        str(record["reuse_notice_status"]),
        "Reuse control workflow",
        "gold",
    )
    metric_card(
        col4,
        "Last Action",
        format_date(record["last_action_on"]),
        str(record["last_action"]),
        "green",
    )

    left, right = st.columns([1.1, 0.9])
    with left:
        st.subheader("Record Details")
        details = pd.DataFrame(
            [
                ("Aircraft Type", record["aircraft_type"] or "-"),
                ("Manufacturer", record["manufacturer"] or "-"),
                ("Model", record["model"] or "-"),
                ("Serial Number", record["serial_number"] or "-"),
                ("C of R Number", record["cor_number"] or "-"),
                ("Date of Issue of C of R", format_date(record["registration_date"])),
                ("Year of Manufacture", record["year_of_manufacture"] or "-"),
                ("Owner", record["owner"] or "-"),
                ("Owner Address", record["owner_address"] or "-"),
                ("Operator", record["operator"] or "-"),
                ("Operator Address", record["operator_address"] or "-"),
                ("Certificate Holder", record["certificate_holder_name"] or "-"),
                ("Certificate Holder Address", record["certificate_holder_address"] or "-"),
                ("Registration Basis", record["registration_basis"] or "-"),
                ("Owner Same As Holder", "Yes" if bool(record["owner_same_as_holder"]) else "No"),
                ("Type of Operation", record["type_of_operation"] or "-"),
                ("MTOW (kg)", record["mtow_kg"] or "-"),
                ("MTOW (lbs)", record["mtow_lbs"] or "-"),
                ("Engine Type", record["engine_type"] or "-"),
                ("Engine Quantity", record["engine_quantity"] or "-"),
                ("Release Date", format_date(record["release_date"])),
                ("Previous Owner", record["previous_owner"] or "-"),
                ("Data Sources", format_sources(record["field_sources_json"])),
                ("Review Flag", record["review_flag"] or "-"),
            ],
            columns=["Field", "Value"],
        )
        st.dataframe(details, width="stretch", hide_index=True)

    with right:
        st.subheader("Recommended Action")
        if record["current_status"] == "Assigned":
            info_panel(
                "Operational next step",
                "Inspectors can verify the current aircraft, operator, and document references without checking multiple spreadsheets.",
                tone="navy",
            )
        elif record["current_status"] == "Reserved":
            info_panel(
                "Operational next step",
                "Keep the mark on hold until payment, approval, and reservation validation are complete.",
                tone="gold",
            )
        elif bool(record["reuse_ready"]):
            info_panel(
                "Operational next step",
                "This mark can move to controlled reassignment after final supervisor acknowledgement.",
                tone="green",
            )
        else:
            info_panel(
                "Operational next step",
                "Complete previous-owner contact and supervisor review before placing this mark back into circulation.",
                tone="slate",
            )

        st.subheader("History Timeline")
        st.dataframe(mark_timeline(record), width="stretch", hide_index=True)


def recent_activity(frame: pd.DataFrame) -> pd.DataFrame:
    assigned = frame[frame["registration_date"].notna()][["full_mark", "last_action_on", "last_action"]]
    reusable = frame[frame["previously_used"]][["full_mark", "last_action_on", "last_action"]]
    reserved = frame[frame["special_mark"]][["full_mark", "last_action_on", "last_action"]]
    log = pd.concat([assigned, reusable, reserved], ignore_index=True).dropna(subset=["last_action_on"])
    log = log.sort_values("last_action_on", ascending=False).head(10).copy()
    log["last_action_on"] = log["last_action_on"].apply(format_date)
    log.columns = ["Mark", "Date", "Action"]
    return log


def render_reuse_workflow(record: pd.Series) -> None:
    history_review_ready = True
    notice_ready = record["reuse_notice_status"] in {"Call Logged", "Email Drafted", "Ready for Reuse"}
    supervisor_ready = bool(record["reuse_ready"]) and not bool(record["review_flag"])
    market_ready = bool(record["reuse_ready"])
    stages = [
        ("Historical Review", history_review_ready, "Legacy paper and spreadsheet references linked."),
        ("Previous Owner Notice", notice_ready, f"Current state: {record['reuse_notice_status']}."),
        ("Supervisor Clearance", supervisor_ready, record["review_flag"] or "No open review flags."),
        ("Release To Market", market_ready, "Mark can be offered once internal approval is complete."),
    ]

    cols = st.columns(4)
    for col, (title, ready, body) in zip(cols, stages):
        css_class = "ready" if ready else "pending"
        col.markdown(
            f"""
            <div class="stage-card {css_class}">
                <div class="stage-label">Workflow Stage</div>
                <div class="stage-title">{title}</div>
                <div class="stage-body">{body}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_dashboard(frame: pd.DataFrame) -> None:
    assigned = metric_value(frame, "Assigned")
    available = metric_value(frame, "Available")
    reserved = metric_value(frame, "Reserved")
    reusable = int(((frame["current_status"] == "Available") & frame["previously_used"]).sum())
    recent = recent_registrations(frame, 5)
    ready_for_reuse = int(reusable_candidates(frame)["reuse_ready"].sum())

    kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
    metric_card(kpi1, "Registry Coverage", "17,576", "All marks from 5N-AAA to 5N-ZZZ preloaded", "blue")
    metric_card(kpi2, "Assigned", f"{assigned:,}", "Current active registrations", "green")
    metric_card(kpi3, "Available", f"{available:,}", "Includes unused and reusable marks", "slate")
    metric_card(kpi4, "Reusable", f"{reusable:,}", f"{ready_for_reuse:,} ready for controlled reuse", "gold")
    metric_card(kpi5, "Last 5 Years", f"{recent:,}", "Recent registration activity", "red")

    left, right = st.columns([1.1, 0.9])
    with left:
        st.subheader("Registry Status Overview")
        status_counts = frame.apply(display_status, axis=1).value_counts().rename_axis("status").reset_index(name="count")
        st.bar_chart(status_counts.set_index("status"))

    with right:
        st.subheader("Top Current Operators")
        operator_counts = (
            frame[frame["current_status"] == "Assigned"]
            .groupby("operator")
            .size()
            .sort_values(ascending=False)
            .head(6)
            .rename("count")
            .reset_index()
        )
        st.bar_chart(operator_counts.set_index("operator"))

    insight_col, story_col = st.columns([1, 1])
    with insight_col:
        info_panel(
            "Executive takeaway",
            "The strongest business value is not just digitization. It is controlled reuse visibility, faster inspector answers, and cleaner operational traceability.",
            tone="navy",
        )
        info_panel(
            "Presentation shortcut",
            "Use the Search tab to compare one assigned mark, one reusable historical mark, and one reserved special mark. That tells the whole story quickly.",
            tone="green",
        )

    with story_col:
        st.subheader("Recent Registry Activity")
        st.dataframe(recent_activity(frame), width="stretch", hide_index=True)


def render_search_tab(frame: pd.DataFrame) -> None:
    st.subheader("Registration Search")
    st.caption("Use scenario shortcuts to walk through assigned, reusable, reserved, and fresh marks during the demo. Search is case-insensitive and tolerant of small typing mistakes.")

    if "search_query" not in st.session_state:
        st.session_state["search_query"] = "5N-ABC"

    cols = st.columns(len(SCENARIO_MARKS))
    for col, (label, mark) in zip(cols, SCENARIO_MARKS.items()):
        if col.button(label, width="stretch"):
            st.session_state["search_query"] = mark

    st.text_input("Search for a registration mark", key="search_query")
    render_mark_detail(frame, st.session_state["search_query"])


def render_reuse_tab(frame: pd.DataFrame) -> None:
    candidates = reusable_candidates(frame)
    st.subheader("Reusable Mark Review")
    st.caption("This workflow highlights older marks that are available again, while preserving previous-owner history and review status.")

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    metric_card(kpi1, "Reusable Marks", f"{len(candidates):,}", "Historical marks now available", "gold")
    metric_card(kpi2, "Ready Now", f"{int(candidates['reuse_ready'].sum()):,}", "Reusable marks cleared for next step", "green")
    metric_card(
        kpi3,
        "Pending Contact",
        f"{int((candidates['reuse_notice_status'] == 'Pending Review').sum()):,}",
        "Marks still awaiting review/contact",
        "slate",
    )
    metric_card(
        kpi4,
        "Review Flags",
        f"{int(candidates['review_flag'].fillna('').ne('').sum()):,}",
        "Cases that still need supervisor attention",
        "red",
    )

    selected_mark = st.selectbox("Reusable mark under review", options=candidates["full_mark"].tolist(), index=0)
    record = candidates[candidates["full_mark"] == selected_mark].iloc[0]
    render_mark_header(record)
    render_reuse_workflow(record)

    left, right = st.columns([0.95, 1.05])
    with left:
        info_panel(
            "Reuse recommendation",
            (
                f"{record['full_mark']} previously belonged to {record['previous_owner']} and "
                f"was released on {format_date(record['release_date'])}. Current workflow state: {record['reuse_notice_status']}."
            ),
            tone="gold",
        )
        details = pd.DataFrame(
            [
                ("Previous owner", record["previous_owner"] or "-"),
                ("Release date", format_date(record["release_date"])),
                ("Historical assignment count", str(record["previous_assignment_count"])),
                ("Review flag", record["review_flag"] or "-"),
                ("Reuse ready", "Yes" if bool(record["reuse_ready"]) else "No"),
                ("Notes", record["notes"]),
            ],
            columns=["Field", "Value"],
        )
        st.dataframe(details, width="stretch", hide_index=True)

    with right:
        st.subheader("Top reusable candidates")
        candidate_table = candidates[
            [
                "full_mark",
                "previous_owner",
                "release_date",
                "reuse_notice_status",
                "reuse_ready",
                "review_flag",
            ]
        ].head(12).copy()
        candidate_table["release_date"] = candidate_table["release_date"].apply(format_date)
        st.dataframe(candidate_table, width="stretch", hide_index=True)
        st.download_button(
            "Download reusable marks snapshot",
            candidate_table.to_csv(index=False).encode("utf-8"),
            file_name="reusable_marks_demo.csv",
            mime="text/csv",
            width="stretch",
        )


def render_operator_tab(frame: pd.DataFrame) -> None:
    operators = known_operators(frame)
    st.subheader("Operator Analytics")
    st.caption("This view shows the kind of quick intelligence inspectors and managers can get without manual counting in Excel.")

    selected_operator = st.selectbox("Operator", options=operators, index=operators.index("Rano Air") if "Rano Air" in operators else 0)
    current = current_operator_records(frame, selected_operator)
    historic = historic_operator_records(frame, selected_operator)
    combined = pd.concat([current, historic]).drop_duplicates(subset=["suffix"])
    last_five_cutoff = pd.Timestamp(date.today() - timedelta(days=365 * 5))
    current_recent = int((current["registration_date"].notna() & (current["registration_date"] >= last_five_cutoff)).sum())

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    metric_card(kpi1, "Current Active", f"{len(current):,}", "Marks currently assigned to this operator", "blue")
    metric_card(kpi2, "Historical Reach", f"{len(combined):,}", "Current plus historical appearances", "gold")
    metric_card(kpi3, "Last 5 Years", f"{current_recent:,}", "Recent registrations for this operator", "green")
    metric_card(
        kpi4,
        "Fleet Mix",
        f"{current['model'].replace('', pd.NA).dropna().nunique():,}",
        "Distinct active aircraft models",
        "slate",
    )

    left, right = st.columns([1, 1])
    with left:
        st.subheader("Current Fleet Mix")
        if not current.empty:
            fleet_mix = current.groupby("model").size().sort_values(ascending=False).rename("count").to_frame()
            st.bar_chart(fleet_mix)
        else:
            st.info("No active records for this operator in the demo dataset.")

    with right:
        st.subheader("Registration Timeline")
        if not current.empty:
            timeline = current.copy()
            timeline["year"] = timeline["registration_date"].dt.year
            yearly = timeline.groupby("year").size().rename("registrations").to_frame()
            st.line_chart(yearly)
        else:
            st.info("No registration timeline available for this operator in the demo dataset.")

    table_left, table_right = st.columns([1, 1])
    with table_left:
        st.subheader("Current Records")
        current_table = current[
            ["full_mark", "manufacturer", "model", "cor_number", "registration_date", "owner"]
        ].copy()
        if not current_table.empty:
            current_table["registration_date"] = current_table["registration_date"].apply(format_date)
            st.dataframe(current_table, width="stretch", hide_index=True)
        else:
            st.info("No current records to show.")

    with table_right:
        st.subheader("Historical Records")
        historic_table = historic[
            ["full_mark", "previous_owner", "release_date", "reuse_notice_status", "review_flag"]
        ].copy()
        if not historic_table.empty:
            historic_table["release_date"] = historic_table["release_date"].apply(format_date)
            st.dataframe(historic_table, width="stretch", hide_index=True)
        else:
            st.info("No historical records to show.")


def render_table_tab(frame: pd.DataFrame) -> None:
    st.subheader("Registry Table")
    st.caption("This is the Excel replacement view: full mark inventory, filterable statuses, quick export, and forgiving search for minor typing errors.")

    filter_col1, filter_col2, filter_col3 = st.columns([0.9, 1.1, 1.2])
    with filter_col1:
        status_filter = st.selectbox("Status", ["All", "Assigned", "Available", "Available Again", "Reserved"])
    with filter_col2:
        operator_options = ["All"] + known_operators(frame)
        operator_filter = st.selectbox("Operator / Historical Owner", operator_options)
    with filter_col3:
        search_text = st.text_input("Search table", placeholder="Mark, owner, previous owner, or serial number")

    result = filtered_registry(frame, status_filter, search_text, operator_filter)
    display_frame = result[
        [
            "full_mark",
            "display_status",
            "operator",
            "owner",
            "manufacturer",
            "model",
            "cor_number",
            "type_of_operation",
            "registration_date",
            "serial_number",
        ]
    ].copy()
    display_frame["registration_date"] = display_frame["registration_date"].apply(format_date)
    display_frame.columns = [
        "Mark",
        "Status",
        "Operator",
        "Owner",
        "Manufacturer",
        "Model",
        "C of R Number",
        "Type of Operation",
        "Date of Issue of C of R",
        "Serial Number",
    ]

    st.write(f"Showing {len(display_frame):,} marks")
    st.dataframe(display_frame, width="stretch", hide_index=True)
    st.download_button(
        "Download registry snapshot",
        display_frame.to_csv(index=False).encode("utf-8"),
        file_name="registry_demo_snapshot.csv",
        mime="text/csv",
    )


def render_upload_tab() -> None:
    st.subheader("C of R Upload Review")
    st.caption(
        "Version 3 keeps the same guided review flow, but now captures the real Excel-style registry headings and optionally uses TCDS support for technical fields."
    )

    cor_file = st.file_uploader("Upload C of R scan or PDF", type=["png", "jpg", "jpeg", "pdf"], key="cor_upload_v3")
    supporting_file = st.file_uploader(
        "Optional: Upload C of R application / TCDS / supporting reference",
        type=["png", "jpg", "jpeg", "pdf"],
        key="tcds_upload_v3",
    )

    upload_signature = f"{uploaded_file_signature(cor_file)}|{uploaded_file_signature(supporting_file)}"
    if st.session_state.get("v3_upload_signature") != upload_signature:
        st.session_state["v3_upload_signature"] = upload_signature
        st.session_state["v3_extraction_result"] = None

    extract_disabled = cor_file is None and supporting_file is None
    option_col, extract_col, hint_col = st.columns([0.33, 0.25, 0.42])
    with option_col:
        use_scan_ocr = st.checkbox(
            "Preprocess scans and run OCR",
            value=True,
            disabled=extract_disabled,
            help="Uses PyMuPDF/Pillow/OpenCV/Tesseract when available to clean scanned pages before text extraction.",
        )
    with extract_col:
        begin_extraction = st.button("Begin Extraction", disabled=extract_disabled, type="primary", width="stretch")
    with hint_col:
        if extract_disabled:
            st.caption("Upload at least one document before starting extraction.")
        else:
            st.caption("Extraction runs first; the reviewer still confirms spelling, dates, and classifications before saving.")

    if begin_extraction:
        st.session_state["v3_extraction_result"] = build_document_extraction(cor_file, supporting_file, use_scan_ocr)

    extraction_result = st.session_state.get("v3_extraction_result") or {}
    field_defaults = extraction_result.get("fields", {}) if isinstance(extraction_result, dict) else {}
    left, right = st.columns([0.95, 1.05])

    with left:
        st.markdown("#### Source Documents")
        st.dataframe(pd.DataFrame(uploaded_document_rows(cor_file, supporting_file)), width="stretch", hide_index=True)
        st.markdown("#### OCR Readiness")
        st.dataframe(pd.DataFrame(dependency_status_rows()), width="stretch", hide_index=True)
        if cor_file is not None and cor_file.type.startswith("image/"):
            st.image(cor_file, caption="C of R preview", width="stretch")
        elif cor_file is not None:
            info_panel(
                "C of R uploaded",
                "The certificate file is available for structured review. In production, field extraction would be anchor-based against the known C of R layout.",
                tone="navy",
            )
        else:
            info_panel(
                "Waiting for C of R",
                "Upload a scan or PDF of the Certificate of Registration to begin the review workflow.",
                tone="slate",
            )

        if supporting_file is not None:
            info_panel(
                "Supporting file available",
                "The application, TCDS, or technical reference can support operator details, MTOW, engine type, engine quantity, and operational classification.",
                tone="green",
            )
        else:
            info_panel(
                "No supporting file uploaded yet",
                "You can still save the record manually, but the application, TCDS, or type reference helps populate missing fields more confidently.",
                tone="gold",
            )

        confidence = pd.DataFrame(
            [
                ("Registration mark", "High from C of R"),
                ("Certificate holder and address", "High from C of R"),
                ("C of R number and issue date", "High from C of R"),
                ("Owner if different", "Conditional from C of R"),
                ("Year of manufacture", "High when present on C of R"),
                ("MTOW / engine data", "Prefer TCDS or technical file"),
                ("Type of operation", "Manual classification"),
            ],
            columns=["Field", "Expected Source"],
        )
        st.markdown("#### Extraction and Enrichment Strategy")
        st.dataframe(confidence, width="stretch", hide_index=True)

        if extraction_result:
            st.markdown("#### Extraction Result")
            result_rows = pd.DataFrame(extraction_result.get("rows", []))
            detected_count = int((result_rows["Status"] == "Detected").sum()) if not result_rows.empty else 0
            review_count = int((result_rows["Status"] != "Detected").sum()) if not result_rows.empty else 0
            metric_left, metric_right = st.columns(2)
            metric_left.metric("Detected Fields", detected_count)
            metric_right.metric("Needs Review", review_count)
            st.dataframe(result_rows, width="stretch", hide_index=True)

            missing_rows = pd.DataFrame(extraction_result.get("missing_rows", []))
            st.markdown("#### Missing Fields Checklist")
            if missing_rows.empty:
                st.success("All key fields were detected. Reviewer confirmation is still required before saving.")
            else:
                st.warning(f"{len(missing_rows)} fields still need review or manual confirmation.")
                st.dataframe(missing_rows, width="stretch", hide_index=True)

            preview_images = extraction_result.get("preview_images", [])
            if preview_images:
                st.markdown("#### Scan Preprocessing Preview")
                preview_cols = st.columns(2)
                for index, preview in enumerate(preview_images[:6]):
                    with preview_cols[index % 2]:
                        st.image(preview["image"], caption=str(preview["caption"]), width="stretch")

            for warning in extraction_result.get("warnings", []):
                st.warning(warning)
            text_preview = str(extraction_result.get("text_preview", ""))
            if text_preview:
                st.text_area("Extracted text preview", value=text_preview, height=180, disabled=True)
        elif not extract_disabled:
            info_panel(
                "Ready to extract",
                "Click Begin Extraction after uploading the C of R and optional application/supporting file.",
                tone="navy",
            )

    with right:
        st.markdown("#### Reviewed Record")
        with st.form("ocr_preview_form_v3"):
            st.markdown("##### Aircraft Identity")
            col1, col2, col3 = st.columns(3)
            default_aircraft_type = str(field_defaults.get("aircraft_type", "Fixed Wing"))
            aircraft_type_index = KNOWN_AIRCRAFT_TYPES.index(default_aircraft_type) if default_aircraft_type in KNOWN_AIRCRAFT_TYPES else 0
            with col1:
                full_mark = st.text_input("Registration Mark", value=str(field_defaults.get("full_mark", "5N-AUV")))
                manufacturer = st.text_input("Manufacturer", value=str(field_defaults.get("manufacturer", "RUAG Aerospace Services GmbH")))
            with col2:
                model = st.text_input("Aircraft Designation / Model", value=str(field_defaults.get("model", "Dornier 228-201")))
                serial_number = st.text_input("Serial Number", value=str(field_defaults.get("serial_number", "7011")))
            with col3:
                aircraft_type = st.selectbox("Aircraft Type", KNOWN_AIRCRAFT_TYPES, index=aircraft_type_index)
                year_of_manufacture = st.text_input("Year of Manufacture", value=str(field_defaults.get("year_of_manufacture", "1985")))

            st.markdown("##### Certificate Data")
            cert1, cert2, cert3 = st.columns(3)
            default_cor_date = field_defaults.get("cor_date", date(2024, 12, 13))
            if not isinstance(default_cor_date, date):
                default_cor_date = date(2024, 12, 13)
            default_basis = str(field_defaults.get("registration_basis", "Ownership"))
            basis_index = REGISTRATION_BASIS_OPTIONS.index(default_basis) if default_basis in REGISTRATION_BASIS_OPTIONS else 0
            with cert1:
                cor_number = st.text_input("C of R Number", value=str(field_defaults.get("cor_number", "662")))
            with cert2:
                cor_date = st.date_input("Date of Issue of C of R", value=default_cor_date)
            with cert3:
                registration_basis = st.selectbox("Registration Basis", REGISTRATION_BASIS_OPTIONS, index=basis_index)

            st.markdown("##### Certificate Holder and Ownership")
            holder1, holder2 = st.columns(2)
            with holder1:
                certificate_holder_name = st.text_input(
                    "Certificate Holder",
                    value=str(field_defaults.get("certificate_holder_name", "Brinkle Aero Flying Club")),
                )
                certificate_holder_address = st.text_area(
                    "Certificate Holder Address",
                    value=str(field_defaults.get("certificate_holder_address", "Hangar 2, Kaduna International Airport, Kaduna")),
                    height=90,
                )
            with holder2:
                operator_name = st.text_input(
                    "Registered Operator",
                    value=str(field_defaults.get("operator_name", "Brinkle Aero Flying Club")),
                )
                operator_address = st.text_area(
                    "Address of Registered Operator",
                    value=str(field_defaults.get("operator_address", "Hangar 2, Kaduna International Airport, Kaduna")),
                    height=90,
                )

            owner_same_as_holder = st.checkbox(
                "Registered owner is the same as the certificate holder",
                value=bool(field_defaults.get("owner_same_as_holder", True)),
            )
            owner1, owner2 = st.columns(2)
            with owner1:
                owner = st.text_input("Registered Owner", value=str(field_defaults.get("owner", "Brinkle Aero Flying Club")))
            with owner2:
                owner_address = st.text_area(
                    "Address of Registered Owner",
                    value=str(field_defaults.get("owner_address", "Hangar 2, Kaduna International Airport, Kaduna")),
                    height=90,
                )

            st.markdown("##### Technical Data")
            technical_hint = technical_defaults_for(
                canonicalize_manufacturer(manufacturer),
                canonicalize_model(model),
            )
            if technical_hint:
                info_panel(
                    "Technical defaults available",
                    (
                        f"Reference defaults found for {canonicalize_manufacturer(manufacturer)} {canonicalize_model(model)}. "
                        "If MTOW or engine fields are left blank, Version 3 can backfill them from the lookup/TCDS-assisted reference."
                    ),
                    tone="navy",
                )

            tech1, tech2, tech3, tech4 = st.columns(4)
            with tech1:
                mtow_kg = st.text_input("MTOW (kg)", value=str(field_defaults.get("mtow_kg") or technical_hint.get("mtow_kg", "")))
            with tech2:
                mtow_lbs = st.text_input("MTOW (lbs)", value=str(field_defaults.get("mtow_lbs") or technical_hint.get("mtow_lbs", "")))
            with tech3:
                engine_type = st.text_input("Engine Type", value=str(field_defaults.get("engine_type") or technical_hint.get("engine_type", "")))
            with tech4:
                engine_quantity = st.text_input(
                    "Engine Quantity",
                    value=str(field_defaults.get("engine_quantity") or technical_hint.get("engine_quantity", "")),
                )

            st.markdown("##### Operations and Audit")
            ops1, ops2 = st.columns(2)
            default_operation = str(field_defaults.get("type_of_operation", "General Aviation"))
            operation_index = TYPE_OF_OPERATION_OPTIONS.index(default_operation) if default_operation in TYPE_OF_OPERATION_OPTIONS else 2
            with ops1:
                type_of_operation = st.selectbox("Type of Operation", TYPE_OF_OPERATION_OPTIONS, index=operation_index)
                reviewer = st.text_input("Inspector / Reviewer", value="DAWS Demo Reviewer")
            with ops2:
                reviewer_note = st.text_area(
                    "Remarks by Inspector Uploading",
                    value="Confirmed against the C of R. Technical values should be checked against TCDS before operational use.",
                    height=110,
                )

            checks_left, checks_right = st.columns(2)
            with checks_left:
                check_scan = st.checkbox("Verified against C of R", value=True)
                check_supporting = st.checkbox("Verified against supporting file / TCDS where needed", value=True)
            with checks_right:
                check_spelling = st.checkbox("Confirmed spelling and numeric values", value=True)
                check_sensitive = st.checkbox("Ready to create audit entry", value=True)

            confirmed = st.form_submit_button("Confirm and Save")
            if confirmed:
                if not all([check_scan, check_supporting, check_spelling, check_sensitive]):
                    st.warning("All review confirmations must be checked before the demo save can proceed.")
                else:
                    normalized_mark, suffix = canonicalize_full_mark(full_mark)
                    cleaned_manufacturer = canonicalize_manufacturer(manufacturer)
                    cleaned_model = canonicalize_model(model)
                    default_technical = technical_defaults_for(cleaned_manufacturer, cleaned_model)
                    cleaned_aircraft_type = canonicalize_aircraft_type(aircraft_type) or default_technical.get("aircraft_type", "Fixed Wing")
                    cleaned_serial = canonicalize_serial_number(serial_number)
                    cleaned_cor_number = canonicalize_cor_number(cor_number)
                    cleaned_basis = canonicalize_registration_basis(registration_basis)
                    cleaned_year = canonicalize_year(year_of_manufacture)
                    cleaned_holder = canonicalize_operator_name(certificate_holder_name)
                    cleaned_holder_address = canonicalize_address(certificate_holder_address)
                    cleaned_operator = canonicalize_operator_name(operator_name or certificate_holder_name)
                    cleaned_operator_address = canonicalize_address(operator_address or certificate_holder_address)

                    if owner_same_as_holder:
                        cleaned_owner = cleaned_holder
                        cleaned_owner_address = cleaned_holder_address
                    else:
                        cleaned_owner = canonicalize_operator_name(owner)
                        cleaned_owner_address = canonicalize_address(owner_address)

                    mtow_kg_value, mtow_lbs_value = compute_mtow_pair(
                        mtow_kg or default_technical.get("mtow_kg", ""),
                        mtow_lbs or default_technical.get("mtow_lbs", ""),
                    )
                    cleaned_engine_type = canonicalize_engine_type(engine_type or default_technical.get("engine_type", ""))
                    cleaned_engine_quantity = canonicalize_integer_text(engine_quantity or default_technical.get("engine_quantity", ""))
                    cleaned_operation = canonicalize_type_of_operation(type_of_operation)
                    cleaned_reviewer = smart_title_case(reviewer)
                    cleaned_note = canonicalize_note(reviewer_note)

                    validation_errors: list[str] = []
                    if not normalized_mark or not suffix:
                        validation_errors.append("Registration mark must resolve to a valid format like 5N-ABC.")
                    else:
                        registry = load_registry()
                        if suffix not in registry["suffix"].tolist():
                            validation_errors.append("Registration mark does not exist in the master AAA to ZZZ registry.")
                    if not cleaned_manufacturer:
                        validation_errors.append("Manufacturer is required.")
                    if not cleaned_model:
                        validation_errors.append("Aircraft designation / model is required.")
                    if not cleaned_serial:
                        validation_errors.append("Serial number is required.")
                    if not cleaned_cor_number:
                        validation_errors.append("C of R number is required.")
                    if not cleaned_holder:
                        validation_errors.append("Certificate holder is required.")
                    if not cleaned_operator:
                        validation_errors.append("Registered operator is required.")
                    if not cleaned_owner:
                        validation_errors.append("Registered owner is required.")
                    if year_of_manufacture and not cleaned_year:
                        validation_errors.append("Year of manufacture must be a valid 4-digit year.")
                    if mtow_kg and not mtow_kg_value:
                        validation_errors.append("MTOW (kg) must be numeric if provided.")
                    if mtow_lbs and not mtow_lbs_value:
                        validation_errors.append("MTOW (lbs) must be numeric if provided.")
                    if engine_quantity and not cleaned_engine_quantity:
                        validation_errors.append("Engine quantity must be numeric if provided.")
                    if not cleaned_operation:
                        validation_errors.append("Type of operation must be selected from the approved list.")
                    if not cleaned_reviewer:
                        validation_errors.append("Inspector / reviewer name is required.")

                    if validation_errors:
                        for error in validation_errors:
                            st.error(error)
                    else:
                        payload = {
                            "full_mark": normalized_mark,
                            "suffix": suffix,
                            "owner": cleaned_owner,
                            "operator_name": cleaned_operator,
                            "manufacturer": cleaned_manufacturer,
                            "model": cleaned_model,
                            "serial_number": cleaned_serial,
                            "aircraft_type": cleaned_aircraft_type,
                            "registration_date": cor_date.isoformat(),
                            "operator_address": cleaned_operator_address,
                            "owner_address": cleaned_owner_address,
                            "cor_number": cleaned_cor_number,
                            "year_of_manufacture": cleaned_year,
                            "mtow_kg": mtow_kg_value,
                            "mtow_lbs": mtow_lbs_value,
                            "engine_type": cleaned_engine_type,
                            "engine_quantity": cleaned_engine_quantity,
                            "type_of_operation": cleaned_operation,
                            "certificate_holder_name": cleaned_holder,
                            "certificate_holder_address": cleaned_holder_address,
                            "registration_basis": cleaned_basis,
                            "owner_same_as_holder": int(owner_same_as_holder),
                            "field_sources_json": source_summary(cor_file is not None, supporting_file is not None),
                            "reviewer": cleaned_reviewer,
                            "reviewer_note": cleaned_note,
                            "saved_at": pd.Timestamp.utcnow().isoformat(),
                        }
                        save_registry_override(payload)
                        st.success(
                            f"Saved {normalized_mark} to the Version 3 demo database with the new Excel-style headings, normalized values, and audit logging."
                        )
                        summary = pd.DataFrame(
                            [
                                ("Registration Mark", payload["full_mark"]),
                                ("Manufacturer / Model", f"{payload['manufacturer']} / {payload['model']}"),
                                ("Serial Number", payload["serial_number"]),
                                ("Registered Operator", payload["operator_name"]),
                                ("Address of Registered Operator", payload["operator_address"]),
                                ("Registered Owner", payload["owner"]),
                                ("Address of Registered Owner", payload["owner_address"]),
                                ("Date of Issue of C of R", payload["registration_date"]),
                                ("C of R Number", payload["cor_number"]),
                                ("Year of Manufacture", payload["year_of_manufacture"] or "-"),
                                ("MTOW (kg / lbs)", f"{payload['mtow_kg'] or '-'} / {payload['mtow_lbs'] or '-'}"),
                                ("Engine Type / Quantity", f"{payload['engine_type'] or '-'} / {payload['engine_quantity'] or '-'}"),
                                ("Type of Operation", payload["type_of_operation"] or "-"),
                                ("Registration Basis", payload["registration_basis"] or "-"),
                                ("Owner Same As Holder", "Yes" if payload["owner_same_as_holder"] else "No"),
                                ("Data Sources", format_sources(payload["field_sources_json"])),
                                ("Inspector Remarks", payload["reviewer_note"]),
                            ],
                            columns=["Field", "Saved Value"],
                        )
                        st.dataframe(summary, width="stretch", hide_index=True)
                        st.caption("The live registry will reflect this saved record on the next rerun.")

        st.markdown("#### Recent Saved Demo Records")
        saved = recent_saved_overrides(limit=8)
        if not saved.empty:
            saved = saved.copy()
            saved["saved_at"] = saved["saved_at"].apply(format_date)
            saved.columns = ["Mark", "Operator", "Manufacturer", "Model", "C of R Number", "Type of Operation", "Reviewer", "Saved On"]
            st.dataframe(saved, width="stretch", hide_index=True)
        else:
            st.info("No Version 3 records have been saved into the demo database yet.")


def render_assistant_tab(frame: pd.DataFrame) -> None:
    st.subheader("Inspector Assistant")
    st.caption("This assistant is intentionally controlled. It answers approved analytics questions from the registry, tolerates minor spelling/case mistakes, and refuses unsupported ones.")

    if "assistant_prompt" not in st.session_state:
        st.session_state["assistant_prompt"] = "How many aircraft has Rano Air registered in their history?"

    examples = [
        "How many currently registered planes are there?",
        "How many registrations are there in the last 5 years?",
        "How many available marks are there?",
        "How many aircraft has Rano Air registered in their history?",
        "Which marks are ready for reuse?",
    ]

    example_cols = st.columns(len(examples))
    for col, example in zip(example_cols, examples):
        if col.button(example, width="stretch"):
            st.session_state["assistant_prompt"] = example

    st.text_input("Ask a question", key="assistant_prompt")
    run = st.button("Get Answer", type="primary")
    response = answer_question(st.session_state["assistant_prompt"], frame) if run else None

    if response:
        tone = "green" if response["supported"] else "slate"
        st.markdown(
            f"""
            <div class="trust-card">
                <div class="trust-answer">{response["answer"]}</div>
                <div class="trust-basis"><strong>Calculation basis:</strong> {response["basis"]}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if not response["supported"]:
            info_panel(
                "Why the assistant refused",
                "This is deliberate. The assistant should not improvise answers for unsupported or ambiguous questions when the registry is being used operationally.",
                tone=tone,
            )

    with st.expander("Supported question families", expanded=False):
        st.markdown(
            """
            - Current registered aircraft count
            - Registrations in the last 5 years
            - Available or reserved mark counts
            - Reusable mark counts
            - Current or historical operator totals
            """
        )

    st.markdown(
        """
        <p class="small-note">
            Presentation tip: ask one count question, one operator question, and one reusable-mark question.
            That demonstrates accuracy, history awareness, and operational usefulness in under a minute.
        </p>
        """,
        unsafe_allow_html=True,
    )


def render_sidebar(frame: pd.DataFrame) -> None:
    st.sidebar.title("Demo Guide")
    st.sidebar.write("Use this order during the presentation for the clearest story:")
    st.sidebar.markdown(
        """
1. Dashboard
2. Registration Search
3. Reusable Mark Review
4. Operator Analytics
5. C of R Upload Review
6. Inspector Assistant
"""
    )

    st.sidebar.subheader("Prepared scenarios")
    for label, mark in SCENARIO_MARKS.items():
        st.sidebar.write(f"- {label}: `{mark}`")

    st.sidebar.subheader("Demo assumptions")
    st.sidebar.caption("Counts and records use generated sample data. Workflow logic and screen design are the real focus for stakeholder review.")

    reusable_ready = int(reusable_candidates(frame)["reuse_ready"].sum())
    st.sidebar.metric("Reusable marks ready", reusable_ready)
    st.sidebar.metric("Operators represented", len(known_operators(frame)))


def main() -> None:
    st.set_page_config(page_title="NCAA Registry Demo", page_icon="N", layout="wide")
    inject_styles()
    registry = load_registry()
    render_sidebar(registry)

    st.title("NCAA Aircraft Registry Upgrade Demo")
    st.caption(
        "Prototype view only. Counts and records below are generated sample data for workflow validation. "
        "The goal is to demonstrate a cleaner registry process, not expose sensitive source records."
    )
    st.divider()

    tab_dashboard, tab_search, tab_reuse, tab_operator, tab_table, tab_upload, tab_assistant = st.tabs(
        [
            "Dashboard",
            "Registration Search",
            "Reusable Mark Review",
            "Operator Analytics",
            "Registry Table",
            "C of R Upload",
            "Inspector Assistant",
        ]
    )

    with tab_dashboard:
        render_dashboard(registry)

    with tab_search:
        render_search_tab(registry)

    with tab_reuse:
        render_reuse_tab(registry)

    with tab_operator:
        render_operator_tab(registry)

    with tab_table:
        render_table_tab(registry)

    with tab_upload:
        render_upload_tab()

    with tab_assistant:
        render_assistant_tab(registry)


if __name__ == "__main__":
    main()
