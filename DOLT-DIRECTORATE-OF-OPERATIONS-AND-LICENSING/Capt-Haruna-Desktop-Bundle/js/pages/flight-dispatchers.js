// ============================================
// NCAA DOLT License Management System
// Flight Dispatchers Page — js/pages/flight-dispatchers.js
// ============================================

const FlightDispatchersPage = {
  container: null,
  table: null,

  render(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="page-header stagger-children">
        <div>
          <h2 class="page-title">✈ Flight Dispatchers Directory</h2>
          <p class="page-subtitle">Manage dispatcher licenses, meteorology and flight planning ratings compliance</p>
        </div>
        <div class="no-print assistant-only">
          <button id="btnAddNewDispatcher" class="btn btn-primary">＋ Add Dispatcher</button>
        </div>
      </div>

      <div id="dispStatsGrid" class="category-stats-grid stagger-children"></div>

      <!-- Toolbar -->
      <div class="personnel-toolbar stagger-children no-print">
        <div class="toolbar-left">
          <div class="form-group" style="margin-bottom:0; flex:1;">
            <input type="text" id="dispSearchInput" placeholder="Filter by name, license number, or airline...">
          </div>
        </div>
        <div class="toolbar-right">
          <div class="filter-group">
            <select id="dispStatusFilter">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select id="dispExpiryFilter">
              <option value="">All Expiries</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (< 30 days)</option>
              <option value="warning">Warning (< 90 days)</option>
            </select>
          </div>
          <button id="btnExportDispCSV" class="btn btn-secondary">📥 Export CSV</button>
        </div>
      </div>

      <!-- Table Container -->
      <div id="dispTableContainer"></div>
    `;

    this.init();
  },

  async init() {
    this.setupTable();
    this.bindEvents();
    await this.loadData();
  },

  setupTable() {
    this.table = new window.DataTable('dispTableContainer', {
      columns: [
        {
          key: 'surname',
          label: 'Personnel Name',
          sortable: true,
          render: (val, row) => {
            const photoURL = row.passportPhoto
              ? (typeof row.passportPhoto === 'string' ? row.passportPhoto : URL.createObjectURL(row.passportPhoto))
              : null;
            return `
              <div class="table-user-cell">
                ${photoURL 
                  ? `<img class="expiry-alert-avatar" src="${photoURL}" alt="">`
                  : `<div class="expiry-alert-placeholder">${row.firstName.charAt(0)}${row.surname.charAt(0)}</div>`
                }
                <div>
                  <div class="table-user-name">${row.surname.toUpperCase()}, ${row.firstName}</div>
                  <div class="table-user-lic">${row.employerOrganisation || 'N/A'}</div>
                </div>
              </div>
            `;
          }
        },
        { key: 'licenseNumber', label: 'License Number', sortable: true },
        { 
          key: 'dispatcherLicenseType', 
          label: 'License Type', 
          sortable: true,
          render: (val) => val || 'N/A'
        },
        {
          key: 'flightPlanningValidUntil',
          label: 'Flight Planning Valid',
          sortable: true,
          render: (val) => window.DateUtils.formatDate(val)
        },
        {
          key: 'licenseValidUntil',
          label: 'License Expiry',
          sortable: true,
          render: (val) => {
            const formatted = window.DateUtils.formatDate(val);
            const urgency = window.DateUtils.getExpiryUrgency(val);
            let colorStyle = '';
            if (urgency === 'expired') colorStyle = 'style="color: var(--color-danger); font-weight: bold;"';
            if (urgency === 'critical') colorStyle = 'style="color: var(--color-warning); font-weight: bold;"';
            return `<span ${colorStyle}>${formatted}</span>`;
          }
        },
        {
          key: 'licenseStatus',
          label: 'Status',
          sortable: true,
          render: (val) => {
            const statusClass = val.toLowerCase();
            return `<span class="badge badge-${statusClass}">${val}</span>`;
          }
        }
      ],
      onRowClick: (id) => window.DetailPanel.show(id),
      onEdit: (id) => this.openFormModal(id),
      onDelete: (id) => this.deleteRecord(id)
    });
  },

  bindEvents() {
    const addBtn = document.getElementById('btnAddNewDispatcher');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openFormModal());
    }

    document.getElementById('dispSearchInput').addEventListener('input', (e) => {
      this.table.setFilters({ search: e.target.value });
    });

    document.getElementById('dispStatusFilter').addEventListener('change', (e) => {
      this.table.setFilters({ status: e.target.value });
    });

    document.getElementById('dispExpiryFilter').addEventListener('change', (e) => {
      this.table.setFilters({ expiry: e.target.value });
    });

    document.getElementById('btnExportDispCSV').addEventListener('click', async () => {
      try {
        await window.ExportUtils.exportCategoryToCSV('FLIGHT_DISPATCHER');
        window.Toast.success('Export Successful', 'Dispatchers directory exported to CSV.');
      } catch (e) {
        window.Toast.error('Export Failed', e.message);
      }
    });
  },

  async loadData() {
    try {
      const data = await window.DB.getByCategory('FLIGHT_DISPATCHER');
      window.CategoryStats.render('dispStatsGrid', data);
      this.table.setData(data);
    } catch (e) {
      window.Toast.error('Data Error', 'Failed to retrieve dispatchers.');
    }
  },

  async openFormModal(id = null) {
    let record = null;
    if (id) {
      record = await window.DB.getPersonnelById(id);
    }

    const overlay = document.getElementById('formModalOverlay');
    const title = document.getElementById('formModalTitle');
    
    title.innerText = id ? 'Edit Dispatcher Record' : 'Add New Dispatcher';
    window.FormBuilder.render('FLIGHT_DISPATCHER', 'formModalBody', record);
    
    overlay.classList.add('active');
  },

  async deleteRecord(id) {
    if (confirm('Are you sure you want to permanently delete this dispatcher license record?')) {
      try {
        const record = await window.DB.getPersonnelById(id);
        const user = window.Auth.getUser();
        const editor = user ? user.username : 'Assistant';

        await window.DB.deletePersonnel(id, record.licenseNumber, editor);
        window.Toast.success('Record Deleted', 'Dispatcher license removed successfully.');
        await this.loadData();
      } catch (e) {
        window.Toast.error('Delete Failed', e.message);
      }
    }
  }
};

window.FlightDispatchersPage = FlightDispatchersPage;
