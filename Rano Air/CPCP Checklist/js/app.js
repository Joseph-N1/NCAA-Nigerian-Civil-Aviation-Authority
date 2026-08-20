import db from './db.js';
import { renderDonutChart, renderMasterDonutChart } from './charts.js';
import { generateDSR } from './dsr.js';
import { APP_CONFIG, AUTH_USERS, STORAGE_KEYS } from './config.js';
import syncEngine from './sync.js';

// Predefined check options with official Rano Air palette variables
const PREDEFINED_CHECKS = [
  { code: 'CPCP', name: 'CPCP Work Scope Tasks', defaultCount: 362, color: '#A50050' },
  { code: '1A', name: '1A Check Tasks', defaultCount: 20, color: '#4A6FA5' },
  { code: '2A', name: '2A Check Tasks', defaultCount: 25, color: '#4A6FA5' },
  { code: '3A', name: '3A Check Tasks', defaultCount: 20, color: '#4A6FA5' },
  { code: '4A', name: '4A Check Tasks', defaultCount: 15, color: '#4A6FA5' },
  { code: '5A', name: '5A Check Tasks', defaultCount: 20, color: '#4A6FA5' },
  { code: '1C', name: '1C Check Tasks', defaultCount: 20, color: '#8F0145' },
  { code: '2C', name: '2C Check Tasks', defaultCount: 20, color: '#8F0145' },
  { code: '3C', name: '3C Check Tasks', defaultCount: 20, color: '#8F0145' },
  { code: 'OOP', name: 'Out of Phase Tasks', defaultCount: 10, color: '#ea580c' },
  { code: 'Daily', name: 'Daily Check Tasks', defaultCount: 10, color: '#7c3aed' },
  { code: 'Weekly', name: 'Weekly Check Tasks', defaultCount: 15, color: '#7c3aed' },
  { code: 'Routine', name: 'Routine Tasks', defaultCount: 30, color: '#7c3aed' }
];

