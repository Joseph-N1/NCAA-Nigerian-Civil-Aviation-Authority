# NCAA Assistant App - Complete File Transfer Cleanup Guide

## Overview

**Total Project Size:** ~1.37 GB  
**Minimum for Transfer:** ~175-180 MB  
**Action:** Copy ALL files first, then delete items marked with ❌

---

## Directory Structure with Cleanup Recommendations

### ROOT LEVEL FILES

| Item                         | Size  | Keep?     | Delete? | Reason                            |
| ---------------------------- | ----- | --------- | ------- | --------------------------------- |
| `RUN_APP.bat`                | <1 KB | ✅ KEEP   |         | Launcher script for recipients    |
| `README.txt`                 | <1 KB | ✅ KEEP   |         | Setup instructions for recipients |
| `INSTALL_INSTRUCTIONS.txt`   | <1 KB | ✅ KEEP   |         | Manual installation steps         |
| `start-trivia-app.ps1`       | <1 KB | ✅ KEEP   |         | PowerShell launcher option        |
| `questions.html`             | <1 KB | ⚠️        |         | Check if still used by app        |
| `pdf-upload.html`            | <1 KB | ⚠️        |         | Check if still used by app        |
| `TESTING_GUIDE.md`           | <1 KB | ✅ KEEP   |         | Help for testing app              |
| `PROJECT_READINESS.md`       | <1 KB | ✅ KEEP   |         | Project status reference          |
| `EXECUTION_CHECKLIST.md`     | <1 KB | ❌ DELETE |         | Development tracking only         |
| `Filetree Pro.md`            | <1 KB | ❌ DELETE |         | File tree output (not needed)     |
| `LOCAL_TERMINAL_COMMANDS.md` | <1 KB | ❌ DELETE |         | Development notes only            |
| `tmp-backend-err.txt`        | <1 KB | ❌ DELETE |         | Temporary error log               |
| `tmp-backend-out.txt`        | <1 KB | ❌ DELETE |         | Temporary output log              |
| `tmp-python-err.txt`         | <1 KB | ❌ DELETE |         | Temporary error log               |
| `tmp-python-out.txt`         | <1 KB | ❌ DELETE |         | Temporary output log              |

---

## database/ Directory (~113 MB)

