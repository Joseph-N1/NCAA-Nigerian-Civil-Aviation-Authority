# NCAA Trivia App - Testing & Deployment Guide

**Last Updated:** 4/17/2026  
**Status:** Ready for backend startup and full end-to-end testing

---

## Quick Start (Run Outside Sandbox)

### Step 1: Install Missing Dependencies

```powershell
cd 'c:\Users\Joseph N Nimyel\OneDrive\Documents\Mimo Projects\Trivia\trivia-game-(V3)-(NCAA)\ml-question-generator'
pip install flask-cors faiss-cpu
```

### Step 2: Start Flask Backend

```powershell
# Make sure virtual environment is activated
.\.venv\Scripts\Activate.ps1

# Start the Flask server (runs on http://127.0.0.1:5000)
python api.py
```

**Expected Output:**

```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit
```

---

## Step 3: Health Check

In a **separate PowerShell terminal**, verify the backend is running:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -Method GET

# Expected response: Status 200 with health OK message
```

Or in browser DevTools console:

```javascript
fetch("http://127.0.0.1:5000/health")
  .then((r) => r.json())
  .then(console.log);
```

---

## Step 4: Access Frontend

1. **Open browser** and navigate to: `http://127.0.0.1:5000/`
2. **Expected to see:**
   - NCAA Intelligence branding/logo
   - "Quiz Builder" button/link
   - "Q&A Regulatory Questions" button/link
   - Navigation intact
   - No JavaScript errors (check DevTools F12 → Console)

---

## Full End-to-End Testing Checklist

### Feature 1: NCAA Database Quiz Generation

**Path:** Home → Quiz Builder → DATABASE tab

#### Test Steps:

1. Click "Quiz Builder"
2. Verify "DATABASE" tab is selected (shows all NCAA PDFs)
3. Select a PDF (e.g., "Part 2 - Personnel Licensing")
4. Click "Generate Quiz"
5. Wait for questions to load (typically 3-8 seconds)
6. **Verify:**
   - [ ] Questions display with numbering (Q1, Q2, etc.)
   - [ ] Multiple choice options (A, B, C, D)
   - [ ] "Submit Answer" button works
   - [ ] Score counter updates after each answer
   - [ ] Progress bar shows current question/total
7. Answer 5+ questions to validate scoring logic
8. **Check for errors:**
   - No console errors (F12 → Console tab)
   - No 500 errors in network tab (F12 → Network tab)
   - Response times < 10 seconds per question generation

---

### Feature 2: PDF Upload & Custom Quiz Generation

**Path:** Home → Quiz Builder → UPLOAD tab

#### Test Steps:

1. Click "Quiz Builder"
2. Click "UPLOAD" tab
3. Upload a PDF file (sample PDFs in `/database/` folder)
4. Click "Generate Quiz"
5. Wait for processing
6. **Verify:**
   - [ ] Questions generate from uploaded PDF content
   - [ ] Questions are relevant to the PDF topic
   - [ ] Multiple choice answers are contextually appropriate
   - [ ] Scoring works correctly
7. **Test error handling:**
   - Try uploading a non-PDF file (TXT, image, etc.)
   - Verify graceful error message (not blank page or crash)
   - Try uploading a very large PDF (>100MB) — check timeout handling

---

### Feature 3: Regulatory Q&A Interface

**Path:** Home → Q&A Regulatory Questions

#### Test Steps:

1. Click "Q&A Regulatory Questions"
2. You should see a text input field for asking questions
3. Ask sample regulatory questions:
   - "What is the minimum experience for a commercial pilot?"
   - "What are the requirements for aerodrome certification?"
   - "What does RPAS stand for?"
4. Submit question and wait for response
5. **Verify:**
   - [ ] Response appears in a reasonable time (<5 seconds)
   - [ ] Answer references specific NCAA parts/regulations
   - [ ] Answer is contextually relevant to the question
   - [ ] No "I don't know" or blank responses for in-scope questions
6. **Test out-of-scope questions:**
   - Ask: "What is the capital of France?" (non-regulatory)
   - Verify: Graceful response or "not in scope" message
7. Ask multiple consecutive questions:
   - Verify: No state conflicts between sessions
   - Verify: Response quality remains consistent

---

## API Endpoint Testing (cURL / Postman)

### Test All Core Endpoints:

