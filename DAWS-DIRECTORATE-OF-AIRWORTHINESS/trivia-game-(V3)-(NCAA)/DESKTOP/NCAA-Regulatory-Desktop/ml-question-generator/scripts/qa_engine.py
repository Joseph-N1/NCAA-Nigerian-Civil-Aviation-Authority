import sys
import re
import string
from pathlib import Path
from typing import Dict, List, Sequence

# Add project root to path
CURRENT_DIR = Path(__file__).parent
PROJECT_ROOT = CURRENT_DIR.parent
sys.path.append(str(PROJECT_ROOT))

# Lazy-load optional dependencies
try:
    from core.vector_store import search_similar_chunks
    _vector_store_available = True
except (ImportError, Exception) as e:
    _vector_store_available = False
    search_similar_chunks = None
    print(f"Warning: vector_store not available: {e}")

from core.catalog import get_document_catalog, get_document_record, load_indexed_document
from core.answer_annotations import build_answer_blocks


# ==========================
# CONFIG
# ==========================

TOP_K = 3


# ==========================
# DOMAIN MAPPING
# ==========================

DOMAIN_MAP = {
    "1": "General Policies, Procedures and Definitions",
    "2": "Personnel Licensing",
    "3": "Approved Training Organization",
    "4": "Aircraft Registration & Marking",
    "5": "Airworthiness",
    "6": "Approved Maintenance Organization",
    "7": "Instrument and Equipment",
    "8": "Operations",
    "9": "Air Operator Certification and Administration",
    "10": "Commercial Air Transport by Foreign Air Operators within Nigeria",
    "11": "Aerial Work",
    "12": "Aerodrome and Heliport Regulations",
    "14": "Air Navigation Services",
    "15": "Safe Transport of Dangerous Goods by Air",
    "16": "Environmental Protection",
    "17": "Aviation Security",
    "18": "Air Transport Economics",
    "19": "Consumer Protection",
    "20": "Safety Management",
    "21": "Remotely Piloted Aircraft System",
}

QUESTION_DOMAIN_KEYWORDS = [
    ("Schedule", ["fee", "fees", "charge", "charges", "payment", "tariff", "levy"]),
    ("Part 21", ["rpas", "remotely piloted", "drone", "uas", "uav", "unmanned", "remote pilot"]),
    ("Part 20", ["safety management", "sms", "hazard", "risk management", "safety assurance", "safety promotion"]),
    ("Part 19", ["consumer protection", "passenger rights", "refund", "denied boarding", "delay", "cancellation", "baggage claim"]),
    ("Part 17", ["security", "screening", "access control", "unlawful interference", "sterile area", "security programme"]),
    ("Part 15", ["dangerous goods", "lithium battery", "shipper", "hazmat", "dangerous article"]),
    ("Part 14", ["air navigation", "air traffic", "ats", "atc", "aeronautical information", "ais", "communication navigation surveillance", "cns"]),
    ("Part 12", ["aerodrome", "heliport", "runway", "taxiway", "apron", "airport operator", "rescue and firefighting"]),
    ("Part 10", ["foreign air operator", "foreign operator", "commercial air transport by foreign", "within nigeria"]),
    ("Part 9", ["air operator certificate", "aoc", "operator certification", "operator administration"]),
    ("Part 8", ["flight operations", "operational control", "dispatch", "flight duty", "fuel planning", "pilot in command", "pre flight"]),
    ("Part 7", ["instrument", "equipment", "elt", "altimeter", "radio equipment", "minimum equipment", "navigation equipment"]),
    ("Part 6", ["approved maintenance organization", "amo", "maintenance organization", "maintenance facility", "maintenance exposition"]),
    ("Part 5", ["airworthiness", "maintenance records", "maintenance record", "maintenance release", "return to service", "damage", "repair", "continuing airworthiness", "certificate of airworthiness"]),
    ("Part 4", ["registration", "marking", "nationality mark", "registration mark"]),
    ("Part 3", ["approved training organization", "ato", "training organization", "flight training school"]),
    ("Part 2", ["licence", "license", "rating", "pilot", "instructor", "medical certificate", "flight crew", "personnel licensing"]),
    ("Part 1", ["definition", "definitions", "abbreviation", "interpretation", "meaning of", "term"]),
]


