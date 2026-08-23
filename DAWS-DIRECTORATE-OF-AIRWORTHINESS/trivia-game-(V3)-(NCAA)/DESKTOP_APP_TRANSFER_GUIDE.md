# Desktop App Transfer Guide

## NCAA Regulatory Intelligence Platform - Version 1

**Date:** April 29, 2026  
**Purpose:** Transfer app to flash drive for offline/desktop use  
**Time to Transfer:** ~15 minutes  
**Recipient Requirement:** Python 3.11+ only

---

# PART 1: FILES TO TRANSFER TO FLASH DRIVE

## Step 1: Core Application Files (REQUIRED)

```
📁 ml-question-generator/
├── 🐍 api.py                          ← Main Flask server
├── 🐍 main.py                         ← Compatibility layer
├── requirements.txt                   ← Python dependencies
├── requirements-ml.txt                ← Optional ML dependencies
│
├── 📁 core/                           ← ALL FILES IN THIS FOLDER
│   ├── __init__.py
│   ├── answer_annotations.py
│   ├── catalog.py
│   ├── chunking.py
│   ├── clean.py
│   ├── concepts.py
│   ├── distractors.py
│   ├── embeddings.py
│   ├── explanations.py
│   ├── extract.py
│   ├── hints.py
│   ├── pipeline.py
│   ├── questions.py
│   ├── search.py
│   └── vector_store.py
│
├── 📁 scripts/                        ← ALL FILES IN THIS FOLDER
│   ├── __init__.py
│   ├── qa_engine.py
│   └── (other .py files)
│
├── 📁 templates/                      ← ALL HTML FILES
│   ├── home.html
│   └── index.html
│
├── 📁 static/                         ← ALL STATIC FILES
│   ├── app.css
│   └── ask-annotations.js
│
├── 📁 content_index/                  ← ALL JSON INDEX FILES
│   ├── manifest.json
│   ├── nig-cars-part-*.json           ← ALL 21 JSON files
│   └── (all others)
│
└── 📁 vector_index/                   ← ALL VECTOR INDEXES
    ├── nig-cars-part-1-*/
    │   ├── index.faiss
    │   └── metadata.json
    ├── nig-cars-part-2-*/
    │   ├── index.faiss
    │   └── metadata.json
    └── (all 21 document folders)
```

## Step 2: Database Files (REQUIRED)

```
📁 database/                           ← ALL PDF FILES
├── nig-cars-ncaa-schedule-of-fees-and-charges.pdf
├── nig-cars-part-1-general-policies-procedures-and-definitions.pdf
├── nig-cars-part-2-personnel-licensing.pdf
├── nig-cars-part-3-approved-training-organization.pdf
├── nig-cars-part-4-aircraft-registration-and-marking.pdf
├── nig-cars-part-5-airworthiness.pdf
├── nig-cars-part-6-approved-maintenance-organization.pdf
├── nig-cars-part-7-instrument-and-equipment.pdf
├── nig-cars-part-8-operations.pdf
├── nig-cars-part-9-air-operator-certification-and-administration.pdf
├── nig-cars-part-10-commercial-air-transport-by-foreign-air-operators-within-nigeria.pdf
├── nig-cars-part-11-aerial-work.pdf
├── nig-cars-part-12-aerodrome-regulations-vol-i.pdf
├── nig-cars-part-12-heliport-regulations-vol-ii.pdf
├── nig-cars-part-14-air-navigation-services-14-0-to-14-7.pdf
├── nig-cars-part-15-safe-transport-of-dangerous-goods-by-air.pdf
├── nig-cars-part-16-environmental-protection.pdf
├── nig-cars-part-17-aviation-security.pdf
├── nig-cars-part-18-air-transport-economics.pdf
├── nig-cars-part-19-consumer-protection.pdf
├── nig-cars-part-20-safety-management.pdf
└── nig-cars-part-21-remotely-piloted-aircraft-system.pdf
```

## Step 3: Frontend Files (REQUIRED)

```
📁 js/                                ← Frontend JavaScript
├── pdf-select.js
└── questions.js

📁 styles/                            ← Frontend Stylesheets
├── pdf-upload.css
└── questions.css

📄 pdf-upload.html                    ← Upload/Quiz Builder page
📄 questions.html                     ← Quiz Results page
```

