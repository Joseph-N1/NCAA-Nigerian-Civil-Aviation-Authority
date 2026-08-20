export const APP_CONFIG = {
  companyName: 'Rano Air AMO',
  companyTagline: 'Abuja Airport Hangar · Maintenance Control',
  appVersion: '2.0.0',
  lastUpdated: '20 Aug 2026',
  authTimeoutMinutes: 30,
  autoSaveDelayMs: 1000,
  autoSaveIntervalMs: 30000,
  printSettings: {
    paper: 'A4',
    orientation: 'portrait',
    margins: '12mm'
  },
  branding: {
    primary: '#A50050',      // Rano Air Signature Plum Magenta (from ranoair.com)
    darkPlum: '#8F0145',     // Rano Air Dark Plum (from ranoair.com)
    crimson: '#DD5353',      // Rano Air Crimson Coral (from ranoair.com)
    ncaaNavy: '#1D1B4C',     // NCAA Port Gore Navy
    steelBlue: '#4A6FA5',    // Steel Blue
    accent: '#f59e0b',       // Aviation Amber
    silver: '#BFBFBF',       // Metallic Silver
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
  INACTIVITY: 'rano-air-cpcp-inactivity',
  PEER_ID: 'rano-air-cpcp-peer-id'
};

