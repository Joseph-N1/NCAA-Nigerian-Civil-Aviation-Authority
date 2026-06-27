// ============================================
// NCAA DOLT License Management System
// Data Table Component — js/components/table.js
// ============================================

class DataTable {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      columns: [], // [{ key, label, sortable, render }]
      data: [],
      pageSize: 10,
      onRowClick: null,
      onEdit: null,
      onDelete: null,
      ...options
    };

    this.currentPage = 1;
    this.sortKey = '';
    this.sortDir = 'asc'; // 'asc' or 'desc'
    this.filters = {};

    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
  }

  setData(newData) {
    this.options.data = newData;
    this.currentPage = 1;
    this.render();
  }

  setFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    this.currentPage = 1;
    this.render();
  }

  getSearchText(item) {
    const values = [
      item.licenseNumber,
      item.firstName,
      item.surname,
      item.middleName,
      item.employerOrganisation,
      item.licenseType,
      item.category,
      item.pilotLicenseSubType,
      item.dispatcherLicenseType,
      item.cabinCrewLicenseType,
      item.asoLicenseType,
      item.feLicenseType,
      item.atcUnit,
      item.stationAssignment,
      item.facilityAssignment,
      item.approvedMaintenanceOrg,
      item.certificationAuthorisations,
      item.operationalSpecifications,
      item.remarks,
      item.endorsements
    ];

    [
      'categoryRating',
      'classRatings',
      'instructorRatingType',
      'ameLicenseCategory',
      'atcRatings',
      'atsepSpecialization',
      'systemsKnowledge',
      'aircraftTypesQualified',
      'aircraftTypesAuthorized',
      'frequenciesAuthorized'
    ].forEach(key => {
      if (Array.isArray(item[key])) values.push(item[key].join(' '));
    });

    ['typeRatings', 'aircraftTypesRated', 'unitEndorsements', 'systemsQualified'].forEach(key => {
      if (Array.isArray(item[key])) {
        values.push(item[key].map(entry => Object.values(entry || {}).join(' ')).join(' '));
      }
    });

    return values.filter(Boolean).join(' ').toLowerCase();
  }

  getFilteredData() {
    let result = [...this.options.data];

    // Apply filters
    for (const [key, value] of Object.entries(this.filters)) {
      if (!value) continue;

      if (key === 'search') {
        const query = value.toLowerCase();
        result = result.filter(item => this.getSearchText(item).includes(query));
      } else if (key === 'status') {
        result = result.filter(item => item.licenseStatus === value);
      } else if (key === 'subType') {
        const query = String(value).toLowerCase();
        result = result.filter(item => {
          const subTypeText = [
            item.pilotLicenseSubType,
            item.licenseType,
            Array.isArray(item.ameLicenseCategory) ? item.ameLicenseCategory.join(' ') : '',
            Array.isArray(item.categoryRating) ? item.categoryRating.join(' ') : '',
            Array.isArray(item.classRatings) ? item.classRatings.join(' ') : ''
          ].filter(Boolean).join(' ').toLowerCase();
          return subTypeText.includes(query);
        });
      } else if (key === 'expiry') {
        const today = new Date();
        const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

        if (value === 'expired') {
          result = result.filter(item => item.licenseValidUntil && new Date(item.licenseValidUntil) < today);
        } else if (value === 'critical') {
          result = result.filter(item => item.licenseValidUntil && new Date(item.licenseValidUntil) >= today && new Date(item.licenseValidUntil) <= thirtyDays);
        } else if (value === 'warning') {
          result = result.filter(item => item.licenseValidUntil && new Date(item.licenseValidUntil) > thirtyDays && new Date(item.licenseValidUntil) <= ninetyDays);
        }
      }
    }

    // Apply Sorting
    if (this.sortKey) {
      result.sort((a, b) => {
        let valA = a[this.sortKey];
        let valB = b[this.sortKey];

        // Handle case-insensitive string comparison
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        // Handle nulls
        if (valA === undefined || valA === null) return this.sortDir === 'asc' ? 1 : -1;
        if (valB === undefined || valB === null) return this.sortDir === 'asc' ? -1 : 1;

        if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }

  handleSort(key) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.render();
  }

  render() {
    const filteredData = this.getFilteredData();
    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / this.options.pageSize) || 1;

    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.options.pageSize;
    const endIdx = Math.min(startIdx + this.options.pageSize, totalRecords);
    const paginatedData = filteredData.slice(startIdx, endIdx);

    // Build Table HTML
    let html = `
      <div class="table-container animate-fade-in">
        <table>
          <thead class="table-header">
            <tr>
    `;

    // Headers
    this.options.columns.forEach(col => {
      let thClass = '';
      if (col.sortable) {
        thClass = 'sortable';
        if (this.sortKey === col.key) {
          thClass += this.sortDir === 'asc' ? ' sort-asc' : ' sort-desc';
        }
      }
      html += `<th class="${thClass}" data-key="${col.key}">${col.label}</th>`;
    });

    // Actions Header if write operations exist
    html += `<th class="no-print" style="text-align: right;">Actions</th></tr></thead><tbody class="table-body">`;

    // Body rows
    if (paginatedData.length === 0) {
      html += `
        <tr>
          <td colspan="${this.options.columns.length + 1}" style="text-align: center; padding: var(--space-8); color: var(--color-text-muted);">
            No records found.
          </td>
        </tr>
      `;
    } else {
      paginatedData.forEach(row => {
        html += `<tr data-id="${row.id}">`;
        
        this.options.columns.forEach(col => {
          let cellVal = '';
          if (col.render) {
            cellVal = col.render(row[col.key], row);
          } else {
            cellVal = row[col.key] || 'N/A';
          }
          html += `<td>${cellVal}</td>`;
        });

        // Action cell buttons
        const isGM = window.Auth && window.Auth.getUser() && window.Auth.getUser().role === 'GM';
        html += `
          <td class="no-print">
            <div class="table-actions">
              <button class="btn btn-ghost btn-sm btn-view-detail" data-id="${row.id}" title="View Details">👁️ View</button>
              ${!isGM ? `
                <button class="btn btn-ghost btn-sm btn-edit-record" data-id="${row.id}" title="Edit Record" style="color: var(--color-accent-blue);">✏️ Edit</button>
                <button class="btn btn-ghost btn-sm btn-delete-record" data-id="${row.id}" title="Delete Record" style="color: var(--color-danger);">🗑️ Delete</button>
              ` : ''}
            </div>
          </td>
        </tr>`;
      });
    }

    html += `</tbody></table>`;

    // Paging Footer
    html += `
      <div class="table-pagination no-print">
        <div>Showing <strong>${totalRecords === 0 ? 0 : startIdx + 1}</strong> to <strong>${endIdx}</strong> of <strong>${totalRecords}</strong> records</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-sm btn-page-prev" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
          <span style="margin: 0 var(--space-2);">Page ${this.currentPage} of ${totalPages}</span>
          <button class="btn btn-secondary btn-sm btn-page-next" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </div>`;

    this.container.innerHTML = html;
    this.bindTableEvents();
  }

  bindTableEvents() {
    // Sort columns
    this.container.querySelectorAll('.table-header th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-key');
        this.handleSort(key);
      });
    });

    // Row Click (excluding action buttons)
    this.container.querySelectorAll('.table-body tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.table-actions') || e.target.closest('button')) return;
        const id = parseInt(tr.getAttribute('data-id'));
        if (this.options.onRowClick) {
          this.options.onRowClick(id);
        }
      });
    });

    // Action buttons
    this.container.querySelectorAll('.btn-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (this.options.onRowClick) this.options.onRowClick(id);
      });
    });

    this.container.querySelectorAll('.btn-edit-record').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (this.options.onEdit) this.options.onEdit(id);
      });
    });

    this.container.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (this.options.onDelete) this.options.onDelete(id);
      });
    });

    // Pagination
    const prevBtn = this.container.querySelector('.btn-page-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render();
        }
      });
    }

    const nextBtn = this.container.querySelector('.btn-page-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.options.pageSize);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render();
        }
      });
    }
  }
}