# ==========================
# CITATION HELPERS
# ==========================

def extract_part_from_doc_id(doc_id: str):
    if not doc_id:
        return None

    record = get_document_record(doc_id=doc_id)
    if record and record.get("regulatory_part"):
        return record["regulatory_part"]

    match = re.search(r"part-(\d+)", doc_id.lower())
    if match:
        return f"Part {int(match.group(1))}"
    return None


def format_citation(metadata: Dict):
    doc_id = metadata.get("doc_id")
    page = metadata.get("page")
    section = metadata.get("section")
    record = get_document_record(doc_id=doc_id)

    part = metadata.get("regulatory_part") or extract_part_from_doc_id(doc_id)
    title = metadata.get("title") or (record.get("title") if record else None) or doc_id
    document_family = metadata.get("document_family") or (record.get("document_family") if record else None)
    family_label = metadata.get("document_family_label") or (record.get("document_family_label") if record else None)

    if document_family == "nig_cars":
        if part:
            citation = f"Nig. CARs {part}"
            if title and " - " in title:
                citation += f" - {title.split(' - ', 1)[1]}"
        else:
            citation = f"Nig. CARs - {title}"
    else:
        citation = f"{family_label or 'Database Document'} - {title}"

    if section:
        citation += f" – Section {section}"

    if page:
        citation += f" (Page {page})"

    return citation


# ==========================
# QUERY EXPANSION
# ==========================

def expand_query(question: str, detected_domain: str) -> str:
    """Expand query with domain-specific terms for better retrieval."""
    q = question.lower()

    if detected_domain == "Part 5" and "return to service" in q:
        return question + " maintenance release airworthy certification maintenance records compliance"

    return question


# ==========================
# RETRIEVAL
# ==========================

def retrieve_context(query: str):
    # Detect expected domain from question keywords first
    detected_domain = detect_question_domain(query)

    # Check if vector store is available
    if not _vector_store_available or not search_similar_chunks:
        return retrieve_context_lexical(query, detected_domain)

    # Expand query with domain-specific terms
    expanded_query = expand_query(query, detected_domain)

    results = search_similar_chunks(expanded_query, top_k=TOP_K)

    chunk_data = []

    for result in results:
        metadata = result["metadata"]
        text = metadata["text"]
        base_score = result["score"]

        citation = format_citation(metadata)

        # Boost score if chunk matches detected domain
        boosted_score = base_score
        if detected_domain != "Unknown" and detected_domain in citation:
            boosted_score += 0.05  # Domain match boost (normalized scale)

        chunk_data.append({
            "doc_id": metadata.get("doc_id"),
            "relative_path": metadata.get("relative_path"),
            "page": metadata.get("page"),
            "section": metadata.get("section"),
            "text": text,
            "citation": citation,
            "score": boosted_score,
            "base_score": base_score,
            "title": metadata.get("title"),
            "document_family": metadata.get("document_family"),
            "document_family_label": metadata.get("document_family_label"),
            "regulatory_part": metadata.get("regulatory_part"),
        })

    # Re-sort by boosted score (descending) - matching domain dominates
    chunk_data.sort(key=lambda x: x["score"], reverse=True)

    # Filter chunks by detected domain if known
    if detected_domain != "Unknown":
        filtered_chunks = [
            chunk for chunk in chunk_data
            if detected_domain in chunk["citation"]
        ]
        # Use filtered chunks if we have any, otherwise fallback to all
        top_chunks = filtered_chunks if filtered_chunks else chunk_data
    else:
        top_chunks = chunk_data

    context_blocks = [c["text"] for c in top_chunks]
    citations = [c["citation"] for c in top_chunks]
    scores = [c["score"] for c in top_chunks]

    combined_context = "\n\n".join(context_blocks)

    avg_score = sum(scores) / len(scores) if scores else 0

    return combined_context, list(dict.fromkeys(citations)), avg_score, detected_domain, top_chunks


def tokenize_query_text(text: str):
    stop_words = {
        "a", "an", "and", "are", "after", "against", "be", "before", "by",
        "completed", "does", "for", "from", "in", "is", "must", "of", "on",
        "or", "question", "the", "to", "what", "which", "who", "with",
    }
    return [
        token for token in re.findall(r"[a-z0-9]{3,}", clean_text_for_matching(text))
        if token not in stop_words
    ]


