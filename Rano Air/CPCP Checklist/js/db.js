// Local data persistence layer for CPCP Check Tracker app using IndexedDB
const db = {
  db: null,
  init() {
    if (!window.indexedDB) {
      console.error('IndexedDB is not supported.');
      return;
    }

    const request = window.indexedDB.open('RanoAirCPCPTrackerDB', 1);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains('checks')) {
        const store = database.createObjectStore('checks', { keyPath: 'id', autoIncrement: true });
        store.createIndex('aircraftRegistration', 'aircraftRegistration', { unique: false });
        store.createIndex('isActive', 'isActive', { unique: false });
      }

      if (!database.objectStoreNames.contains('tasks')) {
        const store = database.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        store.createIndex('checkId', 'checkId', { unique: false });
        store.createIndex('checkType', 'checkType', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!database.objectStoreNames.contains('personnel')) {
        const store = database.createObjectStore('personnel', { keyPath: 'id', autoIncrement: true });
        store.createIndex('staffId', 'staffId', { unique: true });
        store.createIndex('role', 'role', { unique: false });
      }

      if (!database.objectStoreNames.contains('audit_log')) {
        const store = database.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true });
        store.createIndex('checkId', 'checkId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!database.objectStoreNames.contains('dsr_snapshots')) {
        const store = database.createObjectStore('dsr_snapshots', { keyPath: 'id', autoIncrement: true });
        store.createIndex('checkId', 'checkId', { unique: false });
        store.createIndex('generatedAt', 'generatedAt', { unique: false });
      }
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', event.target.error);
    };

    request.onsuccess = (event) => {
      this.db = event.target.result;
      console.log('IndexedDB initialized.');
      window.dispatchEvent(new Event('db-ready'));
    };
  },

  // Active check operations
  async addCheck(check) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('checks', 'readwrite');
      const store = tx.objectStore('checks');
      const req = store.add(check);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async updateCheck(check) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('checks', 'readwrite');
      const store = tx.objectStore('checks');
      const req = store.put(check);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getActiveCheck() {
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('checks', 'readonly');
      const store = tx.objectStore('checks');
      const index = store.index('isActive');
      const req = index.getAll(1); // 1 for true
      req.onsuccess = () => {
        const results = req.result || [];
        resolve(results.length > 0 ? results[0] : null);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getAllChecks() {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('checks', 'readonly');
      const store = tx.objectStore('checks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // Tasks operations
  async addTask(task) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const req = store.add(task);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async addTasksBulk(tasks) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      let index = 0;
      
      function addNext() {
        if (index < tasks.length) {
          const req = store.add(tasks[index]);
          req.onsuccess = () => {
            index++;
            addNext();
          };
          req.onerror = () => reject(req.error);
        } else {
          resolve();
        }
      }
      addNext();
    });
  },

  async getTasksForCheck(checkId) {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tasks', 'readonly');
      const store = tx.objectStore('tasks');
      const index = store.index('checkId');
      const req = index.getAll(checkId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async updateTask(task) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const req = store.put(task);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async updateTasksBulk(tasks) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      let index = 0;
      
      function updateNext() {
        if (index < tasks.length) {
          const req = store.put(tasks[index]);
          req.onsuccess = () => {
            index++;
            updateNext();
          };
          req.onerror = () => reject(req.error);
        } else {
          resolve();
        }
      }
      updateNext();
    });
  },

  async deleteTask(id) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // Personnel operations
  async addPerson(person) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('personnel', 'readwrite');
      const store = tx.objectStore('personnel');
      const req = store.add(person);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllPersonnel() {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('personnel', 'readonly');
      const store = tx.objectStore('personnel');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // Audit operations
  async addAuditEntry(entry) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audit_log', 'readwrite');
      const store = tx.objectStore('audit_log');
      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAuditEntriesForCheck(checkId) {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audit_log', 'readonly');
      const store = tx.objectStore('audit_log');
      const index = store.index('checkId');
      const req = index.getAll(checkId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // DSR snapshots operations
  async addDSRSnapshot(snapshot) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('dsr_snapshots', 'readwrite');
      const store = tx.objectStore('dsr_snapshots');
      const req = store.add(snapshot);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getDSRSnapshots(checkId) {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('dsr_snapshots', 'readonly');
      const store = tx.objectStore('dsr_snapshots');
      const index = store.index('checkId');
      const req = index.getAll(checkId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // Database maintenance
  async clearAll() {
    if (!this.db) return;
    const stores = ['checks', 'tasks', 'personnel', 'audit_log', 'dsr_snapshots'];
    const tx = this.db.transaction(stores, 'readwrite');
    return Promise.all(stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }));
  }
};

export default db;