const App = {
  activeCheck: null,
  tasks: [],
  personnel: [],
  currentUser: { name: 'Line Manager', role: 'manager' },
  authReady: false,
  autoSaveDebounceTimer: null,
  autoSaveIntervalId: null,
  idleTimer: null,
  lastSavedAt: null,
  isSaving: false,
  pendingDraft: null,
  exportFormat: 'html',
  wizardStep: 1,

  async init() {
    // 1. Wait for DB ready
    await new Promise((resolve) => {
      window.addEventListener('db-ready', resolve, { once: true });
      db.init();
    });

    // 2. Initialize 3-laptop peer sync network
    syncEngine.init();

    // 3. Listen for live peer sync broadcasts from other laptops
    window.addEventListener('peer-sync-update', async (e) => {
      await this.handleRemotePeerUpdate(e.detail);
    });

    this.bindEvents();
    this.setupAuth();
    this.setupAutoSave();
    this.setupInactivityWarning();
    this.renderVersionFooter();
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

    // Back to Dashboard Buttons
    const backBtns = ['backToDashFromEng', 'backToDashFromHandover', 'backToDashFromAudit'];
    backBtns.forEach(btnId => {
      document.getElementById(btnId)?.addEventListener('click', () => {
        this.switchToTab('dashboard');
      });
    });

    // Multi-Step Wizard Step Buttons
    document.getElementById('step1NextBtn')?.addEventListener('click', () => {
      const reg = document.getElementById('setupReg').value.trim();
      const msn = document.getElementById('setupMSN').value.trim();
      const startDate = document.getElementById('setupStartDate').value;
      if (!reg || !msn || !startDate) {
        this.showToast('Please fill in all aircraft details before proceeding.', 'error');
        return;
      }
      this.goToWizardStep(2);
    });

    document.getElementById('step2BackBtn')?.addEventListener('click', () => {
      this.goToWizardStep(1);
    });

    document.getElementById('step2NextBtn')?.addEventListener('click', () => {
      const selected = document.querySelectorAll('.check-type-cb:checked');
      if (selected.length === 0) {
        this.showToast('Please select at least one check type package.', 'error');
        return;
      }
      this.updateSetupWizardInputs();
      this.goToWizardStep(3);
    });

    document.getElementById('step3BackBtn')?.addEventListener('click', () => {
      this.goToWizardStep(2);
    });

    document.getElementById('cancelWizardBtn')?.addEventListener('click', () => {
      if (this.activeCheck) {
        document.getElementById('setupWizard').classList.add('hidden');
        document.getElementById('appShell').classList.remove('hidden');
        document.getElementById('checkMetaContainer').classList.remove('hidden');
      } else {
        this.showToast('No active check available to return to. Please complete initialization.', 'info');
      }
    });

    // Check Wizard Submit & Button Click
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.initializeNewCheck();
    });
    document.getElementById('initCheckBtn')?.addEventListener('click', async (e) => {
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
    document.getElementById('addDefectBtn')?.addEventListener('click', () => {
      this.populateDefectAssigneeSelect();
      document.getElementById('defectModal').classList.remove('hidden');
    });

    document.getElementById('addDefectDockBtn')?.addEventListener('click', () => {
      this.populateDefectAssigneeSelect();
      document.getElementById('defectModal').classList.remove('hidden');
    });

    document.getElementById('closeDefectModalBtn')?.addEventListener('click', () => {
      document.getElementById('defectModal').classList.add('hidden');
    });
    document.getElementById('cancelDefectModalBtn')?.addEventListener('click', () => {
      document.getElementById('defectModal').classList.add('hidden');
    });

    document.getElementById('addEngineerBtn').addEventListener('click', () => {
      document.getElementById('engineerModal').classList.remove('hidden');
    });

    document.getElementById('closeEngineerModalBtn')?.addEventListener('click', () => {
      document.getElementById('engineerModal').classList.add('hidden');
    });
    document.getElementById('cancelEngineerModalBtn')?.addEventListener('click', () => {
      document.getElementById('engineerModal').classList.add('hidden');
    });

    document.getElementById('newCheckBtn')?.addEventListener('click', () => {
      this.showSetupWizard();
    });

    document.getElementById('generateDsrBtn').addEventListener('click', () => {
      this.openDSRPreview();
    });

    document.getElementById('printDsrBtn')?.addEventListener('click', async () => {
      await this.openDSRPreview();
      window.print();
    });

    document.getElementById('saveDsrDownloadsBtnMain')?.addEventListener('click', async () => {
      await this.openDSRPreview();
      await this.saveDSRToDownloads();
    });

    document.getElementById('saveDsrDocumentsBtnMain')?.addEventListener('click', async () => {
      await this.openDSRPreview();
      await this.saveDSRToDocuments();
    });

    document.getElementById('saveDsrHtmlBtn')?.addEventListener('click', async () => {
      await this.openDSRPreview();
      this.saveDSRAsHTML();
    });

    document.getElementById('printDsrTriggerBtn')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('saveDsrDownloadsBtn')?.addEventListener('click', async () => {
      await this.saveDSRToDownloads();
    });

    document.getElementById('saveDsrDocumentsBtn')?.addEventListener('click', async () => {
      await this.saveDSRToDocuments();
    });

    document.getElementById('saveDsrHtmlModalBtn')?.addEventListener('click', () => {
      this.saveDSRAsHTML();
    });

    document.getElementById('closeDsrModalBtn')?.addEventListener('click', () => {
      document.getElementById('dsrPreviewModal').classList.add('hidden');
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Close modals on Escape key press
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
      }
    });

    document.getElementById('confirmLogoutBtn')?.addEventListener('click', () => this.logout());
    document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));

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

  switchToTab(tabName) {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(t => t.classList.remove('active'));
    
    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) targetTab.classList.add('active');

    const sections = ['dashboard', 'engineers', 'handover', 'audit'];
    sections.forEach(s => {
      document.getElementById(`tab-${s}`)?.classList.add('hidden');
    });

    document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
    this.renderTabContent(tabName);
  },

  async loadInitialData() {
    if (!this.authReady) {
      this.renderAuthScreen();
      return;
    }

    this.activeCheck = await db.getActiveCheck();
    this.personnel = await db.getAllPersonnel();
    this.restoreDraftState();

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
      this.showSetupWizard();
    }
    this.refreshPermissions();
  },

  setupAuth() {
    const storedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        this.currentUser = { name: parsed.name, role: parsed.role };
        this.authReady = true;
      } catch {
        this.authReady = false;
      }
    }

    this.renderAuthScreen();
  },

  renderAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const appShell = document.getElementById('appShell');
    const setupWizard = document.getElementById('setupWizard');

    if (!this.authReady) {
      authScreen?.classList.remove('hidden');
      appShell?.classList.add('hidden');
      setupWizard?.classList.add('hidden');
      return;
    }

    authScreen?.classList.add('hidden');
    appShell?.classList.remove('hidden');
  },

  async handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim().toUpperCase();
    const pin = document.getElementById('loginPin').value.trim();
    const user = AUTH_USERS[username];

    if (user && user.pin === pin) {
      this.currentUser = { name: user.displayName, role: user.role };
      this.authReady = true;
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ name: user.displayName, role: user.role }));
      this.renderAuthScreen();
      this.refreshPermissions();
      await this.loadInitialData();
      this.showToast(`Logged in as ${user.displayName}`, 'success');
      return;
    }

    this.showToast('Invalid credentials. Please enter a valid user PIN.', 'error');
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    this.authReady = false;
    this.currentUser = { name: 'Line Manager', role: 'manager' };
    document.getElementById('appShell')?.classList.add('hidden');
    document.getElementById('setupWizard')?.classList.add('hidden');
    document.getElementById('checkMetaContainer')?.classList.add('hidden');
    this.renderAuthScreen();
    this.showToast('You have been logged out.', 'info');
  },

  setupAutoSave() {
    const persistState = () => {
      if (!this.activeCheck) return;
      const draft = {
        activeCheck: this.activeCheck,
        tasks: this.tasks,
        personnel: this.personnel,
        currentUser: this.currentUser,
        highlights: document.getElementById('handoverRemarksInput')?.value || '',
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
      this.lastSavedAt = new Date();
      this.updateSaveIndicator('✓ All saved');
    };

    const scheduleSave = () => {
      clearTimeout(this.autoSaveDebounceTimer);
      this.updateSaveIndicator('Saving...');
      this.autoSaveDebounceTimer = setTimeout(() => {
        persistState();
      }, APP_CONFIG.autoSaveDelayMs);
    };

    document.addEventListener('input', (event) => {
      if (event.target.matches('input, textarea, select')) {
        scheduleSave();
      }
    });

    this.autoSaveIntervalId = setInterval(() => {
      if (this.activeCheck) {
        persistState();
      }
    }, APP_CONFIG.autoSaveIntervalMs);

    window.addEventListener('beforeunload', () => persistState());
  },

  setupInactivityWarning() {
    const resetTimer = () => {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        this.showToast('Session inactive. Logging out for airworthiness security.', 'info');
        setTimeout(() => this.logout(), 3000);
      }, APP_CONFIG.authTimeoutMinutes * 60 * 1000);
    };

    ['click', 'keydown', 'mousemove', 'scroll'].forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    resetTimer();
  },

  restoreDraftState() {
    const draft = localStorage.getItem(STORAGE_KEYS.DRAFT);
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft);
      if (parsed.highlights) {
        const handoverField = document.getElementById('handoverRemarksInput');
        if (handoverField) handoverField.value = parsed.highlights;
      }
      if (parsed.activeCheck) {
        this.pendingDraft = parsed;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
    }
  },

  updateSaveIndicator(message) {
    const indicator = document.getElementById('saveStatusIndicator');
    if (indicator) {
      indicator.textContent = message;
    }
  },

  renderVersionFooter() {
    const footerText = document.getElementById('versionFooterText');
    if (footerText) {
      footerText.textContent = `${APP_CONFIG.companyName} CPCP Checklist v${APP_CONFIG.appVersion} | Last Updated: ${APP_CONFIG.lastUpdated}`;
    }
  },

  populateCheckMeta() {
    document.getElementById('metaReg').textContent = this.activeCheck.aircraftRegistration;
    document.getElementById('metaType').textContent = `(${this.activeCheck.aircraftType})`;
    document.getElementById('metaMSN').textContent = this.activeCheck.aircraftMSN;
    document.getElementById('metaStartDate').textContent = new Date(this.activeCheck.checkStartDate).toLocaleDateString('en-GB');
    document.getElementById('metaRTS').textContent = this.activeCheck.estimatedRTS || 'TBD';
  },

  showSetupWizard() {
    document.getElementById('checkMetaContainer').classList.add('hidden');
    document.getElementById('appShell').classList.add('hidden');
    document.getElementById('setupWizard').classList.remove('hidden');
    
    // Show/hide cancel button depending on active check existence
    const cancelBtn = document.getElementById('cancelWizardBtn');
    if (cancelBtn) {
      if (this.activeCheck) {
        cancelBtn.classList.remove('hidden');
      } else {
        cancelBtn.classList.add('hidden');
      }
    }

    this.goToWizardStep(1);
    document.getElementById('setupWizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.renderSetupWizard();
  },

  goToWizardStep(step) {
    this.wizardStep = step;
    ['wizardStep1', 'wizardStep2', 'wizardStep3'].forEach((stepId, index) => {
      const el = document.getElementById(stepId);
      if (el) {
        if (index + 1 === step) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Update Indicators
    const ind1 = document.getElementById('stepInd1');
    const ind2 = document.getElementById('stepInd2');
    const ind3 = document.getElementById('stepInd3');

    if (ind1 && ind2 && ind3) {
      ind1.className = step >= 1 ? 'flex items-center gap-2 text-[#A50050]' : 'flex items-center gap-2 text-slate-400';
      ind2.className = step >= 2 ? 'flex items-center gap-2 text-[#A50050]' : 'flex items-center gap-2 text-slate-400';
      ind3.className = step >= 3 ? 'flex items-center gap-2 text-[#A50050]' : 'flex items-center gap-2 text-slate-400';
    }
  },

  renderSetupWizard() {
    const grid = document.getElementById('checkTypeSelectGrid');
    if (!grid) return;

    grid.innerHTML = PREDEFINED_CHECKS.map(c => `
      <label class="setup-option-card">
        <div class="flex items-start gap-3">
          <input type="checkbox" name="checkType" value="${c.code}" class="check-type-cb mt-1" ${c.code === 'CPCP' ? 'checked' : ''}>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-slate-900">${c.code}</span>
              <span class="setup-badge !bg-[#A50050] !text-white">Work Scope</span>
            </div>
            <p class="mt-1 text-xs text-slate-600">${c.name}</p>
            <div class="mt-2 h-1.5 rounded-full" style="background: ${c.color};"></div>
          </div>
        </div>
      </label>
    `).join('');

    const cbs = document.querySelectorAll('.check-type-cb');
    cbs.forEach(cb => {
      cb.addEventListener('change', () => this.updateSetupWizardInputs());
    });

    document.getElementById('setupStartDate').value = new Date().toISOString().substring(0, 10);
    this.updateSetupWizardInputs();
  },

  updateSetupWizardInputs() {
    const container = document.getElementById('taskCountInputsContainer');
    if (!container) return;
    container.innerHTML = '';
    const selected = Array.from(document.querySelectorAll('.check-type-cb:checked')).map(cb => cb.value);

    selected.forEach(code => {
      const predefined = PREDEFINED_CHECKS.find(c => c.code === code);
      container.innerHTML += `
        <div class="setup-task-card">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span class="text-sm font-bold text-slate-900">${predefined.name} (${code})</span>
              <p class="text-xs text-slate-600 mt-0.5">Set planned card count for this package.</p>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-slate-700">Planned Cards:</label>
              <input type="number" id="setup-count-${code}" value="${predefined.defaultCount}" min="1" class="form-input !py-1 !px-2 w-24 text-center font-bold text-slate-900 border-slate-300">
            </div>
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
      const count = input ? (parseInt(input.value) || 1) : 1;
      return { type: code, plannedTasks: count };
    });

    // CRITICAL FIX: Deactivate any existing active checks first
    const existingChecks = await db.getAllChecks();
    for (const c of existingChecks) {
      if (c.isActive) {
        c.isActive = 0;
        await db.updateCheck(c);
      }
    }

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
      userId: this.currentUser.name,
      userName: this.currentUser.name,
      action: 'Check Initialized',
      details: `Initialized check for ${reg} (${type}) with package scope: ${selectedCbs.join('+')}`
    });

    // Broadcast live sync
    syncEngine.broadcast({
      type: 'CHECK_INITIALIZED',
      checkReg: reg,
      user: this.currentUser.name
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

    // Render Individual package pies
    const pieGrid = document.getElementById('packagePieGrid');
    pieGrid.innerHTML = '';
    
    // Progress table body
    const tableBody = document.getElementById('progressTableBody');
    tableBody.innerHTML = '';

    this.activeCheck.checkTypes.forEach(c => {
      const cStats = stats[c.type] || { total: c.plannedTasks, closed: 0 };
      const pct = cStats.total > 0 ? (cStats.closed / cStats.total) * 100 : 0;
      
      // Donut Pie chart
      const pref = PREDEFINED_CHECKS.find(p => p.code === c.type) || { color: '#A50050' };
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

    const btnClass = "px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-800 cursor-pointer transition-colors shadow-sm active:scale-95";
    const controlsDisabled = !this.canWrite();

    // Workflow Enhancement: Interactive Status Badge
    let statusBadgeHTML = '';
    if (pct === 100) {
      statusBadgeHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>100% Closed</span>`;
    } else if (pct > 0) {
      statusBadgeHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300"><span class="w-2 h-2 rounded-full bg-amber-500 mr-1.5 inline-block"></span>In Progress</span>`;
    } else {
      statusBadgeHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300"><span class="w-2 h-2 rounded-full bg-rose-500 mr-1.5 inline-block"></span>Open</span>`;
    }

    return `
      <tr>
        <td class="font-bold text-slate-900 flex items-center gap-2">
          <span>${type}</span>
          ${isNonRoutine ? '<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Defects</span>' : ''}
        </td>
        <td class="text-center font-semibold text-slate-700">${total}</td>
        <td class="text-center text-emerald-700 font-extrabold text-base" id="closed-count-${type}">${closed}</td>
        <td class="text-center">${statusBadgeHTML}</td>
        <td class="text-center font-black text-[#A50050]">${pct}%</td>
        <td class="text-center text-slate-600 font-medium">${remaining}</td>
        <td class="no-print">
          <div class="flex items-center justify-center gap-1.5">
            <button class="${btnClass} action-btn-dec" data-type="${type}" ${controlsDisabled ? 'disabled' : ''} title="Subtract 1 card">&minus;1</button>
            <button class="${btnClass} action-btn-inc" data-type="${type}" ${controlsDisabled ? 'disabled' : ''} title="Add 1 card">+1</button>
            <button class="${btnClass} action-btn-inc5 !bg-purple-100 hover:!bg-purple-200 text-purple-900 border-purple-300" data-type="${type}" ${controlsDisabled ? 'disabled' : ''} title="Add 5 cards">+5</button>
          </div>
        </td>
      </tr>
    `;
  },

  bindTableControls() {
    const decBtns = document.querySelectorAll('.action-btn-dec');
    const incBtns = document.querySelectorAll('.action-btn-inc');
    const inc5Btns = document.querySelectorAll('.action-btn-inc5');

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

    inc5Btns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.type;
        await this.adjustTaskCount(type, 5);
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

    // Broadcast live peer sync across 3 laptops
    syncEngine.broadcast({
      type: 'PROGRESS_UPDATED',
      checkType: type,
      amount,
      newClosed,
      user: this.currentUser.name
    });

    await this.refreshDashboard();
  },

  async handleRemotePeerUpdate(data) {
    if (data.type === 'PROGRESS_UPDATED') {
      this.showToast(`Live Sync (${data.user}): ${data.checkType} updated`, 'info');
      if (this.activeCheck) {
        this.tasks = await db.getTasksForCheck(this.activeCheck.id);
        await this.refreshDashboard();
      }
    } else if (data.type === 'DEFECT_LOGGED') {
      this.showToast(`Live Sync: New Defect "${data.defectTitle}" logged by ${data.user}`, 'info');
      if (this.activeCheck) {
        await this.refreshDashboard();
      }
    } else if (data.type === 'HANDOVER_SAVED') {
      this.showToast(`Live Sync: Shift handover updated by ${data.user}`, 'info');
    }
  },

  populateDefectAssigneeSelect() {
    const select = document.getElementById('defectAssignee');
    if (!select) return;
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

      // Broadcast sync
      syncEngine.broadcast({
        type: 'DEFECT_LOGGED',
        defectTitle: title,
        assignee,
        user: this.currentUser.name
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
      this.showToast('Personnel registered successfully.', 'success');
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
      this.showToast('Staff ID already registered.', 'error');
    }
  },

  async removePersonnel(id, name) {
    if (!this.canWrite()) return;
    if (confirm(`Remove personnel record for "${name}"?`)) {
      if (db.db) {
        const tx = db.db.transaction('personnel', 'readwrite');
        tx.objectStore('personnel').delete(id);
      }
      this.showToast(`Personnel record for ${name} removed.`, 'info');
      await this.loadInitialData();
      if (document.getElementById('tab-engineers').classList.contains('hidden') === false) {
        this.renderPersonnelTab();
      }
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
    if (!body) return;
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
          <td class="font-bold text-slate-900">${p.name}</td>
          <td class="text-xs font-mono font-bold text-[#A50050]">${p.staffId}</td>
          <td class="text-xs uppercase font-bold tracking-wider text-slate-600">${p.role}</td>
          <td class="text-center font-bold text-slate-800">${assignedTasks}</td>
          <td class="text-center font-black text-emerald-700">${completedToday}</td>
          <td><span class="text-xs text-slate-600">${latestHandover ? latestHandover.details : 'No specific remarks.'}</span></td>
          <td class="text-center">
            <button class="btn-danger !py-1 !px-2.5 text-xs remove-personnel-btn" data-id="${p.id}" data-name="${p.name}" ${!this.canWrite() ? 'disabled' : ''}>Remove</button>
          </td>
        </tr>
      `;
    });

    document.querySelectorAll('.remove-personnel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        const name = btn.dataset.name;
        await this.removePersonnel(id, name);
      });
    });
  },

  async renderHandoverTab() {
    if (!this.activeCheck) return;
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

    syncEngine.broadcast({
      type: 'HANDOVER_SAVED',
      notes,
      user: this.currentUser.name
    });

    this.showToast('Handover remarks saved to audit log.', 'success');
  },

  async renderAuditTab() {
    const body = document.getElementById('auditTableBody');
    if (!body) return;
    body.innerHTML = '';
    if (!this.activeCheck) return;
    const logs = await db.getAuditEntriesForCheck(this.activeCheck.id);
    logs.reverse(); // Newest first

    logs.forEach(l => {
      const timeStr = new Date(l.timestamp).toLocaleString('en-GB');
      body.innerHTML += `
        <tr>
          <td class="text-xs text-slate-500 font-mono">${timeStr}</td>
          <td class="font-bold text-slate-900">${l.userName}</td>
          <td class="text-xs uppercase font-extrabold text-[#A50050]">${l.action}</td>
          <td class="text-sm text-slate-800">${l.details}</td>
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
    const highlights = document.getElementById('handoverRemarksInput')?.value || '';
    
    const dsrHTML = generateDSR(this.activeCheck, stats, highlights, this.exportFormat);
    const generatedAt = new Date().toISOString();
    
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
          <td colspan="6" class="text-center text-slate-500 py-4">No DSR snapshots generated yet.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = '';
    snapshots.forEach(snapshot => {
      body.innerHTML += `
        <tr>
          <td class="text-xs text-slate-500 font-mono">${new Date(snapshot.generatedAt).toLocaleString('en-GB')}</td>
          <td class="font-bold text-slate-900">${snapshot.generatedBy || 'Line Manager'}</td>
          <td class="text-center font-semibold text-slate-800">${snapshot.progressData?.total?.total || 0}</td>
          <td class="text-center text-emerald-700 font-extrabold">${snapshot.progressData?.total?.closed || 0}</td>
          <td class="text-center font-black text-[#A50050]">${snapshot.totalCompletion || 0}%</td>
          <td class="text-center">
            <button class="btn-secondary !py-1 !px-3 text-xs font-bold view-dsr-snapshot-btn" data-id="${snapshot.id}">View DSR</button>
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
  <title>Rano Air AMO - Daily Status Report (DSR)</title>
  <style>
    @page { size: A4 portrait; margin: 6mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f8fafc; color: #0f172a; font-family: Inter, Arial, sans-serif; }
    .dsr-a4-sheet {
      width: 100%;
      max-width: 210mm;
      margin: 20px auto;
      padding: 8mm;
      box-sizing: border-box;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    }
    table { border-collapse: collapse; width: 100%; }
    @media print {
      @page { size: A4 portrait; margin: 6mm; }
      html, body { background: #ffffff !important; width: 210mm; margin: 0 auto; }
      .dsr-a4-sheet { margin: 0 !important; padding: 2mm !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 198mm !important; }
    }
  </style>
</head>
<body>
<div class="dsr-a4-sheet">
${dsrHTML}
</div>
</body>
</html>`;
  },

  async saveDSRToDownloads() {
    await this.saveDSRAsPDF();
    this.saveDSRAsHTML();
  },

  async saveDSRToDocuments() {
    await this.saveDSRAsPDF({ preferFilePicker: true });
    await this.saveDSRHTMLToDocuments();
  },

  async saveDSRAsPDF(options = {}) {
    const source = document.getElementById('dsrPrintSection') || document.getElementById('dsrPreviewContainer');
    const pdfName = this.getDSRFileName('pdf');

    if (!source?.innerHTML?.trim()) {
      await this.openDSRPreview();
    }

    if (!window.html2pdf) {
      this.showToast('PDF engine unavailable. Saving HTML instead.', 'error');
      this.saveDSRAsHTML();
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.background = '#ffffff';
    wrapper.style.width = '210mm';
    wrapper.style.minHeight = '297mm';
    wrapper.style.padding = '6mm';
    wrapper.style.boxSizing = 'border-box';
    wrapper.innerHTML = document.getElementById('dsrPrintSection').innerHTML || document.getElementById('dsrPreviewContainer').innerHTML;

    const pdfOptions = {
      margin: [6, 6, 6, 6],
      filename: pdfName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      this.showToast('Generating PDF...', 'info');

      if (options.preferFilePicker && 'showSaveFilePicker' in window) {
        const blob = await window.html2pdf().set(pdfOptions).from(wrapper).outputPdf('blob');
        const handle = await window.showSaveFilePicker({
          suggestedName: pdfName,
          startIn: 'documents',
          types: [
            {
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        this.showToast('DSR PDF saved to selected folder.', 'success');
        return;
      }

      await window.html2pdf().set(pdfOptions).from(wrapper).save();
      this.showToast('DSR PDF saved to downloads.', 'success');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      this.showToast('PDF save failed. Saving HTML instead.', 'error');
      this.saveDSRAsHTML();
    }
  },

  saveDSRAsHTML() {
    const content = this.buildDSRDocumentHTML();
    const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.getDSRFileName('html');
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('DSR saved as standalone HTML to downloads.', 'success');
  },

  async saveDSRHTMLToDocuments() {
    const fileName = this.getDSRFileName('html');
    const content = this.buildDSRDocumentHTML();
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          startIn: 'documents',
          types: [
            {
              description: 'Standalone HTML Document',
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

    this.saveDSRAsHTML();
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
    return this.authReady && (this.currentUser.role === 'manager' || this.currentUser.role === 'certifier');
  },

  refreshPermissions() {
    const isWritable = this.canWrite();
    
    if (document.getElementById('addDefectBtn')) document.getElementById('addDefectBtn').disabled = !isWritable;
    if (document.getElementById('closeCheckBtn')) document.getElementById('closeCheckBtn').disabled = !isWritable;
    if (document.getElementById('saveHandoverBtn')) document.getElementById('saveHandoverBtn').disabled = !isWritable;

    if (document.getElementById('tab-dashboard').classList.contains('hidden') === false) {
      this.refreshDashboard();
    }
  },

  exportBackup() {
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

        const checkStore = db.db.transaction('checks', 'readwrite').objectStore('checks');
        for (const c of data.checks) {
          await checkStore.add(c);
        }

        const taskStore = db.db.transaction('tasks', 'readwrite').objectStore('tasks');
        for (const t of data.tasks) {
          await taskStore.add(t);
        }

        const pStore = db.db.transaction('personnel', 'readwrite').objectStore('personnel');
        for (const p of data.personnel || []) {
          try {
            await pStore.add(p);
          } catch (e) {
            // Ignore collisions
          }
        }

        const auditStore = db.db.transaction('audit_log', 'readwrite').objectStore('audit_log');
        for (const a of data.audit || []) {
          await auditStore.add(a);
        }

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
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
export default App;
