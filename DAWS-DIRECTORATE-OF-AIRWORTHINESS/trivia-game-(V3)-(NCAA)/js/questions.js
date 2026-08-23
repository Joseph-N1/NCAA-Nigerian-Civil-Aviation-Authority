// questions.js - Questions display and quiz logic

const API_BASE = window.location.origin;

// Elements
const quizTitle = document.getElementById('quiz-title');
const quizStats = document.getElementById('quiz-stats');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error-message');
const questionsContainer = document.getElementById('questions-container');
const resultsSection = document.getElementById('results-section');
const scoreDisplay = document.getElementById('score-display');
const retryBtn = document.getElementById('retry-btn');

// State
let allQuestions = [];
let userAnswers = {};
let quizSubmitted = false;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeAnswer(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim()
        .toLowerCase();
}

function getCorrectOptionIndex(question) {
    const correctKey = normalizeAnswer(question.correctAnswer);
    return question.options.findIndex(option => normalizeAnswer(option) === correctKey);
}

function renderHintPanel(question, index) {
    const hintDetails = question.hintDetails;

    if (hintDetails && typeof hintDetails === 'object') {
        const summary = escapeHtml(hintDetails.summary || question.hint || 'No hint available');
        const clues = Array.isArray(hintDetails.clues)
            ? hintDetails.clues.filter(Boolean).map(clue => `<li>${escapeHtml(clue)}</li>`).join('')
            : '';
        const keywords = Array.isArray(hintDetails.keywords)
            ? hintDetails.keywords.filter(Boolean).map(keyword => `<span class="hint-keyword">${escapeHtml(keyword)}</span>`).join('')
            : '';

        const meta = [];
        if (hintDetails.focus) {
            meta.push(`<span class="hint-chip"><strong>Focus:</strong> ${escapeHtml(hintDetails.focus)}</span>`);
        }
        if (hintDetails.sectionRef) {
            meta.push(`<span class="hint-chip"><strong>Section:</strong> ${escapeHtml(hintDetails.sectionRef)}</span>`);
        }
        if (hintDetails.pageRef) {
            meta.push(`<span class="hint-chip"><strong>Page:</strong> ${escapeHtml(`Page ${hintDetails.pageRef}`)}</span>`);
        }

        return `
            <div class="hint-text hint-card" id="hint-${index}" style="display: none;">
                <div class="hint-label">Study Clue</div>
                <div class="hint-summary">${summary}</div>
                ${clues ? `<ul class="hint-clue-list">${clues}</ul>` : ''}
                ${keywords ? `<div class="hint-keywords">${keywords}</div>` : ''}
                ${meta.length ? `<div class="hint-meta">${meta.join('')}</div>` : ''}
                ${hintDetails.referenceNote ? `<div class="hint-reference-note">${escapeHtml(hintDetails.referenceNote)}</div>` : ''}
            </div>
        `;
    }

    return `<div class="hint-text" id="hint-${index}" style="display: none;">${escapeHtml(question.hint || 'No hint available')}</div>`;
}

// Parse URL params
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        source: params.get('source'),
        pdf: params.get('pdf'),
        docId: params.get('doc_id') || params.get('doc'),
        title: params.get('title')
    };
}

// Show error
function showError(message) {
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `
        <h3>Error</h3>
        <p>${message}</p>
        <a href="/quiz" class="back-link">← Go back and try again</a>
        <a href="/" class="back-link">Home</a>
    `;
}

