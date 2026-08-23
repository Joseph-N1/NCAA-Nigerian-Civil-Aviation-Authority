# NCAA App - Flash Drive Transfer Checklist

**Date:** April 29, 2026  
**Version:** 1.0 Desktop Edition  
**Status:** Ready to Transfer

---

# ✅ TRANSFER CHECKLIST (What to Copy to Flash Drive)

## Priority 1: MUST TRANSFER (Core Application)

### Backend Application Files

```
☐ ml-question-generator/api.py
☐ ml-question-generator/main.py
☐ ml-question-generator/requirements.txt
☐ ml-question-generator/requirements-ml.txt
```

### Core Module (All Files)

```
☐ ml-question-generator/core/__init__.py
☐ ml-question-generator/core/answer_annotations.py
☐ ml-question-generator/core/catalog.py
☐ ml-question-generator/core/chunking.py
☐ ml-question-generator/core/clean.py
☐ ml-question-generator/core/concepts.py
☐ ml-question-generator/core/distractors.py
☐ ml-question-generator/core/embeddings.py
☐ ml-question-generator/core/explanations.py
☐ ml-question-generator/core/extract.py
☐ ml-question-generator/core/hints.py
☐ ml-question-generator/core/pipeline.py
☐ ml-question-generator/core/questions.py
☐ ml-question-generator/core/search.py
☐ ml-question-generator/core/vector_store.py
```

### Scripts Module (All Files)

```
☐ ml-question-generator/scripts/__init__.py
☐ ml-question-generator/scripts/qa_engine.py
☐ ml-question-generator/scripts/build_content_index.py
☐ ml-question-generator/scripts/build_vector_index.py
☐ ml-question-generator/scripts/test_rag_pipeline.py
☐ ml-question-generator/scripts/evaluation.py
☐ ml-question-generator/scripts/test_search.py
```

### Templates (HTML Frontend)

```
☐ ml-question-generator/templates/home.html
☐ ml-question-generator/templates/index.html
```

### Static Assets (CSS & JavaScript)

```
☐ ml-question-generator/static/app.css
☐ ml-question-generator/static/ask-annotations.js
```

### Content Index (All JSON Files)

```
☐ ml-question-generator/content_index/manifest.json
☐ ml-question-generator/content_index/nig-cars-ncaa-schedule-of-fees-and-charges.json
☐ ml-question-generator/content_index/nig-cars-part-1-general-policies-procedures-and-definitions.json
☐ ml-question-generator/content_index/nig-cars-part-2-personnel-licensing.json
☐ ml-question-generator/content_index/nig-cars-part-3-approved-training-organization.json
☐ ml-question-generator/content_index/nig-cars-part-4-aircraft-registration-and-marking.json
☐ ml-question-generator/content_index/nig-cars-part-5-airworthiness.json
☐ ml-question-generator/content_index/nig-cars-part-6-approved-maintenance-organization.json
☐ ml-question-generator/content_index/nig-cars-part-7-instrument-and-equipment.json
☐ ml-question-generator/content_index/nig-cars-part-8-operations.json
☐ ml-question-generator/content_index/nig-cars-part-9-air-operator-certification-and-administration.json
☐ ml-question-generator/content_index/nig-cars-part-10-commercial-air-transport-by-foreign-air-operators-within-nigeria.json
☐ ml-question-generator/content_index/nig-cars-part-11-aerial-work.json
☐ ml-question-generator/content_index/nig-cars-part-12-aerodrome-regulations-vol-i.json
☐ ml-question-generator/content_index/nig-cars-part-12-heliport-regulations-vol-ii.json
☐ ml-question-generator/content_index/nig-cars-part-14-air-navigation-services-14-0-to-14-7.json
☐ ml-question-generator/content_index/nig-cars-part-15-safe-transport-of-dangerous-goods-by-air.json
☐ ml-question-generator/content_index/nig-cars-part-16-environmental-protection.json
☐ ml-question-generator/content_index/nig-cars-part-17-aviation-security.json
☐ ml-question-generator/content_index/nig-cars-part-18-air-transport-economics.json
☐ ml-question-generator/content_index/nig-cars-part-19-consumer-protection.json
☐ ml-question-generator/content_index/nig-cars-part-20-safety-management.json
☐ ml-question-generator/content_index/nig-cars-part-21-remotely-piloted-aircraft-system.json
```

