// ============================================
// NCAA DOLT License Management System
// Pilots Category Page — js/pages/pilots.js
// ============================================

const PilotsPage = {
  container: null,
  table: null,

  render(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="page-header stagger-children">
        <div>
          <h2 class="page-title">✈ Pilots Directory</h2>
          <p class="page-subtitle">Manage ATPL, CPL, PPL licenses, instrument ratings, and medical compliance</p>
        </div>
        <div class="assistant-only no-print">
          <button id="btnAddNewPilot" class="btn btn-primary">＋ Add New Pilot</button>
        </div>
      </div>

      <div id="pilotStatsGrid" class="category-stats-grid stagger-children"></div>

      <!-- Toolbar -->
      <div class="personnel-toolbar stagger-children no-print">
        <div class="toolbar-left">
          <div class="form-group" style="margin-bottom:0; flex:1;">
            <input type="text" id="pilotSearchInput" placeholder="Filter by name, license number, or airline...">
          </div>
        </div>
        <div class="toolbar-right">
          <div class="filter-group">
            <select id="pilotStatusFilter">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select id="pilotTypeFilter">
              <option value="">All Subtypes</option>
              <option value="ATPL">ATPL</option>
              <option value="CPL">CPL</option>
              <option value="PPL">PPL</option>
            </select>
            <select id="pilotExpiryFilter">
              <option value="">All Expiries</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (< 30 days)</option>
              <option value="warning">Warning (< 90 days)</option>
            </select>
          </div>
          <button id="btnExportPilotsCSV" class="btn btn-secondary">📥 Export CSV</button>
        </div>
      </div>

      <!-- Table Container -->
      <div id="pilotsTableContainer"></div>
    `;

    this.init();
  },

  async init() {
    this.setupTable();
    this.bindEvents();
    await this.loadData();
  },

  setupTable() {
    this.table = new window.DataTable('pilotsTableContainer', {
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
          key: 'pilotLicenseSubType', 
          label: 'Subtype', 
          sortable: true,
          render: (val) => val || 'N/A'
        },
        {
          key: 'categoryRating',
          label: 'Ratings held',
          render: (val, row) => {
            const list = [...(row.categoryRating || []), ...(row.classRatings || [])];
            if (row.instrumentRating) list.push('IR');
            return list.join(', ') || 'None';
          }
        },
        {
          key: 'licenseValidUntil',
          label: 'Valid Until',
          sortable: true,
          render: (val) => {
            const formatted = window.DateUtils.formatDate(val);
            const urgency = window.DateUtils.getExpiryUrgency(val);
            let colorClass = '';
            if (urgency === 'expired') colorClass = 'style="color: var(--color-danger); font-weight: bold;"';
            if (urgency === 'critical') colorClass = 'style="color: var(--color-warning); font-weight: bold;"';
            return `<span ${colorClass}>${formatted}</span>`;
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
    // Add New Button
    const addBtn = document.getElementById('btnAddNewPilot');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openFormModal());
    }

    // Search filter
    document.getElementById('pilotSearchInput').addEventListener('input', (e) => {
      this.table.setFilters({ search: e.target.value });
    });

    // Dropdowns filters
    document.getElementById('pilotStatusFilter').addEventListener('change', (e) => {
      this.table.setFilters({ status: e.target.value });
    });

    document.getElementById('pilotTypeFilter').addEventListener('change', (e) => {
      this.table.setFilters({ subType: e.target.value });
    });

    document.getElementById('pilotExpiryFilter').addEventListener('change', (e) => {
      this.table.setFilters({ expiry: e.target.value });
    });

    // Export CSV
    document.getElementById('btnExportPilotsCSV').addEventListener('click', async () => {
      try {
        await window.ExportUtils.exportCategoryToCSV('PILOT');
        window.Toast.success('Export Successful', 'Pilots directory exported to CSV.');
      } catch (e) {
        window.Toast.error('Export Failed', e.message);
      }
    });
  },

  async loadData() {
    try {
      const data = await window.DB.getByCategory('PILOT');
      window.CategoryStats.render('pilotStatsGrid', data);
      this.table.setData(data);
    } catch (e) {
      window.Toast.error('Data Error', 'Failed to retrieve pilots.');
    }
  },

  async openFormModal(id = null) {
    let record = null;
    if (id) {
      record = await window.DB.getPersonnelById(id);
    }

    // Configure form modal
    const overlay = document.getElementById('formModalOverlay');
    const title = document.getElementById('formModalTitle');
    
    title.innerText = id ? 'Edit Pilot Record' : 'Add New Pilot';
    window.FormBuilder.render('PILOT', 'formModalBody', record);
    
    overlay.classList.add('active');
  },

  async deleteRecord(id) {
    if (confirm('Are you sure you want to permanently delete this pilot license record?')) {
      try {
        const record = await window.DB.getPersonnelById(id);
        const user = window.Auth.getUser();
        const editor = user ? user.username : 'Assistant';

        await window.DB.deletePersonnel(id, record.licenseNumber, editor);
        window.Toast.success('Record Deleted', 'Pilot license removed successfully.');
        await this.loadData();
      } catch (e) {
        window.Toast.error('Delete Failed', e.message);
      }
    }
  }
};

window.PilotsPage = PilotsPage;