| Item                       | Size   | Keep?     | Delete? | Reason                                  |
| -------------------------- | ------ | --------- | ------- | --------------------------------------- |
| **database/**              | 113 MB | ✅ KEEP   |         | Critical - contains all regulation PDFs |
| ├─ **nig_cars/**           | 113 MB | ✅ KEEP   |         | 22 NCAA PDF documents (required)        |
| ├─ **advisory_circulars/** | -      | ❌ DELETE |         | Empty or unused                         |
| ├─ **manuals/**            | -      | ❌ DELETE |         | Empty or unused                         |
| ├─ **technical_guidance/** | -      | ❌ DELETE |         | Empty or unused                         |

---

## ml-question-generator/ Directory (~270 MB total in source)

### Core Backend Modules (~50 KB)

| Item                  | Size  | Keep?     | Delete? | Reason                         |
| --------------------- | ----- | --------- | ------- | ------------------------------ |
| `api.py`              | <1 KB | ✅ KEEP   |         | Main Flask server - REQUIRED   |
| `main.py`             | <1 KB | ✅ KEEP   |         | Compatibility layer - REQUIRED |
| `requirements.txt`    | <1 KB | ✅ KEEP   |         | Core dependencies              |
| `requirements-ml.txt` | <1 KB | ✅ KEEP   |         | ML dependencies                |
| `README.md`           | <1 KB | ✅ KEEP   |         | Documentation                  |
| `concept.txt`         | <1 KB | ⚠️        |         | Development notes              |
| `progress.txt`        | <1 KB | ❌ DELETE |         | Development tracking only      |

### core/ Directory (~50 KB)

| Item                       | Size   | Keep?     | Delete? | Reason                              |
| -------------------------- | ------ | --------- | ------- | ----------------------------------- |
| **core/**                  | 50 KB  | ✅ KEEP   |         | Question generation & search engine |
| ├─ `__init__.py`           | <1 KB  | ✅ KEEP   |         | Module init                         |
| ├─ `answer_annotations.py` | <1 KB  | ✅ KEEP   |         | PDF citation builder                |
| ├─ `catalog.py`            | <1 KB  | ✅ KEEP   |         | Document catalog                    |
| ├─ `chunking.py`           | <1 KB  | ✅ KEEP   |         | Text chunking                       |
| ├─ `clean.py`              | <1 KB  | ✅ KEEP   |         | Text cleaning                       |
| ├─ `concepts.py`           | <1 KB  | ✅ KEEP   |         | Concept extraction                  |
| ├─ `distractors.py`        | <1 KB  | ✅ KEEP   |         | Distractor generation               |
| ├─ `embeddings.py`         | <1 KB  | ✅ KEEP   |         | Embedding model                     |
| ├─ `explanations.py`       | <1 KB  | ✅ KEEP   |         | Answer explanations                 |
| ├─ `extract.py`            | <1 KB  | ✅ KEEP   |         | PDF text extraction                 |
| ├─ `hints.py`              | <1 KB  | ✅ KEEP   |         | Hint generation                     |
| ├─ `pipeline.py`           | <1 KB  | ✅ KEEP   |         | Question generation orchestration   |
| ├─ `questions.py`          | <1 KB  | ✅ KEEP   |         | Question creation                   |
| ├─ `search.py`             | <1 KB  | ✅ KEEP   |         | FAISS semantic search               |
| ├─ `vector_store.py`       | <1 KB  | ✅ KEEP   |         | Vector store management             |
| └─ ****pycache**/**        | ~10 KB | ❌ DELETE |         | Python cache - will regenerate      |

### scripts/ Directory (~30 KB)

| Item                        | Size  | Keep?     | Delete? | Reason                         |
| --------------------------- | ----- | --------- | ------- | ------------------------------ |
| **scripts/**                | 30 KB | ✅ KEEP   |         | Q&A and indexing scripts       |
| ├─ `__init__.py`            | <1 KB | ✅ KEEP   |         | Module init                    |
| ├─ `qa_engine.py`           | <1 KB | ✅ KEEP   |         | RAG Q&A pipeline - REQUIRED    |
| ├─ `build_vector_index.py`  | <1 KB | ✅ KEEP   |         | Index builder (if rebuilding)  |
| ├─ `build_content_index.py` | <1 KB | ✅ KEEP   |         | Content index builder          |
| ├─ `test_rag_pipeline.py`   | <1 KB | ⚠️        |         | Testing utility                |
| ├─ `test_search.py`         | <1 KB | ⚠️        |         | Testing utility                |
| ├─ `evaluation.py`          | <1 KB | ⚠️        |         | Evaluation utility             |
| └─ ****pycache**/**         | ~5 KB | ❌ DELETE |         | Python cache - will regenerate |

### templates/ Directory (~3 KB)

