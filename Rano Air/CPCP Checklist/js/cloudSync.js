/**
 * Rano Air CPCP Progress Tracker - Cloud Synchronization Engine
 * Multi-Device Real-Time Sync between MCC, LBMM, DEV, and Certifiers.
 *
 * Supports:
 * 1. Instant Cloud Room Sync (Plug-and-play, zero account needed)
 * 2. Supabase Cloud Database (Free tier REST API)
 * 3. Firebase Firestore (Free tier REST API)
 * 4. Offline-first fallback to local IndexedDB
 */

const CLOUD_STORAGE_KEY = 'rano-air-cpcp-cloud-config';

export const cloudSync = {
  config: {
    enabled: true,
    provider: 'relay', // 'relay' | 'supabase' | 'firebase'
    roomCode: 'RANO-C-CHECK',
    supabaseUrl: '',
    supabaseKey: '',
    firebaseProjectId: '',
    firebaseApiKey: '',
    lastSyncTimestamp: null,
    syncIntervalSec: 15
  },

  isSyncing: false,
  pollTimer: null,
  debounceTimer: null,
  statusListeners: [],

  init() {
    this.loadConfig();
    this.startAutoSync();
    console.log('[CloudSync] Engine initialized. Provider:', this.config.provider, 'Room:', this.config.roomCode);
  },

  loadConfig() {
    try {
      const saved = localStorage.getItem(CLOUD_STORAGE_KEY);
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[CloudSync] Failed to parse cloud config:', e);
    }
  },

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(this.config));
    this.notifyStatus('CONFIG_SAVED');
    this.startAutoSync();
  },

  onStatusChange(callback) {
    this.statusListeners.push(callback);
  },

  notifyStatus(status, detail = null) {
    this.statusListeners.forEach(cb => {
      try { cb(status, detail); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('cloud-sync-status', { detail: { status, detail } }));
  },

  startAutoSync() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (!this.config.enabled) return;

    setTimeout(() => this.pullFromCloud(), 2000);

    const intervalMs = Math.max(10, this.config.syncIntervalSec || 15) * 1000;
    this.pollTimer = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.pullFromCloud(true);
      }
    }, intervalMs);
  },

  queueAutoPush(db) {
    if (!this.config.enabled || !navigator.onLine) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.pushToCloud(db);
    }, 2500);
  },

  async syncNow(db) {
    if (!navigator.onLine) {
      this.notifyStatus('OFFLINE', 'No internet connection. Operating in offline IndexedDB mode.');
      return { success: false, reason: 'offline' };
    }

    this.isSyncing = true;
    this.notifyStatus('SYNCING', 'Synchronizing with cloud...');

    try {
      await this.pullFromCloud(false, db);
      await this.pushToCloud(db);

      this.config.lastSyncTimestamp = new Date().toISOString();
      this.saveConfig({});

      this.notifyStatus('SYNCED', 'All checks, tasks, and defects are synchronized.');
      return { success: true };
    } catch (err) {
      console.error('[CloudSync] Sync error:', err);
      this.notifyStatus('ERROR', err.message || 'Sync failed');
      return { success: false, error: err };
    } finally {
      this.isSyncing = false;
    }
  },

  async pushToCloud(db) {
    if (!db || !db.db) return;

    try {
      const activeCheck = await db.getActiveCheck();
      if (!activeCheck) return;

      const tasks = await db.getTasksForCheck(activeCheck.id);
      const personnel = await db.getAllPersonnel();
      const audit = await db.getAuditLog(activeCheck.id);

      const payload = {
        roomCode: this.config.roomCode || 'RANO-C-CHECK',
        updatedAt: new Date().toISOString(),
        activeCheck,
        tasks,
        personnel,
        audit: (audit || []).slice(0, 50)
      };

      if (this.config.provider === 'supabase' && this.config.supabaseUrl && this.config.supabaseKey) {
        await this.pushToSupabase(payload);
      } else if (this.config.provider === 'firebase' && this.config.firebaseProjectId) {
        await this.pushToFirebase(payload);
      } else {
        await this.pushToCloudRelay(payload);
      }

      this.notifyStatus('PUSH_SUCCESS');
    } catch (err) {
      console.warn('[CloudSync] Push error:', err);
    }
  },

  async pullFromCloud(silent = false, dbInstance = null) {
    const db = dbInstance || window.App?.db;
    if (!db || !db.db) return;

    try {
      let cloudData = null;
      if (this.config.provider === 'supabase' && this.config.supabaseUrl && this.config.supabaseKey) {
        cloudData = await this.pullFromSupabase();
      } else if (this.config.provider === 'firebase' && this.config.firebaseProjectId) {
        cloudData = await this.pullFromFirebase();
      } else {
        cloudData = await this.pullFromCloudRelay();
      }

      if (!cloudData || !cloudData.activeCheck) return;

      const localActive = await db.getActiveCheck();
      const cloudUpdated = new Date(cloudData.updatedAt || 0).getTime();
      const localUpdated = localActive ? new Date(localActive.updatedAt || localActive.createdAt || 0).getTime() : 0;

      if (!localActive || cloudUpdated > localUpdated) {
        console.log('[CloudSync] Applying newer cloud data for check:', cloudData.activeCheck.aircraftRegistration);
        await this.applyCloudPayload(cloudData, db);

        if (!silent) {
          this.notifyStatus('UPDATED', `Loaded latest check for ${cloudData.activeCheck.aircraftRegistration}`);
        }
        window.dispatchEvent(new CustomEvent('cloud-data-applied', { detail: cloudData }));
      }
    } catch (err) {
      if (!silent) console.warn('[CloudSync] Pull error:', err);
    }
  },

  async applyCloudPayload(data, db) {
    const { activeCheck, tasks, personnel } = data;
    if (!activeCheck) return;

    const existingChecks = await db.getAllChecks();
    for (const c of existingChecks) {
      if (c.id === activeCheck.id) {
        await db.updateCheck({ ...activeCheck, isActive: 1 });
      } else if (c.isActive) {
        c.isActive = 0;
        await db.updateCheck(c);
      }
    }

    const checkExists = existingChecks.some(c => c.id === activeCheck.id);
    if (!checkExists) {
      await db.addCheck({ ...activeCheck, isActive: 1 });
    }

    if (tasks && tasks.length > 0) {
      const localTasks = await db.getTasksForCheck(activeCheck.id);
      for (const lt of localTasks) {
        try {
          const tx = db.db.transaction('tasks', 'readwrite');
          tx.objectStore('tasks').delete(lt.id);
        } catch (e) {}
      }
      for (const t of tasks) {
        try {
          const tx = db.db.transaction('tasks', 'readwrite');
          tx.objectStore('tasks').put(t);
        } catch (e) {}
      }
    }

    if (personnel && personnel.length > 0) {
      for (const p of personnel) {
        try { await db.addPerson(p); } catch (e) {}
      }
    }

    if (window.App && typeof window.App.loadInitialData === 'function') {
      await window.App.loadInitialData();
      if (window.App.refreshDashboard) {
        await window.App.refreshDashboard();
      }
    }
  },

  async pushToCloudRelay(payload) {
    const room = encodeURIComponent(this.config.roomCode || 'RANO-C-CHECK');
    const endpoint = `https://api.jsonstorage.net/v1/json/rano-${room}`;
    try {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      localStorage.setItem('rano-cpcp-relay-backup', JSON.stringify(payload));
    }
  },

  async pullFromCloudRelay() {
    const room = encodeURIComponent(this.config.roomCode || 'RANO-C-CHECK');
    const endpoint = `https://api.jsonstorage.net/v1/json/rano-${room}`;
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      const localBackup = localStorage.getItem('rano-cpcp-relay-backup');
      if (localBackup) return JSON.parse(localBackup);
    }
    return null;
  },

  async pushToSupabase(payload) {
    const url = `${this.config.supabaseUrl}/rest/v1/cpcp_sync`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': this.config.supabaseKey,
        'Authorization': `Bearer ${this.config.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        room_code: payload.roomCode,
        data: payload,
        updated_at: payload.updatedAt
      })
    });
    if (!res.ok) throw new Error(`Supabase push error: ${res.statusText}`);
  },

  async pullFromSupabase() {
    const room = encodeURIComponent(this.config.roomCode || 'RANO-C-CHECK');
    const url = `${this.config.supabaseUrl}/rest/v1/cpcp_sync?room_code=eq.${room}&select=*&order=updated_at.desc&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey': this.config.supabaseKey,
        'Authorization': `Bearer ${this.config.supabaseKey}`
      }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows && rows[0] ? rows[0].data : null;
  },

  async pushToFirebase(payload) {
    const project = this.config.firebaseProjectId;
    const room = encodeURIComponent(this.config.roomCode || 'RANO-C-CHECK');
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/cpcp_rooms/${room}`;
    
    const doc = {
      fields: {
        roomCode: { stringValue: payload.roomCode },
        updatedAt: { stringValue: payload.updatedAt },
        payloadJSON: { stringValue: JSON.stringify(payload) }
      }
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    if (!res.ok) throw new Error(`Firebase push error: ${res.statusText}`);
  },

  async pullFromFirebase() {
    const project = this.config.firebaseProjectId;
    const room = encodeURIComponent(this.config.roomCode || 'RANO-C-CHECK');
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/cpcp_rooms/${room}`;
    
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.fields && json.fields.payloadJSON) {
      return JSON.parse(json.fields.payloadJSON.stringValue);
    }
    return null;
  }
};
