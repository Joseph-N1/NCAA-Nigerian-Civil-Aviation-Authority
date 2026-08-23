# core/search.py

import os
import json

# Lazy-load ML dependencies to allow app to start even if they're not properly installed
_model = None
_faiss_available = False
_sentence_transformers_available = False

try:
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer
    _faiss_available = True
    _sentence_transformers_available = True
except (ImportError, Exception) as e:
    faiss = None
    np = None
    SentenceTransformer = None
    print(f"Warning: ML dependencies not available: {e}")


def get_model():
    global _model
    if _model is None:
        if not _sentence_transformers_available:
            raise ImportError("sentence_transformers not available. Install with: pip install -r requirements-ml.txt")
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model


def query_vector_index(doc_id: str, query: str, top_k: int = 5):
    """
    Search a specific document's FAISS index and return top_k relevant chunks.
    """

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    index_dir = os.path.join(base_dir, "vector_index", doc_id)

    index_path = os.path.join(index_dir, "index.faiss")
    metadata_path = os.path.join(index_dir, "metadata.json")

    if not os.path.exists(index_path):
        raise FileNotFoundError(f"FAISS index not found for document: {doc_id}")

    if not os.path.exists(metadata_path):
        raise FileNotFoundError(f"Metadata not found for document: {doc_id}")

    # Load FAISS index
    index = faiss.read_index(index_path)

    # Load metadata
    with open(metadata_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    # Embed query
    model = get_model()
    query_vector = model.encode([query])
    query_vector = np.array(query_vector).astype("float32")

    # Search
    distances, indices = index.search(query_vector, top_k)

    results = []
    for i in range(len(indices[0])):
        idx = indices[0][i]

        if idx == -1:
            continue

        chunk_data = metadata[idx]

        results.append({
            "score": float(distances[0][i]),
            "doc_id": chunk_data.get("doc_id"),
            "page": chunk_data.get("page"),
            "section": chunk_data.get("section"),
            "text": chunk_data.get("text"),
            "title": chunk_data.get("title"),
            "document_family": chunk_data.get("document_family"),
            "document_family_label": chunk_data.get("document_family_label"),
            "relative_path": chunk_data.get("relative_path"),
            "regulatory_part": chunk_data.get("regulatory_part"),
        })

    return results
