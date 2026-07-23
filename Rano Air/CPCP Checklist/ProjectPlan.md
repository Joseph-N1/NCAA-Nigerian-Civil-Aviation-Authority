# CPCP Check Tracker — Project Plan

## 1. Project Purpose

Build an offline-first web dashboard for the Line Maintenance Manager at Rano Air AMO (Abuja Airport) to track heavy maintenance check progress. The dashboard replaces the current Word document + embedded Excel workflow with real-time auto-updating pie charts, engineer task assignment, and one-click DSR generation.

**Target location:** `NCAA-Nigerian-Civil-Aviation-Authority/Rano Air/CPCP Checklist/`

---

## 2. Target Users

| Role | Name / Placeholder | Access Level |
|---|---|---|
| Line Maintenance Manager | (Admin user) | Full access: configure checks, assign tasks, generate DSR, view all data |
| Engineer | (Multiple junior engineers) | Can update assigned task status, add remarks |
| Certifier | (Senior certifying staff) | Can certify/sign-off completed tasks |
| Viewer / Guest | (NCAA inspector, etc.) | Read-only: view progress, no edits |

---

## 3. Technology Stack

| Component | Technology | Notes |
|---|---|---|
| **Frontend** | HTML5 + Vanilla CSS + Vanilla JavaScript (ES Modules) | Follows Secretary project architecture |
| **Styling** | Vanilla CSS with Tailwind CSS v4 (via `@tailwindcss/vite`) | Design tokens from Secretary template, `ncaa-` namespace |
| **Data Layer** | Native IndexedDB (raw Promises, no Dexie.js) | Matches Secretary's `db.js` pattern exactly |
| **Charts** | Hand-crafted SVG (no external library) | Donut charts via `stroke-dasharray` technique from Secretary |
| **Build** | Vite v8+ with `@tailwindcss/vite` plugin | Dev server + production build |
| **Typography** | Inter (Google Fonts, loaded via `<link>`) | Cached for offline use |
| **Export** | CSV generation (built-in), browser Print-to-PDF | No external dependencies |

### Key Dependencies (package.json)

```json
{
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.2",
    "vite": "^8.1.3"
  }
}
```

---

## 4. File Structure

```
Rano Air/CPCP Checklist/
├── index.html              # Single-page app shell
├── css/
│   └── main.css            # Design tokens + Tailwind + component classes
├── js/
│   ├── db.js               # IndexedDB schema & CRUD operations
│   ├── app.js              # Main application logic & UI rendering
│   ├── charts.js           # SVG pie/donut chart rendering functions
│   └── dsr.js              # DSR generation & print logic
├── package.json            # Vite + Tailwind dependencies
├── vite.config.js          # Vite configuration
├── PRD.md                  # Product Requirements Document
├── ProjectPlan.md          # This file
└── 5N-BZX DSR 10.11.2025.docx  # Original reference document
```

---

## 5. IndexedDB Schema (Database: `RanoAirCPCPTrackerDB`, Version: 1)

### Store: `checks`
- **keyPath:** `id` (auto-increment)
- **Indexes:** `aircraftRegistration`, `isActive`
- **Purpose:** Stores check configurations (aircraft details, selected check types with task counts)

### Store: `tasks`
- **keyPath:** `id` (auto-increment)
- **Indexes:** `checkId`, `checkType`, `status`, `assignedTo`, `certifiedBy`
- **Purpose:** Individual task cards with status, assignment, certification tracking

### Store: `personnel`
- **keyPath:** `id` (auto-increment)
- **Indexes:** `staffId`, `role`
- **Purpose:** Engineers, certifiers, and manager accounts

### Store: `audit_log`
- **keyPath:** `id` (auto-increment)
- **Indexes:** `timestamp`, `userId`, `entityId`
- **Purpose:** Immutable log of all status changes, assignments, and edits

### Store: `dsr_snapshots`
- **keyPath:** `id` (auto-increment)
- **Indexes:** `checkId`, `generatedAt`
- **Purpose:** Saved DSR snapshots for historical comparison

---

## 6. CSS Design System (Extending Secretary Template)

### Design Tokens (inside `@theme` directive)

Reuse all Secretary tokens and add aviation-specific tokens:

