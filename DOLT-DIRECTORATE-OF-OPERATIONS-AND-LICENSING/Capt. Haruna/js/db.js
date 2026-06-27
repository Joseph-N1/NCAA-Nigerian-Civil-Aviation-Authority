// ============================================
// NCAA DOLT License Management System
// Database Schema — db.js
// Uses Dexie.js (IndexedDB wrapper)
// ============================================

// Import Dexie from the bundled library
// Note: In a non-module context, Dexie is loaded via script tag and available globally

const db = new Dexie('NCAAdoltDB');

// ---- Schema Definition ----
// Indexes: ++id = auto-increment, & = unique, * = multi-entry
db.version(1).stores({
  // Main personnel records table
  personnel: '++id, &licenseNumber, category, licenseType, surname, firstName, licenseStatus, licenseValidUntil, medicalValidUntil, employerOrganisation, createdAt, updatedAt',

  // Audit trail — tracks all changes to personnel records
  auditTrail: '++id, personnelId, licenseNumber, fieldChanged, timestamp, changedBy',

  // App settings (PIN, roles, preferences)
  settings: 'key',

  // User accounts (GM and Assistants)
  users: '++id, &username, role',

  // Draft records (auto-save during data entry)
  drafts: '++id, category, lastModified'
});

// ============================================
// Personnel Record Factory
// Creates a new record object with all common fields
// ============================================
function createPersonnelRecord(category, data = {}) {
  const now = new Date().toISOString();
  
  const common = {
    // ---- Identity ----
    category: category,
    passportPhoto: null,        // Blob
    licenseNumber: '',
    licenseType: '',
    title: '',
    surname: '',
    firstName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    nationality: 'Nigerian',    // Smart default
    stateOfOrigin: '',
    placeOfBirth: '',
    permanentAddress: '',
    residentialAddress: '',
    telephone: '',
    email: '',
    idDocumentType: '',
    idDocumentNumber: '',
    
    // ---- License Info ----
    dateOfFirstIssue: '',
    dateOfLastRenewal: '',
    licenseValidUntil: '',
    licenseStatus: 'ACTIVE',
    languageProficiency: '',     // ICAO Level 1-6
    
    // ---- Medical ----
    medicalClass: '',            // Class 1, 2, or 3
    medicalValidUntil: '',
    medicalExaminer: '',
    
    // ---- Notes ----
    limitations: '',
    endorsements: '',
    remarks: '',
    
    // ---- Metadata ----
    createdAt: now,
    updatedAt: now,
    createdBy: '',
    updatedBy: ''
  };

  // Merge category-specific fields
  const categoryFields = getCategoryFields(category);
  
  return { ...common, ...categoryFields, ...data };
}

