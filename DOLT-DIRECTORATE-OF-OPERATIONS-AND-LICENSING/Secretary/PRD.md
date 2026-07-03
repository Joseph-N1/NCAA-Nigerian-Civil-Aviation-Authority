# Product Requirements Document (PRD)

## Project Title

Secretary Office Record Management Dashboard

## Background

The Office of the General Manager in the Directorate of Licensing and Operations (DOLT) at NCAA Abuja currently tracks incoming and outgoing emails, files, and correspondence using hard-copy books. This creates operational risk, slows access to information, and prevents reliable searching or reporting.

This project will create an offline-first digital dashboard that allows the GM and secretaries to capture, search, review, and export records on a laptop.

## Purpose

Provide a modern, stable digital record system tailored for the DOLT GM office. The system should support:

- secure login for GM and secretaries
- offline operation
- structured tracking of received and dispatched files
- searchable and filterable records
- export to Excel for backup and reporting

## Scope

### In scope

- Local sign-in with 3 work email accounts
- Role-based access (GM vs Secretary)
- Record creation, editing, and deletion
- Search and filter on all record fields
- Export current records to Excel or CSV
- Dashboard summary of record status
- Offline-ready local storage
- Print/export function

### Out of scope for MVP

- Real-time multi-device sync (can be added later)
- Cloud hosting or server backend
- Complex access permissions beyond GM/Secretary
- Image or document attachment upload in MVP

## User Stories

### GM

1. As a GM, I want to log in to the app so I can view all records and monitor office activity.
2. As a GM, I want to see a dashboard of received and dispatched correspondence so I can understand the office workload.
3. As a GM, I want to export the entire database to Excel so I can keep an offline archive.
4. As a GM, I want to review the log of recent changes so I can verify actions by secretaries.

### Secretary

1. As a secretary, I want to add new records quickly so I can capture incoming files and emails.
2. As a secretary, I want to edit records when there is new information or corrections.
3. As a secretary, I want to search by name, subject, or license number so I can find records fast.
4. As a secretary, I want to mark files as dispatched so I can record where items were sent.

## Functional Requirements

### Authentication

- Users can log in using one of three preconfigured work emails.
- Login should be secure and stored locally using a PIN or password.
- GM and Secretary roles must be distinguished.
- GM should have read-only or supervisory privileges; secretaries can add/edit.

### Record Management

Records shall include the following fields:

- S/N
- Date
- Name
- Company / Airline
- License Type / Number
- Subject
- License Validation
- Dispatched (Head-FCL, Head-FDL, Head-CCL, Head-AMEL, Others)
- Remark
- Status (e.g. Received / In Review / Dispatched)
- Received By
- Follow-up Date

The app shall allow:

- Create new records
- Edit records
- Delete records
- Duplicate or clone a record if needed

### Search and Filter

The app shall support:

- Global search across all fields
- Filter by dispatch destination
- Filter by date range
- Filter by license validation status
- Sort by date, S/N, or dispatch status

### Dashboard

The dashboard shall show:

- Total records
- Pending dispatch items
- Upcoming or overdue license validations
- Recent activity log
- Alerts for critical items

### Export and Print

The app shall allow:

- Export to Excel (`.xlsx`) or CSV
- Print the record table or selected records
- Export filtered results, not just the entire dataset

### Offline Storage

- Use IndexedDB for local persistence
- Data must remain available when disconnected
- Allow local backup/import of database files

## Non-Functional Requirements

- UI must be modern and easy to use
- App must load quickly on a laptop
- Must work fully offline after initial load
- Must be resilient to accidental refreshes and state loss
- Must be maintainable by a small team

## Data Model

### Record

- id
- serialNumber
- dateReceived
- name
- companyAirline
- licenseType
- licenseNumber
- subject
- licenseValidation
- dispatchedTo
- remark
- status
- receivedBy
- followUpDate
- createdAt
- updatedAt
- createdBy
- updatedBy

### User

- id
- email
- role
- displayName
- passwordHash or PIN
- createdAt
- lastLogin

## UI Requirements

### Login screen

- Role selection for GM and secretary
- PIN/password entry
- Clear guidance for first-time setup

### Main dashboard

- Search bar and quick filters
- Summary cards for key metrics
- Recent activity section
- Alerts for items requiring action

### Record table

- Column headers for all main fields
- Inline sorting and pagination for large datasets
- Quick actions for edit, dispatch, or delete
- Highlight expired/urgent items

### Form UI

- Simple add/edit modal or panel
- Required field validation
- Data-friendly layout for quick typing
- Clear save/cancel buttons

## Success Criteria

- GM and secretaries can log in and use the app
- Data can be added, edited, searched, and exported
- The app can run offline without errors
- The dashboard provides a clear status summary
- Exported Excel reports are accurate and usable

## Risks and Mitigations

- Risk: multiple laptops require synchronization.
  - Mitigation: start with local manual backup/import; plan sync later.
- Risk: sensitive data stored locally.
  - Mitigation: use local device security and export only as needed.
- Risk: users may need training.
  - Mitigation: keep the interface simple and include short usage notes.

## Deployment Plan

1. Build the application inside `DOLT-DIRECTORATE-OF-OPERATIONS-AND-LICENSING/Secretary`
2. Test on a local laptop in a browser
3. Validate offline use and export functionality
4. Provide setup instructions for the GM office

## Appendix

### Recommended improvements for future versions

- Add import from Excel
- Add device sync via secure server
- Add optional attachments or image references
- Add user audit logs for each record change
- Add administrative settings for user management
