# pipeline.py - Main question generation pipeline

import re
from .chunking import filter_source_chunks, normalize_source_text, split_into_chunks
from .concepts import extract_concepts
from .distractors import normalize_option_key
from .questions import (
    generate_definition_questions,
    generate_responsibility_questions,
    generate_scenario_questions,
    generate_purpose_questions,
    generate_requirement_questions,
    generate_not_questions,
)
from .hints import enrich_concepts_with_page_context, find_page_for_text, generate_context_aware_hint
from .explanations import build_detailed_explanation, build_page_reference

# Lazy-load vector search to avoid import errors if ML deps not available
try:
    from .search import query_vector_index
    _vector_search_available = True
except (ImportError, Exception):
    _vector_search_available = False
    query_vector_index = None

# ============================================================================
# DIFFICULTY MAPPING
# ============================================================================

DIFFICULTY_MAP = {
    "Understanding": "easy",
    "Responsibility": "medium",
    "Application": "hard",
    "Purpose": "medium",
    "Requirement": "medium",
    "Critical Thinking": "hard",
}

CATEGORY_PRIORITY = {
    "Requirement": 28,
    "Application": 25,
    "Responsibility": 20,
    "Purpose": 17,
    "Understanding": 15,
    "Critical Thinking": 12,
}

CATEGORY_TARGET_RATIO = {
    "Requirement": 0.24,
    "Application": 0.20,
    "Responsibility": 0.18,
    "Purpose": 0.14,
    "Understanding": 0.16,
    "Critical Thinking": 0.08,
}

LOW_SIGNAL_PATTERNS = [
    re.compile(r"\bnote\b", re.IGNORECASE),
    re.compile(r"\bgeneral principles\b", re.IGNORECASE),
    re.compile(r"\bthe applicable organization\b", re.IGNORECASE),
    re.compile(r"\brequirements analysis\b", re.IGNORECASE),
    re.compile(r"\b(?:of|for|to)\s+airworthiness\?$", re.IGNORECASE),
    re.compile(r"\b(?:of|for|to)\s+applicability\?$", re.IGNORECASE),
    re.compile(r"\b(?:of|for|to)\s+volume\?$", re.IGNORECASE),
]

QUESTION_DUPLICATE_STOP_WORDS = {
    "according",
    "action",
    "accountability",
    "applies",
    "appropriate",
    "best",
    "compliant",
    "compliance",
    "correct",
    "described",
    "defines",
    "definition",
    "designated",
    "directly",
    "entity",
    "following",
    "implementation",
    "mandatory",
    "mean",
    "meaning",
    "most",
    "option",
    "primary",
    "question",
    "regarding",
    "regulation",
    "regulations",
    "remain",
    "required",
    "requirement",
    "responsibility",
    "rests",
    "role",
    "statement",
    "true",
    "under",
    "which",
    "what",
    "when",
    "who",
}


def normalize_question_key(question):
    return re.sub(r"\s+", " ", (question or "").strip().lower())


def extract_distinctive_tokens(*values):
    tokens = set()
    for value in values:
        normalized = normalize_question_key(value)
        for token in re.findall(r"[a-z]{4,}", normalized):
            if token not in QUESTION_DUPLICATE_STOP_WORDS:
                tokens.add(token)
    return tokens


def token_similarity(left_tokens, right_tokens):
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def question_focus_key(question):
    return normalize_question_key(
        question.get("studyFocus")
        or question.get("topic")
        or question.get("section_heading")
        or question.get("section_title")
        or ""
    )


def question_answer_key(question):
    return normalize_option_key(question.get("correctAnswer", ""))


def question_prompt_tokens(question):
    return extract_distinctive_tokens(
        question.get("question", ""),
        question.get("studyFocus", ""),
        question.get("topic", ""),
        question.get("section_heading", ""),
        question.get("section_title", ""),
    )


def question_answer_tokens(question):
    return extract_distinctive_tokens(question.get("correctAnswer", ""))


def looks_low_signal(text):
    cleaned = (text or "").strip()
    if not cleaned:
        return True
    return any(pattern.search(cleaned) for pattern in LOW_SIGNAL_PATTERNS)