## Step 4: Root Configuration Files (REQUIRED)

```
📄 requirements.txt                   ← Core dependencies
📄 requirements-ml.txt                ← ML dependencies
```

## Step 5: Files to EXCLUDE (Don't Transfer)

```
❌ .venv/                             ← Virtual environment (will recreate)
❌ __pycache__/                       ← Python cache (will regenerate)
❌ *.pyc                              ← Compiled Python files
❌ .git/                              ← Git history (if any)
❌ .gitignore
❌ *.log                              ← Log files
❌ tmp-*.txt                          ← Temporary files
❌ startup-*.log                      ← Startup logs
```

---

# PART 2: FILES YOU NEED TO CREATE

## File 1: RUN_APP.bat (Windows Launcher - REQUIRED)

**Create file:** Place in root folder: `RUN_APP.bat`

```batch
@echo off
REM ============================================================
REM NCAA Regulatory Intelligence Platform
REM One-Click Desktop Launcher (Windows)
REM ============================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Colors and formatting
cls
echo.
echo ============================================================
echo   NCAA REGULATORY INTELLIGENCE PLATFORM
echo   Desktop Version 1.0
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    cls
    echo.
    echo ERROR: Python 3.11+ is not installed!
    echo.
    echo SOLUTION:
    echo 1. Download Python from: https://www.python.org/downloads/
    echo 2. Run the installer
    echo 3. IMPORTANT: Check "Add Python to PATH" during installation
    echo 4. Restart your computer
    echo 5. Try running this file again
    echo.
    pause
    exit /b 1
)

echo [OK] Python is installed
echo.
echo Setting up application...
echo.

REM Navigate to ml-question-generator
cd ml-question-generator

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    echo [OK] Virtual environment created
    echo.
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies (this may take 2-5 minutes first time)...
echo.
pip install -q -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.
echo ============================================================
echo   Starting NCAA Regulatory Intelligence Platform
echo ============================================================
echo.
echo Opening http://127.0.0.1:5000 in your browser...
echo.
echo To stop the app: Press Ctrl+C in this window
echo.
timeout /t 3 /nobreak

start http://127.0.0.1:5000/

REM Start Flask
python api.py

pause
```

---

## File 2: README.txt (Instructions - REQUIRED)

**Create file:** Place in root folder: `README.txt`

