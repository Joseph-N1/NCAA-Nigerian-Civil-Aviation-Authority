// ============================================
// NCAA DOLT License Management System
// Dashboard Page — js/pages/dashboard.js
// ============================================

const DashboardPage = {
  container: null,

  render(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="quick-search-hero animate-fade-in">
        <h2 class="quick-search-title">NCAA Directorate of Licensing (DOLT)</h2>
        <p class="quick-search-subtitle">Search the central personnel repository and manage safety compliance certificates</p>
        <div class="quick-search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="dbHeroSearchInput" placeholder="Enter name or license number...">
        </div>
      </div>

      <!-- Quick Add Section for Assistant Role -->
      <div id="dashboardQuickAddSection" class="hidden animate-fade-in"></div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid stagger-children" id="dbMetricsGrid">
        <!-- Injected dynamically -->
      </div>
 
      <!-- Dashboard Layout Grid -->
      <div class="dashboard-grid stagger-children">
        <!-- Main column -->
        <div class="dashboard-main-col">
          <!-- Charts Section -->
          <div class="card">
            <h3 class="card-title">📊 Database Breakdown</h3>
            <div class="grid grid-2" style="gap: var(--space-6);">
              
              <!-- Expiry Donut Chart -->
              <div>
                <h4 style="font-size: var(--font-size-sm); color: var(--color-text-secondary); text-align: center; margin-bottom: var(--space-4);">LICENSE EXPIRY STATUS</h4>
                <div class="chart-container" id="expiryChartContainer">
                  <!-- SVG injected dynamically -->
                </div>
              </div>

              <!-- Category Bars -->
              <div>
                <h4 style="font-size: var(--font-size-sm); color: var(--color-text-secondary); text-align: center; margin-bottom: var(--space-4);">PERSONNEL BY CATEGORY</h4>
                <div id="categoryChartContainer" style="display:flex; flex-direction:column; gap: var(--space-3); margin-top: var(--space-4);">
                  <!-- Horizontal progress bars injected dynamically -->
                </div>
              </div>

            </div>
          </div>

          <!-- Recent Audit Logs -->
          <div class="card">
            <h3 class="card-title">📝 Recent System Activity</h3>
            <div class="activity-feed" id="dbActivityFeed">
              <!-- Injected dynamically -->
            </div>
          </div>
        </div>

        <!-- Sidebar column -->
        <div class="dashboard-side-col">
          <!-- Expiry Alerts List -->
          <div class="card">
            <h3 class="card-title" style="color: var(--color-danger);">⚠️ Critical Expiry Alerts</h3>
            <div class="expiry-alerts-panel" id="dbExpiryAlertsPanel">
              <!-- Injected dynamically -->
            </div>
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
    const heroSearch = document.getElementById('dbHeroSearchInput');
    const globalSearch = document.getElementById('globalSearchInput');
    
    if (heroSearch && globalSearch) {
      heroSearch.addEventListener('input', (e) => {
        globalSearch.value = e.target.value;
        globalSearch.focus();
        
        // Dispatch keyup/input event to trigger global search autocomplete dropdown
        const event = new Event('input', { bubbles: true });
        globalSearch.dispatchEvent(event);
      });
    }
  },

  async loadData() {
    try {
      const allPersonnel = await window.DB.getAllPersonnel();
      const allAudits = await window.DB.getAllAudits();

      this.renderMetrics(allPersonnel);
      this.renderCharts(allPersonnel);
      this.renderExpiryAlerts(allPersonnel);
      this.renderActivityLogs(allAudits);
      this.renderQuickAddForm();
    } catch (e) {
      console.error(e);
      window.Toast.error('Load Error', 'Failed to refresh dashboard stats.');
    }
  },

  renderQuickAddForm() {
    const quickAddContainer = document.getElementById('dashboardQuickAddSection');
    if (!quickAddContainer) return;

    const hasWrite = window.Auth.hasWriteAccess();
    if (!hasWrite) {
      quickAddContainer.classList.add('hidden');
      return;
    }

    quickAddContainer.classList.remove('hidden');
    quickAddContainer.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-6);">
        <h3 class="card-title">➕ Quick Add Personnel</h3>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-4);">
          Register a new personnel directly into the database.
        </p>
        
        <form id="frmDashboardQuickAdd" class="stagger-children" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); align-items: flex-end;">
          <div class="form-group required">
            <label for="qa_surname">Surname</label>
            <input type="text" id="qa_surname" required placeholder="e.g. Balogun">
          </div>
          <div class="form-group required">
            <label for="qa_firstName">First Name</label>
            <input type="text" id="qa_firstName" required placeholder="e.g. Adebayo">
          </div>
          <div class="form-group required">
            <label for="qa_licenseNumber">License Number</label>
            <input type="text" id="qa_licenseNumber" required placeholder="e.g. NCAA/FCL/P.0100">
          </div>
          <div class="form-group required">
            <label for="qa_category">Classification</label>
            <select id="qa_category" required>
              <option value="">Select Category</option>
              <option value="PILOT">Pilot</option>
              <option value="CABIN_CREW">Cabin Crew</option>
              <option value="FLIGHT_DISPATCHER">Flight Dispatcher</option>
              <option value="AME">AME (Engineer)</option>
              <option value="ATC">ATC (Controller)</option>
              <option value="ASO">ASO (Station Operator)</option>
              <option value="ATSEP">ATSEP (Electronics)</option>
              <option value="FLIGHT_ENGINEER">Flight Engineer</option>
            </select>
          </div>
          <div class="form-group required">
            <label for="qa_licenseType">License Type/Subtype</label>
            <input type="text" id="qa_licenseType" required placeholder="e.g. ATPL, Cabin Crew License, AME-A">
          </div>
          <div class="form-group required">
            <label for="qa_licenseValidUntil">Valid Until</label>
            <input type="date" id="qa_licenseValidUntil" required>
          </div>
          <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: var(--space-2);">
            <button type="submit" class="btn btn-primary">⚡ Register Personnel</button>
          </div>
        </form>
      </div>
    `;

    const form = document.getElementById('frmDashboardQuickAdd');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const surname = document.getElementById('qa_surname').value.trim();
        const firstName = document.getElementById('qa_firstName').value.trim();
        const licenseNumber = document.getElementById('qa_licenseNumber').value.trim();
        const category = document.getElementById('qa_category').value;
        const licenseType = document.getElementById('qa_licenseType').value.trim();
        const licenseValidUntil = document.getElementById('qa_licenseValidUntil').value;

        if (!surname || !firstName || !licenseNumber || !category || !licenseType || !licenseValidUntil) {
          window.Toast.warning('Missing Fields', 'Please fill out all required fields.');
          return;
        }

        try {
          const user = window.Auth.getUser();
          const username = user ? user.username : 'Assistant';

          // Validate formats
          const valLicense = window.Validators.validateLicenseNumber(licenseNumber);
          if (!valLicense.valid) {
            window.Toast.error('Invalid License Number', valLicense.message);
            return;
          }

          const valFuture = window.Validators.validateFutureDate(licenseValidUntil, 'License expiry');
          if (!valFuture.valid) {
            window.Toast.error('Invalid Expiry Date', valFuture.message);
            return;
          }

          // Build minimal record payload
          const recordData = {
            surname,
            firstName,
            licenseNumber,
            licenseType,
            licenseValidUntil,
            licenseStatus: 'ACTIVE'
          };

          // Add category specific defaults
          if (category === 'PILOT') {
            recordData.pilotLicenseSubType = licenseType;
          } else if (category === 'CABIN_CREW') {
            recordData.cabinCrewLicenseType = licenseType;
          } else if (category === 'FLIGHT_DISPATCHER') {
            recordData.dispatcherLicenseType = licenseType;
          } else if (category === 'AME') {
            recordData.ameLicenseCategory = [licenseType];
          } else if (category === 'ASO') {
            recordData.asoLicenseType = licenseType;
          } else if (category === 'FLIGHT_ENGINEER') {
            recordData.feLicenseType = licenseType;
          }

          await window.DB.addPersonnel(category, recordData, username);
          window.Toast.success('Personnel Added', `Successfully registered ${firstName} ${surname} (${licenseNumber})`);
          
          form.reset();
          await this.loadData();
        } catch (error) {
          window.Toast.error('Registration Failed', error.message);
        }
      });
    }
  },

  renderMetrics(all) {
    const active = all.filter(p => p.licenseStatus === 'ACTIVE');
    const expired = all.filter(p => window.DateUtils.getExpiryUrgency(p.licenseValidUntil) === 'expired');
    const critical = all.filter(p => window.DateUtils.getExpiryUrgency(p.licenseValidUntil) === 'critical');

    const container = document.getElementById('dbMetricsGrid');
    if (!container) return;

    container.innerHTML = `
      <div class="metric-card total">
        <div class="metric-icon">NCAA</div>
        <div class="metric-content">
          <div class="metric-label">Total Registered Personnel</div>
          <div class="metric-value">${all.length}</div>
          <div class="metric-footer">Across all 8 NCAA categories</div>
        </div>
      </div>
      <div class="metric-card active">
        <div class="metric-icon">OK</div>
        <div class="metric-content">
          <div class="metric-label">Active Licenses</div>
          <div class="metric-value">${active.length}</div>
          <div class="metric-footer">Currently compliant & certified</div>
        </div>
      </div>
      <div class="metric-card alert">
        <div class="metric-icon">EXP</div>
        <div class="metric-content">
          <div class="metric-label">Expired Licenses</div>
          <div class="metric-value">${expired.length}</div>
          <div class="metric-footer">Immediate action required</div>
        </div>
      </div>
      <div class="metric-card warning">
        <div class="metric-icon">30D</div>
        <div class="metric-content">
          <div class="metric-label">Critical (&lt; 30 days)</div>
          <div class="metric-value">${critical.length}</div>
          <div class="metric-footer">Renewal notices active</div>
        </div>
      </div>
    `;
  },

  renderCharts(all) {
    // 1. Expiry Status Breakdown (Donut Chart)
    const activeCount = all.filter(p => p.licenseStatus === 'ACTIVE').length;
    const expiredCount = all.filter(p => window.DateUtils.getExpiryUrgency(p.licenseValidUntil) === 'expired').length;
    const criticalCount = all.filter(p => window.DateUtils.getExpiryUrgency(p.licenseValidUntil) === 'critical').length;
    const warningCount = all.filter(p => window.DateUtils.getExpiryUrgency(p.licenseValidUntil) === 'warning').length;
    
    const total = activeCount + expiredCount + criticalCount + warningCount || 1;

    const activePct = (activeCount / total) * 100;
    const expiredPct = (expiredCount / total) * 100;
    const criticalPct = (criticalCount / total) * 100;
    const warningPct = (warningCount / total) * 100;

    const expiryContainer = document.getElementById('expiryChartContainer');
    if (expiryContainer) {
      if (all.length === 0) {
        expiryContainer.innerHTML = `<span style="color:var(--color-text-muted);font-size:var(--font-size-sm);">No data available</span>`;
      } else {
        // Draw a clean SVG Donut Chart
        // Circumference is 2 * PI * r = 2 * 3.1415 * 50 = 314.15
        const r = 50;
        const circ = 2 * Math.PI * r;

        const activeStroke = circ * (activePct / 100);
        const expiredStroke = circ * (expiredPct / 100);
        const criticalStroke = circ * (criticalPct / 100);
        const warningStroke = circ * (warningPct / 100);

        let currentOffset = 0;

        expiryContainer.innerHTML = `
          <div style="position:relative; width: 140px; height: 140px;">
            <svg viewBox="0 0 120 120" style="transform: rotate(-90deg); width: 100%; height: 100%;">
              <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--color-bg-tertiary)" stroke-width="12" />
              
              <!-- Active -->
              <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--color-success)" stroke-width="12"
                stroke-dasharray="${activeStroke} ${circ}" stroke-dashoffset="${-currentOffset}" />
              
              <!-- Critical -->
              <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--color-warning)" stroke-width="12"
                stroke-dasharray="${criticalStroke} ${circ}" stroke-dashoffset="${-(currentOffset += activeStroke)}" />

              <!-- Warning -->
              <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--color-accent-amber-light)" stroke-width="12"
                stroke-dasharray="${warningStroke} ${circ}" stroke-dashoffset="${-(currentOffset += criticalStroke)}" />

              <!-- Expired -->
              <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="var(--color-danger)" stroke-width="12"
                stroke-dasharray="${expiredStroke} ${circ}" stroke-dashoffset="${-(currentOffset += warningStroke)}" />
            </svg>
            <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <span style="font-size:var(--font-size-xl); font-weight:bold; color:var(--color-text-primary);">${all.length}</span>
              <span style="font-size:10px; color:var(--color-text-muted); text-transform:uppercase;">Licenses</span>
            </div>
          </div>
          <div class="chart-legend" style="width: 100%;">
            <div class="legend-item"><span class="legend-color" style="background:var(--color-success);"></span> Active (${activeCount})</div>
            <div class="legend-item"><span class="legend-color" style="background:var(--color-warning);"></span> Critical (${criticalCount})</div>
            <div class="legend-item"><span class="legend-color" style="background:var(--color-accent-amber-light);"></span> Warning (${warningCount})</div>
            <div class="legend-item"><span class="legend-color" style="background:var(--color-danger);"></span> Expired (${expiredCount})</div>
          </div>
        `;
      }
    }

    // 2. Category Breakdown Chart (Horizontal bars)
    const categoryChart = document.getElementById('categoryChartContainer');
    if (categoryChart) {
      const categories = ['PILOT', 'CABIN_CREW', 'FLIGHT_DISPATCHER', 'AME', 'ATC', 'ASO', 'ATSEP', 'FLIGHT_ENGINEER'];
      const counts = categories.map(cat => ({
        name: cat.replace('_', ' '),
        count: all.filter(p => p.category === cat).length
      }));

      const maxCount = Math.max(...counts.map(c => c.count)) || 1;

      categoryChart.innerHTML = counts.map(c => {
        const pct = (c.count / maxCount) * 100;
        return `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; font-size:var(--font-size-xs);">
              <span style="color:var(--color-text-secondary); font-weight:var(--font-weight-medium);">${c.name}</span>
              <span style="color:var(--color-text-primary); font-weight:bold;">${c.count}</span>
            </div>
            <div style="height:6px; background:var(--color-bg-tertiary); border-radius:3px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:var(--color-accent-teal); border-radius:3px;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  renderExpiryAlerts(all) {
    const panel = document.getElementById('dbExpiryAlertsPanel');
    if (!panel) return;

    // Filter to critical, expired or warning, sort by days difference (ascending/most urgent first)
    const urgent = all.filter(p => {
      const urgency = window.DateUtils.getExpiryUrgency(p.licenseValidUntil);
      return urgency === 'expired' || urgency === 'critical' || urgency === 'warning';
    }).map(p => ({
      ...p,
      daysLeft: window.DateUtils.getDaysDifference(p.licenseValidUntil)
    })).sort((a, b) => a.daysLeft - b.daysLeft);

    if (urgent.length === 0) {
      panel.innerHTML = `
        <div style="padding: var(--space-6); text-align:center; color:var(--color-text-muted); font-size:var(--font-size-sm);">
          No critical license expirations pending
        </div>
      `;
      return;
    }

    panel.innerHTML = urgent.slice(0, 10).map(p => {
      const isExpired = p.daysLeft < 0;
      const isCritical = p.daysLeft >= 0 && p.daysLeft <= 30;
      
      let badgeClass = 'warning';
      if (isExpired) badgeClass = 'expired';
      else if (isCritical) badgeClass = 'critical';

      const photoURL = p.passportPhoto
        ? (typeof p.passportPhoto === 'string' ? p.passportPhoto : URL.createObjectURL(p.passportPhoto))
        : null;

      const daysText = window.DateUtils.getDaysRemainingText(p.licenseValidUntil);

      return `
        <div class="expiry-alert-item" style="cursor:pointer;" onclick="window.DetailPanel.show(${p.id})">
          <div class="expiry-alert-left">
            ${photoURL
              ? `<img class="expiry-alert-avatar" src="${photoURL}" alt="">`
              : `<div class="expiry-alert-placeholder">${p.firstName.charAt(0)}${p.surname.charAt(0)}</div>`
            }
            <div class="expiry-alert-info">
              <div class="expiry-alert-name">${p.surname.toUpperCase()}, ${p.firstName}</div>
              <div class="expiry-alert-meta">${p.licenseNumber} • ${p.category.replace('_', ' ')}</div>
            </div>
          </div>
          <div class="expiry-alert-right">
            <div class="expiry-alert-days ${badgeClass}">${daysText}</div>
            <div class="expiry-alert-type" style="color:var(--color-text-muted);">${p.licenseType}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderActivityLogs(audits) {
    const feed = document.getElementById('dbActivityFeed');
    if (!feed) return;

    if (audits.length === 0) {
      feed.innerHTML = `
        <div style="padding:var(--space-6); text-align:center; color:var(--color-text-muted); font-size:var(--font-size-sm);">
          No system operations logged yet
        </div>
      `;
      return;
    }

    feed.innerHTML = audits.slice(0, 10).map(log => {
      const field = log.fieldChanged || log.action || 'record';
      const action = field === '_created' ? 'created' : (field === '_deleted' ? 'deleted' : 'updated');
      const actor = log.changedBy || log.editor || 'system';
      const type = action;
      let icon = '⚡';
      if (type === 'created') icon = '➕';
      if (type === 'deleted') icon = '🗑️';
      if (type === 'updated') icon = '✏️';

      const timeAgo = new Date(log.timestamp).toLocaleString();

      return `
        <div class="activity-item">
          <div class="activity-badge ${type}">
            ${icon}
          </div>
          <div class="activity-content">
            <div class="activity-title">
              <strong>${actor}</strong> <strong>${action}</strong> ${field.startsWith('_') ? 'record' : field} on license <strong>${log.licenseNumber}</strong>
            </div>
            <div class="activity-meta">
              <span>⏰ ${timeAgo}</span>
            </div>
            ${field !== '_created' && field !== '_deleted' ? `<div class="activity-changes">Previous: ${log.oldValue || 'N/A'}<br>Current: ${log.newValue || 'N/A'}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
};

window.DashboardPage = DashboardPage;
