# Core module for aviation regulation quiz question generation
# This package contains modular components for the question generation pipeline

from .extract import extract_text_from_pdf, extract_text_from_pdf_simple
from .clean import clean_text, SPELLING_FIXES, COMMON_ABBREVIATIONS, UNWANTED_PATTERNS
from .chunking import split_into_chunks, is_useful_paragraph
from .concepts import extract_concepts
from .distractors import generate_smart_distractors, make_concept_summary
from .hints import generate_context_aware_hint, extract_key_terms, find_page_for_text
from .questions import (
    generate_definition_questions,
    generate_responsibility_questions,
    generate_scenario_questions,
    generate_purpose_questions,
    generate_requirement_questions,
    generate_not_questions,
    SCENARIO_TEMPLATES,
    PURPOSE_TEMPLATES,
    RESPONSIBILITY_TEMPLATES,
    REQUIREMENT_TEMPLATES,
    UNDERSTANDING_TEMPLATES,
    APPLICATION_TEMPLATES,
    NOT_TEMPLATES,
)
from .explanations import build_detailed_explanation, build_page_reference
from .pipeline import generate_questions_json

__all__ = [
    # Extract
    'extract_text_from_pdf',
    'extract_text_from_pdf_simple',
    # Clean
    'clean_text',
    'SPELLING_FIXES',
    'COMMON_ABBREVIATIONS',
    'UNWANTED_PATTERNS',
    # Chunking
    'split_into_chunks',
    'is_useful_paragraph',
    # Concepts
    'extract_concepts',
    # Distractors
    'generate_smart_distractors',
    # Hints
    'generate_context_aware_hint',
    'extract_key_terms',
    'find_page_for_text',
    # Questions
    'make_concept_summary',
    'generate_definition_questions',
    'generate_responsibility_questions',
    'generate_scenario_questions',
    'generate_purpose_questions',
    'generate_requirement_questions',
    'generate_not_questions',
    # Templates
    'SCENARIO_TEMPLATES',
    'PURPOSE_TEMPLATES',
    'RESPONSIBILITY_TEMPLATES',
    'REQUIREMENT_TEMPLATES',
    'UNDERSTANDING_TEMPLATES',
    'APPLICATION_TEMPLATES',
    'NOT_TEMPLATES',
    # Explanations
    'build_detailed_explanation',
    'build_page_reference',
    # Pipeline
    'generate_questions_json',
]
