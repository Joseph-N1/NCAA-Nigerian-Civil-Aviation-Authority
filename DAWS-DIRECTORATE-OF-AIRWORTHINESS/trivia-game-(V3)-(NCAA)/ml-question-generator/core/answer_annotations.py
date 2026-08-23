from __future__ import annotations

import re
from functools import lru_cache
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from .catalog import get_document_catalog, get_document_record, load_indexed_document
from .concepts import WEAK_DEFINITION_TERMS, contains_noise, sanitize_candidate_text

SECTION_REF_PATTERN = re.compile(r"\b\d{1,2}(?:\.\d{1,3})+\b")
WHITESPACE_PATTERN = re.compile(r"\s+")
PDF_NOISE_PATTERNS = [
    re.compile(r"NIGERIA\s+CIVIL\s+AVIATION\s+REGULATIONS", re.IGNORECASE),
    re.compile(r"April\s+\d{4},\s*Amendment\s+\d+", re.IGNORECASE),
    re.compile(r"IMPLEMENTING\s+STANDARDS", re.IGNORECASE),
]

COMMON_TERM_BLACKLIST = {
    "acceptable",
    "accident",
    "aircraft",
    "authority",
    "general",
    "incident",
    "note",
    "operator",
    "person",
    "personnel",
    "safety",
    "section",
    "service",
    "state",
}

STOPWORD_TERMS = {
    "a",
    "an",
    "and",
    "any",
    "for",
    "from",
    "have",
    "into",
    "must",
    "shall",
    "that",
    "the",
    "their",
    "these",
    "this",
    "those",
    "with",
}

MAX_TERM_REFERENCES = 8


def normalize_space(text: str) -> str:
    if not text:
        return ""
    return WHITESPACE_PATTERN.sub(" ", text).strip()


def clean_excerpt(text: str) -> str:
    cleaned = normalize_space(text)
    for pattern in PDF_NOISE_PATTERNS:
        cleaned = pattern.sub(" ", cleaned)
    cleaned = WHITESPACE_PATTERN.sub(" ", cleaned)
    return cleaned.strip(" -:;,.")


def trim_excerpt(text: str, max_len: int = 240) -> str:
    cleaned = clean_excerpt(text)
    if len(cleaned) <= max_len:
        return cleaned

    boundary = cleaned.rfind(" ", 0, max_len)
    if boundary < max_len * 0.6:
        boundary = max_len
    return cleaned[:boundary].rstrip(" ,;:.") + "..."


def first_sentence(text: str, max_len: int = 190) -> str:
    cleaned = clean_excerpt(text)
    if not cleaned:
        return ""

    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    sentence = parts[0].strip()
    if len(sentence) > max_len:
        return trim_excerpt(sentence, max_len)
    return sentence or trim_excerpt(cleaned, max_len)


def build_pdf_href(relative_path: Optional[str], page: Optional[int]) -> Optional[str]:
    if not relative_path:
        return None

    path = relative_path.replace('\\', '/')
    href = f"/database/{path}"
    if page:
        href += f"#page={page}"
    return href


def format_citation(
    *,
    doc_id: Optional[str] = None,
    title: Optional[str] = None,
    document_family: Optional[str] = None,
    document_family_label: Optional[str] = None,
    regulatory_part: Optional[str] = None,
    page: Optional[int] = None,
    section: Optional[str] = None,
) -> str:
    record = get_document_record(doc_id=doc_id) if doc_id else None

    part = regulatory_part or (record.get("regulatory_part") if record else None)
    title = title or (record.get("title") if record else None) or doc_id or "Database Document"
    document_family = document_family or (record.get("document_family") if record else None)
    document_family_label = document_family_label or (record.get("document_family_label") if record else None)

    if document_family == "nig_cars":
        if part:
            citation = f"Nig. CARs {part}"
            if " - " in title:
                citation += f" - {title.split(' - ', 1)[1]}"
        else:
            citation = f"Nig. CARs - {title}"
    else:
        citation = f"{document_family_label or 'Database Document'} - {title}"

    if section:
        citation += f" – Section {section}"

    if page:
        citation += f" (Page {page})"

    return citation


def normalize_term_key(term: str) -> str:
    return re.sub(r"\s+", " ", sanitize_candidate_text(term).lower())


