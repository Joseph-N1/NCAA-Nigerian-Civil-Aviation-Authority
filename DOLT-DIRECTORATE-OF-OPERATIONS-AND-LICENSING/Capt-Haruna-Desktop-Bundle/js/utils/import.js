// ============================================
// NCAA DOLT License Management System
// Data Import — js/utils/import.js
// ============================================

const ImportUtils = {
  // Read and validate a selected JSON file
  readJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          
          // Basic validation checks
          if (!parsed.appName || parsed.appName !== 'NCAA DOLT License Manager') {
            return reject(new Error('Invalid backup file: App name mismatch.'));
          }
          if (!parsed.personnel || !Array.isArray(parsed.personnel)) {
            return reject(new Error('Invalid backup file: Missing personnel dataset.'));
          }

          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse file. Make sure it is a valid JSON backup file.'));
        }
      };

      reader.onerror = () => reject(new Error('Error reading the file.'));
      reader.readAsText(file);
    });
  },

  // Perform full import into Dexie Database
  async importBackup(file) {
    try {
      const parsedData = await this.readJSONFile(file);
      const importedCount = await window.DB.importData(parsedData);
      return importedCount;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};

window.ImportUtils = ImportUtils;
