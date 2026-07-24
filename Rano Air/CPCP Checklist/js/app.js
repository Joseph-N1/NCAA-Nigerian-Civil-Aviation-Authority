import db from './db.js';
import { renderDonutChart, renderMasterDonutChart } from './charts.js';
import { generateDSR } from './dsr.js';

// Predefined check options
const PREDEFINED_CHECKS = [
  { code: 'CPCP', name: 'CPCP Work Scope Tasks', defaultCount: 362, color: 'var(--color-check-cpcp)' },
  { code: '1A', name: '1A Check Tasks', defaultCount: 20, color: 'var(--color-check-a-series)' },
  { code: '2A', name: '2A Check Tasks', defaultCount: 25, color: 'var(--color-check-a-series)' },
  { code: '3A', name: '3A Check Tasks', defaultCount: 20, color: 'var(--color-check-a-series)' },
  { code: '4A', name: '4A Check Tasks', defaultCount: 15, color: 'var(--color-check-a-series)' },
  { code: '5A', name: '5A Check Tasks', defaultCount: 20, color: 'var(--color-check-a-series)' },
  { code: 'OOP', name: 'Out of Phase Tasks', defaultCount: 10, color: 'var(--color-check-opp)' },
  { code: 'Daily', name: 'Daily Check Tasks', defaultCount: 10, color: 'var(--color-check-routine)' },
  { code: 'Weekly', name: 'Weekly Check Tasks', defaultCount: 15, color: 'var(--color-check-routine)' },
  { code: 'Routine', name: 'Routine Tasks', defaultCount: 30, color: 'var(--color-check-routine)' }
];

