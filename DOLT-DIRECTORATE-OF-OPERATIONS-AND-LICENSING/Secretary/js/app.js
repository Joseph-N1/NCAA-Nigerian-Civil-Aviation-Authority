// Secretary app startup code
const USERS = [
  { email: 'gm@ncaa.gov.ng', role: 'GM', pin: '1111' },
  { email: 'sec1@ncaa.gov.ng', role: 'Secretary', pin: '2222' },
  { email: 'sec2@ncaa.gov.ng', role: 'Secretary', pin: '3333' }
];

const App = {
  currentUser: null,
  records: [],

  async init() {
    this.currentUser = { email: 'guest@ncaa.gov.ng', role: 'GM' };
    this.bindEvents();

    // Await DB readiness before rendering so the table is never empty on load.
    // This eliminates the race condition that caused a "static page" on Live Server.
    await new Promise((resolve) => {
      window.addEventListener('db-ready', resolve, { once: true });
      db.init();
    });

    await this.loadRecords();
    this.showApp();
  },

  bindEvents() {
    const logoutBtn = document.getElementById('logoutBtn');
    const addRecordBtn = document.getElementById('addRecordBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelRecordBtn = document.getElementById('cancelRecordBtn');
    const recordForm = document.getElementById('recordForm');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dispatchFilter = document.getElementById('dispatchFilter');
    const exportBtn = document.getElementById('exportBtn');
    const printBtn = document.getElementById('printBtn');
    const importBtn = document.getElementById('importBtn');
    const sampleDataBtn = document.getElementById('sampleDataBtn');
    const importFileInput = document.getElementById('importFileInput');

    logoutBtn.addEventListener('click', () => this.logout());
    addRecordBtn.addEventListener('click', () => this.openModal());
    closeModalBtn.addEventListener('click', () => this.closeModal());
    cancelRecordBtn.addEventListener('click', () => this.closeModal());
    recordForm.addEventListener('submit', (event) => this.saveRecord(event));
    searchInput.addEventListener('input', () => this.renderTable());
    statusFilter.addEventListener('change', () => this.renderTable());
    dispatchFilter.addEventListener('change', () => this.renderTable());
    exportBtn.addEventListener('click', () => this.exportCsv());
    printBtn.addEventListener('click', () => this.printTable());
    importBtn.addEventListener('click', () => importFileInput.click());
    sampleDataBtn.addEventListener('click', () => this.loadSampleData());
    importFileInput.addEventListener('change', (event) => this.importBackup(event));
    const backupExportBtn = document.getElementById('backupExportBtn');
    if (backupExportBtn) {
      backupExportBtn.addEventListener('click', () => this.exportBackup());
    }
  },

  handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pin = document.getElementById('loginPin').value.trim();
    const user = USERS.find((item) => item.email === email && item.pin === pin);

    if (!user) {
      this.showMessage('Invalid credentials. Use a registered work email and PIN.', 'error');
      return;
    }

    this.currentUser = user;
    this.showApp();
    this.showMessage('');
    this.resetLoginForm();
  },

  resetLoginForm() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPin').value = '';
  },

  showApp() {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) {
      loginOverlay.classList.add('hidden');
    }
    document.getElementById('appShell').classList.remove('hidden');
    document.getElementById('userName').textContent = this.currentUser.email;
    document.getElementById('userRole').textContent = this.currentUser.role;
    this.renderTable();
  },

  logout() {
    this.currentUser = null;
    document.getElementById('appShell').classList.remove('hidden');
    document.getElementById('userName').textContent = 'Guest';
    document.getElementById('userRole').textContent = 'Visitor';
    this.currentUser = { email: 'guest@ncaa.gov.ng', role: 'GM' };
    this.renderTable();
  },

  async loadRecords() {
    this.records = await db.getAllRecords() || [];
    if (this.records.length === 0 && !localStorage.getItem('doltSampleSeeded')) {
      await this.loadSampleData();
      localStorage.setItem('doltSampleSeeded', 'true');
    }
    this.updateSummary();
    this.renderTable();
  },

  updateSummary() {
    const totalCount = document.getElementById('totalCount');
    const dispatchedCount = document.getElementById('dispatchedCount');
    const pendingCount = document.getElementById('pendingCount');
    const validationCount = document.getElementById('validationCount');

    totalCount.textContent = this.records.length;
    dispatchedCount.textContent = this.records.filter((record) => record.status === 'dispatched').length;
    pendingCount.textContent = this.records.filter((record) => record.status !== 'dispatched').length;
    validationCount.textContent = this.records.filter((record) => {
      const validationDate = new Date(record.licenseValidation);
      return validationDate < new Date();
    }).length;
  },

  renderTable() {
    const tbody = document.getElementById('recordsTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dispatchFilter = document.getElementById('dispatchFilter').value;
    const isGM = this.currentUser?.role === 'GM';

    const filtered = this.records.filter((record) => {
      const matchesSearch = [record.serialNumber, record.name, record.companyAirline, record.licenseNumber, record.subject, record.remark]
        .some((value) => value && value.toLowerCase().includes(searchTerm));

      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesDispatch = dispatchFilter === 'all' || record.dispatchedTo === dispatchFilter;
      return matchesSearch && matchesStatus && matchesDispatch;
    });

    tbody.innerHTML = filtered.map((record) => {
      const expired = this.isExpired(record);
      const rowClass = expired ? 'expired-record' : '';
      return `
      <tr class="${rowClass}">
        <td>${record.serialNumber || ''}</td>
        <td>${record.dateReceived || ''}</td>
        <td>${record.name || ''}</td>
        <td>${record.companyAirline || ''}</td>
        <td>${record.licenseNumber || ''}</td>
        <td>${record.subject || ''}</td>
        <td>${record.licenseValidation || ''}</td>
        <td>${record.dispatchedTo || ''}</td>
        <td>${record.remark || ''}</td>
        <td>
          <button class="btn btn-secondary" onclick="App.editRecord(${record.id})">Edit</button>
          ${isGM ? `<button class="btn btn-danger" onclick="App.deleteRecord(${record.id})">Delete</button>` : ''}
        </td>
      </tr>
    `;
    }).join('');
  },

  isExpired(record) {
    if (!record?.licenseValidation) return false;
    const validationDate = new Date(record.licenseValidation + 'T23:59:59');
    return validationDate < new Date();
  },

  openModal(record = null) {
    const restricted = this.currentUser?.role === 'Secretary';

    document.getElementById('recordModalOverlay').classList.remove('hidden');
    document.getElementById('recordModalTitle').textContent = record ? 'Edit record' : 'Add record';

    document.getElementById('recordId').value = record ? record.id : '';
    document.getElementById('recordSerial').value = record ? record.serialNumber : '';
    document.getElementById('recordDate').value = record ? record.dateReceived : '';
    document.getElementById('recordName').value = record ? record.name : '';
    document.getElementById('recordCompany').value = record ? record.companyAirline : '';
    document.getElementById('recordLicense').value = record ? record.licenseNumber : '';
    document.getElementById('recordSubject').value = record ? record.subject : '';
    document.getElementById('recordValidation').value = record ? record.licenseValidation : '';
    document.getElementById('recordDispatched').value = record ? record.dispatchedTo : 'Head-FCL';
    document.getElementById('recordRemark').value = record ? record.remark : '';
    document.getElementById('recordStatus').value = record ? record.status : 'received';

    document.getElementById('recordDispatched').disabled = restricted;
    document.getElementById('recordStatus').disabled = restricted;
  },

  closeModal() {
    document.getElementById('recordModalOverlay').classList.add('hidden');
    document.getElementById('recordForm').reset();
    document.getElementById('recordId').value = '';
    document.getElementById('recordDispatched').disabled = false;
    document.getElementById('recordStatus').disabled = false;
  },

  editRecord(id) {
    const record = this.records.find((item) => item.id === id);
    if (record) {
      this.openModal(record);
    }
  },

  async saveRecord(event) {
    event.preventDefault();
    const id = document.getElementById('recordId').value;
    const record = {
      serialNumber: document.getElementById('recordSerial').value.trim(),
      dateReceived: document.getElementById('recordDate').value,
      name: document.getElementById('recordName').value.trim(),
      companyAirline: document.getElementById('recordCompany').value.trim(),
      licenseNumber: document.getElementById('recordLicense').value.trim(),
      subject: document.getElementById('recordSubject').value.trim(),
      licenseValidation: document.getElementById('recordValidation').value,
      dispatchedTo: document.getElementById('recordDispatched').value,
      remark: document.getElementById('recordRemark').value.trim(),
      status: document.getElementById('recordStatus').value,
      updatedAt: new Date().toISOString(),
      updatedBy: this.currentUser ? this.currentUser.email : 'unknown'
    };

    if (!record.serialNumber || !record.dateReceived || !record.name || !record.companyAirline || !record.licenseNumber || !record.subject || !record.licenseValidation) {
      alert('Please fill in all required fields.');
      return;
    }

    if (id) {
      record.id = Number(id);
      await db.updateRecord(record);
      this.records = this.records.map((item) => item.id === record.id ? record : item);
    } else {
      record.createdAt = new Date().toISOString();
      record.createdBy = this.currentUser ? this.currentUser.email : 'unknown';
      const newId = await db.addRecord(record);
      record.id = newId;
      this.records.push(record);
    }

    this.updateSummary();
    this.renderTable();
    this.closeModal();
  },

  async deleteRecord(id) {
    if (this.currentUser?.role !== 'GM') {
      alert('Only GM users can delete records.');
      return;
    }

    if (!confirm('Delete this record permanently?')) {
      return;
    }

    await db.deleteRecord(id);
    this.records = this.records.filter((item) => item.id !== id);
    this.updateSummary();
    this.renderTable();
  },

  printTable() {
    window.print();
  },

  async loadSampleData() {
    const sample = [
      {
        serialNumber: '001',
        dateReceived: '2026-06-01',
        name: 'Capt. A. Yusuf',
        companyAirline: 'Air Peace',
        licenseNumber: 'ATPL/2451',
        subject: 'ATPL renewal application',
        licenseValidation: '2026-12-15',
        dispatchedTo: 'Head-FCL',
        remark: 'Urgent review required',
        status: 'received'
      },
      {
        serialNumber: '002',
        dateReceived: '2026-06-02',
        name: 'Mr. B. Okoro',
        companyAirline: 'Arik Air',
        licenseNumber: 'AMEL/1189',
        subject: 'Maintenance engineer license update',
        licenseValidation: '2025-12-01',
        dispatchedTo: 'Head-AMEL',
        remark: 'Validation expired - awaiting resubmission',
        status: 'in-review'
      },
      {
        serialNumber: '003',
        dateReceived: '2026-06-03',
        name: 'Ms. C. Amadi',
        companyAirline: 'Dana Air',
        licenseNumber: 'CCL/0742',
        subject: 'Cabin crew license validation',
        licenseValidation: '2024-11-02',
        dispatchedTo: 'Head-CCL',
        remark: 'Awaiting Head signature',
        status: 'dispatched'
      },
      {
        serialNumber: '004',
        dateReceived: '2026-06-05',
        name: 'Capt. D. Bello',
        companyAirline: 'Ibom Air',
        licenseNumber: 'FDL/3320',
        subject: 'Flight dispatcher license conversion',
        licenseValidation: '2027-03-20',
        dispatchedTo: 'Head-FDL',
        remark: 'Documents complete',
        status: 'dispatched'
      },
      {
        serialNumber: '005',
        dateReceived: '2026-06-08',
        name: 'Engr. E. Nwosu',
        companyAirline: 'Aero Contractors',
        licenseNumber: 'AMEL/2077',
        subject: 'Type rating endorsement request',
        licenseValidation: '2026-09-30',
        dispatchedTo: 'Head-AMEL',
        remark: 'Pending fee confirmation',
        status: 'received'
      },
      {
        serialNumber: '006',
        dateReceived: '2026-06-11',
        name: 'Ms. F. Ibrahim',
        companyAirline: 'Green Africa',
        licenseNumber: 'CPL/5561',
        subject: 'CPL medical revalidation',
        licenseValidation: '2025-07-01',
        dispatchedTo: 'Others',
        remark: 'Referred to medical unit',
        status: 'in-review'
      },
      {
        serialNumber: '007',
        dateReceived: '2026-06-14',
        name: 'Capt. G. Adeyemi',
        companyAirline: 'United Nigeria',
        licenseNumber: 'ATPL/6690',
        subject: 'License validation extension',
        licenseValidation: '2027-01-10',
        dispatchedTo: 'Head-FCL',
        remark: 'Approved and filed',
        status: 'dispatched'
      }
    ];

    for (const record of sample) {
      record.createdAt = new Date().toISOString();
      record.createdBy = this.currentUser ? this.currentUser.email : 'sample';
      const newId = await db.addRecord(record);
      record.id = newId;
      this.records.push(record);
    }

    this.updateSummary();
    this.renderTable();
  },

  async importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    let importedRecords;

    try {
      importedRecords = JSON.parse(text);
      if (!Array.isArray(importedRecords)) {
        throw new Error('Backup file is not a valid records array.');
      }
    } catch (error) {
      alert('Could not import backup: ' + error.message);
      return;
    }

    const confirmImport = confirm(`Import ${importedRecords.length} records from backup? This will append them to existing data.`);
    if (!confirmImport) {
      return;
    }

    for (const imported of importedRecords) {
      const record = {
        serialNumber: imported.serialNumber || imported.SN || imported.serial || '',
        dateReceived: imported.dateReceived || imported.date || '',
        name: imported.name || '',
        companyAirline: imported.companyAirline || imported.company || imported.airline || '',
        licenseNumber: imported.licenseNumber || imported.license || '',
        subject: imported.subject || '',
        licenseValidation: imported.licenseValidation || imported.validation || '',
        dispatchedTo: imported.dispatchedTo || imported.dispatched || 'Head-FCL',
        remark: imported.remark || '',
        status: imported.status || 'received',
        createdAt: new Date().toISOString(),
        createdBy: this.currentUser ? this.currentUser.email : 'backup'
      };
      const id = await db.addRecord(record);
      record.id = id;
      this.records.push(record);
    }

    event.target.value = '';
    this.updateSummary();
    this.renderTable();
    alert('Backup imported successfully.');
  },

  exportBackup() {
    const backupData = JSON.stringify(this.records, null, 2);
    const blob = new Blob([backupData], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dolt-secretary-backup-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  exportCsv() {
    const headers = ['S/N', 'Date', 'Name', 'Company / Airline', 'License Type/Number', 'Subject', 'License Validation', 'Dispatched', 'Remark', 'Status'];
    const rows = this.records.map((record) => [
      record.serialNumber,
      record.dateReceived,
      record.name,
      record.companyAirline,
      record.licenseNumber,
      record.subject,
      record.licenseValidation,
      record.dispatchedTo,
      record.remark,
      record.status
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${(value || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dolt-secretary-records-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

window.App = App;
const startApp = () => {
  App.init();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