def score_question_candidate(question):
    category = question.get("category", "Understanding")
    prompt = question.get("question", "")
    answer = question.get("correctAnswer", "")
    topic = question.get("topic", "")
    study_focus = question.get("studyFocus", "")
    context = question.get("context", "")

    score = CATEGORY_PRIORITY.get(category, 10)

    question_word_count = len(prompt.split())
    if 8 <= question_word_count <= 20:
        score += 5
    elif question_word_count < 6 or question_word_count > 26:
        score -= 3

    answer_word_count = len(answer.split())
    if category != "Critical Thinking":
        if 8 <= answer_word_count <= 28:
            score += 6
        elif answer_word_count < 6 or answer_word_count > 38:
            score -= 4

    if study_focus and not looks_low_signal(study_focus):
        score += 6
    elif study_focus:
        score -= 5
    if topic and not looks_low_signal(topic):
        score += 4
    elif topic:
        score -= 6
    if context:
        score += 2
    if question.get("section_heading"):
        score += 4
    if question.get("page_num"):
        score += 2

    option_keys = [normalize_option_key(option) for option in question.get("options", []) if normalize_option_key(option)]
    if len(option_keys) == 4 and len(set(option_keys)) == 4:
        score += 4
    elif option_keys:
        score -= 12

    if looks_low_signal(prompt):
        score -= 10
    if category != "Critical Thinking" and looks_low_signal(answer):
        score -= 6

    return score


def questions_are_near_duplicates(left, right):
    left_answer_key = question_answer_key(left)
    right_answer_key = question_answer_key(right)
    left_focus = question_focus_key(left)
    right_focus = question_focus_key(right)

    if left_answer_key and left_answer_key == right_answer_key:
        if left_focus and left_focus == right_focus:
            return True
        if (
            normalize_question_key(left.get("section_heading", ""))
            and normalize_question_key(left.get("section_heading", "")) == normalize_question_key(right.get("section_heading", ""))
        ):
            return True

    prompt_similarity = token_similarity(question_prompt_tokens(left), question_prompt_tokens(right))
    answer_similarity = token_similarity(question_answer_tokens(left), question_answer_tokens(right))

    if prompt_similarity >= 0.82 and answer_similarity >= 0.60:
        return True
    if left_answer_key and left_answer_key == right_answer_key and prompt_similarity >= 0.62:
        return True
    if left_focus and left_focus == right_focus and prompt_similarity >= 0.72:
        return True
    if left.get("category") == right.get("category") == "Responsibility" and left_answer_key == right_answer_key and prompt_similarity >= 0.60:
        return True

    return False


def dedupe_questions(questions):
    unique_questions = []
    for question in questions:
        if any(questions_are_near_duplicates(question, existing) for existing in unique_questions):
            continue
        unique_questions.append(question)
    return unique_questions


def build_category_targets(max_questions):
    ordered_categories = sorted(CATEGORY_PRIORITY, key=CATEGORY_PRIORITY.get, reverse=True)
    targets = {category: int(max_questions * CATEGORY_TARGET_RATIO.get(category, 0)) for category in ordered_categories}
    assigned = sum(targets.values())

    while assigned < max_questions:
        for category in ordered_categories:
            if assigned >= max_questions:
                break
            targets[category] += 1
            assigned += 1

    return targets


def select_best_questions(all_questions, max_questions):
    unique_questions = dedupe_questions(all_questions)
    for question in unique_questions:
        question["_quality_score"] = score_question_candidate(question)

    buckets = {}
    for question in unique_questions:
        buckets.setdefault(question.get("category", "Understanding"), []).append(question)

    for category_questions in buckets.values():
        category_questions.sort(key=lambda item: item["_quality_score"], reverse=True)

    selected = []
    selected_ids = set()
    targets = build_category_targets(max_questions)
    focus_counts = {}
    responsibility_answer_counts = {}

    def register_selection(question):
        selected.append(question)
        selected_ids.add(id(question))

        focus_key = question_focus_key(question)
        if focus_key:
            focus_counts[focus_key] = focus_counts.get(focus_key, 0) + 1

        answer_key = question_answer_key(question)
        if question.get("category") == "Responsibility" and answer_key:
            responsibility_answer_counts[answer_key] = responsibility_answer_counts.get(answer_key, 0) + 1

    def can_select(question, enforce_focus_cap=True):
        if any(questions_are_near_duplicates(question, existing) for existing in selected):
            return False

        focus_key = question_focus_key(question)
        if enforce_focus_cap and focus_key and focus_counts.get(focus_key, 0) >= 2:
            return False

        answer_key = question_answer_key(question)
        if (
            enforce_focus_cap
            and question.get("category") == "Responsibility"
            and answer_key
            and responsibility_answer_counts.get(answer_key, 0) >= 2
        ):
            return False

        return True

    for category in sorted(CATEGORY_PRIORITY, key=CATEGORY_PRIORITY.get, reverse=True):
        pool = buckets.get(category, [])
        target = targets.get(category, 0)
        retained_pool = []
        added = 0

        for question in pool:
            if added < target and can_select(question, enforce_focus_cap=True):
                register_selection(question)
                added += 1
            else:
                retained_pool.append(question)

        buckets[category] = retained_pool

    if len(selected) < max_questions:
        remaining = []
        for pool in buckets.values():
            remaining.extend(pool)
        remaining.sort(key=lambda item: item["_quality_score"], reverse=True)

        for question in remaining:
            if len(selected) >= max_questions:
                break
            if id(question) in selected_ids:
                continue
            if can_select(question, enforce_focus_cap=False):
                register_selection(question)

        if len(selected) < max_questions:
            for question in remaining:
                if len(selected) >= max_questions:
                    break
                if id(question) in selected_ids:
                    continue
                register_selection(question)

    selected.sort(
        key=lambda item: (
            {"easy": 0, "medium": 1, "hard": 2}.get(DIFFICULTY_MAP.get(item.get("category", ""), "medium"), 1),
            -item["_quality_score"],
        )
    )
    return selected[:max_questions]