def score_lexical_chunk(query: str, chunk_text: str, detected_domain: str):
    query_tokens = tokenize_query_text(query)
    chunk_clean = clean_text_for_matching(chunk_text)
    chunk_tokens = set(chunk_clean.split())

    if not query_tokens or not chunk_tokens:
        return 0

    score = sum(3 for token in query_tokens if token in chunk_tokens)

    query_lower = query.lower()
    chunk_lower = chunk_text.lower()
    important_phrases = [
        "maintenance records",
        "maintenance release",
        "return to service",
        "approved maintenance organization",
        "basic details",
        "date such maintenance was completed",
        "person signing",
        "license or authorization number",
    ]
    for phrase in important_phrases:
        if phrase in query_lower and phrase in chunk_lower:
            score += 12
        elif any(term in query_lower for term in phrase.split()) and phrase in chunk_lower:
            score += 4

    if detected_domain != "Unknown" and detected_domain.lower() in chunk_lower:
        score += 5

    return score


def iter_index_chunks(record: Dict):
    index_data = load_indexed_document(record["doc_id"])
    if not index_data:
        return

    chunks = index_data.get("chunks") or []
    if chunks:
        for chunk in chunks:
            text = chunk.get("text", "")
            if text:
                yield chunk
        return

    for page in index_data.get("pages") or []:
        text = page.get("text", "")
        if text:
            yield {
                "chunk_id": f"page-{page.get('page_num')}",
                "page": page.get("page_num"),
                "section": (page.get("headings") or [None])[0],
                "text": text,
            }


def retrieve_context_lexical(query: str, detected_domain: str):
    """Fallback retrieval that uses the content index when embeddings are unavailable."""
    records = get_document_catalog()
    if detected_domain != "Unknown":
        domain_records = [record for record in records if record.get("regulatory_part") == detected_domain]
        if domain_records:
            records = domain_records

    candidates = []
    for record in records:
        for chunk in iter_index_chunks(record) or []:
            text = chunk.get("text", "")
            score = score_lexical_chunk(query, text, detected_domain)
            if score <= 0:
                continue

            metadata = {
                "doc_id": record["doc_id"],
                "relative_path": record.get("relative_path"),
                "page": chunk.get("page"),
                "section": chunk.get("section"),
                "text": text,
                "title": record.get("title"),
                "document_family": record.get("document_family"),
                "document_family_label": record.get("document_family_label"),
                "regulatory_part": record.get("regulatory_part"),
            }
            candidates.append({
                **metadata,
                "citation": format_citation(metadata),
                "score": score,
                "base_score": score,
            })

    candidates.sort(key=lambda item: item["score"], reverse=True)
    top_chunks = candidates[:TOP_K]

    context_blocks = [chunk["text"] for chunk in top_chunks]
    citations = [chunk["citation"] for chunk in top_chunks]
    combined_context = "\n\n".join(context_blocks)
    best_score = top_chunks[0]["score"] if top_chunks else 0
    avg_score = min(0.95, best_score / 30) if top_chunks else 0

    return combined_context, list(dict.fromkeys(citations)), avg_score, detected_domain, top_chunks


# ==========================
# CONFIDENCE LABELING
# ==========================

def get_confidence_label(confidence: float) -> str:
    if confidence > 0.70:
        return "High"
    elif confidence > 0.50:
        return "Medium"
    else:
        return "Low"


def format_legacy_answer(
    answer_text: str,
    confidence: float = None,
    detected_domain: str = None,
    retrieved_domain: str = None,
    sources: List[str] = None
) -> str:
    sections = [f"Answer:\n{answer_text}"]

    metadata_lines = []
    if confidence is not None:
        metadata_lines.append(f"Confidence: {confidence:.2f}")
    if detected_domain and detected_domain != "Unknown":
        metadata_lines.append(f"Expected Domain: {detected_domain}")
    if retrieved_domain:
        metadata_lines.append(f"Retrieved Domain: {retrieved_domain}")

    if metadata_lines:
        sections.append("\n".join(metadata_lines))

    if sources:
        citation_block = "\n".join(f"- {citation}" for citation in sources)
        sections.append(f"Sources:\n{citation_block}")

    return "\n\n".join(sections)


