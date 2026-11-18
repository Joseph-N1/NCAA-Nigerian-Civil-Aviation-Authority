// ============================================
// NCAA DOLT License Management System
// Validations Page — js/pages/validations.js
// ============================================

const ValidationsPage = {
  container: null,
  allPersonnel: [],
  allAudits: [],
  allValidations: [],
  processedRecords: [],
  activeToggle: 'all', // 'all', 'current', 'former'
  searchQuery: '',
  categoryFilter: '',
  statusFilter: '',
  currentPage: 1,
  pageSize: 10,
  sortKey: 'surname',
  sortDir: 'asc',

  render(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="page-header stagger-children">
        <div>
          <h2 class="page-title">🛡 License Validations & Approvals</h2>
          <p class="page-subtitle">Cross-category registry of license renewals, clearing doctors, airline histories, and licensing remarks</p>
        </div>
        <div class="no-print assistant-only">
          <button id="btnRecordValidation" class="btn btn-primary">＋ Record Validation</button>
        </div>
      </div>

      <!-- Quick Toggle Bar: All vs Current Airline Staff vs Former Staff -->
      <div class="quick-toggle-container stagger-children no-print" style="margin-bottom: var(--space-4); display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <button type="button" class="btn btn-sm btn-quick-toggle active" data-toggle="all">
          🌐 All Personnel (<span id="countToggleAll">0</span>)
        </button>
        <button type="button" class="btn btn-sm btn-quick-toggle" data-toggle="current">
          ✈ Current Airline Staff (<span id="countToggleCurrent">0</span>)
        </button>
        <button type="button" class="btn btn-sm btn-quick-toggle" data-toggle="former">
          📜 Former / Historical Staff (<span id="countToggleFormer">0</span>)
        </button>
      </div>

      <!-- 4 KPI Metrics Grid -->
      <div class="metrics-grid stagger-children" id="valMetricsGrid">
        <!-- Dynamically injected -->
      </div>

      <!-- Visual Analytics: Compliance Donut & Airline Distribution -->
      <div class="card stagger-children" style="margin-bottom: var(--space-5);">
        <h3 class="card-title">📊 Validation & Operator Intelligence</h3>
        <div class="grid grid-2" style="gap: var(--space-6);">
          <div>
            <h4 style="font-size: var(--font-size-sm); color: var(--color-text-secondary); text-align: center; margin-bottom: var(--space-4);">VALIDATION COMPLIANCE STATUS</h4>
            <div class="chart-container" id="valComplianceChartContainer">
              <!-- SVG injected dynamically -->
            </div>
          </div>
          <div>
            <h4 style="font-size: var(--font-size-sm); color: var(--color-text-secondary); text-align: center; margin-bottom: var(--space-4);">TOP OPERATORS & AIRLINES</h4>
            <div id="valOperatorChartContainer" style="display:flex; flex-direction:column; gap: var(--space-3); margin-top: var(--space-4);">
              <!-- Bars injected dynamically -->
            </div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="personnel-toolbar stagger-children no-print">
        <div class="toolbar-left" style="flex: 2;">
          <div class="form-group" style="margin-bottom: 0; width: 100%;">
            <input type="text" id="valSearchInput" placeholder="Search airline (e.g. Air Peace, Arik), personnel name, license no, or doctor...">
          </div>
        </div>
        <div class="toolbar-right">
          <div class="filter-group">
            <select id="valCategoryFilter">
              <option value="">All Categories</option>
              <option value="PILOT">Pilots</option>
              <option value="CABIN_CREW">Cabin Crew</option>
              <option value="FLIGHT_DISPATCHER">Flight Dispatchers</option>
              <option value="AME">AME Engineers</option>
              <option value="ATC">ATC Controllers</option>
              <option value="ASO">ASO Operators</option>
              <option value="ATSEP">ATSEP Engineers</option>
              <option value="FLIGHT_ENGINEER">Flight Engineers</option>
            </select>
            <select id="valStatusFilter">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active & Valid</option>
              <option value="EXPIRED">Expired</option>
              <option value="critical">Critical (&lt; 30 days)</option>
              <option value="warning">Warning (&lt; 90 days)</option>
            </select>
          </div>
          <button id="btnExportValCSV" class="btn btn-secondary">📥 Export CSV</button>
        </div>
      </div>

      <!-- Table Container -->
      <div id="valTableContainer" class="card" style="padding: 0; overflow: hidden; border-radius: var(--radius-lg);">
        <!-- Injected dynamically -->
      </div>

      <!-- Modal: Record Validation Event -->
      <div id="recordValModalOverlay" class="modal-overlay">
        <div class="modal-container" style="max-width: 650px;">
          <div class="modal-header">
            <h3 class="modal-title">Record License Validation / Renewal</h3>
            <button id="btnRecordValModalClose" class="btn btn-ghost btn-icon">✕</button>
          </div>
          <div class="modal-body">
            <form id="recordValForm">
              <div class="form-group required mb-3">
                <label for="rvPersonnelSelect">Select Personnel</label>
                <select id="rvPersonnelSelect" required class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                  <option value="">-- Choose Personnel --</option>
                </select>
              </div>

              <div class="form-grid-2 mb-3">
                <div class="form-group required">
                  <label for="rvValidationType">Validation Type</label>
                  <select id="rvValidationType" class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                    <option value="RENEWAL">Periodic License Renewal</option>
                    <option value="INITIAL_APPROVAL">Initial Approval</option>
                    <option value="FOREIGN_VALIDATION">Foreign License Validation (FLV)</option>
                    <option value="REVALIDATION">Revalidation / Reinstatement</option>
                  </select>
                </div>
                <div class="form-group required">
                  <label for="rvValidationDate">Validation Date</label>
                  <input type="date" id="rvValidationDate" required class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                </div>
              </div>

              <div class="form-grid-2 mb-3">
                <div class="form-group required">
                  <label for="rvLicenseValidUntil">New License Valid Until</label>
                  <input type="date" id="rvLicenseValidUntil" required class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                </div>
                <div class="form-group">
                  <label for="rvEmployer">Current Airline / Operator</label>
                  <input type="text" id="rvEmployer" placeholder="e.g. Air Peace, Arik, NCAA" class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                </div>
              </div>

              <div class="form-grid-3 mb-3">
                <div class="form-group">
                  <label for="rvMedicalExaminer">Clearing Doctor (AAME)</label>
                  <input type="text" id="rvMedicalExaminer" placeholder="e.g. Dr. Okeke AAME-018" class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                </div>
                <div class="form-group">
                  <label for="rvMedicalClass">Medical Class</label>
                  <select id="rvMedicalClass" class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                    <option value="">Keep Existing</option>
                    <option value="Class 1">Class 1</option>
                    <option value="Class 2">Class 2</option>
                    <option value="Class 3">Class 3</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="rvMedicalValidUntil">Medical Valid Until</label>
                  <input type="date" id="rvMedicalValidUntil" class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);">
                </div>
              </div>

              <div class="form-group mb-3">
                <label for="rvRemarks">Licensing Remarks / Conditions</label>
                <textarea id="rvRemarks" rows="2" placeholder="e.g. Renewal approved following recurrent training and simulator check." class="form-control" style="width:100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);"></textarea>
              </div>

              <div class="modal-footer" style="padding: var(--space-3) 0 0 0; display:flex; justify-content: flex-end; gap: var(--space-3);">
                <button type="button" id="btnCancelRecordVal" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Validation Record</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal: Validation Dossier & Career Timeline -->
      <div id="valDossierOverlay" class="modal-overlay">
        <div class="modal-container" style="max-width: 750px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h3 class="modal-title">📋 Validation Dossier & Historical Timeline</h3>
            <button id="btnDossierClose" class="btn btn-ghost btn-icon">✕</button>
          </div>
          <div class="modal-body" id="valDossierBody">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>
    `;

    this.init();
  },

  async init() {
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    // Quick Toggle buttons
    const toggles = this.container.querySelectorAll('.btn-quick-toggle');
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        toggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeToggle = btn.getAttribute('data-toggle');
        this.currentPage = 1;
        this.renderTable();
      });
    });

    // Search bar
    const searchInput = document.getElementById('valSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.currentPage = 1;
        this.renderTable();
      });
    }

    // Category filter
    const catFilter = document.getElementById('valCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        this.categoryFilter = e.target.value;
        this.currentPage = 1;
        this.renderTable();
      });
    }

    // Status filter
    const statusFilter = document.getElementById('valStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.currentPage = 1;
        this.renderTable();
      });
    }

    // Export CSV
    const btnExport = document.getElementById('btnExportValCSV');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportCSV());
    }

    // Record Validation button (Assistant)
    const btnRecord = document.getElementById('btnRecordValidation');
    const modalOverlay = document.getElementById('recordValModalOverlay');
    const btnModalClose = document.getElementById('btnRecordValModalClose');
    const btnCancel = document.getElementById('btnCancelRecordVal');

    if (btnRecord && modalOverlay) {
      btnRecord.addEventListener('click', () => {
        if (!window.Auth.hasWriteAccess()) {
          window.Toast.warning('Access Restricted', 'Only Assistants have permission to record validations.');
          return;
        }
        this.openRecordModal();
      });
    }

    if (btnModalClose && modalOverlay) {
      btnModalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
    }
    if (btnCancel && modalOverlay) {
      btnCancel.addEventListener('click', () => modalOverlay.classList.remove('active'));
    }

    // Record validation form submission
    const form = document.getElementById('recordValForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRecordValidationSubmit();
      });
    }

    // Dossier close
    const btnDossierClose = document.getElementById('btnDossierClose');
    const dossierOverlay = document.getElementById('valDossierOverlay');
    if (btnDossierClose && dossierOverlay) {
      btnDossierClose.addEventListener('click', () => dossierOverlay.classList.remove('active'));
    }
    if (dossierOverlay) {
      dossierOverlay.addEventListener('click', (e) => {
        if (e.target === dossierOverlay) dossierOverlay.classList.remove('active');
      });
    }
  },

  async loadData() {
    try {
      this.allPersonnel = await window.DB.getAllPersonnel();
      this.allAudits = window.DB.getAllAudits ? await window.DB.getAllAudits() : [];
      this.allValidations = window.DB.getAllValidations ? await window.DB.getAllValidations() : [];

      this.processPersonnelRecords();
      this.renderMetrics();
      this.renderCharts();
      this.renderTable();
      this.populatePersonnelSelect();
    } catch (err) {
      console.error('Error loading validations data:', err);
      if (window.Toast) window.Toast.error('Load Error', 'Failed to retrieve validations records.');
    }
  },

  processPersonnelRecords() {
    const auditsByPersonnel = {};
    this.allAudits.forEach(a => {
      const pid = a.personnelId;
      if (!auditsByPersonnel[pid]) auditsByPersonnel[pid] = [];
      auditsByPersonnel[pid].push(a);
    });

    const validationsByPersonnel = {};
    this.allValidations.forEach(v => {
      const pid = v.personnelId;
      if (!validationsByPersonnel[pid]) validationsByPersonnel[pid] = [];
      validationsByPersonnel[pid].push(v);
    });

    this.processedRecords = this.allPersonnel.map(p => {
      const pAudits = auditsByPersonnel[p.id] || [];
      const pVals = validationsByPersonnel[p.id] || [];

      // 1. Reconstruct Previous Employers from Audit Trail & Validations
      const previousEmployersSet = new Set();
      pAudits.forEach(a => {
        if (a.fieldChanged === 'employerOrganisation' && a.oldValue) {
          try {
            const parsed = JSON.parse(a.oldValue);
            if (parsed && typeof parsed === 'string' && parsed.trim() && parsed !== p.employerOrganisation) {
              previousEmployersSet.add(parsed.trim());
            }
          } catch (e) {
            if (a.oldValue && a.oldValue !== p.employerOrganisation) previousEmployersSet.add(String(a.oldValue).replace(/"/g, '').trim());
          }
        }
      });

      pVals.forEach(v => {
        if (v.previousEmployer && v.previousEmployer !== p.employerOrganisation) {
          previousEmployersSet.add(v.previousEmployer.trim());
        }
      });

      const previousEmployers = Array.from(previousEmployersSet);

      // 2. Compute Validation / Renewal Counts
      // A personnel record has an initial approval if dateOfFirstIssue exists
      let renewalCount = 0;
      let initialCount = p.dateOfFirstIssue ? 1 : 0;

      // Count renewals recorded in validations table
      const recordedRenewals = pVals.filter(v => v.validationType === 'RENEWAL' || v.validationType === 'REVALIDATION').length;
      
      // Count renewals in audit logs (changes to dateOfLastRenewal or licenseValidUntil)
      const auditRenewalChanges = pAudits.filter(a => a.fieldChanged === 'dateOfLastRenewal' || a.fieldChanged === 'validation_recorded').length;

      // If p.dateOfLastRenewal exists and is different from dateOfFirstIssue, that's at least 1 renewal
      const hasDistinctRenewal = p.dateOfLastRenewal && p.dateOfLastRenewal !== p.dateOfFirstIssue;
      renewalCount = Math.max(recordedRenewals, auditRenewalChanges, hasDistinctRenewal ? 1 : 0);

      const totalValidationsCount = initialCount + renewalCount;

      // 3. Expiry and Urgency
      const urgency = window.DateUtils ? window.DateUtils.getExpiryUrgency(p.licenseValidUntil) : 'none';
      const medUrgency = window.DateUtils ? window.DateUtils.getExpiryUrgency(p.medicalValidUntil) : 'none';

      // 4. Combined searchable string
      const searchTerms = [
        p.surname,
        p.firstName,
        p.middleName,
        p.licenseNumber,
        p.category,
        p.employerOrganisation,
        ...previousEmployers,
        p.medicalExaminer,
        p.remarks,
        p.medicalClass
      ].filter(Boolean).join(' ').toLowerCase();

      return {
        ...p,
        previousEmployers,
        allEmployers: [p.employerOrganisation, ...previousEmployers].filter(Boolean),
        renewalCount,
        initialCount,
        totalValidationsCount,
        urgency,
        medUrgency,
        pAudits,
        pVals,
        searchTerms
      };
    });

    // Update Quick Toggle Badge counts
    const totalAll = this.processedRecords.length;
    const totalCurrent = this.processedRecords.filter(r => r.employerOrganisation && r.employerOrganisation.trim() !== '').length;
    const totalFormer = this.processedRecords.filter(r => r.previousEmployers.length > 0).length;

    const elAll = document.getElementById('countToggleAll');
    const elCurr = document.getElementById('countToggleCurrent');
    const elForm = document.getElementById('countToggleFormer');
    if (elAll) elAll.textContent = totalAll;
    if (elCurr) elCurr.textContent = totalCurrent;
    if (elForm) elForm.textContent = totalFormer;
  },

  renderMetrics() {
    const container = document.getElementById('valMetricsGrid');
    if (!container) return;

    const totalRecords = this.processedRecords.length;
    const totalValidations = this.processedRecords.reduce((sum, r) => sum + r.totalValidationsCount, 0);
    const totalActive = this.processedRecords.filter(r => r.licenseStatus === 'ACTIVE' && r.urgency !== 'expired').length;
    const totalMedCleared = this.processedRecords.filter(r => r.medicalExaminer && r.medUrgency !== 'expired').length;

    // Unique operators
    const operatorSet = new Set();
    this.processedRecords.forEach(r => {
      r.allEmployers.forEach(emp => {
        if (emp && emp.trim()) operatorSet.add(emp.trim());
      });
    });

    container.innerHTML = `
      <div class="metric-card total">
        <div class="metric-icon">VAL</div>
        <div class="metric-content">
          <div class="metric-label">Validations & Approvals</div>
          <div class="metric-value">${totalValidations}</div>
          <div class="metric-footer">Across ${totalRecords} personnel files</div>
        </div>
      </div>
      <div class="metric-card active">
        <div class="metric-icon">OK</div>
        <div class="metric-content">
          <div class="metric-label">Active & Compliant</div>
          <div class="metric-value">${totalActive}</div>
          <div class="metric-footer">Currently verified for flight duty</div>
        </div>
      </div>
      <div class="metric-card warning">
        <div class="metric-icon">MED</div>
        <div class="metric-content">
          <div class="metric-label">Medicals Cleared</div>
          <div class="metric-value">${totalMedCleared}</div>
          <div class="metric-footer">Certified by Authorised Doctors</div>
        </div>
      </div>
      <div class="metric-card alert">
        <div class="metric-icon">AIR</div>
        <div class="metric-content">
          <div class="metric-label">Operators & Airlines</div>
          <div class="metric-value">${operatorSet.size}</div>
          <div class="metric-footer">Commercial & private operators</div>
        </div>
      </div>
    `;
  },

  renderCharts() {
    // 1. Donut Chart for Compliance Status
    const activeCount = this.processedRecords.filter(r => r.licenseStatus === 'ACTIVE' && r.urgency !== 'expired' && r.urgency !== 'critical').length;
    const criticalCount = this.processedRecords.filter(r => r.urgency === 'critical').length;
    const expiredCount = this.processedRecords.filter(r => r.urgency === 'expired' || r.licenseStatus === 'EXPIRED').length;
    const total = activeCount + criticalCount + expiredCount || 1;

    const activePct = (activeCount / total) * 100;
    const criticalPct = (criticalCount / total) * 100;
    const expiredPct = (expiredCount / total) * 100;

    const complianceContainer = document.getElementById('valComplianceChartContainer');
    if (complianceContainer) {
      if (this.processedRecords.length === 0) {
        complianceContainer.innerHTML = `<span style="color:var(--color-text-muted);font-size:var(--font-size-sm);">No data available</span>`;
      } else {
        const r = 50;
        const circ = 2 * Math.PI * r;
        const activeStroke = circ * (activePct / 100);
        const criticalStroke = circ * (criticalPct / 100);
        const expiredStroke = circ * (expiredPct / 100);

        complianceContainer.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:center; gap:var(--space-5); flex-wrap:wrap;">
            <div style="position:relative; width:130px; height:130px;">
              <svg width="130" height="130" viewBox="0 0 120 120" style="transform: rotate(-90deg);">
                <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" />
                <circle cx="60" cy="60" r="${r}" fill="none" stroke="#2ed573" stroke-width="12"
                  stroke-dasharray="${activeStroke} ${circ}" stroke-dashoffset="0" />
                <circle cx="60" cy="60" r="${r}" fill="none" stroke="#ffa502" stroke-width="12"
                  stroke-dasharray="${criticalStroke} ${circ}" stroke-dashoffset="${-activeStroke}" />
                <circle cx="60" cy="60" r="${r}" fill="none" stroke="#ff4757" stroke-width="12"
                  stroke-dasharray="${expiredStroke} ${circ}" stroke-dashoffset="${-(activeStroke + criticalStroke)}" />
              </svg>
              <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <span style="font-size:var(--font-size-lg); font-weight:var(--font-weight-bold); color:var(--color-text-primary);">${this.processedRecords.length}</span>
                <span style="font-size:10px; color:var(--color-text-muted); text-transform:uppercase;">TOTAL</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:var(--space-2); font-size:var(--font-size-xs);">
              <div style="display:flex; align-items:center; gap:var(--space-2);">
                <span style="width:10px; height:10px; border-radius:50%; background:#2ed573;"></span>
                <span>Active / Compliant: <strong>${activeCount}</strong> (${Math.round(activePct)}%)</span>
              </div>
              <div style="display:flex; align-items:center; gap:var(--space-2);">
                <span style="width:10px; height:10px; border-radius:50%; background:#ffa502;"></span>
                <span>Expiring &lt;30 Days: <strong>${criticalCount}</strong> (${Math.round(criticalPct)}%)</span>
              </div>
              <div style="display:flex; align-items:center; gap:var(--space-2);">
                <span style="width:10px; height:10px; border-radius:50%; background:#ff4757;"></span>
                <span>Expired / Overdue: <strong>${expiredCount}</strong> (${Math.round(expiredPct)}%)</span>
              </div>
            </div>
          </div>
        `;
      }
    }

    // 2. Top Operators Bar Chart
    const operatorCounts = {};
    this.processedRecords.forEach(r => {
      const current = r.employerOrganisation ? r.employerOrganisation.trim() : 'Unassigned / Private';
      operatorCounts[current] = (operatorCounts[current] || 0) + 1;
    });

    const sortedOperators = Object.entries(operatorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const maxOpCount = sortedOperators.length > 0 ? sortedOperators[0][1] : 1;

    const opContainer = document.getElementById('valOperatorChartContainer');
    if (opContainer) {
      if (sortedOperators.length === 0) {
        opContainer.innerHTML = `<span style="color:var(--color-text-muted);font-size:var(--font-size-sm);">No operator data</span>`;
      } else {
        opContainer.innerHTML = sortedOperators.map(([opName, count]) => {
          const pct = Math.round((count / maxOpCount) * 100);
          return `
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; font-size:var(--font-size-xs); color:var(--color-text-secondary);">
                <span style="font-weight:var(--font-weight-medium); color:var(--color-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:200px;">${opName}</span>
                <span><strong>${count}</strong> personnel</span>
              </div>
              <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--color-accent-teal), var(--color-accent-teal-light)); border-radius:4px; transition:width 0.6s ease;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  getFilteredRecords() {
    let list = [...this.processedRecords];

    // 1. Quick Toggle Filter
    if (this.activeToggle === 'current') {
      list = list.filter(r => r.employerOrganisation && r.employerOrganisation.trim() !== '');
    } else if (this.activeToggle === 'former') {
      list = list.filter(r => r.previousEmployers.length > 0);
    }

    // 2. Search Query (Airline, Name, License, Doctor)
    if (this.searchQuery) {
      list = list.filter(r => r.searchTerms.includes(this.searchQuery));
    }

    // 3. Category Filter
    if (this.categoryFilter) {
      list = list.filter(r => r.category === this.categoryFilter);
    }

    // 4. Status Filter
    if (this.statusFilter) {
      if (this.statusFilter === 'ACTIVE') {
        list = list.filter(r => r.licenseStatus === 'ACTIVE' && r.urgency !== 'expired');
      } else if (this.statusFilter === 'EXPIRED') {
        list = list.filter(r => r.licenseStatus === 'EXPIRED' || r.urgency === 'expired');
      } else if (this.statusFilter === 'critical') {
        list = list.filter(r => r.urgency === 'critical');
      } else if (this.statusFilter === 'warning') {
        list = list.filter(r => r.urgency === 'warning');
      }
    }

    // 5. Sorting
    list.sort((a, b) => {
      let valA = a[this.sortKey];
      let valB = b[this.sortKey];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA === undefined || valA === null) return this.sortDir === 'asc' ? 1 : -1;
      if (valB === undefined || valB === null) return this.sortDir === 'asc' ? -1 : 1;

      if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  },

  renderTable() {
    const container = document.getElementById('valTableContainer');
    if (!container) return;

    const filtered = this.getFilteredRecords();
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const pageRecords = filtered.slice(startIdx, startIdx + this.pageSize);

    if (totalRecords === 0) {
      container.innerHTML = `
        <div style="padding: var(--space-8); text-align: center; color: var(--color-text-muted);">
          <div style="font-size: 2rem; margin-bottom: var(--space-2);">🔍</div>
          <h4>No matching validation records found</h4>
          <p style="font-size: var(--font-size-sm); margin-top: var(--space-2);">Try adjusting your airline search query or clear active filters.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: var(--space-3) var(--space-4); text-align: left; cursor: pointer;" data-sort="surname">Personnel & Category</th>
              <th style="padding: var(--space-3) var(--space-4); text-align: left; cursor: pointer;" data-sort="employerOrganisation">Airline / Operator</th>
              <th style="padding: var(--space-3) var(--space-4); text-align: center; cursor: pointer;" data-sort="totalValidationsCount">Validations</th>
              <th style="padding: var(--space-3) var(--space-4); text-align: left; cursor: pointer;" data-sort="licenseValidUntil">Validity & Expiry</th>
              <th style="padding: var(--space-3) var(--space-4); text-align: left;">Medical Clearance</th>
              <th style="padding: var(--space-3) var(--space-4); text-align: left;">Remarks</th>
              <th style="padding: var(--space-3) var(--space-4); text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    pageRecords.forEach(r => {
      const photoURL = r.passportPhoto
        ? (typeof r.passportPhoto === 'string' ? r.passportPhoto : URL.createObjectURL(r.passportPhoto))
        : null;

      const formattedExpiry = window.DateUtils ? window.DateUtils.formatDate(r.licenseValidUntil) : (r.licenseValidUntil || 'N/A');
      const formattedRenewal = window.DateUtils ? window.DateUtils.formatDate(r.dateOfLastRenewal) : (r.dateOfLastRenewal || 'N/A');
      const formattedMedical = window.DateUtils ? window.DateUtils.formatDate(r.medicalValidUntil) : (r.medicalValidUntil || 'N/A');

      const isCurrentSearchMatch = this.searchQuery && (r.employerOrganisation || '').toLowerCase().includes(this.searchQuery);
      const isPastSearchMatch = this.searchQuery && r.previousEmployers.some(e => e.toLowerCase().includes(this.searchQuery));

      // Employer cell representation
      let employerHtml = '';
      if (r.employerOrganisation) {
        employerHtml = `
          <div style="font-weight: var(--font-weight-medium); color: var(--color-text-primary); display: flex; align-items: center; gap: 6px;">
            <span>${r.employerOrganisation}</span>
            <span class="badge badge-active" style="font-size: 10px; padding: 2px 6px;">Current</span>
          </div>
        `;
      } else {
        employerHtml = `<span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">None Recorded</span>`;
      }

      if (r.previousEmployers.length > 0) {
        employerHtml += `
          <div style="margin-top: 4px; font-size: 11px; color: var(--color-text-muted);">
            <strong>Past:</strong> ${r.previousEmployers.map(e => `<span style="text-decoration: line-through; opacity: 0.8;">${e}</span>`).join(', ')}
          </div>
        `;
      }

      // Medical cell
      let medHtml = '';
      if (r.medicalExaminer) {
        const medBadge = r.medUrgency === 'expired'
          ? '<span class="badge badge-expired" style="font-size:10px;">Expired</span>'
          : (r.medUrgency === 'critical' ? '<span class="badge badge-warning" style="font-size:10px;">Expiring</span>' : '<span class="badge badge-active" style="font-size:10px;">Cleared</span>');

        medHtml = `
          <div style="font-size: var(--font-size-xs); line-height: 1.4;">
            <div style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">${r.medicalExaminer}</div>
            <div style="color: var(--color-text-secondary);">${r.medicalClass || 'Class 1'} — ${formattedMedical} ${medBadge}</div>
          </div>
        `;
      } else {
        medHtml = `<span style="color: var(--color-text-muted); font-size: var(--font-size-xs);">No Doctor Logged</span>`;
      }

      // Expiry cell
      const expiryBadge = r.urgency === 'expired'
        ? '<span class="badge badge-expired" style="font-size:10px;">Expired</span>'
        : (r.urgency === 'critical' ? '<span class="badge badge-warning" style="font-size:10px;">Critical (&lt;30d)</span>' : '<span class="badge badge-active" style="font-size:10px;">Valid</span>');

      // Remarks cell
      const remarksText = r.remarks ? (r.remarks.length > 45 ? r.remarks.substring(0, 42) + '...' : r.remarks) : '<span style="color:var(--color-text-muted); font-style:italic;">None</span>';

      html += `
        <tr style="border-top: 1px solid var(--color-border); transition: background var(--transition-fast);">
          <td style="padding: var(--space-3) var(--space-4);">
            <div class="table-user-cell" style="display: flex; align-items: center; gap: var(--space-3);">
              ${photoURL 
                ? `<img class="expiry-alert-avatar" src="${photoURL}" alt="" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">`
                : `<div class="expiry-alert-placeholder" style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--color-bg-secondary); font-size: var(--font-size-xs); font-weight: bold;">${(r.firstName || 'U').charAt(0)}${(r.surname || 'P').charAt(0)}</div>`
              }
              <div>
                <div class="table-user-name" style="font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">${(r.surname || '').toUpperCase()}, ${r.firstName || ''}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: flex; gap: var(--space-2); align-items: center; margin-top: 2px;">
                  <span>${r.licenseNumber}</span>
                  <span class="badge badge-info" style="font-size: 9px; padding: 1px 5px;">${r.category}</span>
                </div>
              </div>
            </div>
          </td>
          <td style="padding: var(--space-3) var(--space-4);">
            ${employerHtml}
          </td>
          <td style="padding: var(--space-3) var(--space-4); text-align: center;">
            <span class="badge badge-active" style="font-size: var(--font-size-xs); padding: 4px 8px; border-radius: 12px;" title="Initial Issue + ${r.renewalCount} Renewals">
              ${r.totalValidationsCount}x Validated
            </span>
            <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 3px;">
              ${r.renewalCount > 0 ? `${r.renewalCount} renewal${r.renewalCount > 1 ? 's' : ''}` : 'First issue only'}
            </div>
          </td>
          <td style="padding: var(--space-3) var(--space-4);">
            <div style="font-size: var(--font-size-xs);">
              <div style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">${formattedExpiry} ${expiryBadge}</div>
              <div style="color: var(--color-text-muted); margin-top: 2px;">Last Renewal: ${formattedRenewal}</div>
            </div>
          </td>
          <td style="padding: var(--space-3) var(--space-4);">
            ${medHtml}
          </td>
          <td style="padding: var(--space-3) var(--space-4); font-size: var(--font-size-xs); color: var(--color-text-secondary); max-width: 180px;" title="${r.remarks || ''}">
            ${remarksText}
          </td>
          <td style="padding: var(--space-3) var(--space-4); text-align: center;">
            <button class="btn btn-secondary btn-sm btn-view-dossier" data-id="${r.id}" style="padding: 4px 10px; font-size: 11px;">
              📋 Dossier
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-5); border-top: 1px solid var(--color-border); background: var(--color-bg-secondary); flex-wrap: wrap; gap: var(--space-3);">
        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
          Showing <strong>${startIdx + 1}</strong> to <strong>${Math.min(startIdx + this.pageSize, totalRecords)}</strong> of <strong>${totalRecords}</strong> records
        </div>
        <div style="display: flex; gap: var(--space-2); align-items: center;">
          <button id="btnValPrev" class="btn btn-secondary btn-sm" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-primary);">Page <strong>${this.currentPage}</strong> of <strong>${totalPages}</strong></span>
          <button id="btnValNext" class="btn btn-secondary btn-sm" ${this.currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach row button events
    container.querySelectorAll('.btn-view-dossier').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        this.showDossier(id);
      });
    });

    // Pagination events
    const btnPrev = document.getElementById('btnValPrev');
    const btnNext = document.getElementById('btnValNext');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTable();
        }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderTable();
        }
      });
    }

    // Table header sort
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (this.sortKey === key) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortKey = key;
          this.sortDir = 'asc';
        }
        this.renderTable();
      });
    });
  },

  showDossier(personnelId) {
    const record = this.processedRecords.find(r => r.id === personnelId);
    if (!record) return;

    const overlay = document.getElementById('valDossierOverlay');
    const body = document.getElementById('valDossierBody');
    if (!overlay || !body) return;

    const photoURL = record.passportPhoto
      ? (typeof record.passportPhoto === 'string' ? record.passportPhoto : URL.createObjectURL(record.passportPhoto))
      : null;

    const formattedDob = window.DateUtils ? window.DateUtils.formatDate(record.dateOfBirth) : record.dateOfBirth;
    const formattedIssue = window.DateUtils ? window.DateUtils.formatDate(record.dateOfFirstIssue) : record.dateOfFirstIssue;
    const formattedRenewal = window.DateUtils ? window.DateUtils.formatDate(record.dateOfLastRenewal) : record.dateOfLastRenewal;
    const formattedExpiry = window.DateUtils ? window.DateUtils.formatDate(record.licenseValidUntil) : record.licenseValidUntil;
    const formattedMedical = window.DateUtils ? window.DateUtils.formatDate(record.medicalValidUntil) : record.medicalValidUntil;

    // Timeline entries
    const timeline = [];

    // 1. First issue event
    if (record.dateOfFirstIssue) {
      timeline.push({
        date: record.dateOfFirstIssue,
        title: 'Initial License Issuance & Approval',
        badge: 'FIRST ISSUE',
        badgeClass: 'badge-active',
        desc: `NCAA issued official ${record.category} license (${record.licenseType || record.licenseNumber}).`,
        officer: record.createdBy || 'Licensing Directorate'
      });
    }

    // 2. Audit Trail Events
    record.pAudits.forEach(a => {
      if (a.fieldChanged === 'validation_recorded') {
        try {
          const v = JSON.parse(a.newValue);
          timeline.push({
            date: v.validationDate || a.timestamp.split('T')[0],
            title: `Recorded Validation: ${v.validationType || 'RENEWAL'}`,
            badge: v.validationType || 'RENEWAL',
            badgeClass: 'badge-active',
            desc: `Operator: <strong>${v.employer || 'Unassigned'}</strong> | Medical Doctor: <strong>${v.medicalExaminer || 'None'}</strong> | Valid Until: <strong>${v.licenseValidUntil}</strong><br><em>Remarks: ${v.remarks || 'None'}</em>`,
            officer: a.changedBy || 'Licensing Desk'
          });
        } catch (e) {}
      } else if (a.fieldChanged === 'dateOfLastRenewal') {
        timeline.push({
          date: a.newValue ? a.newValue.replace(/"/g, '') : a.timestamp.split('T')[0],
          title: 'Periodic License Renewal Approved',
          badge: 'RENEWAL',
          badgeClass: 'badge-active',
          desc: `License renewal processed. Previous renewal date: ${a.oldValue || 'None'}.`,
          officer: a.changedBy || 'Licensing Desk'
        });
      } else if (a.fieldChanged === 'employerOrganisation') {
        timeline.push({
          date: a.timestamp ? a.timestamp.split('T')[0] : 'Historical',
          title: 'Employer Transition Recorded',
          badge: 'OPERATOR CHANGE',
          badgeClass: 'badge-info',
          desc: `Transferred from <strong>${a.oldValue ? String(a.oldValue).replace(/"/g, '') : 'Previous'}</strong> to <strong>${a.newValue ? String(a.newValue).replace(/"/g, '') : 'Current'}</strong>.`,
          officer: a.changedBy || 'Licensing Desk'
        });
      } else if (a.fieldChanged === 'medicalExaminer' || a.fieldChanged === 'medicalValidUntil') {
        timeline.push({
          date: a.timestamp ? a.timestamp.split('T')[0] : 'Historical',
          title: 'Medical Certificate Clearance Updated',
          badge: 'MEDICAL',
          badgeClass: 'badge-warning',
          desc: `Medical clearance updated to ${a.newValue ? String(a.newValue).replace(/"/g, '') : ''}.`,
          officer: a.changedBy || 'Licensing Desk'
        });
      }
    });

    // 3. Fallback: If no audit entries exist, synthesize current state
    if (timeline.length === 0 || (timeline.length === 1 && record.dateOfLastRenewal && record.dateOfLastRenewal !== record.dateOfFirstIssue)) {
      if (record.dateOfLastRenewal && record.dateOfLastRenewal !== record.dateOfFirstIssue) {
        timeline.push({
          date: record.dateOfLastRenewal,
          title: 'Periodic License Renewal Verified',
          badge: 'RENEWAL',
          badgeClass: 'badge-active',
          desc: `Renewed at <strong>${record.employerOrganisation || 'Unassigned'}</strong>. Valid until ${formattedExpiry}.`,
          officer: record.updatedBy || 'Licensing Desk'
        });
      }
    }

    // Sort timeline descending by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = `
      <!-- Personnel Overview Header -->
      <div style="display: flex; gap: var(--space-4); align-items: center; padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-4);">
        ${photoURL
          ? `<img src="${photoURL}" alt="" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-accent-teal);">`
          : `<div style="width: 72px; height: 72px; border-radius: 50%; background: var(--color-bg-secondary); border: 3px solid var(--color-accent-teal); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold;">${(record.firstName || 'U').charAt(0)}${(record.surname || 'P').charAt(0)}</div>`
        }
        <div>
          <h3 style="margin: 0; color: var(--color-text-primary);">${(record.surname || '').toUpperCase()}, ${record.firstName || ''} ${record.middleName || ''}</h3>
          <div style="display: flex; gap: var(--space-2); align-items: center; margin-top: 4px; flex-wrap: wrap;">
            <span style="font-weight: var(--font-weight-bold); color: var(--color-accent-teal);">${record.licenseNumber}</span>
            <span class="badge badge-info">${record.category}</span>
            <span class="badge badge-${record.licenseStatus.toLowerCase()}">${record.licenseStatus}</span>
            <span class="badge badge-active">${record.totalValidationsCount}x Validated</span>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 4px;">
            Current Operator: <strong>${record.employerOrganisation || 'None Assigned'}</strong>
          </div>
        </div>
      </div>

      <!-- Quick Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-5);">
        <div style="background: var(--color-bg-secondary); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <div style="font-size: 10px; color: var(--color-text-muted); text-transform: uppercase;">License Validity</div>
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); color: var(--color-text-primary); margin-top: 2px;">${formattedExpiry}</div>
          <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">First Issued: ${formattedIssue || 'N/A'}</div>
        </div>
        <div style="background: var(--color-bg-secondary); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <div style="font-size: 10px; color: var(--color-text-muted); text-transform: uppercase;">Clearing Doctor</div>
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); color: var(--color-text-primary); margin-top: 2px;">${record.medicalExaminer || 'None Logged'}</div>
          <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">${record.medicalClass || 'Class 1'} (exp. ${formattedMedical})</div>
        </div>
        <div style="background: var(--color-bg-secondary); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <div style="font-size: 10px; color: var(--color-text-muted); text-transform: uppercase;">Operator History</div>
          <div style="font-weight: var(--font-weight-bold); font-size: var(--font-size-sm); color: var(--color-text-primary); margin-top: 2px;">${record.previousEmployers.length > 0 ? `${record.previousEmployers.length} Previous` : 'Single Operator'}</div>
          <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">${record.previousEmployers.join(', ') || 'No prior airlines'}</div>
        </div>
      </div>

      <!-- Chronological Timeline -->
      <h4 style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-secondary); margin-bottom: var(--space-4);">📜 Complete Historical Dossier</h4>
      <div class="timeline" style="position: relative; padding-left: 28px; border-left: 2px solid var(--color-border);">
    `;

    timeline.forEach(item => {
      html += `
        <div style="position: relative; margin-bottom: var(--space-4);">
          <div style="position: absolute; left: -35px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--color-accent-teal); border: 2px solid var(--color-bg-primary);"></div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px;">
            <strong style="color: var(--color-text-primary); font-size: var(--font-size-sm);">${item.title}</strong>
            <span style="font-size: 11px; color: var(--color-text-muted);">${window.DateUtils ? window.DateUtils.formatDate(item.date) : item.date}</span>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 3px; line-height: 1.4;">
            ${item.desc}
          </div>
          <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 2px;">
            Authorised By: <strong>${item.officer}</strong>
          </div>
        </div>
      `;
    });

    html += `
      </div>

      <!-- Limitations & Permanent Remarks -->
      <div style="margin-top: var(--space-4); padding: var(--space-3); background: rgba(0,0,0,0.15); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-xs); line-height: 1.5;">
        <strong>Official Limitations:</strong> ${record.limitations || 'None'}<br>
        <strong>Internal Remarks:</strong> ${record.remarks || 'None'}
      </div>
    `;

    body.innerHTML = html;
    overlay.classList.add('active');
  },

  populatePersonnelSelect() {
    const select = document.getElementById('rvPersonnelSelect');
    if (!select) return;

    select.innerHTML = `<option value="">-- Choose Personnel --</option>` +
      this.processedRecords.map(p => `
        <option value="${p.id}" data-category="${p.category}" data-employer="${p.employerOrganisation || ''}" data-doctor="${p.medicalExaminer || ''}" data-medclass="${p.medicalClass || ''}">
          ${(p.surname || '').toUpperCase()}, ${p.firstName || ''} (${p.licenseNumber}) — ${p.category} [${p.employerOrganisation || 'Unassigned'}]
        </option>
      `).join('');

    select.addEventListener('change', (e) => {
      const selectedId = Number(e.target.value);
      const person = this.processedRecords.find(p => p.id === selectedId);
      if (!person) return;

      const empInput = document.getElementById('rvEmployer');
      const docInput = document.getElementById('rvMedicalExaminer');
      const medClassInput = document.getElementById('rvMedicalClass');
      const expInput = document.getElementById('rvLicenseValidUntil');

      if (empInput) empInput.value = person.employerOrganisation || '';
      if (docInput) docInput.value = person.medicalExaminer || '';
      if (medClassInput && person.medicalClass) medClassInput.value = person.medicalClass;
      if (expInput && person.licenseValidUntil) expInput.value = person.licenseValidUntil.split('T')[0];
    });
  },

  openRecordModal() {
    const modal = document.getElementById('recordValModalOverlay');
    const form = document.getElementById('recordValForm');
    if (!modal) return;

    if (form) form.reset();
    const dateInput = document.getElementById('rvValidationDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    modal.classList.add('active');
  },

  async handleRecordValidationSubmit() {
    const select = document.getElementById('rvPersonnelSelect');
    const personnelId = select ? select.value : '';
    if (!personnelId) {
      window.Toast.error('Validation Error', 'Please select a personnel member.');
      return;
    }

    const validationType = document.getElementById('rvValidationType').value;
    const validationDate = document.getElementById('rvValidationDate').value;
    const licenseValidUntil = document.getElementById('rvLicenseValidUntil').value;
    const employer = document.getElementById('rvEmployer').value.trim();
    const medicalExaminer = document.getElementById('rvMedicalExaminer').value.trim();
    const medicalClass = document.getElementById('rvMedicalClass').value;
    const medicalValidUntil = document.getElementById('rvMedicalValidUntil').value;
    const remarks = document.getElementById('rvRemarks').value.trim();

    const currentUser = window.Auth ? window.Auth.getUser() : null;
    const username = currentUser ? currentUser.username : 'Licensing Desk';

    try {
      const valPayload = {
        validationType,
        validationDate,
        licenseValidUntil,
        employer,
        medicalExaminer,
        medicalClass,
        medicalValidUntil,
        remarks
      };

      await window.DB.recordValidation(personnelId, valPayload, username);

      window.Toast.success('Validation Recorded', `Validation successfully recorded and personnel record updated.`);
      document.getElementById('recordValModalOverlay').classList.remove('active');

      await this.loadData();
    } catch (err) {
      console.error(err);
      window.Toast.error('Submission Failed', err.message);
    }
  },

  exportCSV() {
    const filtered = this.getFilteredRecords();
    if (filtered.length === 0) {
      window.Toast.warning('Export Empty', 'No records to export under current filters.');
      return;
    }

    const headers = [
      'License Number',
      'Category',
      'Surname',
      'First Name',
      'Current Employer',
      'Previous Employers',
      'Validations Count',
      'Renewals Count',
      'Date of First Issue',
      'Date of Last Renewal',
      'License Valid Until',
      'License Status',
      'Clearing Doctor',
      'Medical Class',
      'Medical Valid Until',
      'Remarks'
    ];

    const rows = filtered.map(r => [
      `"${r.licenseNumber || ''}"`,
      `"${r.category || ''}"`,
      `"${r.surname || ''}"`,
      `"${r.firstName || ''}"`,
      `"${r.employerOrganisation || ''}"`,
      `"${r.previousEmployers.join('; ')}"`,
      r.totalValidationsCount,
      r.renewalCount,
      `"${r.dateOfFirstIssue || ''}"`,
      `"${r.dateOfLastRenewal || ''}"`,
      `"${r.licenseValidUntil || ''}"`,
      `"${r.licenseStatus || ''}"`,
      `"${r.medicalExaminer || ''}"`,
      `"${r.medicalClass || ''}"`,
      `"${r.medicalValidUntil || ''}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const date = new Date().toISOString().split('T')[0];
    const filename = `NCAA_DOLT_Validations_${date}.csv`;

    if (window.ExportUtils && window.ExportUtils.saveBlobWithPicker) {
      window.ExportUtils.saveBlobWithPicker(blob, filename, 'NCAA Validations CSV', 'text/csv', '.csv');
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
};
window.ValidationsPage = ValidationsPage;
