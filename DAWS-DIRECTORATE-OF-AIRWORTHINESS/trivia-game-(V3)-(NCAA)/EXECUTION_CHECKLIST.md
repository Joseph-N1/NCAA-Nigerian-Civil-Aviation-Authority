# NCAA Trivia App - Execution Checklist (Outside Sandbox)

**Date:** 4/17/2026  
**Status:** Ready to Execute  
**Environment:** Local Machine (Windows 10/11 PowerShell)

---

## 🎯 Quick Execution Plan

Run these commands **IN YOUR LOCAL TERMINAL** (not in VS Code sandbox). Copy-paste each section in order.

---

## ✅ STEP 1: Install Missing Dependencies

**Run in PowerShell:**

```powershell
cd 'c:\Users\Joseph N Nimyel\OneDrive\Documents\Mimo Projects\Trivia\trivia-game-(V3)-(NCAA)\ml-question-generator'
pip install flask-cors faiss-cpu
```

**Expected Output:**

```
Collecting flask-cors
  Downloading flask_cors-...
Installing collected packages: flask-cors, faiss-cpu
Successfully installed flask-cors-... faiss-cpu-...
```

**⏱️ Time:** 2-5 minutes (depends on internet and faiss-cpu compilation)

**✓ Verified When:** No error messages, both packages show "Successfully installed"

---

## ✅ STEP 2: Start Flask Backend

**In your current PowerShell terminal:**

```powershell
# Make sure you're in the right directory
cd 'c:\Users\Joseph N Nimyel\OneDrive\Documents\Mimo Projects\Trivia\trivia-game-(V3)-(NCAA)\ml-question-generator'

# If not already activated, activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start the Flask server
python api.py
```

**Expected Output:**

```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit
```

**⏱️ Time:** < 3 seconds startup

**✓ Verified When:** You see "Running on http://127.0.0.1:5000" message

**❌ DO NOT proceed to next step until this shows successfully!**

---

## ✅ STEP 3: Health Check (New Terminal)

**⚠️ IMPORTANT: Open a SECOND PowerShell terminal while Step 2 is still running**

**In your NEW PowerShell terminal:**

```powershell
# Test the health endpoint
Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -Method GET

# Alternative (simpler):
curl http://127.0.0.1:5000/health
```

**Expected Output:**

```
StatusCode        : 200
StatusDescription : OK
```

**✓ Verified When:** Status code shows 200

**❌ If you get "Connection refused":**

- Check if backend is still running in terminal from Step 2
- Verify port 5000 is not in use: `netstat -ano | findstr :5000`
- Try again after 5 seconds

---

## ✅ STEP 4: Open Frontend in Browser

**In your web browser:**

```
http://127.0.0.1:5000/
```

**Expected to see:**

- [ ] NCAA Intelligence branding/logo at top
- [ ] "Quiz Builder" button/link
- [ ] "Q&A Regulatory Questions" button/link
- [ ] Professional styling (not blank white page)
- [ ] No red error messages

**Verify in Browser DevTools (F12 → Console tab):**

- [ ] No JavaScript errors
- [ ] No red warnings
- [ ] Status: "Console clean"

**✓ Verified When:** Page loads without errors

---

## ✅ STEP 5: Test NCAA Database Quiz (Feature 1)

**In browser, follow these steps:**

### 5A. Navigate to Quiz Builder

```
Click: "Quiz Builder" button on home page
Expected: Redirects to quiz selection page
```

### 5B. Select DATABASE Tab

```
Verify: "DATABASE" tab is active/highlighted
Expected: See list of NCAA PDF documents
```

### 5C. Select a PDF

```
Click: "nig-cars-part-2-personnel-licensing" (or any PDF)
Expected: Document selected (highlighted or shown)
```

### 5D. Generate Quiz

```
Click: "Generate Quiz" button
Expected: Loading spinner/message appears
Estimated wait: 3-8 seconds
```

### 5E. Answer Questions

```
Verify: Questions appear with:
  - Question text
  - Multiple choice options (A, B, C, D)
  - Submit button

Answer: 3+ questions by clicking options
Click: Submit after each question
Expected: Score updates per question
```

**✓ Verified When:**

- [ ] Questions display correctly
- [ ] Answers register and score updates
- [ ] No errors in browser console
- [ ] Scoring logic works (score increments on correct answers)

---

## ✅ STEP 6: Test PDF Upload (Feature 2)

**In browser:**

### 6A. Navigate to Quiz Builder

```
Click: "Quiz Builder"
Expected: On quiz selection page
```

### 6B. Switch to UPLOAD Tab

```
Click: "UPLOAD" tab
Expected: File upload interface appears with:
  - "Choose File" button
  - Or drag-drop zone
```

### 6C. Upload PDF