### Vector Indexes (All 21 Documents - Copy Entire Folders)

```
☐ ml-question-generator/vector_index/nig-cars-ncaa-schedule-of-fees-and-charges/
☐ ml-question-generator/vector_index/nig-cars-part-1-general-policies-procedures-and-definitions/
☐ ml-question-generator/vector_index/nig-cars-part-2-personnel-licensing/
☐ ml-question-generator/vector_index/nig-cars-part-3-approved-training-organization/
☐ ml-question-generator/vector_index/nig-cars-part-4-aircraft-registration-and-marking/
☐ ml-question-generator/vector_index/nig-cars-part-5-airworthiness/
☐ ml-question-generator/vector_index/nig-cars-part-6-approved-maintenance-organization/
☐ ml-question-generator/vector_index/nig-cars-part-7-instrument-and-equipment/
☐ ml-question-generator/vector_index/nig-cars-part-8-operations/
☐ ml-question-generator/vector_index/nig-cars-part-9-air-operator-certification-and-administration/
☐ ml-question-generator/vector_index/nig-cars-part-10-commercial-air-transport-by-foreign-air-operators-within-nigeria/
☐ ml-question-generator/vector_index/nig-cars-part-11-aerial-work/
☐ ml-question-generator/vector_index/nig-cars-part-12-aerodrome-regulations-vol-i/
☐ ml-question-generator/vector_index/nig-cars-part-12-heliport-regulations-vol-ii/
☐ ml-question-generator/vector_index/nig-cars-part-14-air-navigation-services-14-0-to-14-7/
☐ ml-question-generator/vector_index/nig-cars-part-15-safe-transport-of-dangerous-goods-by-air/
☐ ml-question-generator/vector_index/nig-cars-part-16-environmental-protection/
☐ ml-question-generator/vector_index/nig-cars-part-17-aviation-security/
☐ ml-question-generator/vector_index/nig-cars-part-18-air-transport-economics/
☐ ml-question-generator/vector_index/nig-cars-part-19-consumer-protection/
☐ ml-question-generator/vector_index/nig-cars-part-20-safety-management/
☐ ml-question-generator/vector_index/nig-cars-part-21-remotely-piloted-aircraft-system/
```

## Priority 2: MUST TRANSFER (Database PDFs)

### All 21 NCAA Regulation PDFs

```
☐ database/nig-cars-ncaa-schedule-of-fees-and-charges.pdf
☐ database/nig-cars-part-1-general-policies-procedures-and-definitions.pdf
☐ database/nig-cars-part-2-personnel-licensing.pdf
☐ database/nig-cars-part-3-approved-training-organization.pdf
☐ database/nig-cars-part-4-aircraft-registration-and-marking.pdf
☐ database/nig-cars-part-5-airworthiness.pdf
☐ database/nig-cars-part-6-approved-maintenance-organization.pdf
☐ database/nig-cars-part-7-instrument-and-equipment.pdf
☐ database/nig-cars-part-8-operations.pdf
☐ database/nig-cars-part-9-air-operator-certification-and-administration.pdf
☐ database/nig-cars-part-10-commercial-air-transport-by-foreign-air-operators-within-nigeria.pdf
☐ database/nig-cars-part-11-aerial-work.pdf
☐ database/nig-cars-part-12-aerodrome-regulations-vol-i.pdf
☐ database/nig-cars-part-12-heliport-regulations-vol-ii.pdf
☐ database/nig-cars-part-14-air-navigation-services-14-0-to-14-7.pdf
☐ database/nig-cars-part-15-safe-transport-of-dangerous-goods-by-air.pdf
☐ database/nig-cars-part-16-environmental-protection.pdf
☐ database/nig-cars-part-17-aviation-security.pdf
☐ database/nig-cars-part-18-air-transport-economics.pdf
☐ database/nig-cars-part-19-consumer-protection.pdf
☐ database/nig-cars-part-20-safety-management.pdf
☐ database/nig-cars-part-21-remotely-piloted-aircraft-system.pdf
```

