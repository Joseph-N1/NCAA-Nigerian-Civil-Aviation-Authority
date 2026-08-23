# scripts/build_vector_index.py

import os
import sys

# Ensure project root is in Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
sys.path.append(PROJECT_ROOT)

import json
from core.vector_store import build_faiss_index

CONTENT_INDEX_DIR = os.path.join(PROJECT_ROOT, "content_index")
VECTOR_INDEX_DIR = os.path.join(PROJECT_ROOT, "vector_index")



def main():
    os.makedirs(VECTOR_INDEX_DIR, exist_ok=True)

    for filename in sorted(os.listdir(CONTENT_INDEX_DIR)):
        if not filename.endswith(".json") or filename == "manifest.json":
            continue

        file_path = os.path.join(CONTENT_INDEX_DIR, filename)

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        doc_id = os.path.splitext(filename)[0]
        chunks = data.get("chunks", [])

        if not chunks:
            continue

        output_dir = os.path.join(VECTOR_INDEX_DIR, doc_id)

        print(f"[INDEXING] {doc_id}...")
        build_faiss_index(chunks, output_dir, doc_id)

    print("Vector index build complete.")


if __name__ == "__main__":
    main()