// ============================================
// Category-Specific Field Templates
// ============================================
function getCategoryFields(category) {
  switch (category) {
    case 'PILOT':
      return {
        pilotLicenseSubType: '',    // Student, PPL, CPL, ATPL
        categoryRating: [],          // Aeroplane, Helicopter, etc.
        classRatings: [],            // SE-Land, ME-Land, etc.
        typeRatings: [],             // [{ aircraftType, part, dateGranted, validUntil }]
        instrumentRating: false,
        instrumentValidUntil: '',
        simulatorValidUntil: '',
        instructorRating: false,
        instructorRatingType: [],
        instructorRatingEndorsement: '',
        examinerDesignation: '',
        privatePrivilegesValidUntil: '',
        nightRating: false,
        totalFlightHours: 0,
        picHours: 0,
        crossCountryHours: 0,
        instrumentFlightHours: 0,
        nightHours: 0,
        multiEngineHours: 0,
        employerOrganisation: ''
      };

    case 'CABIN_CREW':
      return {
        cabinCrewLicenseType: '',
        aircraftTypesQualified: [],
        comprehensiveMedicalDate: '',
        comprehensiveMedicalValidUntil: '',
        medicalGeneralExamDate: '',
        medicalGeneralExamValidUntil: '',
        ecgDate: '',
        ecgResult: '',
        audioDate: '',
        audioResult: '',
        emergencyDrillsValidUntil: '',
        evacuationDrillValidUntil: '',
        fireDrillValidUntil: '',
        ditchingDrillValidUntil: '',
        firstAidValidUntil: '',
        crmTrainingValidUntil: '',
        dangerousGoodsValidUntil: '',
        securityTrainingValidUntil: '',
        instructorRating: false,
        instructorRatingDetails: '',
        employerOrganisation: ''
      };

    case 'FLIGHT_DISPATCHER':
      return {
        dispatcherLicenseType: '',
        aircraftTypesAuthorized: [],
        operationalSpecifications: '',
        meteorologyValidUntil: '',
        flightPlanningValidUntil: '',
        performanceValidUntil: '',
        navigationValidUntil: '',
        regulationsValidUntil: '',
        recurrentTrainingValidUntil: '',
        employerOrganisation: ''
      };

    case 'AME':
      return {
        ameLicenseCategory: [],      // A, P, AV, I
        aircraftTypesRated: [],      // [{ aircraftType, category, dateGranted }]
        practicalExperienceMonths: 0,
        competencyAuditDate: '',
        competencyAuditValidUntil: '',
        approvedMaintenanceOrg: '',
        certificationAuthorisations: '',
        recurrentTrainingValidUntil: ''
      };

    case 'ATC':
      return {
        atcRatings: [],              // Aerodrome, Approach, Area, etc.
        atcUnit: '',
        unitEndorsements: [],        // [{ unitName, endorsementType, dateGranted, validUntil }]
        competencyCheckValidUntil: '',
        englishProficiencyLevel: '',
        englishProficiencyValidUntil: '',
        recurrentTrainingValidUntil: '',
        emergencyTrainingValidUntil: '',
        onTheJobTrainingHours: 0,
        simulatorAssessmentDate: ''
      };

    case 'ASO':
      return {
        asoLicenseType: '',
        stationAssignment: '',
        frequenciesAuthorized: [],
        communicationProceduresValidUntil: '',
        emergencyProceduresValidUntil: '',
        recurrentTrainingValidUntil: '',
        englishProficiencyLevel: '',
        englishProficiencyValidUntil: ''
      };

    case 'ATSEP':
      return {
        atsepSpecialization: [],     // Navigation, Surveillance, etc.
        systemsQualified: [],        // [{ systemName, qualification, dateGranted, validUntil }]
        facilityAssignment: '',
        competencyAssessmentValidUntil: '',
        safetyTrainingValidUntil: '',
        recurrentTrainingValidUntil: ''
      };

    case 'FLIGHT_ENGINEER':
      return {
        feLicenseType: '',
        aircraftTypesRated: [],      // [{ aircraftType, dateGranted, validUntil }]
        systemsKnowledge: [],        // Electrical, Hydraulic, etc.
        totalFlightHours: 0,
        recurrentTrainingValidUntil: '',
        employerOrganisation: ''
      };

    default:
      return {};
  }
}