def parse_answer_structure(answer_text: str):
    lines = [line.strip() for line in answer_text.splitlines() if line.strip()]
    if not lines:
        return None, []

    summary_lines = []
    answer_points = []

    for line in lines:
        bullet_match = re.match(r"^[-*•]\s+(.*)", line)
        numbered_match = re.match(r"^\d+\.\s+(.*)", line)

        if bullet_match:
            answer_points.append(bullet_match.group(1).strip())
        elif numbered_match:
            answer_points.append(numbered_match.group(1).strip())
        else:
            summary_lines.append(line)

    if not answer_points and len(summary_lines) > 1:
        return summary_lines[0], summary_lines[1:]

    answer_summary = " ".join(summary_lines) if summary_lines else None
    return answer_summary, answer_points


def build_result(
    answer_text: str,
    detected_domain: str,
    retrieved_domain: str = None,
    subcontext: str = None,
    confidence: float = None,
    cross_refs: List[str] = None,
    sources: List[str] = None,
    source_chunks: Sequence[Dict] = None,
) -> Dict:
    answer_summary, answer_points = parse_answer_structure(answer_text)
    normalized_source_chunks = [dict(chunk) for chunk in (source_chunks or [])]
    answer_blocks = build_answer_blocks(
        answer_summary,
        answer_points,
        normalized_source_chunks,
        detected_domain=detected_domain,
        retrieved_domain=retrieved_domain,
    )

    return {
        "detected_domain": detected_domain,
        "retrieved_domain": retrieved_domain,
        "subcontext": subcontext,
        "confidence": confidence,
        "confidence_label": get_confidence_label(confidence) if confidence is not None else None,
        "cross_refs": cross_refs or [],
        "sources": sources or [],
        "source_chunks": normalized_source_chunks,
        "answer_summary": answer_summary,
        "answer_points": answer_points,
        "answer_blocks": answer_blocks,
        "answer_text": answer_text,
        "answer": format_legacy_answer(
            answer_text,
            confidence=confidence,
            detected_domain=detected_domain,
            retrieved_domain=retrieved_domain,
            sources=sources or []
        ),
    }


# ==========================
# GUARDRAILS
# ==========================

def guardrail_check(context: str, avg_score: float):
    if len(context.strip()) < 200:
        return False, "Insufficient regulatory context retrieved."

    if avg_score < 0.60:
        return False, "Retrieved content has low semantic similarity."

    return True, None


def check_topic_consistency(question: str, answer: str, threshold: int = 2) -> bool:
    """
    Check that key nouns from question appear in answer.
    Returns True if overlap >= threshold.
    """
    # Common stop words to exclude
    stop_words = {
        "what", "who", "where", "when", "why", "how", "is", "are", "the",
        "a", "an", "in", "on", "at", "for", "to", "of", "and", "or",
        "does", "do", "can", "should", "must", "will", "be", "been",
        "with", "from", "by", "about", "between", "into", "through"
    }

    question_words = set(clean_text_for_matching(question).split()) - stop_words
    answer_words = set(clean_text_for_matching(answer).split()) - stop_words

    overlap = len(question_words.intersection(answer_words))
    return overlap >= threshold


def detect_domain(citations: List[str]) -> str:
    """
    Detect which Part/domain is being retrieved from citations.
    Returns domain string like "Airworthiness (Part 5)".
    """
    parts_found = []
    titles_found = []

    for citation in citations:
        match = re.search(r"Part (\d+)", citation)
        if match:
            part_num = match.group(1)
            if part_num not in parts_found:
                parts_found.append(part_num)
        elif "Schedule of Fees and Charges" in citation and "Schedule of Fees and Charges" not in titles_found:
            titles_found.append("Schedule of Fees and Charges")

    if not parts_found and not titles_found:
        return None

    # Build domain string
    domains = []
    for part_num in parts_found:
        domain_name = DOMAIN_MAP.get(part_num, "Unknown")
        domains.append(f"{domain_name} (Part {part_num})")
    domains.extend(titles_found)

    return ", ".join(domains)


