# Secretary App Project Plan

## 1. Project Purpose

Create an offline-capable digital dashboard for the Office of the General Manager in the Directorate of Licensing and Operations (DOLT) at NCAA Abuja.

The app will replace hard-copy books and Excel tracking with an interactive system for recording, searching, filtering, and exporting incoming and outgoing office correspondence.

## 2. Target Users

- General Manager (GM)
- Two secretaries / data-entry assistants
- Office staff who need to review received and dispatched files

## 3. Key Goals

- Replace paper-based email/files logbooks with a searchable dashboard
- Store records locally and support offline use
- Provide secure login for at least three work emails/accounts
- Enable shared access across laptops through manual file transfer or future sync
- Export the full dataset to Excel for reporting and archive
- Present a modern, easy-to-use UI for quick input and review

## 4. Core Features

### 4.1 Data entry and record management

- Add new correspondence/file records
- Edit existing records
- Delete or archive outdated records
- Capture the required fields:
  1. S/N
  2. Date
  3. Name
  4. Company / Airline
  5. License type and/or Number
  6. Subject
  7. License Validation
  8. Dispatched (Head-FCL, Head-FDL, Head-CCL, Head-AMEL, Others)
  9. Remark
- Optional additional fields for better context:
  - Source (email, letter, memo)
  - Received by
  - Dispatch method (printed, email, physical delivery)
  - Status (Received, In Review, Dispatched)
  - Follow-up date
  - Attachments placeholder or reference note

### 4.2 Search and filtering

- Search by name, license number, company, subject, date, or remark
- Filter by dispatch destination, status, date range, or license validity
- Sort records by date, S/N, or license validation status

### 4.3 Dashboard and analytics

- Summary cards for total records, pending dispatches, overdue validations, and recent activity
- Charts or badges to identify urgent files and expired licenses
- Quick action buttons for adding items and exporting data

### 4.4 Export and print

- Export the entire dataset to Excel (`.xlsx`) or CSV
- Print the record table or a selected record view
- Generate a printable report of the current search/filter result

### 4.5 Authentication and access control

- Local login for at least 3 work email accounts
- Role-based access:
  - GM: review, dashboard, reports, read-only or review-only privileges
  - Secretaries: input, edit, dispatch logging
- PIN or password sign-in for local devices
- Password reset guidance through app settings or admin override

### 4.6 Local storage and offline capability

- Store all data in browser local storage or IndexedDB
- App should work without internet access after initial load
- Support offline data entry and export
- Option to import/export backup files for manual sharing between laptops

## 5. Suggested App Structure

### Pages/views

- Login / account selection
- Dashboard
- Record list / table view
- Record details and edit form
- Add record form
- Reports / export page
- Settings / user management

### Main UI components

- Search bar
- Filter panel
- Record table
- Record action buttons
- Badge indicators for license validation & dispatch status
- Modal dialog for add/edit forms
- Toast notifications for feedback

## 6. Data Model

### Primary record fields

- id (unique local identifier)
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

### User account fields

- id
- email
- role (GM or Secretary)
- displayName
- passwordHash or PIN
- lastLogin

## 7. Technology Recommendations

- HTML/CSS/JavaScript for the front end
- IndexedDB via Dexie.js for local data persistence
- Library for Excel export, e.g. SheetJS (`xlsx`)
- Optional local web server for development (`http-server`, Node.js)
- Minimal dependencies to keep the app easy to deploy and maintain

## 8. Non-functional Requirements

- Offline-first user experience
- Fast search and filtering for hundreds of records
- Responsive layout for laptop screens
- Clean, modern visual design with easy input flow
- Simple setup and portable use on a Windows laptop
- Low storage overhead and no requirement for backend infrastructure initially

## 9. Deployment and sharing

- Store the app files within `DOLT-DIRECTORATE-OF-OPERATIONS-AND-LICENSING/Secretary`
- Open via browser or lightweight local server
- Use manual export/import for data sharing until synchronization is added
- Keep data backups on the local laptop and external backup drives

## 10. Suggested project milestones

### Phase 1: Planning and design

- Finalize app requirements and field list
- Create UI concept and page layout
- Confirm user roles and security model

### Phase 2: Core build

- Build authentication/login flow
- Build record table and add/edit form
- Implement IndexedDB storage and local persistence
- Implement search, filter, and sort

### Phase 3: Reporting and export

- Add Excel/CSV export
- Add printable report support
- Add dashboard summary cards

### Phase 4: Testing and deployment

- User acceptance testing with GM and secretaries
- Validate offline behavior
- Create deployment instructions for laptop setup

## 11. Improvements to consider

- Add manual record import from Excel
- Add user activity log/history
- Add secure backup/export and restore
- Add synchronization layer later for multi-device sharing
- Add role-based audit trail and review comments
- Add attachment support for scanned documents or email reference IDs

## 12. Next step

Proceed with a detailed PRD and UI wireframes, then start building the first working prototype in the `Secretary` folder.
