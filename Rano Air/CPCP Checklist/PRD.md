# Product Requirements Document (PRD)

## CPCP Check Progress Tracker — Rano Air AMO

---

## Background

The Line Maintenance Manager at Rano Air AMO (Abuja Airport) currently tracks heavy maintenance check progress using hard-copy printouts and a Word document with an embedded Excel pie chart. Every time task progress changes, the manager must manually update the Word table, open the embedded Excel, recalculate percentages, and regenerate the pie chart. This process is repeated multiple times per day across 800+ task cards, multiple work packages, and several junior engineers and certifiers.

This project will build an **offline-first web dashboard** that automates progress tracking, auto-generates pie charts, manages engineer assignments, and replaces the daily Word-based DSR with a one-click export.

---

## Purpose

Provide a real-time, offline-capable check progress dashboard tailored for hangar use. The system should support:

- Multi-select check types with configurable task counts
- Auto-updating pie charts per work package and a master total chart
- Engineer and certifier assignment and workload tracking
- One-click Daily Status Report (DSR) generation matching the existing format
- Offline operation (no WiFi required in the hangar)
- Role-based access for Line Manager, Engineers, and Certifiers

---

## Scope

### In Scope (MVP)

- Check setup with multi-select check types and task card counts
- Individual pie chart per check type + master total pie chart
- Progress table showing all selected checks with live counts
- Task card management (add, update status, close, defer)
- Engineer assignment to task cards
- Engineer workload summary view
- Certifier sign-off tracking
- Auto-generated Daily Status Report (DSR) with print/PDF export
- Shift handover summary
- Audit trail for all status changes
- Offline-ready local storage (IndexedDB)
- CSV/JSON export and import for backup

### Out of Scope for MVP

- Multi-aircraft tracking (one active check at a time)
- Cloud sync between devices
- ATA chapter / zone breakdown views (Phase 2)
- Kanban drag-and-drop board (Phase 2)
- Task card lifecycle beyond Open/In-Progress/Closed/Deferred (Phase 2)
- Photo/attachment upload for defect documentation (Phase 2)

---

## User Roles

### Line Maintenance Manager (Admin)

- Full access to all features
- Can create/configure checks and work packages
- Can assign/reassign tasks to engineers
- Can view all engineer workloads
- Can generate and export DSR reports
- Can view audit trail of all changes

### Engineer

- Can view assigned tasks
- Can update task status (Open → In Progress → Closed)
- Can add remarks/notes to tasks
- Can request certifier sign-off
- Cannot delete tasks or modify other engineers' tasks

### Certifier

- Can view tasks pending certification
- Can sign off / certify closed tasks
- Can reject tasks back to "In Progress" with remarks
- Cannot create or delete tasks

---

## Core Feature Specifications

---

### Feature 1: Check Setup & Multi-Select Check Types

#### 1.1 Check Configuration Screen

When starting a new check, the user (Manager) fills out a setup form:

| Field | Type | Required | Example |
|---|---|---|---|
| MRO | Text (auto-filled) | Yes | Rano Air AMO |
| Aircraft Type | Dropdown | Yes | EMB 145LR |
| Aircraft Registration | Text | Yes | 5N-BZY |
| Aircraft MSN | Text | Yes | 145562 |
| Check Start Date | Date picker | Yes | 2026-07-25 |
| Estimated RTS Date | Date picker | No | TBD |
| Check Types | **Multi-select dropdown** | Yes | See below |

#### 1.2 Multi-Select Check Type Dropdown

The dropdown allows selecting **one or more** check types from a predefined list:

- `1A Check`
- `2A Check`
- `3A Check`
- `4A Check`
- `5A Check`
- `CPCP` (Corrosion Prevention & Control Programme)
- `OOP` (Out of Phase)
- `Daily Check`
- `Weekly Check`
- `Routine`
- `Additional Works`
- `Non-Routine` (always present — created dynamically during check)

