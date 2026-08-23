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