def detect_part5_subcontext(text: str) -> str:
    """
    Detect subcontext within Part 5 (damage vs maintenance).
    """
    text = text.lower()

    damage_terms = [
        "damage",
        "sustained",
        "resuming flight",
        "restored to an airworthy condition",
        "authority considers"
    ]

    maintenance_terms = [
        "maintenance release",
        "approval for return to service",
        "maintenance records",
        "certifying",
        "licensed in accordance"
    ]

    damage_score = sum(1 for term in damage_terms if term in text)
    maintenance_score = sum(1 for term in maintenance_terms if term in text)

    if damage_score > 0 and maintenance_score > 0:
        return "Ambiguous"
    elif damage_score > 0:
        return "Damage Context"
    elif maintenance_score > 0:
        return "Maintenance Context"
    else:
        return "Unknown"


def detect_question_domain(question: str) -> str:
    """
    Detect which Part the question is targeting based on keyword matching.
    """
    normalized_question = question.lower()

    if "maintenance" in normalized_question and ("record" in normalized_question or "entry" in normalized_question):
        return "Part 5"

    for domain_name, keywords in QUESTION_DOMAIN_KEYWORDS:
        if any(keyword in normalized_question for keyword in keywords):
            return domain_name

    return "Unknown"


def detect_cross_reference(question):
    question = question.lower()

    cross_refs = []

    if any(word in question for word in [
        "maintenance",
        "return to service",
        "airworthiness",
        "repair",
        "approved maintenance organization",
        "amo",
    ]):
        cross_refs.append("Part 5 – Airworthiness")
        cross_refs.append("Part 6 – Approved Maintenance Organization")

    if any(word in question for word in [
        "licence",
        "license",
        "pilot",
        "instructor",
        "rating",
        "medical certificate",
    ]):
        cross_refs.append("Part 2 – Personnel Licensing")
        cross_refs.append("Part 3 – Approved Training Organization")

    if any(word in question for word in [
        "operator",
        "aoc",
        "operational control",
        "dispatch",
        "flight operations",
    ]):
        cross_refs.append("Part 8 – Operations")
        cross_refs.append("Part 9 – Air Operator Certification and Administration")

    if any(word in question for word in [
        "aerodrome",
        "heliport",
        "runway",
        "taxiway",
    ]):
        cross_refs.append("Part 12 – Aerodrome and Heliport Regulations")

    if any(word in question for word in [
        "dangerous goods",
        "lithium battery",
        "hazmat",
    ]):
        cross_refs.append("Part 15 – Safe Transport of Dangerous Goods by Air")

    if any(word in question for word in [
        "security",
        "screening",
        "unlawful interference",
    ]):
        cross_refs.append("Part 17 – Aviation Security")

    if any(word in question for word in [
        "hazard",
        "risk management",
        "safety management",
        "sms",
    ]):
        cross_refs.append("Part 20 – Safety Management")

    return list(dict.fromkeys(cross_refs))


# ==========================
# PROMPT BUILDER
# ==========================

def build_prompt(question: str, context: str) -> str:
    return f"""
You are an aviation regulatory assistant.

Answer strictly using the provided regulatory context.
Do NOT invent information.
Write a structured, professional answer.

Question:
{question}

Regulatory Context:
{context}
"""


# ==========================
# REGULATORY WEIGHTING
# ==========================

OBLIGATION_TERMS = [
    "shall", "must", "required", "approved",
    "certified", "completed", "no person may",
    "ensure", "shall not", "is required to",
    "shall ensure", "is responsible for",
    "may not", "must not"
]

CONDITION_TERMS = [
    "before", "prior", "until", "unless",
    "condition", "requirement"
]


# ==========================
# MOCK LLM (FREE)
# ==========================

def clean_regulatory_artifacts(text: str) -> str:
    # Remove isolated numbering like "(1).", "(7)."
    text = re.sub(r"\(\d+\)\.?", "", text)

    # Remove stray numbering lines like "Part 5 - AIRWORTHINESS 1."
    text = re.sub(r"Part\s+\d+\s*-\s*AIRWORTHINESS\s*\d*\.?", "", text)

    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def clean_text_for_matching(text):
    return text.lower().translate(str.maketrans('', '', string.punctuation))


def remove_fragments(sentences):
    """Remove broken clause fragments that are too short or start with conjunctions."""
    cleaned = []
    for s in sentences:
        if len(s.split()) > 8 and not s.strip().lower().startswith(("when", "if", "and")):
            cleaned.append(s)
    return cleaned