# ============================================================================
# MAIN GENERATION PIPELINE
# ============================================================================

def generate_questions_json(text=None, max_questions=40, section_size=5, pages_data=None, 
                            doc_id=None, query=None, top_k=10):
    """Main function to generate exam-style questions from PDF text
    
    Args:
        text: Full document text (legacy mode)
        max_questions: Maximum number of questions to generate
        section_size: Questions per section
        pages_data: List of {page_num, text, headings} dicts from PDF extraction
        doc_id: Document ID for vector search mode
        query: User query for vector search mode
        top_k: Number of chunks to retrieve in vector search mode
        
    Returns:
        List of section dicts, each containing questions
    """
    
    # Vector search mode: retrieve relevant chunks
    if doc_id and query and _vector_search_available and query_vector_index:
        search_results = query_vector_index(doc_id, query, top_k=top_k)
        # Combine retrieved chunks into context text
        raw_chunks = [result["text"] for result in search_results if result.get("text")]
        chunks = filter_source_chunks(raw_chunks)
        if not chunks:
            chunks = [normalize_source_text(chunk) for chunk in raw_chunks if normalize_source_text(chunk)]
        all_text = "\n\n".join(chunks)
        normalized_chunk_set = {normalize_source_text(chunk) for chunk in chunks}
        # Build pages_data from search results for page references
        if not pages_data:
            pages_data = []
            for result in search_results:
                if result.get("page") and normalize_source_text(result.get("text", "")) in normalized_chunk_set:
                    pages_data.append({
                        "page_num": result["page"],
                        "text": normalize_source_text(result.get("text", "")),
                        "headings": [result.get("section")] if result.get("section") else []
                    })
    else:
        # Legacy mode: use full document text
        if not text:
            raise ValueError("Either text or (doc_id + query) must be provided")
        raw_chunks = split_into_chunks(text)
        chunks = filter_source_chunks(raw_chunks)
        if not chunks:
            chunks = [normalize_source_text(chunk) for chunk in raw_chunks if normalize_source_text(chunk)]
        all_text = "\n\n".join(chunks)
    
    # Extract concepts from text
    concepts = enrich_concepts_with_page_context(extract_concepts(all_text), pages_data)
    
    # Generate different types of questions
    all_questions = []
    
    # Mix of question types for a balanced exam
    definition_qs = generate_definition_questions(concepts, max_questions // 5, pages_data=pages_data)
    responsibility_qs = generate_responsibility_questions(concepts, max_questions // 5, pages_data=pages_data)
    scenario_qs = generate_scenario_questions(concepts, chunks, max_questions // 3, pages_data=pages_data)
    purpose_qs = generate_purpose_questions(concepts, max_questions // 6, pages_data=pages_data)
    requirement_qs = generate_requirement_questions(concepts, max_questions // 4, pages_data=pages_data)
    not_qs = generate_not_questions(concepts, max_questions // 10, pages_data=pages_data)
    
    all_questions.extend(definition_qs)
    all_questions.extend(responsibility_qs)
    all_questions.extend(scenario_qs)
    all_questions.extend(purpose_qs)
    all_questions.extend(requirement_qs)
    all_questions.extend(not_qs)
    
    unique_questions = select_best_questions(all_questions, max_questions)
    
    # Format for output with enhanced explanations and page references
    questions = []
    for i, q in enumerate(unique_questions):
        option_keys = [normalize_option_key(option) for option in q.get("options", []) if normalize_option_key(option)]
        if len(option_keys) != 4 or len(set(option_keys)) != 4:
            continue

        category = q.get("category", "General")
        topic = q.get("topic", "")
        study_focus = q.get("studyFocus", "") or q.get("section_title", "") or topic
        correct_answer = q.get("correctAnswer", "")
        context = q.get("context", "")
        correct_answer_key = normalize_option_key(correct_answer)
        matching_options = [
            option for option in q.get("options", [])
            if normalize_option_key(option) == correct_answer_key
        ]
        if not matching_options:
            continue
        correct_answer = matching_options[0]
        
        # Find page reference for this question's content
        page_num = q.get("page_num")
        section_ref = q.get("section_heading") or q.get("section_title")
        if pages_data and not page_num:
            # Search for the correct answer text in the PDF pages
            page_num, section_ref = find_page_for_text(correct_answer, pages_data)
            if not page_num:
                # Try searching for the question content
                page_num, section_ref = find_page_for_text(q.get("question", ""), pages_data)
        
        # Generate context-aware hint
        hint_payload = generate_context_aware_hint(
            correct_answer,
            context,
            category,
            topic,
            study_focus=study_focus,
            page_num=page_num,
            section_ref=section_ref,
            question_text=q.get("question", ""),
        )
        
        # Build detailed explanation
        base_explanation = q.get("explanation", "Review this concept for better understanding.")
        detailed_explanation = build_detailed_explanation(base_explanation, category)
        
        # Build page reference string
        page_ref_str = build_page_reference(page_num, section_ref, category)
        
        questions.append({
            "id": f"Q-{i+1}",
            "question": q["question"],
            "options": q["options"],
            "correctAnswer": correct_answer,
            "hint": hint_payload.get("summary"),
            "hintDetails": hint_payload,
            "explanation": detailed_explanation,
            "pageRef": page_num,
            "sectionRef": section_ref,
            "pdfReference": page_ref_str,
            "difficulty": DIFFICULTY_MAP.get(category, "medium"),
            "tags": [category.lower(), study_focus[:20] if study_focus else (topic[:20] if topic else "general")],
            "_quality_score": q.get("_quality_score", 0),
        })
    
    # Reorder: easy first, then medium, then hard
    questions.sort(
        key=lambda x: (
            {"easy": 0, "medium": 1, "hard": 2}.get(x["difficulty"], 1),
            -x.get("_quality_score", 0),
        )
    )
    
    # Reassign IDs after sorting
    for i, q in enumerate(questions):
        q["id"] = f"Q-{i+1}"
        q.pop("_quality_score", None)
    
    # Group into sections
    sections = []
    for s in range(0, len(questions), section_size):
        section_num = s // section_size + 1
        sections.append({
            "section": section_num,
            "questions": questions[s:s + section_size]
        })
    
    return sections


# ============================================================================
# RAG-BASED QUESTION GENERATION
# ============================================================================

def generate_questions_rag(doc_id: str, topic_query: str, num_questions: int = 5):
    """
    Retrieval-Augmented question generation.
    
    Args:
        doc_id: Document ID to search within
        topic_query: Topic or query to find relevant content
        num_questions: Number of questions to generate
        
    Returns:
        Dict with doc_id, query, context_used, and questions
    """

    # Check if vector search is available
    if not _vector_search_available or not query_vector_index:
        return {"error": "Vector search not available. Install ML dependencies with: pip install -r requirements-ml.txt"}

    # 1. Retrieve relevant chunks
    retrieved_chunks = query_vector_index(
        doc_id=doc_id,
        query=topic_query,
        top_k=5
    )

    if not retrieved_chunks:
        return {"error": "No relevant regulatory content found."}

    # 2. Concatenate retrieved text
    context_text = "\n\n".join([chunk["text"] for chunk in retrieved_chunks])

    # 3. Build pages_data from retrieved chunks for page references
    pages_data = []
    for chunk in retrieved_chunks:
        if chunk.get("page"):
            pages_data.append({
                "page_num": chunk["page"],
                "text": chunk.get("text", ""),
                "headings": [chunk.get("section")] if chunk.get("section") else []
            })

    # 4. Generate questions using only retrieved context
    sections = generate_questions_json(
        text=context_text,
        max_questions=num_questions,
        section_size=5,
        pages_data=pages_data
    )

    # Flatten questions from sections
    questions = []
    for section in sections:
        questions.extend(section.get("questions", []))

    return {
        "doc_id": doc_id,
        "query": topic_query,
        "context_used": retrieved_chunks,
        "questions": questions
    }
