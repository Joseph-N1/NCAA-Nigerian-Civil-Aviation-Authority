# Backend Document

## Section 1: Tech Stack

### Demo stack

Use this for the near-term boss demo:

- **Frontend and app shell:** Streamlit
- **Data handling:** Pandas
- **Storage for demo:** generated sample data or a simple CSV/SQLite file
- **Assistant logic:** controlled rule-based query handling
- **Upload workflow:** mocked extraction preview with manual confirmation

Why this stack:

- Fastest to build
- Easy to demo locally
- Enough to validate workflow and stakeholder interest

### Target production stack

Use this for the real internal system after approval:

- **Frontend:** React
- **Backend API:** FastAPI
- **Database:** PostgreSQL
- **ORM / migrations:** SQLAlchemy + Alembic
- **Document storage:** internal file store or controlled object storage
- **OCR service:** pluggable OCR pipeline with human review
- **Authentication:** internal role-based access
- **Analytics assistant:** SQL-backed service with approved query templates

Why this stack:

- Better separation of concerns
- Better long-term maintainability
- Better auditability and multi-user support

## Section 2: Backend Structure

### Core data model

#### `registration_marks`

One record for every suffix from `AAA` to `ZZZ`.

Key fields:

- `id`
- `suffix`
- `full_mark`
- `current_status` (`AVAILABLE`, `ASSIGNED`, `RESERVED`)
- `previously_used`
- `special_mark`
- `current_assignment_id` nullable
- `last_released_on` nullable
- `created_at`
- `updated_at`

#### `aircraft`

Key fields:

- `id`
- `manufacturer`
- `model`
- `serial_number`
- `aircraft_type`
- `year_of_manufacture` nullable
- `current_state` (`ACTIVE`, `DEREGISTERED`, `STORED`, `UNKNOWN`)
- `created_at`
- `updated_at`

#### `entities`

Used for owners and operators.

Key fields:

- `id`
- `name`
- `entity_type` (`OWNER`, `OPERATOR`)
- `email` nullable
- `phone` nullable
- `address` nullable

#### `assignments`

Historical record of who held a mark and on which aircraft.

Key fields:

- `id`
- `registration_mark_id`
- `aircraft_id`
- `owner_entity_id`
- `operator_entity_id`
- `assigned_on`
- `released_on` nullable
- `assignment_status` (`ACTIVE`, `TRANSFERRED`, `DEREGISTERED`, `RELEASED`)
- `cor_reference` nullable
- `source_document_id` nullable

#### `documents`

Key fields:

- `id`
- `document_type` (`COR`, `LETTER`, `SUPPORTING`)
- `file_name`
- `storage_path`
- `uploaded_by`
- `uploaded_at`
- `ocr_status` (`PENDING`, `EXTRACTED`, `CONFIRMED`, `REJECTED`)

#### `document_extractions`

Key fields:

- `id`
- `document_id`
- `extracted_payload_json`
- `review_status` (`PENDING`, `CONFIRMED`, `REJECTED`)
- `reviewed_by` nullable
- `reviewed_at` nullable
- `review_notes` nullable

#### `reuse_notifications`

Tracks previous-owner notice before a historically used mark is reused.

Key fields:

- `id`
- `registration_mark_id`
- `prior_entity_id`
- `notice_channel` (`EMAIL`, `PHONE`, `LETTER`)
- `notice_status` (`PENDING`, `SENT`, `ACKNOWLEDGED`, `FAILED`)
- `scheduled_for` nullable
- `sent_at` nullable
- `notes` nullable

#### `audit_logs`

Key fields:

- `id`
- `actor_id`
- `action`
- `object_type`
- `object_id`
- `details_json`
- `created_at`

### Relationship rules

- Each registration mark exists once.
- A registration mark can have many assignments over time.
- Only one assignment can be active for a mark at a time.
- An aircraft can appear in many assignments over time.
- Uploaded documents can support one or more assignment changes.

### API surface

#### Registry

- `GET /api/marks`
  - list and filter marks by status, operator, owner, and text search
- `GET /api/marks/{full_mark}`
  - get one mark plus current and historical details
- `POST /api/marks/{id}/reserve`
  - place a reservation on a mark
- `POST /api/marks/{id}/assign`
  - assign a mark after validation

#### Aircraft and history

- `GET /api/aircraft/{id}`
  - fetch aircraft details and assignment history
- `POST /api/assignments`
  - create a new assignment
- `POST /api/assignments/{id}/release`
  - release or deregister an assignment

#### Upload and review

- `POST /api/uploads/cor/preview`
  - upload a scan and return extracted candidate fields
- `POST /api/uploads/cor/confirm`
  - confirm reviewed fields and write records
- `GET /api/documents/{id}`
  - fetch stored document metadata

#### Analytics and assistant

- `GET /api/analytics/summary`
  - dashboard counts
- `GET /api/analytics/operators/{operator_name}`
  - current and historical operator metrics
- `POST /api/assistant/query`
  - receive an approved question, map it to a safe query, and return a response

### Assistant behavior rules

- Only allow approved question types at first
- Use parameterized SQL or a safe query builder
- Return counts, filtered lists, or short summaries only
- Log every question and generated query for audit

### Data import approach

1. Preload all `AAA` to `ZZZ` marks into `registration_marks`
2. Clean the current Excel file into a structured import format
3. Match existing marks to imported historical/current assignments
4. Flag historical records with missing end-state evidence for manual review
5. Preserve uncertain records instead of deleting them

### Recommended implementation order

1. Registration marks master table
2. Current aircraft and assignment records
3. Historical assignment support
4. Search and dashboard analytics
5. Upload review workflow
6. Assistant query layer
7. Notifications and richer approval workflow
