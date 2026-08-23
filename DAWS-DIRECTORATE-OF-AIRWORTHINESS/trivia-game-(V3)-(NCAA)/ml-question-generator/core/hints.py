# hints.py - Hint generation and page reference utilities

import re
import random

HEADING_START_PATTERN = re.compile(r'((?:IS\s*)?\d+(?:\.\d+){0,4})\.?\s*[-:)]?\s*', re.IGNORECASE)
HEADING_STOP_PATTERNS = [
    re.compile(r'\b(?:The Authority|The service provider|A service provider|The accountable executive|General aviation operators|RPAS Operators)\s+(?:shall|must|will)\b', re.IGNORECASE),
    re.compile(r'\b(?:Note\b|Based on|IMPLEMENTING STANDARDS|April \d{4}|These processes|This process)\b', re.IGNORECASE),
    re.compile(r'\s+[a-z]\)\s+', re.IGNORECASE),
    re.compile(r'\s+\([a-z0-9]+\)\s+', re.IGNORECASE),
    re.compile(r';'),
]
HEADING_NOISE_PATTERNS = [
    re.compile(r'^(?:contents|introduction|part\s+\d+)$', re.IGNORECASE),
    re.compile(r'record of amendment|amendment', re.IGNORECASE),
]
HEADING_FIXES = {
    "Sms": "SMS",
    "Ssp": "SSP",
    "Rpas": "RPAS",
    "Nasp": "NASP",
    "Gasp": "GASP",
    "Rasp": "RASP",
    "Is": "IS",
}

HINT_STOP_WORDS = {
    "accordance",
    "according",
    "action",
    "actions",
    "aeronautical",
    "aircraft",
    "aviation",
    "civil",
    "compliance",
    "correct",
    "defined",
    "described",
    "ensure",
    "establish",
    "following",
    "general",
    "identification",
    "implement",
    "implementation",
    "includes",
    "maintain",
    "management",
    "mandatory",
    "means",
    "monitoring",
    "organization",
    "person",
    "policy",
    "programme",
    "process",
    "provide",
    "regulation",
    "regulations",
    "regulatory",
    "required",
    "requirement",
    "requirements",
    "safety",
    "service",
    "shall",
    "should",
    "statement",
    "system",
}

# ============================================================================
# PAGE REFERENCE FINDER
# ============================================================================

def find_page_for_text(text_snippet, pages_data):
    """Find which page contains a text snippet
    
    Args:
        text_snippet: Text to search for
        pages_data: List of {page_num, text, headings} dicts
        
    Returns:
        tuple: (page_number, section_heading) or (None, None)
    """
    if not pages_data or not text_snippet:
        return None, None
    
    match = find_heading_for_text(text_snippet, pages_data)
    if match:
        return match["page_num"], match["label"]
    return None, None


def normalize_heading_title(title):
    title = re.sub(r'\s+', ' ', title).strip(" -:;,.")
    if not title:
        return ""

    if title.isupper():
        title = title.title()

    for source, target in HEADING_FIXES.items():
        title = title.replace(source, target)

    return title.strip(" -:;,.")


def looks_like_heading_title(title):
    title = normalize_heading_title(title)
    if not title or len(title) < 4:
        return False
    if len(title.split()) > 12:
        return False
    return not any(pattern.search(title) for pattern in HEADING_NOISE_PATTERNS)


def extract_heading_candidates(page_text):
    if not page_text:
        return []

    normalized = re.sub(r'\s+', ' ', page_text)
    candidates = []
    seen = set()

    for match in HEADING_START_PATTERN.finditer(normalized):
        prefix = normalized[max(0, match.start() - 24):match.start()]
        if re.search(r'(section|subsection|paragraph|under)\s*$', prefix, re.IGNORECASE):
            continue

        section = re.sub(r'\s+', ' ', match.group(1)).strip().upper().replace("IS ", "IS ")
        window = normalized[match.end():match.end() + 180]

        next_heading = HEADING_START_PATTERN.search(window)
        if next_heading and next_heading.start() > 0:
            window = window[:next_heading.start()]

        if ":" in window:
            window = window.split(":", 1)[0]

        raw_title = window.lstrip()
        if not raw_title or not raw_title[0].isupper():
            continue

        for stop_pattern in HEADING_STOP_PATTERNS:
            split_parts = stop_pattern.split(window, 1)
            window = split_parts[0]

        title = normalize_heading_title(window)
        if not looks_like_heading_title(title):
            continue

        label = f"{section} {title}".strip()
        if label.lower() in seen:
            continue

        seen.add(label.lower())
        candidates.append({
            "start": match.start(),
            "section": section,
            "title": title,
            "label": label,
        })

    return candidates


