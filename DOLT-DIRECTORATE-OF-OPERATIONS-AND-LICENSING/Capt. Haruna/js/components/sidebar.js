// ============================================
// NCAA DOLT License Management System
// Sidebar Component — js/components/sidebar.js
// ============================================

const Sidebar = {
  STORAGE_KEY: 'dolt_sidebar_collapsed',

  init() {
    this.initCollapseState();
    this.bindEvents();
    this.updateActiveLink();
  },

  initCollapseState() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const shouldCollapse = saved !== null ? (saved === 'true') : (window.innerWidth < 1024);
    this.setCollapsed(shouldCollapse, false);
  },

  setCollapsed(collapsed, save = true) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const container = document.querySelector('.app-container');
    if (container) {
      container.classList.toggle('sidebar-collapsed', collapsed);
    }
    
    // Update toggle button state
    const toggleBtn = document.getElementById('btnSidebarToggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', (!collapsed).toString());
      toggleBtn.setAttribute('title', collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Retract Sidebar (Ctrl+B)');
      toggleBtn.classList.toggle('is-collapsed', collapsed);
    }

    if (save) {
      try {
        localStorage.setItem(this.STORAGE_KEY, collapsed.toString());
      } catch (e) {
        // Safe fallback
      }
    }
  },

  toggle() {
    const isCurrentlyCollapsed = document.body.classList.contains('sidebar-collapsed');
    this.setCollapsed(!isCurrentlyCollapsed, true);
  },

  bindEvents() {
    window.addEventListener('hashchange', () => {
      this.updateActiveLink();
      // On small screens, auto-retract sidebar upon navigation
      if (window.innerWidth <= 768) {
        this.setCollapsed(true, false);
      }
    });
    
    // Listen to user logins/role changes to dynamically update UI write-access
    window.addEventListener('app-login', (event) => {
      this.applyRoleRestrictions(event.detail.role);
    });

    // Toggle button in header
    const toggleBtn = document.getElementById('btnSidebarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    // Close button in sidebar header
    const closeBtn = document.getElementById('btnSidebarClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.setCollapsed(true, true);
      });
    }

    // Keyboard shortcut: Ctrl+B or Cmd+B
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          this.toggle();
        }
      }
    });
  },

  updateActiveLink() {
    const hash = window.location.hash || '#dashboard';
    const pageName = hash.replace('#', '');
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if (link.getAttribute('data-page') === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  applyRoleRestrictions(role) {
    const isGM = (role === 'GM');
    document.body.classList.toggle('role-readonly', isGM);
    document.body.classList.toggle('role-write', !isGM);

    document.querySelectorAll('.readonly-add-notice').forEach(el => el.remove());

    // Hide or show elements with role-based helper attributes
    document.querySelectorAll('.assistant-only').forEach(el => {
      if (isGM) {
        el.classList.add('hidden');
        if (el.closest('.page-header') && !el.parentElement.querySelector('.readonly-add-notice')) {
          const notice = document.createElement('div');
          notice.className = 'readonly-add-notice no-print';
          notice.innerHTML = `
            <span>Read-only</span>
            <strong>Assistant login required to add records</strong>
          `;
          el.parentElement.appendChild(notice);
        }
      } else {
        el.classList.remove('hidden');
      }
    });

    document.querySelectorAll('.gm-only').forEach(el => {
      if (isGM) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }
};

window.Sidebar = Sidebar;
