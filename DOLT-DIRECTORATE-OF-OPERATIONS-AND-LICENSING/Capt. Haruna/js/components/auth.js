// ============================================
// NCAA DOLT License Management System
// Authentication System — js/components/auth.js
// ============================================

const Auth = {
  currentPin: '',
  currentUser: null, // { username: 'GM', role: 'GM' } or Assistant
  isSetupMode: false,
  setupRole: 'GM',
  setupPins: { GM: '', Assistant: '' },

  async init() {
    this.setupEventListeners();
    await this.checkFirstRun();
  },

  async checkFirstRun() {
    const firstRun = await window.DB.isFirstRun();
    if (firstRun) {
      this.isSetupMode = true;
      this.setupRole = 'GM';
      this.updateSetupUI();
    } else {
      this.isSetupMode = false;
      this.currentUser = null;
      this.showLoginUI();
    }
  },

  setupEventListeners() {
    // Pin Pad buttons
    document.querySelectorAll('.pin-btn[data-num]').forEach(btn => {
      btn.addEventListener('click', () => this.handlePinDigit(btn.getAttribute('data-num')));
    });

    // Pin Pad Actions
    document.querySelector('.pin-btn[data-action="clear"]').addEventListener('click', () => this.clearPin());
    document.querySelector('.pin-btn[data-action="backspace"]').addEventListener('click', () => this.handleBackspace());

    // Role Selection Click
    document.querySelectorAll('#authRoleSelector .role-card').forEach(card => {
      card.addEventListener('click', () => {
        if (this.isSetupMode) return; // In setup mode, flow is linear: GM first, then Assistant
        
        document.querySelectorAll('#authRoleSelector .role-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Lock button in navigation
    document.getElementById('btnLockApp').addEventListener('click', () => this.lock());
  },

  updateSetupUI() {
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const statusText = document.getElementById('authStatusText');
    const roleSelector = document.getElementById('authRoleSelector');

    roleSelector.classList.add('hidden'); // Hide during linear PIN setup
    
    if (this.setupRole === 'GM') {
      title.innerText = 'Initialize System (Step 1)';
      subtitle.innerText = 'Set a 4-digit security PIN for General Manager (GM)';
    } else {
      title.innerText = 'Initialize System (Step 2)';
      subtitle.innerText = 'Set a 4-digit security PIN for assistants/entry operators';
    }

    statusText.innerText = 'Enter 4-digit PIN to set';
    this.clearPin();
  },

  showLoginUI() {
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const roleSelector = document.getElementById('authRoleSelector');
    const statusText = document.getElementById('authStatusText');

    title.innerText = 'NCAA DOLT Database';
    subtitle.innerText = 'Select your role and enter PIN';
    roleSelector.classList.remove('hidden');
    statusText.innerText = 'Enter 4-digit PIN';
    this.clearPin();
  },

  handlePinDigit(digit) {
    if (this.currentPin.length >= 4) return;
    
    this.currentPin += digit;
    this.updatePinDots();

    if (this.currentPin.length === 4) {
      // Small timeout so user sees the final dot active before checking
      setTimeout(() => this.processPin(), 250);
    }
  },

  handleBackspace() {
    if (this.currentPin.length === 0) return;
    this.currentPin = this.currentPin.slice(0, -1);
    this.updatePinDots();
  },

  clearPin() {
    this.currentPin = '';
    this.updatePinDots();
  },

  updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      if (index < this.currentPin.length) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  },

  async processPin() {
    if (this.isSetupMode) {
      this.handlePinSetup();
    } else {
      await this.handlePinLogin();
    }
  },

  async handlePinSetup() {
    if (this.setupRole === 'GM') {
      this.setupPins.GM = this.currentPin;
      window.Toast.success('GM PIN Stored', 'Proceeding to Assistant PIN setup.');
      this.setupRole = 'Assistant';
      this.updateSetupUI();
    } else {
      this.setupPins.Assistant = this.currentPin;
      
      // Save to database
      try {
        await window.DB.addUser('GM', this.setupPins.GM, 'GM');
        await window.DB.addUser('Assistant', this.setupPins.Assistant, 'Assistant');
        await window.seedSampleData();
        
        window.Toast.success('Configuration Saved', 'Security initialization successful.');
        this.isSetupMode = false;
        this.showLoginUI();
      } catch (e) {
        window.Toast.error('Setup Failed', e.message);
        this.isSetupMode = true;
        this.setupRole = 'GM';
        this.updateSetupUI();
      }
    }
  },

  async handlePinLogin() {
    // Get selected role card
    const activeRoleCard = document.querySelector('#authRoleSelector .role-card.active');
    if (!activeRoleCard) return;

    const username = activeRoleCard.getAttribute('data-role'); // 'GM' or 'Assistant'
    const user = await window.DB.verifyPin(username, this.currentPin);

    if (user) {
      this.currentUser = user;
      window.Toast.success('Access Granted', `Welcome back, ${user.username}.`);
      this.unlockApp();
    } else {
      window.Toast.error('Invalid PIN', 'The PIN entered is incorrect. Please try again.');
      this.clearPin();
    }
  },

  unlockApp() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.remove('active');
    
    // Update profile bar on sidebar
    document.getElementById('navUserName').innerText = this.currentUser.username === 'GM' ? 'General Manager' : 'Officer Account';
    document.getElementById('navUserRole').innerText = this.currentUser.role === 'GM' ? 'GM (DOLT)' : 'Assistant (Entry)';
    
    // Dispatch login event
    window.dispatchEvent(new CustomEvent('app-login', { detail: this.currentUser }));
  },

  lock() {
    this.currentUser = null;
    this.clearPin();
    
    const overlay = document.getElementById('authOverlay');
    overlay.classList.add('active');
    
    // If not setup mode, show login
    this.checkFirstRun();
  },

  getUser() {
    return this.currentUser;
  },

  hasWriteAccess() {
    return this.currentUser && this.currentUser.role === 'Assistant';
  }
};

window.Auth = Auth;
