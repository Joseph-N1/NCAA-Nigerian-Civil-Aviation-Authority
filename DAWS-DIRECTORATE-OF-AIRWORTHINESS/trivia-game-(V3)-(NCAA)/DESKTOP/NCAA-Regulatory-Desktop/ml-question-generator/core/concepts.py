# concepts.py - Concept extraction from regulatory text

import re

# ============================================================================
# EXTRACTION GUARDRAILS
# ============================================================================

WEAK_DEFINITION_TERMS = {
    "attachment",
    "annex",
    "appendix",
    "chapter",
    "example",
    "examples",
    "figure",
    "note",
    "notes",
    "part",
    "section",
    "table",
}

WEAK_ENTITY_TERMS = {
    "a",
    "an",
    "it",
    "person",
    "persons",
    "that",
    "the",
    "this",
    "those",
}

ROLE_NORMALIZATION_PATTERNS = [
    (re.compile(r"\baccountable executive\b", re.IGNORECASE), "The accountable executive"),
    (re.compile(r"\bservice provider\b", re.IGNORECASE), "The service provider"),
    (re.compile(r"\bthe authority\b|\bauthority\b", re.IGNORECASE), "The Authority"),
    (re.compile(r"\bsafety manager\b", re.IGNORECASE), "The safety manager"),
    (re.compile(r"\boperator\b", re.IGNORECASE), "The operator"),
    (re.compile(r"\borganization\b", re.IGNORECASE), "The organization"),
]

TRAILING_FRAGMENT_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "for",
    "from",
    "if",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "this",
    "to",
    "was",
    "were",
    "which",
    "who",
    "with",
}

NOISE_PATTERNS = [
    re.compile(r"april\s+\d{4},\s*amendment\s+\d+", re.IGNORECASE),
    re.compile(r"nigeria\s+civil\s+aviation\s+regulations", re.IGNORECASE),
    re.compile(r"record\s+of\s+amendment", re.IGNORECASE),
    re.compile(r"director\s+general\s+of\s+civil\s+aviation", re.IGNORECASE),
]


