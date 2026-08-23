# explanations.py - Post-quiz explanation generation

# ============================================================================
# DETAILED EXPLANATION BUILDER
# ============================================================================

def build_detailed_explanation(base_explanation, category):
    """Build a detailed explanation based on question category
    
    Args:
        base_explanation: The base explanation text
        category: Question category (Understanding, Responsibility, etc.)
        
    Returns:
        Enhanced explanation string
    """
    if category == "Understanding":
        detailed_explanation = f"{base_explanation} Understanding this definition is crucial for interpreting related regulations."
    elif category == "Responsibility":
        detailed_explanation = f"{base_explanation} This accountability structure ensures clear ownership of safety functions."
    elif category == "Requirement":
        detailed_explanation = f"{base_explanation} Non-compliance with this requirement may have regulatory consequences."
    elif category == "Purpose":
        detailed_explanation = f"{base_explanation} Understanding the purpose helps in proper implementation."
    elif category == "Application":
        detailed_explanation = f"{base_explanation} Practical application of this concept is essential for effective safety management."
    else:
        detailed_explanation = base_explanation
    
    return detailed_explanation


def build_page_reference(page_num, section_ref, category):
    """Build a page reference string
    
    Args:
        page_num: Page number (int or None)
        section_ref: Section heading (str or None)
        category: Question category for fallback display
        
    Returns:
        Page reference string
    """
    if page_num:
        page_ref_str = f"Page {page_num}"
        if section_ref:
            page_ref_str += f" - {section_ref}"
        return page_ref_str
    return f"Category: {category}"