def extract_part_label(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    match = re.search(r"\bPart\s+(\d+)\b", value, re.IGNORECASE)
    if match:
        return f"Part {int(match.group(1))}"
    return None


def unique_values(values: Iterable[Optional[str]]) -> List[str]:
    ordered: List[str] = []
    seen = set()

    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        ordered.append(value)

    return ordered


@lru_cache(maxsize=64)
def get_index_data(doc_id: str) -> Optional[Dict]:
    return load_indexed_document(doc_id)


@lru_cache(maxsize=1)
def get_catalog_records() -> Tuple[Dict, ...]:
    return tuple(get_document_catalog())


def score_source_chunk(chunk: Dict) -> Tuple[float, int]:
    return (float(chunk.get("score") or 0.0), int(chunk.get("page") or 0))


def build_lookup_doc_ids(
    source_chunks: Sequence[Dict],
    detected_domain: Optional[str],
    retrieved_domain: Optional[str],
) -> List[str]:
    source_doc_ids = unique_values(chunk.get("doc_id") for chunk in sorted(source_chunks, key=score_source_chunk, reverse=True))
    preferred_parts = unique_values([
        extract_part_label(detected_domain),
        extract_part_label(retrieved_domain),
    ])

    part_doc_ids: List[str] = []
    catalog = get_catalog_records()
    for part in preferred_parts:
        for record in catalog:
            if record.get("regulatory_part") == part and record["doc_id"] not in source_doc_ids and record["doc_id"] not in part_doc_ids:
                part_doc_ids.append(record["doc_id"])

    fallback_doc_ids = [record["doc_id"] for record in catalog if record["doc_id"] not in source_doc_ids and record["doc_id"] not in part_doc_ids]
    return source_doc_ids + part_doc_ids + fallback_doc_ids


def find_best_section_chunk(section_ref: str, source_chunks: Sequence[Dict], lookup_doc_ids: Sequence[str]) -> Optional[Dict]:
    exact_source_matches = [chunk for chunk in source_chunks if (chunk.get("section") or "").strip() == section_ref]
    if exact_source_matches:
        return max(exact_source_matches, key=score_source_chunk)

    for doc_id in lookup_doc_ids:
        index_data = get_index_data(doc_id)
        if not index_data:
            continue

        exact_matches = [
            chunk for chunk in (index_data.get("chunks") or [])
            if (chunk.get("section") or "").strip() == section_ref
        ]
        if exact_matches:
            chosen = max(exact_matches, key=lambda chunk: int(chunk.get("page") or 0))
            chosen = dict(chosen)
            chosen["citation"] = format_citation(
                doc_id=chosen.get("doc_id") or doc_id,
                title=chosen.get("title"),
                document_family=chosen.get("document_family"),
                document_family_label=chosen.get("document_family_label"),
                regulatory_part=chosen.get("regulatory_part"),
                page=chosen.get("page"),
                section=chosen.get("section"),
            )
            return chosen

    return None


def build_section_popup(chunk: Dict, section_ref: str) -> Optional[Dict]:
    page = chunk.get("page")
    relative_path = chunk.get("relative_path")
    href = build_pdf_href(relative_path, page)
    if not href or not page:
        return None

    raw_text = clean_excerpt(chunk.get("text", ""))
    summary = first_sentence(raw_text)
    if not summary:
        return None

    excerpt = trim_excerpt(raw_text, 280)
    citation = chunk.get("citation") or format_citation(
        doc_id=chunk.get("doc_id"),
        title=chunk.get("title"),
        document_family=chunk.get("document_family"),
        document_family_label=chunk.get("document_family_label"),
        regulatory_part=chunk.get("regulatory_part"),
        page=page,
        section=chunk.get("section") or section_ref,
    )

    return {
        "type": "reference",
        "kind": "section",
        "label": section_ref,
        "href": href,
        "popup": {
            "title": f"Section {section_ref}",
            "summary": summary,
            "excerpt": excerpt if excerpt != summary else "",
            "citation": citation,
            "page": page,
            "section": chunk.get("section") or section_ref,
        },
    }


def build_term_variants(term: str) -> List[str]:
    term = normalize_space(term)
    variants = {term}

    stripped_parenthetical = normalize_space(re.sub(r"\s*\([^)]*\)\s*$", "", term))
    if stripped_parenthetical:
        variants.add(stripped_parenthetical)

    acronym_match = re.search(r"\(([A-Z0-9-]{2,10})\)\s*$", term)
    if acronym_match:
        variants.add(acronym_match.group(1))

    deparenthesized = normalize_space(re.sub(r"\([^)]*\)", " ", term))
    if deparenthesized:
        variants.add(deparenthesized)

    return sorted({variant for variant in variants if variant}, key=len, reverse=True)


def is_valid_term_entry(term: str, meaning: str) -> bool:
    clean_term = sanitize_candidate_text(term)
    clean_meaning = sanitize_candidate_text(meaning)
    term_key = normalize_term_key(clean_term)

    if len(clean_term) < 4 or len(clean_meaning) < 25:
        return False
    if term_key in WEAK_DEFINITION_TERMS or term_key in COMMON_TERM_BLACKLIST:
        return False
    if contains_noise(clean_term) or contains_noise(clean_meaning):
        return False
    if clean_term.lower().startswith("note"):
        return False

    words = clean_term.split()
    if len(words) == 1 and (len(clean_term) < 6 or clean_term.lower() in STOPWORD_TERMS):
        return False

    return True


def tokenize_meaning(text: str) -> List[str]:
    tokens = []
    for token in re.findall(r"[A-Za-z][A-Za-z0-9-]+", sanitize_candidate_text(text).lower()):
        if len(token) < 4 or token in STOPWORD_TERMS:
            continue
        tokens.append(token)
    return tokens


def score_definition_chunk(chunk: Dict, term: str, meaning_tokens: Sequence[str]) -> int:
    text = clean_excerpt(chunk.get("text", "")).lower()
    if not text:
        return 0

    term_lower = term.lower()
    score = 0
    if term_lower in text:
        score += 4

    overlap = sum(1 for token in meaning_tokens[:8] if token in text)
    score += min(overlap, 4)

    if chunk.get("section"):
        score += 1

    return score


def find_definition_chunk(index_data: Dict, term: str, meaning: str) -> Optional[Dict]:
    meaning_tokens = tokenize_meaning(meaning)
    best_match = None
    best_score = 0

    for chunk in index_data.get("chunks") or []:
        score = score_definition_chunk(chunk, term, meaning_tokens)
        if score > best_score:
            best_score = score
            best_match = chunk

    if best_match and best_score >= 4:
        return best_match
    return None


@lru_cache(maxsize=64)
def get_document_term_entries(doc_id: str) -> Tuple[Dict, ...]:
    index_data = get_index_data(doc_id)
    if not index_data:
        return ()

    entries: List[Dict] = []
    seen_terms = set()
    definitions = index_data.get("definitions") or []
    relative_path = index_data.get("relative_path")

    for definition in definitions:
        term = sanitize_candidate_text(definition.get("term", ""))
        meaning = sanitize_candidate_text(definition.get("meaning", ""))
        if not is_valid_term_entry(term, meaning):
            continue

        term_key = normalize_term_key(term)
        if term_key in seen_terms:
            continue
        seen_terms.add(term_key)

        best_chunk = find_definition_chunk(index_data, term, meaning)
        page = definition.get("page_num")
        section = definition.get("section_heading")
        citation = None
        href = None
        excerpt = ""

        if best_chunk:
            page = best_chunk.get("page") or page
            section = best_chunk.get("section") or section
            relative_path = best_chunk.get("relative_path") or relative_path
            excerpt = trim_excerpt(best_chunk.get("text", ""), 240)
            citation = format_citation(
                doc_id=best_chunk.get("doc_id") or doc_id,
                title=best_chunk.get("title"),
                document_family=best_chunk.get("document_family"),
                document_family_label=best_chunk.get("document_family_label"),
                regulatory_part=best_chunk.get("regulatory_part"),
                page=page,
                section=section,
            )

        href = build_pdf_href(relative_path, page)
        if not href or not page:
            continue

        if not citation:
            record = get_document_record(doc_id=doc_id)
            citation = format_citation(
                doc_id=doc_id,
                title=record.get("title") if record else None,
                document_family=record.get("document_family") if record else None,
                document_family_label=record.get("document_family_label") if record else None,
                regulatory_part=record.get("regulatory_part") if record else None,
                page=page,
                section=section,
            )

        entries.append({
            "term": term,
            "term_key": term_key,
            "variants": build_term_variants(term),
            "meaning": meaning,
            "doc_id": doc_id,
            "href": href,
            "popup": {
                "title": term,
                "summary": trim_excerpt(meaning, 220),
                "excerpt": excerpt if excerpt and excerpt.lower() != trim_excerpt(meaning, 220).lower() else "",
                "citation": citation,
                "page": page,
                "section": section,
            },
        })

    entries.sort(key=lambda item: (len(item["variants"][0]), item["term"]), reverse=True)
    return tuple(entries)


def find_term_spans(
    text: str,
    occupied_spans: Sequence[Tuple[int, int]],
    lookup_doc_ids: Sequence[str],
    used_term_keys: set,
    remaining_capacity: int,
) -> List[Tuple[int, int, Dict]]:
    spans: List[Tuple[int, int, Dict]] = []
    all_entries: List[Tuple[int, Dict]] = []

    for priority, doc_id in enumerate(lookup_doc_ids):
        for entry in get_document_term_entries(doc_id):
            all_entries.append((priority, entry))

    all_entries.sort(key=lambda item: (-len(item[1]["variants"][0]), item[0], item[1]["term"]))

    for _priority, entry in all_entries:
        if remaining_capacity <= 0:
            break
        if entry["term_key"] in used_term_keys:
            continue

        found_match = None
        for variant in entry["variants"]:
            pattern = re.compile(rf"(?<![A-Za-z0-9]){re.escape(variant)}(?![A-Za-z0-9])", re.IGNORECASE)
            match = pattern.search(text)
            if not match:
                continue

            start, end = match.span()
            if any(start < existing_end and end > existing_start for existing_start, existing_end in occupied_spans + [(left, right) for left, right, _segment in spans]):
                continue

            found_match = (start, end, {
                "type": "reference",
                "kind": "term",
                "label": text[start:end],
                "href": entry["href"],
                "popup": entry["popup"],
            })
            break

        if found_match:
            spans.append(found_match)
            used_term_keys.add(entry["term_key"])
            remaining_capacity -= 1

    return spans


def build_segments(text: str, spans: Sequence[Tuple[int, int, Dict]]) -> List[Dict]:
    if not text:
        return []

    ordered_spans = sorted(spans, key=lambda item: item[0])
    cursor = 0
    segments: List[Dict] = []

    for start, end, segment in ordered_spans:
        if start > cursor:
            segments.append({"type": "text", "text": text[cursor:start]})
        segments.append(segment)
        cursor = end

    if cursor < len(text):
        segments.append({"type": "text", "text": text[cursor:]})

    return segments or [{"type": "text", "text": text}]


def annotate_text(
    text: str,
    source_chunks: Sequence[Dict],
    lookup_doc_ids: Sequence[str],
    used_term_keys: set,
) -> List[Dict]:
    if not text:
        return []

    spans: List[Tuple[int, int, Dict]] = []
    occupied_ranges: List[Tuple[int, int]] = []

    for match in SECTION_REF_PATTERN.finditer(text):
        section_ref = match.group(0)
        chunk = find_best_section_chunk(section_ref, source_chunks, lookup_doc_ids)
        if not chunk:
            continue

        reference = build_section_popup(chunk, section_ref)
        if not reference:
            continue

        spans.append((match.start(), match.end(), reference))
        occupied_ranges.append((match.start(), match.end()))

    remaining_capacity = max(0, MAX_TERM_REFERENCES - len(used_term_keys))
    if remaining_capacity:
        spans.extend(find_term_spans(text, occupied_ranges, lookup_doc_ids, used_term_keys, remaining_capacity))

    return build_segments(text, spans)


def build_answer_blocks(
    answer_summary: Optional[str],
    answer_points: Sequence[str],
    source_chunks: Sequence[Dict],
    detected_domain: Optional[str] = None,
    retrieved_domain: Optional[str] = None,
) -> List[Dict]:
    blocks: List[Dict] = []
    lookup_doc_ids = build_lookup_doc_ids(source_chunks, detected_domain, retrieved_domain)
    used_term_keys: set = set()

    if answer_summary:
        blocks.append({
            "kind": "summary",
            "segments": annotate_text(answer_summary, source_chunks, lookup_doc_ids, used_term_keys),
        })

    for point in answer_points or []:
        if not point:
            continue
        blocks.append({
            "kind": "bullet",
            "segments": annotate_text(point, source_chunks, lookup_doc_ids, used_term_keys),
        })

    return blocks
