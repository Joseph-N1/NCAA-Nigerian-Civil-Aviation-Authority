// ============================================
// NCAA DOLT License Management System
// ATSEP Category Page — js/pages/atsep.js
// ============================================

const ATSEPPage = {
  container: null,
  table: null,

  render(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="page-header stagger-children">
        <div>
          <h2 class="page-title">⚡ ATSEP Electronics Directory</h2>
          <p class="page-subtitle">Manage Air Traffic Safety Electronics Personnel certificates, facility ratings, and equipment compliance checks</p>
        </div>
        <div class="assistant-only no-print">
          <button id="btnAddNewATSEP" class="btn btn-primary">＋ Add ATSEP Engineer</button>
        </div>
      </div>

      <div id="atsepStatsGrid" class="category-stats-grid stagger-children"></div>

      <!-- Toolbar -->
      <div class="personnel-toolbar stagger-children no-print">
        <div class="toolbar-left">
          <div class="form-group" style="margin-bottom:0; flex:1;">
            <input type="text" id="atsepSearchInput" placeholder="Filter by name, license number, or equipment...">
          </div>
        </div>
        <div class="toolbar-right">
          <div class="filter-group">
            <select id="atsepStatusFilter">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select id="atsepExpiryFilter">
              <option value="">All Expiries</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (< 30 days)</option>
              <option value="warning">Warning (< 90 days)</option>
            </select>
          </div>
          <button id="btnExportATSEPCSV" class="btn btn-secondary">📥 Export CSV</button>
        </div>
      </div>

      <!-- Table Container -->
      <div id="atsepTableContainer"></div>
    `;

    this.init();
  },

  async init() {
    this.setupTable();
    this.bindEvents();
    await this.loadData();
  },

  setupTable() {
    this.table = new window.DataTable('atsepTableContainer', {
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
          key: 'atsepSpecialization', 
          label: 'Specialisations', 
          render: (val) => (val || []).join(', ') || 'N/A'
        },
        {
          key: 'facilityAssignment',
          label: 'Assigned Facility',
          sortable: true,
          render: (val) => val || 'N/A'
        },
        {
          key: 'competencyAssessmentValidUntil',
          label: 'Competency Check',
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
    const addBtn = document.getElementById('btnAddNewATSEP');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openFormModal());
    }

    document.getElementById('atsepSearchInput').addEventListener('input', (e) => {
      this.table.setFilters({ search: e.target.value });
    });

    document.getElementById('atsepStatusFilter').addEventListener('change', (e) => {
      this.table.setFilters({ status: e.target.value });
    });

    document.getElementById('atsepExpiryFilter').addEventListener('change', (e) => {
      this.table.setFilters({ expiry: e.target.value });
    });

    document.getElementById('btnExportATSEPCSV').addEventListener('click', async () => {
      try {
        await window.ExportUtils.exportCategoryToCSV('ATSEP');
        window.Toast.success('Export Successful', 'ATSEP directory exported to CSV.');
      } catch (e) {
        window.Toast.error('Export Failed', e.message);
      }
    });
  },

  async loadData() {
    try {
      const data = await window.DB.getByCategory('ATSEP');
      window.CategoryStats.render('atsepStatsGrid', data);
      this.table.setData(data);
    } catch (e) {
      window.Toast.error('Data Error', 'Failed to retrieve ATSEP engineers.');
    }
  },

  async openFormModal(id = null) {
    let record = null;
    if (id) {
      record = await window.DB.getPersonnelById(id);
    }

    const overlay = document.getElementById('formModalOverlay');
    const title = document.getElementById('formModalTitle');
    
    title.innerText = id ? 'Edit ATSEP Record' : 'Add New ATSEP Engineer';
    window.FormBuilder.render('ATSEP', 'formModalBody', record);
    
    overlay.classList.add('active');
  },

  async deleteRecord(id) {
    if (confirm('Are you sure you want to permanently delete this ATSEP engineer license record?')) {
      try {
        const record = await window.DB.getPersonnelById(id);
        const user = window.Auth.getUser();
        const editor = user ? user.username : 'Assistant';

        await window.DB.deletePersonnel(id, record.licenseNumber, editor);
        window.Toast.success('Record Deleted', 'ATSEP license removed successfully.');
        await this.loadData();
      } catch (e) {
        window.Toast.error('Delete Failed', e.message);
      }
    }
  }
};

window.ATSEPPage = ATSEPPage;
