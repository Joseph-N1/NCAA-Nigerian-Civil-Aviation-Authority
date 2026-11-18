// ============================================
// NCAA DOLT License Management System
// Settings & Backup Page — js/pages/settings.js
// v6 — Clear personnel, 3-record starter, folder picker export
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
              <small style="display:block; color:var(--color-text-muted); margin-top: var(--space-2);">
                💡 You can choose where to save (e.g. Documents folder) via the file picker.
              </small>
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
                Change authorization PINs for specific officers and GML.
              </p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
                <button id="btnResetGMPin" class="btn btn-secondary btn-sm">Set GML (DOLT) PIN</button>
                <button id="btnResetAsst1Pin" class="btn btn-secondary btn-sm">Set Rinret Friday PIN</button>
                <button id="btnResetAsst2Pin" class="btn btn-secondary btn-sm">Set Amina Daji PIN</button>
                <button id="btnResetAsst3Pin" class="btn btn-secondary btn-sm">Set Galadanchi A. S. PIN</button>
              </div>
            </div>

            <!-- Data Management -->
            <div class="assistant-only" style="margin-top:var(--space-4); border-top:1px dashed var(--color-danger); padding-top:var(--space-4);">
              <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-danger); margin-bottom: var(--space-3);">Data Management</h4>

              <button id="btnSettingsClearPersonnel" class="btn btn-secondary" style="width:100%; margin-bottom: var(--space-3);">
                🗑️ Clear All Personnel Records (Keep PINs & Settings)
              </button>
              <button id="btnSettingsLoadStarter" class="btn btn-secondary" style="width:100%; margin-bottom: var(--space-3);">
                📋 Load 3-Record Starter Sample
              </button>
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
        window.Toast.success('Export Successful', 'NCAA DOLT backup JSON file saved.');

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

    // 4. PIN resets (GML + 3 named assistants)
    const resetGM = document.getElementById('btnResetGMPin');
    if (resetGM) resetGM.addEventListener('click', () => this.promptResetPin('GML (DOLT)'));

    const resetA1 = document.getElementById('btnResetAsst1Pin');
    if (resetA1) resetA1.addEventListener('click', () => this.promptResetPin('Rinret Friday'));

    const resetA2 = document.getElementById('btnResetAsst2Pin');
    if (resetA2) resetA2.addEventListener('click', () => this.promptResetPin('Amina Daji'));

    const resetA3 = document.getElementById('btnResetAsst3Pin');
    if (resetA3) resetA3.addEventListener('click', () => this.promptResetPin('Galadanchi Abdulrahman Suleiman'));

    // 5. Clear Personnel Only
    const clearPersonnel = document.getElementById('btnSettingsClearPersonnel');
    if (clearPersonnel) {
      clearPersonnel.addEventListener('click', async () => {
        const count = await window.DB.personnel.count();
        if (count === 0) {
          window.Toast.info('Already Empty', 'Personnel database is already empty.');
          return;
        }
        if (!confirm(`This will permanently delete all ${count} personnel records and their audit trail history.\n\nYour PINs, settings, and user accounts will be preserved.\n\nProceed?`)) return;
        try {
          await window.DB.personnel.clear();
          await window.DB.auditTrail.clear();
          window.Toast.success('Personnel Cleared', `All ${count} records and audit history removed. PINs and settings retained.`);
          if (window.App && window.App.route) window.App.route();
        } catch (e) {
          window.Toast.error('Clear Failed', e.message);
        }
      });
    }

    // 6. Load 3-Record Starter Sample
    const loadStarter = document.getElementById('btnSettingsLoadStarter');
    if (loadStarter) {
      loadStarter.addEventListener('click', async () => {
        const existing = await window.DB.personnel.count();
        if (existing > 0) {
          if (!confirm(`There are ${existing} existing records. Loading the starter set will ADD 3 records to them.\n\nTo start clean, use "Clear All Personnel Records" first.\n\nContinue?`)) return;
        }
        try {
          await this.seedStarterData();
          window.Toast.success('Starter Data Loaded', '3 sample records added (1 Pilot, 1 Cabin Crew, 1 AME). Delete them after entering real data.');
          if (window.App && window.App.route) window.App.route();
        } catch (e) {
          window.Toast.error('Starter Load Failed', e.message);
        }
      });
    }

    // 7. Reload 144 samples
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

    // 8. Factory reset
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
        await window.DB.addUser(role, newPin, role === 'GM' ? 'GM' : 'Assistant');
      }
      window.Toast.success('Security Updated', `PIN for ${role} has been updated successfully.`);
    } catch (e) {
      window.Toast.error('Failed to Update', e.message);
    }
  },

  // 3-Record Starter Dataset
  async seedStarterData() {
    const today = new Date();
    const addDays = (d, days) => {
      const copy = new Date(d.getTime());
      copy.setDate(copy.getDate() + days);
      return copy.toISOString().split('T')[0];
    };

    const user = window.Auth.getUser();
    const username = user ? user.username : 'Starter Seeder';

    const starterRecords = [
      window.createPersonnelRecord('PILOT', {
        title: 'Capt.',
        surname: 'Yusuf',
        firstName: 'Abdullahi',
        middleName: 'M.',
        dateOfBirth: '1982-03-15',
        gender: 'Male',
        nationality: 'Nigerian',
        stateOfOrigin: 'Kaduna',
        placeOfBirth: 'Kaduna',
        permanentAddress: '14 Aviation Estate, Kaduna',
        residentialAddress: '22 Airport Road, Ikeja',
        telephone: '+234 803 000 0001',
        email: 'a.yusuf@example.ncaa',
        licenseNumber: 'NCAA/FCL/P.0001',
        licenseType: 'ATPL',
        pilotLicenseSubType: 'ATPL',
        dateOfFirstIssue: addDays(today, -1800),
        dateOfLastRenewal: addDays(today, -180),
        licenseValidUntil: addDays(today, 185),
        licenseStatus: 'ACTIVE',
        languageProficiency: 'Level 5',
        medicalClass: 'Class 1',
        medicalValidUntil: addDays(today, 120),
        medicalExaminer: 'Dr. Okeke AAME-018',
        employerOrganisation: 'Air Peace',
        categoryRating: ['Aeroplane'],
        classRatings: ['Multi-Engine Land'],
        typeRatings: [{ aircraftType: 'B737', part: 1, dateGranted: addDays(today, -400), validUntil: addDays(today, 185) }],
        instrumentRating: true,
        instrumentValidUntil: addDays(today, 185),
        totalFlightHours: 4200,
        picHours: 2100,
        remarks: 'Starter sample — delete after entering real data',
        createdBy: username,
        updatedBy: username
      }),
      window.createPersonnelRecord('CABIN_CREW', {
        title: 'Ms.',
        surname: 'Amadi',
        firstName: 'Chioma',
        middleName: 'Grace',
        dateOfBirth: '1990-07-22',
        gender: 'Female',
        nationality: 'Nigerian',
        stateOfOrigin: 'Anambra',
        placeOfBirth: 'Enugu',
        permanentAddress: '8 Unity Lane, Enugu',
        residentialAddress: '55 Airport Road, Ikeja',
        telephone: '+234 805 000 0002',
        email: 'c.amadi@example.ncaa',
        licenseNumber: 'NCAA/FCL/C.0001',
        licenseType: 'Cabin Crew License',
        cabinCrewLicenseType: 'Cabin Crew Member License',
        dateOfFirstIssue: addDays(today, -1200),
        dateOfLastRenewal: addDays(today, -90),
        licenseValidUntil: addDays(today, 275),
        licenseStatus: 'ACTIVE',
        languageProficiency: 'Level 4',
        medicalClass: 'Class 2',
        medicalValidUntil: addDays(today, 200),
        medicalExaminer: 'Dr. Bala AAME-031',
        employerOrganisation: 'Dana Air',
        aircraftTypesQualified: ['B737', 'A320'],
        remarks: 'Starter sample — delete after entering real data',
        createdBy: username,
        updatedBy: username
      }),
      window.createPersonnelRecord('AME', {
        title: 'Engr.',
        surname: 'Okoro',
        firstName: 'Benedict',
        middleName: 'Kingsley',
        dateOfBirth: '1985-11-03',
        gender: 'Male',
        nationality: 'Nigerian',
        stateOfOrigin: 'Rivers',
        placeOfBirth: 'Port Harcourt',
        permanentAddress: '30 Trans Amadi, Port Harcourt',
        residentialAddress: '12 Murtala Mohammed Way, Ikeja',
        telephone: '+234 807 000 0003',
        email: 'b.okoro@example.ncaa',
        licenseNumber: 'NCAA/AME.0001',
        licenseType: 'Aircraft Maintenance Engineer',
        dateOfFirstIssue: addDays(today, -2000),
        dateOfLastRenewal: addDays(today, -150),
        licenseValidUntil: addDays(today, 210),
        licenseStatus: 'ACTIVE',
        languageProficiency: 'Level 5',
        medicalClass: 'Class 2',
        medicalValidUntil: addDays(today, 300),
        medicalExaminer: 'Dr. Essien AAME-044',
        employerOrganisation: 'Arik Air',
        ameLicenseCategory: ['Airframe (A)', 'Powerplant (P)'],
        aircraftTypesRated: [{ aircraftType: 'B737', category: 'A', dateGranted: addDays(today, -600) }],
        practicalExperienceMonths: 48,
        approvedMaintenanceOrg: 'Aero Contractors AMO',
        remarks: 'Starter sample — delete after entering real data',
        createdBy: username,
        updatedBy: username
      })
    ];

    for (const record of starterRecords) {
      const id = await window.DB.personnel.add(record);
      await window.DB.auditTrail.add({
        personnelId: id,
        licenseNumber: record.licenseNumber,
        fieldChanged: '_created',
        oldValue: null,
        newValue: JSON.stringify({ category: record.category, licenseNumber: record.licenseNumber }),
        timestamp: new Date().toISOString(),
        changedBy: username
      });
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
