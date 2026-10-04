import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');

// Minimal DOM boundary for the real bootstrap. Browser tests cover SVG rendering.
function boot(instant, { hour = 22, savedTheme = null, storageDenied = false, loading = false, hero = true } = {}) {
  let now = new Date(instant).getTime();
  let localHour = hour;
  const windowEvents = new Map(), documentEvents = new Map(), timers = [];
  class Element {
    constructor() {
      this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = new Map();
      this.innerHTML = ''; this.properties = new Map();
      this.style = { setProperty: (key, value) => this.properties.set(key, value) };
    }
    appendChild(child) { this.children.push(child); }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(key, callback) { this.listeners.set(key, callback); }
    querySelector(selector) {
      if (!this.innerHTML.includes(selector.slice(1))) return null;
      this.queries ??= new Map();
      if (!this.queries.has(selector)) this.queries.set(selector, new Element());
      return this.queries.get(selector);
    }
  }
  const root = new Element(), body = new Element(), top = new Element();
  top.id = 'top';
  if (hero) body.appendChild(top);
  function find(node, id) { return node.id === id ? node : node.children.map(child => find(child, id)).find(Boolean); }
  const document = {
    documentElement: root, body, readyState: loading ? 'loading' : 'complete', visibilityState: 'visible',
    createElement: () => new Element(), getElementById: id => find(body, id),
    addEventListener: (name, callback) => documentEvents.set(name, callback),
  };
  const storage = new Map(savedTheme ? [['m3ez-theme', savedTheme]] : []);
  const window = {
    location: { hash: '' },
    localStorage: {
      getItem(key) { if (storageDenied) throw new Error('denied'); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageDenied) throw new Error('denied'); storage.set(key, value); },
    },
    addEventListener: (name, callback) => windowEvents.set(name, callback),
    setInterval: (callback, interval) => timers.push({ callback, interval }),
  };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
    getHours() { return localHour; }
    getMinutes() { return 0; }
    getSeconds() { return 0; }
  }
  vm.runInNewContext(source, { window, document, Date: Clock, HTMLElement: Element });
  return {
    root, document, storage, windowEvents, documentEvents, timers,
    element: id => document.getElementById(id),
    jump(instant, hour = localHour) { now = new Date(instant).getTime(); localHour = hour; },
    tick() { timers[0].callback(); },
    click() { document.getElementById('m3ez-theme-toggle-v1').listeners.get('click')(); },
  };
}

// Independent phase instants (UTC): Fred Espenak's computed almanac.
// https://www.astropixels.com/almanac/almanac21/almanac2024gmt.html
const principalPhases = [
  ['2024-04-08T18:21:00Z', 'new-moon', 0],
  ['2024-04-15T19:13:00Z', 'first-quarter', 0.5],
  ['2024-04-23T23:49:00Z', 'full-moon', 1],
  ['2024-05-01T11:27:00Z', 'last-quarter', 0.5],
];
for (const [instant, name, fraction] of principalPhases) {
  test(`date-driven ${name} agrees with independent almanac`, () => {
    const { root } = boot(instant);
    assert.equal(root.dataset.moonPhase, name);
    assert.ok(Math.abs(Number(root.dataset.moonIllumination) - fraction) < 0.035,
      `expected approximately ${fraction}; received ${root.dataset.moonIllumination}`);
  });
}

test('a complete month visits all eight phases with continuously changing illumination', () => {
  const states = Array.from({ length: 720 }, (_, hour) => boot(1712629260000 + hour * 3600000).root.dataset);
  assert.equal(new Set(states.map(state => state.moonPhase)).size, 8);
  assert.ok(new Set(states.map(state => state.moonIllumination)).size > 600);
  for (const state of states) {
    assert.ok(Number(state.moonIllumination) >= 0 && Number(state.moonIllumination) <= 1);
  }
});

test('local hour changes the scene, not the phase at the same instant', () => {
  const night = boot('2024-04-15T19:13:00Z', { hour: 22 });
  const day = boot('2024-04-16T02:13:00+07:00', { hour: 12 });
  assert.equal(night.root.dataset.moonPhase, day.root.dataset.moonPhase);
  assert.equal(night.root.dataset.moonIllumination, day.root.dataset.moonIllumination);
  assert.equal(night.root.dataset.skyPhase, 'moon');
  assert.equal(day.root.dataset.skyPhase, 'sun');
});