```
NCAA REGULATORY INTELLIGENCE PLATFORM
Desktop Version 1.0
======================================

WHAT IS THIS?
This is a desktop application for generating aviation regulatory quiz
questions and asking regulatory Q&A questions grounded in NCAA regulations.

QUICK START:
============
1. Extract this entire folder to your Desktop
2. Make sure Python 3.11+ is installed (see System Requirements below)
3. Double-click: RUN_APP.bat
4. Wait 3-5 minutes on first run (it's installing dependencies)
5. A browser window will open automatically
6. You're ready to use the app!

SYSTEM REQUIREMENTS:
====================
✓ Windows 10 or higher
✓ Python 3.11 or higher (FREE - download from python.org)
✓ Any web browser (Chrome, Firefox, Edge, Safari)
✓ 500 MB free disk space
✓ No internet required after first installation

INSTALLING PYTHON:
==================
If you don't have Python:

1. Go to: https://www.python.org/downloads/
2. Click "Download Python 3.11.x" (or higher)
3. Run the installer
4. IMPORTANT: Check the box "Add Python to PATH"
5. Click "Install Now"
6. Wait for it to finish
7. Restart your computer
8. Now run RUN_APP.bat

FEATURES:
=========
1. Quiz Builder (From Database)
   - Generate quiz questions from 21 NCAA regulatory documents
   - Multiple question types and difficulty levels

2. Ask Questions
   - Ask regulatory questions in plain English
   - Get answers grounded in actual NCAA regulations
   - See exact page references and citations

3. Question Generation
   - Upload your own PDFs
   - Generate custom quiz questions

HOW TO USE:
===========

FROM HOME PAGE:
- Click "Quiz Builder" to generate questions from NCAA documents
- Click "Ask a Question" to query the regulatory database

QUIZ BUILDER:
- Select a PDF from the dropdown (21 documents available)
- Click "Generate Questions"
- Questions will appear with 4 answer choices
- Select answers and see feedback

ASK A QUESTION:
- Type your regulatory question in plain English
- Example: "What conditions must be satisfied before aircraft return to service?"
- Click "Analyze Question"
- See the answer grounded in specific regulations with page numbers

TROUBLESHOOTING:
================

Q: "Python not found" error when I run RUN_APP.bat?
A: Install Python from https://www.python.org and check "Add to PATH"

Q: App takes forever to start first time?
A: Normal! It's downloading and installing dependencies (2-5 mins).
   Be patient and don't close the window.

Q: Port 5000 already in use?
A: Another app is using that port. Edit api.py and change:
   port=5000  →  port=5001

Q: Browser doesn't open automatically?
A: Manually go to http://127.0.0.1:5000 in your browser

Q: App crashes with error?
A: Look at the error message in the terminal window and note it down.
   Try running RUN_APP.bat again.

Q: How do I stop the app?
A: Press Ctrl+C in the terminal window (the black command window)

Q: Can I use it without internet?
A: Yes! Internet is only needed for first-time setup.
   After that, everything works offline.

Q: Where are the NCAA documents stored?
A: In the 'database/' folder. All 21 documents are included.

FEATURES IN DETAIL:
===================

NCAA DATABASE INCLUDED:
- Part 1: General Policies and Procedures
- Part 2: Personnel Licensing
- Part 3: Approved Training Organization
- Part 4: Aircraft Registration and Marking
- Part 5: Airworthiness
- Part 6: Approved Maintenance Organization
- Part 7: Instrument and Equipment
- Part 8: Operations
- Part 9: Air Operator Certification
- Part 10: Foreign Air Operator Commercial Air Transport
- Part 11: Aerial Work
- Part 12: Aerodrome Regulations (Vol I & II)
- Part 14: Air Navigation Services
- Part 15: Dangerous Goods Air Transport
- Part 16: Environmental Protection
- Part 17: Aviation Security
- Part 18: Air Transport Economics
- Part 19: Consumer Protection
- Part 20: Safety Management
- Part 21: Remotely Piloted Aircraft System
- Schedule of Fees and Charges

QUESTION TYPES:
- Understanding (Definitions)
- Responsibility (Who is responsible for?)
- Scenario (What if? / Conditional questions)
- Purpose (Why is this required?)
- Requirement (What must be done?)
- Critical Thinking (Application)

STOPPING THE APP:
=================
To stop the application:
1. Press Ctrl+C in the terminal window (the black command window)
2. Type 'y' and press Enter if prompted
3. The window will close

CONTACT & SUPPORT:
==================
Built with: Flask, Python, Sentence Transformers, FAISS
Version: 1.0 - Desktop Edition
Created: April 2026

NEXT STEPS:
===========
After using this app, you can:
1. Share it on a flash drive with colleagues
2. Upgrade to online version (contact developer)
3. Provide feedback on features

KEYBOARD SHORTCUTS:
===================
Ctrl+C      - Stop the app (in terminal)
Ctrl+L      - Clear browser address bar
Ctrl+R      - Refresh page (if something looks weird)
F12         - Open Developer Tools (advanced users)

ENJOY THE APP!
Questions? Feedback? Suggestions?
The app is designed to help aviation professionals
learn and understand regulations quickly and accurately.

Trust the process. ✈️
```

---

## File 3: INSTALL_INSTRUCTIONS.txt (Alternative - For Reference)

**Create file:** Place in root folder: `INSTALL_INSTRUCTIONS.txt`

