# File Tree: trivia-game-(V3)-(NCAA)

**Generated:** 4/17/2026, Current Session
**Root Path:** `c:\Users\Joseph N Nimyel\OneDrive\Documents\Mimo Projects\Trivia\trivia-game-(V3)-(NCAA)`

```
├── 📄 -w
├── 📋 .gitignore
├── 📁 database
│   ├── 📕 nig-cars-ncaa-schedule-of-fees-and-charges.pdf
│   ├── 📕 nig-cars-part-1-general-policies-procedures-and-definitions.pdf
│   ├── 📕 nig-cars-part-10-commercial-air-transport-by-foreign-air-operators-within-nigeria.pdf
│   ├── 📕 nig-cars-part-11-aerial-work.pdf
│   ├── 📕 nig-cars-part-12-aerodrome-regulations-vol-i.pdf
│   ├── 📕 nig-cars-part-12-heliport-regulations-vol-ii.pdf
│   ├── 📕 nig-cars-part-14-air-navigation-services-14-0-to-14-7.pdf
│   ├── 📕 nig-cars-part-15-safe-transport-of-dangerous-goods-by-air.pdf
│   ├── 📕 nig-cars-part-16-environmental-protection.pdf
│   ├── 📕 nig-cars-part-17-aviation-security.pdf
│   ├── 📕 nig-cars-part-18-air-transport-economics.pdf
│   ├── 📕 nig-cars-part-19-consumer-protection.pdf
│   ├── 📕 nig-cars-part-2-personnel-licensing.pdf
│   ├── 📕 nig-cars-part-20-safety-management.pdf
│   ├── 📕 nig-cars-part-21-remotely-piloted-aircraft-system.pdf
│   ├── 📕 nig-cars-part-3-approved-training-organization.pdf
│   ├── 📕 nig-cars-part-4-aircraft-registration-and-marking.pdf
│   ├── 📕 nig-cars-part-5-airworthiness.pdf
│   ├── 📕 nig-cars-part-6-approved-maintenance-organization.pdf
│   ├── 📕 nig-cars-part-7-instrument-and-equipment.pdf
│   ├── 📕 nig-cars-part-8-operations.pdf
│   └── 📕 nig-cars-part-9-air-operator-certification-and-administration.pdf
├── 📁 js
│   ├── 📄 pdf-select.js
│   └── 📄 questions.js
├── 📁 ml-question-generator
│   ├── 📁 content_index
│   │   ├── ⚙️ manifest.json
│   │   ├── ⚙️ nig-cars-ncaa-schedule-of-fees-and-charges.json
│   │   ├── ⚙️ nig-cars-part-1-general-policies-procedures-and-definitions.json
│   │   ├── ⚙️ nig-cars-part-10-commercial-air-transport-by-foreign-air-operators-within-nigeria.json
│   │   ├── ⚙️ nig-cars-part-11-aerial-work.json
│   │   ├── ⚙️ nig-cars-part-12-aerodrome-regulations-vol-i.json
│   │   ├── ⚙️ nig-cars-part-12-heliport-regulations-vol-ii.json
│   │   ├── ⚙️ nig-cars-part-14-air-navigation-services-14-0-to-14-7.json
│   │   ├── ⚙️ nig-cars-part-15-safe-transport-of-dangerous-goods-by-air.json
│   │   ├── ⚙️ nig-cars-part-16-environmental-protection.json
│   │   ├── ⚙️ nig-cars-part-17-aviation-security.json
│   │   ├── ⚙️ nig-cars-part-18-air-transport-economics.json
│   │   ├── ⚙️ nig-cars-part-19-consumer-protection.json
│   │   ├── ⚙️ nig-cars-part-2-personnel-licensing.json
│   │   ├── ⚙️ nig-cars-part-20-safety-management.json
│   │   ├── ⚙️ nig-cars-part-21-remotely-piloted-aircraft-system.json
│   │   ├── ⚙️ nig-cars-part-3-approved-training-organization.json
│   │   ├── ⚙️ nig-cars-part-4-aircraft-registration-and-marking.json
│   │   ├── ⚙️ nig-cars-part-5-airworthiness.json
│   │   ├── ⚙️ nig-cars-part-6-approved-maintenance-organization.json
│   │   ├── ⚙️ nig-cars-part-7-instrument-and-equipment.json
│   │   ├── ⚙️ nig-cars-part-8-operations.json
│   │   └── ⚙️ nig-cars-part-9-air-operator-certification-and-administration.json
│   ├── 📁 core
│   │   ├── 🐍 __init__.py
│   │   ├── 🐍 chunking.py
│   │   ├── 🐍 clean.py
│   │   ├── 🐍 concepts.py
│   │   ├── 🐍 distractors.py
│   │   ├── 🐍 embeddings.py
│   │   ├── 🐍 explanations.py
│   │   ├── 🐍 extract.py
│   │   ├── 🐍 hints.py
│   │   ├── 🐍 pipeline.py
│   │   ├── 🐍 questions.py
│   │   ├── 🐍 search.py
│   │   └── 🐍 vector_store.py
│   ├── 📁 scripts
│   │   ├── 🐍 __init__.py
│   │   ├── 🐍 build_content_index.py
│   │   ├── 🐍 build_vector_index.py
│   │   ├── 🐍 evaluation.py
│   │   ├── 🐍 qa_engine.py
│   │   ├── 🐍 test_rag_pipeline.py
│   │   └── 🐍 test_search.py
│   ├── 📁 static
│   │   └── 🎨 app.css
│   ├── 📁 templates
│   │   ├── 🌐 home.html
│   │   └── 🌐 index.html
│   ├── 📁 vector_index
│   │   ├── 📁 nig-cars-ncaa-schedule-of-fees-and-charges
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-1-general-policies-procedures-and-definitions
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-10-commercial-air-transport-by-foreign-air-operators-within-nigeria
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-11-aerial-work
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-12-aerodrome-regulations-vol-i
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-12-heliport-regulations-vol-ii
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-14-air-navigation-services-14-0-to-14-7
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-15-safe-transport-of-dangerous-goods-by-air
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-16-environmental-protection
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-17-aviation-security
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-18-air-transport-economics
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-19-consumer-protection
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-2-personnel-licensing
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-20-safety-management
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-21-remotely-piloted-aircraft-system
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-3-approved-training-organization
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-4-aircraft-registration-and-marking
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-5-airworthiness
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-6-approved-maintenance-organization
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-7-instrument-and-equipment
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   ├── 📁 nig-cars-part-8-operations
│   │   │   ├── 📄 index.faiss
│   │   │   └── ⚙️ metadata.json
│   │   └── 📁 nig-cars-part-9-air-operator-certification-and-administration
│   │       ├── 📄 index.faiss
│   │       └── ⚙️ metadata.json
│   ├── ⚙️ .gitignore
│   ├── 📝 README.md
│   ├── 🐍 api.py
│   ├── 📄 concept.txt
│   ├── 🐍 main.py
│   ├── 📄 progress.txt
│   ├── 📄 requirements-ml.txt
│   └── 📄 requirements.txt
├── 📁 styles
│   ├── 🎨 pdf-upload.css
│   └── 🎨 questions.css
├── � Filetree Pro.md
├── 🌐 pdf-upload.html
├── 🌐 questions.html
├── 📄 start-trivia-app.ps1
├── 📋 tmp-backend-err.txt
├── 📋 tmp-backend-out.txt
├── 📋 tmp-python-err.txt
└── 📋 tmp-python-out.txt
```

---

_Generated by FileTree Pro Extension_
_Last Updated: 4/17/2026 — Added temporary log files and .gitignore_
