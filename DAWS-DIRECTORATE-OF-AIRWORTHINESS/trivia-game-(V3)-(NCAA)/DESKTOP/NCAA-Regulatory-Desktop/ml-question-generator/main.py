# main.py - Compatibility layer for backward compatibility
# All logic has been moved to the core/ package
# This module re-exports the main functions for existing imports

"""
Aviation Regulation Quiz Generator
==================================
This module serves as a compatibility layer, re-exporting functions from
the modular core/ package. For new code, import directly from core:

    from core import extract_text_from_pdf, generate_questions_json
    from core.questions import generate_definition_questions

Maintained for backward compatibility with existing imports:
    from main import extract_text_from_pdf, generate_questions_json
"""

# Re-export everything from core for backward compatibility
from core import (
    # Extract
    extract_text_from_pdf,
    extract_text_from_pdf_simple,
    # Clean
    clean_text,
    SPELLING_FIXES,
    COMMON_ABBREVIATIONS,
    UNWANTED_PATTERNS,
    # Chunking
    split_into_chunks,
    is_useful_paragraph,
    # Concepts
    extract_concepts,
    # Distractors
    generate_smart_distractors,
    make_concept_summary,
    # Hints
    generate_context_aware_hint,
    extract_key_terms,
    find_page_for_text,
    # Questions
    generate_definition_questions,
    generate_responsibility_questions,
    generate_scenario_questions,
    generate_purpose_questions,
    generate_requirement_questions,
    generate_not_questions,
    # Templates
    SCENARIO_TEMPLATES,
    PURPOSE_TEMPLATES,
    RESPONSIBILITY_TEMPLATES,
    REQUIREMENT_TEMPLATES,
    UNDERSTANDING_TEMPLATES,
    APPLICATION_TEMPLATES,
    NOT_TEMPLATES,
    # Explanations
    build_detailed_explanation,
    build_page_reference,
    # Pipeline
    generate_questions_json,
)

# ============================================================================
# CLI INTERFACE
# ============================================================================

if __name__ == "__main__":
    import json
    import sys
    if len(sys.argv) < 3:
        print("Usage: python main.py <pdf_path> <output_json>")
        exit(1)
    pdf_path = sys.argv[1]
    output_json = sys.argv[2]
    print(f"Extracting text from {pdf_path}...")
    text, pages_data = extract_text_from_pdf(pdf_path)
    print(f"Extracted {len(text)} characters from {len(pages_data)} pages")
    print("Generating exam-style questions...")
    sections = generate_questions_json(text, max_questions=40, section_size=5, pages_data=pages_data)
    total_questions = sum(len(s["questions"]) for s in sections)
    print(f"Generated {total_questions} questions in {len(sections)} sections")
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(sections, f, indent=2, ensure_ascii=False)
    print(f"Done! Questions saved to {output_json}")