```css
@theme {
  /* === Inherited from Secretary === */
  --color-ncaa-bg: #08101f;
  --color-ncaa-surface: #122039;
  --color-ncaa-surface-2: #172846;
  --color-ncaa-text: #e8eef8;
  --color-ncaa-muted: #9bb4d6;
  --color-ncaa-accent: #4a9cff;
  --color-ncaa-accent-dark: #1c59a0;
  --color-ncaa-border: rgba(255, 255, 255, 0.08);
  --color-ncaa-danger: #ff5f5f;
  --color-ncaa-danger-dark: #d93636;
  --color-ncaa-warning: #ffad33;
  --color-ncaa-success: #34d399;

  /* === New: Aviation Progress Colors === */
  --color-progress-red: #ef4444;
  --color-progress-yellow: #f59e0b;
  --color-progress-green: #22c55e;
  --color-check-cpcp: #8b5cf6;        /* Purple for CPCP */
  --color-check-a-series: #3b82f6;    /* Blue for A-checks */
  --color-check-nonroutine: #f97316;  /* Orange for non-routine */
  --color-check-opp: #06b6d4;         /* Cyan for OOP */
  --color-check-routine: #10b981;     /* Green for routine */
}
```

### Component Classes

Reuse from Secretary and add:
- `.glass-card`, `.glass-card-sm` (glassmorphism containers)
- `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-icon`
- `.form-input`, `.form-select`
- `.data-table` (full-width table with hover states)
- `.toast-container`, `.toast`
- **NEW:** `.progress-bar` (animated horizontal bar)
- **NEW:** `.check-type-chip` (tag/pill for selected check types)
- **NEW:** `.pie-chart-grid` (responsive grid for individual pie charts)
- **NEW:** `.dsr-print-layout` (print-only styles for DSR output)
- **NEW:** `.engineer-avatar` (colored circle with initials)
- **NEW:** `.status-badge` (clickable status pill: open/in-progress/closed/deferred)

---

## 7. SVG Chart Architecture

### Donut Chart Rendering (for both individual and master charts)