def normalize_lookup_text(text):
    if not text:
        return ""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


def find_heading_for_text(text_snippet, pages_data, context_text=None):
    if not pages_data:
        return None

    lookup_candidates = [normalize_lookup_text(text_snippet), normalize_lookup_text(context_text)]
    lookup_candidates = [candidate[:140] for candidate in lookup_candidates if candidate]

    for candidate in lookup_candidates:
        for page in pages_data:
            page_text = page.get("text", "")
            normalized_page = normalize_lookup_text(page_text)
            start_index = normalized_page.find(candidate)
            if start_index == -1:
                continue

            headings = page.get("headings") or []
            derived_headings = [{"start": 0, "label": heading, "title": heading, "section": ""} for heading in headings]
            heading_candidates = extract_heading_candidates(page_text) or derived_headings

            chosen_heading = None
            for heading in heading_candidates:
                if heading.get("start", 0) <= start_index:
                    chosen_heading = heading
                elif chosen_heading:
                    break

            if not chosen_heading and heading_candidates:
                chosen_heading = heading_candidates[0]

            return {
                "page_num": page.get("page_num"),
                "label": chosen_heading["label"] if chosen_heading else None,
                "title": chosen_heading["title"] if chosen_heading else None,
            }

    return None


def find_topic_for_text(text_snippet, pages_data, fallback_topic=None, context_text=None):
    match = find_heading_for_text(text_snippet, pages_data, context_text=context_text)
    if match and match.get("title"):
        return match["title"]
    return fallback_topic


def enrich_concepts_with_page_context(concepts, pages_data):
    """Attach page and section context to extracted concepts when page data is available."""
    if not pages_data:
        return concepts

    lookup_fields = {
        "definitions": [("meaning",), ("context",), ("term", "meaning")],
        "responsibilities": [("action",), ("full_text",), ("entity", "action")],
        "procedures": [("text",), ("groups",)],
        "requirements": [("requirement",), ("full_text",), ("context", "requirement")],
        "purposes": [("purpose",), ("context",)],
        "components": [("items",), ("context",)],
    }

    enriched = {}
    for concept_type, items in concepts.items():
        if not isinstance(items, list):
            enriched[concept_type] = items
            continue

        enriched_items = []
        for item in items:
            if not isinstance(item, dict):
                enriched_items.append(item)
                continue

            enriched_item = dict(item)
            match = None

            for fields in lookup_fields.get(concept_type, []):
                primary_parts = []
                for field in fields:
                    value = enriched_item.get(field)
                    if isinstance(value, list):
                        primary_parts.extend(str(part) for part in value if part)
                    elif value:
                        primary_parts.append(str(value))

                primary_text = " ".join(primary_parts).strip()
                if not primary_text:
                    continue

                context_parts = []
                for field in ("context", "full_text", "text"):
                    value = enriched_item.get(field)
                    if value:
                        context_parts.append(str(value))
                context_text = " ".join(context_parts).strip()

                match = find_heading_for_text(primary_text, pages_data, context_text=context_text)
                if match:
                    break

            if match:
                enriched_item["page_num"] = match.get("page_num")
                enriched_item["section_heading"] = match.get("label")
                enriched_item["section_title"] = match.get("title")
                if match.get("title") and looks_like_heading_title(match["title"]):
                    enriched_item["topic_label"] = match["title"]

            enriched_items.append(enriched_item)

        enriched[concept_type] = enriched_items

    return enriched

# ============================================================================
# KEY TERM EXTRACTION
# ============================================================================