| Item            | Size  | Keep?   | Delete? | Reason                            |
| --------------- | ----- | ------- | ------- | --------------------------------- |
| **templates/**  | 3 KB  | ✅ KEEP |         | Frontend HTML pages               |
| ├─ `home.html`  | ~2 KB | ✅ KEEP |         | Quiz builder interface - REQUIRED |
| └─ `index.html` | ~1 KB | ✅ KEEP |         | Q&A interface - REQUIRED          |

### static/ Directory (~10 KB)

| Item                    | Size  | Keep?   | Delete? | Reason                      |
| ----------------------- | ----- | ------- | ------- | --------------------------- |
| **static/**             | 10 KB | ✅ KEEP |         | Frontend CSS and JavaScript |
| ├─ `app.css`            | <1 KB | ✅ KEEP |         | Application styling         |
| └─ `ask-annotations.js` | <1 KB | ✅ KEEP |         | Answer annotation logic     |

### content_index/ Directory (~5 MB)

| Item                                                 | Size  | Keep?   | Delete? | Reason                            |
| ---------------------------------------------------- | ----- | ------- | ------- | --------------------------------- |
| **content_index/**                                   | 5 MB  | ✅ KEEP |         | **CRITICAL** - Document manifests |
| ├─ `manifest.json`                                   | <1 KB | ✅ KEEP |         | Master document list - REQUIRED   |
| ├─ `nig-cars-ncaa-schedule-of-fees-and-charges.json` | <1 KB | ✅ KEEP |         | Part: Fees & Charges              |
| ├─ `nig-cars-part-1-*.json`                          | <1 KB | ✅ KEEP |         | Part 1: General Policies          |
| ├─ `nig-cars-part-2-*.json`                          | <1 KB | ✅ KEEP |         | Part 2: Personnel Licensing       |
| ├─ `nig-cars-part-3-*.json`                          | <1 KB | ✅ KEEP |         | Part 3: Training                  |
| ├─ `nig-cars-part-4-*.json`                          | <1 KB | ✅ KEEP |         | Part 4: Registration & Marking    |
| ├─ `nig-cars-part-5-*.json`                          | <1 KB | ✅ KEEP |         | Part 5: Airworthiness             |
| ├─ `nig-cars-part-6-*.json`                          | <1 KB | ✅ KEEP |         | Part 6: Maintenance Organization  |
| ├─ `nig-cars-part-7-*.json`                          | <1 KB | ✅ KEEP |         | Part 7: Instruments               |
| ├─ `nig-cars-part-8-*.json`                          | <1 KB | ✅ KEEP |         | Part 8: Operations                |
| ├─ `nig-cars-part-9-*.json`                          | <1 KB | ✅ KEEP |         | Part 9: Operator Certification    |
| ├─ `nig-cars-part-10-*.json`                         | <1 KB | ✅ KEEP |         | Part 10: Foreign Operators        |
| ├─ `nig-cars-part-11-*.json`                         | <1 KB | ✅ KEEP |         | Part 11: Aerial Work              |
| ├─ `nig-cars-part-12-*.json` (×2)                    | <1 KB | ✅ KEEP |         | Part 12: Aerodromes & Heliports   |
| ├─ `nig-cars-part-14-*.json`                         | <1 KB | ✅ KEEP |         | Part 14: Air Navigation           |
| ├─ `nig-cars-part-15-*.json`                         | <1 KB | ✅ KEEP |         | Part 15: Dangerous Goods          |
| ├─ `nig-cars-part-16-*.json`                         | <1 KB | ✅ KEEP |         | Part 16: Environmental            |
| ├─ `nig-cars-part-17-*.json`                         | <1 KB | ✅ KEEP |         | Part 17: Security                 |
| ├─ `nig-cars-part-18-*.json`                         | <1 KB | ✅ KEEP |         | Part 18: Economics                |
| ├─ `nig-cars-part-19-*.json`                         | <1 KB | ✅ KEEP |         | Part 19: Consumer Protection      |
| ├─ `nig-cars-part-20-*.json`                         | <1 KB | ✅ KEEP |         | Part 20: Safety Management        |
| └─ `nig-cars-part-21-*.json`                         | <1 KB | ✅ KEEP |         | Part 21: RPAS (Drones)            |

### vector_index/ Directory (~16.7 MB)

| Item                              | Size      | Keep?   | Delete?                        | Reason                                       |
| --------------------------------- | --------- | ------- | ------------------------------ | -------------------------------------------- |
| **vector_index/**                 | 16.7 MB   | ✅ KEEP |                                | **CRITICAL** - FAISS search indexes          |
| ├─ **nig-cars-ncaa-schedule.../** | ~0.8 MB   | ✅ KEEP |                                | Index for Fees & Charges                     |
| ├─ **nig-cars-part-1-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 1                             |
| ├─ **nig-cars-part-2-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 2                             |
| ├─ **nig-cars-part-3-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 3                             |
| ├─ **nig-cars-part-4-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 4                             |
| ├─ **nig-cars-part-5-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 5                             |
| ├─ **nig-cars-part-6-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 6                             |
| ├─ **nig-cars-part-7-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 7                             |
| ├─ **nig-cars-part-8-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 8                             |
| ├─ **nig-cars-part-9-.../**       | ~0.8 MB   | ✅ KEEP |                                | Index for Part 9                             |
| ├─ **nig-cars-part-10-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 10                            |
| ├─ **nig-cars-part-11-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 11                            |
| ├─ **nig-cars-part-12-.../** (×2) | ~0.8 MB   | ✅ KEEP |                                | Indexes for Part 12 (Aerodromes & Heliports) |
| ├─ **nig-cars-part-14-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 14                            |
| ├─ **nig-cars-part-15-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 15                            |
| ├─ **nig-cars-part-16-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 16                            |
| ├─ **nig-cars-part-17-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 17                            |
| ├─ **nig-cars-part-18-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 18                            |
| ├─ **nig-cars-part-19-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 19                            |
| ├─ **nig-cars-part-20-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 20                            |
| └─ **nig-cars-part-21-.../**      | ~0.8 MB   | ✅ KEEP |                                | Index for Part 21 (Drones)                   |
| └─ ****pycache**/**               | ❌ DELETE |         | Python cache - will regenerate |