def sanitize_candidate_text(text):
    if not text:
        return ""

    text = text.replace("\n", " ")
    text = re.sub(r"April\s+\d{4},\s*Amendment\s+\d+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"NIGERIA\s+CIVIL\s+AVIATION\s+REGULATIONS", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b\d{1,2}-\d+\b", " ", text)
    text = re.sub(r"^\s*(?:\([a-z0-9]+\)|[a-z0-9]+\)|\d+\.)\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" -:;,.")


def contains_noise(text):
    cleaned = sanitize_candidate_text(text)
    if not cleaned:
        return True
    return any(pattern.search(cleaned) for pattern in NOISE_PATTERNS)


def is_complete_clause(text, min_words=5):
    cleaned = sanitize_candidate_text(text)
    words = cleaned.split()

    if len(words) < min_words:
        return False

    if words[-1].lower().strip(".,;:") in TRAILING_FRAGMENT_WORDS:
        return False

    if contains_noise(cleaned):
        return False

    return True


def is_valid_definition(term, meaning):
    term = sanitize_candidate_text(term)
    meaning = sanitize_candidate_text(meaning)

    if len(term) < 3 or len(meaning) < 25:
        return False

    term_words = [word.lower() for word in term.split()]

    if term.lower() in WEAK_DEFINITION_TERMS:
        return False

    if term_words and term_words[-1] in WEAK_DEFINITION_TERMS:
        return False

    if len(term.split()) > 6:
        return False

    if contains_noise(term) or contains_noise(meaning):
        return False

    return is_complete_clause(meaning, min_words=6)


def is_valid_entity(entity):
    entity = sanitize_candidate_text(entity)
    if len(entity) < 4:
        return False
    if entity.lower() in WEAK_ENTITY_TERMS:
        return False
    if len(entity.split()) > 6:
        return False
    return not contains_noise(entity)


def normalize_entity_candidate(entity):
    entity = sanitize_candidate_text(entity)
    if not entity:
        return ""

    for pattern, replacement in ROLE_NORMALIZATION_PATTERNS:
        if pattern.search(entity):
            return replacement

    return entity


def dedupe_entries(items, key_builder):
    seen = set()
    deduped = []

    for item in items:
        key = key_builder(item)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return deduped


# ============================================================================
# CONCEPT EXTRACTION
# ============================================================================

def extract_concepts(text):
    """Extract key concepts, definitions, responsibilities, and procedures."""
    concepts = {
        "definitions": [],
        "responsibilities": [],
        "procedures": [],
        "requirements": [],
        "purposes": [],
        "components": [],
    }

    segments = [segment.strip() for segment in re.split(r"\n{2,}", text) if len(segment.strip()) > 40]
    if not segments:
        segments = [text]

    def_patterns = [
        r'([A-Z][a-zA-Z\s\-]{3,40})\s*[-–:]\s*(?:means?|is\s+defined\s+as|refers?\s+to|is\s+a[n]?)\s+([^.]+\.)',
        r'"([^"]+)"\s+(?:means?|is\s+defined\s+as)\s+([^.]+\.)',
        r'([A-Z][a-zA-Z\s]{3,30})\.\s*[-–]\s*([A-Z][^.]+\.)',
    ]
    resp_patterns = [
        r'(?:the\s+)?([A-Za-z\s]+(?:provider|operator|authority|manager|executive|personnel|organization))\s+(?:shall|must|will|is\s+responsible\s+for|has\s+responsibility)\s+([^.]+\.)',
        r'([A-Za-z\s]+)\s+(?:is|are)\s+responsible\s+for\s+([^.]+\.)',
        r'(?:responsibility|accountability)\s+(?:of|for)\s+(?:the\s+)?([A-Za-z\s]+)\s+(?:includes?|is|are)\s+([^.]+\.)',
    ]
    proc_patterns = [
        r'(?:process|procedure|method)\s+(?:for|of|to)\s+([^.]+)(?:\s+(?:includes?|involves?|consists?\s+of|requires?)\s+([^.]+))?',
        r'(?:steps?|stages?)\s+(?:for|in|of)\s+([^:]+):\s*([^.]+\.)',
        r'(?:to\s+ensure|in\s+order\s+to)\s+([^,]+),\s+(?:the\s+)?(\w+)\s+(?:shall|must|should)\s+([^.]+\.)',
    ]
    req_patterns = [
        r'(?:shall|must|is\s+required\s+to|are\s+required\s+to)\s+([^.]+\.)',
        r'(?:requirement|obligation)\s+(?:to|for|that)\s+([^.]+\.)',
        r'(?:it\s+is\s+)?(?:mandatory|compulsory|required)\s+(?:to|that|for)\s+([^.]+\.)',
    ]
    purpose_patterns = [
        r'(?:purpose|objective|aim|goal)\s+(?:of|is\s+to)\s+([^.]+\.)',
        r'(?:in\s+order\s+to|to\s+ensure|designed\s+to|intended\s+to)\s+([^.]+\.)',
        r'(?:this|the\s+\w+)\s+(?:ensures?|provides?|enables?|facilitates?)\s+([^.]+\.)',
    ]
    comp_patterns = [
        r'(?:includes?|comprises?|consists?\s+of|contains?)\s*(?:the\s+following)?[:\s]+([^.]+(?:\([a-z]\)[^.]+)+)',
        r'(?:components?|elements?|parts?)\s+(?:of|include)\s*:?\s*([^.]+\.)',
        r'(?:following|these)\s+(?:are|include)\s*:?\s*([^.]+\.)',
    ]

    for segment in segments:
        segment = sanitize_candidate_text(segment)
        if not segment or contains_noise(segment):
            continue

        for pattern in def_patterns:
            for match in re.finditer(pattern, segment, re.IGNORECASE):
                term = sanitize_candidate_text(match.group(1))
                meaning = sanitize_candidate_text(match.group(2))
                if is_valid_definition(term, meaning):
                    concepts["definitions"].append({
                        "term": term,
                        "meaning": meaning,
                        "context": segment[:220],
                    })

        for pattern in resp_patterns:
            for match in re.finditer(pattern, segment, re.IGNORECASE):
                who = normalize_entity_candidate(match.group(1))
                what = sanitize_candidate_text(match.group(2))
                if is_valid_entity(who) and is_complete_clause(what, min_words=5):
                    concepts["responsibilities"].append({
                        "entity": who,
                        "action": what,
                        "full_text": sanitize_candidate_text(match.group(0)),
                    })

        for pattern in proc_patterns:
            for match in re.finditer(pattern, segment, re.IGNORECASE):
                procedure_text = sanitize_candidate_text(match.group(0))
                if is_complete_clause(procedure_text, min_words=6):
                    concepts["procedures"].append({
                        "text": procedure_text,
                        "groups": [sanitize_candidate_text(group) for group in match.groups() if group],
                    })

        for pattern in req_patterns:
            for match in re.finditer(pattern, segment, re.IGNORECASE):
                req = sanitize_candidate_text(match.group(1) if match.groups() else match.group(0))
                if is_complete_clause(req, min_words=6):
                    start = max(0, match.start() - 150)
                    context_before = sanitize_candidate_text(segment[start:match.start()])
                    concepts["requirements"].append({
                        "requirement": req,
                        "context": context_before,
                        "full_text": sanitize_candidate_text(match.group(0)),
                    })

        for pattern in purpose_patterns:
            for match in re.finditer(pattern, segment, re.IGNORECASE):
                purpose = sanitize_candidate_text(match.group(1) if match.groups() else match.group(0))
                if is_complete_clause(purpose, min_words=6):
                    concepts["purposes"].append({
                        "purpose": purpose,
                        "context": segment[:220],
                    })

        for pattern in comp_patterns:
            for match in re.finditer(pattern, segment, re.IGNORECASE):
                items = sanitize_candidate_text(match.group(1) if match.groups() else match.group(0))
                if is_complete_clause(items, min_words=6):
                    concepts["components"].append({
                        "items": items,
                        "context": segment[:220],
                    })

    concepts["definitions"] = dedupe_entries(
        concepts["definitions"],
        lambda item: (item["term"].lower(), item["meaning"].lower()),
    )
    concepts["responsibilities"] = dedupe_entries(
        concepts["responsibilities"],
        lambda item: (item["entity"].lower(), item["action"].lower()),
    )
    concepts["procedures"] = dedupe_entries(
        concepts["procedures"],
        lambda item: item["text"].lower(),
    )
    concepts["requirements"] = dedupe_entries(
        concepts["requirements"],
        lambda item: item["requirement"].lower(),
    )
    concepts["purposes"] = dedupe_entries(
        concepts["purposes"],
        lambda item: item["purpose"].lower(),
    )
    concepts["components"] = dedupe_entries(
        concepts["components"],
        lambda item: item["items"].lower(),
    )

    return concepts