const App = {
  activeCheck: null,
  tasks: [],
  personnel: [],
  currentUser: { name: 'Line Manager', role: 'manager' },

  async init() {
    // Wait for DB ready
    await new Promise((resolve) => {
      window.addEventListener('db-ready', resolve, { once: true });
      db.init();
    });

    this.bindEvents();
    await this.loadInitialData();
  },

  bindEvents() {
    // User Switcher
    document.getElementById('userSwitcher').addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'manager') {
        this.currentUser = { name: 'Line Manager', role: 'manager' };
      } else {
        const p = this.personnel.find(x => x.id === parseInt(val) || x.staffId === val);
        if (p) {
          this.currentUser = { name: p.name, role: p.role };
        }
      }
      document.getElementById('userName').textContent = this.currentUser.name;
      document.getElementById('userRole').textContent = this.currentUser.role.toUpperCase();
      this.refreshPermissions();
    });

    // Navigation Tabs
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Hide all sections
        const sections = ['dashboard', 'engineers', 'handover', 'audit'];
        sections.forEach(s => {
          document.getElementById(`tab-${s}`).classList.add('hidden');
        });
        
        // Show active section
        const activeSection = tab.dataset.tab;
        document.getElementById(`tab-${activeSection}`).classList.remove('hidden');
        
        this.renderTabContent(activeSection);
      });
    });

    // Check Wizard Submit
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.initializeNewCheck();
    });

    // Defect submit
    document.getElementById('defectForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.logDefect();
    });

    // Add Personnel submit
    document.getElementById('engineerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.addPersonnel();
    });

    // Action button bindings
    document.getElementById('addDefectBtn').addEventListener('click', () => {
      this.populateDefectAssigneeSelect();
      document.getElementById('defectModal').classList.remove('hidden');
    });

    document.getElementById('addEngineerBtn').addEventListener('click', () => {
      document.getElementById('engineerModal').classList.remove('hidden');
    });

    document.getElementById('generateDsrBtn').addEventListener('click', () => {
      this.openDSRPreview();
    });

    document.getElementById('printDsrTriggerBtn').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('saveDsrDownloadsBtn').addEventListener('click', () => {
      this.saveDSRToDownloads();
    });

    document.getElementById('saveDsrDocumentsBtn').addEventListener('click', async () => {
      await this.saveDSRToDocuments();
    });

    document.getElementById('saveHandoverBtn').addEventListener('click', async () => {
      await this.saveHandoverNotes();
    });

    document.getElementById('closeCheckBtn').addEventListener('click', async () => {
      await this.closeCheck();
    });

    document.getElementById('clearAuditBtn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear the safety audit log for this check?')) {
        await db.clearAuditEntriesForCheck(this.activeCheck.id);
        await this.renderAuditTab();
        this.showToast('Audit entries cleared for this check only.', 'success');
      }
    });

    // Backup & Restore
    document.getElementById('exportBackupBtn').addEventListener('click', () => this.exportBackup());
    document.getElementById('importBackupBtn').addEventListener('click', () => {
      document.getElementById('backupFileInput').click();
    });
    document.getElementById('backupFileInput').addEventListener('change', (e) => this.importBackup(e));
  },

  async loadInitialData() {
    this.activeCheck = await db.getActiveCheck();
    this.personnel = await db.getAllPersonnel();

    // Default personnel seeding if empty
    if (this.personnel.length === 0) {
      await db.addPerson({ name: 'Engr. Musa Ibrahim', staffId: 'RAN/AMO/E01', role: 'engineer' });
      await db.addPerson({ name: 'Engr. Fatima Yusuf', staffId: 'RAN/AMO/E02', role: 'engineer' });
      await db.addPerson({ name: 'Certifier Jatau Usman', staffId: 'RAN/AMO/C01', role: 'certifier' });
      this.personnel = await db.getAllPersonnel();
    }

    // Populate switcher select
    const switcher = document.getElementById('userSwitcher');
    switcher.innerHTML = `<option value="manager">Line Maintenance Manager</option>`;
    this.personnel.forEach(p => {
      switcher.innerHTML += `<option value="${p.id}">${p.name} (${p.role.toUpperCase()})</option>`;
    });

    if (this.activeCheck) {
      this.tasks = await db.getTasksForCheck(this.activeCheck.id);
      document.getElementById('checkMetaContainer').classList.remove('hidden');
      document.getElementById('appShell').classList.remove('hidden');
      document.getElementById('setupWizard').classList.add('hidden');
      this.populateCheckMeta();
      await this.refreshDashboard();
    } else {
      document.getElementById('checkMetaContainer').classList.add('hidden');
      document.getElementById('appShell').classList.add('hidden');
      document.getElementById('setupWizard').classList.remove('hidden');
      this.renderSetupWizard();
    }
    this.refreshPermissions();
  },

  populateCheckMeta() {
    document.getElementById('metaReg').textContent = this.activeCheck.aircraftRegistration;
    document.getElementById('metaType').textContent = `(${this.activeCheck.aircraftType})`;
    document.getElementById('metaMSN').textContent = this.activeCheck.aircraftMSN;
    document.getElementById('metaStartDate').textContent = new Date(this.activeCheck.checkStartDate).toLocaleDateString('en-GB');
    document.getElementById('metaRTS').textContent = this.activeCheck.estimatedRTS || 'TBD';
  },

  renderSetupWizard() {
    const grid = document.getElementById('checkTypeSelectGrid');
    grid.innerHTML = '';
    PREDEFINED_CHECKS.forEach(c => {
      grid.innerHTML += `
        <label class="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/[0.08] rounded-lg cursor-pointer hover:bg-white/[0.05]">
          <input type="checkbox" name="checkType" value="${c.code}" class="check-type-cb">
          <span class="text-sm font-semibold text-ncaa-text">${c.code}</span>
        </label>
      `;
    });

    // Handle check/uncheck events to show inputs
    const cbs = document.querySelectorAll('.check-type-cb');
    cbs.forEach(cb => {
      cb.addEventListener('change', () => this.updateSetupWizardInputs());
    });

    // Default dates
    document.getElementById('setupStartDate').value = new Date().toISOString().substring(0, 10);
  },

  updateSetupWizardInputs() {
    const container = document.getElementById('taskCountInputsContainer');
    container.innerHTML = '';
    const selected = Array.from(document.querySelectorAll('.check-type-cb:checked')).map(cb => cb.value);

    selected.forEach(code => {
      const predefined = PREDEFINED_CHECKS.find(c => c.code === code);
      container.innerHTML += `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <span class="text-sm font-bold text-ncaa-accent">${predefined.name} (${code})</span>
          <div class="flex items-center gap-2">
            <label class="text-xs text-ncaa-muted">Task Cards Planned:</label>
            <input type="number" id="setup-count-${code}" value="${predefined.defaultCount}" min="1" class="form-input !py-1 !px-2 w-24 text-center">
          </div>
        </div>
      `;
    });
  },

  async initializeNewCheck() {
    const reg = document.getElementById('setupReg').value.trim();
    const type = document.getElementById('setupType').value;
    const msn = document.getElementById('setupMSN').value.trim();
    const startDate = document.getElementById('setupStartDate').value;

    const selectedCbs = Array.from(document.querySelectorAll('.check-type-cb:checked')).map(cb => cb.value);
    if (selectedCbs.length === 0) {
      this.showToast('Please select at least one check type package.', 'error');
      return;
    }

    const checkTypes = selectedCbs.map(code => {
      const input = document.getElementById(`setup-count-${code}`);
      const count = parseInt(input.value) || 1;
      return { type: code, plannedTasks: count };
    });

    const newCheck = {
      mro: 'Rano Air AMO',
      aircraftType: type,
      aircraftRegistration: reg,
      aircraftMSN: msn,
      checkStartDate: startDate,
      estimatedRTS: 'TBD',
      checkTypes: checkTypes,
      isActive: 1,
      createdAt: new Date().toISOString()
    };

    const checkId = await db.addCheck(newCheck);
    newCheck.id = checkId;
    this.activeCheck = newCheck;

    // Generate initial task aggregates per selected type
    const initialTasks = [];
    checkTypes.forEach(ct => {
      initialTasks.push({
        checkId: checkId,
        checkType: ct.type,
        totalPlanned: ct.plannedTasks,
        closed: 0,
        remarks: ''
      });
    });

    // Add empty Non-routine aggregate
    initialTasks.push({
      checkId: checkId,
      checkType: 'Non-Routine',
      totalPlanned: 0,
      closed: 0,
      remarks: ''
    });

    await db.addTasksBulk(initialTasks);
    await db.addAuditEntry({
      checkId: checkId,
      timestamp: new Date().toISOString(),
      userId: 'manager',
      userName: 'Line Manager',
      action: 'Check Initialized',
      details: `Initialized check for ${reg} (${type}) with package scope: ${selectedCbs.join('+')}`
    });

    this.showToast('Check tracker initialized successfully.', 'success');
    await this.loadInitialData();
  },

  async refreshDashboard() {
    if (!this.activeCheck) return;

    this.tasks = await db.getTasksForCheck(this.activeCheck.id);

    // Compute stats
    let grandTotal = 0;
    let grandClosed = 0;

    const stats = {};
    this.tasks.forEach(t => {
      stats[t.checkType] = { total: t.totalPlanned, closed: t.closed };
      grandTotal += t.totalPlanned;
      grandClosed += t.closed;
    });
    stats.total = { total: grandTotal, closed: grandClosed };

    // Update Summary cards
    document.getElementById('totalTasksCount').textContent = grandTotal;
    document.getElementById('closedTasksCount').textContent = grandClosed;
    document.getElementById('openTasksCount').textContent = grandTotal - grandClosed;
    const overallPct = grandTotal > 0 ? (grandClosed / grandTotal) * 100 : 0;
    document.getElementById('overallPercentage').textContent = `${Math.round(overallPct)}%`;

    // Render Master Pie
    renderMasterDonutChart('masterPieContainer', grandClosed, grandTotal - grandClosed);

    // Render Individual pies
    const pieGrid = document.getElementById('packagePieGrid');
    pieGrid.innerHTML = '';
    
    // Progress table body
    const tableBody = document.getElementById('progressTableBody');
    tableBody.innerHTML = '';

    this.activeCheck.checkTypes.forEach(c => {
      const cStats = stats[c.type] || { total: c.plannedTasks, closed: 0 };
      const pct = cStats.total > 0 ? (cStats.closed / cStats.total) * 100 : 0;
      
      // Donut Pie chart
      const pref = PREDEFINED_CHECKS.find(p => p.code === c.type) || { color: 'var(--color-ncaa-accent)' };
      const pieDiv = document.createElement('div');
      pieGrid.appendChild(pieDiv);
      renderDonutChart(pieDiv, pct, c.type, pref.color, 90);

      // Progress Register Table row
      tableBody.innerHTML += this.createProgressRowHTML(c.type, cStats.total, cStats.closed, false);
    });

    // Append Non-routine row to progress register
    const nrStats = stats['Non-Routine'] || { total: 0, closed: 0 };
    tableBody.innerHTML += this.createProgressRowHTML('Non-Routine', nrStats.total, nrStats.closed, true);

    this.bindTableControls();
    await this.renderDSRHistory();
  },

  createProgressRowHTML(type, total, closed, isNonRoutine) {
    const pct = total > 0 ? Math.round((closed / total) * 100) : 0;
    const remaining = total - closed;

    const btnClass = "w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.08] flex items-center justify-center font-bold text-ncaa-text cursor-pointer transition-colors";
    
    // Read only checks for visitor
    const controlsDisabled = !this.canWrite();

    return `
      <tr>
        <td class="font-bold text-ncaa-text">${type}</td>
        <td class="text-center font-semibold">${total}</td>
        <td class="text-center text-ncaa-success font-semibold" id="closed-count-${type}">${closed}</td>
        <td class="text-center font-bold text-ncaa-accent">${pct}%</td>
        <td class="text-center text-ncaa-muted">${remaining}</td>
        <td class="no-print">
          <div class="flex items-center justify-center gap-3">
            <button class="${btnClass} action-btn-dec" data-type="${type}" ${controlsDisabled ? 'disabled' : ''}>-</button>
            <button class="${btnClass} action-btn-inc" data-type="${type}" ${controlsDisabled ? 'disabled' : ''}>+</button>
          </div>
        </td>
      </tr>
    `;
  },

  bindTableControls() {
    const decBtns = document.querySelectorAll('.action-btn-dec');
    const incBtns = document.querySelectorAll('.action-btn-inc');

    decBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.type;
        await this.adjustTaskCount(type, -1);
      });
    });

    incBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.type;
        await this.adjustTaskCount(type, 1);
      });
    });
  },

  async adjustTaskCount(type, amount) {
    if (!this.canWrite()) return;
    const taskRecord = this.tasks.find(t => t.checkType === type);
    if (!taskRecord) return;

    let newClosed = taskRecord.closed + amount;
    if (newClosed < 0) newClosed = 0;
    if (newClosed > taskRecord.totalPlanned) {
      newClosed = taskRecord.totalPlanned;
      this.showToast('Closed count cannot exceed total planned task cards.', 'info');
      return;
    }

    taskRecord.closed = newClosed;
    await db.updateTask(taskRecord);

    await db.addAuditEntry({
      checkId: this.activeCheck.id,
      timestamp: new Date().toISOString(),
      userId: this.currentUser.name,
      userName: this.currentUser.name,
      action: 'Progress Updated',
      details: `${type} closed count adjusted by ${amount > 0 ? '+' : ''}${amount}. Current: ${newClosed}/${taskRecord.totalPlanned}`
    });

    await this.refreshDashboard();
  },

  populateDefectAssigneeSelect() {
    const select = document.getElementById('defectAssignee');
    select.innerHTML = '<option value="">Unassigned</option>';
    this.personnel.filter(p => p.role === 'engineer').forEach(eng => {
      select.innerHTML += `<option value="${eng.name}">${eng.name}</option>`;
    });
  },

  async logDefect() {
    if (!this.canWrite()) return;
    const title = document.getElementById('defectTitle').value.trim();
    const assignee = document.getElementById('defectAssignee').value;

    const nrRecord = this.tasks.find(t => t.checkType === 'Non-Routine');
    if (nrRecord) {
      nrRecord.totalPlanned += 1;
      await db.updateTask(nrRecord);

      await db.addAuditEntry({
        checkId: this.activeCheck.id,
        timestamp: new Date().toISOString(),
        userId: this.currentUser.name,
        userName: this.currentUser.name,
        action: 'Non-Routine Defect Logged',
        details: `Raised Non-Routine item: "${title}". Allocated assignee: ${assignee || 'None'}. Non-routine card count incremented.`
      });

      document.getElementById('defectForm').reset();
      document.getElementById('defectModal').classList.add('hidden');
      this.showToast('Non-routine defect logged successfully.', 'success');
      await this.refreshDashboard();
    }
  },

  async addPersonnel() {
    if (!this.canWrite()) return;
    const name = document.getElementById('engName').value.trim();
    const staffId = document.getElementById('engStaffId').value.trim();
    const role = document.getElementById('engRole').value;

    try {
      await db.addPerson({ name, staffId, role });
      this.showToast('Personnel added successfully.', 'success');
      document.getElementById('engineerForm').reset();
      document.getElementById('engineerModal').classList.add('hidden');
      await this.loadInitialData();
      
      // Update Personnel switcher list
      const switcher = document.getElementById('userSwitcher');
      switcher.innerHTML = `<option value="manager">Line Maintenance Manager</option>`;
      this.personnel.forEach(p => {
        switcher.innerHTML += `<option value="${p.id}">${p.name} (${p.role.toUpperCase()})</option>`;
      });
    } catch (err) {
      this.showToast('Staff ID already exists.', 'error');
    }
  },

  async renderTabContent(tab) {
    if (tab === 'engineers') {
      this.renderPersonnelTab();
    } else if (tab === 'handover') {
      await this.renderHandoverTab();
    } else if (tab === 'audit') {
      await this.renderAuditTab();
    }
  },

  renderPersonnelTab() {
    this.renderPersonnelTabAsync();
  },

  async renderPersonnelTabAsync() {
    const body = document.getElementById('personnelTableBody');
    body.innerHTML = '';

    const logs = this.activeCheck ? await db.getAuditEntriesForCheck(this.activeCheck.id) : [];
    const today = new Date().toISOString().substring(0, 10);

    this.personnel.forEach(p => {
      const assignedTasks = logs.filter(log => {
        return log.action === 'Non-Routine Defect Logged' && log.details.includes(`Allocated assignee: ${p.name}`);
      }).length;
      const completedToday = logs.filter(log => {
        return log.userName === p.name && log.action === 'Progress Updated' && log.timestamp.substring(0, 10) === today;
      }).length;
      const latestHandover = logs
        .filter(log => log.userName === p.name && log.action === 'Handover Remarks Saved')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      body.innerHTML += `
        <tr>
          <td class="font-bold text-ncaa-text">${p.name}</td>
          <td class="text-xs uppercase tracking-wider text-ncaa-muted">${p.role}</td>
          <td class="text-center font-semibold">${assignedTasks}</td>
          <td class="text-center font-semibold text-ncaa-success">${completedToday}</td>
          <td><span class="text-xs text-ncaa-muted">${latestHandover ? latestHandover.details : 'No handover remarks recorded.'}</span></td>
          <td>
            <button class="btn-danger !py-1 !px-2 text-xs" ${!this.canWrite() ? 'disabled' : ''}>Remove</button>
          </td>
        </tr>
      `;
    });
  },

  async renderHandoverTab() {
    // Calculate handover items from last 12 hours
    const logs = await db.getAuditEntriesForCheck(this.activeCheck.id);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const currentShiftLogs = logs.filter(l => l.timestamp >= twelveHoursAgo);
    const updatesCount = currentShiftLogs.filter(l => l.action === 'Progress Updated').length;
    const defectsCount = currentShiftLogs.filter(l => l.action === 'Non-Routine Defect Logged').length;

    document.getElementById('shiftTotalActions').textContent = updatesCount;
    document.getElementById('shiftNewDefects').textContent = defectsCount;
  },

  async saveHandoverNotes() {
    const notes = document.getElementById('handoverRemarksInput').value.trim();
    if (!notes) return;

    await db.addAuditEntry({
      checkId: this.activeCheck.id,
      timestamp: new Date().toISOString(),
      userId: this.currentUser.name,
      userName: this.currentUser.name,
      action: 'Handover Remarks Saved',
      details: notes
    });

    this.showToast('Handover remarks saved to audit log.', 'success');
  },

  async renderAuditTab() {
    const body = document.getElementById('auditTableBody');
    body.innerHTML = '';
    const logs = await db.getAuditEntriesForCheck(this.activeCheck.id);
    logs.reverse(); // Newest first

    logs.forEach(l => {
      const timeStr = new Date(l.timestamp).toLocaleString('en-GB');
      body.innerHTML += `
        <tr>
          <td class="text-xs text-ncaa-muted">${timeStr}</td>
          <td class="font-semibold text-ncaa-text">${l.userName}</td>
          <td class="text-xs uppercase font-bold text-ncaa-accent">${l.action}</td>
          <td class="text-sm text-ncaa-muted">${l.details}</td>
        </tr>
      `;
    });
  },

  buildDSRStats() {
    let grandTotal = 0;
    let grandClosed = 0;
    const stats = {};
    this.tasks.forEach(t => {
      stats[t.checkType] = { total: t.totalPlanned, closed: t.closed };
      grandTotal += t.totalPlanned;
      grandClosed += t.closed;
    });
    stats.total = { total: grandTotal, closed: grandClosed };
    return stats;
  },

  async openDSRPreview() {
    const stats = this.buildDSRStats();
    const highlights = document.getElementById('handoverRemarksInput').value;
    const dsrHTML = generateDSR(this.activeCheck, stats, highlights);
    const generatedAt = new Date().toISOString();
    
    // Inject DSR
    document.getElementById('dsrPreviewContainer').innerHTML = dsrHTML;
    document.getElementById('dsrPrintSection').innerHTML = dsrHTML;

    await db.addDSRSnapshot({
      checkId: this.activeCheck.id,
      generatedAt,
      generatedBy: this.currentUser.name,
      headerData: { ...this.activeCheck },
      progressData: stats,
      highlights,
      totalCompletion: stats.total.total > 0 ? Math.round((stats.total.closed / stats.total.total) * 100) : 0,
      html: dsrHTML
    });

    await db.addAuditEntry({
      checkId: this.activeCheck.id,
      timestamp: generatedAt,
      userId: this.currentUser.name,
      userName: this.currentUser.name,
      action: 'DSR Snapshot Generated',
      details: `Daily Status Report saved at ${new Date(generatedAt).toLocaleString('en-GB')}.`
    });

    await this.renderDSRHistory();
    document.getElementById('dsrPreviewModal').classList.remove('hidden');
  },

  async renderDSRHistory() {
    const body = document.getElementById('dsrHistoryTableBody');
    if (!body || !this.activeCheck) return;

    const snapshots = await db.getDSRSnapshots(this.activeCheck.id);
    snapshots.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

    if (snapshots.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-ncaa-muted py-4">No DSR snapshots generated yet.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = '';
    snapshots.forEach(snapshot => {
      body.innerHTML += `
        <tr>
          <td class="text-xs text-ncaa-muted">${new Date(snapshot.generatedAt).toLocaleString('en-GB')}</td>
          <td class="font-semibold text-ncaa-text">${snapshot.generatedBy || 'Line Manager'}</td>
          <td class="text-center">${snapshot.progressData?.total?.total || 0}</td>
          <td class="text-center text-ncaa-success font-semibold">${snapshot.progressData?.total?.closed || 0}</td>
          <td class="text-center font-bold text-ncaa-accent">${snapshot.totalCompletion || 0}%</td>
          <td class="text-center">
            <button class="btn-secondary !py-1 !px-3 text-xs view-dsr-snapshot-btn" data-id="${snapshot.id}">View</button>
          </td>
        </tr>
      `;
    });

    document.querySelectorAll('.view-dsr-snapshot-btn').forEach(button => {
      button.addEventListener('click', () => {
        const snapshot = snapshots.find(item => item.id === parseInt(button.dataset.id));
        if (!snapshot) return;
        document.getElementById('dsrPreviewContainer').innerHTML = snapshot.html;
        document.getElementById('dsrPrintSection').innerHTML = snapshot.html;
        document.getElementById('dsrPreviewModal').classList.remove('hidden');
      });
    });
  },

  getDSRFileName(extension = 'html') {
    const reg = this.activeCheck?.aircraftRegistration || 'aircraft';
    const date = new Date().toISOString().substring(0, 10);
    return `rano-air-dsr-${reg}-${date}.${extension}`.replace(/[^a-z0-9._-]/gi, '-');
  },

  buildDSRDocumentHTML() {
    const dsrHTML = document.getElementById('dsrPrintSection').innerHTML || document.getElementById('dsrPreviewContainer').innerHTML;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rano Air DSR</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { margin: 0; background: #ffffff; }
    @media print {
      body { width: 210mm; min-height: 297mm; }
    }
  </style>
</head>
<body>
${dsrHTML}
</body>
</html>`;
  },

  saveDSRToDownloads() {
    const blob = new Blob([this.buildDSRDocumentHTML()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.getDSRFileName('html');
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('DSR saved to your browser downloads.', 'success');
  },

  async saveDSRToDocuments() {
    const fileName = this.getDSRFileName('html');
    const content = this.buildDSRDocumentHTML();

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          startIn: 'documents',
          types: [
            {
              description: 'HTML document',
              accept: { 'text/html': ['.html'] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        this.showToast('DSR saved to your selected Documents folder.', 'success');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    this.saveDSRToDownloads();
    this.showToast('Your browser does not support direct Documents saving. Move the downloaded file to Documents.', 'info');
  },

  async closeCheck() {
    if (!this.canWrite()) return;
    if (confirm('Are you sure you want to CLOSE/COMPLETE this maintenance check? All data will be finalized and archived.')) {
      this.activeCheck.isActive = 0;
      await db.updateCheck(this.activeCheck);

      await db.addAuditEntry({
        checkId: this.activeCheck.id,
        timestamp: new Date().toISOString(),
        userId: this.currentUser.name,
        userName: this.currentUser.name,
        action: 'Check Completed',
        details: `Finalized check status for ${this.activeCheck.aircraftRegistration}.`
      });

      this.showToast('Check completed and archived.', 'success');
      this.activeCheck = null;
      await this.loadInitialData();
    }
  },

  canWrite() {
    return this.currentUser.role === 'manager' || this.currentUser.role === 'certifier';
  },

  refreshPermissions() {
    const isWritable = this.canWrite();
    
    // Enable/disable key controls
    document.getElementById('addDefectBtn').disabled = !isWritable;
    document.getElementById('closeCheckBtn').disabled = !isWritable;

    // Refresh dynamic lists
    if (document.getElementById('tab-dashboard').classList.contains('hidden') === false) {
      this.refreshDashboard();
    }
  },

  exportBackup() {
    // Export IndexedDB data to JSON
    Promise.all([
      db.getAllChecks(),
      db.getAllTasks(),
      db.getAllPersonnel(),
      db.getAllAuditEntries(),
      db.getAllDSRSnapshots()
    ]).then(([checks, tasks, personnel, audit, dsrSnapshots]) => {
      const backupData = {
        checks,
        tasks,
        personnel,
        audit,
        dsrSnapshots,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rano-air-cpcp-backup-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
    });
  },

  async importBackup(e) {
    if (!this.canWrite()) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.checks || !data.tasks) {
          throw new Error('Invalid backup file structure.');
        }

        await db.clearAll();

        // Restore checks
        const checkStore = db.db.transaction('checks', 'readwrite').objectStore('checks');
        for (const c of data.checks) {
          await checkStore.add(c);
        }

        // Restore tasks
        const taskStore = db.db.transaction('tasks', 'readwrite').objectStore('tasks');
        for (const t of data.tasks) {
          await taskStore.add(t);
        }

        // Restore personnel
        const pStore = db.db.transaction('personnel', 'readwrite').objectStore('personnel');
        for (const p of data.personnel || []) {
          try {
            await pStore.add(p);
          } catch (e) {
            // Ignore potential unique key collisions
          }
        }

        // Restore audit
        const auditStore = db.db.transaction('audit_log', 'readwrite').objectStore('audit_log');
        for (const a of data.audit || []) {
          await auditStore.add(a);
        }

        // Restore DSR snapshots
        const dsrStore = db.db.transaction('dsr_snapshots', 'readwrite').objectStore('dsr_snapshots');
        for (const snapshot of data.dsrSnapshots || []) {
          await dsrStore.add(snapshot);
        }

        this.showToast('Backup restored successfully!', 'success');
        window.location.reload();
      } catch (err) {
        this.showToast('Failed to import backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
export default App;