// ============================================
// Database Operations
// ============================================
const DB = {
  // ---- Personnel CRUD ----
  async addPersonnel(category, data, username) {
    const record = createPersonnelRecord(category, data);
    record.createdBy = username || 'system';
    record.updatedBy = username || 'system';
    
    // Check for duplicate license number
    const existing = await db.personnel.where('licenseNumber').equals(record.licenseNumber).first();
    if (existing) {
      throw new Error(`A record with license number "${record.licenseNumber}" already exists.`);
    }
    
    const id = await db.personnel.add(record);
    
    // Log to audit trail
    await db.auditTrail.add({
      personnelId: id,
      licenseNumber: record.licenseNumber,
      fieldChanged: '_created',
      oldValue: null,
      newValue: JSON.stringify({ category, licenseNumber: record.licenseNumber }),
      timestamp: new Date().toISOString(),
      changedBy: username || 'system'
    });
    
    return id;
  },

  async updatePersonnel(id, changes, username) {
    const existing = await db.personnel.get(id);
    if (!existing) throw new Error(`Record with id ${id} not found.`);
    
    // Log each changed field to audit trail
    const auditEntries = [];
    for (const [key, newValue] of Object.entries(changes)) {
      if (key === 'updatedAt' || key === 'updatedBy') continue;
      const oldValue = existing[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        auditEntries.push({
          personnelId: id,
          licenseNumber: existing.licenseNumber,
          fieldChanged: key,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(newValue),
          timestamp: new Date().toISOString(),
          changedBy: username || 'system'
        });
      }
    }
    
    if (auditEntries.length > 0) {
      await db.auditTrail.bulkAdd(auditEntries);
    }
    
    changes.updatedAt = new Date().toISOString();
    changes.updatedBy = username || 'system';
    
    await db.personnel.update(id, changes);
    return id;
  },

  async deletePersonnel(id, arg2, arg3) {
    const username = arg3 || arg2 || 'system';
    const existing = await db.personnel.get(id);
    if (!existing) throw new Error(`Record with id ${id} not found.`);
    
    await db.auditTrail.add({
      personnelId: id,
      licenseNumber: existing.licenseNumber,
      fieldChanged: '_deleted',
      oldValue: JSON.stringify(existing),
      newValue: null,
      timestamp: new Date().toISOString(),
      changedBy: username
    });
    
    await db.personnel.delete(id);
  },

  async getPersonnel(id) {
    return await db.personnel.get(id);
  },

  async getPersonnelById(id) {
    return await this.getPersonnel(id);
  },

  async getByLicenseNumber(licenseNumber) {
    return await db.personnel.where('licenseNumber').equals(licenseNumber).first();
  },

  async getByCategory(category) {
    return await db.personnel.where('category').equals(category).toArray();
  },

  async getAllPersonnel() {
    return await db.personnel.toArray();
  },

  async searchPersonnel(query) {
    const q = query.toLowerCase();
    const all = await db.personnel.toArray();
    const flatten = (value) => {
      if (!value) return '';
      if (Array.isArray(value)) {
        return value.map(item => typeof item === 'object' ? Object.values(item || {}).join(' ') : item).join(' ');
      }
      if (typeof value === 'object') return Object.values(value).join(' ');
      return String(value);
    };

    return all.filter(p => {
      const searchable = [
        p.licenseNumber,
        p.surname,
        p.firstName,
        p.middleName,
        p.employerOrganisation,
        p.email,
        p.category,
        p.licenseType,
        p.pilotLicenseSubType,
        p.dispatcherLicenseType,
        p.cabinCrewLicenseType,
        p.asoLicenseType,
        p.feLicenseType,
        p.atcUnit,
        p.stationAssignment,
        p.facilityAssignment,
        p.approvedMaintenanceOrg,
        p.operationalSpecifications,
        flatten(p.categoryRating),
        flatten(p.classRatings),
        flatten(p.typeRatings),
        flatten(p.ameLicenseCategory),
        flatten(p.aircraftTypesRated),
        flatten(p.atcRatings),
        flatten(p.unitEndorsements),
        flatten(p.atsepSpecialization),
        flatten(p.systemsQualified),
        flatten(p.systemsKnowledge),
        flatten(p.aircraftTypesQualified),
        flatten(p.aircraftTypesAuthorized),
        flatten(p.frequenciesAuthorized)
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(q);
    });
  },

  // ---- Statistics ----
  async getStats() {
    const all = await db.personnel.toArray();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = {
      total: all.length,
      active: 0,
      expired: 0,
      expiringThisMonth: 0,
      expiringSoon: 0,  // within 90 days
      suspended: 0,
      revoked: 0,
      newThisMonth: 0,
      byCategory: {},
      expiringRecords: []
    };

    const categories = ['PILOT', 'CABIN_CREW', 'FLIGHT_DISPATCHER', 'AME', 'ATC', 'ASO', 'ATSEP', 'FLIGHT_ENGINEER'];
    categories.forEach(c => stats.byCategory[c] = 0);

    all.forEach(p => {
      stats.byCategory[p.category] = (stats.byCategory[p.category] || 0) + 1;
      
      if (p.licenseStatus === 'SUSPENDED') stats.suspended++;
      else if (p.licenseStatus === 'REVOKED') stats.revoked++;
      
      // Check license expiry
      if (p.licenseValidUntil) {
        const expiry = new Date(p.licenseValidUntil);
        if (expiry < now) {
          stats.expired++;
          stats.expiringRecords.push({ ...p, expiryType: 'license', expiryDate: p.licenseValidUntil, urgency: 'expired' });
        } else if (expiry <= thirtyDaysFromNow) {
          stats.expiringThisMonth++;
          stats.expiringRecords.push({ ...p, expiryType: 'license', expiryDate: p.licenseValidUntil, urgency: 'critical' });
        } else if (expiry <= ninetyDaysFromNow) {
          stats.expiringSoon++;
          stats.expiringRecords.push({ ...p, expiryType: 'license', expiryDate: p.licenseValidUntil, urgency: 'warning' });
        } else {
          stats.active++;
        }
      } else {
        stats.active++;
      }
      
      // Check medical expiry
      if (p.medicalValidUntil) {
        const medExpiry = new Date(p.medicalValidUntil);
        if (medExpiry < now) {
          stats.expiringRecords.push({ ...p, expiryType: 'medical', expiryDate: p.medicalValidUntil, urgency: 'expired' });
        } else if (medExpiry <= thirtyDaysFromNow) {
          stats.expiringRecords.push({ ...p, expiryType: 'medical', expiryDate: p.medicalValidUntil, urgency: 'critical' });
        }
      }
      
      if (p.createdAt && new Date(p.createdAt) >= startOfMonth) {
        stats.newThisMonth++;
      }
    });

    // Sort expiring records by urgency
    const urgencyOrder = { expired: 0, critical: 1, warning: 2 };
    stats.expiringRecords.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return stats;
  },

  // ---- Audit Trail ----
  async getAuditTrail(personnelId) {
    return await db.auditTrail.where('personnelId').equals(personnelId).reverse().toArray();
  },

  async getRecentActivity(limit = 20) {
    return await db.auditTrail.orderBy('timestamp').reverse().limit(limit).toArray();
  },

  // ---- Settings ----
  async getSetting(key) {
    const setting = await db.settings.get(key);
    return setting ? setting.value : null;
  },

  async setSetting(key, value) {
    await db.settings.put({ key, value });
  },

  // ---- Users / Auth ----
  async addUser(username, pin, role) {
    // Simple hash for PIN (not cryptographically secure, but adequate for local app)
    const hashedPin = await hashPin(pin);
    return await db.users.add({ username, pin: hashedPin, role, createdAt: new Date().toISOString() });
  },

  async verifyPin(username, pin) {
    const user = await db.users.where('username').equals(username).first();
    if (!user) return null;
    const hashedPin = await hashPin(pin);
    if (user.pin === hashedPin) {
      return { id: user.id, username: user.username, role: user.role };
    }
    return null;
  },

  async getUsers() {
    return await db.users.toArray();
  },

  async deleteUser(id) {
    await db.users.delete(id);
  },

  async updateUserPin(id, newPin) {
    const hashedPin = await hashPin(newPin);
    await db.users.update(id, { pin: hashedPin });
  },

  async isFirstRun() {
    const count = await db.users.count();
    return count === 0;
  },

  // ---- Drafts ----
  async saveDraft(category, data) {
    const existing = await db.drafts.where('category').equals(category).first();
    if (existing) {
      await db.drafts.update(existing.id, { data, lastModified: new Date().toISOString() });
      return existing.id;
    }
    return await db.drafts.add({ category, data, lastModified: new Date().toISOString() });
  },

  async getDraft(category) {
    return await db.drafts.where('category').equals(category).first();
  },

  async deleteDraft(category) {
    await db.drafts.where('category').equals(category).delete();
  },

  // ---- Export / Import ----
  async exportAll() {
    const personnel = await db.personnel.toArray();
    const auditTrail = await db.auditTrail.toArray();
    const settings = await db.settings.toArray();
    
    // Convert photos to base64 for JSON export
    const personnelExport = await Promise.all(personnel.map(async (p) => {
      if (p.passportPhoto && p.passportPhoto instanceof Blob) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(p.passportPhoto);
        });
        return { ...p, passportPhoto: base64 };
      }
      return p;
    }));

    return {
      exportDate: new Date().toISOString(),
      version: 1,
      appName: 'NCAA DOLT License Manager',
      personnel: personnelExport,
      auditTrail,
      settings
    };
  },

  async importData(jsonData) {
    if (!jsonData.personnel || !Array.isArray(jsonData.personnel)) {
      throw new Error('Invalid import file: missing personnel data');
    }

    // Convert base64 photos back to blobs
    const personnel = await Promise.all(jsonData.personnel.map(async (p) => {
      if (p.passportPhoto && typeof p.passportPhoto === 'string' && p.passportPhoto.startsWith('data:')) {
        const response = await fetch(p.passportPhoto);
        p.passportPhoto = await response.blob();
      }
      // Remove auto-increment id to avoid conflicts
      delete p.id;
      return p;
    }));

    await db.transaction('rw', db.personnel, db.auditTrail, async () => {
      await db.personnel.clear();
      await db.auditTrail.clear();
      await db.personnel.bulkAdd(personnel);
      if (jsonData.auditTrail) {
        const trails = jsonData.auditTrail.map(a => { delete a.id; return a; });
        await db.auditTrail.bulkAdd(trails);
      }
    });

    return personnel.length;
  },

  async init() {
    const freq = await this.getSetting('backupReminderFrequency');
    if (!freq) {
      await this.setSetting('backupReminderFrequency', 'biweekly');
    }
  },

  async clearDatabase() {
    await db.transaction('rw', db.personnel, db.auditTrail, db.settings, db.users, db.drafts, async () => {
      await db.personnel.clear();
      await db.auditTrail.clear();
      await db.settings.clear();
      await db.users.clear();
      await db.drafts.clear();
    });
  },

  async getAllAudits() {
    return await db.auditTrail.toArray();
  },

  // Bind tables directly for easy window.DB.table access
  personnel: db.personnel,
  auditTrail: db.auditTrail,
  settings: db.settings,
  users: db.users,
  drafts: db.drafts,

  // Reference to Dexie instance for advanced operations
  _db: db
};

