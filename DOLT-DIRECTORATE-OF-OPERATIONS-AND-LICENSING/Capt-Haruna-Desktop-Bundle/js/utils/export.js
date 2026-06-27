// ============================================
// NCAA DOLT License Management System
// Data Export — js/utils/export.js
// ============================================

const ExportUtils = {
  // Download a JSON blob
  downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Export full database to JSON
  async exportDatabase() {
    try {
      const data = await window.DB.exportAll();
      const date = new Date().toISOString().split('T')[0];
      const filename = `NCAA_DOLT_Backup_${date}.json`;
      this.downloadJSON(data, filename);
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Export a specific category to CSV format
  async exportCategoryToCSV(category) {
    try {
      const records = await window.DB.getByCategory(category);
      if (records.length === 0) {
        throw new Error(`No records found to export in category: ${category}`);
      }

      // Extract flat headers (excluding photo Blob)
      const sample = records[0];
      const keys = Object.keys(sample).filter(k => k !== 'passportPhoto');
      
      const csvRows = [];
      // Header row
      csvRows.push(keys.join(','));

      // Data rows
      for (const row of records) {
        const values = keys.map(key => {
          let val = row[key];
          if (val === null || val === undefined) return '""';
          
          if (Array.isArray(val)) {
            val = val.join('; '); // Join sub-arrays with semicolon
          } else if (typeof val === 'object') {
            val = JSON.stringify(val); // Stringify nested objects
          }
          
          // Escape quotes in strings
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `NCAA_DOLT_${category}_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};

window.ExportUtils = ExportUtils;
