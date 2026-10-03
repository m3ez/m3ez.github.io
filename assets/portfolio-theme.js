// Run before styles so a saved dark preference is applied before the page paints.
// Keep this independent of the enhancement module and the CVE data request.
(() => {
  'use strict';
  const STORAGE_KEY = 'm3ez-theme';
  const BUTTON_ID = 'm3ez-theme-toggle-v1';
  const CELESTIAL_ID = 'm3ez-divider-celestial-v1';
  const CLOUDS_ID = 'm3ez-divider-clouds-v1';
  const LIGHT_ID = 'm3ez-divider-light-v1';
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


  function mountCyberBackground() {
    const BACKGROUND_ID = 'm3ez-cyber-background-v1';
    if (!document.body || document.getElementById(BACKGROUND_ID)) return;

    const canvas = document.createElement('canvas');
    canvas.id = BACKGROUND_ID;
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const labels = ['443', 'TLS', 'GET', 'SSH', 'CVE', 'AUTH', '0x7f', 'RECON', 'ENUM'];
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let edges = [];
    let animationFrame = 0;
    let resizeFrame = 0;
    let pointerActive = false;
    let pointerX = -1000;
    let pointerY = -1000;
    const startedAt = performance.now();

    function seededRandom(seed) {
      let state = seed >>> 0;
      return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
      };
    }

    function buildGeometry() {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const spacing = width <= 680 ? 104 : 128;
      const random = seededRandom((width * 73856093) ^ (height * 19349663));
      const columns = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;
      const nextNodes = [];

      for (let row = -1; row < rows; row += 1) {
        for (let column = -1; column < columns; column += 1) {
          const x = column * spacing + spacing * .5 + (random() - .5) * spacing * .62;
          const y = row * spacing + spacing * .5 + (random() - .5) * spacing * .62;
          if (x < -spacing || x > width + spacing || y < -spacing || y > height + spacing) continue;
          nextNodes.push({
            x,
            y,
            radius: 1.1 + random() * 1.45,
            label: random() < .16 ? labels[Math.floor(random() * labels.length)] : '',
          });
        }
      }

      const nextEdges = [];
      const degree = new Array(nextNodes.length).fill(0);
      for (let i = 0; i < nextNodes.length; i += 1) {
        const candidates = [];
        for (let j = i + 1; j < nextNodes.length; j += 1) {
          const dx = nextNodes[i].x - nextNodes[j].x;
          const dy = nextNodes[i].y - nextNodes[j].y;
          const distance = Math.hypot(dx, dy);
          if (distance <= spacing * 1.48) candidates.push({ j, distance });
        }
        candidates.sort((a, b) => a.distance - b.distance);
        for (const candidate of candidates.slice(0, 4)) {
          if (degree[i] >= 3 || degree[candidate.j] >= 3) continue;
          nextEdges.push([i, candidate.j]);
          degree[i] += 1;
          degree[candidate.j] += 1;
        }
      }

      nodes = nextNodes;
      edges = nextEdges;
    }

    function ink(alpha) {
      return root.dataset.theme === 'dark'
        ? `rgba(255,255,255,${alpha})`
        : `rgba(0,0,0,${alpha})`;
    }

    function accent(alpha) {
      return root.dataset.theme === 'dark'
        ? `rgba(126,203,255,${alpha})`
        : `rgba(29,92,126,${alpha})`;
    }

    function proximity(x, y) {
      if (!pointerActive || reducedMotion?.matches) return 0;
      const distance = Math.hypot(pointerX - x, pointerY - y);
      return Math.max(0, 1 - distance / 235);
    }

    function drawDotGrid() {
      const step = width <= 680 ? 54 : 62;
      context.save();
      context.fillStyle = ink(root.dataset.theme === 'dark' ? .05 : .035);
      for (let x = step; x < width; x += step) {
        for (let y = step; y < height; y += step) {
          if (((x / step) + (y / step)) % 3 === 0) {
            context.fillRect(x, y, 1, 1);
          }
        }
      }

      context.strokeStyle = ink(root.dataset.theme === 'dark' ? .026 : .018);
      context.lineWidth = .6;
      for (let x = step * 4; x < width; x += step * 4) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = step * 4; y < height; y += step * 4) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.restore();
    }

    function drawCrosshair(x, y, size = 7) {
      context.save();
      context.strokeStyle = accent(root.dataset.theme === 'dark' ? .13 : .09);
      context.lineWidth = .7;
      context.beginPath();
      context.moveTo(x - size, y);
      context.lineTo(x - 2, y);
      context.moveTo(x + 2, y);
      context.lineTo(x + size, y);
      context.moveTo(x, y - size);
      context.lineTo(x, y - 2);
      context.moveTo(x, y + 2);
      context.lineTo(x, y + size);
      context.stroke();
      context.restore();
    }

    function drawRadarArcs(now) {
      const radius = Math.min(width, height) * .34;
      context.save();
      context.setLineDash([5, 10]);
      context.lineWidth = .8;
      context.strokeStyle = accent(root.dataset.theme === 'dark' ? .085 : .06);
      for (const scale of [.46, .68, .9, 1.12]) {
        context.beginPath();
        context.arc(0, 0, radius * scale, 0, Math.PI * .64);
        context.stroke();
        context.beginPath();
        context.arc(width, height, radius * scale, Math.PI, Math.PI * 1.64);
        context.stroke();
      }
      context.setLineDash([]);

      if (!reducedMotion?.matches) {
        const angle = ((now - startedAt) / 19000) * Math.PI * 2;
        context.strokeStyle = accent(root.dataset.theme === 'dark' ? .12 : .075);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        context.stroke();
      }
      context.restore();
    }

    function drawInterfaceMarks() {
      drawCrosshair(width * .12, height * .2);
      drawCrosshair(width * .64, height * .15, 6);
      drawCrosshair(width * .83, height * .66, 8);
      drawCrosshair(width * .31, height * .82, 6);

      context.save();
      context.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      context.fillStyle = ink(root.dataset.theme === 'dark' ? .13 : .09);
      context.fillText('[ surface ]', Math.max(18, width * .035), height * .38);
      context.fillText('route://trust-boundary', Math.max(18, width * .035), height * .38 + 16);
      context.fillText('scan  443/TCP', Math.max(18, width * .035), height * .38 + 32);
      context.fillText('0x' + Math.round(width + height).toString(16), width - Math.min(150, width * .3), Math.max(32, height * .12));
      context.restore();
    }

    function drawRoute(edge, alpha) {
      if (!edge) return;
      const from = nodes[edge[0]];
      const to = nodes[edge[1]];
      context.save();
      context.strokeStyle = accent(alpha);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      context.restore();
    }

    function draw(now = performance.now()) {
      context.clearRect(0, 0, width, height);
      drawDotGrid();
      drawRadarArcs(now);
      drawInterfaceMarks();

      for (const [fromIndex, toIndex] of edges) {
        const from = nodes[fromIndex];
        const to = nodes[toIndex];
        const midpointX = (from.x + to.x) / 2;
        const midpointY = (from.y + to.y) / 2;
        const reveal = proximity(midpointX, midpointY);
        const baseAlpha = root.dataset.theme === 'dark' ? .078 : .055;
        context.strokeStyle = ink(baseAlpha + reveal * .105);
        context.lineWidth = .7 + reveal * .35;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }

      if (edges.length) {
        const routeIndex = Math.floor((now - startedAt) / 8500);
        drawRoute(edges[(routeIndex * 5) % edges.length], root.dataset.theme === 'dark' ? .16 : .105);
        drawRoute(edges[(routeIndex * 5 + 11) % edges.length], root.dataset.theme === 'dark' ? .11 : .075);
      }

      for (const node of nodes) {
        const reveal = proximity(node.x, node.y);
        const nodeAlpha = (root.dataset.theme === 'dark' ? .145 : .105) + reveal * .13;
        context.fillStyle = ink(nodeAlpha);
        context.beginPath();
        context.arc(node.x, node.y, node.radius + reveal * .55, 0, Math.PI * 2);
        context.fill();

        if (node.label) {
          context.fillStyle = ink((root.dataset.theme === 'dark' ? .17 : .125) + reveal * .095);
          context.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
          context.fillText(node.label, node.x + 8, node.y - 7);
        }
      }

      if (!reducedMotion?.matches && edges.length) {
        const elapsed = now - startedAt;
        const cycle = 7200;
        const cycleIndex = Math.floor(elapsed / cycle);
        const phase = (elapsed % cycle) / cycle;
        const edge = edges[(cycleIndex * 7) % edges.length];
        const from = nodes[edge[0]];
        const to = nodes[edge[1]];
        const x = from.x + (to.x - from.x) * phase;
        const y = from.y + (to.y - from.y) * phase;

        context.fillStyle = accent(root.dataset.theme === 'dark' ? .12 : .08);
        context.beginPath();
        context.arc(x, y, 5.5, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = accent(root.dataset.theme === 'dark' ? .72 : .5);
        context.beginPath();
        context.arc(x, y, 1.9, 0, Math.PI * 2);
        context.fill();
      }
    }

    function animate(now) {
      draw(now);
      animationFrame = window.requestAnimationFrame(animate);
    }

    function syncMotion() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      if (reducedMotion?.matches) {
        draw();
      } else {
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    function resize() {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        buildGeometry();
        draw();
      });
    }

    window.addEventListener('pointermove', event => {
      pointerActive = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (reducedMotion?.matches) draw();
    }, { passive: true });

    window.addEventListener('pointerout', event => {
      if (event.relatedTarget) return;
      pointerActive = false;
      if (reducedMotion?.matches) draw();
    }, { passive: true });

    window.addEventListener('resize', resize, { passive: true });
    reducedMotion?.addEventListener?.('change', syncMotion);

    const themeObserver = new MutationObserver(mutations => {
      if (mutations.some(mutation => mutation.attributeName === 'data-theme')) draw();
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    buildGeometry();
    syncMotion();
  }

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
    mountCyberBackground();
    mountDividerLight();
    mountDividerClouds();
    mountDividerCelestial();
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
