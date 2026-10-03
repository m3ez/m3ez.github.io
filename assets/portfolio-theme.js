// Run before styles so a saved dark preference is applied before the page paints.
// Keep this independent of the enhancement module and the CVE data request.
(() => {
  'use strict';
  const STORAGE_KEY = 'm3ez-theme';
  const BUTTON_ID = 'm3ez-theme-toggle-v1';
  const CELESTIAL_ID = 'm3ez-divider-celestial-v1';
  const CLOUDS_ID = 'm3ez-divider-clouds-v1';
  const LIGHT_ID = 'm3ez-divider-light-v1';
  const WIREFRAME_ID = 'm3ez-wireframe-gutters-v1';
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
  let autoThemeEnabled = true;

  function getLocalHour(date = new Date()) {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  }

  function getSkyState(date = new Date()) {
    const hour = getLocalHour(date);
    let name;
    if (hour >= 5 && hour < 7) name = 'sunrise';
    else if (hour >= 7 && hour < 10) name = 'morning';
    else if (hour >= 10 && hour < 15) name = 'noon';
    else if (hour >= 15 && hour < 18) name = 'sunset';
    else if (hour >= 18 && hour < 21) name = 'evening';
    else if (hour >= 21 || hour < 1) name = 'midnight';
    else name = 'late-night';

    const sunVisible = hour >= 5 && hour < 18;
    const rawProgress = sunVisible
      ? (hour - 5) / 13
      : hour >= 18
        ? (hour - 18) / 11
        : (hour + 6) / 11;
    const progress = Math.max(0, Math.min(1, rawProgress));
    const altitude = Math.sin(progress * Math.PI);

    return {
      name,
      sunVisible,
      autoTheme: hour >= 6 && hour < 18 ? 'light' : 'dark',
      progress,
      altitude,
    };
  }

  function applyTheme(value) {
    const dark = value === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themeMode = autoThemeEnabled ? 'auto' : 'manual';
    if (button) {
      const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
      button.setAttribute('aria-label', label);
      button.title = autoThemeEnabled ? `${label} (manual override)` : label;
    }
  }

  function updateSky(date = new Date()) {
    const state = getSkyState(date);
    root.dataset.sky = state.name;
    root.dataset.skyPhase = state.sunVisible ? 'sun' : 'moon';

    if (root.style?.setProperty) {
      const x = 28 + state.progress * 44;
      const rise = 3 + state.altitude * 22;
      const mobileRise = 2 + state.altitude * 9;
      const angle = state.sunVisible
        ? -12 + state.progress * 24
        : 10 - state.progress * 20;
      const lightOpacity = state.sunVisible
        ? .08 + state.altitude * .12
        : .035 + state.altitude * .045;
      const cloudBrightness = state.sunVisible
        ? .9 + state.altitude * .1
        : .72 + state.altitude * .08;

      root.style.setProperty('--celestial-x', `${x.toFixed(2)}%`);
      root.style.setProperty('--celestial-rise', `${rise.toFixed(2)}px`);
      root.style.setProperty('--celestial-rise-mobile', `${mobileRise.toFixed(2)}px`);
      root.style.setProperty('--celestial-angle', `${angle.toFixed(2)}deg`);
      root.style.setProperty('--sky-light-opacity', lightOpacity.toFixed(3));
      root.style.setProperty('--cloud-brightness', cloudBrightness.toFixed(3));
      root.style.setProperty('--cloud-shadow-x', `${((.5 - state.progress) * 8).toFixed(2)}px`);
      root.style.setProperty('--cloud-shadow-y', `${(3 + (1 - state.altitude) * 2).toFixed(2)}px`);
    }

    if (autoThemeEnabled) applyTheme(state.autoTheme);
  }

  let savedTheme;
  try {
    savedTheme = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable. The in-page control must still work.
  }
  autoThemeEnabled = savedTheme !== 'light' && savedTheme !== 'dark';
  if (!autoThemeEnabled) applyTheme(savedTheme);
  updateSky();

  function mountDividerLight() {
    const hero = document.getElementById('top');
    if (!hero || document.getElementById(LIGHT_ID)) return;

    const light = document.createElement('span');
    light.id = LIGHT_ID;
    light.setAttribute('aria-hidden', 'true');
    hero.appendChild(light);
  }

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


  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function createWireframeObject(role, side, bandIndex) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('m3ez-wireframe-object', `is-${role}`);
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const variants = [
      '<path d="M18 38 58 16l44 24-42 22L18 38Zm40-22v46m44-22v42L60 104V62M18 38v42l42 24M18 80l40-18 44 20"/>',
      '<path d="M8 46 52 20l56 30-48 26L8 46Zm44-26v56m56-26v40l-48 26V76M8 46v38l52 32M8 84l44-20 56 26"/>',
      '<path d="M24 30 70 8l38 26-44 22-40-26Zm46-22v48m38-22v46L64 106V56M24 30v48l40 28M24 78l46-22 38 24"/>',
      '<path d="M4 54 48 24l64 28-50 30L4 54Zm44-30v58m64-30v40l-50 26V82M4 54v36l58 28M4 90l44-24 64 26"/>',
    ];
    svg.innerHTML = variants[Math.floor(Math.random() * variants.length)];

    const sizeRanges = {
      dominant: [105, 152],
      medium: [68, 98],
      fragment: [38, 62],
    };
    const yBands = [
      [2, 24],
      [34, 58],
      [68, 88],
    ];
    const [minSize, maxSize] = sizeRanges[role];
    const [minY, maxY] = yBands[bandIndex];
    const sideBias = side === 'left' ? [-34, 18] : [-18, 34];

    svg.style.setProperty('--wf-size', `${randomBetween(minSize, maxSize).toFixed(1)}%`);
    svg.style.setProperty('--wf-x', `${randomBetween(sideBias[0], sideBias[1]).toFixed(1)}%`);
    svg.style.setProperty('--wf-y', `${randomBetween(minY, maxY).toFixed(1)}%`);
    svg.style.setProperty('--wf-angle', `${randomBetween(-9, 9).toFixed(2)}deg`);
    svg.style.setProperty('--wf-opacity', randomBetween(.034, .072).toFixed(3));
    return svg;
  }

  function mountWireframeGutters() {
    if (!document.body || document.getElementById(WIREFRAME_ID)) return;

    const root = document.createElement('div');
    root.id = WIREFRAME_ID;
    root.setAttribute('aria-hidden', 'true');

    const roles = ['dominant', 'medium', 'fragment'];
    for (const side of ['left', 'right']) {
      const gutter = document.createElement('div');
      gutter.className = `m3ez-wireframe-gutter is-${side}`;

      const bands = [0, 1, 2].sort(() => Math.random() - .5);
      roles.forEach((role, index) => {
        gutter.appendChild(createWireframeObject(role, side, bands[index]));
      });

      root.appendChild(gutter);
    }

    document.body.appendChild(root);
  }

  function mountDividerCelestial() {
    const hero = document.getElementById('top');
    if (!hero || document.getElementById(CELESTIAL_ID)) return;

    const celestial = document.createElement('span');
    celestial.id = CELESTIAL_ID;
    celestial.setAttribute('aria-hidden', 'true');
    celestial.innerHTML =
      '<svg class="divider-celestial-icon divider-celestial-sunrise" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12.5" r="3.4" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"><path d="M12 4.7v2M5.1 8.6l1.7 1m12.1-1-1.7 1M3.7 14h2.2M18.1 14h2.2"/></g></svg>' +
      '<svg class="divider-celestial-icon divider-celestial-morning" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.6" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"><path d="M12 3.4v2m0 13.2v2M4.5 7.7l1.7 1m11.6-1 1.7-1M3.5 12h2m13 0h2M6.2 17.3l-1.6 1"/></g></svg>' +
      '<svg class="divider-celestial-icon divider-celestial-noon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.7" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M12 2.5v2.2m0 14.6v2.2M2.5 12h2.2m14.6 0h2.2M5.28 5.28l1.56 1.56m10.32 10.32 1.56 1.56M5.28 18.72l1.56-1.56m10.32-10.32 1.56-1.56"/></g></svg>' +
      '<svg class="divider-celestial-icon divider-celestial-sunset" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="11.5" r="3.5" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"><path d="M12 3.3v2M4.8 7.3l1.7 1.1m11-1.1 1.7-1.1M3.5 12h2.1m12.8 0h2.1M6.4 16.6l-1.6 1.2m12.8-1.2 1.6 1.2"/></g></svg>' +
      '<svg class="divider-celestial-icon divider-celestial-evening" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.8 15.2A8.15 8.15 0 0 1 8.8 4.2 8.16 8.16 0 1 0 19.8 15.2Z"/><circle cx="18.2" cy="6.1" r=".65" fill="currentColor" opacity=".45"/></svg>' +
      '<svg class="divider-celestial-icon divider-celestial-midnight" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.35 15.35A8.45 8.45 0 0 1 8.65 3.65 8.46 8.46 0 1 0 20.35 15.35Z"/><circle cx="18.3" cy="5.1" r=".62" fill="currentColor" opacity=".5"/><circle cx="20.2" cy="8.2" r=".38" fill="currentColor" opacity=".35"/></svg>' +
      '<svg class="divider-celestial-icon divider-celestial-late-night" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.9 15.6A8.25 8.25 0 0 1 8.4 4.1 8.27 8.27 0 1 0 19.9 15.6Z"/><circle cx="5.2" cy="8.2" r=".55" fill="currentColor" opacity=".4"/></svg>';
    hero.appendChild(celestial);
  }

  function mount() {
    mountDividerLight();
    mountDividerClouds();
    mountDividerCelestial();
    mountWireframeGutters();
    if (document.getElementById(BUTTON_ID)) return;
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.innerHTML = '<svg class="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z"/></svg><svg class="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
    applyTheme(root.dataset.theme);
    button.addEventListener('click', () => {
      autoThemeEnabled = false;
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
    root.dataset.dividerWalker = root.dataset.dividerWalker === 'active' ? 'inactive' : 'active';
  });

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    if (event.newValue === 'light' || event.newValue === 'dark') {
      autoThemeEnabled = false;
      applyTheme(event.newValue);
      return;
    }
    autoThemeEnabled = true;
    updateSky();
  });

  if (typeof window.setInterval === 'function') {
    window.setInterval(updateSky, 60_000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
