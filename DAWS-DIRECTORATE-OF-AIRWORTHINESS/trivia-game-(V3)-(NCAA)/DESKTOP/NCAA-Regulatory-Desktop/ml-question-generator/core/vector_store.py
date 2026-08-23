# core/vector_store.py

import os
import json
import faiss
import numpy as np
from typing import List, Dict
from .embeddings import embed_texts


def build_faiss_index(chunks: List, output_dir: str, doc_id: str):
    os.makedirs(output_dir, exist_ok=True)

    if not chunks:
        return

    if isinstance(chunks[0], dict):
        texts = [chunk["text"] for chunk in chunks]
    else:
        texts = chunks  # already a list of strings
    embeddings = embed_texts(texts)

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)  # Inner product (cosine if normalized)

    index.add(embeddings)

    faiss.write_index(index, os.path.join(output_dir, "index.faiss"))

    metadata = []
    for i, chunk in enumerate(chunks):
        if isinstance(chunk, dict):
            entry = {
                "vector_id": i,
                "chunk_id": chunk.get("chunk_id"),
                "page": chunk.get("page"),
                "section": chunk.get("section"),
                "doc_id": doc_id,
                "text": chunk.get("text"),
            }
            for key in ("title", "document_family", "document_family_label", "relative_path", "regulatory_part"):
                if key in chunk:
                    entry[key] = chunk.get(key)
            metadata.append(entry)
        else:
            # chunk is just a string
            metadata.append({
                "vector_id": i,
                "chunk_id": f"{i}",
                "page": None,
                "section": None,
                "doc_id": doc_id,
                "text": chunk
            })

    with open(os.path.join(output_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)


def search_similar_chunks(query: str, top_k: int = 3, vector_root: str = None):
    """
    Search across all FAISS indexes inside vector_index directory.
    Returns top_k results globally sorted by similarity.
    """

    if vector_root is None:
        vector_root = os.path.join(os.path.dirname(__file__), "..", "vector_index")

    if not os.path.isdir(vector_root):
        return []

    query_embedding = embed_texts([query])
    all_results = []

    for doc_folder in os.listdir(vector_root):
        doc_path = os.path.join(vector_root, doc_folder)

        index_path = os.path.join(doc_path, "index.faiss")
        metadata_path = os.path.join(doc_path, "metadata.json")

        if not os.path.exists(index_path):
            continue

        # Load FAISS index
        index = faiss.read_index(index_path)

        # Search
        scores, indices = index.search(query_embedding, top_k)

        # Load metadata
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        for score, idx in zip(scores[0], indices[0]):
            if idx < len(metadata):
                result = {
                    "score": float(score),
                    "metadata": metadata[idx]
                }
                all_results.append(result)

    # Sort globally by score
    all_results.sort(key=lambda x: x["score"], reverse=True)

    return all_results[:top_k]
