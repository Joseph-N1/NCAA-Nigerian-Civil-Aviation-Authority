# chunking.py - Text chunking utilities for concept extraction

import re
from .clean import UNWANTED_PATTERNS

# ============================================================================
# SECTION IDENTIFIER EXTRACTION
# ============================================================================

SECTION_REGEX = re.compile(
    r"\b(IS\s*)?\d+\.\d+(\.\d+)*\b"
)

WEAK_CHUNK_PATTERNS = [
    re.compile(r"record\s+of\s+amendment", re.IGNORECASE),
    re.compile(r"table\s+of\s+contents|contents", re.IGNORECASE),
    re.compile(r"april\s+\d{4},\s*amendment\s+\d+", re.IGNORECASE),
    re.compile(r"nigeria\s+civil\s+aviation\s+regulations", re.IGNORECASE),
    re.compile(r"director\s+general\s+of\s+civil\s+aviation", re.IGNORECASE),
]

REGULATORY_SIGNAL_PATTERNS = [
    re.compile(r"\bshall\b|\bmust\b|\brequired\b", re.IGNORECASE),
    re.compile(r"\bmeans\b|\bdefined as\b|\brefers to\b", re.IGNORECASE),
    re.compile(r"\bresponsible\b|\baccountable\b|\bapproval\b", re.IGNORECASE),
    re.compile(r"\boperator\b|\bauthority\b|\bsafety\b|\bcertificate\b", re.IGNORECASE),
]

def extract_section_identifier(text: str):
    """Extract section identifier like 5.2.1 or IS 5.2.1 from text"""
    match = SECTION_REGEX.search(text)
    if match:
        return match.group(0)
    return None


def normalize_source_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\n", " ")
    text = re.sub(r"April\s+\d{4},\s*Amendment\s+\d+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"NIGERIA\s+CIVIL\s+AVIATION\s+REGULATIONS", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b\d{1,2}-\d+\b", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" -:;,.")

# ============================================================================
# PARAGRAPH FILTERING
# ============================================================================

def is_useful_paragraph(text):
    """Check if paragraph has educational content worth extracting"""
    text = normalize_source_text(text)
    if not text or len(text.strip()) < 80:
        return False
    for pattern in UNWANTED_PATTERNS:
        if pattern.search(text[:150]):
            return False
    alpha_ratio = sum(c.isalpha() for c in text) / max(1, len(text))
    if alpha_ratio < 0.5:
        return False
    return True


def source_chunk_strength(text: str) -> int:
    text = normalize_source_text(text)
    if not text:
        return -99

    score = 0
    words = text.split()

    if len(words) >= 12:
        score += 1
    if any(pattern.search(text) for pattern in REGULATORY_SIGNAL_PATTERNS):
        score += 3
    if text.count(".") >= 1:
        score += 1

    uppercase_ratio = sum(c.isupper() for c in text) / max(1, sum(c.isalpha() for c in text))
    if uppercase_ratio > 0.45:
        score -= 2

    digit_ratio = sum(c.isdigit() for c in text) / max(1, len(text))
    if digit_ratio > 0.12:
        score -= 2

    if any(pattern.search(text) for pattern in WEAK_CHUNK_PATTERNS):
        score -= 3

    return score


def is_strong_source_chunk(text: str) -> bool:
    return is_useful_paragraph(text) and source_chunk_strength(text) >= 2


def filter_source_chunks(chunks, min_fallback=6):
    """Keep higher-value chunks and fall back to the strongest available ones if needed."""
    if not chunks:
        return []

    normalized_chunks = []
    for chunk in chunks:
        normalized = normalize_source_text(chunk)
        if normalized:
            normalized_chunks.append(normalized)
    if not normalized_chunks:
        return []

    strong_chunks = [chunk for chunk in normalized_chunks if is_strong_source_chunk(chunk)]
    if strong_chunks:
        return strong_chunks

    scored_chunks = sorted(
        ((source_chunk_strength(chunk), chunk) for chunk in normalized_chunks),
        key=lambda item: item[0],
        reverse=True,
    )
    fallback_count = max(1, min(min_fallback, len(scored_chunks)))
    return [chunk for _score, chunk in scored_chunks[:fallback_count]]

# ============================================================================
# TEXT CHUNKING
# ============================================================================

def split_into_chunks(text, min_len=100, max_len=1500, return_dicts=False):
    """Split text into meaningful chunks for concept extraction
    
    Args:
        text: Full document text
        min_len: Minimum chunk length
        max_len: Maximum chunk length
        return_dicts: If True, return list of dicts with metadata; else return list of strings
        
    Returns:
        List of text chunks (strings or dicts) suitable for concept extraction
    """
    paragraphs = re.split(r'\n\s*\n|\n(?=\d+\.\d+|\([a-z]\))', text)
    chunks = []
    chunk_id = 0
    
    for para in paragraphs:
        para = para.strip()
        if is_useful_paragraph(para):
            para = normalize_source_text(para)
            if len(para) > max_len:
                sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', para)
                current = ""
                for sent in sentences:
                    if len(current) + len(sent) < max_len:
                        current += " " + sent
                    else:
                        if len(current) > min_len:
                            chunk_text = current.strip()
                            if return_dicts:
                                chunks.append({
                                    "chunk_id": f"chunk_{chunk_id}",
                                    "page": None,
                                    "section": extract_section_identifier(chunk_text),
                                    "text": chunk_text
                                })
                            else:
                                chunks.append(chunk_text)
                            chunk_id += 1
                        current = sent
                if len(current) > min_len:
                    chunk_text = current.strip()
                    if return_dicts:
                        chunks.append({
                            "chunk_id": f"chunk_{chunk_id}",
                            "page": None,
                            "section": extract_section_identifier(chunk_text),
                            "text": chunk_text
                        })
                    else:
                        chunks.append(chunk_text)
                    chunk_id += 1
            else:
                if return_dicts:
                    chunks.append({
                        "chunk_id": f"chunk_{chunk_id}",
                        "page": None,
                        "section": extract_section_identifier(para),
                        "text": para
                    })
                else:
                    chunks.append(para)
                chunk_id += 1
    return chunks
