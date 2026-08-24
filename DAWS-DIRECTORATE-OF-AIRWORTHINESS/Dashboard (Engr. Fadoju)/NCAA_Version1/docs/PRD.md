# Product Requirements Document

## Project

**Name:** NCAA Aircraft Registry Upgrade System  
**Department:** DAWS, NCAA  
**Primary outcome:** Replace a static Excel-style registry with a searchable, history-aware aircraft registration system.

## Summary

The current registration workflow relies on Excel files plus physical records. That makes assignment, reuse tracking, and inspector reporting slower than they need to be. The new system should create one master registry for every possible registration suffix from `AAA` to `ZZZ`, show which marks are available or assigned, preserve historical ownership, and support document-assisted data entry and fact-based inspector queries.

The full registration shown to staff should be `5N-<suffix>`, while the system internally stores the three-letter suffix and derives the display form.

## Problem Statement

Current pain points:

- Registration data is spread across Excel and physical files.
- Available marks are not visible from a single source of truth.
- Older marks may have been released or deregistered, but reuse readiness is not clearly tracked.
- Staff must manually search records to answer routine operational questions.
- Uploading C of R data is manual and error-prone.

## Goals

1. Create one searchable registry of all `17,576` possible marks from `AAA` to `ZZZ`.
2. Show whether each mark is `Available`, `Assigned`, or `Reserved`.
3. Preserve prior ownership and assignment history for previously used marks.
4. Flag reusable historical marks so staff can manage notice and reassignment.
5. Let inspectors answer operational questions from structured data instead of manual counting.
6. Introduce a guided document upload workflow with human review before saving.

## Primary Users

- DAWS staff managing registration records
- NCAA inspectors looking up operational facts
- Supervisors reviewing registry status and trends

## MVP Scope

### Registry inventory

- Pre-generate every suffix from `AAA` to `ZZZ`
- Display each as a full registration mark `5N-<suffix>`
- Show current status:
  - `Available`
  - `Assigned`
  - `Reserved`
- If a mark was previously used and is now available again, keep the status as `Available` and show a `Previously Used` flag plus prior owner history

### Aircraft and assignment records

- Store aircraft details sourced from C of R
- Store owner and operator information
- Track assignment start date and end date
- Preserve historical assignments when a mark is released, transferred, or deregistered

### Search and reporting

- Search by mark, owner, operator, aircraft type, and serial number
- Filter by current status and registration date range
- Show dashboard counts such as:
  - active registrations
  - available marks
  - registrations in the last 5 years
  - registrations by operator

### Guided C of R capture

- Upload a scanned image or PDF
- Extract candidate fields
- Require a human to confirm or correct extracted values
- Save only after confirmation

### Inspector assistant

- Answer approved operational questions using database queries
- Return numeric answers and short summaries only
- Avoid hallucinated answers by grounding every response in the database

## Out of Scope for the First Delivery

- Direct operator self-service portal
- Automated final decision on mark reassignment without staff review
- Fully autonomous OCR with no human confirmation
- Advanced workflow approvals beyond a simple reviewed save
- SMS/email automation without legal and operational sign-off

## Functional Requirements

### Registration marks

- The system must contain every suffix from `AAA` to `ZZZ` before any data import begins.
- Each mark must be unique.
- Each mark must support current status plus historical usage.
- A mark that becomes reusable must retain prior ownership history.

### Historical traceability

- Every assignment must create a historical record.
- Staff must be able to see prior owners/operators of a mark before reuse.
- The system must support a reuse notice workflow status per prior owner contact.

### Data entry and upload

- Staff must be able to create or update a record manually.
- Staff must be able to upload a C of R image or PDF for extraction preview.
- Extracted data must never be committed without confirmation.

### Analytics and assistant

- The system must provide summary metrics from live data.
- The assistant must translate approved question patterns into database queries.
- Every assistant answer must include a data-backed result only.

## Non-Functional Requirements

- Accuracy over speed
- Clear auditability for changes
- Desktop-first usability for internal staff
- Search responses should feel near-instant on normal internal datasets
- Deployment should support internal-only use first

## Success Metrics

- Staff can determine mark availability in seconds instead of manual file review.
- Inspectors can answer common count-based questions without manual counting.
- New records can be captured faster with fewer spelling and transcription errors.
- Reusable marks can be identified without losing prior ownership history.

## Delivery Phases

### Phase 1: Demo and workflow validation

- Sample data
- Searchable registry
- Dashboard
- Guided upload preview
- Controlled inspector assistant

### Phase 2: Operational MVP

- Real Excel import
- Real database persistence
- Full history tracking
- Internal user authentication

### Phase 3: Automation and scale

- OCR pipeline hardening
- Notifications for mark reuse review
- Rich analytics and audited assistant queries
