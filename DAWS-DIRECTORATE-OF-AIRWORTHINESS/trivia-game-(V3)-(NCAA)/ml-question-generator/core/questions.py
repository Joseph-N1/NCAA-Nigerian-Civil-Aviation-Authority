# questions.py - Question generators for different question types

import re
import random
from .distractors import (
    clean_option_text,
    generate_smart_distractors,
    generate_subtle_variants,
    looks_like_weak_option,
    make_concept_summary,
    normalize_option_key,
    option_similarity,
)
from .hints import find_topic_for_text

# ============================================================================
# EXAM-STYLE QUESTION TEMPLATES
# ============================================================================

SCENARIO_TEMPLATES = [
    "During an audit of {topic}, which action would be MOST appropriate?",
    "A {role} is implementing {topic}. Which approach best aligns with the regulations?",
    "When reviewing {topic}, which element should receive PRIMARY attention?",
    "A regulator identifies a gap in {topic}. What should be addressed FIRST?",
    "Which scenario best reflects compliant implementation of {topic}?",
]

PURPOSE_TEMPLATES = [
    "Why is {concept} required within the regulatory framework?",
    "What is the PRIMARY purpose of {concept}?",
    "The MAIN objective of {concept} is to:",
    "Which outcome is {concept} primarily intended to achieve?",
]

RESPONSIBILITY_TEMPLATES = [
    "Under the regulations, who is responsible for {action}?",
    "Which entity has primary accountability for {action}?",
    "Responsibility for {action} rests with which role?",
    "Who has the designated responsibility for {action}?",
]

REQUIREMENT_TEMPLATES = [
    "According to the regulations, what is required of {topic}?",
    "Which action is mandatory for {topic}?",
    "What must {topic} do to remain compliant?",
    "Which requirement applies directly to {topic}?",
]

UNDERSTANDING_TEMPLATES = [
    "According to the regulations, what does {concept} mean?",
    "Which option best defines {concept}?",
    "What is the correct regulatory meaning of {concept}?",
    "How is {concept} best described in the regulations?",
]

APPLICATION_TEMPLATES = [
    "In which situation would {concept} be MOST applicable?",
    "When would {concept} be MOST relevant?",
    "Which scenario demonstrates proper implementation of {concept}?",
    "How should {concept} be applied in practice?",
]

NOT_TEMPLATES = [
    "Which of the following is NOT a requirement for {topic}?",
    "All of the following are true about {topic} EXCEPT:",
    "Which statement is INCORRECT regarding {topic}?",
]

WEAK_LABELS = {
    "abbreviations",
    "attachment",
    "annex",
    "applicability",
    "appendix",
    "chapter",
    "definitions",
    "example",
    "examples",
    "figure",
    "general",
    "note",
    "notes",
    "part",
    "section",
    "table",
}

LOW_SIGNAL_TOPICS = {
    "airworthiness",
    "applicability",
    "general principles",
    "requirements analysis",
    "the applicable organization",
    "the relevant aviation safety plan",
    "volume",
}

LOW_VALUE_DEFINITION_TERMS = {
    "aeroplane",
    "aircraft",
    "helicopter",
}

PRIORITY_KEYWORDS = {
    "safety",
    "hazard",
    "risk",
    "management",
    "reporting",
    "accountable",
    "authority",
    "service provider",
    "operator",
    "organization",
    "compliance",
    "certificate",
    "training",
    "maintenance",
}

REQUIREMENT_START_WORDS = {
    "address",
    "apply",
    "appoint",
    "communicate",
    "coordinate",
    "define",
    "develop",
    "document",
    "ensure",
    "establish",
    "evaluate",
    "identify",
    "implement",
    "include",
    "maintain",
    "monitor",
    "provide",
    "report",
    "review",
    "set",
    "verify",
}

PURPOSE_START_WORDS = {
    "enable",
    "ensure",
    "facilitate",
    "improve",
    "maintain",
    "prevent",
    "promote",
    "protect",
    "provide",
    "reduce",
    "strengthen",
    "support",
}

