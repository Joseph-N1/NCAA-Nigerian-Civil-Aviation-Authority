// ============================================
// NCAA DOLT License Management System
// Authentication System — js/components/auth.js
// v7 — Named Assistant Accounts & Resilient Authentication
// ============================================

const Auth = {
  currentUser: null, // { id, username, role }

  // Authorised accounts requested
  DEFAULT_USERS: [
    { username: 'GML (DOLT)',                    pin: '1111', role: 'GM' },
    { username: 'Rinret Friday',                  pin: '2222', role: 'Assistant' },
    { username: 'Amina Daji',                     pin: '3333', role: 'Assistant' },
    { username: 'Galadanchi Abdulrahman Suleiman', pin: '4444', role: 'Assistant' }
  ],

  // Common aliases for backward compatibility
  ALIASES: {
    'GM': 'GML (DOLT)',
    'GML': 'GML (DOLT)',
    'Assistant 1': 'Rinret Friday',
    'Assistant 2': 'Amina Daji',
    'Assistant 3': 'Galadanchi Abdulrahman Suleiman',
    'Assistant': 'Rinret Friday'
  },

  async init() {
    this.setupEventListeners();
    await this.ensureUsersExist();
  },

  // Ensure all configured personnel exist in IndexedDB (upserts missing ones)
  async ensureUsersExist() {
    for (const u of this.DEFAULT_USERS) {
      try {
        const existing = await window.DB.users.where('username').equals(u.username).first();
        if (!existing) {
          await window.DB.addUser(u.username, u.pin, u.role);
        } else if (existing.role !== u.role) {
          await window.DB.users.update(existing.id, { role: u.role });
        }
      } catch (e) {
        console.warn('User upsert notice for', u.username, e);
      }
    }
  },

  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const lockBtn = document.getElementById('btnLockApp');
    if (lockBtn) {
      lockBtn.addEventListener('click', () => this.lock());
    }
  },

  resolveUsername(raw) {
    if (!raw) return '';
    const clean = raw.trim();
    if (this.ALIASES[clean]) return this.ALIASES[clean];
    // Check if clean matches any default user ignoring case
    const match = this.DEFAULT_USERS.find(u => u.username.toLowerCase() === clean.toLowerCase());
    return match ? match.username : clean;
  },

  async handleLogin() {
    const usernameInput = document.getElementById('loginUsername');
    const pinInput = document.getElementById('loginPin');

    const rawUsername = (usernameInput.value || '').trim();
    const pin = (pinInput.value || '').trim();

    if (!rawUsername || !pin) {
      window.Toast.error('Missing Credentials', 'Please select your name/role and enter your PIN.');
      return;
    }

    const username = this.resolveUsername(rawUsername);

    // 1. Verify against database
    let user = null;
    try {
      user = await window.DB.verifyPin(username, pin);
    } catch (e) {
      console.warn('DB verifyPin error:', e);
    }

    // Repair only a configured default account when its stored PIN is stale.
    if (!user) {
      const defaultUser = this.DEFAULT_USERS.find(u => u.username === username);
      if (defaultUser && defaultUser.pin === pin) {
        try {
          const existing = await window.DB.users.where('username').equals(username).first();
          if (existing) {
            await window.DB.updateUserPin(existing.id, defaultUser.pin);
            if (existing.role !== defaultUser.role) {
              await window.DB.users.update(existing.id, { role: defaultUser.role });
            }
            user = { id: existing.id, username: existing.username, role: existing.role };
          } else {
            const id = await window.DB.addUser(defaultUser.username, defaultUser.pin, defaultUser.role);
            user = { id, username: defaultUser.username, role: defaultUser.role };
          }
        } catch (e) {
          console.error('Unable to repair the configured local account:', e);
        }
      }
    }

    if (user) {
      this.currentUser = user;
      window.Toast.success('Access Granted', `Welcome back, ${user.username}.`);
      this.unlockApp();
    } else {
      window.Toast.error('Invalid Credentials', 'The selected role or PIN entered is incorrect. Please try again.');
      pinInput.value = '';
      pinInput.focus();
    }
  },

  unlockApp() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.display = 'none'; // Guarantee overlay is hidden
    }

    // Update profile bar on sidebar
    const navName = document.getElementById('navUserName');
    const navRole = document.getElementById('navUserRole');

    if (this.currentUser.role === 'GM') {
      if (navName) navName.innerText = this.currentUser.username;
      if (navRole) navRole.innerText = 'GM (DOLT) — Read Only';
    } else {
      if (navName) navName.innerText = this.currentUser.username;
      if (navRole) navRole.innerText = 'Officer (Data Entry)';
    }

    // Update role-based visibility
    if (this.currentUser.role === 'Assistant') {
      document.body.classList.add('role-assistant');
      document.body.classList.remove('role-readonly');
    } else {
      document.body.classList.remove('role-assistant');
      document.body.classList.add('role-readonly');
    }

    // Dispatch login event
    window.dispatchEvent(new CustomEvent('app-login', { detail: this.currentUser }));
  },

  lock() {
    this.currentUser = null;

    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.classList.add('active');
    }

    const pinInput = document.getElementById('loginPin');
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