// Generate questions from API
async function generateQuestions() {
    const { source, pdf, docId, title } = getUrlParams();
    
    if (!source) {
        showError('No PDF source specified. Please go back and select a PDF.');
        return;
    }
    
    try {
        let response;
        let pdfName = '';
        
        if (source === 'database') {
            if (!docId && !pdf) {
                showError('No database document was selected.');
                return;
            }
            pdfName = title || pdf || docId;
            quizTitle.textContent = `Generating questions from: ${pdfName}`;
            
            response = await fetch(`${API_BASE}/generate-questions-from-db`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doc_id: docId,
                    pdf_name: pdf
                })
            });
        } else if (source === 'upload') {
            const pdfData = sessionStorage.getItem('uploadedPdf');
            pdfName = sessionStorage.getItem('uploadedPdfName') || 'Uploaded PDF';
            
            if (!pdfData) {
                showError('No uploaded PDF found. Please go back and upload a file.');
                return;
            }
            
            quizTitle.textContent = `Generating questions from: ${pdfName}`;
            
            // Convert base64 back to blob
            const base64Response = await fetch(pdfData);
            const blob = await base64Response.blob();
            
            const formData = new FormData();
            formData.append('pdf', blob, pdfName);
            
            response = await fetch(`${API_BASE}/generate-questions`, {
                method: 'POST',
                body: formData
            });
            
            // Clear session storage
            sessionStorage.removeItem('uploadedPdf');
            sessionStorage.removeItem('uploadedPdfName');
        }
        
        if (!response.ok) {
            let message = 'The server could not generate quiz questions for this document.';
            try {
                const errorPayload = await response.json();
                message = errorPayload.error || message;
            } catch (_err) {
                const errorText = await response.text();
                if (errorText) {
                    message = errorText;
                }
            }
            throw new Error(message);
        }
        
        const sections = await response.json();
        
        if (!sections || !sections.length) {
            showError('No questions could be generated from this PDF. Try a different document.');
            return;
        }
        
        // Flatten all questions
        allQuestions = [];
        for (const section of sections) {
            for (const q of section.questions) {
                allQuestions.push(q);
            }
        }
        
        // Display questions
        displayQuestions(pdfName);
        
    } catch (err) {
        showError(`Failed to generate questions: ${err.message}`);
    }
}

// Display questions
function displayQuestions(pdfName) {
    loadingDiv.style.display = 'none';
    
    quizTitle.textContent = pdfName;
    quizStats.innerHTML = `<span class="total-questions">${allQuestions.length} Questions</span>`;
    
    questionsContainer.innerHTML = '';
    
    allQuestions.forEach((q, index) => {
        const questionEl = document.createElement('div');
        questionEl.className = 'question-card';
        questionEl.dataset.questionIndex = index;
        
        const difficultyClass = q.difficulty || 'medium';
        
        questionEl.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${index + 1}</span>
                <span class="difficulty-badge ${escapeHtml(difficultyClass)}">${escapeHtml(difficultyClass)}</span>
            </div>
            <div class="question-text">${escapeHtml(q.question)}</div>
            <div class="options-container">
                ${q.options.map((opt, i) => `
                    <div class="option" data-question="${index}" data-option="${i}">
                        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="option-text">${escapeHtml(opt)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="question-feedback" style="display: none;"></div>
            <div class="question-hint">
                <button class="hint-btn" onclick="toggleHint(${index})">Show Hint</button>
                ${renderHintPanel(q, index)}
            </div>
        `;
        
        questionsContainer.appendChild(questionEl);
    });
    
    // Add submit button
    const submitBtn = document.createElement('button');
    submitBtn.id = 'submit-quiz';
    submitBtn.className = 'submit-btn';
    submitBtn.textContent = 'Submit Answers';
    submitBtn.onclick = submitQuiz;
    questionsContainer.appendChild(submitBtn);
    
    // Add click handlers to options
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', handleOptionClick);
    });
}

// Handle option click
function handleOptionClick(e) {
    if (quizSubmitted) return;
    
    const option = e.currentTarget;
    const questionIndex = parseInt(option.dataset.question);
    const optionIndex = parseInt(option.dataset.option);
    
    // Remove selected class from siblings
    const siblings = document.querySelectorAll(`.option[data-question="${questionIndex}"]`);
    siblings.forEach(sib => sib.classList.remove('selected'));
    
    // Add selected class to clicked option
    option.classList.add('selected');
    
    // Store answer
    userAnswers[questionIndex] = optionIndex;
    
    // Update progress
    updateProgress();
}

// Update progress indicator
function updateProgress() {
    const answered = Object.keys(userAnswers).length;
    const total = allQuestions.length;
    quizStats.innerHTML = `
        <span class="progress-text">${answered} of ${total} answered</span>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${(answered / total) * 100}%"></div>
        </div>
    `;
}

// Toggle hint visibility
window.toggleHint = function(index) {
    const hintEl = document.getElementById(`hint-${index}`);
    const btn = hintEl.previousElementSibling;
    if (hintEl.style.display === 'none') {
        hintEl.style.display = 'block';
        btn.textContent = 'Hide Hint';
    } else {
        hintEl.style.display = 'none';
        btn.textContent = 'Show Hint';
    }
};