TRAILING_FRAGMENT_WORDS = {
    "a", "an", "and", "are", "as", "be", "for", "from", "if", "in", "is",
    "it", "of", "on", "or", "that", "the", "their", "this", "to", "was",
    "were", "which", "who", "with",
}
ACTION_FRAGMENT_WORDS = TRAILING_FRAGMENT_WORDS.union({
    "appropriate",
    "provided",
    "request",
    "required",
    "satisfactory",
    "stating",
})

SPECIFIC_REQUIREMENT_TOPICS = [
    (re.compile(r"\bmaintenance and operational experience\b", re.IGNORECASE), "maintenance and operational experience"),
    (re.compile(r"\bcontinuing airworthiness(?: and inspections)?\b", re.IGNORECASE), "continuing airworthiness"),
    (re.compile(r"\bnoise certificate\b|\bnoise certification\b", re.IGNORECASE), "noise certification"),
    (re.compile(r"\bcertificate of airworthiness\b", re.IGNORECASE), "certificate of airworthiness"),
    (re.compile(r"\bsupplemental type certificate\b", re.IGNORECASE), "supplemental type certificate"),
    (re.compile(r"\bairworthiness review staff\b", re.IGNORECASE), "airworthiness review staff"),
    (re.compile(r"\bemissions certification\b", re.IGNORECASE), "emissions certification"),
    (re.compile(r"\bfuel venting\b", re.IGNORECASE), "fuel venting"),
]

LEADING_REQUIREMENT_ACTION_PATTERN = re.compile(
    r"^(?:address|apply|appoint|communicate|coordinate|define|develop|document|ensure|establish|evaluate|identify|implement|include|maintain|monitor|provide|report|review|set|verify)\s+",
    re.IGNORECASE,
)
SUBJECT_STOP_PATTERN = re.compile(
    r"\b(?:acceptable to|as required by|for the purpose of|in a form|in accordance with|to the authority|under|within|which|that|who|when|where|while)\b",
    re.IGNORECASE,
)
ENTITY_NOISE_PATTERN = re.compile(
    r"\b(?:ensuring|including|implementing|issuing|applying|maintaining|monitoring|reporting|developing|considering|requiring|defining|which|that|who|shall|must)\b",
    re.IGNORECASE,
)


