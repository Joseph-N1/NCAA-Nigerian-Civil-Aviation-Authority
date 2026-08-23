# distractors.py - Smart distractor generation for MCQ questions

import re
import random

# ============================================================================
# TEXT SUMMARIZATION HELPER
# ============================================================================

FRAGMENT_ENDINGS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "if",
    "in", "is", "it", "of", "on", "or", "that", "the", "their", "this",
    "to", "was", "were", "which", "who", "with",
}

OPTION_STOP_WORDS = FRAGMENT_ENDINGS.union({
    "acceptable",
    "accordance",
    "according",
    "aircraft",
    "aviation",
    "authority",
    "civil",
    "compliance",
    "following",
    "include",
    "includes",
    "including",
    "maintain",
    "management",
    "operator",
    "organization",
    "provider",
    "regulation",
    "regulations",
    "required",
    "requirement",
    "requirements",
    "safety",
    "service",
    "shall",
    "should",
    "state",
    "system",
    "that",
    "their",
    "these",
    "those",
    "under",
})

GENERIC_DISTRACTOR_PATTERNS = [
    re.compile(r"\binternal reference purposes only\b", re.IGNORECASE),
    re.compile(r"\borganizational preference\b", re.IGNORECASE),
    re.compile(r"\bself-declaration processes\b", re.IGNORECASE),
    re.compile(r"\bindustry best practices\b", re.IGNORECASE),
    re.compile(r"\badvisory basis\b", re.IGNORECASE),
    re.compile(r"\boperational needs\b", re.IGNORECASE),
    re.compile(r"\bwithout central oversight\b", re.IGNORECASE),
    re.compile(r"\bvoluntary safety measures\b", re.IGNORECASE),
    re.compile(r"^following established organizational protocols$", re.IGNORECASE),
    re.compile(r"^maintaining appropriate safety standards$", re.IGNORECASE),
    re.compile(r"^ensuring operational efficiency$", re.IGNORECASE),
]


