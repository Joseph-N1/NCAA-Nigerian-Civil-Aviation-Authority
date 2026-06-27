// ============================================
// NCAA DOLT License Management System
// Date Utilities — js/utils/date-utils.js
// ============================================

const DateUtils = {
  // Format ISO Date (YYYY-MM-DD) to a reader-friendly format (DD-MMM-YYYY)
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return 'N/A';
    }
  },

  // Calculate difference in days between two dates
  getDaysDifference(targetDateStr) {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr);
    const now = new Date();
    // Reset time components for clean day diff
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Get expiry classification status
  getExpiryUrgency(dateStr) {
    if (!dateStr) return 'valid';
    const days = this.getDaysDifference(dateStr);
    if (days === null) return 'valid';
    if (days < 0) return 'expired';
    if (days <= 30) return 'critical';
    if (days <= 90) return 'warning';
    return 'valid';
  },

  // Helper to format days remaining to human readable string
  getDaysRemainingText(dateStr) {
    if (!dateStr) return 'No expiry date';
    const days = this.getDaysDifference(dateStr);
    if (days === null) return 'N/A';
    if (days < 0) {
      const absDays = Math.abs(days);
      return `Expired by ${absDays} day${absDays > 1 ? 's' : ''}`;
    }
    if (days === 0) return 'Expires today';
    return `${days} day${days > 1 ? 's' : ''} left`;
  }
};

window.DateUtils = DateUtils;
