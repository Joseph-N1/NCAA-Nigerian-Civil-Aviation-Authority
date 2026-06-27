// ============================================
// NCAA DOLT License Management System
// Field Validation — js/utils/validators.js
// ============================================

const Validators = {
  // Validate that a license number matches NCAA standards
  // Expected standard formats: e.g. NCAA/FCL/P.1234, NCAA/AME/1234, NCAA/ATC/1234
  validateLicenseNumber(licNo) {
    if (!licNo) return { valid: false, message: 'License number is required.' };
    
    // Check general length and basic structure
    const trimmed = licNo.trim();
    if (trimmed.length < 3) {
      return { valid: false, message: 'License number must be at least 3 characters.' };
    }
    
    const ncaaPattern = /^NCAA\/(FCL\/(P|C|FE)|AME|ATC|ASO|ATSEP|DISP)[/.]\d{4,6}$/i;
    if (!ncaaPattern.test(trimmed)) {
      return {
        valid: false,
        message: 'Use NCAA format, e.g. NCAA/FCL/P.1234, NCAA/AME.1234, NCAA/ATC/1234.'
      };
    }

    return { valid: true, message: '' };
  },

  // Validate generic required text field
  validateRequired(val, fieldName = 'Field') {
    if (val === undefined || val === null || String(val).trim() === '') {
      return { valid: false, message: `${fieldName} is required.` };
    }
    return { valid: true, message: '' };
  },

  // Validate email address
  validateEmail(email) {
    if (!email) return { valid: true, message: '' }; // Optional by default unless required validation is also run
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }
    return { valid: true, message: '' };
  },

  // Validate phone number
  validatePhone(phone) {
    if (!phone) return { valid: true, message: '' }; // Optional
    // Accepts common Nigerian and international formats: +234..., 080..., 090...
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return { valid: false, message: 'Please enter a valid phone number (7-15 digits).' };
    }
    return { valid: true, message: '' };
  },

  // Validate age based on date of birth (usually minimum 17 for PPL, 18 for CPL/others)
  validateAge(dobStr, minAge = 17) {
    if (!dobStr) return { valid: false, message: 'Date of birth is required.' };
    
    const dob = new Date(dobStr);
    const today = new Date();
    if (isNaN(dob.getTime())) {
      return { valid: false, message: 'Please enter a valid date.' };
    }

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < minAge) {
      return { valid: false, message: `Personnel must be at least ${minAge} years old.` };
    }
    return { valid: true, message: '' };
  },

  validateFutureDate(dateStr, fieldName = 'Date') {
    if (!dateStr) return { valid: true, message: '' };
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(target.getTime())) {
      return { valid: false, message: `${fieldName} must be a valid date.` };
    }
    if (target <= today) {
      return { valid: false, message: `${fieldName} must be in the future for new entries.` };
    }
    return { valid: true, message: '' };
  }
};

window.Validators = Validators;