// Submit quiz
function submitQuiz() {
    if (Object.keys(userAnswers).length < allQuestions.length) {
        if (!confirm(`You've answered ${Object.keys(userAnswers).length} of ${allQuestions.length} questions. Submit anyway?`)) {
            return;
        }
    }
    
    quizSubmitted = true;
    let correct = 0;
    
    allQuestions.forEach((q, index) => {
        const questionCard = document.querySelector(`.question-card[data-question-index="${index}"]`);
        const options = questionCard.querySelectorAll('.option');
        const feedback = questionCard.querySelector('.question-feedback');
        
        const correctOptionIndex = getCorrectOptionIndex(q);
        const userAnswerIndex = userAnswers[index];
        
        options.forEach((opt, i) => {
            opt.classList.remove('selected');
            if (i === correctOptionIndex) {
                opt.classList.add('correct');
            } else if (i === userAnswerIndex && userAnswerIndex !== correctOptionIndex) {
                opt.classList.add('incorrect');
            }
        });
        
        // Build explanation HTML with page reference
        const explanation = q.explanation || q.funFact || 'Review this concept for better understanding.';
        const pageRef = q.pdfReference || q.pageRef;
        const correctAnswerText = correctOptionIndex >= 0 ? q.options[correctOptionIndex] : q.correctAnswer;
        
        let explanationHtml = `
            <div class="explanation-section">
                <div class="explanation-header">📚 Explanation</div>
                <div class="explanation-text">${escapeHtml(explanation)}</div>
                <div class="correct-answer-text"><strong>Correct Answer:</strong> ${escapeHtml(correctAnswerText)}</div>
                ${pageRef ? `<div class="page-reference">📄 Reference: ${escapeHtml(pageRef)}</div>` : ''}
            </div>
        `;
        
        if (userAnswerIndex === correctOptionIndex) {
            correct++;
            feedback.innerHTML = `
                <span class="feedback-correct">✓ Correct!</span>
                ${explanationHtml}
            `;
            feedback.className = 'question-feedback correct';
        } else if (userAnswerIndex !== undefined) {
            feedback.innerHTML = `
                <span class="feedback-incorrect">✗ Incorrect</span>
                ${explanationHtml}
            `;
            feedback.className = 'question-feedback incorrect';
        } else {
            feedback.innerHTML = `
                <span class="feedback-skipped">○ Not answered</span>
                ${explanationHtml}
            `;
            feedback.className = 'question-feedback skipped';
        }
        feedback.style.display = 'block';
    });
    
    // Update submit button
    const submitBtn = document.getElementById('submit-quiz');
    submitBtn.style.display = 'none';
    
    // Show results
    const percentage = Math.round((correct / allQuestions.length) * 100);
    resultsSection.style.display = 'block';
    
    let gradeClass = 'grade-fail';
    let gradeText = 'Keep studying!';
    if (percentage >= 90) {
        gradeClass = 'grade-excellent';
        gradeText = 'Excellent!';
    } else if (percentage >= 70) {
        gradeClass = 'grade-good';
        gradeText = 'Good job!';
    } else if (percentage >= 50) {
        gradeClass = 'grade-pass';
        gradeText = 'Passed!';
    }
    
    scoreDisplay.innerHTML = `
        <div class="score-circle ${gradeClass}">
            <span class="score-percentage">${percentage}%</span>
        </div>
        <div class="score-details">
            <span class="grade-text">${gradeText}</span>
            <span class="score-breakdown">${correct} correct out of ${allQuestions.length}</span>
        </div>
    `;
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Retry quiz
retryBtn.addEventListener('click', () => {
    userAnswers = {};
    quizSubmitted = false;
    resultsSection.style.display = 'none';
    
    // Reset all options
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
    });
    
    // Hide all feedback
    document.querySelectorAll('.question-feedback').forEach(fb => {
        fb.style.display = 'none';
    });
    
    // Show submit button
    document.getElementById('submit-quiz').style.display = 'block';
    
    // Reset progress
    updateProgress();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Initialize
generateQuestions();