def extract_intent_terms(question: str):
    q = question.lower()

    intent_boost_terms = []
    penalty_terms = []
    hard_negative_terms = []

    if "return to service" in q or "before" in q or "maintenance" in q or "airworthiness" in q:
        intent_boost_terms += [
            "return to service",
            "maintenance release",
            "airworthy",
            "certifying",
            "signed",
            "completed",
            "approval"
        ]

        penalty_terms += [
            "expiry",
            "service life",
            "incident",
            "accident",
            "disposal"
        ]

        # Part 17 bleed prevention
        hard_negative_terms += [
            "security programme",
            "airport",
            "screening",
            "passengers",
            "cargo",
            "sterile area"
        ]

    if "licence" in q or "licensing" in q:
        intent_boost_terms += [
            "licence",
            "rating",
            "medical",
            "authorisation",
            "knowledge test",
            "skill test"
        ]

        # Prevent airworthiness bleed
        hard_negative_terms += [
            "maintenance release",
            "return to service",
            "airworthy"
        ]

    if "security" in q:
        intent_boost_terms += [
            "screening",
            "sterile area",
            "security programme",
            "unauthorized interference"
        ]

        # Prevent airworthiness bleed
        hard_negative_terms += [
            "maintenance release",
            "return to service",
            "airworthy",
            "certificate of airworthiness"
        ]

    return intent_boost_terms, penalty_terms, hard_negative_terms


def mock_llm_generate(prompt: str, context: str, question: str = ""):
    """
    Returns: tuple of (answer_text, confidence_score)
    """
    sentences = re.split(r'[.;]\s+', context)

    question_words = set(clean_text_for_matching(question).split())

    intent_boost_terms, penalty_terms, hard_negative_terms = extract_intent_terms(question)

    scored_sentences = []

    for sentence in sentences:
        sentence_clean = clean_text_for_matching(sentence)
        sentence_words = set(sentence_clean.split())

        overlap = len(question_words.intersection(sentence_words))

        obligation_weight = sum(
            1 for term in OBLIGATION_TERMS if term in sentence_clean
        )

        condition_weight = sum(
            1 for term in CONDITION_TERMS if term in sentence_clean
        )

        intent_boost = sum(
            1 for term in intent_boost_terms if term in sentence_clean
        )

        penalty = sum(
            1 for term in penalty_terms if term in sentence_clean
        )

        # Hard negative filter for domain drift prevention
        hard_negative_hit = any(
            term in sentence_clean for term in hard_negative_terms
        )

        score = (
            overlap
            + (2 * obligation_weight)
            + condition_weight
            + (3 * intent_boost)
            - (2 * penalty)
        )

        if intent_boost > 0:
            score += 2

        if hard_negative_hit:
            score -= 5

        scored_sentences.append((score, sentence))

    scored_sentences.sort(reverse=True, key=lambda x: x[0])

    # Real confidence scoring with sigmoid-like soft cap
    max_score = scored_sentences[0][0] if scored_sentences else 0
    confidence = round(
        max_score / (max_score + 5),
        2
    )

    # Topic coherence filter: keep sentences that share tokens with top sentence
    top_sentences = [(s[0], s[1]) for s in scored_sentences if s[0] > 0][:8]

    if not top_sentences:
        return "No clearly defined regulatory conditions were identified in the retrieved context.", confidence

    # Get key tokens from top scoring sentence
    primary_tokens = set(clean_text_for_matching(top_sentences[0][1]).split())

    # Filter to sentences sharing at least 1 key token with top sentence
    filtered_sentences = [
        s for s in top_sentences
        if len(primary_tokens.intersection(set(clean_text_for_matching(s[1]).split()))) >= 1
    ]

    # Take top 6 coherent sentences
    best_sentences = [s[1] for s in filtered_sentences][:6]

    if not best_sentences:
        # Fallback to top sentences if filter is too strict
        best_sentences = [s[1] for s in top_sentences][:6]

    cleaned_sentences = [clean_regulatory_artifacts(s) for s in best_sentences]

    # Remove broken clause fragments
    cleaned_sentences = remove_fragments(cleaned_sentences)

    if not cleaned_sentences:
        return "No clearly defined regulatory conditions were identified in the retrieved context.", confidence

    question_lower = question.lower()
    if "record" in question_lower:
        intro = "Based on the applicable provisions of the Nigerian Civil Aviation Regulations, the following records or entries are required:"
    elif "who" in question_lower or "responsible" in question_lower:
        intro = "Based on the applicable provisions of the Nigerian Civil Aviation Regulations, responsibility is described as follows:"
    else:
        intro = "Based on the applicable provisions of the Nigerian Civil Aviation Regulations, the following conditions must be satisfied:"

    bullet_points = "\n".join(f"- {s.strip()}" for s in cleaned_sentences)

    return f"{intro}\n\n{bullet_points}", confidence