def extract_key_terms(text, max_terms=5, exclude_terms=None):
    """Extract key terms from text for hint generation"""
    if not text:
        return []

    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "shall", "can", "of", "to", "in",
        "for", "on", "with", "at", "by", "from", "as", "into", "through",
        "and", "or", "but", "if", "because", "while", "that", "which", "this",
        "these", "those", "their", "its", "all", "any", "each", "every", "both",
    }
    stop_words.update(HINT_STOP_WORDS)
    excluded = {term.lower() for term in (exclude_terms or []) if term}

    words = re.findall(r'\b[A-Za-z]{4,}\b', text)
    key_terms = []
    seen = set()
    for word in words:
        word_lower = word.lower()
        if word_lower not in stop_words and word_lower not in seen and word_lower not in excluded:
            seen.add(word_lower)
            key_terms.append(word)
            if len(key_terms) >= max_terms:
                break
    return key_terms

# ============================================================================
# CONTEXT-AWARE HINT GENERATION
# ============================================================================

def generate_context_aware_hint(
    correct_answer,
    context,
    category,
    topic,
    study_focus=None,
    page_num=None,
    section_ref=None,
    question_text=None,
):
    """Generate a structured, context-aware hint payload for quiz questions."""
    display_topic = normalize_heading_title(topic or "")
    display_focus = normalize_heading_title(study_focus or section_ref or "")
    exclude_terms = {display_topic.lower(), display_focus.lower()}

    key_terms = extract_key_terms(correct_answer, 3, exclude_terms=exclude_terms)
    context_terms = extract_key_terms(context, 2, exclude_terms=exclude_terms.union({term.lower() for term in key_terms}))
    keywords = list(dict.fromkeys([term for term in key_terms + context_terms if term]))

    hint_templates = {
        "Understanding": [
            f"Work out the precise regulatory meaning of {display_topic or 'the concept'}.",
            "Choose the option that defines the term, not one that just sounds aviation-related.",
            "Look for the most exact definition rather than a broad description.",
        ],
        "Responsibility": [
            f"Match the obligation to the role that owns {display_topic.lower() if display_topic else 'the action'}.",
            "Focus on accountability, delegated authority, and named roles.",
            "Think about which role would answer for this during oversight.",
        ],
        "Requirement": [
            "Prioritize language that signals a mandatory obligation.",
            "Separate a firm compliance duty from optional good practice.",
            "Look for what the regulation clearly requires, not what it merely encourages.",
        ],
        "Purpose": [
            "Choose the option that states the regulatory outcome or reason.",
            "Focus on the objective the rule is trying to achieve.",
            "Look for the end state, not the process step.",
        ],
        "Application": [
            "Pick the option that would still make sense during a real audit or inspection.",
            "Focus on the most compliant response in practice.",
            "Think about how the rule would be implemented on the job.",
        ],
        "Critical Thinking": [
            "Compare every option carefully because one breaks the regulatory pattern.",
            "Identify the statement that sounds plausible but is not supported by the rule.",
            "Look for the option that conflicts with mandatory regulatory language.",
        ],
    }

    templates = hint_templates.get(category, hint_templates["Understanding"])
    base_hint = random.choice(templates)

    clues = []
    if display_focus and display_focus.lower() not in {display_topic.lower(), ""}:
        clues.append(f"Anchor your reasoning in the '{display_focus}' section.")

    category_clues = {
        "Understanding": "Eliminate choices that describe a related process instead of the term itself.",
        "Responsibility": "Look for the accountable role, not a supporting participant.",
        "Requirement": "Keywords such as 'shall', 'must', or 'required' usually point toward the correct option.",
        "Purpose": "The best answer explains why the requirement exists within the safety framework.",
        "Application": "The strongest option is the one an inspector would expect to see in actual operations.",
        "Critical Thinking": "Three options should fit the regulatory pattern; one should clearly fall outside it.",
    }
    if category in category_clues:
        clues.append(category_clues[category])

    if keywords:
        clues.append(f"Useful terms to keep in view: {', '.join(keywords[:3])}.")

    reference_bits = []
    if section_ref:
        reference_bits.append(section_ref)
    if page_num:
        reference_bits.append(f"Page {page_num}")

    payload = {
        "summary": base_hint,
        "focus": display_focus or display_topic or category,
        "clues": clues[:3],
        "keywords": keywords[:3],
        "sectionRef": section_ref,
        "pageRef": page_num,
    }
    if reference_bits:
        payload["referenceNote"] = "Review " + " | ".join(reference_bits) + " if you need to verify the rule."

    return payload