## Priority 3: MUST TRANSFER (Frontend Files)

### JavaScript Files

```
☐ js/pdf-select.js
☐ js/questions.js
```

### CSS Stylesheets

```
☐ styles/pdf-upload.css
☐ styles/questions.css
```

### HTML Pages

```
☐ pdf-upload.html
☐ questions.html
```

## Priority 4: LAUNCHER & DOCUMENTATION (Already Created)

```
☐ RUN_APP.bat              ← One-click launcher
☐ README.txt               ← User instructions
☐ INSTALL_INSTRUCTIONS.txt ← Manual setup guide
```

---

# ✅ FILES TO CREATE (Already Done!)

You have already created these in your project root:

1. **RUN_APP.bat** ✅
   - Location: Root folder
   - Purpose: One-click launcher for Windows
   - Status: Ready to transfer

2. **README.txt** ✅
   - Location: Root folder
   - Purpose: User-friendly instructions
   - Status: Ready to transfer

3. **INSTALL_INSTRUCTIONS.txt** ✅
   - Location: Root folder
   - Purpose: Manual installation guide
   - Status: Ready to transfer

---

# ✅ FILES TO EXCLUDE (Don't Transfer!)

```
❌ .venv/                  (Virtual environment - will recreate)
❌ __pycache__/            (Python cache)
❌ *.pyc                   (Compiled Python)
❌ .git/                   (Git history)
❌ .gitignore              (Git file)
❌ *.log                   (Log files)
❌ tmp-*.txt               (Temporary files)
❌ startup-*.log           (Startup logs)
❌ ml-question-generator/.venv/  (Virtual environment)
```

---

# 🚀 HOW TO TRANSFER TO FLASH DRIVE

## Method 1: Windows Explorer (Easiest)

```
1. Plug in flash drive
2. Open File Explorer
3. Go to: c:\Users\Joseph N Nimyel\OneDrive\Documents\Mimo Projects\Trivia\trivia-game-(V3)-(NCAA)
4. Select all files and folders EXCEPT:
   - .venv folder
   - __pycache__ folders
   - .git folder
   - Log files
5. Copy to flash drive
6. Wait for transfer to complete (5-10 minutes)
```

## Method 2: Command Line (Faster)

```powershell
# Open PowerShell as Administrator

# Navigate to project
cd 'c:\Users\Joseph N Nimyel\OneDrive\Documents\Mimo Projects\Trivia\trivia-game-(V3)-(NCAA)'

# Copy everything to flash drive (replace X: with your flash drive letter)
xcopy . X:\ /E /I /Y /EXCLUDE:exclude.txt

# If exclude.txt doesn't exist, just be careful to exclude .venv folder
```

## Method 3: Zip and Copy (Cleanest)

```
1. Select entire project folder
2. Right-click → Send to → Compressed (zipped) folder
3. Copy the .zip file to flash drive
4. Recipient extracts it on their computer
```

---

# 🏃 HOW RECIPIENT RUNS THE APP

## For Person Receiving on Flash Drive:

### Step 1: Prerequisites

- [ ] Flash drive with app copied
- [ ] Python 3.11+ installed (or will install)
- [ ] Web browser installed

### Step 2: Extract (One-Time)

```
1. Plug in flash drive
2. Copy entire folder to Desktop
3. Done! (Don't need flash drive anymore)
```