# ==========================
# MAIN QA ENGINE
# ==========================

def run_engine(question: str):
    """
    Run the QA engine and return structured result.
    
    Returns:
        dict with keys including detected_domain, retrieved_domain,
        subcontext, confidence, cross_refs, sources, answer_text, answer
    """
    context, citations, avg_score, detected_domain, source_chunks = retrieve_context(question)
    retrieved_domain = detect_domain(citations)

    print(f"\nDetected Regulatory Domain: {detected_domain}")

    cross_refs = detect_cross_reference(question)
    if cross_refs:
        print("\nCross-Referenced Regulations:")
        for ref in cross_refs:
            print(f"- {ref}")

    subcontext = None

    # Check for Part 5 subcontext ambiguity
    if detected_domain == "Part 5":
        subcontext = detect_part5_subcontext(context)
        print(f"Part 5 Subcontext: {subcontext}")

        if subcontext == "Ambiguous":
            return build_result(
                answer_text="""Ambiguity detected in regulatory context.

The phrase 'returned to service' appears in multiple regulatory contexts under Part 5:
1. Return to service after maintenance (maintenance release requirements)
2. Return to service after damage (airworthiness restoration by Authority)

Please clarify which context you are referring to:
- For maintenance: "What are the requirements for maintenance release?"
- For damage: "What are the requirements after aircraft damage?""",
                detected_domain=detected_domain,
                retrieved_domain=retrieved_domain,
                subcontext=subcontext,
                confidence=None,
                cross_refs=cross_refs,
                sources=citations,
                source_chunks=source_chunks,
            )

        # Damage context clarification (warning, not a stop)
        if subcontext == "Damage Context" and "maintenance" not in question.lower():
            print("\nNote: The question has been interpreted in the context of aircraft damage restoration under Part 5.")
            print("If you intended return to service after maintenance, please specify.")

    valid, reason = guardrail_check(context, avg_score)

    if not valid:
        return build_result(
            answer_text=f"Unable to generate a reliable answer.\n\nReason: {reason}",
            detected_domain=detected_domain,
            retrieved_domain=retrieved_domain,
            subcontext=subcontext,
            confidence=avg_score,
            cross_refs=cross_refs,
            sources=citations,
            source_chunks=source_chunks,
        )

    prompt = build_prompt(question, context)

    answer, real_confidence = mock_llm_generate(prompt, context, question)

    # Topic consistency check - downgrade confidence if poor overlap
    topic_consistent = check_topic_consistency(question, answer)
    if not topic_consistent:
        real_confidence = max(0.3, real_confidence - 0.2)  # Penalize topic drift

    # Safety rules based on confidence
    if real_confidence < 0.65:
        print("\nNote: Confidence is moderate. Consider refining the question for a more precise regulatory reference.")
    if real_confidence < 0.55:
        print("\nWarning: The system is uncertain about this answer. Please verify the cited regulation manually.")

    return build_result(
        answer_text=answer,
        detected_domain=detected_domain,
        retrieved_domain=retrieved_domain,
        subcontext=subcontext,
        confidence=real_confidence,
        cross_refs=cross_refs,
        sources=citations,
        source_chunks=source_chunks,
    )


def answer_question(question: str):
    """
    User-friendly wrapper around run_engine for backward compatibility.
    """
    result = run_engine(question)
    return result["answer"]


# ==========================
# CLI
# ==========================

if __name__ == "__main__":
    question = input("Enter your question: ")
    response = answer_question(question)
    print(response)
