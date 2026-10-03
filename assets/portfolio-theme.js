// Run before styles so a saved dark preference is applied before the page paints.
// Keep this independent of the enhancement module and the CVE data request.
(() => {
  'use strict';
  const STORAGE_KEY = 'm3ez-theme';
  const BUTTON_ID = 'm3ez-theme-toggle-v1';
  const CELESTIAL_ID = 'm3ez-divider-celestial-v1';
  const CLOUDS_ID = 'm3ez-divider-clouds-v1';
  const WATCHER_ID = 'm3ez-divider-watcher-v1';
  const root = document.documentElement;
  const initialHash = window.location?.hash || '';
  const landingHash =
    !initialHash ||
    initialHash === '#top' ||
    initialHash === '#content' ||
    initialHash === '#method' ||
    initialHash.startsWith('#method-');
  root.dataset.portfolioExpanded = landingHash ? 'false' : 'true';
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

  function mountDividerClouds() {
    const hero = document.getElementById('top');
    if (!hero || document.getElementById(CLOUDS_ID)) return;

    const clouds = document.createElement('span');
    clouds.id = CLOUDS_ID;
    clouds.setAttribute('aria-hidden', 'true');

    const dayCloud = '<g class="divider-cloud-drift"><path fill="currentColor" d="M3 18.5c0-3.04 2.46-5.5 5.5-5.5.63 0 1.23.11 1.79.3A8 8 0 0 1 25.2 10.4a6.25 6.25 0 0 1 10.05 4.98A4.8 4.8 0 1 1 36.2 25H7.8A6.8 6.8 0 0 1 3 18.5Z"/></g>';
    const nightCloud = '<g class="divider-cloud-drift" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"><path d="M3 14.5c4.7-3.5 9.5-3.7 14.1-1.3 3.6-4.4 11.2-4 14.1 1 3.7-1.6 7.2-1.2 9.8 1.2"/><path opacity=".55" d="M9 18c5.3-2.3 10.4-2.2 15.1.2 3-2.4 7.1-2.6 10.9-.7"/></g>';

    clouds.innerHTML =
      '<svg class="divider-cloud divider-cloud-day divider-cloud-day-1" xmlns="http://www.w3.org/2000/svg" viewBox="2 7 40 19" aria-hidden="true" focusable="false">' + dayCloud + '</svg>' +
      '<svg class="divider-cloud divider-cloud-day divider-cloud-day-2" xmlns="http://www.w3.org/2000/svg" viewBox="2 7 40 19" aria-hidden="true" focusable="false">' + dayCloud + '</svg>' +
      '<svg class="divider-cloud divider-cloud-night divider-cloud-night-1" xmlns="http://www.w3.org/2000/svg" viewBox="2 8 40 12" aria-hidden="true" focusable="false">' + nightCloud + '</svg>' +
      '<svg class="divider-cloud divider-cloud-night divider-cloud-night-2" xmlns="http://www.w3.org/2000/svg" viewBox="2 8 40 12" aria-hidden="true" focusable="false">' + nightCloud + '</svg>';

    hero.appendChild(clouds);
  }

  function mountDividerCelestial() {
    const hero = document.getElementById('top');
    if (!hero || document.getElementById(CELESTIAL_ID)) return;

    const celestial = document.createElement('span');
    celestial.id = CELESTIAL_ID;
    celestial.setAttribute('aria-hidden', 'true');
    celestial.innerHTML = '<svg class="divider-celestial-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.6" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M12 2.5v2.2m0 14.6v2.2M2.5 12h2.2m14.6 0h2.2M5.28 5.28l1.56 1.56m10.32 10.32 1.56 1.56M5.28 18.72l1.56-1.56m10.32-10.32 1.56-1.56"/></g></svg><svg class="divider-celestial-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.35 15.35A8.45 8.45 0 0 1 8.65 3.65 8.46 8.46 0 1 0 20.35 15.35Z"/></svg>';
    hero.appendChild(celestial);
  }

  function mountDividerWatcher() {
    const hero = document.getElementById('top');
    if (!hero || document.getElementById(WATCHER_ID)) return;

    const watcher = document.createElement('span');
    watcher.id = WATCHER_ID;
    watcher.setAttribute('aria-hidden', 'true');
    watcher.innerHTML = '<span class="divider-watcher-pose"></span>';
    hero.appendChild(watcher);
  }

  function mount() {
    mountDividerClouds();
    mountDividerCelestial();
    mountDividerWatcher();
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

  window.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'r' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    root.dataset.dividerRunner = root.dataset.dividerRunner === 'active' ? 'inactive' : 'active';
  });

  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) applyTheme(event.newValue);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
