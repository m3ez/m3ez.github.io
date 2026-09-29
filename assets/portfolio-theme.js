// Run before styles so a saved dark preference is applied before the page paints.
// Keep this independent of the enhancement module and the CVE data request.
(() => {
  'use strict';
  const STORAGE_KEY = 'm3ez-theme';
  const BUTTON_ID = 'm3ez-theme-toggle-v1';
  const root = document.documentElement;
  let button;

  function applyTheme(value) {
    const dark = value === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    if (button) {
      const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  }

  let savedTheme;
  try {
    savedTheme = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable. The in-page control must still work.
  }
  applyTheme(savedTheme); // Deliberately default to light, not the OS preference.

  function mount() {
    if (document.getElementById(BUTTON_ID)) return;
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.innerHTML = '<svg class="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z"/></svg><svg class="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
    applyTheme(root.dataset.theme);
    button.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
      try {
        window.localStorage.setItem(STORAGE_KEY, root.dataset.theme);
      } catch {
        // A denied or full store must not prevent toggling in this tab.
      }
    });
    document.body.appendChild(button);
  }

  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) applyTheme(event.newValue);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
