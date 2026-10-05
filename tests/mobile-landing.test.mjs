import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');

// Execute the production head bootstrap before any DOM enhancement is mounted.
function boot({ mobile = false, hash = '', withMedia = true } = {}) {
  const listeners = new Map();
  const mediaListeners = new Map();
  const root = { dataset: {} };
  const media = { matches: mobile, addEventListener: (type, fn) => mediaListeners.set(type, fn) };
  class Element {
    constructor(tagName = 'BODY', editable = false) {
      this.tagName = tagName;
      this.isContentEditable = editable;
    }
  }
  const document = {
    documentElement: root, readyState: 'loading',
    addEventListener() {}, getElementById() { return null; },
  };
  const window = {
    location: { hash }, addEventListener: (type, fn) => listeners.set(type, fn),
    localStorage: { getItem() { return null; } },
  };
  if (withMedia) window.matchMedia = () => media;
  runInNewContext(source, { window, document, HTMLElement: Element });
  return {
    root,
    resize(matches) { media.matches = matches; mediaListeners.get('change')?.({ matches }); },
    key(overrides = {}) {
      listeners.get('keydown')({ key: 'r', target: new Element(), ...overrides });
    },
    element: (tag, editable) => new Element(tag, editable),
  };
}

test('mobile head bootstrap enables the walker and collapses the landing page', () => {
  const app = boot({ mobile: true });
  assert.equal(app.root.dataset.dividerWalker, 'active');
  assert.equal(app.root.dataset.portfolioExpanded, 'false');
});

test('desktop walker is enabled by default', () => {
  assert.equal(boot().root.dataset.dividerWalker, 'active');
});

test('mobile Method deep links are expanded before styles paint', () => {
  for (const hash of ['#method', '#method-scope', '#%6dethod']) {
    assert.equal(boot({ mobile: true, hash }).root.dataset.portfolioExpanded, 'true', hash);
  }
});

test('desktop Method links keep the existing collapsed lower portfolio', () => {
  for (const hash of ['#method', '#method-scope']) {
    assert.equal(boot({ hash }).root.dataset.portfolioExpanded, 'false', hash);
  }
});

test('walker stays enabled across breakpoints until a manual override', () => {
  const app = boot();
  app.resize(true);
  assert.equal(app.root.dataset.dividerWalker, 'active');
  app.resize(false);
  assert.equal(app.root.dataset.dividerWalker, 'active');
});

test('R/r overrides survive orientation changes in both directions', () => {
  const app = boot({ mobile: true });
  app.key();
  assert.equal(app.root.dataset.dividerWalker, 'inactive');
  app.resize(false); app.resize(true);
  assert.equal(app.root.dataset.dividerWalker, 'inactive');
  app.key({ key: 'R' });
  assert.equal(app.root.dataset.dividerWalker, 'active');
  app.resize(false);
  assert.equal(app.root.dataset.dividerWalker, 'active');
});

test('typing, shortcuts, repeat and unrelated keys do not claim a walker override', () => {
  for (const event of [
    { key: 'x' }, { repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true },
    { tag: 'INPUT' }, { tag: 'TEXTAREA' }, { tag: 'SELECT' }, { tag: 'DIV', editable: true },
  ]) {
    const app = boot({ mobile: true });
    app.key(event.tag ? { target: app.element(event.tag, event.editable) } : event);
    assert.equal(app.root.dataset.dividerWalker, 'active');
    app.resize(false);
    assert.equal(app.root.dataset.dividerWalker, 'active', 'ignored keys must leave the pair enabled');
    app.key();
    assert.equal(app.root.dataset.dividerWalker, 'inactive', 'plain R still toggles both figures');
  }
});

test('missing matchMedia and malformed hashes keep bootstrap usable', () => {
  const app = boot({ withMedia: false, hash: '#%not-valid' });
  assert.equal(app.root.dataset.dividerWalker, 'active');
  assert.ok(['light', 'dark'].includes(app.root.dataset.theme));
  app.key();
  assert.equal(app.root.dataset.dividerWalker, 'inactive');
});
