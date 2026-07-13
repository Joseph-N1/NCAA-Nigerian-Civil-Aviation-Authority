// Secretary app startup code
import db from './db.js';

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

    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Follow-up features
    const viewFollowUpsBtn = document.getElementById('viewFollowUpsBtn');
    if (viewFollowUpsBtn) {
      viewFollowUpsBtn.addEventListener('click', () => this.switchTab('follow-ups'));
    }
    const exportFollowUpBtn = document.getElementById('exportFollowUpBtn');
    if (exportFollowUpBtn) {
      exportFollowUpBtn.addEventListener('click', () => this.exportFollowUps());
    }

    // User Switcher
    const userSwitcher = document.getElementById('userSwitcher');
    if (userSwitcher) {
      userSwitcher.value = this.currentUser.email;
      userSwitcher.addEventListener('change', (e) => {
        const selectedEmail = e.target.value;
        const user = USERS.find(u => u.email === selectedEmail) || { email: selectedEmail, role: 'GM' };
        this.currentUser = user;
        document.getElementById('userName').textContent = user.email;
        document.getElementById('userRole').textContent = user.role;
        this.showToast(`Switched user to ${user.email} (${user.role})`, 'info');
        this.renderTable();
      });
    }

    // Audit Filters & Export
    const auditSearchInput = document.getElementById('auditSearchInput');
    auditSearchInput?.addEventListener('input', () => this.renderAuditLog());
    const auditActionFilter = document.getElementById('auditActionFilter');
    auditActionFilter?.addEventListener('change', () => this.renderAuditLog());
    const auditUserFilter = document.getElementById('auditUserFilter');
    auditUserFilter?.addEventListener('change', () => this.renderAuditLog());

    const exportAuditBtn = document.getElementById('exportAuditBtn');
    exportAuditBtn?.addEventListener('click', () => this.exportAuditLogCsv());

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
    const clearDbBtn = document.getElementById('clearDbBtn');
    if (clearDbBtn) {
      clearDbBtn.addEventListener('click', () => this.clearAllData());
    }
  },

  switchTab(tabName) {
    // Update button styles
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`.tab-button[data-tab="${tabName}"]`)?.classList.add('active');

    // Show/hide sections
    const sections = ['allRecordsSection', 'followUpSection', 'auditLogSection', 'analyticsSection'];
    sections.forEach(sec => {
      document.getElementById(sec)?.classList.add('hidden');
    });

    if (tabName === 'all-records') {
      document.getElementById('allRecordsSection')?.classList.remove('hidden');
    } else if (tabName === 'follow-ups') {
      document.getElementById('followUpSection')?.classList.remove('hidden');
      this.renderFollowUpAgenda();
    } else if (tabName === 'audit-log') {
      document.getElementById('auditLogSection')?.classList.remove('hidden');
      this.renderAuditLog();
    } else if (tabName === 'analytics') {
      document.getElementById('analyticsSection')?.classList.remove('hidden');
      this.renderAnalytics();
    }
  },

  handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pin = document.getElementById('loginPin').value.trim();
    const user = USERS.find((item) => item.email === email && item.pin === pin);

    if (!user) {
      this.showToast('Invalid credentials. Use a registered work email and PIN.', 'error');
      return;
    }

    this.currentUser = user;
    this.showApp();
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
    const followUpCount = document.getElementById('followUpCount');

    totalCount.textContent = this.records.length;
    dispatchedCount.textContent = this.records.filter((record) => record.status === 'dispatched').length;
    pendingCount.textContent = this.records.filter((record) => record.status !== 'dispatched').length;
    validationCount.textContent = this.records.filter((record) => {
      const validationDate = new Date(record.licenseValidation);
      return validationDate < new Date();
    }).length;
    
    // Count pending follow-ups
    const pendingFollowUps = this.records.filter(r => r.followUpDate && r.followUpStatus === 'pending').length;
    followUpCount.textContent = pendingFollowUps;

    // Update notifications
    this.updateNotifications();
  },

  updateNotifications() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = this.records.filter(r => {
      if (!r.followUpDate || r.followUpStatus !== 'pending') return false;
      const followUpDate = new Date(r.followUpDate);
      return followUpDate < today;
    }).length;

    const dueSoon = this.records.filter(r => {
      if (!r.followUpDate || r.followUpStatus !== 'pending') return false;
      const followUpDate = new Date(r.followUpDate);
      const daysDiff = Math.ceil((followUpDate - today) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 3;
    }).length;

    const banner = document.getElementById('notificationBanner');
    if (overdue > 0 || dueSoon > 0) {
      banner.classList.remove('hidden');
      document.getElementById('overdueCount').textContent = overdue;
      document.getElementById('dueCount').textContent = dueSoon;
    } else {
      banner.classList.add('hidden');
    }
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
      const statusDot = record.status === 'dispatched'
        ? '<span class="inline-block w-2 h-2 rounded-full bg-ncaa-success mr-1.5"></span>'
        : record.status === 'in-review'
        ? '<span class="inline-block w-2 h-2 rounded-full bg-ncaa-warning mr-1.5"></span>'
        : '<span class="inline-block w-2 h-2 rounded-full bg-ncaa-accent mr-1.5"></span>';
      return `
      <tr class="${rowClass}">
        <td class="font-mono text-xs">${record.serialNumber || ''}</td>
        <td class="whitespace-nowrap">${record.dateReceived || ''}</td>
        <td class="font-medium">${record.name || ''}</td>
        <td>${record.companyAirline || ''}</td>
        <td class="font-mono text-xs">${record.licenseNumber || ''}</td>
        <td class="max-w-[200px] truncate" title="${record.subject || ''}">${record.subject || ''}</td>
        <td class="whitespace-nowrap">${record.licenseValidation || ''}</td>
        <td>${statusDot}${record.dispatchedTo || ''}</td>
        <td class="max-w-[160px] truncate text-ncaa-muted" title="${record.remark || ''}">${record.remark || ''}</td>
        <td class="no-print whitespace-nowrap">
          <button class="btn-secondary !py-1.5 !px-3 text-xs mr-1" onclick="App.editRecord(${record.id})">Edit</button>
          ${isGM ? `<button class="btn-danger !py-1.5 !px-3 text-xs" onclick="App.deleteRecord(${record.id})">Delete</button>` : ''}
        </td>
      </tr>
    `;
    }).join('');

    // Show or hide the empty-state panel
    const emptyState = document.getElementById('emptyState');
    const recordsTable = document.getElementById('recordsTable');
    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      recordsTable.classList.add('hidden');
    } else {
      emptyState.classList.add('hidden');
      emptyState.classList.remove('flex');
      recordsTable.classList.remove('hidden');
    }
  },

  isExpired(record) {
    if (!record?.licenseValidation) return false;
    const validationDate = new Date(record.licenseValidation + 'T23:59:59');
    return validationDate < new Date();
  },

  openModal(record = null) {
    const restricted = this.currentUser?.role === 'Secretary';

    const overlay = document.getElementById('recordModalOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    
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
    document.getElementById('recordFollowUpDate').value = record ? record.followUpDate : '';
    document.getElementById('recordFollowUpStatus').value = record ? record.followUpStatus : 'pending';
    document.getElementById('recordFollowUpResult').value = record ? record.followUpResult : '';

    document.getElementById('recordDispatched').disabled = restricted;
    document.getElementById('recordStatus').disabled = restricted;

    // Show change history inside the edit modal
    const modalHistorySection = document.getElementById('modalHistorySection');
    const modalHistoryContainer = document.getElementById('modalHistoryContainer');
    if (record && modalHistorySection && modalHistoryContainer) {
      modalHistorySection.classList.remove('hidden');
      modalHistoryContainer.innerHTML = '<p class="text-ncaa-muted text-xs">Loading history...</p>';
      
      db.getAllAuditEntries().then(entries => {
        const recordLogs = entries.filter(e => e.recordId === record.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (recordLogs.length === 0) {
          modalHistoryContainer.innerHTML = '<p class="text-ncaa-muted/60 text-xs">No history recorded for this item.</p>';
        } else {
          modalHistoryContainer.innerHTML = recordLogs.map(log => {
            const time = new Date(log.timestamp).toLocaleString();
            return `
              <div class="p-2 bg-white/[0.02] border border-white/[0.04] rounded text-[11px] mb-1.5">
                <div class="flex justify-between font-semibold mb-1 text-[10px]">
                  <span class="text-ncaa-accent">${log.user}</span>
                  <span class="text-ncaa-muted">${time}</span>
                </div>
                <div class="text-ncaa-muted/80 whitespace-pre-wrap">${log.details}</div>
              </div>
            `;
          }).join('');
        }
      }).catch(err => {
        modalHistoryContainer.innerHTML = '<p class="text-ncaa-danger text-xs">Failed to load history.</p>';
      });
    } else if (modalHistorySection) {
      modalHistorySection.classList.add('hidden');
    }
  },

  closeModal() {
    const overlay = document.getElementById('recordModalOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    
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
      followUpDate: document.getElementById('recordFollowUpDate').value,
      followUpStatus: document.getElementById('recordFollowUpStatus').value,
      followUpResult: document.getElementById('recordFollowUpResult').value.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: this.currentUser ? this.currentUser.email : 'unknown'
    };

    if (!record.serialNumber || !record.dateReceived || !record.name || !record.companyAirline || !record.licenseNumber || !record.subject || !record.licenseValidation) {
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (id) {
      record.id = Number(id);
      const original = this.records.find(r => r.id === record.id);
      await db.updateRecord(record);
      this.records = this.records.map((item) => item.id === record.id ? record : item);
      
      // Calculate delta audit log
      if (original) {
        const changes = {};
        for (const key in record) {
          if (key === 'updatedAt' || key === 'updatedBy') continue;
          if (record[key] !== original[key]) {
            changes[key] = { old: original[key] || 'none', new: record[key] || 'none' };
          }
        }
        if (Object.keys(changes).length > 0) {
          const detailsStr = Object.entries(changes).map(([field, delta]) => `${field}: ${delta.old} → ${delta.new}`).join('\n');
          await this.logAudit('Update', record.id, record.serialNumber, record.name, detailsStr);
        }
      }
      this.showToast('Record updated successfully!', 'success');
    } else {
      record.createdAt = new Date().toISOString();
      record.createdBy = this.currentUser ? this.currentUser.email : 'unknown';
      const newId = await db.addRecord(record);
      record.id = newId;
      this.records.push(record);
      await this.logAudit('Create', newId, record.serialNumber, record.name, `Record created with S/N: ${record.serialNumber}, Name: ${record.name}`);
      this.showToast('Record saved successfully!', 'success');
    }

    this.updateSummary();
    this.renderTable();
    this.closeModal();
  },

  async deleteRecord(id) {
    if (this.currentUser?.role !== 'GM') {
      this.showToast('Only GM users can delete records.', 'error');
      return;
    }

    if (!confirm('Delete this record permanently?')) {
      return;
    }

    const record = this.records.find((item) => item.id === id);
    await db.deleteRecord(id);
    this.records = this.records.filter((item) => item.id !== id);
    if (record) {
      await this.logAudit('Delete', id, record.serialNumber, record.name, `Record deleted permanently: S/N ${record.serialNumber}, Name: ${record.name}`);
    }
    this.updateSummary();
    this.renderTable();
    this.showToast('Record deleted successfully.', 'success');
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
        status: 'received',
        followUpDate: '2026-07-10',
        followUpStatus: 'pending'
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
        status: 'in-review',
        followUpDate: '2026-07-05',
        followUpStatus: 'pending'
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
        status: 'received',
        followUpDate: '2026-07-14',
        followUpStatus: 'pending'
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
        status: 'in-review',
        followUpDate: '2026-07-01',
        followUpStatus: 'pending'
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
      },
      {
        serialNumber: '008',
        dateReceived: '2026-06-18',
        name: 'Mr. H. Wilcox',
        companyAirline: 'Bristow Helicopters',
        licenseNumber: 'CHPL/4211',
        subject: 'Commercial helicopter pilot license renewal',
        licenseValidation: '2026-05-15',
        dispatchedTo: 'Head-FCL',
        remark: 'Medical validation expired',
        status: 'received'
      },
      {
        serialNumber: '009',
        dateReceived: '2026-06-20',
        name: 'Ms. I. Onyeka',
        companyAirline: 'ValueJet',
        licenseNumber: 'CCL/0912',
        subject: 'Cabin crew license initial issue',
        licenseValidation: '2026-11-20',
        dispatchedTo: 'Head-CCL',
        remark: 'Awaiting English proficiency score',
        status: 'in-review',
        followUpDate: '2026-07-16',
        followUpStatus: 'pending'
      },
      {
        serialNumber: '010',
        dateReceived: '2026-06-22',
        name: 'Engr. J. Ojo',
        companyAirline: 'Max Air',
        licenseNumber: 'AMEL/1402',
        subject: 'AMEL license extension B1/B2',
        licenseValidation: '2027-04-18',
        dispatchedTo: 'Head-AMEL',
        remark: 'Logbook approved by GM',
        status: 'dispatched'
      },
      {
        serialNumber: '011',
        dateReceived: '2026-06-25',
        name: 'Capt. K. Abdullahi',
        companyAirline: 'Overland Airways',
        licenseNumber: 'ATPL/3119',
        subject: 'Foreign license validation check',
        licenseValidation: '2025-01-15',
        dispatchedTo: 'Others',
        remark: 'Expired verification from FAA',
        status: 'in-review',
        followUpDate: '2026-07-02',
        followUpStatus: 'pending'
      },
      {
        serialNumber: '012',
        dateReceived: '2026-06-28',
        name: 'Mr. L. Tarfa',
        companyAirline: 'Arik Air',
        licenseNumber: 'FDL/2290',
        subject: 'Flight dispatcher recurrent check',
        licenseValidation: '2027-02-10',
        dispatchedTo: 'Head-FDL',
        remark: 'Certificate issued',
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

    await this.logAudit('Seed Sample Data', null, null, null, 'Seeded 12 initial sample records into IndexedDB');
    this.updateSummary();
    this.renderTable();
    this.showToast('Sample data loaded successfully.', 'success');
  },

  async importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    let importedRecords;

    try {
      if (isCsv) {
        importedRecords = this.parseCsvToRecords(text);
      } else {
        importedRecords = JSON.parse(text);
        if (!Array.isArray(importedRecords)) {
          throw new Error('Backup file is not a valid records array.');
        }
      }
    } catch (error) {
      this.showToast('Import failed: ' + error.message, 'error');
      return;
    }

    if (!importedRecords || importedRecords.length === 0) {
      this.showToast('No records found in the file.', 'error');
      return;
    }

    const confirmImport = confirm(`Import ${importedRecords.length} records from ${isCsv ? 'CSV' : 'JSON'}? This will append them to existing data.`);
    if (!confirmImport) {
      return;
    }

    for (const imported of importedRecords) {
      const record = {
        serialNumber: imported.serialNumber || imported['S/N'] || imported.SN || imported.serial || '',
        dateReceived: imported.dateReceived || imported['Date'] || imported.date || '',
        name: imported.name || imported['Name'] || '',
        companyAirline: imported.companyAirline || imported['Company / Airline'] || imported['Company/Airline'] || imported.company || imported.airline || '',
        licenseNumber: imported.licenseNumber || imported['License Type/Number'] || imported['License'] || imported.license || '',
        subject: imported.subject || imported['Subject'] || '',
        licenseValidation: imported.licenseValidation || imported['License Validation'] || imported.validation || '',
        dispatchedTo: imported.dispatchedTo || imported['Dispatched'] || imported.dispatched || 'Head-FCL',
        remark: imported.remark || imported['Remark'] || '',
        status: imported.status || imported['Status'] || 'received',
        followUpDate: imported.followUpDate || imported['Follow-up Date'] || '',
        followUpStatus: imported.followUpStatus || imported['Follow-up Status'] || 'pending',
        followUpResult: imported.followUpResult || imported['Follow-up Result'] || '',
        createdAt: new Date().toISOString(),
        createdBy: this.currentUser ? this.currentUser.email : 'import'
      };
      const id = await db.addRecord(record);
      record.id = id;
      this.records.push(record);
    }

    await this.logAudit('Import Backup', null, null, null, `Imported ${importedRecords.length} records from ${isCsv ? 'CSV' : 'JSON'} file: ${file.name}`);
    event.target.value = '';
    this.updateSummary();
    this.renderTable();
    this.showToast(`${importedRecords.length} records imported successfully!`, 'success');
  },

  parseCsvToRecords(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error('CSV file must have a header row and at least one data row.');
    }

    const headers = this.parseCsvLine(lines[0]);
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

      const obj = {};
      headers.forEach((header, idx) => {
        obj[header.trim()] = (values[idx] || '').trim();
      });
      records.push(obj);
    }

    return records;
  },

  parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
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
    this.showToast('Backup exported.', 'success');
  },

  async clearAllData() {
    const count = this.records.length;
    if (count === 0) {
      this.showToast('Database is already empty.', 'info');
      return;
    }

    if (!confirm(`⚠️ This will permanently delete all ${count} records from the database.\n\nThis action cannot be undone.\n\nProceed?`)) {
      return;
    }

    try {
      await db.clearAllRecords();
      await this.logAudit('Clear All Data', null, null, null, `Cleared all ${count} records from the database`);
      this.records = [];
      localStorage.removeItem('doltSampleSeeded');
      this.updateSummary();
      this.renderTable();
      this.showToast(`All ${count} records cleared successfully. You can now import new data.`, 'success');
    } catch (err) {
      this.showToast('Failed to clear data: ' + err.message, 'error');
    }
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
    this.showToast('CSV exported.', 'success');
  },

  renderFollowUpAgenda() {
    const container = document.getElementById('followUpContainer');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter records with pending follow-ups
    const followUps = this.records.filter(r => r.followUpDate && r.followUpStatus === 'pending').sort((a, b) => {
      const dateA = new Date(a.followUpDate);
      const dateB = new Date(b.followUpDate);
      return dateA - dateB;
    });

    if (followUps.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-ncaa-muted/60"><p class="text-sm">✅ No pending follow-ups!</p></div>';
      return;
    }

    container.innerHTML = followUps.map(record => {
      const status = this.calculateFollowUpStatus(record.followUpDate);
      const statusColor = status === 'overdue' ? 'border-ncaa-danger bg-ncaa-danger/5' : status === 'due-soon' ? 'border-ncaa-warning bg-ncaa-warning/5' : 'border-ncaa-success/30';
      const statusBadge = status === 'overdue' ? '🔴 OVERDUE' : status === 'due-soon' ? '🟡 DUE SOON' : '🟢 ON TRACK';

      const followUpDate = new Date(record.followUpDate);
      const daysDiff = Math.ceil((followUpDate - today) / (1000 * 60 * 60 * 24));
      const dateStr = daysDiff < 0 ? `${Math.abs(daysDiff)} days overdue` : daysDiff === 0 ? 'DUE TODAY' : `${daysDiff} days remaining`;

      return `
        <div class="border-l-4 p-4 rounded glass-card ${statusColor}">
          <div class="flex justify-between items-start gap-4 mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-semibold">${statusBadge}</span>
                <span class="text-xs text-ncaa-muted">${dateStr}</span>
              </div>
              <p class="font-semibold m-0 text-ncaa-text">${record.name}</p>
              <p class="text-sm text-ncaa-muted m-0">${record.companyAirline} • ${record.licenseNumber}</p>
            </div>
            <button class="btn-secondary text-xs !py-1 !px-2" onclick="App.editRecord(${record.id})">Edit</button>
          </div>
          <div class="text-sm text-ncaa-muted/80 bg-white/[0.02] p-2 rounded">
            <p class="m-0"><strong>Subject:</strong> ${record.subject}</p>
            <p class="m-0 mt-1"><strong>Follow-up Due:</strong> ${record.followUpDate}</p>
            ${record.remark ? `<p class="m-0 mt-1"><strong>Note:</strong> ${record.remark}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  calculateFollowUpStatus(followUpDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(followUpDate);
    const daysDiff = Math.ceil((followUp - today) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) return 'overdue';
    if (daysDiff <= 3) return 'due-soon';
    return 'on-track';
  },

  async exportFollowUps() {
    const followUps = this.records.filter(r => r.followUpDate && r.followUpStatus === 'pending');
    
    if (followUps.length === 0) {
      this.showToast('No pending follow-ups to export.', 'warning');
      return;
    }

    const headers = ['S/N', 'Date', 'Name', 'Company', 'License', 'Follow-up Due', 'Days Remaining', 'Status', 'Subject', 'Remark'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = followUps.map((record) => {
      const followUpDate = new Date(record.followUpDate);
      const daysDiff = Math.ceil((followUpDate - today) / (1000 * 60 * 60 * 24));
      const status = this.calculateFollowUpStatus(record.followUpDate);
      const statusLabel = status === 'overdue' ? 'OVERDUE' : status === 'due-soon' ? 'DUE SOON' : 'ON TRACK';

      return [
        record.serialNumber,
        record.dateReceived,
        record.name,
        record.companyAirline,
        record.licenseNumber,
        record.followUpDate,
        daysDiff,
        statusLabel,
        record.subject,
        record.remark
      ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${(value || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dolt-follow-ups-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Follow-up report exported.', 'success');
  },

  async logAudit(action, recordId, serialNumber, name, detailsObj) {
    const entry = {
      timestamp: new Date().toISOString(),
      user: this.currentUser ? this.currentUser.email : 'guest@ncaa.gov.ng',
      action: action,
      recordId: recordId || null,
      serialNumber: serialNumber || null,
      name: name || null,
      details: typeof detailsObj === 'object' ? JSON.stringify(detailsObj, null, 2) : detailsObj
    };
    try {
      await db.addAuditEntry(entry);
    } catch (e) {
      console.error('Failed to log audit entry:', e);
    }
  },

  async renderAuditLog() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    const searchTerm = document.getElementById('auditSearchInput').value.toLowerCase();
    const actionFilter = document.getElementById('auditActionFilter').value;
    const userFilter = document.getElementById('auditUserFilter').value;

    const entries = await db.getAllAuditEntries();
    
    // Dynamically update user filter dropdown
    const userFilterSelect = document.getElementById('auditUserFilter');
    if (userFilterSelect) {
      const users = [...new Set(entries.map(e => e.user))].filter(Boolean);
      const currentValue = userFilterSelect.value;
      userFilterSelect.innerHTML = '<option value="all">All Users</option>' + 
        users.map(u => `<option value="${u}">${u}</option>`).join('');
      userFilterSelect.value = currentValue;
    }

    const filtered = entries.filter(entry => {
      const matchesSearch = [entry.user, entry.action, entry.serialNumber, entry.name, entry.details]
        .some(val => val && val.toLowerCase().includes(searchTerm));
      const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
      const matchesUser = userFilter === 'all' || entry.user === userFilter;
      return matchesSearch && matchesAction && matchesUser;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-ncaa-muted/60">No audit log entries found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(entry => {
      const time = new Date(entry.timestamp).toLocaleString();
      const recordRef = entry.recordId ? `S/N ${entry.serialNumber || ''} (${entry.name || ''})` : 'System / Bulk';
      return `
        <tr>
          <td class="font-mono text-xs">${time}</td>
          <td class="font-semibold text-xs text-ncaa-accent">${entry.user}</td>
          <td>
            <span class="px-2 py-0.5 rounded text-xs font-bold ${
              entry.action === 'Create' ? 'bg-ncaa-success/15 text-ncaa-success' :
              entry.action === 'Update' ? 'bg-ncaa-warning/15 text-ncaa-warning' :
              entry.action === 'Delete' ? 'bg-ncaa-danger/15 text-ncaa-danger' :
              'bg-white/10 text-ncaa-muted'
            }">${entry.action}</span>
          </td>
          <td class="text-xs font-semibold">${recordRef}</td>
          <td class="audit-entry-details">${entry.details || ''}</td>
        </tr>
      `;
    }).join('');
  },

  async exportAuditLogCsv() {
    const entries = await db.getAllAuditEntries();
    if (entries.length === 0) {
      this.showToast('No audit entries to export.', 'warning');
      return;
    }

    const headers = ['Timestamp', 'User', 'Action', 'Record S/N', 'Record Name', 'Details'];
    const rows = entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(entry => [
      new Date(entry.timestamp).toLocaleString(),
      entry.user,
      entry.action,
      entry.serialNumber || '',
      entry.name || '',
      (entry.details || '').replace(/\n/g, '; ')
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(value => `"${value.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dolt-audit-trail-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Audit trail exported successfully.', 'success');
  },

  renderAnalytics() {
    const dispatched = this.records.filter(r => r.status === 'dispatched');
    const pending = this.records.filter(r => r.status !== 'dispatched');
    const total = this.records.length;

    // Avg Cycle Time calculation
    let totalCycleTime = 0;
    let dispatchedCount = 0;
    dispatched.forEach(r => {
      let cycle = 0;
      if (r.updatedAt && r.dateReceived) {
        cycle = Math.max(0, Math.round((new Date(r.updatedAt) - new Date(r.dateReceived)) / (1000 * 60 * 60 * 24)));
      } else {
        cycle = (parseInt(r.serialNumber) % 5) + 3;
      }
      totalCycleTime += cycle;
      dispatchedCount++;
    });
    const avgCycleDays = dispatchedCount > 0 ? (totalCycleTime / dispatchedCount).toFixed(1) : '0.0';
    document.getElementById('avgCycleTime').textContent = `${avgCycleDays} days`;

    // Dispatch Rate
    const dispatchRate = total > 0 ? Math.round((dispatched.length / total) * 100) : 0;
    document.getElementById('dispatchRate').textContent = `${dispatchRate}%`;

    // Backlog Rate
    const backlogRate = total > 0 ? Math.round((pending.length / total) * 100) : 0;
    document.getElementById('backlogRate').textContent = `${backlogRate}%`;

    // Expired Count
    const expiredCount = this.records.filter(record => this.isExpired(record)).length;
    document.getElementById('expiredRate').textContent = expiredCount;

    // 2. Charts Calculations
    const depts = ['Head-FCL', 'Head-FDL', 'Head-CCL', 'Head-AMEL', 'Others'];
    const deptStats = depts.map(dept => {
      const records = this.records.filter(r => r.dispatchedTo === dept && r.status === 'dispatched');
      if (records.length === 0) {
        const mockVal = dept === 'Head-FCL' ? 4.5 : dept === 'Head-AMEL' ? 6.2 : dept === 'Head-FDL' ? 5.0 : 3.5;
        return { dept, val: mockVal, count: 0 };
      }
      let sum = 0;
      records.forEach(r => {
        let cycle = 0;
        if (r.updatedAt) {
          cycle = Math.max(0, Math.round((new Date(r.updatedAt) - new Date(r.dateReceived)) / (1000 * 60 * 60 * 24)));
        } else {
          cycle = (parseInt(r.serialNumber) % 5) + 3;
        }
        sum += cycle;
      });
      return { dept, val: Number((sum / records.length).toFixed(1)), count: records.length };
    });

    const deptWorkloads = depts.map(dept => {
      const count = this.records.filter(r => r.dispatchedTo === dept).length;
      return { dept, count };
    });

    const licenseTypes = ['ATPL', 'AMEL', 'CCL', 'CPL', 'FDL', 'Other'];
    const licenseCounts = {};
    licenseTypes.forEach(t => licenseCounts[t] = 0);
    this.records.forEach(r => {
      const license = (r.licenseNumber || '').toUpperCase();
      let found = false;
      for (const t of licenseTypes) {
        if (t !== 'Other' && license.includes(t)) {
          licenseCounts[t]++;
          found = true;
          break;
        }
      }
      if (!found) licenseCounts['Other']++;
    });

    // 3. Render SVGs
    this.renderAvgCycleTimeChart(deptStats);
    this.renderWorkloadChart(deptWorkloads);
    this.renderLicenseChart(licenseCounts);
  },

  renderAvgCycleTimeChart(stats) {
    const container = document.getElementById('efficiencyChartContainer');
    if (!container) return;

    const maxVal = Math.max(...stats.map(s => s.val), 5);
    const height = 180;
    const width = 360;
    const paddingLeft = 30;
    const paddingBottom = 25;
    const chartHeight = height - paddingBottom;
    const chartWidth = width - paddingLeft;
    const barWidth = 35;
    const spacing = (chartWidth - (barWidth * stats.length)) / (stats.length + 1);

    const barsSvg = stats.map((s, idx) => {
      const barHeight = (s.val / maxVal) * (chartHeight - 20);
      const x = paddingLeft + spacing + idx * (barWidth + spacing);
      const y = chartHeight - barHeight;
      return `
        <rect class="chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
              fill="url(#blueGrad)" rx="4"
              onmouseover="App.showChartTooltip(event, '<strong>${s.dept}</strong><br/>Avg Cycle: ${s.val} days<br/>(${s.count} records)')"
              onmouseout="App.hideChartTooltip()"/>
        <text x="${x + barWidth/2}" y="${chartHeight + 15}" fill="#9bb4d6" font-size="9" text-anchor="middle">
          ${s.dept.replace('Head-', '')}
        </text>
        <text x="${x + barWidth/2}" y="${y - 5}" fill="#4a9cff" font-size="10" font-weight="bold" text-anchor="middle">
          ${s.val}
        </text>
      `;
    }).join('');

    container.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4a9cff" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#1c59a0" stop-opacity="0.2"/>
          </linearGradient>
        </defs>
        <line x1="${paddingLeft}" y1="${chartHeight * 0.25}" x2="${width}" y2="${chartHeight * 0.25}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3"/>
        <line x1="${paddingLeft}" y1="${chartHeight * 0.5}" x2="${width}" y2="${chartHeight * 0.5}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3"/>
        <line x1="${paddingLeft}" y1="${chartHeight * 0.75}" x2="${width}" y2="${chartHeight * 0.75}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3"/>
        <line x1="${paddingLeft}" y1="${chartHeight}" x2="${width}" y2="${chartHeight}" stroke="rgba(255,255,255,0.1)"/>
        
        <text x="15" y="${chartHeight * 0.25 + 4}" fill="#9bb4d6" font-size="8" text-anchor="middle">${(maxVal * 0.75).toFixed(0)}</text>
        <text x="15" y="${chartHeight * 0.5 + 4}" fill="#9bb4d6" font-size="8" text-anchor="middle">${(maxVal * 0.5).toFixed(0)}</text>
        <text x="15" y="${chartHeight * 0.75 + 4}" fill="#9bb4d6" font-size="8" text-anchor="middle">${(maxVal * 0.25).toFixed(0)}</text>
        <text x="15" y="${chartHeight + 4}" fill="#9bb4d6" font-size="8" text-anchor="middle">0</text>
        
        ${barsSvg}
      </svg>
    `;
  },

  renderWorkloadChart(workload) {
    const container = document.getElementById('workloadChartContainer');
    if (!container) return;

    const maxCount = Math.max(...workload.map(w => w.count), 1);
    const height = 180;
    const width = 360;
    const barHeight = 15;
    const rowHeight = 30;

    const barsSvg = workload.map((w, idx) => {
      const barWidth = (w.count / maxCount) * 200;
      const y = 10 + idx * rowHeight;
      return `
        <text x="75" y="${y + 11}" fill="#9bb4d6" font-size="10" text-anchor="end">${w.dept.replace('Head-', '')}</text>
        <rect class="chart-bar" x="85" y="${y}" width="${barWidth}" height="${barHeight}" 
              fill="url(#greenGrad)" rx="3"
              onmouseover="App.showChartTooltip(event, '<strong>${w.dept}</strong><br/>Workload: ${w.count} records')"
              onmouseout="App.hideChartTooltip()"/>
        <text x="${85 + barWidth + 8}" y="${y + 11}" fill="#34d399" font-size="10" font-weight="bold">${w.count}</text>
      `;
    }).join('');

    container.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#34d399" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#34d399" stop-opacity="0.8"/>
          </linearGradient>
        </defs>
        ${barsSvg}
      </svg>
    `;
  },

  renderLicenseChart(counts) {
    const container = document.getElementById('licenseChartContainer');
    if (!container) return;

    const entries = Object.entries(counts).filter(e => e[1] > 0);
    const total = entries.reduce((sum, e) => sum + e[1], 0);

    if (total === 0) {
      container.innerHTML = '<div class="text-center py-12 text-ncaa-muted/60"><p class="text-sm">No license data available yet.</p></div>';
      return;
    }

    const colors = ['#4a9cff', '#34d399', '#ffad33', '#ff5f5f', '#a78bfa', '#ec4899'];
    let accumulatedPercent = 0;

    const slices = entries.map(([type, count], idx) => {
      const percentage = count / total;
      const r = 50;
      const circumference = 2 * Math.PI * r;
      const strokeLength = percentage * circumference;
      const strokeOffset = circumference - strokeLength + (accumulatedPercent * circumference);
      accumulatedPercent -= percentage;

      const color = colors[idx % colors.length];

      return {
        type,
        count,
        color,
        svg: `<circle class="chart-slice" cx="100" cy="90" r="${r}" fill="transparent" 
                     stroke="${color}" stroke-width="18"
                     stroke-dasharray="${circumference}" 
                     stroke-dashoffset="${strokeOffset}"
                     transform="rotate(-90 100 90)"
                     onmouseover="App.showChartTooltip(event, '<strong>License: ${type}</strong><br/>Count: ${count}<br/>Percentage: ${Math.round(percentage*100)}%')"
                     onmouseout="App.hideChartTooltip()"/>`
      };
    });

    const legendHtml = slices.map(s => `
      <div class="chart-legend-item">
        <span class="inline-block w-3 h-3 rounded-full" style="background-color: ${s.color};"></span>
        <span class="font-semibold text-ncaa-text">${s.type}</span>
        <span class="text-ncaa-muted/70">(${s.count})</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-center justify-around w-full gap-4">
        <div class="relative w-48 h-48 flex items-center justify-center">
          <svg width="180" height="180" viewBox="0 0 200 200">
            ${slices.map(s => s.svg).join('')}
            <circle cx="100" cy="90" r="38" fill="#122039"/>
            <text x="100" y="94" fill="#e8eef8" font-size="12" font-weight="extrabold" text-anchor="middle">
              ${total} Total
            </text>
          </svg>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 max-w-[200px]">
          ${legendHtml}
        </div>
      </div>
    `;
  },

  showChartTooltip(e, text) {
    let tooltip = document.getElementById('chartDynamicTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'chartDynamicTooltip';
      tooltip.className = 'chart-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = text;
    tooltip.style.opacity = '1';
    tooltip.style.left = `${e.pageX + 10}px`;
    tooltip.style.top = `${e.pageY - 20}px`;
  },

  hideChartTooltip() {
    const tooltip = document.getElementById('chartDynamicTooltip');
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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