**Behavior:**
- User clicks dropdown → checkboxes appear for each check type
- Selected items display as **tags/chips** below the dropdown
- Each selected check type gets a **task count input field** next to it
- User enters the number of planned task cards for each selected check type
- The "Non-Routine" category starts at 0 and grows as defects are raised

#### 1.3 After Setup — The Progress Table Auto-Populates

Example after selecting 1A+2A+3A+4A+5A+CPCP+OOP:

| Planned Task | No. of Task Cards | No. of Tasks Closed | Completion % |
|---|---|---|---|
| CPCP Work Scope Tasks | 362 | 35 | 10% |
| 1A Check | 20 | 2 | 10% |
| 2A Check | 25 | 3 | 12% |
| 3A Check | 20 | 1 | 5% |
| 4A Check | 15 | 0 | 0% |
| 5A Check | 20 | 4 | 20% |
| OOP | 10 | 0 | 0% |
| Non-Routine Tasks | 45 | 5 | 11% |
| **TOTAL** | **517** | **50** | **10%** |

---

### Feature 2: Auto-Updating Pie Charts & Progress Dashboard

#### 2.1 Individual Pie Charts (Per Check Type)

- Each selected check type gets its own **donut/pie chart**
- Chart shows: **Closed** (green) vs **Open** (remaining)
- Percentage label displayed in the center of the donut
- Charts **animate on value change** (smooth transition)
- Charts arranged in a responsive grid (2-3 per row on desktop)
- Each chart has a label below it: e.g., "CPCP — 10% Complete"

#### 2.2 Master Total Pie Chart

- A larger, prominent pie chart at the top/center of the dashboard
- Title: **"TOTAL TASKS COMPLETION STATUS"** (matches existing Word doc)
- Shows aggregate: Total Closed / Total Tasks across ALL check types
- Displayed prominently — this is the "hero" chart the manager looks at
- Uses a gradient fill or multi-ring design to look premium

#### 2.3 Summary Cards (Top of Dashboard)

Four summary cards displayed in a horizontal row:

| Card | Value | Color |
|---|---|---|
| Total Task Cards | Sum of all check types | Blue/Accent |
| Tasks Closed | Sum of all closed tasks | Green |
| Tasks Open | Total - Closed | Amber/Warning |
| Overall Completion | (Closed / Total) × 100% | Dynamic color: 🔴<25%, 🟡 25-75%, 🟢>75% |

#### 2.4 Progress Bars

Below the pie charts, each check type also has a **horizontal animated progress bar**:
- Label on left: Check type name
- Bar fills from left to right based on completion %
- Percentage label on right
- Color transitions: Red → Yellow → Green as progress increases
- Smooth CSS transition animation when values change

#### 2.5 Real-Time Updates

- When ANY task card status changes (e.g., "Open" → "Closed"):
  1. The specific check type's pie chart re-renders with animation
  2. The master total pie chart re-renders
  3. The summary cards recalculate
  4. The progress bars animate to new values
  5. The progress table row updates
- **No page reload required** — all updates are in-place via DOM manipulation

---

### Feature 3: Engineer Task Assignment & Work Tracking

#### 3.1 Engineer Roster Management

The Manager can add engineers and certifiers to the system:

| Field | Type | Required |
|---|---|---|
| Name | Text | Yes |
| Staff ID | Text | Yes |
| Role | Dropdown: Engineer / Certifier | Yes |
| Shift | Dropdown: Day / Night | No |
| Specialization | Text | No |

Engineers are stored in IndexedDB and persist across sessions.

#### 3.2 Task Assignment

- When creating or editing a task card, there is an **"Assigned To"** dropdown listing all registered engineers
- Tasks can also have a **"Certified By"** field (populated when a certifier signs off)
- Bulk assignment: Manager can select multiple tasks and assign them to an engineer in one action

#### 3.3 Engineer Workload View

A dedicated tab/view showing:

