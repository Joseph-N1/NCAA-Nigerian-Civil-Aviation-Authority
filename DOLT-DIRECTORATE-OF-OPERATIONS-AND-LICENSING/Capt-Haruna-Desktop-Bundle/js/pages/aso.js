// ============================================
// NCAA DOLT License Management System
// ASO Category Page — js/pages/aso.js
// ============================================

const ASOPage = {
  container: null,
  table: null,

  render(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="page-header stagger-children">
        <div>
          <h2 class="page-title">📻 ASO (Station Operators) Directory</h2>
          <p class="page-subtitle">Manage Aeronautical Station Operators licenses, station endorsements, and recurrent communications training</p>
        </div>
        <div class="no-print assistant-only">
          <button id="btnAddNewASO" class="btn btn-primary">＋ Add ASO Operator</button>
        </div>
      </div>

      <div id="asoStatsGrid" class="category-stats-grid stagger-children"></div>

      <!-- Toolbar -->
      <div class="personnel-toolbar stagger-children no-print">
        <div class="toolbar-left">
          <div class="form-group" style="margin-bottom:0; flex:1;">
            <input type="text" id="asoSearchInput" placeholder="Filter by name, license number, or station...">
          </div>
        </div>
        <div class="toolbar-right">
          <div class="filter-group">
            <select id="asoStatusFilter">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select id="asoExpiryFilter">
              <option value="">All Expiries</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (< 30 days)</option>
              <option value="warning">Warning (< 90 days)</option>
            </select>
          </div>
          <button id="btnExportASOCSV" class="btn btn-secondary">📥 Export CSV</button>
        </div>
      </div>

      <!-- Table Container -->
      <div id="asoTableContainer"></div>
    `;

    this.init();
  },

  async init() {
    this.setupTable();
    this.bindEvents();
    await this.loadData();
  },

  setupTable() {
    this.table = new window.DataTable('asoTableContainer', {
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
          key: 'stationAssignment', 
          label: 'Assigned Station', 
          sortable: true,
          render: (val) => val || 'N/A'
        },
        {
          key: 'recurrentTrainingValidUntil',
          label: 'Recurrent Training',
          sortable: true,
          render: (val) => {
            const formatted = window.DateUtils.formatDate(val);
            const urgency = window.DateUtils.getExpiryUrgency(val);
            let style = '';
            if (urgency === 'expired') style = 'style="color: var(--color-danger); font-weight: bold;"';
            if (urgency === 'critical') style = 'style="color: var(--color-warning); font-weight: bold;"';
            return `<span ${style}>${formatted}</span>`;
          }
        },
        {
          key: 'licenseValidUntil',
          label: 'License Expiry',
          sortable: true,
          render: (val) => {
            const formatted = window.DateUtils.formatDate(val);
            const urgency = window.DateUtils.getExpiryUrgency(val);
            let style = '';
            if (urgency === 'expired') style = 'style="color: var(--color-danger); font-weight: bold;"';
            if (urgency === 'critical') style = 'style="color: var(--color-warning); font-weight: bold;"';
            return `<span ${style}>${formatted}</span>`;
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
    const addBtn = document.getElementById('btnAddNewASO');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openFormModal());
    }

    document.getElementById('asoSearchInput').addEventListener('input', (e) => {
      this.table.setFilters({ search: e.target.value });
    });

    document.getElementById('asoStatusFilter').addEventListener('change', (e) => {
      this.table.setFilters({ status: e.target.value });
    });

    document.getElementById('asoExpiryFilter').addEventListener('change', (e) => {
      this.table.setFilters({ expiry: e.target.value });
    });

    document.getElementById('btnExportASOCSV').addEventListener('click', async () => {
      try {
        await window.ExportUtils.exportCategoryToCSV('ASO');
        window.Toast.success('Export Successful', 'ASO directory exported to CSV.');
      } catch (e) {
        window.Toast.error('Export Failed', e.message);
      }
    });
  },

  async loadData() {
    try {
      const data = await window.DB.getByCategory('ASO');
      window.CategoryStats.render('asoStatsGrid', data);
      this.table.setData(data);
    } catch (e) {
      window.Toast.error('Data Error', 'Failed to retrieve ASO operators.');
    }
  },

  async openFormModal(id = null) {
    let record = null;
    if (id) {
      record = await window.DB.getPersonnelById(id);
    }

    const overlay = document.getElementById('formModalOverlay');
    const title = document.getElementById('formModalTitle');
    
    title.innerText = id ? 'Edit ASO Record' : 'Add New ASO Operator';
    window.FormBuilder.render('ASO', 'formModalBody', record);
    
    overlay.classList.add('active');
  },

  async deleteRecord(id) {
    if (confirm('Are you sure you want to permanently delete this ASO operator license record?')) {
      try {
        const record = await window.DB.getPersonnelById(id);
        const user = window.Auth.getUser();
        const editor = user ? user.username : 'Assistant';

        await window.DB.deletePersonnel(id, record.licenseNumber, editor);
        window.Toast.success('Record Deleted', 'ASO license removed successfully.');
        await this.loadData();
      } catch (e) {
        window.Toast.error('Delete Failed', e.message);
      }
    }
  }
};

window.ASOPage = ASOPage;
