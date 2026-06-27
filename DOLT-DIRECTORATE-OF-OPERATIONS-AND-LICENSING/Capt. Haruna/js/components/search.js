// ============================================
// NCAA DOLT License Management System
// Global Search Component — js/components/search.js
// ============================================

const Search = {
  debounceTimer: null,
  resultsDropdown: null,

  init() {
    this.createResultsDropdown();
    this.bindEvents();
  },

  createResultsDropdown() {
    // Create floating results dropdown box
    this.resultsDropdown = document.createElement('div');
    this.resultsDropdown.id = 'globalSearchDropdown';
    this.resultsDropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      max-height: 400px;
      overflow-y: auto;
      z-index: var(--z-dropdown);
      box-shadow: var(--shadow-lg);
      display: none;
    `;
    
    const searchContainer = document.querySelector('.header-search');
    if (searchContainer) {
      searchContainer.appendChild(this.resultsDropdown);
    }
  },

  bindEvents() {
    const input = document.getElementById('globalSearchInput');
    if (!input) return;

    input.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        this.resultsDropdown.style.display = 'none';
        return;
      }

      this.debounceTimer = setTimeout(() => this.performSearch(query), 200);
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      const searchContainer = document.querySelector('.header-search');
      if (searchContainer && !searchContainer.contains(e.target)) {
        this.resultsDropdown.style.display = 'none';
      }
    });

    // Re-show dropdown on input focus if there is query
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        this.resultsDropdown.style.display = 'block';
      }
    });
  },

  async performSearch(query) {
    try {
      const results = await window.DB.searchPersonnel(query);
      this.renderResults(results);
    } catch (e) {
      console.error('Search failed:', e);
    }
  },

  renderResults(results) {
    if (results.length === 0) {
      this.resultsDropdown.innerHTML = `
        <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted); font-size: var(--font-size-sm);">
          No licenses found matching query
        </div>
      `;
      this.resultsDropdown.style.display = 'block';
      return;
    }

    // Group by category
    const grouped = {};
    results.forEach(record => {
      if (!grouped[record.category]) {
        grouped[record.category] = [];
      }
      grouped[record.category].push(record);
    });

    let html = '';
    
    for (const [category, items] of Object.entries(grouped)) {
      const displayCategory = category.replace('_', ' ');
      html += `
        <div style="padding: var(--space-2) var(--space-4); background: rgba(0,0,0,0.15); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-accent-teal); text-transform: uppercase; border-bottom: 1px solid var(--color-border);">
          ${displayCategory} (${items.length})
        </div>
      `;

      items.forEach(item => {
        const statusClass = item.licenseStatus.toLowerCase();
        html += `
          <div class="search-result-item" data-id="${item.id}" style="padding: var(--space-3) var(--space-4); display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid var(--color-border); transition: background-color var(--transition-fast);">
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); color: var(--color-text-primary);" class="truncate">
                ${item.surname ? item.surname.toUpperCase() : ''}, ${item.firstName || ''}
              </div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); font-family: monospace;">
                ${item.licenseNumber}
              </div>
            </div>
            <span class="badge badge-${statusClass}" style="flex-shrink: 0; transform: scale(0.95);">${item.licenseStatus}</span>
          </div>
        `;
      });
    }

    this.resultsDropdown.innerHTML = html;
    this.resultsDropdown.style.display = 'block';

    // Add search result styles dynamically
    const hoverStyle = document.getElementById('searchHoverStyles') || document.createElement('style');
    if (!hoverStyle.id) {
      hoverStyle.id = 'searchHoverStyles';
      hoverStyle.innerText = `
        .search-result-item:hover { background-color: var(--color-bg-hover); }
        .search-result-item:last-child { border-bottom: none; }
      `;
      document.head.appendChild(hoverStyle);
    }

    // Attach click events to load detail panel
    this.resultsDropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', async () => {
        const id = parseInt(el.getAttribute('data-id'));
        this.resultsDropdown.style.display = 'none';
        document.getElementById('globalSearchInput').value = '';
        
        // Load details via Detail Modal
        if (window.DetailPanel) {
          window.DetailPanel.show(id);
        }
      });
    });
  }
};

window.Search = Search;