| Engineer | Assigned | In Progress | Closed | Pending Cert | Completion % |
|---|---|---|---|---|---|
| Engr. Musa Ibrahim | 25 | 8 | 12 | 5 | 48% |
| Engr. Fatima Yusuf | 18 | 5 | 10 | 3 | 56% |
| Engr. Chidi Okafor | 22 | 10 | 6 | 6 | 27% |
| *Unassigned* | 35 | — | — | — | — |

Each engineer row is clickable to see their specific task list.

#### 3.4 Shift Handover Summary

One-click button to generate a shift handover report:
- Tasks completed this shift (since shift start time)
- Tasks still in progress
- New defects/non-routine items raised
- Parts on order or awaited
- Notes from engineers
- Format: Printable summary card

---

### Feature 4: Daily Status Report (DSR) Auto-Generator

#### 4.1 DSR Layout

The generated DSR must **match the existing Word document layout** as closely as possible:

```
┌──────────────────────────────────────────────────────────┐
│  MRO: Rano Air AMO           DATE: 25th July, 2026      │
│  AIRCRAFT TYPE: EMB 145LR    REG: 5N-BZY                │
│  CHECK START: 25th July      MSN: 145562                 │
│  TYPE OF CHECK: 1A+2A+3A+4A+5A+CPCP+OOP+...             │
│  EST. RTS DATE: TBD                                      │
├──────────────────────────────────────────────────────────┤
│  CHECK PROGRESS STATUS                                   │
│  ┌──────────────┬────────┬────────┬──────────┐           │
│  │ Planned Task │ Cards  │ Closed │ Status % │           │
│  ├──────────────┼────────┼────────┼──────────┤           │
│  │ CPCP         │ 362    │ 35     │ 10%      │           │
│  │ 1A+2A+3A+... │ 100    │ 10     │ 10%      │           │
│  │ Non-Routine  │ 462    │ 45     │ 10%      │           │
│  │ TOTAL        │ 924    │ 90     │ 10%      │           │
│  └──────────────┴────────┴────────┴──────────┘           │
├──────────────────────────────────────────────────────────┤
│         [TOTAL TASKS COMPLETION STATUS]                   │
│              ┌─────────────┐                             │
│              │   PIE CHART │                             │
│              │  10% CLOSED │                             │
│              │  90% OPEN   │                             │
│              └─────────────┘                             │
├──────────────────────────────────────────────────────────┤
│  TODAY'S HIGHLIGHTS                                      │
│  • 12 tasks closed today                                 │
│  • 3 new non-routine items raised                        │
│  • Wing inspection 80% complete                          │
│  • Awaiting parts: LH MLG actuator seal                  │
└──────────────────────────────────────────────────────────┘
```

#### 4.2 DSR Generation

- **One-click "Generate DSR" button** on the main dashboard
- Auto-fills all header fields from the check configuration
- Pulls live task counts and percentages
- Renders the pie chart as inline SVG (prints perfectly)
- Includes a "Today's Highlights" section (editable text area)
- Print-optimized CSS: hides navigation, fits A4 page

#### 4.3 DSR Export Options

- **Print** → browser print dialog (Ctrl+P) with print-specific CSS
- **PDF** → uses browser print-to-PDF
- **Filename convention:** `DSR_[Registration]_[Date].pdf` e.g., `DSR_5N-BZY_2026-07-25.pdf`

#### 4.4 DSR History

- Each generated DSR is saved as a snapshot in IndexedDB
- Manager can view past DSRs: "Show me the DSR from 3 days ago"
- Compare progress between days

---

### Feature 5: Task Card Management

#### 5.1 Task Card Data Model