Each donut chart is rendered as an SVG using the `stroke-dasharray` technique (same as Secretary's license distribution chart):

```
SVG viewBox: "0 0 120 120"
Circle radius: 45
Circumference: 2πr ≈ 282.74

For a 35% completion:
  - Background circle: full circumference, light color
  - Progress circle: dasharray = "98.96 282.74", green color
  - Center text: "35%"
```

**Key functions in `charts.js`:**
- `renderDonutChart(containerId, percentage, label, color)` — Renders a single donut
- `renderMasterDonutChart(containerId, data)` — Renders the large total chart
- `renderProgressBar(containerId, percentage, label)` — Renders an animated horizontal bar
- `animateChart(element, fromPct, toPct, duration)` — Smooth transition animation

---

## 8. Application Module Architecture

### `db.js` — Data Access Layer

```
Exported interface:
  init()                          → Opens IndexedDB, creates stores, dispatches 'db-ready'
  
  // Checks
  addCheck(check)                 → Creates new check configuration
  getActiveCheck()                → Returns the currently active check
  updateCheck(check)              → Updates check config (e.g., add check types)
  
  // Tasks
  addTask(task)                   → Creates new task card
  addTasksBulk(tasks)             → Bulk insert (for initial setup)
  getAllTasks(checkId)             → All tasks for active check
  getTasksByCheckType(checkId, type) → Tasks filtered by work package
  getTasksByAssignee(checkId, personId) → Tasks for specific engineer
  updateTask(task)                → Update task (status change triggers chart refresh)
  deleteTask(id)                  → Soft-delete task
  getTaskStats(checkId)           → Returns { byCheckType: {...}, total: {...} }
  
  // Personnel
  addPerson(person)               → Add engineer/certifier
  getAllPersonnel()                → All registered staff
  updatePerson(person)            → Update staff details
  
  // Audit
  addAuditEntry(entry)            → Log an action
  getAllAuditEntries(checkId)      → All audit entries for this check
  getAuditForEntity(entityId)     → Audit history for specific task/check
  
  // DSR
  saveDSRSnapshot(snapshot)       → Save a DSR snapshot
  getDSRSnapshots(checkId)        → All DSRs for this check
  
  // Backup
  exportBackup()                  → Full JSON export of all stores
  importBackup(data)              → Restore from JSON backup
  clearAll()                      → Wipe all data (with confirmation)
```

### `app.js` — UI Controller

```
const App = {
  // State
  currentUser: null,
  activeCheck: null,
  
  // Lifecycle
  async init()                    → Wait for db-ready, load data, render UI
  
  // Check Setup
  showSetupWizard()               → Display check configuration form
  saveCheckConfig(formData)       → Create check + generate task placeholders
  
  // Task Management
  renderTaskTable(tasks)          → Render main task list
  openTaskModal(taskId?)          → Open add/edit task modal
  saveTask(formData)              → Create or update task + trigger chart refresh
  deleteTask(taskId)              → Soft-delete with confirmation
  updateTaskStatus(taskId, newStatus) → Quick status toggle
  bulkAssignTasks(taskIds, engineerId) → Assign multiple tasks
  
  // Dashboard
  refreshDashboard()              → Recalculate all stats, re-render all charts
  renderSummaryCards(stats)       → Update the 4 summary cards
  renderProgressTable(stats)      → Update the progress table rows
  
  // Engineer View
  renderEngineerWorkload()        → Engineer summary table
  renderEngineerTasks(engineerId) → Individual engineer task list
  
  // Audit
  renderAuditLog()                → Chronological change history
  logAudit(action, entityId, details) → Create audit entry
  
  // User/Role
  switchUser(userId)              → Change active user, update UI permissions
  
  // Utility
  showToast(message, type)        → Success/error/info notifications
  formatDate(date)                → Nigerian date format (DD Month, YYYY)
}
```

### `charts.js` — SVG Chart Module

```
export function renderDonutChart(container, pct, label, color, size)
export function renderMasterDonut(container, totalClosed, totalOpen)
export function renderProgressBar(container, pct, label, color)
export function animateValue(element, start, end, duration)
export function generatePieChartSVG(pct, label)  // For DSR print (returns SVG string)
```

### `dsr.js` — Daily Status Report Generator

```
export function generateDSR(check, stats, highlights)  // Returns HTML string
export function printDSR()                              // Opens print dialog
export function saveDSRSnapshot(check, stats, highlights) // Persist to IndexedDB
export function loadDSRHistory(checkId)                 // Load past DSRs
```

---

## 9. Phase-by-Phase Build Plan

### Phase 1: Project Scaffolding & Data Layer (Day 1)

**Tasks:**
1. Initialize Vite project in `CPCP Checklist/` directory
2. Set up `package.json` with Vite + Tailwind v4
3. Create `vite.config.js`
4. Create `css/main.css` with full design token system
5. Create `js/db.js` with complete IndexedDB schema (all 5 stores)
6. Create skeleton `index.html` with header, tabs, and empty sections
7. Verify dev server runs: `npm run dev`

**Deliverable:** Empty shell app with working data layer and design system.

---

### Phase 2: Check Setup & Configuration (Day 2)

**Tasks:**
1. Build the check setup wizard (shown when no active check exists)
2. Implement multi-select check type dropdown with tag/chip UI
3. Add task count input fields per selected check type
4. Implement aircraft details form (MRO, type, reg, MSN, dates)
5. Save check config to IndexedDB
6. Auto-generate task placeholders when check is created
7. Transition from setup wizard to main dashboard view

**Deliverable:** User can configure a new check with multiple check types and task counts.

---

### Phase 3: Dashboard & Auto-Updating Charts (Day 3-4)

**Tasks:**
1. Create `js/charts.js` with SVG donut chart rendering
2. Build individual pie chart grid (one donut per check type)
3. Build master total pie chart (hero chart)
4. Build summary cards (Total Tasks, Closed, Open, Overall %)
5. Build progress table (matches Word doc layout)
6. Build animated progress bars per check type
7. Implement `refreshDashboard()` — recalculates and re-renders everything
8. Wire up real-time updates: any task status change → `refreshDashboard()`
9. Add smooth CSS/JS animation for chart transitions

**Deliverable:** Live dashboard with auto-updating charts that respond to task changes.

---

### Phase 4: Task Card Management (Day 5-6)

**Tasks:**
1. Build task table with search, filter, sort
2. Implement add/edit task modal form
3. Task number auto-generation (e.g., CPCP-001, NR-045)
4. Quick status toggle (clickable status badge)
5. Task filtering by check type, status, assignee, priority
6. Bulk selection and bulk actions (assign, change status)
7. Audit logging for all task changes
8. Wire task changes to dashboard refresh

**Deliverable:** Full task CRUD with filters, search, and real-time dashboard integration.

---

### Phase 5: Engineer Assignment & Workload Tracking (Day 7-8)

**Tasks:**
1. Build personnel management (add/edit/remove engineers and certifiers)
2. Add "Assigned To" dropdown to task modal
3. Build engineer workload summary view (tab)
4. Per-engineer task breakdown: assigned, in-progress, closed, pending cert
5. Click-to-filter: clicking an engineer shows their tasks
6. Certifier sign-off flow: mark task as certified
7. Shift handover summary generation
8. Audit logging for assignments and certifications

**Deliverable:** Full engineer management with workload visibility and certifier tracking.

---

### Phase 6: Daily Status Report (DSR) Generator (Day 9-10)

**Tasks:**
1. Create `js/dsr.js` module
2. Build DSR preview panel matching original Word doc layout
3. Auto-fill header from check config
4. Pull live task stats into progress table
5. Render pie chart as inline SVG in DSR
6. Add editable "Today's Highlights" text area
7. Print-specific CSS (`@media print`) for A4 page layout
8. One-click print button (browser print dialog)
9. Save DSR snapshot to IndexedDB
10. DSR history view: load and compare past reports

**Deliverable:** One-click DSR generation that replaces the Word document workflow.

---

### Phase 7: Role-Based Access, Audit, & Polish (Day 11-12)

**Tasks:**
1. Implement user switcher (Manager/Engineer/Certifier/Guest roles)
2. Conditional UI: hide/disable features based on role
3. Build audit log tab with search, filters, and export
4. In-modal task change history timeline
5. JSON backup export/import
6. CSV export for task lists and progress data
7. Toast notification system
8. Empty states for all views
9. Responsive layout testing (desktop, tablet)
10. Print quality testing for DSR output

**Deliverable:** Production-ready application with RBAC, audit trail, and export features.

---

### Phase 8: Sample Data, Testing & Documentation (Day 13)

**Tasks:**
1. Create sample check data with realistic task cards
2. "Load Sample Data" button for demonstrations
3. Test all CRUD operations
4. Test chart accuracy with edge cases (0%, 50%, 100%)
5. Test DSR print output on A4 paper
6. Test offline behavior (disconnect WiFi, verify data persists)
7. Test backup export/import cycle
8. Browser compatibility testing (Chrome, Edge)
9. Write brief usage guide / README

**Deliverable:** Fully tested app with sample data and documentation.

---

## 10. Build Guidelines for AI Model (Context for Gemini 3.5/3.6)

### Critical Architecture Rules

1. **Follow Secretary's exact patterns.** The [Secretary project](file:///c:/Users/Joseph%20N%20Nimyel/OneDrive/Documents/NCAA-Nigerian-Civil-Aviation-Authority/DOLT-DIRECTORATE-OF-OPERATIONS-AND-LICENSING/Secretary) is the reference implementation. Copy its:
   - IndexedDB raw Promise pattern (NOT Dexie.js)
   - `window.dispatchEvent(new Event('db-ready'))` initialization
   - `const App = { ... }` singleton bound to `window.App`
   - CSS design tokens in `@theme` directive
   - Glassmorphism component classes in `@layer components`

2. **Charts are pure SVG.** Use `stroke-dasharray` technique for donut charts. No Chart.js, no D3, no canvas. Generate SVG strings in JavaScript, insert via `innerHTML`. Follow Secretary's `renderLicenseChart` function pattern.

3. **Tailwind CSS v4 via Vite plugin.** Use `@import "tailwindcss"` in CSS. Utility classes in HTML. Custom components in `@layer components`.

4. **No external chart/UI libraries.** The only dependencies are `vite` and `@tailwindcss/vite`. Everything else is vanilla.

5. **Every task status change must call `refreshDashboard()`.** This recalculates ALL stats from IndexedDB, re-renders ALL pie charts, updates ALL summary cards, and refreshes the progress table. This is the core mechanic that eliminates the manual Excel update problem.

6. **Audit every write operation.** Every create, update, delete, status change, assignment, and certification must generate an audit log entry with timestamp, user, action, entity, and field-level changes.

### File Reading Order for Context

When building each phase, the model should read these files for reference:
1. `PRD.md` — Full requirements (this project)
2. `ProjectPlan.md` — Build plan (this file)
3. Secretary's `js/db.js` — IndexedDB pattern to copy
4. Secretary's `js/app.js` — App architecture to follow
5. Secretary's `css/main.css` — Design system to extend
6. Secretary's `index.html` — HTML structure patterns

---

## 11. Verification Plan

### Automated Checks
- `npm run dev` starts without errors
- `npm run build` produces a working `dist/` folder
- All IndexedDB stores create correctly on first load

### Manual Verification
1. **Check Setup:** Create a check with 5+ check types, enter task counts → verify progress table shows all
2. **Pie Charts:** Close 10 tasks in CPCP → verify CPCP pie chart updates AND master total updates
3. **Engineer Assignment:** Assign 20 tasks to Engr. Musa → verify workload view shows 20 assigned
4. **DSR Print:** Click Generate DSR → Print → verify A4 layout matches original Word doc format
5. **Offline:** Disconnect WiFi → add tasks, close tasks → reconnect → verify all data persisted
6. **Audit Trail:** Change task status 5 times → verify audit log shows all 5 changes with timestamps
7. **Backup:** Export JSON backup → Clear all data → Import backup → verify all data restored
