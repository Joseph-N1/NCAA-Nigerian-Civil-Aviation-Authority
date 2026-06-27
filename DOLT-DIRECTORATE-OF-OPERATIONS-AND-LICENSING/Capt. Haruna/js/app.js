// ============================================
// NCAA DOLT License Management System
// Main App Controller — js/app.js
// ============================================

const App = {
  currentPageModule: null,
  categoryTitles: {
    PILOT: 'Pilot',
    CABIN_CREW: 'Cabin Crew',
    FLIGHT_DISPATCHER: 'Flight Dispatcher',
    AME: 'AME Engineer',
    ATC: 'ATC Controller',
    ASO: 'ASO Operator',
    ATSEP: 'ATSEP Engineer',
    FLIGHT_ENGINEER: 'Flight Engineer'
  },

  async init() {
    console.log('Initializing NCAA DOLT App Controller...');
    
    // Initialize components
    await window.DB.init();
    await window.Auth.init();
    window.Sidebar.init();
    window.Search.init();
    window.DetailPanel.init();

    this.bindEvents();
    await this.setupTheme();
    this.setupNetworkStatus();
    await this.checkBackupReminders();

    // Trigger initial route only if authenticated
    window.addEventListener('app-login', () => {
      this.route();
    });
  },

  bindEvents() {
    // SPA Routing hash trigger
    window.addEventListener('hashchange', () => {
      if (window.Auth.getUser()) {
        this.route();
      }
    });

    // Form Modal Navigation Buttons
    const btnNext = document.getElementById('btnFormNext');
    const btnPrev = document.getElementById('btnFormPrev');
    const btnSubmit = document.getElementById('btnFormSubmit');
    const modalClose = document.getElementById('btnFormModalClose');

    if (btnNext) btnNext.addEventListener('click', () => window.FormBuilder.handleNext());
    if (btnPrev) btnPrev.addEventListener('click', () => window.FormBuilder.handlePrev());
    if (btnSubmit) btnSubmit.addEventListener('click', () => window.FormBuilder.submitForm());
    
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        if (confirm('Discard edits? Unsaved changes will be saved as local draft.')) {
          document.getElementById('formModalOverlay').classList.remove('active');
        }
      });
    }

    // Backup suggestion click
    const backupBanner = document.getElementById('backupReminderBanner');
    if (backupBanner) {
      backupBanner.addEventListener('click', () => {
        window.location.hash = '#settings';
      });
    }

    this.bindGlobalAddMenu();
  },

  bindGlobalAddMenu() {
    const menu = document.getElementById('globalAddMenu');
    const toggle = document.getElementById('btnGlobalAddRecord');
    const dropdown = document.getElementById('globalAddDropdown');
    if (!menu || !toggle || !dropdown) return;

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const isHidden = dropdown.classList.toggle('hidden');
      toggle.setAttribute('aria-expanded', String(!isHidden));
    });

    dropdown.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => {
        dropdown.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
        this.openAddRecordModal(button.getAttribute('data-category'));
      });
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target)) {
        dropdown.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  },

  openAddRecordModal(category) {
    if (!window.Auth.hasWriteAccess()) {
      window.Toast.warning('Assistant Access Required', 'Log in as Assistant to add or edit personnel records.');
      return;
    }

    const overlay = document.getElementById('formModalOverlay');
    const title = document.getElementById('formModalTitle');
    if (!overlay || !title || !window.FormBuilder) return;

    const displayName = this.categoryTitles[category] || 'Personnel';
    title.innerText = `Add New ${displayName}`;
    window.FormBuilder.render(category, 'formModalBody');
    overlay.classList.add('active');
  },

  async setupTheme() {
    const themeButton = document.getElementById('btnThemeToggle');
    const savedTheme = await window.DB.getSetting('themeMode') || 'dark';

    const applyTheme = (mode) => {
      document.body.classList.toggle('theme-light', mode === 'light');
      document.documentElement.style.colorScheme = mode === 'light' ? 'light' : 'dark';
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', mode === 'light' ? '#f5f7fb' : '#0a1628');
      if (themeButton) themeButton.textContent = mode === 'light' ? 'Light' : 'Dark';
    };

    applyTheme(savedTheme);

    if (themeButton) {
      themeButton.addEventListener('click', async () => {
        const nextTheme = document.body.classList.contains('theme-light') ? 'dark' : 'light';
        applyTheme(nextTheme);
        await window.DB.setSetting('themeMode', nextTheme);
      });
    }
  },

  route() {
    const hash = window.location.hash || '#dashboard';
    const pageName = hash.replace('#', '');
    const container = document.getElementById('pageContainer');
    
    if (!container) return;

    // Reset scroll positions without smooth transition jitter
    const origScroll = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = origScroll;

    // Dynamic routing lookup
    switch (pageName) {
      case 'dashboard':
        this.currentPageModule = window.DashboardPage;
        break;
      case 'pilots':
        this.currentPageModule = window.PilotsPage;
        break;
      case 'cabin-crew':
        this.currentPageModule = window.CabinCrewPage;
        break;
      case 'flight-dispatchers':
        this.currentPageModule = window.FlightDispatchersPage;
        break;
      case 'ame':
        this.currentPageModule = window.AMEPage;
        break;
      case 'atc':
        this.currentPageModule = window.ATCPage;
        break;
      case 'aso':
        this.currentPageModule = window.ASOPage;
        break;
      case 'atsep':
        this.currentPageModule = window.ATSEPPage;
        break;
      case 'flight-engineers':
        this.currentPageModule = window.FlightEngineersPage;
        break;
      case 'settings':
        this.currentPageModule = window.SettingsPage;
        break;
      default:
        this.currentPageModule = window.DashboardPage;
        window.location.hash = '#dashboard';
    }

    if (this.currentPageModule) {
      this.currentPageModule.render(container);
      
      // Re-apply role restrictions to new HTML elements
      const user = window.Auth.getUser();
      if (user && window.Sidebar && window.Sidebar.applyRoleRestrictions) {
        window.Sidebar.applyRoleRestrictions(user.role);
      }
    }
  },

  setupNetworkStatus() {
    const statusBadge = document.getElementById('offlineStatus');
    
    const updateStatus = () => {
      if (navigator.onLine) {
        statusBadge.innerHTML = '<span class="badge-dot"></span> Offline DB Ready';
        statusBadge.className = 'badge badge-active';
      } else {
        statusBadge.innerHTML = '<span class="badge-dot" style="background:#ff4757;"></span> Offline Mode';
        statusBadge.className = 'badge';
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus(); // Initial call
  },

  async checkBackupReminders() {
    const banner = document.getElementById('backupReminderBanner');
    if (!banner) return;

    try {
      const freqRecord = await window.DB.settings.get('backupReminderFrequency');
      const lastBackupRecord = await window.DB.settings.get('lastBackupTimestamp');
      
      const frequency = freqRecord ? freqRecord.value : 'biweekly';
      if (frequency === 'never') {
        banner.classList.add('hidden');
        return;
      }

      const lastBackup = lastBackupRecord ? lastBackupRecord.value : 0;
      const ageMs = Date.now() - lastBackup;
      
      let limitMs = 14 * 24 * 60 * 60 * 1000; // Default bi-weekly (14 days)
      if (frequency === 'weekly') limitMs = 7 * 24 * 60 * 60 * 1000;
      if (frequency === 'monthly') limitMs = 30 * 24 * 60 * 60 * 1000;

      if (ageMs > limitMs) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    } catch (e) {
      console.error('Error checking backup reminders:', e);
    }
  }
};

// Initialize app when DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
  window.App = App;
  App.init().catch(err => {
    console.error('App initialization failed:', err);
  });
});