| Field | Type | Required | Notes |
|---|---|---|---|
| id | Auto-generated UUID | System | Primary key |
| taskNumber | String | Yes | e.g., "CPCP-001", "NR-045" |
| checkType | String | Yes | Which work package this belongs to |
| title | String | Yes | Short description of the task |
| description | Text | No | Detailed work instructions |
| status | Enum | Yes | Open, In Progress, Closed, Deferred |
| priority | Enum | No | Critical, High, Normal, Low |
| assignedTo | Reference | No | Engineer ID |
| certifiedBy | Reference | No | Certifier ID |
| certifiedAt | DateTime | No | When certification happened |
| remarks | Text | No | Engineer notes, findings |
| createdAt | DateTime | System | Auto-set on creation |
| updatedAt | DateTime | System | Auto-set on any change |
| closedAt | DateTime | System | Auto-set when status → Closed |

#### 5.2 Task Card CRUD

- **Create:** Modal form with all fields. Task number auto-generates based on check type prefix.
- **Read:** Main task table with search, filter, sort. Click row to view details.
- **Update:** Same modal in edit mode. Status changes trigger pie chart updates.
- **Delete:** Soft-delete with confirmation. Only Manager can delete.

#### 5.3 Bulk Operations

- Select multiple tasks via checkboxes
- Bulk actions: Assign to engineer, Change status, Change priority
- "Close all selected" with confirmation

#### 5.4 Quick Status Toggle

- Each task row has a **status badge** that is clickable
- Clicking cycles: Open → In Progress → Closed
- Or use a mini-dropdown on hover for more options (Deferred, etc.)

---

## Data Model (IndexedDB Schema)

### Store: `checks`

```
{
  id: string (UUID),
  mro: string,
  aircraftType: string,
  aircraftRegistration: string,
  aircraftMSN: string,
  checkStartDate: string (ISO date),
  estimatedRTS: string (ISO date or "TBD"),
  checkTypes: [
    { type: "CPCP", plannedTasks: 362 },
    { type: "1A Check", plannedTasks: 20 },
    { type: "2A Check", plannedTasks: 25 },
    ...
  ],
  isActive: boolean,
  createdAt: string (ISO datetime),
  updatedAt: string (ISO datetime),
  createdBy: string
}
```

### Store: `tasks`

```
{
  id: string (UUID),
  checkId: string (FK to checks),
  checkType: string (e.g., "CPCP"),
  taskNumber: string,
  title: string,
  description: string,
  status: "open" | "in-progress" | "closed" | "deferred",
  priority: "critical" | "high" | "normal" | "low",
  assignedTo: string (FK to personnel),
  certifiedBy: string (FK to personnel),
  certifiedAt: string (ISO datetime),
  remarks: string,
  createdAt: string (ISO datetime),
  updatedAt: string (ISO datetime),
  closedAt: string (ISO datetime)
}
```

### Store: `personnel`

```
{
  id: string (UUID),
  name: string,
  staffId: string,
  role: "manager" | "engineer" | "certifier",
  shift: "day" | "night" | null,
  specialization: string,
  isActive: boolean,
  createdAt: string (ISO datetime)
}
```

### Store: `auditLog`

```
{
  id: auto-increment,
  timestamp: string (ISO datetime),
  userId: string,
  userName: string,
  action: "create" | "update" | "delete" | "status-change" | "assign" | "certify",
  entityType: "task" | "check" | "personnel",
  entityId: string,
  changes: {
    field: string,
    oldValue: any,
    newValue: any
  }[],
  summary: string
}
```

### Store: `dsrSnapshots`

```
{
  id: string (UUID),
  checkId: string (FK to checks),
  generatedAt: string (ISO datetime),
  generatedBy: string,
  headerData: object (check config snapshot),
  progressData: object (task counts snapshot),
  highlights: string (editable text),
  totalCompletion: number (percentage)
}
```

---

## UI Structure

### Page Layout

Single-page application with tab-based navigation:

```
┌─ HEADER BAR ────────────────────────────────────────────┐
│ Rano Air AMO • CPCP Check Tracker    [User] [Role] [⚙] │
└─────────────────────────────────────────────────────────┘

┌─ CHECK INFO BANNER ─────────────────────────────────────┐
│ 5N-BZY • EMB 145LR • MSN 145562                        │
│ Check: 1A+2A+3A+4A+5A+CPCP+OOP • Started: 25 Jul 2026 │
│ RTS: TBD • Day 1 of check                              │
└─────────────────────────────────────────────────────────┘

┌─ SUMMARY CARDS ─────────────────────────────────────────┐
│ [Total Tasks] [Closed] [Open] [Overall %]               │
└─────────────────────────────────────────────────────────┘

┌─ TABS ──────────────────────────────────────────────────┐
│ [📊 Dashboard] [📋 Tasks] [👷 Engineers] [📜 Audit Log] │
└─────────────────────────────────────────────────────────┘

  Dashboard tab: Pie charts grid + progress bars + table
  Tasks tab: Full task list with search/filter/sort
  Engineers tab: Workload view + assignment tools
  Audit Log tab: Chronological change history
```

### Check Setup View (shown when no active check exists)

Full-page setup wizard:
1. Aircraft details form
2. Multi-select check type picker with task count inputs
3. Engineer roster setup
4. "Start Check" button → transitions to main dashboard

### Responsive Design

- **Desktop (>1024px):** 3-column pie chart grid, full progress table
- **Tablet (768-1024px):** 2-column pie chart grid, scrollable table
- **Mobile (<768px):** Single-column stack, collapsible sections

---

## Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| Core | HTML5 + CSS3 + Vanilla JavaScript | Matches Secretary template, no framework overhead |
| Storage | IndexedDB via Dexie.js | Proven offline-first storage from Secretary project |
| Charts | SVG (hand-crafted, no library) | Lightweight, prints perfectly, follows Secretary pattern |
| Build | Vite | Fast dev server, easy bundling for offline use |
| Styling | Vanilla CSS with design tokens | Glassmorphism dark theme matching Secretary template |
| Typography | Inter (Google Fonts, cached) | Matches Secretary template |
| Export | Browser print + CSV generation | No external dependencies needed |
| PWA | Service Worker | Full offline capability after first load |

---

## Non-Functional Requirements

- **Offline-first:** Must work with zero internet after initial load
- **Performance:** Dashboard must render with 1000+ task cards without lag
- **Print quality:** DSR print output must match existing Word doc quality
- **Data safety:** IndexedDB data must survive browser restarts and crashes
- **Portability:** Must run on any modern browser (Chrome, Edge, Firefox)
- **Single laptop:** Designed for one-device use (no multi-device sync in MVP)

---

## Success Criteria

1. Manager can configure a new check with multiple check types in under 2 minutes
2. Pie charts update within 500ms of any task status change
3. DSR can be generated and printed in one click
4. Engineer workload is visible at a glance
5. All data persists offline across browser sessions
6. The dashboard fully replaces the Word-based DSR workflow

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Browser data loss (cache clear) | High | Export/import backup feature + auto-backup reminder |
| Too many task cards cause slow rendering | Medium | Virtual scrolling for 500+ rows, efficient DOM updates |
| Engineers unfamiliar with digital tools | Medium | Simple, intuitive UI; minimal training needed |
| Printer compatibility issues | Low | Standard CSS print media queries; test on common printers |
| Browser compatibility | Low | Target Chrome/Edge (most common in Nigerian offices) |

---

## Appendix: Check Types Reference

| Code | Full Name | Typical Task Count |
|---|---|---|
| 1A | 1A Check (Minor scheduled) | 10-30 |
| 2A | 2A Check | 15-40 |
| 3A | 3A Check | 15-30 |
| 4A | 4A Check | 10-25 |
| 5A | 5A Check | 15-35 |
| CPCP | Corrosion Prevention & Control Programme | 200-500 |
| OOP | Out of Phase items | 5-50 |
| Daily | Daily inspection | 5-15 |
| Weekly | Weekly inspection | 10-25 |
| Routine | Routine maintenance tasks | 10-50 |
| Add. Works | Additional works / modifications | Variable |
| Non-Routine | Defects found during check (dynamic) | Grows during check |
