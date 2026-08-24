# Security Checklist

Use this before any internal deployment or pilot rollout.

## Access Control

- Define user roles before launch:
  - viewer / inspector
  - data entry officer
  - supervisor
  - admin
- Enforce least privilege
- Require login for all non-demo environments
- Disable shared generic accounts where possible

## Data Integrity

- Enforce unique registration marks
- Enforce single active assignment per mark
- Validate required fields before save
- Keep historical records append-only where possible
- Require confirmation before OCR-extracted data is committed

## Audit and Traceability

- Log every create, update, release, reassignment, and delete-like action
- Log who reviewed and confirmed uploaded document data
- Log assistant queries and returned results
- Preserve historical owner/operator links even after a mark becomes available again

## File and Upload Safety

- Restrict accepted upload types
- Scan uploads for malware in production
- Store uploaded files outside the web root
- Generate internal file identifiers instead of trusting file names
- Limit upload size

## Assistant Safety

- Do not let the chatbot answer from model memory alone
- Force every answer to come from approved database queries
- Reject unsupported questions instead of guessing
- Log prompts, filters, and query results for review
- Do not expose confidential fields in assistant responses by default

## API Security

- Use parameterized queries
- Validate all request inputs
- Rate-limit assistant and upload endpoints
- Return generic errors to users and detailed errors to logs only
- Protect administrative endpoints separately

## Infrastructure and Deployment

- Use environment variables or a secrets manager for credentials
- Restrict database access to the application and approved admins
- Use HTTPS for any networked deployment
- Encrypt backups
- Keep a tested restore process

## Operational Controls

- Define who is allowed to mark a registration reusable
- Define when previous owners must be notified before reuse
- Create a manual review queue for uncertain historical records
- Create a process for correcting mistaken entries without losing history

## Privacy and Compliance

- Minimize personal data stored for owners/operators
- Store only fields with operational justification
- Define retention rules for uploaded documents and logs
- Confirm whether external AI/OCR services are allowed before sending documents outside the organization

## Before Go-Live

- Run sample import on a copy of the data
- Reconcile totals against the current Excel sheet
- Verify role permissions with test accounts
- Test backup and restore
- Review assistant outputs with real inspector questions
- Get sign-off from the department owner