```
STEP-BY-STEP INSTALLATION GUIDE
================================

If you prefer manual setup instead of clicking RUN_APP.bat:

STEP 1: Check Python Installation
==================================
1. Open Command Prompt (Windows Key + R, type "cmd", press Enter)
2. Type: python --version
3. You should see: Python 3.11.x (or higher)
   If you see "not found" or "not recognized", install Python first

STEP 2: Navigate to Project Folder
===================================
1. Open Command Prompt
2. Navigate to where you extracted this folder
   Example: cd Desktop\trivia-game-(V3)-(NCAA)
3. You should be in the folder with RUN_APP.bat

STEP 3: Enter ml-question-generator Folder
=============================================
cd ml-question-generator

STEP 4: Create Virtual Environment
===================================
python -m venv .venv

(This creates a .venv folder - wait for it to finish)

STEP 5: Activate Virtual Environment
=====================================
On Windows:
.venv\Scripts\activate

You should see (.venv) before your command prompt

STEP 6: Install Dependencies
=============================
pip install -r requirements.txt

(This takes 2-5 minutes. You'll see lots of text. That's normal.)

STEP 7: Start the App
=====================
python api.py

You should see:
 * Serving Flask app 'app'
 * Running on http://127.0.0.1:5000

STEP 8: Open Browser
====================
Open your web browser (Chrome, Firefox, Edge, Safari)
Go to: http://127.0.0.1:5000

You're done! The app is running.

TO STOP THE APP:
================
In the Command Prompt where the app is running:
Press: Ctrl+C
Type: y (if prompted)
Press: Enter

RUNNING IT AGAIN LATER:
=======================
1. Open Command Prompt
2. cd Desktop\trivia-game-(V3)-(NCAA)\ml-question-generator
3. .venv\Scripts\activate
4. python api.py
5. Open browser to http://127.0.0.1:5000

That's it! Much faster on subsequent runs (no dependency install needed).
```

---

# PART 3: HOW TO RUN & INSTALL

## For Person Receiving the App:

### EASIEST METHOD (Recommended):

```
1. Plug in flash drive
2. Copy entire folder to Desktop
3. Double-click: RUN_APP.bat
4. Wait 3-5 minutes (first time only)
5. Browser opens automatically to http://127.0.0.1:5000
6. DONE! 🚀
```

### WHAT THEY WILL SEE (First Run):

```
============================================================
  NCAA REGULATORY INTELLIGENCE PLATFORM
  Desktop Version 1.0
============================================================

[OK] Python is installed

Setting up application...

Creating Python virtual environment...
[OK] Virtual environment created

Installing dependencies (this may take 2-5 minutes first time)...

[OK] Dependencies installed

============================================================
  Starting NCAA Regulatory Intelligence Platform
============================================================

Opening http://127.0.0.1:5000 in your browser...

To stop the app: Press Ctrl+C in this window

(After 3 seconds, browser automatically opens)
```

### SUBSEQUENT RUNS (After First Install):

```
1. Double-click: RUN_APP.bat
2. Wait 10 seconds
3. Browser opens automatically
4. DONE! (Instant startup)
```

---

## Installation Checklist for Recipients:

```
☐ Python 3.11+ installed? (If not: https://www.python.org)
☐ Extracted folder to Desktop or Documents?
☐ Found RUN_APP.bat in the root folder?
☐ Double-clicked RUN_APP.bat?
☐ Waited for "Opening http://127.0.0.1:5000"?
☐ Browser window opened?
☐ Clicked on Quiz Builder or Ask a Question?
☐ App is working!
```

---

## SUMMARY TABLE

| Task                          | Duration | Difficulty |
| ----------------------------- | -------- | ---------- |
| Transfer files to flash drive | 15 mins  | Easy       |
| Install Python (if needed)    | 5 mins   | Easy       |
| Extract app from flash drive  | 2 mins   | Easy       |
| First-time setup              | 5 mins   | Easy       |
| Subsequent launches           | 10 secs  | Easy       |

---

## Quick Reference Card

```
╔════════════════════════════════════════════════════════════╗
║  NCAA REGULATORY INTELLIGENCE - QUICK REFERENCE          ║
╠════════════════════════════════════════════════════════════╣
║  TO START:     Double-click RUN_APP.bat                    ║
║  TO ACCESS:    http://127.0.0.1:5000                      ║
║  TO STOP:      Ctrl+C in terminal, press 'y'              ║
║  FEATURES:     Quiz Builder | Ask Questions               ║
║  OFFLINE:      Yes (after first install)                  ║
║  DATABASES:    21 NCAA documents                          ║
║  REQUIREMENT:  Python 3.11+ only                          ║
╚════════════════════════════════════════════════════════════╝
```

---

END OF GUIDE

**Created:** April 29, 2026
**Version:** 1.0 - Desktop Edition
**Status:** Ready for Distribution