```
Click: "Choose File" button
Select: Any PDF from c:\Users\Joseph N Nimyel\OneDrive\Documents\Mimo Projects\Trivia\trivia-game-(V3)-(NCAA)\database\
  (e.g., nig-cars-part-1-general-policies-procedures-and-definitions.pdf)
Click: Upload/Generate
Expected: Loading spinner
Estimated wait: 5-10 seconds
```

### 6D. Verify Generated Questions

```
Expected: Questions generate from your uploaded PDF
          Questions should match PDF content
Verify: Multiple choice answers are contextually relevant
```

**✓ Verified When:**

- [ ] PDF uploads successfully
- [ ] Questions generate from uploaded content
- [ ] No "Invalid file" or crash messages
- [ ] Scoring works on generated questions

---

## ✅ STEP 7: Test Q&A Interface (Feature 3)

**In browser:**

### 7A. Navigate to Q&A

```
Click: "Q&A Regulatory Questions" (or similar link on home page)
Expected: Redirects to Q&A interface page
```

### 7B. Verify Input Field

```
Expected: Text input field for asking questions
          "Ask a regulatory question..." placeholder text
```

### 7C. Ask First Question (In-Scope)

```
Type: "What is the minimum experience for a commercial pilot?"
Press: Enter or click "Ask" button
Wait: 3-5 seconds for response
Expected: Answer appears referencing NCAA regulations
          Answer mentions specific parts/requirements
```

### 7D. Ask Second Question (In-Scope)

```
Type: "What are the requirements for aerodrome certification?"
Press: Enter
Wait: 3-5 seconds
Expected: Relevant answer from regulatory database
```

### 7E. Ask Boundary Question (Out-of-Scope)

```
Type: "What is the capital of France?"
Press: Enter
Expected: Graceful response like "This is outside NCAA scope"
          OR generic "I'm not sure" message
          NOT a crash or error
```

**✓ Verified When:**

- [ ] Input field accepts text
- [ ] In-scope questions return relevant answers
- [ ] Out-of-scope questions handled gracefully
- [ ] Response times < 10 seconds
- [ ] No console errors

---

## ✅ STEP 8: API Verification (Optional - Advanced)

**In your PowerShell terminal (not in the backend terminal):**

```powershell
# Test getting list of PDFs
curl http://127.0.0.1:5000/list-db-pdfs

# Test home page
curl http://127.0.0.1:5000/

# Test quiz route
curl http://127.0.0.1:5000/quiz

# Test Q&A page
curl http://127.0.0.1:5000/ask
```

**Expected:** All return 200 status with HTML/JSON content

---

## 🎯 Success Criteria

You've successfully completed testing when ALL of these are ✅:

```
✅ Backend starts without errors
✅ /health endpoint returns 200
✅ Frontend home page loads at http://127.0.0.1:5000
✅ No JavaScript console errors
✅ NCAA database quiz: Select PDF → Generate → Answer 3 questions
✅ PDF upload: Upload → Generate → Answer questions
✅ Q&A interface: Ask 2 in-scope + 1 out-of-scope question
✅ All navigation links work
✅ Scoring system updates correctly
✅ Error handling shows graceful messages (no white-screen crashes)
```

If ALL above are ✅, your app is **FULLY FUNCTIONAL** ✅✅✅

---

## ⚠️ Troubleshooting

| Problem                           | Solution                                                        |
| --------------------------------- | --------------------------------------------------------------- |
| `Connection refused` on /health   | Backend not running - check Step 2 terminal                     |
| `ModuleNotFoundError: flask_cors` | Step 1 failed - re-run: `pip install flask-cors faiss-cpu`      |
| Page shows blank/white            | Browser cache issue - try Ctrl+Shift+Delete cache, then refresh |
| Questions take > 15 sec           | Normal on first run; check backend terminal for errors          |
| PDF upload rejected               | Try with PDFs from `/database/` folder first                    |
| Q&A returns generic answer        | Question may be out-of-scope; try in-scope test questions       |

---

## 📝 Issue Log

**Found any bugs or issues?** Note them here:

```
Date:
Issue:
Severity (Critical/Major/Minor):
Steps to Reproduce:
Expected:
Actual:
Backend Console Output:
Browser Console Error:
```

---

## ⏹️ When Done

To **stop the Flask backend**, go back to the terminal running `python api.py` and press:

```
CTRL+C
```

Expected output:

```
KeyboardInterrupt
Shutting down...
```

---

## 📚 Reference Documents

- **TESTING_GUIDE.md** — Detailed testing procedures & API documentation
- **PROJECT_READINESS.md** — Full project status & architecture
- **Filetree Pro.md** — Project file structure
- This file: **EXECUTION_CHECKLIST.md** — Step-by-step execution guide

---

**Ready? Start with Step 1 in your local terminal!**
