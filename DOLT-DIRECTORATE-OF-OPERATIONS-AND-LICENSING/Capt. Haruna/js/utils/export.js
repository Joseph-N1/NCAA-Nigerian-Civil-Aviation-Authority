// ============================================
// NCAA DOLT License Management System
// Data Export — js/utils/export.js
// v6 — File System Access API with Documents folder picker
// ============================================

const ExportUtils = {
  // Save a blob to disk (uses File System Access API to choose folder when available, with fallback)
  async saveBlobWithPicker(blob, defaultFilename, typeDescription, mimeType, extension) {
    // 1. Try modern File System Access API (allows user to select destination folder, e.g. Documents)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFilename,
          startIn: 'documents', // Opens in user's Documents folder by default
          types: [{
            description: typeDescription,
            accept: { [mimeType]: [extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        if (err.name === 'AbortError') {
          // User intentionally cancelled the file picker
          return false;
        }
        console.warn('showSaveFilePicker encountered an issue, falling back to browser download:', err);
      }
    }

    // 2. Fallback: standard browser download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  // Export full database to JSON
  async exportDatabase() {
    try {
      const data = await window.DB.exportAll();
      const date = new Date().toISOString().split('T')[0];
      const filename = `NCAA_DOLT_Backup_${date}.json`;
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });

      return await this.saveBlobWithPicker(blob, filename, 'NCAA DOLT Backup JSON', 'application/json', '.json');
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
      const filename = `NCAA_DOLT_${category}_Export_${new Date().toISOString().split('T')[0]}.csv`;

      return await this.saveBlobWithPicker(blob, filename, 'NCAA DOLT CSV Export', 'text/csv', '.csv');
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};

window.ExportUtils = ExportUtils;
