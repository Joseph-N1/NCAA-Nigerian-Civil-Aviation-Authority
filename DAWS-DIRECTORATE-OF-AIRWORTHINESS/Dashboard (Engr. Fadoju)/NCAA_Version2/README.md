# NCAA Aircraft Registry Upgrade Starter Pack

This workspace is set up to help you move quickly from planning to a boss-ready demo.

The key decision in this starter pack is to separate:

- `Demo now`: a believable internal prototype you can show on Wednesday, April 22, 2026 or Thursday, April 23, 2026.
- `Production later`: the fuller system with stronger backend architecture, OCR hardening, audit trails, notifications, and role-based access.

## What is included

- A tightened PRD in [docs/PRD.md](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/docs/PRD.md)
- A visual app flow in [docs/app-flow.md](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/docs/app-flow.md)
- Frontend guidance in [docs/design-doc.md](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/docs/design-doc.md)
- Backend tech stack and schema/API structure in [docs/backend-doc.md](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/docs/backend-doc.md)
- A deployment checklist in [docs/security-checklist.md](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/docs/security-checklist.md)
- A demo build and presentation guide in [docs/demo-plan.md](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/docs/demo-plan.md)
- A simple prototype app in [demo_app.py](/C:/Users/Joseph%20N%20Nimyel/Documents/Codex/2026-04-19-please-feel-free-to-make-any/demo_app.py)

## Recommended demo path

For the demo, use:

- Python
- Streamlit
- Pandas
- Generated sample data

This is the fastest way to show:

- All registration marks from `AAA` to `ZZZ`
- Availability and prior use
- Search and filters
- Dashboard counts
- Mocked C of R upload review
- A controlled inspector assistant that answers from the dataset

For production, the docs recommend:

- React frontend
- FastAPI backend
- PostgreSQL database

## Quick start

1. Install Python 3.11+ if it is not already available on your machine.
2. Create a virtual environment.
3. Install dependencies:

```powershell
pip install -r requirements.txt
```

4. Run the demo:

```powershell
streamlit run demo_app.py
```

## Suggested talking point for your boss

"This demo is intentionally lightweight on infrastructure, but it already shows the future workflow: full registration inventory, history-aware reuse of marks, faster search, guided C of R capture, and instant inspector answers from structured data."

## Next steps after review

1. Replace sample data with a cleaned extract from the current Excel file.
2. Add real import flow from Excel into the registry tables.
3. Upgrade the upload page from mocked extraction to a real OCR review pipeline.
4. Replace the rule-based assistant with a SQL-backed analytics assistant.
5. Add authentication, approvals, audit logging, and notification workflows.