---

## Other Root Directories

### js/ Directory (~3 KB)

| Item               | Size  | Keep?   | Delete? | Reason                 |
| ------------------ | ----- | ------- | ------- | ---------------------- |
| **js/**            | 3 KB  | ✅ KEEP |         | Frontend JavaScript    |
| ├─ `pdf-select.js` | <1 KB | ✅ KEEP |         | PDF selection logic    |
| └─ `questions.js`  | <1 KB | ✅ KEEP |         | Quiz interaction logic |

### styles/ Directory (~5 KB)

| Item                | Size  | Keep?   | Delete? | Reason              |
| ------------------- | ----- | ------- | ------- | ------------------- |
| **styles/**         | 5 KB  | ✅ KEEP |         | CSS stylesheets     |
| ├─ `pdf-upload.css` | <1 KB | ✅ KEEP |         | Upload page styling |
| └─ `questions.css`  | <1 KB | ✅ KEEP |         | Quiz styling        |

### .venv/ Directory (~500 MB)

| Item            | Size    | Keep?     | Delete? | Reason                            |
| --------------- | ------- | --------- | ------- | --------------------------------- |
| **.venv/**      | ~500 MB | ❌ DELETE |         | Virtual environment - MUST REMOVE |
| ├─ **Lib/**     | ~500 MB | ❌ DELETE |         | All dependencies                  |
| ├─ **Scripts/** | <1 MB   | ❌ DELETE |         | Environment scripts               |
| └─ **share/**   | <1 MB   | ❌ DELETE |         | Shared files                      |

### .git/ Directory (if present)

| Item      | Size   | Keep?     | Delete? | Reason                   |
| --------- | ------ | --------- | ------- | ------------------------ |
| **.git/** | ~50 MB | ❌ DELETE |         | Git history - not needed |

---

## Summary

### ✅ MUST KEEP (~180 MB)

```
database/nig_cars/                     ~113 MB (22 PDFs)
ml-question-generator/vector_index/    ~16.7 MB (22 indexes)
ml-question-generator/content_index/   ~5 MB (document manifests)
ml-question-generator/core/            ~50 KB (backend modules)
ml-question-generator/scripts/         ~30 KB (Q&A engine)
ml-question-generator/templates/       ~3 KB (HTML pages)
ml-question-generator/static/          ~10 KB (CSS/JS)
js/                                    ~3 KB (frontend logic)
styles/                                ~5 KB (stylesheets)
Configuration files                    ~10 KB (requirements.txt, etc.)
Launcher scripts                        ~3 KB (RUN_APP.bat, etc.)
───────────────────────────────────────────────────
TOTAL TO KEEP:                          ~135-140 MB
```

### ❌ MUST DELETE (~800+ MB)

```
.venv/                                 ~500 MB (recreate on recipient machine)
.git/                                  ~50 MB (git history not needed)
ml-question-generator/__pycache__/     ~1 MB (Python cache regenerates)
ml-question-generator/core/__pycache__/  (cache files)
ml-question-generator/scripts/__pycache__/ (cache files)
Temporary files (tmp-*.txt)            ~<1 MB
Development files (EXECUTION_CHECKLIST.md, LOCAL_TERMINAL_COMMANDS.md, etc.)
───────────────────────────────────────────────────
TOTAL TO DELETE:                       ~550+ MB
```

---

## Cleanup Steps

### Step 1: Copy All Files (Using File Explorer)

1. Right-click source folder → Copy
2. Navigate to transfer destination
3. Paste entire folder

### Step 2: Delete Unnecessary Items

From the transfer folder, delete these:

```powershell
# Delete virtual environment (huge savings)
Remove-Item -Path "transfer_folder\.venv" -Recurse -Force

# Delete git history
Remove-Item -Path "transfer_folder\.git" -Recurse -Force

# Delete Python cache
Remove-Item -Path "transfer_folder\ml-question-generator\__pycache__" -Recurse -Force
Remove-Item -Path "transfer_folder\ml-question-generator\core\__pycache__" -Recurse -Force
Remove-Item -Path "transfer_folder\ml-question-generator\scripts\__pycache__" -Recurse -Force

# Delete temporary files
Remove-Item -Path "transfer_folder\tmp-*.txt" -Force

# Delete development docs
Remove-Item -Path "transfer_folder\EXECUTION_CHECKLIST.md" -Force
Remove-Item -Path "transfer_folder\LOCAL_TERMINAL_COMMANDS.md" -Force
Remove-Item -Path "transfer_folder\Filetree Pro.md" -Force

# Delete tracking files
Remove-Item -Path "transfer_folder\ml-question-generator\progress.txt" -Force
```

### Step 3: Verify Final Size

- Target: **~175-180 MB** (from 1.37 GB)
- This is the minimum needed for full functionality

### Step 4: Verify Critical Files Present

Before transferring to flash drive, check:

- ✅ `database/nig_cars/` has 22 PDF files
- ✅ `ml-question-generator/vector_index/` has 22 subdirectories
- ✅ `ml-question-generator/content_index/` has manifest.json + 22 JSON files
- ✅ All launcher scripts present (RUN_APP.bat, README.txt, etc.)
- ✅ All `ml-question-generator/core/*.py` files present (15 modules)
- ✅ `ml-question-generator/api.py` present

---

## Notes

**Why keep content_index/?**

- Contains document metadata and part mappings
- Without this, app cannot identify which regulation each question/answer comes from
- Only 5 MB, essential for functionality

**Why delete .venv/?**

- Size: ~500 MB
- The RUN_APP.bat script will automatically create a fresh virtual environment
- Recipient's system may have different Python patch version

**Why delete **pycache**/?**

- Python will regenerate these automatically
- Saves ~1 MB
- Contains compiled bytecode, not needed for distribution

**Why keep all vector_index/ files?**

- These are pre-computed FAISS semantic search indexes
- Without them, app would need to rebuild indexes (takes 10-30 minutes)
- Rebuilding requires the source PDFs to be converted to embeddings
- Size: 16.7 MB is acceptable for faster startup