test('one moon SVG replaces the three fixed night silhouettes', () => {
  const app = boot('2024-04-15T19:13:00Z');
  const markup = app.element('m3ez-divider-celestial-v1').innerHTML;
  assert.equal((markup.match(/<svg\b/g) || []).length, 5, 'four sun variants plus one lunar disc');
  assert.equal((markup.match(/divider-celestial-moon/g) || []).length, 1);
  assert.match(markup, /fill="none"[^>]*stroke="currentColor"/);
  assert.doesNotMatch(markup, /<rect|fill="(?:white|black|#fff|#000)"/);
});

test('waxing and waning half moons illuminate opposite sides', () => {
  const waxing = boot('2024-04-15T19:13:00Z');
  const waning = boot('2024-05-01T11:27:00Z');
  const path = app => app.element('m3ez-divider-celestial-v1').queries?.get('.divider-moon-lit')?.attributes.d;
  assert.match(path(waxing) ?? '', /^M12 4 A8 8 0 0 1 12 20/);
  assert.match(path(waning) ?? '', /^M12 4 A8 8 0 0 0 12 20/);
});

test('moonlight increases with illumination without changing daytime lighting', () => {
  const light = app => Number(app.root.properties.get('--sky-light-opacity'));
  assert.ok(light(boot(principalPhases[0][0])) < light(boot(principalPhases[1][0])));
  assert.ok(light(boot(principalPhases[1][0])) < light(boot(principalPhases[2][0])));
  assert.equal(light(boot(principalPhases[0][0], { hour: 12 })), light(boot(principalPhases[2][0], { hour: 12 })));
});

test('manual palette override persists while the lunar phase continues updating', () => {
  const app = boot(principalPhases[0][0]);
  const buttonMarkup = app.element('m3ez-theme-toggle-v1').innerHTML;
  app.click();
  assert.equal(app.root.dataset.theme, 'light');
  app.jump(principalPhases[2][0]); app.tick();
  assert.equal(app.root.dataset.moonPhase, 'full-moon');
  assert.equal(app.root.dataset.theme, 'light');
  assert.equal(app.root.dataset.themeMode, 'manual');
  assert.equal(app.storage.get('m3ez-theme'), 'light');
  assert.equal(app.element('m3ez-theme-toggle-v1').innerHTML, buttonMarkup);
});

test('visibility and page restoration immediately refresh a stale clock', () => {
  const app = boot(principalPhases[0][0]);
  assert.equal(typeof app.documentEvents.get('visibilitychange'), 'function');
  app.jump(principalPhases[2][0]);
  app.document.visibilityState = 'hidden';
  app.documentEvents.get('visibilitychange')();
  assert.equal(app.root.dataset.moonPhase, 'new-moon');
  app.document.visibilityState = 'visible';
  app.documentEvents.get('visibilitychange')();
  assert.equal(app.root.dataset.moonPhase, 'full-moon');
  app.jump(principalPhases[3][0]);
  assert.equal(typeof app.windowEvents.get('pageshow'), 'function');
  app.windowEvents.get('pageshow')();
  assert.equal(app.root.dataset.moonPhase, 'last-quarter');
  assert.equal(app.timers.length, 1);
  assert.equal(app.timers[0].interval, 60_000);
});

test('pre-paint bootstrap and late DOM mount both receive a phase', () => {
  const app = boot(principalPhases[2][0], { loading: true });
  assert.equal(app.root.dataset.moonPhase, 'full-moon');
  app.documentEvents.get('DOMContentLoaded')();
  assert.match(app.element('m3ez-divider-celestial-v1').queries?.get('.divider-moon-lit')?.attributes.d ?? '', /^M/);
});

test('denied storage and a missing hero do not prevent the theme bootstrap', () => {
  const app = boot(principalPhases[2][0], { storageDenied: true, hero: false });
  app.click();
  assert.equal(app.root.dataset.theme, 'light');
  assert.equal(app.root.dataset.moonPhase, 'full-moon');
});

test('an invalid clock retains the last good sky instead of writing NaN', () => {
  const app = boot(principalPhases[2][0]);
  const before = { ...app.root.dataset };
  app.jump('invalid'); app.tick();
  assert.deepEqual({ ...app.root.dataset }, before);
});