def clean_prompt_text(text, max_len=None):
    text = clean_option_text(text)
    text = re.sub(r'^\s*(?:note|notes)\s*[:\-]?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(?:IS\s*)?\d+\.\d+(?:\.\d+)*\b', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip(" -:;,.")

    if max_len and len(text) > max_len:
        trimmed = text[:max_len].rsplit(" ", 1)[0].strip()
        text = trimmed or text[:max_len]

    return text.strip(" -:;,.")


def normalize_entity_option_key(entity):
    return re.sub(r"[^a-z0-9]+", " ", clean_prompt_text(entity).lower()).strip()


def is_plausible_entity_option(entity):
    cleaned = normalize_entity_name(entity)
    if len(cleaned) < 4 or len(cleaned.split()) > 5:
        return False
    if ENTITY_NOISE_PATTERN.search(cleaned):
        return False
    if cleaned.lower() in {"the", "this", "that", "these", "those"}:
        return False
    return True


def build_option_set(correct_answer, distractors, option_kind="statement"):
    seen = set()
    options = []

    def normalize_key(value):
        if option_kind == "entity":
            return normalize_entity_option_key(value)
        return normalize_option_key(value)

    def clean_value(value):
        if option_kind == "entity":
            return normalize_entity_name(value)
        return clean_prompt_text(value, max_len=180)

    correct_value = clean_value(correct_answer)
    correct_key = normalize_key(correct_value)
    if not correct_key:
        return None

    def add_option(value, is_correct=False):
        cleaned = clean_value(value)
        key = normalize_key(cleaned)
        if not key or key in seen:
            return

        if option_kind == "entity":
            if not is_plausible_entity_option(cleaned):
                return
        else:
            if looks_like_weak_option(cleaned) or len(cleaned.split()) < 5:
                return
            if not is_correct and option_similarity(cleaned, correct_value) >= 0.98:
                return
            for existing in options:
                if option_similarity(cleaned, existing) >= 0.97:
                    return

        seen.add(key)
        options.append(cleaned)

    add_option(correct_value, is_correct=True)
    for distractor in distractors:
        if len(options) >= 4:
            break
        add_option(distractor)

    if len(options) < 4:
        return None
    if correct_key not in {normalize_key(option) for option in options}:
        return None

    random.shuffle(options)
    return options


def looks_like_weak_label(text):
    label = clean_prompt_text(text)
    if not label:
        return True
    if label.lower() in WEAK_LABELS:
        return True
    if label.lower().startswith(("of this ", "in this ", "under this ", "of the ")):
        return True
    if len(label.split()) > 7:
        return True
    if label.split()[-1].lower() in TRAILING_FRAGMENT_WORDS:
        return True
    if ";" in label or re.search(r'\b[a-z]\)$|\b[a-z]\b', label):
        return True
    if re.search(r'\b(amendment|contents|record of amendment)\b', label, re.IGNORECASE):
        return True
    return False


def is_complete_statement(text, min_words=5):
    cleaned = clean_prompt_text(text)
    words = cleaned.split()
    if len(words) < min_words:
        return False
    if words[-1].lower() in TRAILING_FRAGMENT_WORDS:
        return False
    if looks_like_weak_option(cleaned):
        return False
    return True


def trim_action_fragment(text):
    words = clean_prompt_text(text, max_len=120).split()
    while words and words[-1].lower().strip(".,;:") in ACTION_FRAGMENT_WORDS:
        words.pop()
    return " ".join(words).strip(" -:;,.")


def score_priority(text):
    cleaned = clean_prompt_text(text).lower()
    score = 0

    for keyword in PRIORITY_KEYWORDS:
        if keyword in cleaned:
            score += 2

    return score


def starts_with_allowed_word(text, allowed_words):
    cleaned = clean_prompt_text(text).lower()
    if not cleaned:
        return False
    first_word = cleaned.split()[0]
    return first_word in allowed_words


def score_definition_candidate(definition):
    term = clean_prompt_text(definition["term"])
    meaning = clean_prompt_text(definition["meaning"])
    score = score_priority(term) + score_priority(meaning)

    if len(term.split()) >= 2:
        score += 2

    if term.lower() in LOW_VALUE_DEFINITION_TERMS:
        score -= 3

    return score


def normalize_entity_name(entity):
    entity = clean_prompt_text(entity)
    entity = re.sub(r'^\s*the\s+', '', entity, flags=re.IGNORECASE).strip()
    entity = entity.title()

    replacements = {
        "Sms": "SMS",
        "Aoc": "AOC",
        "Amo": "AMO",
        "Ato": "ATO",
        "Ats": "ATS",
    }
    for source, target in replacements.items():
        entity = entity.replace(source, target)

    return entity


def to_gerund(phrase):
    words = phrase.split()
    if not words:
        return ""

    irregular = {
        "be": "being",
        "conduct": "conducting",
        "create": "creating",
        "define": "defining",
        "develop": "developing",
        "ensure": "ensuring",
        "establish": "establishing",
        "identify": "identifying",
        "implement": "implementing",
        "maintain": "maintaining",
        "monitor": "monitoring",
        "provide": "providing",
        "review": "reviewing",
    }

    def convert_word(word):
        lower = word.lower()
        if lower in irregular:
            return irregular[lower]
        if lower.endswith("ing"):
            return lower
        if lower.endswith("e") and lower not in {"be", "see"}:
            return lower[:-1] + "ing"
        return lower + "ing"

    words[0] = convert_word(words[0])

    if len(words) >= 3 and words[1].lower() == "and":
        words[2] = convert_word(words[2])

    return " ".join(words)


def normalize_action_for_question(action):
    action = clean_prompt_text(action, max_len=150)
    action = re.split(r',\s*(?:and\b|provided\b|stating\b|which\b|before\b|after\b)', action, 1, flags=re.IGNORECASE)[0]
    action = re.split(r'\b(?:who|which|that|when|where|while|because|as described|in accordance with)\b', action, 1, flags=re.IGNORECASE)[0]
    action = re.split(r'[:;]', action, 1)[0]
    action = trim_action_fragment(action).lower()

    if not action or not is_complete_statement(action, min_words=3):
        return None

    action = to_gerund(action)
    action = trim_action_fragment(action)

    if not is_complete_statement(action, min_words=3):
        return None

    return action


def pick_requirement_topic(requirement, context):
    full_context = f"{context} {requirement}".lower()
    topic_patterns = [
        (r'\bthe authority\b', 'the Authority'),
        (r'\bservice providers?\b', 'service providers'),
        (r'\baccountable executive\b', 'the accountable executive'),
        (r'\boperators?\b', 'operators'),
        (r'\batos?\b|\bapproved training organization\b', 'approved training organizations'),
        (r'\bamos?\b|\bapproved maintenance organization\b', 'approved maintenance organizations'),
        (r'\bats providers?\b', 'ATS providers'),
        (r'\baerodrome operators?\b|\boperators of aerodromes\b', 'aerodrome operators'),
        (r'\baoc holders?\b', 'AOC holders'),
        (r'\bsms\b|\bsafety management system\b', 'the SMS'),
        (r'\bnasp\b|\bnational aviation safety plan\b', 'the National Aviation Safety Plan'),
        (r'\bgasp\b|\brasp\b', 'the relevant aviation safety plan'),
    ]

    for pattern, label in topic_patterns:
        if re.search(pattern, full_context, re.IGNORECASE):
            return label

    return "the applicable organization"


def extract_requirement_subject(requirement, context=""):
    combined = clean_prompt_text(f"{context} {requirement}", max_len=220)
    for pattern, label in SPECIFIC_REQUIREMENT_TOPICS:
        if pattern.search(combined):
            return label

    candidate = clean_prompt_text(requirement, max_len=140)
    candidate = LEADING_REQUIREMENT_ACTION_PATTERN.sub("", candidate, count=1)
    candidate = re.sub(r"^(?:all|any|each|the|a|an)\s+", "", candidate, flags=re.IGNORECASE)
    candidate = SUBJECT_STOP_PATTERN.split(candidate, 1)[0]
    candidate = clean_prompt_text(candidate, max_len=72)

    if candidate.lower().startswith("record of "):
        candidate = clean_prompt_text(candidate[10:] + " records", max_len=72)

    if not candidate:
        return None
    if len(candidate.split()) < 2 or len(candidate.split()) > 8:
        return None
    if looks_like_weak_label(candidate):
        return None
    return candidate


def refine_topic_with_pages(primary_text, pages_data=None, fallback_topic=None, context_text=None):
    if not pages_data:
        return fallback_topic

    topic = find_topic_for_text(primary_text, pages_data, fallback_topic=fallback_topic, context_text=context_text)
    if not topic:
        return fallback_topic

    topic = clean_prompt_text(topic, max_len=80)
    if not topic or looks_like_weak_label(topic):
        return fallback_topic
    if topic.startswith("The ") and topic.lower() not in {"the authority", "the accountable executive"}:
        topic = topic[4:]
    return topic


def normalize_topic_candidate(topic):
    topic = clean_prompt_text(topic or "", max_len=80)
    if not topic:
        return None
    if looks_like_weak_label(topic):
        return None
    if topic.lower() in LOW_SIGNAL_TOPICS:
        return None
    if topic.startswith("The ") and topic.lower() not in {"the authority", "the accountable executive"}:
        topic = topic[4:]
    return topic


def pick_item_topic(item, primary_text, pages_data=None, fallback_topic=None, context_text=None):
    stored_topic = normalize_topic_candidate(
        item.get("topic_label") or item.get("section_title") or item.get("section_heading")
    )
    if stored_topic:
        return stored_topic

    refined_topic = refine_topic_with_pages(
        primary_text,
        pages_data=pages_data,
        fallback_topic=fallback_topic,
        context_text=context_text,
    )
    return normalize_topic_candidate(refined_topic) or normalize_topic_candidate(fallback_topic)


def attach_source_metadata(question, source_item, study_focus=None):
    if not source_item:
        return question

    for field in ("page_num", "section_heading", "section_title"):
        if source_item.get(field):
            question[field] = source_item[field]

    if study_focus and not question.get("studyFocus"):
        question["studyFocus"] = study_focus
    elif source_item.get("topic_label") and not question.get("studyFocus"):
        question["studyFocus"] = source_item["topic_label"]

    if not question.get("context"):
        context = source_item.get("context") or source_item.get("full_text") or source_item.get("text")
        if context:
            question["context"] = clean_prompt_text(context, max_len=220)

    return question

# ============================================================================
# QUESTION GENERATORS
# ============================================================================

def generate_definition_questions(concepts, max_questions=8, pages_data=None):
    """Generate questions testing understanding of key terms"""
    questions = []
    definitions = sorted(
        concepts.get("definitions", []),
        key=score_definition_candidate,
        reverse=True,
    )
    seen_terms = set()
    
    for defn in definitions[:max_questions * 3]:
        term = clean_prompt_text(defn["term"])
        meaning = make_concept_summary(defn["meaning"], 180)
        
        # Skip if too short or generic
        if len(meaning) < 30 or len(term) < 3 or looks_like_weak_label(term):
            continue

        if term.lower() in seen_terms:
            continue
        seen_terms.add(term.lower())

        study_focus = pick_item_topic(
            defn,
            meaning,
            pages_data=pages_data,
            fallback_topic=defn.get("topic_label"),
            context_text=defn.get("context", ""),
        )
        
        template = random.choice(UNDERSTANDING_TEMPLATES)
        question_text = template.format(concept=term)
        
        distractors = generate_smart_distractors(meaning, "definition", concepts, context=term)
        options = build_option_set(meaning, distractors)
        if not options:
            continue
        
        question = {
            "question": question_text,
            "options": options,
            "correctAnswer": meaning,
            "explanation": f"'{term}' refers to {meaning}",
            "category": "Understanding",
            "topic": term,
            "studyFocus": study_focus or term,
        }
        questions.append(attach_source_metadata(question, defn, study_focus=study_focus))
        
        if len(questions) >= max_questions:
            break
    
    return questions


def generate_responsibility_questions(concepts, max_questions=8, pages_data=None):
    """Generate questions about who is responsible for what"""
    questions = []
    responsibilities = sorted(
        concepts.get("responsibilities", []),
        key=lambda item: score_priority(item.get("entity", "")) + score_priority(item.get("action", "")),
        reverse=True,
    )
    
    # Group by action to create "who is responsible" questions
    for resp in responsibilities[:max_questions * 3]:
        entity = normalize_entity_name(resp["entity"])
        action = normalize_action_for_question(resp["action"])

        if not action:
            continue

        # Skip if entity is too generic or unclear
        if len(entity) < 4 or entity.lower() in ['the', 'a', 'an', 'it', 'this', 'that']:
            continue

        study_focus = pick_item_topic(
            resp,
            action,
            pages_data=pages_data,
            fallback_topic=resp.get("topic_label"),
            context_text=resp.get("full_text", ""),
        )
        
        template = random.choice(RESPONSIBILITY_TEMPLATES)
        question_text = template.format(action=action)
        
        # Generate entity-based distractors
        all_entities = list({
            normalize_entity_name(r["entity"])
            for r in responsibilities
            if len(clean_prompt_text(r.get("entity", ""))) > 4 and is_plausible_entity_option(r.get("entity", ""))
        })
        other_entities = [e for e in all_entities if e.lower() != entity.lower()]
        random.shuffle(other_entities)
        
        distractors = other_entities[:]
        fallback_entities = [
            "Authority",
            "Operator",
            "Accountable Executive",
            "Service Provider",
            "Safety Manager",
            "Organization",
        ]
        for fallback_entity in fallback_entities:
            if fallback_entity.lower() != entity.lower() and fallback_entity not in distractors:
                distractors.append(fallback_entity)

        options = build_option_set(entity, distractors[:6], option_kind="entity")
        if not options:
            continue
        
        question = {
            "question": question_text,
            "options": options,
            "correctAnswer": entity,
            "explanation": f"{entity} is responsible for {action}.",
            "category": "Responsibility",
            "topic": action[:50],
            "studyFocus": study_focus or entity,
        }
        questions.append(attach_source_metadata(question, resp, study_focus=study_focus))
        
        if len(questions) >= max_questions:
            break
    
    return questions


def generate_scenario_questions(concepts, chunks, max_questions=10, pages_data=None):
    """Generate scenario-based application questions"""
    questions = []
    
    # Extract topics from requirements and procedures
    topics = []
    for req in concepts.get("requirements", []):
        topics.append(req)
    for proc in concepts.get("procedures", []):
        topics.append(proc)
    
    roles = ["safety manager", "operator", "organization", "service provider", 
             "accountable executive", "compliance officer"]
    
    subject_areas = {
        "safety": "safety management",
        "risk": "risk management", 
        "training": "training programme",
        "compliance": "compliance management",
        "management": "management system",
        "documentation": "documentation requirements",
        "audit": "audit processes",
        "monitoring": "performance monitoring",
        "reporting": "safety reporting",
        "hazard": "hazard identification",
        "sms": "SMS implementation",
        "performance": "safety performance",
    }
    
    for topic_item in topics[:max_questions * 2]:
        topic_text = topic_item.get("requirement", topic_item.get("text", ""))
        if len(topic_text) < 40:
            continue
        
        # Identify the subject area
        subject = None
        for keyword, area in subject_areas.items():
            if keyword in topic_text.lower():
                subject = area
                break
        
        if not subject:
            continue

        study_focus = pick_item_topic(
            topic_item,
            topic_text,
            pages_data=pages_data,
            fallback_topic=subject,
            context_text=" ".join(topic_item.get("groups", [])) or topic_item.get("context", ""),
        )
        if study_focus:
            subject = study_focus
        
        template = random.choice(SCENARIO_TEMPLATES)
        role = random.choice(roles)
        
        question_text = template.format(
            topic=subject,
            aspect="the appropriate approach",
            role=role
        )
        
        correct_answer = make_concept_summary(topic_text, 150)
        
        # Ensure correct answer is meaningful
        if len(correct_answer) < 30 or not is_complete_statement(correct_answer, min_words=6):
            continue
            
        distractors = generate_smart_distractors(correct_answer, "application", concepts, context=subject)
        options = build_option_set(correct_answer, distractors)
        if not options:
            continue
        
        question = {
            "question": question_text,
            "options": options,
            "correctAnswer": correct_answer,
            "explanation": f"For {subject}, the correct approach involves: {correct_answer}",
            "category": "Application",
            "topic": subject,
            "studyFocus": study_focus or subject,
        }
        questions.append(attach_source_metadata(question, topic_item, study_focus=study_focus))
        
        if len(questions) >= max_questions:
            break
    
    return questions


def generate_purpose_questions(concepts, max_questions=6, pages_data=None):
    """Generate questions about the purpose/objectives of concepts"""
    questions = []
    purposes = concepts.get("purposes", [])
    
    # Known good subjects for purpose questions
    valid_subjects = [
        "safety management system", "SMS", "SSP", "State Safety Programme",
        "safety data protection", "safety information", "risk management",
        "hazard identification", "safety reporting", "safety training",
        "safety performance monitoring", "safety assurance", "safety promotion",
        "compliance monitoring", "safety oversight", "safety policy",
    ]
    
    for purpose_item in purposes[:max_questions * 2]:
        purpose = make_concept_summary(purpose_item["purpose"], 150)
        context = clean_prompt_text(purpose_item.get("context", ""), max_len=220)
        
        if len(purpose) < 30 or not is_complete_statement(purpose, min_words=6):
            continue
        if not starts_with_allowed_word(purpose, PURPOSE_START_WORDS):
            continue
        
        # Try to identify what the purpose is for using known subjects
        subject = None
        context_lower = context.lower()
        
        for valid_subj in valid_subjects:
            if valid_subj.lower() in context_lower:
                subject = valid_subj
                break
        
        # If no known subject, try to extract one but be strict
        if not subject:
            match = re.search(r'(?:the|a|an)\s+([A-Z][a-z]+(?:\s+[a-z]+)?\s+(?:system|programme|program|process|framework|policy|management|plan))', context)
            if match:
                subject = match.group(1).strip()
        
        # Skip if we still don't have a good subject
        subject = clean_prompt_text(subject or "")
        if not subject or len(subject) < 5 or looks_like_weak_label(subject):
            continue

        subject = pick_item_topic(
            purpose_item,
            purpose,
            pages_data=pages_data,
            fallback_topic=subject,
            context_text=context,
        )
        if not subject:
            continue
        
        template = random.choice(PURPOSE_TEMPLATES)
        question_text = template.format(concept=subject)
        
        distractors = generate_smart_distractors(purpose, "purpose", concepts, context=subject)
        options = build_option_set(purpose, distractors)
        if not options:
            continue
        
        question = {
            "question": question_text,
            "options": options,
            "correctAnswer": purpose,
            "explanation": f"The primary purpose is to {purpose}",
            "category": "Purpose",
            "topic": subject,
            "studyFocus": subject,
        }
        questions.append(attach_source_metadata(question, purpose_item, study_focus=subject))
        
        if len(questions) >= max_questions:
            break
    
    return questions


def generate_requirement_questions(concepts, max_questions=8, pages_data=None):
    """Generate questions about mandatory requirements"""
    questions = []
    requirements = sorted(
        concepts.get("requirements", []),
        key=lambda item: score_priority(item.get("requirement", "")) + score_priority(item.get("context", "")),
        reverse=True,
    )
    
    for req in requirements[:max_questions * 3]:
        requirement = make_concept_summary(req["requirement"], 150)
        context = clean_prompt_text(req.get("context", ""), max_len=180)
        
        if len(requirement) < 30 or not is_complete_statement(requirement, min_words=6):
            continue
        if not starts_with_allowed_word(requirement, REQUIREMENT_START_WORDS):
            continue

        topic = extract_requirement_subject(requirement, context) or pick_requirement_topic(requirement, context)
        topic = pick_item_topic(
            req,
            requirement,
            pages_data=pages_data,
            fallback_topic=topic,
            context_text=context,
        )
        if not topic:
            continue
        
        template = random.choice(REQUIREMENT_TEMPLATES)
        question_text = template.format(topic=topic)
        
        distractors = generate_smart_distractors(requirement, "requirement", concepts, context=topic or context)
        options = build_option_set(requirement, distractors)
        if not options:
            continue
        
        question = {
            "question": question_text,
            "options": options,
            "correctAnswer": requirement,
            "explanation": f"The requirement states: {requirement}",
            "category": "Requirement",
            "topic": topic,
            "studyFocus": topic,
        }
        questions.append(attach_source_metadata(question, req, study_focus=topic))
        
        if len(questions) >= max_questions:
            break
    
    return questions


def generate_not_questions(concepts, max_questions=4, pages_data=None):
    """Generate 'which is NOT' style questions for variety"""
    questions = []
    requirements = concepts.get("requirements", [])
    definitions = concepts.get("definitions", [])
    
    # Create NOT questions from requirements
    if len(requirements) >= 4:
        for i in range(min(max_questions, len(requirements) // 4)):
            topic_reqs = requirements[i*4:(i+1)*4]
            if len(topic_reqs) < 4:
                continue
            
            # Get 3 correct requirements and 1 wrong answer
            correct_reqs = [make_concept_summary(r["requirement"], 100) for r in topic_reqs[:3]]
            
            wrong_answer = None
            for requirement_text in correct_reqs:
                for variant in generate_subtle_variants(requirement_text):
                    if normalize_option_key(variant) not in {normalize_option_key(req) for req in correct_reqs}:
                        wrong_answer = variant
                        break
                if wrong_answer:
                    break
            if not wrong_answer:
                continue
            
            topic = extract_requirement_subject(
                " ".join(r["requirement"] for r in topic_reqs),
                " ".join(r.get("context", "") for r in topic_reqs),
            ) or pick_requirement_topic(
                " ".join(r["requirement"] for r in topic_reqs),
                " ".join(r.get("context", "") for r in topic_reqs),
            )
            topic = pick_item_topic(
                topic_reqs[0],
                " ".join(r["requirement"] for r in topic_reqs),
                pages_data=pages_data,
                fallback_topic=topic,
                context_text=" ".join(r.get("context", "") for r in topic_reqs),
            )
            if not topic:
                continue
            template = random.choice(NOT_TEMPLATES)
            question_text = template.format(topic=topic)
            
            options = build_option_set(wrong_answer, correct_reqs)
            if not options:
                continue
            
            question = {
                "question": question_text,
                "options": options,
                "correctAnswer": wrong_answer,
                "explanation": f"The incorrect statement is: {wrong_answer}. The other options are actual requirements.",
                "category": "Critical Thinking",
                "topic": topic,
                "studyFocus": topic,
                "context": clean_prompt_text(" ".join(r.get("context", "") for r in topic_reqs), max_len=220),
            }
            questions.append(attach_source_metadata(question, topic_reqs[0], study_focus=topic))
    
    return questions