def clean_option_text(text):
    """Remove common PDF artifacts before using text as an answer option."""
    if not text:
        return ""

    text = text.replace("\n", " ")
    text = re.sub(r"April\s+\d{4},\s*Amendment\s+\d+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"NIGERIA\s+CIVIL\s+AVIATION\s+REGULATIONS", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"Part\s+\d+\s*-\s*[A-Za-z][A-Za-z\s\-]+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b\d{1,2}-\d+\b", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" -:;,.")


def normalize_option_key(text):
    cleaned = clean_option_text(text).lower()
    cleaned = re.sub(r"[^a-z0-9]+", " ", cleaned)
    return cleaned.strip()


def extract_option_tokens(text):
    words = re.findall(r"[a-z]{3,}", normalize_option_key(text))
    return {word for word in words if word not in OPTION_STOP_WORDS}


def option_similarity(left, right):
    left_tokens = extract_option_tokens(left)
    right_tokens = extract_option_tokens(right)

    if not left_tokens or not right_tokens:
        return 0.0

    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def first_content_word(text):
    for word in normalize_option_key(text).split():
        if word not in OPTION_STOP_WORDS:
            return word
    return ""


def looks_generic_distractor(text):
    cleaned = clean_option_text(text)
    if not cleaned:
        return True
    if looks_like_weak_option(cleaned):
        return True
    return any(pattern.search(cleaned) for pattern in GENERIC_DISTRACTOR_PATTERNS)


def looks_like_weak_option(text):
    if not text:
        return True

    cleaned = clean_option_text(text)
    words = cleaned.split()

    if len(words) < 4:
        return True

    if cleaned.lower() in {"note", "notes", "example", "examples"}:
        return True

    if words[-1].lower().strip(".,;:") in FRAGMENT_ENDINGS:
        return True

    if re.search(r"(amendment|table of contents|record of amendment)", cleaned, re.IGNORECASE):
        return True

    return False


def trim_trailing_fragments(text):
    cleaned = clean_option_text(text)
    words = cleaned.split()

    while words and words[-1].lower().strip(".,;:") in FRAGMENT_ENDINGS:
        words.pop()

    return " ".join(words).strip(" -:;,.")

def make_concept_summary(text, max_len=150):
    """Create a concise summary suitable for an answer option"""
    text = clean_option_text(text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'^\([a-z]\)\s*', '', text)
    text = re.sub(r'^\d+\.\d+\.?\d*\s*', '', text)
    if len(text) > max_len:
        # Try to cut at a sentence boundary
        sentences = re.split(r'(?<=[.;])\s+', text)
        result = ""
        for s in sentences:
            if len(result) + len(s) < max_len:
                result += s + " "
            else:
                break
        if result.strip():
            text = result.strip()
        else:
            truncated = text[:max_len].rsplit(" ", 1)[0].strip()
            text = f"{truncated}..." if truncated else text[:max_len] + "..."

    text = trim_trailing_fragments(text)

    if looks_like_weak_option(text):
        return ""

    return text


def score_distractor_candidate(candidate, correct_answer, context="", label=""):
    candidate_tokens = extract_option_tokens(candidate)
    correct_tokens = extract_option_tokens(correct_answer)
    context_tokens = extract_option_tokens(context)
    label_tokens = extract_option_tokens(label)

    score = 0
    score += len(candidate_tokens & correct_tokens) * 2
    score += len(candidate_tokens & context_tokens) * 4
    score += len(label_tokens & context_tokens) * 5

    if first_content_word(candidate) and first_content_word(candidate) == first_content_word(correct_answer):
        score += 4

    if 5 <= len(candidate.split()) <= 28:
        score += 2

    if abs(len(candidate.split()) - len(correct_answer.split())) <= 6:
        score += 2

    return score


def can_use_distractor(candidate, correct_answer, existing=None):
    if not candidate:
        return False

    candidate_key = normalize_option_key(candidate)
    correct_key = normalize_option_key(correct_answer)

    if not candidate_key or candidate_key == correct_key:
        return False

    if looks_generic_distractor(candidate):
        return False

    if option_similarity(candidate, correct_answer) >= 0.98:
        return False

    for item in existing or []:
        if not item:
            continue
        if normalize_option_key(item) == candidate_key:
            return False
        if option_similarity(candidate, item) >= 0.97:
            return False

    return True


def generate_subtle_variants(correct_answer):
    subtle_modifications = [
        lambda x: re.sub(r'\b(all|every|each)\b', 'some', x, flags=re.IGNORECASE),
        lambda x: re.sub(r'\b(must|shall)\b', 'should', x, flags=re.IGNORECASE),
        lambda x: re.sub(r'\b(required|mandatory)\b', 'recommended', x, flags=re.IGNORECASE),
        lambda x: re.sub(r'\b(always|continuously)\b', 'periodically', x, flags=re.IGNORECASE),
        lambda x: re.sub(r'\b(immediately|promptly|without delay)\b', 'after further review', x, flags=re.IGNORECASE),
        lambda x: re.sub(r'\bbefore\b', 'after', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\bminimum\b', 'maximum', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\bAuthority\b', 'operator', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\boperator\b', 'Authority', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\b(organization|service provider)\b', 'operator', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\bensure\b', 'consider', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\bmaintain\b', 'review', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\bimplement\b', 'document', x, count=1, flags=re.IGNORECASE),
        lambda x: re.sub(r'\bapply\b', 'review', x, count=1, flags=re.IGNORECASE),
    ]

    variants = []
    correct_key = normalize_option_key(correct_answer)

    for modifier in subtle_modifications:
        try:
            modified = modifier(correct_answer)
        except Exception:
            continue

        if normalize_option_key(modified) == correct_key:
            continue

        cleaned = make_concept_summary(modified, 150)
        if cleaned and normalize_option_key(cleaned) != correct_key:
            variants.append(cleaned)

    return variants

# ============================================================================
# SMART DISTRACTOR GENERATION
# ============================================================================

def generate_smart_distractors(correct_answer, concept_type, all_concepts, context="", pages_data=None):
    """Generate plausible but incorrect distractors that require understanding to differentiate
    
    Args:
        correct_answer: The correct answer text
        concept_type: Type of concept (definition, responsibility, requirement, etc.)
        all_concepts: Dictionary of all extracted concepts
        context: Additional context (optional)
        pages_data: Page data from PDF (optional)
        
    Returns:
        List of 3 distractor strings
    """
    distractors = []
    correct_lower = correct_answer.lower()
    candidates = {}

    def queue_candidate(text, label=""):
        cleaned = make_concept_summary(text, 150)
        if not can_use_distractor(cleaned, correct_answer):
            return

        key = normalize_option_key(cleaned)
        score = score_distractor_candidate(cleaned, correct_answer, context=context, label=label)
        existing = candidates.get(key)

        if existing is None or score > existing[0]:
            candidates[key] = (score, cleaned)
    
    # Strategy 1: Use other similar concepts from the same document (most plausible)
    if concept_type == "definition" and "definitions" in all_concepts:
        context_tokens = extract_option_tokens(context)
        for definition in all_concepts["definitions"]:
            meaning = definition.get("meaning", "")
            if meaning.lower() == correct_lower or len(meaning) <= 20:
                continue
            label_tokens = extract_option_tokens(definition.get("term", ""))
            if context_tokens and label_tokens and not (label_tokens & context_tokens):
                continue
            queue_candidate(meaning, label=definition.get("term", ""))
    
    elif concept_type == "responsibility" and "responsibilities" in all_concepts:
        for responsibility in all_concepts["responsibilities"]:
            entity = responsibility.get("entity", "").title()
            if entity.lower() == correct_lower:
                continue
            queue_candidate(entity, label=responsibility.get("action", ""))
    
    elif concept_type in ["requirement", "purpose", "application"]:
        if "requirements" in all_concepts:
            for requirement in all_concepts["requirements"]:
                text = requirement.get("requirement", "")
                if text.lower() != correct_lower:
                    queue_candidate(text, label=requirement.get("topic_label") or requirement.get("context", ""))
        
        if "purposes" in all_concepts:
            for purpose in all_concepts["purposes"]:
                text = purpose.get("purpose", "")
                if text.lower() != correct_lower:
                    queue_candidate(text, label=purpose.get("topic_label") or purpose.get("context", ""))

        if "procedures" in all_concepts:
            for procedure in all_concepts["procedures"]:
                text = procedure.get("text", "")
                if text.lower() != correct_lower:
                    queue_candidate(text, label=" ".join(procedure.get("groups", [])))
    
    # Strategy 2: Subtle modifications to correct answer (requires careful reading)
    for variant in generate_subtle_variants(correct_answer):
        queue_candidate(variant, label=context)

    ranked_candidates = sorted(candidates.values(), key=lambda item: item[0], reverse=True)
    for _, candidate in ranked_candidates:
        if can_use_distractor(candidate, correct_answer, existing=distractors):
            distractors.append(candidate)
            if len(distractors) >= 3:
                break
    
    return distractors[:3]