window.DataTable = DataTable;

const CategoryStats = {
  render(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = data.length;
    const expired = data.filter(item => window.DateUtils.getExpiryUrgency(item.licenseValidUntil) === 'expired').length;
    const expiringSoon = data.filter(item => {
      const urgency = window.DateUtils.getExpiryUrgency(item.licenseValidUntil);
      return urgency === 'critical' || urgency === 'warning';
    }).length;
    const active = data.filter(item => item.licenseStatus === 'ACTIVE' && window.DateUtils.getExpiryUrgency(item.licenseValidUntil) !== 'expired').length;
    const medicalAlerts = data.filter(item => {
      const urgency = window.DateUtils.getExpiryUrgency(item.medicalValidUntil);
      return urgency === 'expired' || urgency === 'critical';
    }).length;

    container.innerHTML = `
      <div class="category-stat-card">
        <div class="category-stat-label">Total Records</div>
        <div class="category-stat-value">${total}</div>
      </div>
      <div class="category-stat-card good">
        <div class="category-stat-label">Active</div>
        <div class="category-stat-value">${active}</div>
      </div>
      <div class="category-stat-card warning">
        <div class="category-stat-label">Expiring Soon</div>
        <div class="category-stat-value">${expiringSoon}</div>
      </div>
      <div class="category-stat-card danger">
        <div class="category-stat-label">Expired</div>
        <div class="category-stat-value">${expired}</div>
      </div>
      <div class="category-stat-card info">
        <div class="category-stat-label">Medical Alerts</div>
        <div class="category-stat-value">${medicalAlerts}</div>
      </div>
    `;
  }
};

window.CategoryStats = CategoryStats;
