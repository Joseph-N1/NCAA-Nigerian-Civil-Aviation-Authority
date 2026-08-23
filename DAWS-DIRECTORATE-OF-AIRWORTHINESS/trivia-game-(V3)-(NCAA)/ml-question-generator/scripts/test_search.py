import os
import sys
import re

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
sys.path.append(PROJECT_ROOT)

from core.search import query_vector_index


def extract_part_from_doc_id(doc_id):
    match = re.search(r"part-(\d+)", doc_id.lower())
    if match:
        return f"Part {match.group(1)}"
    return None


def format_citation(metadata):
    doc_id = metadata.get("doc_id")
    page = metadata.get("page")
    section = metadata.get("section")

    part = extract_part_from_doc_id(doc_id)

    citation = "Nig. CARs"

    if part:
        citation += f" {part}"

    if section:
        citation += f" – Section {section}"

    if page:
        citation += f" (Page {page})"

    return citation


results = query_vector_index(
    doc_id="nig-cars-part-5-airworthiness",
    query="What are the requirements for aircraft maintenance release?",
    top_k=5
)

for r in results:
    print("\n---")
    print("Score:", r["score"])
    citation = format_citation(r)
    print(citation)
    print()
    print(r["text"])
