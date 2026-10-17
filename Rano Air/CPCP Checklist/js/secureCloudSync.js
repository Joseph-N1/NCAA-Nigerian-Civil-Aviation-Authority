const CLOUD_STORAGE_KEY = 'rano-air-cpcp-cloud-config';
const CLOUD_SESSION_KEY = 'rano-air-cpcp-cloud-session';
const CLOUD_ENDPOINT = '/.netlify/functions/cpcp-sync';

export const cloudSync = {
  config: {
    enabled: true,
    roomCode: 'RANO-C-CHECK',
    lastRevision: 0,
    lastSyncTimestamp: null,
    syncIntervalSec: 30
  },
  session: null,
  isSyncing: false,
  pollTimer: null,
  debounceTimer: null,
  statusListeners: [],

  init() {
    this.loadConfig();
    this.loadSession();
    this.startAutoSync();
  },

  loadConfig() {
    try {
      const saved = localStorage.getItem(CLOUD_STORAGE_KEY);
      if (saved) this.config = { ...this.config, ...JSON.parse(saved) };
    } catch {
      this.notifyStatus('ERROR', 'Cloud settings could not be read.');
    }
  },

  loadSession() {
    try {
      const saved = sessionStorage.getItem(CLOUD_SESSION_KEY);
      if (!saved) return;
      const session = JSON.parse(saved);
      if (session.token && new Date(session.expiresAt).getTime() > Date.now()) this.session = session;
      else sessionStorage.removeItem(CLOUD_SESSION_KEY);
    } catch {
      sessionStorage.removeItem(CLOUD_SESSION_KEY);
    }
  },

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(this.config));
    this.notifyStatus('CONFIG_SAVED');
    this.startAutoSync();
  },

  async authenticate(username, pin) {
    const response = await fetch(CLOUD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'authenticate', username, pin })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Sign-in failed.');

    this.session = { token: result.token, expiresAt: result.expiresAt, user: result.user };
    sessionStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(this.session));
    this.startAutoSync();
    return result.user;
  },

  logout() {
    this.session = null;
    sessionStorage.removeItem(CLOUD_SESSION_KEY);
    if (this.pollTimer) clearInterval(this.pollTimer);
  },

  onStatusChange(callback) {
    this.statusListeners.push(callback);
  },

  notifyStatus(status, detail = null) {
    this.statusListeners.forEach(callback => {
      try { callback(status, detail); } catch (error) { console.error(error); }
    });
    window.dispatchEvent(new CustomEvent('cloud-sync-status', { detail: { status, detail } }));
  },

  startAutoSync() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (!this.config.enabled || !this.session) return;

    const intervalMs = Math.max(30, this.config.syncIntervalSec || 30) * 1000;
    this.pollTimer = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) this.pullFromCloud(true);
    }, intervalMs);
  },

  queueAutoPush(db) {
    if (!this.config.enabled || !this.session || !navigator.onLine || this.session.user?.isReadOnly) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.pushToCloud(db), 2500);
  },

  async request(body) {
    if (!this.session?.token) throw new Error('Please sign in before syncing.');
    const response = await fetch(CLOUD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.session.token}` },
      body: JSON.stringify({ ...body, roomCode: this.config.roomCode })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || 'Cloud sync failed.');
      error.code = result.code;
      error.record = result.record;
      error.status = response.status;
      throw error;
    }
    return result;
  },

  async syncNow(db) {
    if (!navigator.onLine) {
      this.notifyStatus('OFFLINE', 'No internet connection. Local data remains available.');
      return { success: false, reason: 'offline' };
    }
    if (!this.session) return { success: false, reason: 'sign in required' };

    this.isSyncing = true;
    this.notifyStatus('SYNCING', 'Synchronizing securely...');
    try {
      await this.pullFromCloud(false, db);
      if (!this.session.user?.isReadOnly) await this.pushToCloud(db);
      this.config.lastSyncTimestamp = new Date().toISOString();
      this.saveConfig({});
      this.notifyStatus('SYNCED', 'Cloud data is synchronized.');
      return { success: true };
    } catch (error) {
      if (error.status === 401) this.logout();
      this.notifyStatus('ERROR', error.message);
      return { success: false, reason: error.message };
    } finally {
      this.isSyncing = false;
    }
  },

  async pullFromCloud(silent = false, dbInstance = null) {
    const db = dbInstance || window.App?.db;
    if (!db?.db || !this.session) return null;
    const { record } = await this.request({ action: 'pull' });
    if (!record) return null;

    this.config.lastRevision = record.revision;
    const localActive = await db.getActiveCheck();
    const localUpdated = new Date(localActive?.updatedAt || localActive?.createdAt || 0).getTime();
    const remoteUpdated = new Date(record.updatedAt || 0).getTime();
    if (!localActive || remoteUpdated > localUpdated) {
      await this.applyCloudPayload(record.payload, db);
      if (!silent) this.notifyStatus('UPDATED', `Loaded revision ${record.revision}.`);
      window.dispatchEvent(new CustomEvent('cloud-data-applied', { detail: record.payload }));
    }
    return record;
  },

  async pushToCloud(db) {
    if (!db?.db || !this.session || this.session.user?.isReadOnly) return;
    const activeCheck = await db.getActiveCheck();
    if (!activeCheck) return;

    const payload = {
      updatedAt: new Date().toISOString(),
      activeCheck,
      tasks: await db.getTasksForCheck(activeCheck.id),
      personnel: await db.getAllPersonnel(),
      audit: (await db.getAuditEntriesForCheck(activeCheck.id)).slice(-50)
    };

    try {
      const { record } = await this.request({ action: 'push', baseRevision: this.config.lastRevision || 0, payload });
      this.config.lastRevision = record.revision;
      this.saveConfig({});
      this.notifyStatus('PUSH_SUCCESS');
    } catch (error) {
      if (error.code === 'REVISION_CONFLICT' && error.record) {
        this.config.lastRevision = error.record.revision;
        await this.applyCloudPayload(error.record.payload, db);
        window.dispatchEvent(new CustomEvent('cloud-data-applied', { detail: error.record.payload }));
      }
      throw error;
    }
  },

  async applyCloudPayload(data, db) {
    const { activeCheck, tasks, personnel } = data || {};
    if (!activeCheck) return;
    const existingChecks = await db.getAllChecks();
    const matchedCheck = existingChecks.find(check => check.id === activeCheck.id);
    for (const check of existingChecks) {
      if (check.id !== activeCheck.id && check.isActive) await db.updateCheck({ ...check, isActive: 0 });
    }
    if (matchedCheck) await db.updateCheck({ ...activeCheck, isActive: 1 });
    else await db.addCheck({ ...activeCheck, isActive: 1 });

    if (Array.isArray(tasks)) await db.updateTasksBulk(tasks);
    if (Array.isArray(personnel)) {
      for (const person of personnel) {
        try { await db.addPerson(person); } catch {}
      }
    }
    if (window.App?.loadInitialData) await window.App.loadInitialData();
  }
};
