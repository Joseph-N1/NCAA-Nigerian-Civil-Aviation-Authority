# clean.py - Text cleanup utilities for PDF extraction
# Fixes spelling, punctuation, and OCR errors

import re

# ============================================================================
# CONTENT FILTERING PATTERNS
# ============================================================================

UNWANTED_PATTERNS = [
    re.compile(r"^\s*page\s+\d+", re.IGNORECASE),
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*[ivxlcdm]+\s*$", re.IGNORECASE),
    re.compile(r"copyright|all\s+rights\s+reserved", re.IGNORECASE),
    re.compile(r"director\s+general|captain|dr\.|mr\.|mrs\.|prof\.", re.IGNORECASE),
    re.compile(r"record\s+of\s+amendment|amendment\s+number", re.IGNORECASE),
    re.compile(r"appendix|annex|glossary|index|references|bibliography", re.IGNORECASE),
    re.compile(r"table\s+of\s+contents|acknowledgement|foreword|preface", re.IGNORECASE),
]

# ============================================================================
# SPELLING AND PUNCTUATION FIXES
# ============================================================================

SPELLING_FIXES = {
    # Common OCR/extraction errors
    r'\s+,': ',',
    r'\s+\.': '.',
    r'\s+;': ';',
    r'\s+:': ':',
    r'\(\s+': '(',
    r'\s+\)': ')',
    r'\s{2,}': ' ',
    r'(?<=[a-z])-\s+(?=[a-z])': '',  # Broken hyphenated words
    r"``": '"',
    r"''": '"',
    r"'": "'",
    r""": '"',
    r""": '"',
    r"–": '-',
    r"—": '-',
    r'\bthe the\b': 'the',
    r'\bof of\b': 'of',
    r'\ba a\b': 'a',
    r'\bis is\b': 'is',
    r'\band and\b': 'and',
    r'\bteh\b': 'the',
    r'\bwhihc\b': 'which',
    r'\bshall shall\b': 'shall',
}

COMMON_ABBREVIATIONS = {
    r'\bw/\b': 'with',
    r'\bw/o\b': 'without',
    r'\b&\b': 'and',
}

# ============================================================================
# CLEAN TEXT FUNCTION
# ============================================================================

def clean_text(text):
    """Clean extracted text - fix spelling, punctuation, and OCR errors"""
    if not text:
        return text
    
    # Apply spelling fixes
    for pattern, replacement in SPELLING_FIXES.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Fix common abbreviations
    for pattern, replacement in COMMON_ABBREVIATIONS.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Fix orphan punctuation at start of sentences
    text = re.sub(r'^\s*[,;:]\s*', '', text)
    text = re.sub(r'\n\s*[,;:]\s*', '\n', text)
    
    # Fix multiple punctuation
    text = re.sub(r'[.]{2,}', '.', text)
    text = re.sub(r'[,]{2,}', ',', text)
    
    # Ensure proper spacing after punctuation
    text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
    
    # Capitalize first letter after periods
    def capitalize_after_period(match):
        return match.group(1) + ' ' + match.group(2).upper()
    text = re.sub(r'([.!?])\s+([a-z])', capitalize_after_period, text)
    
    # Remove trailing/leading whitespace per line
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    return text.strip()


def remove_regulatory_headers(text: str) -> str:
    patterns = [
        r"NIGERIA CIVIL AVIATION\s+REGULATIONS.*?Amendment \d+",
        r"April \d{4}, Amendment \d+",
        r"\b\d+-\d+\b",  # page markers like 5-23
        r"Part \d+ - AIRWORTHINESS",
    ]

    for pattern in patterns:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)

    return text.strip()
