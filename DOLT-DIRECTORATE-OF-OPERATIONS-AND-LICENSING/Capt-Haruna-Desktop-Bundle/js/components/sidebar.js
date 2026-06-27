// ============================================
// NCAA DOLT License Management System
// Sidebar Component — js/components/sidebar.js
// ============================================

const Sidebar = {
  init() {
    this.bindEvents();
    this.updateActiveLink();
  },

  bindEvents() {
    window.addEventListener('hashchange', () => {
      this.updateActiveLink();
    });
    
    // Listen to user logins/role changes to dynamically update UI write-access
    window.addEventListener('app-login', (event) => {
      this.applyRoleRestrictions(event.detail.role);
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

    // Hide or show elements with role-based helper attributes
    document.querySelectorAll('.assistant-only').forEach(el => {
      if (isGM) {
        el.classList.add('hidden');
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