```powershell
# 1. Health Check
curl -X GET http://127.0.0.1:5000/health

# 2. Home Page (should render HTML)
curl -X GET http://127.0.0.1:5000/

# 3. List Database PDFs
curl -X GET http://127.0.0.1:5000/list-db-pdfs

# 4. Quiz Page
curl -X GET http://127.0.0.1:5000/quiz

# 5. Q&A Page
curl -X GET http://127.0.0.1:5000/ask

# 6. Generate Questions from Database (POST)
curl -X POST http://127.0.0.1:5000/generate-questions-from-db `
  -H "Content-Type: application/json" `
  -d '{"doc_id":"nig-cars-part-2-personnel-licensing","num_questions":5}'

# 7. Generate Questions from Uploaded PDF (POST with file)
curl -X POST http://127.0.0.1:5000/generate-questions `
  -F "pdf=@C:\path\to\sample.pdf" `
  -F "num_questions=5"
```

---

## Troubleshooting

### Issue: "Connection Refused" on http://127.0.0.1:5000

- **Cause:** Backend not running or different port
- **Fix:** Verify `python api.py` is running; check if port 5000 is in use
  ```powershell
  netstat -ano | findstr :5000
  ```
- **Solution:** Kill existing process or change port in `api.py`

### Issue: CORS Errors in Browser Console

- **Cause:** Flask-CORS not properly configured
- **Fix:** Ensure `flask-cors` is installed: `pip install flask-cors`
- **Verify:** Backend should show CORS enabled in startup logs

### Issue: Questions take > 15 seconds to generate

- **Cause:** ML pipeline performance or first-run vector index building
- **Fix:** Normal for first run; subsequent requests should be faster
- **Check:** Backend console for warnings or errors

### Issue: PDF Upload Shows "Invalid File"

- **Cause:** File format or PDF corruption
- **Fix:** Try with PDFs from `/database/` folder first to validate flow
- **Verify:** File is actual PDF (not renamed), < 50MB recommended

### Issue: Q&A Returns Generic/Unhelpful Answers

- **Cause:** Query outside NCAA regulations scope or RAG pipeline issue
- **Fix:** Test with in-scope questions first (e.g., "What is Part 2?")
- **Check:** Vector index is built (`ml-question-generator/vector_index/` folder has content)

---

## Performance Metrics to Track

| Metric               | Expected | Warning    | Critical |
| -------------------- | -------- | ---------- | -------- |
| Backend startup time | < 3 sec  | 3-5 sec    | > 5 sec  |
| Question generation  | 3-8 sec  | 8-15 sec   | > 15 sec |
| Q&A response time    | < 5 sec  | 5-10 sec   | > 10 sec |
| Page load time       | < 1 sec  | 1-2 sec    | > 2 sec  |
| Memory usage         | < 500 MB | 500-800 MB | > 800 MB |

---

## Success Criteria (Full Testing Complete When)

✅ Backend starts without errors  
✅ `/health` endpoint returns 200  
✅ Frontend home page loads and renders correctly  
✅ NCAA database quiz: Generate & answer 5+ questions successfully  
✅ PDF upload quiz: Upload PDF & generate questions  
✅ Q&A interface: Get relevant regulatory answers  
✅ All navigation links work  
✅ No JavaScript console errors  
✅ No Python backend errors in console  
✅ Error handling displays gracefully (no white-screen crashes)

---

## Next Steps After Testing

1. **Log Issues Found:** Document any bugs, performance issues, or UX improvements
2. **Performance Tuning:** Identify bottlenecks (question generation, vector search, etc.)
3. **Feature Validation:** Confirm all three modules work as expected
4. **Cleanup:** Remove temporary log files (`tmp-*.txt`) if no longer needed
5. **Final Deployment:** Prepare release notes and deployment checklist

---

## Important Files Reference

- **Backend Entry:** `ml-question-generator/api.py`
- **Frontend (Home):** `ml-question-generator/templates/home.html`
- **Frontend (Q&A):** `ml-question-generator/templates/index.html`
- **Frontend (Quiz):** `pdf-upload.html`, `questions.html`
- **ML Core:** `ml-question-generator/core/` (extraction, NLP, RAG)
- **Vector Index:** `ml-question-generator/vector_index/` (pre-built FAISS indexes)
- **Database PDFs:** `database/` (21 NCAA regulation documents)
- **Config:** `requirements.txt`, `requirements-ml.txt`

---

**Questions or Issues?** Check backend console output and browser DevTools (F12) for detailed error messages.
