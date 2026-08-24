# AI Build Brief

Use this as a starter prompt when you want an AI coding tool to implement the project.

## Prompt

Build an internal aircraft registration registry prototype for NCAA DAWS.

Use the documents in this workspace as the source of truth:

- `docs/PRD.md`
- `docs/app-flow.md`
- `docs/design-doc.md`
- `docs/backend-doc.md`
- `docs/security-checklist.md`
- `docs/demo-plan.md`

Implementation goals:

1. Build a demo-first internal application that shows the final product vision.
2. Pre-generate all registration suffixes from `AAA` to `ZZZ` and display them as `5N-<suffix>`.
3. Show each mark as `Available`, `Assigned`, or `Reserved`.
4. If a mark was used before and is now available again, keep it `Available` but show `Previously Used` plus prior owner history.
5. Support dashboard metrics, mark search, registry filters, a guided C of R upload review screen, and an inspector assistant for approved factual queries.
6. Keep the assistant grounded in structured data only. Do not allow free-form guessed answers.
7. Prioritize desktop usability and Excel-to-application familiarity.
8. Keep auditability and human confirmation in mind, especially for OCR-assisted capture.

Technical direction:

- For the demo, use Streamlit + Pandas.
- For production recommendations, target React + FastAPI + PostgreSQL, but do not overbuild the demo.

Expected demo screens:

- Dashboard
- Registration Search
- Registry Table
- C of R Upload Review
- Inspector Assistant

Expected delivery style:

- Clear internal admin UI
- Sample data allowed for demo
- Real search and count behavior
- OCR and notifications may be mocked if clearly labeled

Constraints:

- Accuracy is more important than speed
- Do not auto-save extracted document data without review
- Do not remove historical ownership when a mark becomes reusable
- Keep the system suitable for internal-only deployment first

Definition of done for the demo:

- The app runs locally
- A reviewer can search active and reusable marks
- The registry table clearly demonstrates full mark coverage
- The assistant can answer a small set of approved inspector questions
- The upload workflow shows extraction preview and confirmation before save
