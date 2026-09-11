import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import db from './db.js';
import { renderDonutChart, renderMasterDonutChart } from './charts.js';
import { generateDSR } from './dsr.js';
import { APP_CONFIG, AUTH_USERS, STORAGE_KEYS } from './config.js';
import syncEngine from './sync.js';

// Predefined check options with official Rano Air palette variables
const PREDEFINED_CHECKS = [
  { code: 'CPCP', name: 'Maintenance Work Scope Tasks', defaultCount: 362, color: '#A50050' },
  { code: '1A', name: '1A Check Tasks', defaultCount: 20, color: '#4A6FA5' },
  { code: '2A', name: '2A Check Tasks', defaultCount: 25, color: '#4A6FA5' },
  { code: '3A', name: '3A Check Tasks', defaultCount: 20, color: '#4A6FA5' },
  { code: '4A', name: '4A Check Tasks', defaultCount: 15, color: '#4A6FA5' },
  { code: '5A', name: '5A Check Tasks', defaultCount: 20, color: '#4A6FA5' },
  { code: '1C', name: '1C Check Tasks', defaultCount: 20, color: '#8F0145' },
  { code: '2C', name: '2C Check Tasks', defaultCount: 20, color: '#8F0145' },
  { code: '3C', name: '3C Check Tasks', defaultCount: 20, color: '#8F0145' },
  { code: '4C', name: '4C Check Tasks', defaultCount: 20, color: '#8F0145' },
  { code: '24 Months', name: '24 Months Check Tasks', defaultCount: 25, color: '#0e7490' },
  { code: 'OOP', name: 'Out of Phase Tasks', defaultCount: 10, color: '#ea580c' },
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
    document.getElementById('userSwitcher')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'manager') {
        this.currentUser = { name: 'Line Manager', role: 'manager' };
      } else if (AUTH_USERS[val]) {
        this.currentUser = { name: AUTH_USERS[val].displayName, role: AUTH_USERS[val].role };
      } else {
        const p = this.personnel.find(x => x.id === parseInt(val) || x.staffId === val || x.name === val);
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

    // Multi-Step Wizard Step Buttons
    document.getElementById('step1NextBtn')?.addEventListener('click', () => {
      const reg = document.getElementById('setupReg').value.trim();
      const msn = document.getElementById('setupMSN').value.trim();
      const startDate = document.getElementById('setupStartDate').value;
      const rtsDate = document.getElementById('setupRTSDate')?.value;
      if (!reg || !msn || !startDate || !rtsDate) {
        this.showToast('Please fill in all aircraft details and RTS date before proceeding.', 'error');
        return;
      }
      this.goToWizardStep(2);
    });

    // Inline Edit RTS Date in Metadata Banner (LBMM / MCC only, NOT DCA)
    const triggerEditRTS = () => {
      const user = this.currentUser?.name?.toUpperCase();
      if (!this.authReady || user === 'DCA' || this.currentUser?.role === 'auditor') {
        this.showToast('Only LBMM or MCC can change the Return to Service date.', 'error');
        return;
      }
      const picker = document.getElementById('metaRTSDatePicker');
      if (picker) {
        picker.classList.toggle('hidden');
        if (!picker.classList.contains('hidden')) {
          picker.focus();
          picker.showPicker?.();
        }
      }
    };

    document.getElementById('metaRTS')?.addEventListener('click', triggerEditRTS);
    document.getElementById('editRTSBtn')?.addEventListener('click', triggerEditRTS);

    document.getElementById('metaRTSDatePicker')?.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (!val || !this.activeCheck) return;
      const newDate = new Date(val);
      if (isNaN(newDate.getTime())) return;
      const formatted = newDate.toLocaleDateString('en-GB');
      this.activeCheck.estimatedRTS = formatted;
      await db.updateCheck(this.activeCheck);
      document.getElementById('metaRTS').textContent = formatted;
      e.target.classList.add('hidden');
      await db.addAuditEntry({
        checkId: this.activeCheck.id,
        timestamp: new Date().toISOString(),
        userId: this.currentUser.name,
        userName: this.currentUser.name,
        action: 'RTS Date Updated',
        details: `Return to Service date updated to ${formatted} by ${this.currentUser.name}.`
      });
      syncEngine.broadcast({
        type: 'RTS_UPDATED',
        rts: formatted,
        user: this.currentUser.name
      });
      this.showToast(`Return to Service date updated to ${formatted}.`, 'success');
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

    // Reports Dropdown Toggle
    const reportsBtn = document.getElementById('reportsDropdownBtn');
    const reportsMenu = document.getElementById('reportsDropdownMenu');
    const reportsChevron = document.getElementById('reportsDropdownChevron');

    if (reportsBtn && reportsMenu) {
      reportsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other dropdowns if open
        document.getElementById('moreMenuDropdown')?.classList.add('hidden');
        document.getElementById('moreMenuBtn')?.setAttribute('aria-expanded', 'false');

        const isHidden = reportsMenu.classList.toggle('hidden');
        reportsBtn.setAttribute('aria-expanded', String(!isHidden));
        reportsChevron?.classList.toggle('rotate-180', !isHidden);
      });

      reportsMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          reportsMenu.classList.add('hidden');
          reportsBtn.setAttribute('aria-expanded', 'false');
          reportsChevron?.classList.remove('rotate-180');
        });
      });
    }

    // More Options Overflow Menu Toggle
    const moreBtn = document.getElementById('moreMenuBtn');
    const moreMenu = document.getElementById('moreMenuDropdown');

    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close reports dropdown if open
        reportsMenu?.classList.add('hidden');
        reportsBtn?.setAttribute('aria-expanded', 'false');
        reportsChevron?.classList.remove('rotate-180');

        const isHidden = moreMenu.classList.toggle('hidden');
        moreBtn.setAttribute('aria-expanded', String(!isHidden));
      });

      moreMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          moreMenu.classList.add('hidden');
          moreBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Modal Save Dropdown Toggle
    const modalSaveBtn = document.getElementById('modalSaveDropdownBtn');
    const modalSaveMenu = document.getElementById('modalSaveDropdownMenu');

    if (modalSaveBtn && modalSaveMenu) {
      modalSaveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = modalSaveMenu.classList.toggle('hidden');
        modalSaveBtn.setAttribute('aria-expanded', String(!isHidden));
      });

      modalSaveMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          modalSaveMenu.classList.add('hidden');
          modalSaveBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Close menus and modals on click outside
    document.addEventListener('click', (e) => {
      if (reportsMenu && !reportsMenu.classList.contains('hidden')) {
        if (!document.getElementById('reportsDropdownContainer')?.contains(e.target)) {
          reportsMenu.classList.add('hidden');
          reportsBtn?.setAttribute('aria-expanded', 'false');
          reportsChevron?.classList.remove('rotate-180');
        }
      }
      if (moreMenu && !moreMenu.classList.contains('hidden')) {
        if (!document.getElementById('moreMenuContainer')?.contains(e.target)) {
          moreMenu.classList.add('hidden');
          moreBtn?.setAttribute('aria-expanded', 'false');
        }
      }
      if (modalSaveMenu && !modalSaveMenu.classList.contains('hidden')) {
        if (!document.getElementById('modalSaveDropdownContainer')?.contains(e.target)) {
          modalSaveMenu.classList.add('hidden');
          modalSaveBtn?.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          if (modalSaveMenu) {
            modalSaveMenu.classList.add('hidden');
            modalSaveBtn?.setAttribute('aria-expanded', 'false');
          }
        }
      });
    });

    // Close modals and dropdowns on Escape key press
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        if (reportsMenu && !reportsMenu.classList.contains('hidden')) {
          reportsMenu.classList.add('hidden');
          reportsBtn?.setAttribute('aria-expanded', 'false');
          reportsChevron?.classList.remove('rotate-180');
        }
        if (moreMenu && !moreMenu.classList.contains('hidden')) {
          moreMenu.classList.add('hidden');
          moreBtn?.setAttribute('aria-expanded', 'false');
        }
        if (modalSaveMenu && !modalSaveMenu.classList.contains('hidden')) {
          modalSaveMenu.classList.add('hidden');
          modalSaveBtn?.setAttribute('aria-expanded', 'false');
        }
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
      if (confirm('Clear the audit log for the current check? This action cannot be undone.')) {
        await db.clearAuditEntriesForCheck(this.activeCheck.id);
        await this.renderAuditTab();
        this.showToast('Audit entries cleared for this check only.', 'success');
      }
    });

    // Backup & Restore
    document.getElementById('exportBackupJsonBtn')?.addEventListener('click', () => this.exportBackup('json'));
    document.getElementById('exportBackupPdfBtn')?.addEventListener('click', () => this.exportBackup('pdf'));
    document.getElementById('exportBackupHtmlBtn')?.addEventListener('click', () => this.exportBackup('html'));
    document.getElementById('exportBackupBtn')?.addEventListener('click', () => this.exportBackup('json'));
    document.getElementById('importBackupBtn')?.addEventListener('click', () => {
      document.getElementById('backupFileInput').click();
    });
    document.getElementById('backupFileInput')?.addEventListener('change', (e) => this.importBackup(e));
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
    if (this.activeCheck && (this.activeCheck.mro === 'Rano Air AMO' || !this.activeCheck.mro)) {
      this.activeCheck.mro = 'Rano Air';
      await db.updateCheck(this.activeCheck);
    }
    const allExistingChecks = await db.getAllChecks();
    for (const c of allExistingChecks) {
      if (c.mro === 'Rano Air AMO') {
        c.mro = 'Rano Air';
        await db.updateCheck(c);
      }
    }
    this.personnel = await db.getAllPersonnel();
    this.restoreDraftState();

    // Default personnel seeding / cleanup of legacy names
    const legacyNames = ['Engr. Musa Ibrahim', 'Engr. Fatima Yusuf', 'Certifier Jatau Usman'];
    const hasLegacy = this.personnel.some(p => legacyNames.includes(p.name));

    if (this.personnel.length === 0 || hasLegacy) {
      if (hasLegacy && db.db) {
        for (const p of this.personnel) {
          if (legacyNames.includes(p.name)) {
            const tx = db.db.transaction('personnel', 'readwrite');
            tx.objectStore('personnel').delete(p.id);
          }
        }
      }
      const existing = await db.getAllPersonnel();
      if (existing.length === 0) {
        await db.addPerson({ name: 'LBMM', staffId: 'RAN/AMO/LBMM', role: 'manager' });
        await db.addPerson({ name: 'MCC', staffId: 'RAN/AMO/MCC', role: 'manager' });
        await db.addPerson({ name: 'DCA', staffId: 'RAN/AMO/DCA', role: 'manager' });
      }
      this.personnel = await db.getAllPersonnel();
    }

    // Populate switcher select
    const switcher = document.getElementById('userSwitcher');
    if (switcher) {
      switcher.innerHTML = `
        <option value="manager">Line Maintenance Manager</option>
        <option value="LBMM">LBMM (Manager)</option>
        <option value="MCC">MCC (Manager)</option>
        <option value="DCA">DCA (Manager)</option>
      `;
      this.personnel.forEach(p => {
        if (!['LBMM', 'MCC', 'DCA', 'Line Manager'].includes(p.name)) {
          switcher.innerHTML += `<option value="${p.id}">${p.name} (${p.role.toUpperCase()})</option>`;
        }
      });
    }

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
      footerText.textContent = `${APP_CONFIG.companyName} Check Progress Tracker v${APP_CONFIG.appVersion} | Last Updated: ${APP_CONFIG.lastUpdated}`;
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

    const startInput = document.getElementById('setupStartDate');
    const rtsInput = document.getElementById('setupRTSDate');
    const today = new Date();
    if (startInput) {
      startInput.value = today.toISOString().substring(0, 10);
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (rtsInput) {
      rtsInput.value = tomorrow.toISOString().substring(0, 10);
    }
    
    startInput?.addEventListener('change', () => {
      const sDate = new Date(startInput.value);
      if (!isNaN(sDate.getTime()) && rtsInput) {
        const nextDay = new Date(sDate);
        nextDay.setDate(nextDay.getDate() + 1);
        rtsInput.value = nextDay.toISOString().substring(0, 10);
      }
    });

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
    const rtsVal = document.getElementById('setupRTSDate')?.value;
    const estimatedRTS = rtsVal ? new Date(rtsVal).toLocaleDateString('en-GB') : 'TBD';

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
      mro: 'Rano Air',
      aircraftType: type,
      aircraftRegistration: reg,
      aircraftMSN: msn,
      checkStartDate: startDate,
      estimatedRTS: estimatedRTS,
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
    } else if (data.type === 'RTS_UPDATED') {
      if (this.activeCheck) {
        this.activeCheck.estimatedRTS = data.rts;
        const metaEl = document.getElementById('metaRTS');
        if (metaEl) metaEl.textContent = data.rts;
      }
      this.showToast(`Live Sync: Return to Service date updated to ${data.rts} by ${data.user}`, 'info');
    }
  },

  populateDefectAssigneeSelect() {
    const select = document.getElementById('defectAssignee');
    if (!select) return;
    select.innerHTML = '<option value="">Unassigned</option>';
    this.personnel.forEach(p => {
      select.innerHTML += `<option value="${p.name}">${p.name} (${p.role.toUpperCase()})</option>`;
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
      if (switcher) {
        switcher.innerHTML = `
          <option value="manager">Line Maintenance Manager</option>
          <option value="LBMM">LBMM (Manager)</option>
          <option value="MCC">MCC (Manager)</option>
          <option value="DCA">DCA (Manager)</option>
        `;
        this.personnel.forEach(p => {
          if (!['LBMM', 'MCC', 'DCA', 'Line Manager'].includes(p.name)) {
            switcher.innerHTML += `<option value="${p.id}">${p.name} (${p.role.toUpperCase()})</option>`;
          }
        });
      }
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
  <title>Rano Air - Daily Status Report (DSR)</title>
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
    let sourceContent = document.getElementById('dsrPrintSection')?.innerHTML || document.getElementById('dsrPreviewContainer')?.innerHTML;
    const pdfName = this.getDSRFileName('pdf');

    if (!sourceContent?.trim()) {
      await this.openDSRPreview();
      sourceContent = document.getElementById('dsrPrintSection')?.innerHTML || document.getElementById('dsrPreviewContainer')?.innerHTML;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '794px'; // Standard A4 96 DPI width
    container.style.minHeight = '1123px';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.background = '#ffffff';
    container.style.color = '#0f172a';
    container.style.zIndex = '-99999';
    container.style.opacity = '1';
    container.style.boxSizing = 'border-box';
    container.innerHTML = sourceContent;
    document.body.appendChild(container);

    try {
      this.showToast('Generating PDF...', 'info');

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      if (options.preferFilePicker && 'showSaveFilePicker' in window) {
        const blob = pdf.output('blob');
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

      pdf.save(pdfName);
      this.showToast('DSR PDF downloaded successfully.', 'success');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      if (err?.name === 'AbortError') return;
      this.showToast('PDF save failed. Generating HTML backup.', 'error');
      this.saveDSRAsHTML();
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
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
    if (!this.authReady) return false;
    const name = this.currentUser?.name?.toUpperCase();
    if (name === 'DCA' || this.currentUser?.isReadOnly) {
      return false;
    }
    return this.currentUser.role === 'manager' || this.currentUser.role === 'certifier';
  },

  refreshPermissions() {
    const isWritable = this.canWrite();
    
    if (document.getElementById('addDefectBtn')) document.getElementById('addDefectBtn').disabled = !isWritable;
    if (document.getElementById('closeCheckBtn')) document.getElementById('closeCheckBtn').disabled = !isWritable;
    if (document.getElementById('saveHandoverBtn')) document.getElementById('saveHandoverBtn').disabled = !isWritable;
    if (document.getElementById('importBackupBtn')) document.getElementById('importBackupBtn').disabled = !isWritable;
    if (document.getElementById('newCheckBtn')) document.getElementById('newCheckBtn').disabled = !isWritable;
    if (document.getElementById('addEngineerBtn')) document.getElementById('addEngineerBtn').disabled = !isWritable;
    if (document.getElementById('clearAuditBtn')) document.getElementById('clearAuditBtn').disabled = !isWritable;

    const handoverRemarks = document.getElementById('handoverRemarksInput');
    if (handoverRemarks) {
      handoverRemarks.disabled = !isWritable;
      if (!isWritable) {
        handoverRemarks.placeholder = 'Read-Only Mode: Handover remarks can only be updated by LBMM / MCC.';
      } else {
        handoverRemarks.placeholder = 'Write detailed handover notes here... (e.g. Wing tip inspection 90% completed. Awaiting replacement seal P/N 45210).';
      }
    }

    const editRtsBtn = document.getElementById('editRTSBtn');
    if (editRtsBtn) editRtsBtn.style.display = isWritable ? 'inline-flex' : 'none';

    if (document.getElementById('tab-dashboard').classList.contains('hidden') === false) {
      this.refreshDashboard();
    }
  },

  async exportBackup(format = 'json') {
    const [checks, tasks, personnel, audit, dsrSnapshots] = await Promise.all([
      db.getAllChecks(),
      db.getAllTasks(),
      db.getAllPersonnel(),
      db.getAllAuditEntries(),
      db.getAllDSRSnapshots()
    ]);

    const dateStr = new Date().toISOString().substring(0, 10);

    if (format === 'json') {
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
      a.download = `rano-air-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Full JSON backup exported successfully.', 'success');
    } else if (format === 'html') {
      const htmlContent = this.buildBackupSummaryHTML(checks, tasks, personnel, audit);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rano-air-backup-report-${dateStr}.html`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('HTML backup report exported successfully.', 'success');
    } else if (format === 'pdf') {
      const htmlContent = this.buildBackupSummaryHTML(checks, tasks, personnel, audit);
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '794px';
      container.style.minHeight = '1123px';
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.background = '#ffffff';
      container.style.color = '#0f172a';
      container.style.zIndex = '-99999';
      container.style.boxSizing = 'border-box';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      try {
        this.showToast('Generating PDF backup report...', 'info');
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794
        });

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`rano-air-backup-report-${dateStr}.pdf`);
        this.showToast('PDF backup report exported successfully.', 'success');
      } catch (err) {
        console.error('PDF export error:', err);
        this.showToast('PDF export fallback: saving HTML report.', 'warning');
        this.exportBackup('html');
      } finally {
        if (container.parentNode) {
          document.body.removeChild(container);
        }
      }
    }
  },

  buildBackupSummaryHTML(checks, tasks, personnel, audit) {
    const activeCheck = checks.find(c => c.isActive) || checks[checks.length - 1];
    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let taskRows = '';
    if (activeCheck) {
      const checkTasks = tasks.filter(t => t.checkId === activeCheck.id);
      checkTasks.forEach(t => {
        const pct = t.totalPlanned > 0 ? Math.round((t.closed / t.totalPlanned) * 100) : 0;
        taskRows += `
          <tr>
            <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">${t.checkType}</td>
            <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${t.totalPlanned}</td>
            <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;color:#16a34a;font-weight:bold;">${t.closed}</td>
            <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#A50050;">${pct}%</td>
          </tr>`;
      });
    }
    
    let personnelRows = '';
    personnel.forEach(p => {
      personnelRows += `
        <tr>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">${p.name}</td>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;">${p.staffId}</td>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;">${p.role.toUpperCase()}</td>
        </tr>`;
    });
    
    let auditRows = '';
    const recentAudit = (audit || []).slice(-40).reverse();
    recentAudit.forEach(a => {
      auditRows += `
        <tr>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;">${new Date(a.timestamp).toLocaleString('en-GB')}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:bold;">${a.userName}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;">${a.action}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;">${a.details}</td>
        </tr>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Rano Air - Backup Summary Report</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #0f172a; max-width: 194mm; margin: 0 auto; padding: 6mm 8mm; background: #ffffff; }
    h2 { color: #A50050; font-size: 12px; border-bottom: 1.5px solid #A50050; padding-bottom: 3px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 12px; }
    th { background: #1D1B4C; color: white; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: 700; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #A50050;padding-bottom:10px;margin-bottom:14px;">
    <div>
      <div style="font-size:10.5px;font-weight:800;letter-spacing:1.8px;color:#A50050;text-transform:uppercase;">RANO AIR · LINE MAINTENANCE</div>
      <div style="font-size:16px;font-weight:900;color:#1D1B4C;margin-top:2px;">DATA BACKUP SUMMARY REPORT</div>
      <div style="font-size:10.5px;color:#64748b;margin-top:1px;">Nnamdi Azikiwe International Airport (NAIA)</div>
    </div>
    <div style="text-align:right;font-size:10.5px;color:#334155;">
      <div><strong>Export Date:</strong> ${todayStr}</div>
      <div><strong>Total Records:</strong> ${(checks.length + tasks.length + personnel.length + audit.length)} items</div>
    </div>
  </div>
  ${activeCheck ? `
    <h2>Active Check Details</h2>
    <table>
      <tr><td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;background:#f8fafc;width:25%;">Aircraft Reg:</td><td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;color:#A50050;">${activeCheck.aircraftRegistration}</td><td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;background:#f8fafc;width:25%;">Aircraft Type:</td><td style="padding:5px 8px;border:1px solid #cbd5e1;">${activeCheck.aircraftType}</td></tr>
      <tr><td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;background:#f8fafc;">MSN:</td><td style="padding:5px 8px;border:1px solid #cbd5e1;">${activeCheck.aircraftMSN}</td><td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;background:#f8fafc;">Commenced:</td><td style="padding:5px 8px;border:1px solid #cbd5e1;">${new Date(activeCheck.checkStartDate).toLocaleDateString('en-GB')}</td></tr>
      <tr><td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;background:#f8fafc;">Est. RTS:</td><td style="padding:5px 8px;border:1px solid #cbd5e1;color:#d97706;font-weight:bold;">${activeCheck.estimatedRTS || 'TBD'}</td><td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;background:#f8fafc;">Status:</td><td style="padding:5px 8px;border:1px solid #cbd5e1;color:#16a34a;font-weight:bold;">${activeCheck.isActive ? 'ACTIVE' : 'CLOSED'}</td></tr>
    </table>
    <h2>Work Package Progress</h2>
    <table>
      <thead><tr><th>WORK PACKAGE</th><th style="text-align:center">PLANNED</th><th style="text-align:center">CLOSED</th><th style="text-align:center">COMPLETION</th></tr></thead>
      <tbody>${taskRows}</tbody>
    </table>
  ` : '<p style="color:#64748b;font-size:11px;">No active check record found.</p>'}
  <h2>Personnel Roster (${personnel.length} Registered)</h2>
  <table>
    <thead><tr><th>STAFF NAME</th><th>STAFF ID</th><th>ROLE</th></tr></thead>
    <tbody>${personnelRows || '<tr><td colspan="3" style="padding:8px;border:1px solid #cbd5e1;color:#94a3b8;">No personnel records.</td></tr>'}</tbody>
  </table>
  <h2>Safety Audit Log (Last 40 Entries)</h2>
  <table>
    <thead><tr><th style="width:130px;">TIMESTAMP</th><th style="width:90px;">USER</th><th style="width:140px;">ACTION</th><th>DETAILS</th></tr></thead>
    <tbody>${auditRows || '<tr><td colspan="4" style="padding:8px;border:1px solid #cbd5e1;color:#94a3b8;">No audit entries.</td></tr>'}</tbody>
  </table>
  <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center;">
    Rano Air Check Progress Tracker · Automated Backup Export · NAIA
  </div>
</body>
</html>`;
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
