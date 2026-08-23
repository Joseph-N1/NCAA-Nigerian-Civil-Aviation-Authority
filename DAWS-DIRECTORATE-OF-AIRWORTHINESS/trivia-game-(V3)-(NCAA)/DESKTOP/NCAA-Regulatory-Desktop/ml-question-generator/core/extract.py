# extract.py - PDF text extraction with page number tracking

import fitz  # PyMuPDF
import re
from .clean import clean_text
from .chunking import extract_section_identifier
from .hints import extract_heading_candidates

# ============================================================================
# PDF TEXT EXTRACTION
# ============================================================================

def extract_text_from_pdf(pdf_path):
    """Extract and clean text from PDF with page number tracking
    
    Returns:
        tuple: (full_text, pages_data) where pages_data is a list of dicts
               containing page_num, text, and headings for each page
    """
    doc = fitz.open(pdf_path)
    pages_data = []  # List of {page_num, text, headings}
    full_text = ""
    
    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()
        
        # Basic cleanup
        page_text = re.sub(r' +', ' ', page_text)
        page_text = re.sub(r'-\n', '', page_text)
        page_text = re.sub(r'\n+', '\n', page_text)
        page_text = clean_text(page_text)
        
        # Try to extract section headers from this page
        headings = [heading["label"] for heading in extract_heading_candidates(page_text)]
        
        pages_data.append({
            'page_num': page_num,
            'text': page_text.strip(),
            'headings': headings
        })
        full_text += page_text + "\n"
    
    doc.close()
    return full_text.strip(), pages_data


def extract_text_from_pdf_simple(pdf_path):
    """Simple extraction returning just text (for backward compatibility)"""
    full_text, _ = extract_text_from_pdf(pdf_path)
    return full_text


def extract_chunks_from_pdf(pdf_path, min_chunk_len=100, max_chunk_len=1500):
    """Extract text from PDF and return chunks with actual PDF page numbers
    
    Args:
        pdf_path: Path to PDF file
        min_chunk_len: Minimum chunk length
        max_chunk_len: Maximum chunk length
        
    Returns:
        List of chunk dicts with chunk_id, page, section, text
    """
    doc = fitz.open(pdf_path)
    chunks = []
    chunk_id = 0
    
    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()
        
        # Basic cleanup
        page_text = re.sub(r' +', ' ', page_text)
        page_text = re.sub(r'-\n', '', page_text)
        page_text = re.sub(r'\n+', '\n', page_text)
        page_text = clean_text(page_text)
        
        # Split page into paragraphs
        paragraphs = re.split(r'\n\s*\n|\n(?=\d+\.\d+|\([a-z]\))', page_text)
        
        for para in paragraphs:
            para = para.strip()
            
            # Skip short or empty paragraphs
            if len(para) < min_chunk_len:
                continue
            
            # Skip unwanted content
            alpha_ratio = sum(c.isalpha() for c in para) / max(1, len(para))
            if alpha_ratio < 0.5:
                continue
            
            if len(para) > max_chunk_len:
                # Split long paragraphs into sentences
                sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', para)
                current = ""
                for sent in sentences:
                    if len(current) + len(sent) < max_chunk_len:
                        current += " " + sent
                    else:
                        if len(current) > min_chunk_len:
                            chunk_text = current.strip()
                            chunks.append({
                                "chunk_id": f"chunk_{chunk_id}",
                                "page": page_num,  # Actual PDF page index
                                "section": extract_section_identifier(chunk_text),
                                "text": chunk_text
                            })
                            chunk_id += 1
                        current = sent
                if len(current) > min_chunk_len:
                    chunk_text = current.strip()
                    chunks.append({
                        "chunk_id": f"chunk_{chunk_id}",
                        "page": page_num,  # Actual PDF page index
                        "section": extract_section_identifier(chunk_text),
                        "text": chunk_text
                    })
                    chunk_id += 1
            else:
                chunks.append({
                    "chunk_id": f"chunk_{chunk_id}",
                    "page": page_num,  # Actual PDF page index
                    "section": extract_section_identifier(para),
                    "text": para
                })
                chunk_id += 1
    
    doc.close()
    return chunks
