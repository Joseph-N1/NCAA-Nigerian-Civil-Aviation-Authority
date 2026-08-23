// pdf-select.js - PDF selection page logic

const API_BASE = window.location.origin;

// Elements
const btnDatabase = document.getElementById('btn-database');
const btnUpload = document.getElementById('btn-upload');
const databaseSection = document.getElementById('database-section');
const uploadSection = document.getElementById('upload-section');
const dbSelect = document.getElementById('db-pdf');
const fileInput = document.getElementById('pdf-file');
const fileNameDisplay = document.getElementById('file-name');
const generateBtn = document.getElementById('generate-btn');
const statusMessage = document.getElementById('status-message');

let currentSource = 'database'; // 'database' or 'upload'

function normalizeDocumentEntry(entry) {
    if (typeof entry === 'string') {
        return {
            doc_id: entry.replace(/\.pdf$/i, ''),
            title: entry.replace(/-/g, ' ').replace(/\.pdf$/i, ''),
            document_family_label: 'Database PDF'
        };
    }

    return {
        doc_id: entry.doc_id,
        title: entry.title || entry.doc_id,
        document_family_label: entry.document_family_label || 'Database PDF',
        regulatory_part: entry.regulatory_part || ''
    };
}

// Load database PDFs on page load
async function loadDbPdfs() {
    try {
        const response = await fetch(`${API_BASE}/list-db-pdfs`);
        if (!response.ok) throw new Error('Failed to load database PDFs');
        const pdfs = (await response.json()).map(normalizeDocumentEntry);
        
        dbSelect.innerHTML = '';
        
        if (!pdfs.length) {
            dbSelect.innerHTML = '<option value="">No PDFs found in database</option>';
            return;
        }
        
        dbSelect.innerHTML = '<option value="">-- Select a PDF --</option>';
        for (const doc of pdfs) {
            const opt = document.createElement('option');
            opt.value = doc.doc_id;
            opt.dataset.title = doc.title;
            opt.dataset.familyLabel = doc.document_family_label;
            opt.textContent = `${doc.title} • ${doc.document_family_label}`;
            dbSelect.appendChild(opt);
        }
    } catch (err) {
        dbSelect.innerHTML = '<option value="">Error loading PDFs - Is the server running?</option>';
        statusMessage.textContent = 'Cannot connect to server. Make sure the backend is running.';
        statusMessage.className = 'status-error';
    }
}

// Toggle between database and upload
btnDatabase.addEventListener('click', () => {
    currentSource = 'database';
    btnDatabase.classList.add('active');
    btnUpload.classList.remove('active');
    databaseSection.classList.add('active');
    uploadSection.classList.remove('active');
    statusMessage.textContent = '';
});

btnUpload.addEventListener('click', () => {
    currentSource = 'upload';
    btnUpload.classList.add('active');
    btnDatabase.classList.remove('active');
    uploadSection.classList.add('active');
    databaseSection.classList.remove('active');
    statusMessage.textContent = '';
});

// File input display
fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name}`;
        fileNameDisplay.className = 'file-selected';
    } else {
        fileNameDisplay.textContent = '';
    }
});

// Generate button click
generateBtn.addEventListener('click', () => {
    if (currentSource === 'database') {
        if (!dbSelect.value) {
            statusMessage.textContent = 'Please select a PDF from the dropdown.';
            statusMessage.className = 'status-error';
            return;
        }
        const selectedOption = dbSelect.options[dbSelect.selectedIndex];
        const title = selectedOption.dataset.title || selectedOption.textContent || dbSelect.value;
        // Navigate to questions page with database document id
        window.location.href = `/questions.html?source=database&doc_id=${encodeURIComponent(dbSelect.value)}&title=${encodeURIComponent(title)}`;
    } else {
        if (!fileInput.files.length) {
            statusMessage.textContent = 'Please select a PDF file to upload.';
            statusMessage.className = 'status-error';
            return;
        }
        // Store file in sessionStorage and navigate
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        statusMessage.textContent = 'Preparing file...';
        statusMessage.className = 'status-loading';
        generateBtn.disabled = true;
        
        reader.onload = function(e) {
            try {
                sessionStorage.setItem('uploadedPdf', e.target.result);
                sessionStorage.setItem('uploadedPdfName', file.name);
                window.location.href = '/questions.html?source=upload';
            } catch (err) {
                statusMessage.textContent = 'File too large for browser storage. Try a smaller PDF.';
                statusMessage.className = 'status-error';
                generateBtn.disabled = false;
            }
        };
        
        reader.onerror = function() {
            statusMessage.textContent = 'Error reading file. Please try again.';
            statusMessage.className = 'status-error';
            generateBtn.disabled = false;
        };
        
        reader.readAsDataURL(file);
    }
});

// Initialize
loadDbPdfs();
