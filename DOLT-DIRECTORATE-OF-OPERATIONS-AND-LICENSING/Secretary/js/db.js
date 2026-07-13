// Local data persistence layer for the Secretary app
// Placeholder implementation using IndexedDB

const db = {
  db: null,
  init() {
    if (!window.indexedDB) {
      console.error('IndexedDB is not supported.');
      return;
    }

    const request = window.indexedDB.open('NCAADoltSecretaryDB', 2);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains('records')) {
        const store = database.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        store.createIndex('serialNumber', 'serialNumber', { unique: false });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('companyAirline', 'companyAirline', { unique: false });
        store.createIndex('licenseNumber', 'licenseNumber', { unique: false });
        store.createIndex('dispatchedTo', 'dispatchedTo', { unique: false });
        store.createIndex('dateReceived', 'dateReceived', { unique: false });
      }

      if (!database.objectStoreNames.contains('audit_log')) {
        const store = database.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true });
        store.createIndex('recordId', 'recordId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('user', 'user', { unique: false });
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

  async addRecord(record) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllRecords() {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('records', 'readonly');
      const store = tx.objectStore('records');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async updateRecord(record) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteRecord(id) {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

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

  async getAllAuditEntries() {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audit_log', 'readonly');
      const store = tx.objectStore('audit_log');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
};

export default db;
