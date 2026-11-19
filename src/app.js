/**
 * QuickNote — PHẦN 2: App Shell & Điều hướng tự động (Auth <-> Dashboard)
 */
(function () {
  'use strict';

  function mountApp() {
    const container = document.getElementById('app');
    if (!container) return;

    const store = window.QuickNoteStore;
    const currentUser = store && typeof store.getCurrentUser === 'function'
      ? store.getCurrentUser()
      : null;

    if (currentUser && window.QuickNoteNotes && typeof window.QuickNoteNotes.render === 'function') {
      window.QuickNoteNotes.render(container, function onLogout() {
        mountApp();
      });
    } else if (window.QuickNoteAuth && typeof window.QuickNoteAuth.render === 'function') {
      window.QuickNoteAuth.render(container, function onAuthSuccess() {
        mountApp();
      });
    } else {
      container.innerHTML = '<div class="auth-page"><div class="paper-sheet login-sheet">Đang khởi tạo sổ ghi chú QuickNote...</div></div>';
    }
  }

  window.QuickNoteApp = {
    mount: mountApp
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
})();
