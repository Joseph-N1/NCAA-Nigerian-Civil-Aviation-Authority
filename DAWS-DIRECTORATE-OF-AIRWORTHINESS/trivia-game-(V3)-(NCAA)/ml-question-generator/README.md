ML Question Generator – NCAA Regulatory Intelligence Engine
Overview

This project is a regulatory-aware machine learning backend built on top of the Nigerian Civil Aviation Regulations (NIG-CARs).

It transforms official NCAA regulatory PDFs into a structured, searchable, semantic intelligence system capable of:

Parsing and chunking regulatory documents

Extracting structured requirements and definitions

Generating embeddings using Sentence Transformers

Creating FAISS vector indexes

Enabling Retrieval-Augmented Generation (RAG) workflows

This is not a simple trivia engine — it is a scalable foundation for regulatory AI systems.

Motivation

Regulatory documents are:

Dense

Large (2,650+ pages processed)

Structurally complex

Difficult to navigate manually

This project converts them into a semantic knowledge base that can power:

AI-assisted question generation

Compliance intelligence

Regulatory explanation systems

Training and assessment tools

Context-aware retrieval systems

Data Processed

20 NCAA regulatory documents

2,650 total pages

3,785 semantic chunks

8,731 regulatory requirements extracted

382 definitions extracted

Source: Nigerian Civil Aviation Regulations (NIG-CARs)

Architecture

The system is built in modular layers.

Phase 1 – Content Extraction

Script:

scripts/build_content_index.py

Outputs:

/content_index/{doc_id}.json

Each JSON file contains:

Document ID

Structured chunks

Extracted definitions

Extracted regulatory requirements

Phase 2 – Embeddings & Vector Indexing

Embedding Model:

sentence-transformers/all-MiniLM-L6-v2

Vector Database:

FAISS (Facebook AI Similarity Search)

Script:

scripts/build_vector_index.py

Output:

/vector_index/{doc_id}/
index.faiss
metadata.json

Design Decision:
One FAISS index per document (for isolation and debugging clarity).
Global index support planned as a future upgrade.

Project Structure
ml-question-generator/
│
├── core/
│ ├── embeddings.py # Embedding model handler
│ ├── vector_store.py # FAISS index builder
│ └── search.py # Semantic search layer
│
├── scripts/
│ ├── build_content_index.py
│ └── build_vector_index.py
│
├── content_index/
├── vector_index/
├── progress.txt
└── README.md

Problems Faced During Development

1. Module Import Errors

Python path did not include project root.

Resolved by injecting PROJECT_ROOT into sys.path.

2. Data Structure Mismatch

Chunks were stored as strings.

Vector builder expected dictionaries.

Resolved by making vector store flexible to both formats.

3. Missing Document IDs

JSON files lacked doc_id.

Resolved by deriving doc_id from filename.

4. Windows Symlink Warning

HuggingFace cache uses symlinks.

Windows environment limitation.

Non-blocking; functionality unaffected.

All errors were resolved structurally — not patched temporarily.

Current Status

✔ All 20 regulatory documents indexed
✔ Embeddings generated successfully
✔ FAISS vector indexes built
✔ Clean modular architecture
✔ Retrieval layer ready for implementation

System is stable and ready for semantic querying integration.

Next Development Phases
Phase 4 – Retrieval Layer

Implement semantic search per document

Return top-k relevant regulatory chunks

Phase 5 – RAG Integration

Inject retrieved context into question generation

Generate regulation-grounded explanations

Phase 6 – Cross-Document Intelligence

Global FAISS index

Metadata-aware ranking

Requirement-priority weighting

Phase 7 – Production Readiness

API layer

Async indexing

Caching

Performance optimization

Phase 8 – Regulatory AI Platform

Compliance checking

Section citation validation

Requirement traceability

AI-assisted audit tools

Why This Matters

Regulatory AI systems must be:

Deterministic where needed

Context-aware

Structurally traceable

Explainable

This project is built incrementally toward that goal.

It is designed not just to generate questions, but to build a foundation for regulatory intelligence systems.

Author

Built as part of an evolving AI engineering portfolio focused on:

Retrieval-Augmented Generation (RAG)

Regulatory data structuring

Semantic search systems

ML infrastructure design

If you want to run it:

Create virtual environment

Install dependencies from requirements.txt

Run:

python scripts/build_content_index.py
python scripts/build_vector_index.py

Status

Development in progress.
Retrieval layer integration coming next.
