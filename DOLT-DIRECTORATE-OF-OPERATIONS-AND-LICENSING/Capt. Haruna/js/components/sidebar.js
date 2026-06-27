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
