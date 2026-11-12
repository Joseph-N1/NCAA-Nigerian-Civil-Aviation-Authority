// ============================================
// NCAA DOLT License Management System
// Authentication System — js/components/auth.js
// v6 — Named assistant accounts, form-based login
// ============================================

const Auth = {
  currentUser: null, // { id, username, role }

  // Default accounts created on first run
  DEFAULT_USERS: [
    { username: 'GM',          pin: '1111', role: 'GM' },
    { username: 'Assistant 1', pin: '2222', role: 'Assistant' },
    { username: 'Assistant 2', pin: '3333', role: 'Assistant' },
    { username: 'Assistant 3', pin: '4444', role: 'Assistant' }
  ],

  async init() {
    this.setupEventListeners();
    await this.ensureUsersExist();
  },

  // Silently create default users on first run (no wizard)
  async ensureUsersExist() {
    const firstRun = await window.DB.isFirstRun();
    if (firstRun) {
      for (const u of this.DEFAULT_USERS) {
        try {
          await window.DB.addUser(u.username, u.pin, u.role);
        } catch (e) {
          console.warn('Could not create default user:', u.username, e);
        }
      }
    }
  },

  setupEventListeners() {
    // Form-based login submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Lock button in sidebar
    const lockBtn = document.getElementById('btnLockApp');
    if (lockBtn) {
      lockBtn.addEventListener('click', () => this.lock());
    }
  },

  async handleLogin() {
    const usernameInput = document.getElementById('loginUsername');
    const pinInput = document.getElementById('loginPin');

    const username = (usernameInput.value || '').trim();
    const pin = (pinInput.value || '').trim();

    if (!username || !pin) {
      window.Toast.error('Missing Credentials', 'Please enter both your role and PIN.');
      return;
    }

    // Verify against database
    const user = await window.DB.verifyPin(username, pin);

    if (user) {
      this.currentUser = user;
      window.Toast.success('Access Granted', `Welcome, ${user.username}.`);
      this.unlockApp();
    } else {
      window.Toast.error('Invalid Credentials', 'The role or PIN entered is incorrect. Please try again.');
      pinInput.value = '';
      pinInput.focus();
    }
  },

  unlockApp() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.classList.remove('active');

    // Update profile bar on sidebar
    const navName = document.getElementById('navUserName');
    const navRole = document.getElementById('navUserRole');

    if (this.currentUser.role === 'GM') {
      if (navName) navName.innerText = 'General Manager';
      if (navRole) navRole.innerText = 'GM (DOLT) — Read Only';
    } else {
      if (navName) navName.innerText = this.currentUser.username;
      if (navRole) navRole.innerText = 'Data Entry & Updates';
    }

    // Update role-based visibility
    if (this.currentUser.role === 'Assistant') {
      document.body.classList.add('role-assistant');
    } else {
      document.body.classList.remove('role-assistant');
    }

    // Dispatch login event
    window.dispatchEvent(new CustomEvent('app-login', { detail: this.currentUser }));
  },

  lock() {
    this.currentUser = null;

    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.classList.add('active');

    // Clear form fields
    const usernameInput = document.getElementById('loginUsername');
    const pinInput = document.getElementById('loginPin');
    if (usernameInput) usernameInput.value = '';
    if (pinInput) pinInput.value = '';
  },

  getUser() {
    return this.currentUser;
  },

  hasWriteAccess() {
    return this.currentUser && this.currentUser.role === 'Assistant';
  }
};

window.Auth = Auth;
