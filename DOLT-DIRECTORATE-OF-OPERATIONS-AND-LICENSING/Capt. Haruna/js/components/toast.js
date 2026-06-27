// ============================================
// NCAA DOLT License Management System
// Toast Notifications — js/components/toast.js
// ============================================

const Toast = {
  show(title, message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon selection
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close">✕</button>
    `;

    container.appendChild(toast);

    // Fade in
    setTimeout(() => {
      toast.classList.add('show');
    }, 50);

    // Auto close setup
    const autoCloseTimer = setTimeout(() => {
      closeToast(toast);
    }, duration);

    // Close on click button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(autoCloseTimer);
      closeToast(toast);
    });

    function closeToast(el) {
      el.classList.remove('show');
      el.addEventListener('transitionend', () => {
        el.remove();
      });
    }
  },

  success(title, message, duration) {
    this.show(title, message, 'success', duration);
  },

  error(title, message, duration) {
    this.show(title, message, 'error', duration);
  },

  warning(title, message, duration) {
    this.show(title, message, 'warning', duration);
  },

  info(title, message, duration) {
    this.show(title, message, 'info', duration);
  }
};

window.Toast = Toast;
