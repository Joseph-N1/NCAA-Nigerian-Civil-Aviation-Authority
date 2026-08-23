from flask import Flask, request, jsonify, redirect, render_template, send_from_directory
from flask_cors import CORS
import os
import tempfile
from main import extract_text_from_pdf, generate_questions_json
from core.catalog import get_document_catalog, get_document_record, load_indexed_document

# Lazy-load qa_engine which depends on ML libraries
try:
    from scripts.qa_engine import run_engine
    _qa_engine_available = True
except (ImportError, Exception) as e:
    _qa_engine_available = False
    run_engine = None
    print(f"Warning: qa_engine not available: {e}")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
FRONTEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def json_error(message, status_code, code=None):
    payload = {"error": message}
    if code:
        payload["code"] = code
    return jsonify(payload), status_code


def join_indexed_text(index_data):
    pages = index_data.get("pages") or []
    if pages:
        return "\n\n".join(page.get("text", "") for page in pages if page.get("text"))

    chunks = index_data.get("chunks") or []
    if chunks:
        return "\n\n".join(chunk.get("text", "") for chunk in chunks if chunk.get("text"))

    return ""


def generate_questions_from_document_record(record):
    index_data = load_indexed_document(record["doc_id"])

    if index_data:
        pages_data = index_data.get("pages") or []
        indexed_text = join_indexed_text(index_data)
        if not indexed_text.strip():
            return None, "Indexed content is empty. Rebuild the content index for this document.", "empty_index", 422

        sections = generate_questions_json(
            text=indexed_text,
            max_questions=40,
            section_size=5,
            pages_data=pages_data,
        )
        return sections, None, None, 200

    pdf_path = record.get("absolute_path")
    if not pdf_path or not os.path.isfile(pdf_path):
        return None, "The selected database document could not be found on disk.", "missing_file", 404

    try:
        text, pages_data = extract_text_from_pdf(pdf_path)
    except Exception as exc:
        return None, f"Unable to read the selected PDF: {exc}", "pdf_extract_failed", 500

    if not text.strip():
        return None, "The selected PDF did not produce any extractable text.", "empty_extract", 422

    sections = generate_questions_json(text, max_questions=40, section_size=5, pages_data=pages_data)
    return sections, None, None, 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/', methods=['GET'])
def frontend_home():
    return render_template('home.html')

@app.route('/quiz', methods=['GET'])
def quiz_home():
    return redirect('/pdf-upload.html')

@app.route('/ask', methods=['GET', 'POST'])
def ask_page():
    result = None
    error = None
    question = ''

    if request.method == 'POST':
        question = (request.form.get('question') or '').strip()
        if not question:
            error = 'Enter a regulatory question to analyze.'
        elif not _qa_engine_available or not run_engine:
            error = 'QA engine not available. Install ML dependencies with: pip install -r requirements-ml.txt'
        else:
            try:
                result = run_engine(question)
            except Exception as exc:
                error = f'Unable to analyze this question right now: {exc}'

    return render_template('index.html', result=result, question=question, error=error)

@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    if 'pdf' not in request.files:
        return json_error('No PDF uploaded.', 400, code='missing_upload')
    pdf_file = request.files['pdf']
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            temp_path = tmp.name
            pdf_file.save(temp_path)

        text, pages_data = extract_text_from_pdf(temp_path)
        if not text.strip():
            return json_error('The uploaded PDF did not produce any extractable text.', 422, code='empty_extract')

        questions = generate_questions_json(text, max_questions=40, section_size=5, pages_data=pages_data)
        if not questions or not any(section.get("questions") for section in questions):
            return json_error('No questions could be generated from this upload. Try a more content-rich PDF.', 422, code='zero_questions')

        return jsonify(questions)
    except Exception as exc:
        return json_error(f'Unable to generate questions from the uploaded PDF: {exc}', 500, code='quiz_generation_failed')
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

@app.route('/list-db-pdfs', methods=['GET'])
def list_db_pdfs():
    catalog = []
    for record in get_document_catalog(quiz_only=True):
        catalog.append({
            "doc_id": record["doc_id"],
            "title": record["title"],
            "document_family": record["document_family"],
            "document_family_label": record["document_family_label"],
            "relative_path": record["relative_path"],
            "regulatory_part": record["regulatory_part"],
            "quiz_enabled": record["quiz_enabled"],
            "indexed_at": record["indexed_at"],
            "stats": record.get("stats"),
        })
    return jsonify(catalog)

@app.route('/generate-questions-from-db', methods=['POST'])
def generate_questions_from_db():
    data = request.get_json(silent=True) or {}
    doc_id = (data.get("doc_id") or "").strip()
    pdf_name = data.get("pdf_name")

    if not doc_id and not pdf_name:
        return json_error('No database document was selected.', 400, code='missing_selection')

    record = get_document_record(doc_id=doc_id or None, pdf_name=pdf_name)
    if not record:
        return json_error('The selected database document was not found in the catalog.', 404, code='unknown_document')

    questions, error_message, error_code, status_code = generate_questions_from_document_record(record)
    if error_message:
        return json_error(error_message, status_code, code=error_code)

    if not questions or not any(section.get("questions") for section in questions):
        return json_error(
            'The selected document loaded successfully, but zero quiz questions were generated from its indexed content.',
            422,
            code='zero_questions',
        )

    return jsonify(questions)

@app.route('/<path:filename>', methods=['GET'])
def frontend_files(filename):
    return send_from_directory(FRONTEND_ROOT, filename)

if __name__ == '__main__':
    host = os.environ.get("FLASK_HOST", "127.0.0.1")
    port = int(os.environ.get("FLASK_PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug)
