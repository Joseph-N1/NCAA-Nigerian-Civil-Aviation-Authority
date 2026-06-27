// ============================================
// NCAA DOLT License Management System
// Settings & Backup Page — js/pages/settings.js
// ============================================

const SettingsPage = {
  container: null,

  render(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="page-header stagger-children">
        <div>
          <h2 class="page-title">⚙ Settings & Backups</h2>
          <p class="page-subtitle">Configure system database parameters, export records, and manage offline data backups</p>
        </div>
      </div>

      <div class="grid grid-2 stagger-children" style="gap: var(--space-6); margin-top: var(--space-6);">
        
        <!-- Left: Database Backup/Restore -->
        <div class="card">
          <h3 class="card-title">💾 Database Backup & Restore</h3>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-4);">
            Download a full local database snapshot. All photo files, personnel structures, credentials, and audit logs are fully archived offline.
          </p>

          <div style="display:flex; flex-direction:column; gap: var(--space-4);">
            <div>
              <button id="btnSettingsBackupExport" class="btn btn-primary" style="width: 100%;">📤 Export Database Backup (.json)</button>
            </div>
            
            <hr style="border:0; border-top:1px solid var(--color-border); margin: var(--space-2) 0;">

            <div class="assistant-only">
              <label style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); display:block; margin-bottom: var(--space-2);">Restore From Backup File</label>
              <div style="display:flex; gap: var(--space-3);">
                <input type="file" id="settingsBackupImportFile" accept=".json" class="btn" style="flex:1; font-size: var(--font-size-xs); background:var(--color-bg-secondary); border: 1px solid var(--color-border);">
                <button id="btnSettingsBackupImport" class="btn btn-secondary">📥 Restore</button>
              </div>
              <small style="display:block; color:var(--color-text-muted); margin-top: var(--space-2);">
                ⚠️ WARNING: Restoring will overwrite existing personnel tables.
              </small>
            </div>
            <div class="gm-only" style="padding:var(--space-3); background:rgba(0,0,0,0.15); border-radius:var(--radius-md); font-size:var(--font-size-xs); color:var(--color-text-muted);">
              🔒 Data restoration requires Assistant/Write permission role.
            </div>
          </div>
        </div>

        <!-- Right: Configurations & PIN resets -->
        <div class="card">
          <h3 class="card-title">🛡 System Preferences</h3>
          
          <div style="display:flex; flex-direction:column; gap: var(--space-5);">
            <!-- Backup Frequency Reminders -->
            <div class="form-group">
              <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2);">Auto-Backup Reminder Frequency</label>
              <select id="settingsBackupReminderFreq" class="btn" style="text-align:left; background:var(--color-bg-secondary); border: 1px solid var(--color-border);">
                <option value="weekly">Weekly Reminders</option>
                <option value="biweekly" selected>Bi-weekly Reminders (Recommended)</option>
                <option value="monthly">Monthly Reminders</option>
                <option value="never">Disable Reminders</option>
              </select>
            </div>

            <hr style="border:0; border-top:1px solid var(--color-border);">

            <!-- PIN management -->
            <div class="assistant-only">
              <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); color: var(--color-accent-teal);">Reset Security Access PINs</h4>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-3);">
                You can change authorization PINs for GM and Assistant roles here.
              </p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
                <button id="btnResetGMPin" class="btn btn-secondary btn-sm">Set GM PIN</button>
                <button id="btnResetAsstPin" class="btn btn-secondary btn-sm">Set Assistant PIN</button>
              </div>
            </div>

            <!-- Factory Reset -->
            <div class="assistant-only" style="margin-top:var(--space-4); border-top:1px dashed var(--color-danger); padding-top:var(--space-4);">
              <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-danger); margin-bottom: var(--space-2);">Danger Zone</h4>
              <button id="btnSettingsReloadSamples" class="btn btn-secondary" style="width:100%; margin-bottom: var(--space-3);">
                Reload 144-Record Testing Dataset
              </button>
              <button id="btnSettingsFactoryReset" class="btn btn-ghost" style="color:var(--color-danger); border:1px solid var(--color-danger); width:100%;">
                ☠ Full Database Factory Reset
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    this.init();
  },

  async init() {
    this.bindEvents();
    await this.loadPreferences();
  },

  bindEvents() {
    // 1. Export database
    document.getElementById('btnSettingsBackupExport').addEventListener('click', async () => {
      try {
        await window.ExportUtils.exportDatabase();
        window.Toast.success('Export Successful', 'NCAA DOLT backup JSON file downloaded.');
        
        // Update last backup timestamp in settings DB
        await window.DB.settings.put({ key: 'lastBackupTimestamp', value: Date.now() });
        this.checkBackupReminderBanner();
      } catch (e) {
        window.Toast.error('Export Failed', e.message);
      }
    });

    // 2. Import database
    const importBtn = document.getElementById('btnSettingsBackupImport');
    if (importBtn) {
      importBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('settingsBackupImportFile');
        if (fileInput.files.length === 0) {
          window.Toast.warning('No File Selected', 'Please choose a valid JSON backup file.');
          return;
        }

        if (confirm('CRITICAL: This will replace all current database license records. Do you wish to proceed?')) {
          try {
            const count = await window.ImportUtils.importBackup(fileInput.files[0]);
            window.Toast.success('Restore Complete', `Restored ${count} records successfully.`);
            fileInput.value = '';
          } catch (e) {
            window.Toast.error('Restore Failed', e.message);
          }
        }
      });
    }

    // 3. Auto backup frequency changes
    document.getElementById('settingsBackupReminderFreq').addEventListener('change', async (e) => {
      try {
        await window.DB.settings.put({ key: 'backupReminderFrequency', value: e.target.value });
        window.Toast.success('Settings Saved', 'Backup reminder frequency preference updated.');
        this.checkBackupReminderBanner();
      } catch (e) {
        console.error(e);
      }
    });

    // 4. PIN resets
    const resetGM = document.getElementById('btnResetGMPin');
    if (resetGM) {
      resetGM.addEventListener('click', () => this.promptResetPin('GM'));
    }

    const resetAsst = document.getElementById('btnResetAsstPin');
    if (resetAsst) {
      resetAsst.addEventListener('click', () => this.promptResetPin('Assistant'));
    }

    // 5. Factory reset
    const factoryReset = document.getElementById('btnSettingsFactoryReset');
    if (factoryReset) {
      factoryReset.addEventListener('click', async () => {
        if (confirm('CRITICAL WARNING: This will completely erase all databases, records, users, and audits! There is no undo. Confirm wipe?')) {
          if (confirm('Double confirmation: Type "WIPE" to confirm deletion of database.')) {
            const text = prompt('Type WIPE:');
            if (text === 'WIPE') {
              try {
                await window.DB.clearDatabase();
                window.Toast.success('System Reset', 'All tables wiped. Locking application.');
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } catch (e) {
                window.Toast.error('Reset Failed', e.message);
              }
            }
          }
        }
      });
    }

    const reloadSamples = document.getElementById('btnSettingsReloadSamples');
    if (reloadSamples) {
      reloadSamples.addEventListener('click', async () => {
        if (!confirm('Replace personnel and audit records with the 144-record testing dataset? User PINs and settings will be kept.')) return;
        try {
          await window.DB.personnel.clear();
          await window.DB.auditTrail.clear();
          await window.seedSampleData();
          window.Toast.success('Sample Data Reloaded', '144 testing records and history logs are ready.');
          if (window.App && window.App.route) window.App.route();
        } catch (e) {
          window.Toast.error('Reload Failed', e.message);
        }
      });
    }
  },

  async loadPreferences() {
    try {
      const frequency = await window.DB.settings.get('backupReminderFrequency');
      if (frequency) {
        document.getElementById('settingsBackupReminderFreq').value = frequency.value;
      }
    } catch (e) {
      console.error(e);
    }
  },

  async promptResetPin(role) {
    const newPin = prompt(`Enter new 4-digit PIN for ${role}:`);
    if (!newPin) return;

    if (!/^\d{4}$/.test(newPin)) {
      window.Toast.error('Invalid PIN', 'PIN must be exactly 4 digits.');
      return;
    }

    try {
      const existing = (await window.DB.getUsers()).find(user => user.username === role);
      if (existing) {
        await window.DB.updateUserPin(existing.id, newPin);
      } else {
        await window.DB.addUser(role, newPin, role);
      }
      window.Toast.success('Security Updated', `PIN for ${role} has been updated successfully.`);
    } catch (e) {
      window.Toast.error('Failed to Update', e.message);
    }
  },

  // Helper to re-evaluate reminder banner state globally
  async checkBackupReminderBanner() {
    if (window.App && window.App.checkBackupReminders) {
      await window.App.checkBackupReminders();
    }
  }
};

window.SettingsPage = SettingsPage;
