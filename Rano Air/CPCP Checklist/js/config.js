export const APP_CONFIG = {
  companyName: 'Rano Air AMO',
  companyTagline: 'Abuja Airport Hangar',
  appVersion: '2.0.0',
  lastUpdated: '03 Aug 2026',
  authTimeoutMinutes: 30,
  autoSaveDelayMs: 1000,
  autoSaveIntervalMs: 30000,
  printSettings: {
    paper: 'A4',
    orientation: 'portrait',
    margins: '12mm'
  },
  branding: {
    primary: '#7c3aed',
    secondary: '#d946ef',
    accent: '#f59e0b',
    neutral: '#f8fafc'
  }
};

export const AUTH_USERS = {
  DCA: { displayName: 'DCA', role: 'manager', pin: '4821' },
  LBMM: { displayName: 'LBMM', role: 'manager', pin: '7135' },
  MCC: { displayName: 'MCC', role: 'manager', pin: '9064' }
};

export const STORAGE_KEYS = {
  AUTH: 'rano-air-cpcp-auth',
  DRAFT: 'rano-air-cpcp-draft',
  INACTIVITY: 'rano-air-cpcp-inactivity'
};