### Step 3: Run the App

```
1. Navigate to the folder on Desktop
2. Double-click: RUN_APP.bat
3. Wait 3-5 minutes (first time only)
4. Browser opens automatically
5. App is running! 🎉
```

### Step 4: Subsequent Runs

```
1. Double-click: RUN_APP.bat
2. Wait 10 seconds
3. App launches instantly
```

---

# 📊 TRANSFER SIZE ESTIMATES

```
Component                      Size
─────────────────────────────────────
ml-question-generator/core/    ~50 KB
ml-question-generator/scripts/ ~30 KB
ml-question-generator/api.py   ~20 KB
ml-question-generator/main.py  ~10 KB

templates/ (HTML)              ~50 KB
static/ (CSS/JS)               ~40 KB

content_index/ (JSON)           ~5 MB
vector_index/ (FAISS)           ~800 MB
database/ (PDFs)                ~900 MB

─────────────────────────────────────
TOTAL:                          ~1.7 GB
─────────────────────────────────────
```

**Important:** Minimum 2GB flash drive recommended

---

# ✅ VERIFICATION CHECKLIST

Before handing off the flash drive:

```
☐ RUN_APP.bat exists in root?
☐ README.txt exists in root?
☐ INSTALL_INSTRUCTIONS.txt exists in root?
☐ database/ folder with all 21 PDFs?
☐ ml-question-generator/core/ with all .py files?
☐ ml-question-generator/scripts/ with all .py files?
☐ ml-question-generator/templates/ with .html files?
☐ ml-question-generator/static/ with .css and .js files?
☐ ml-question-generator/content_index/ with all JSON files?
☐ ml-question-generator/vector_index/ with 21 folders?
☐ NO .venv/ folder copied?
☐ NO __pycache__/ folders copied?
☐ requirements.txt exists?
☐ requirements-ml.txt exists?
☐ Total size ~1.7 GB?
```

---

# 🎯 QUICK REFERENCE

| Item          | Status   | Location                 |
| ------------- | -------- | ------------------------ |
| Launcher      | ✅ Ready | RUN_APP.bat              |
| Documentation | ✅ Ready | README.txt               |
| Setup Guide   | ✅ Ready | INSTALL_INSTRUCTIONS.txt |
| Backend Code  | ✅ Ready | ml-question-generator/   |
| Frontend Code | ✅ Ready | js/ + styles/            |
| Databases     | ✅ Ready | database/ (21 PDFs)      |
| Indexes       | ✅ Ready | vector_index/ (FAISS)    |
| Content       | ✅ Ready | content_index/ (JSON)    |

---

# 🚨 TROUBLESHOOTING FOR RECIPIENTS

```
Problem: "Python not found" error
→ Install Python 3.11+ from python.org

Problem: "Port 5000 already in use"
→ Edit api.py, change port=5000 to port=5001

Problem: App takes forever first time
→ Normal! Installing dependencies. Wait 5-10 minutes.

Problem: Browser doesn't open
→ Manually go to http://127.0.0.1:5000

Problem: "Dependency installation failed"
→ Check internet connection, try again

Problem: App won't start
→ Check all files were transferred (especially core/ folder)
```

---

## SUMMARY

✅ **3 launcher files created** (RUN_APP.bat, README.txt, INSTALL_INSTRUCTIONS.txt)  
✅ **All backend code ready** (ml-question-generator/)  
✅ **All databases ready** (21 NCAA PDFs + vectors)  
✅ **All frontend code ready** (HTML, CSS, JavaScript)  
✅ **Ready to transfer to flash drive** (~1.7 GB)  
✅ **Recipients can run with one double-click**

**Next Step:** Copy everything to flash drive and test!

---

**Created:** April 29, 2026  
**Version:** 1.0 Desktop Edition  
**Status:** ✅ READY FOR DISTRIBUTION