// ---- Simple PIN hashing ----
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'NCAA_DOLT_SALT_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---- Seeder for mock/sample data ----
async function seedSampleData() {
  const count = await db.personnel.count();
  if (count > 0) return; // Only seed if empty

  console.log("Seeding NCAA personnel load-test data...");
  const today = new Date();

  const addDays = (d, days) => {
    const copy = new Date(d.getTime());
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().split('T')[0];
  };

  const pick = (list, index) => list[index % list.length];
  const sample = (list, index, count = 1) => {
    const values = [];
    for (let i = 0; i < count; i++) values.push(pick(list, index + i));
    return Array.from(new Set(values));
  };

  const firstNames = [
    'Musa', 'Adebayo', 'Emeka', 'Aniebiet', 'Chioma', 'Joseph', 'Ibrahim', 'Aminu', 'Folashade',
    'Nnamdi', 'Bello', 'Zainab', 'Oluwaseun', 'Hadiza', 'Kingsley', 'Rita', 'Garba', 'Chinedu'
  ];
  const surnames = [
    'Haruna', 'Balogun', 'Chukwu', 'Effiong', 'Okonkwo', 'Nimyel', 'Yusuf', 'Babangida', 'Dada',
    'Eze', 'Tukur', 'Sani', 'Adeyemi', 'Mohammed', 'Okafor', 'Etim', 'Abubakar', 'Ojo'
  ];
  const middleNames = ['Abubakar', 'Oluwaseun', 'Kingsley', 'Grace', 'Rita', 'N', 'Garba', 'Kano', 'Abigail'];
  const employers = ['Air Peace', 'Arik Air', 'ValueJet', 'Green Africa', 'Max Air', 'NCAA DOLT', 'NAMA', 'Private Owner'];
  const states = ['Lagos', 'Kaduna', 'Rivers', 'Akwa Ibom', 'Anambra', 'Plateau', 'Kano', 'FCT', 'Enugu'];
  const validityOffsets = [-45, -8, 5, 18, 42, 75, 115, 160, 220, 310, 400, 540];

  const categoryConfigs = {
    PILOT: { prefix: 'NCAA/FCL/P', title: 'Capt.', type: ['ATPL', 'CPL', 'PPL'] },
    CABIN_CREW: { prefix: 'NCAA/FCL/C', title: 'Ms.', type: ['Cabin Crew License'] },
    FLIGHT_DISPATCHER: { prefix: 'NCAA/DISP', title: 'Mr.', type: ['Flight Dispatcher License'] },
    AME: { prefix: 'NCAA/AME', title: 'Engr.', type: ['Aircraft Maintenance Engineer'] },
    ATC: { prefix: 'NCAA/ATC', title: 'Mr.', type: ['Air Traffic Controller'] },
    ASO: { prefix: 'NCAA/ASO', title: 'Ms.', type: ['Aeronautical Station Operator'] },
    ATSEP: { prefix: 'NCAA/ATSEP', title: 'Engr.', type: ['ATSEP License'] },
    FLIGHT_ENGINEER: { prefix: 'NCAA/FCL/FE', title: 'Mr.', type: ['Flight Engineer License'] }
  };

  const categoryExtras = (category, index) => {
    switch (category) {
      case 'PILOT':
        return {
          pilotLicenseSubType: pick(['ATPL', 'CPL', 'PPL', 'Student Authorization'], index),
          categoryRating: sample(['Aeroplane', 'Helicopter', 'Glider', 'Free Balloon'], index, index % 4 === 0 ? 2 : 1),
          classRatings: sample(['Single-Engine Land', 'Multi-Engine Land', 'Single-Engine Sea', 'Multi-Engine Sea'], index, 2),
          typeRatings: [{ aircraftType: pick(['B737', 'A320', 'ERJ145', 'ATR72', 'Dash 8'], index), part: (index % 2) + 1, dateGranted: addDays(today, -420 - index), validUntil: addDays(today, pick(validityOffsets, index + 2)) }],
          instrumentRating: index % 3 !== 0,
          instrumentValidUntil: addDays(today, pick(validityOffsets, index + 3)),
          simulatorValidUntil: addDays(today, pick(validityOffsets, index + 4)),
          instructorRating: index % 5 === 0,
          instructorRatingType: sample(['FI', 'TRI', 'SFI', 'CRI', 'IRI'], index, 1),
          instructorRatingEndorsement: index % 5 === 0 ? 'Line training and recurrent checks' : '',
          examinerDesignation: index % 7 === 0 ? pick(['DPE', 'TRE', 'SFE'], index) : '',
          privatePrivilegesValidUntil: addDays(today, pick(validityOffsets, index + 5)),
          nightRating: index % 2 === 0,
          totalFlightHours: 350 + (index * 275),
          picHours: 80 + (index * 130),
          crossCountryHours: 45 + (index * 22),
          instrumentFlightHours: 35 + (index * 18),
          nightHours: 20 + (index * 9),
          multiEngineHours: 30 + (index * 45)
        };
      case 'CABIN_CREW':
        return {
          cabinCrewLicenseType: 'Cabin Crew Member License',
          aircraftTypesQualified: sample(['B737', 'CRJ900', 'Embraer 195', 'A320', 'ATR72'], index, 2),
          comprehensiveMedicalDate: addDays(today, -160),
          comprehensiveMedicalValidUntil: addDays(today, pick(validityOffsets, index + 1)),
          medicalGeneralExamDate: addDays(today, -90),
          medicalGeneralExamValidUntil: addDays(today, pick(validityOffsets, index + 2)),
          ecgDate: addDays(today, -90),
          ecgResult: 'Normal',
          audioDate: addDays(today, -90),
          audioResult: 'Normal',
          emergencyDrillsValidUntil: addDays(today, pick(validityOffsets, index + 3)),
          evacuationDrillValidUntil: addDays(today, pick(validityOffsets, index + 4)),
          fireDrillValidUntil: addDays(today, pick(validityOffsets, index + 5)),
          ditchingDrillValidUntil: addDays(today, pick(validityOffsets, index + 6)),
          firstAidValidUntil: addDays(today, pick(validityOffsets, index + 7)),
          crmTrainingValidUntil: addDays(today, pick(validityOffsets, index + 8)),
          dangerousGoodsValidUntil: addDays(today, pick(validityOffsets, index + 9)),
          securityTrainingValidUntil: addDays(today, pick(validityOffsets, index + 10)),
          instructorRating: index % 6 === 0,
          instructorRatingDetails: index % 6 === 0 ? 'Cabin safety instructor' : ''
        };
      case 'FLIGHT_DISPATCHER':
        return {
          dispatcherLicenseType: 'Flight Operations Officer License',
          aircraftTypesAuthorized: sample(['B737', 'A320', 'CRJ900', 'ATR72'], index, 2),
          operationalSpecifications: pick(['Domestic trunk routes', 'Regional West Africa', 'Cargo night operations'], index),
          meteorologyValidUntil: addDays(today, pick(validityOffsets, index + 2)),
          flightPlanningValidUntil: addDays(today, pick(validityOffsets, index + 3)),
          performanceValidUntil: addDays(today, pick(validityOffsets, index + 4)),
          navigationValidUntil: addDays(today, pick(validityOffsets, index + 5)),
          regulationsValidUntil: addDays(today, pick(validityOffsets, index + 6)),
          recurrentTrainingValidUntil: addDays(today, pick(validityOffsets, index + 7))
        };
      case 'AME':
        return {
          ameLicenseCategory: sample(['Airframe (A)', 'Powerplant (P)', 'Avionics (AV)', 'Instruments (I)'], index, index % 3 === 0 ? 3 : 2),
          aircraftTypesRated: [{ aircraftType: pick(['B737', 'A320', 'ERJ145', 'ATR72'], index), category: pick(['A', 'P', 'AV', 'I'], index), dateGranted: addDays(today, -650) }],
          practicalExperienceMonths: 36 + (index % 5) * 6,
          competencyAuditDate: addDays(today, -120),
          competencyAuditValidUntil: addDays(today, pick(validityOffsets, index + 2)),
          approvedMaintenanceOrg: pick(['Aero Contractors AMO', 'ExecuJet Lagos', 'NCAA DOLT', 'Arik Technical'], index),
          certificationAuthorisations: pick(['Line maintenance release', 'Base maintenance inspection', 'Avionics troubleshooting'], index),
          recurrentTrainingValidUntil: addDays(today, pick(validityOffsets, index + 3))
        };
      case 'ATC':
        return {
          atcRatings: sample(['Aerodrome Control', 'Approach Procedural', 'Approach Surveillance', 'Area Radar'], index, 2),
          atcUnit: pick(['DNMM Tower', 'DNAA Approach', 'DNKN Tower', 'DNP0 Area Control'], index),
          unitEndorsements: [{ unitName: pick(['DNMM', 'DNAA', 'DNKN', 'DNPO'], index), endorsementType: pick(['Tower', 'Approach', 'Area Radar'], index), dateGranted: addDays(today, -360), validUntil: addDays(today, pick(validityOffsets, index + 4)) }],
          competencyCheckValidUntil: addDays(today, pick(validityOffsets, index + 5)),
          englishProficiencyLevel: pick(['Level 4', 'Level 5', 'Level 6'], index),
          englishProficiencyValidUntil: addDays(today, pick(validityOffsets, index + 6)),
          recurrentTrainingValidUntil: addDays(today, pick(validityOffsets, index + 7)),
          emergencyTrainingValidUntil: addDays(today, pick(validityOffsets, index + 8)),
          onTheJobTrainingHours: 120 + (index * 12),
          simulatorAssessmentDate: addDays(today, -45)
        };
      case 'ASO':
        return {
          asoLicenseType: 'Station Operator',
          stationAssignment: pick(['Lagos Radio', 'Abuja Radio', 'Kano Radio', 'Port Harcourt Radio'], index),
          frequenciesAuthorized: sample(['118.1 MHz', '121.5 MHz', '124.7 MHz', '127.3 MHz'], index, 2),
          communicationProceduresValidUntil: addDays(today, pick(validityOffsets, index + 2)),
          emergencyProceduresValidUntil: addDays(today, pick(validityOffsets, index + 3)),
          recurrentTrainingValidUntil: addDays(today, pick(validityOffsets, index + 4)),
          englishProficiencyLevel: pick(['Level 4', 'Level 5', 'Level 6'], index),
          englishProficiencyValidUntil: addDays(today, pick(validityOffsets, index + 5))
        };
      case 'ATSEP':
        return {
          atsepSpecialization: sample(['Navigation', 'Surveillance', 'Communication', 'Data Processing', 'Meteorological'], index, 2),
          systemsQualified: [{ systemName: pick(['ILS', 'VOR/DME', 'Radar Display', 'VHF Radio'], index), qualification: pick(['Maintainer', 'Supervisor', 'Inspector'], index), dateGranted: addDays(today, -540), validUntil: addDays(today, pick(validityOffsets, index + 2)) }],
          facilityAssignment: pick(['Lagos Radar Room', 'Abuja CNS Workshop', 'Kano VOR Site', 'Port Harcourt Tower Systems'], index),
          competencyAssessmentValidUntil: addDays(today, pick(validityOffsets, index + 3)),
          safetyTrainingValidUntil: addDays(today, pick(validityOffsets, index + 4)),
          recurrentTrainingValidUntil: addDays(today, pick(validityOffsets, index + 5))
        };
      case 'FLIGHT_ENGINEER':
        return {
          feLicenseType: 'Flight Engineer',
          aircraftTypesRated: [{ aircraftType: pick(['B727', 'DC-10', 'B747 Classic', 'IL-76'], index), dateGranted: addDays(today, -800), validUntil: addDays(today, pick(validityOffsets, index + 2)) }],
          systemsKnowledge: sample(['Electrical', 'Hydraulics', 'Pneumatics', 'Engines', 'Fuel'], index, 3),
          totalFlightHours: 1200 + (index * 180),
          recurrentTrainingValidUntil: addDays(today, pick(validityOffsets, index + 3))
        };
      default:
        return {};
    }
  };

  const categories = Object.keys(categoryConfigs);
  const recordsPerCategory = 18;
  const sampleRecords = [];

  categories.forEach((category, categoryIndex) => {
    const cfg = categoryConfigs[category];
    for (let i = 0; i < recordsPerCategory; i++) {
      const globalIndex = categoryIndex * recordsPerCategory + i;
      const expiryOffset = pick(validityOffsets, i + categoryIndex);
      const gender = globalIndex % 3 === 0 ? 'Female' : 'Male';
      const status = expiryOffset < 0 ? 'EXPIRED' : (i === 13 ? 'SUSPENDED' : (i === 16 ? 'REVOKED' : 'ACTIVE'));
      const licenseSuffix = String((categoryIndex + 1) * 1000 + i + 1).padStart(4, '0');
      const firstName = pick(firstNames, globalIndex);
      const surname = pick(surnames, globalIndex + categoryIndex);

      sampleRecords.push(createPersonnelRecord(category, {
        title: gender === 'Female' && cfg.title === 'Mr.' ? 'Ms.' : cfg.title,
        surname,
        firstName,
        middleName: pick(middleNames, globalIndex + 2),
        dateOfBirth: `${1974 + (globalIndex % 24)}-${String((globalIndex % 12) + 1).padStart(2, '0')}-${String((globalIndex % 27) + 1).padStart(2, '0')}`,
        gender,
        nationality: 'Nigerian',
        stateOfOrigin: pick(states, globalIndex),
        placeOfBirth: pick(['Lagos', 'Abuja', 'Kano', 'Enugu', 'Uyo', 'Jos'], globalIndex),
        permanentAddress: `${12 + globalIndex} Aviation Estate, ${pick(states, globalIndex)}`,
        residentialAddress: `${34 + globalIndex} Airport Road, ${pick(['Ikeja', 'Garki', 'Kano', 'Port Harcourt'], globalIndex)}`,
        telephone: `+234 80${(300000000 + globalIndex * 7391).toString().slice(0, 8)}`,
        email: `${firstName.toLowerCase()}.${surname.toLowerCase()}${globalIndex}@example.ncaa`,
        idDocumentType: pick(['International Passport', 'National ID (NIN)', 'Drivers License'], globalIndex),
        idDocumentNumber: `ID-${categoryIndex + 1}${String(globalIndex).padStart(5, '0')}`,
        licenseNumber: `${cfg.prefix}.${licenseSuffix}`,
        licenseType: pick(cfg.type, i),
        dateOfFirstIssue: addDays(today, -2200 - globalIndex * 5),
        dateOfLastRenewal: addDays(today, -240 - (globalIndex % 90)),
        licenseValidUntil: addDays(today, expiryOffset),
        licenseStatus: status,
        languageProficiency: pick(['Level 4', 'Level 5', 'Level 6'], globalIndex),
        medicalClass: pick(['Class 1', 'Class 2', 'Class 3'], globalIndex),
        medicalValidUntil: addDays(today, pick(validityOffsets, i + categoryIndex + 1)),
        medicalExaminer: pick(['Dr. Okeke AAME-018', 'Dr. Bala AAME-031', 'Dr. Essien AAME-044'], globalIndex),
        limitations: i % 6 === 0 ? 'Corrective lenses required' : '',
        endorsements: i % 4 === 0 ? 'Renewal verified by Licensing Desk' : '',
        remarks: i % 5 === 0 ? 'Load-test record with previous renewal history.' : 'Generated sample record for testing.',
        employerOrganisation: pick(employers, globalIndex),
        createdBy: 'Admin Seeder',
        updatedBy: 'Admin Seeder',
        ...categoryExtras(category, i)
      }));
    }
  });

  for (const [index, record] of sampleRecords.entries()) {
    const id = await db.personnel.add(record);
    const timestampBase = Date.now() - (sampleRecords.length - index) * 60 * 60 * 1000;

    await db.auditTrail.add({
      personnelId: id,
      licenseNumber: record.licenseNumber,
      fieldChanged: '_created',
      oldValue: null,
      newValue: JSON.stringify({ category: record.category, licenseNumber: record.licenseNumber }),
      timestamp: new Date(timestampBase).toISOString(),
      changedBy: 'Admin Seeder'
    });

    if (index % 3 === 0) {
      await db.auditTrail.bulkAdd([
        {
          personnelId: id,
          licenseNumber: record.licenseNumber,
          fieldChanged: 'licenseValidUntil',
          oldValue: JSON.stringify(addDays(today, -365 + (index % 60))),
          newValue: JSON.stringify(record.licenseValidUntil),
          timestamp: new Date(timestampBase + 20 * 60 * 1000).toISOString(),
          changedBy: 'Assistant'
        },
        {
          personnelId: id,
          licenseNumber: record.licenseNumber,
          fieldChanged: 'medicalValidUntil',
          oldValue: JSON.stringify(addDays(today, -210 + (index % 40))),
          newValue: JSON.stringify(record.medicalValidUntil),
          timestamp: new Date(timestampBase + 40 * 60 * 1000).toISOString(),
          changedBy: 'Assistant'
        }
      ]);
    }

    if (index % 5 === 0) {
      await db.auditTrail.add({
        personnelId: id,
        licenseNumber: record.licenseNumber,
        fieldChanged: 'endorsements',
        oldValue: JSON.stringify('Previous rating held on paper file'),
        newValue: JSON.stringify(record.endorsements || 'Digital rating history verified'),
        timestamp: new Date(timestampBase + 55 * 60 * 1000).toISOString(),
        changedBy: 'GM'
      });
    }
  }

  console.log(`Seeding complete. Seeded ${sampleRecords.length} personnel records.`);
}

// Make DB globally available
window.DB = DB;
window.createPersonnelRecord = createPersonnelRecord;
window.getCategoryFields = getCategoryFields;
window.seedSampleData = seedSampleData;
