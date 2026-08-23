import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
sys.path.append(PROJECT_ROOT)

from core.pipeline import generate_questions_rag


result = generate_questions_rag(
    doc_id="nig-cars-part-5-airworthiness",
    topic_query="maintenance release requirements",
    num_questions=3
)

print(result)
