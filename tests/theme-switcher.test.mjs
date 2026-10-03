import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);

test('theme bootstrap runs before styles without waiting for the enhancement module', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const tag = '<script src="/assets/portfolio-theme.js?v=20261003-2"></script>';
  assert.ok(html.includes(tag), 'homepage must include the standalone theme bootstrap');
  assert.ok(html.indexOf(tag) < html.indexOf('<link rel="stylesheet"'), 'saved theme must apply before styles');
  assert.equal(html.split(tag).length - 1, 1);
  assert.equal(html.split('href="/assets/portfolio-theme.css?v=20261003-2"').length - 1, 1);
});

test('dark palette is the exact grayscale inverse of the existing light palette', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.ok(html.includes('/assets/portfolio-theme.css'), 'theme stylesheet must be wired into the page');
  const css = await readFile(new URL('assets/portfolio-theme.css', root), 'utf8');
  const dark = css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
  assert.ok(dark, 'explicit dark palette must exist');
  for (const [name, value] of Object.entries({ paper: '#000', black: '#fff', ink: '#eee', muted: '#a6a6a6', line: '#474747', soft: '#191919' })) {
    assert.match(dark, new RegExp(`--${name}:\\s*${value}\\s*;`));
  }
  assert.match(dark, /color-scheme:\s*dark/);
  assert.doesNotMatch(css, /filter\s*:\s*invert/);
});

test('theme toggle is icon-only without reducing its click target or keyboard focus', async () => {
  const css = await readFile(new URL('assets/portfolio-theme.css', root), 'utf8');
  const button = css.match(/#m3ez-theme-toggle-v1\s*\{([^}]+)\}/)?.[1];
  assert.ok(button, 'theme button rule must exist');
  assert.match(button, /border:\s*0\s*;/, 'theme button must have no border');
  assert.match(button, /background:\s*transparent\s*;/, 'theme button must have no filled background');
  assert.match(button, /box-shadow:\s*none\s*;/, 'theme button must have no shadow');
  assert.match(button, /color:\s*var\(--black\)\s*;/, 'icon must use black in light mode and white in dark mode');
  assert.match(button, /width:\s*44px\s*;/);
  assert.match(button, /height:\s*44px\s*;/);
  assert.match(button, /transition:\s*opacity\s+120ms\s+ease\s*;/);
  const hover = css.match(/#m3ez-theme-toggle-v1:hover\s*\{([^}]+)\}/)?.[1];
  assert.ok(hover, 'hover feedback must have its own rule');
  assert.match(hover, /opacity:\s*\.65\s*;/);
  assert.doesNotMatch(hover, /(?:background|border|box-shadow|color)\s*:/, 'hover must not restore a button box');
  const focus = css.match(/#m3ez-theme-toggle-v1:focus-visible\s*\{([^}]+)\}/)?.[1];
  assert.ok(focus, 'keyboard users must retain visible focus');
  assert.match(focus, /outline:\s*2px solid var\(--black\)\s*;/);
  assert.doesNotMatch(focus, /(?:background|border|box-shadow|color)\s*:/, 'keyboard focus must not fill the button');
});

test('export asset injector restores theme wiring once and remains idempotent', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-theme-'));
  const file = join(directory, 'index.html');
  try {
    await writeFile(file, '<!doctype html><html><head><link rel="stylesheet" href="/base.css"/></head><body><h1>Keep this page</h1></body></html>');
    const inject = () => execFileSync(process.execPath, [new URL('automation/inject-redesign-assets.mjs', root).pathname, file]);
    inject();
    const first = await readFile(file, 'utf8');
    assert.ok(first.includes('<script src="/assets/portfolio-theme.js?v=20261003-2"></script>'), 'injector must preserve the theme on future exports');
    assert.ok(first.indexOf('/assets/portfolio-theme.js') < first.indexOf('/base.css'));
    assert.equal(first.split('/assets/portfolio-theme.css').length - 1, 1);
    assert.ok(first.includes('<h1>Keep this page</h1>'));
    inject();
    assert.equal(await readFile(file, 'utf8'), first);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

// Execute the real bootstrap in a minimal DOM/storage boundary. These exercise
// behavior without a browser; the HTTP/browser suite separately covers the DOM.
async function bootTheme({ saved, readyState = 'complete', denyRead = false, denyWrite = false } = {}) {
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('assets/portfolio-theme.js', root), 'utf8');
  const elements = [];
  const documentEvents = new Map();
  const windowEvents = new Map();
  const values = new Map(saved === undefined ? [] : [['m3ez-theme', saved]]);
  const document = {
    documentElement: { dataset: {} }, readyState,
    getElementById(id) { return elements.find(node => node.id === id); },
    createElement(tag) {
      return { tagName: tag.toUpperCase(), attributes: {}, events: new Map(),
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, listener) { this.events.set(name, listener); } };
    },
    addEventListener(name, listener) { documentEvents.set(name, listener); },
    body: { appendChild(node) { elements.push(node); } },
  };
  const window = {
    addEventListener(name, listener) { windowEvents.set(name, listener); },
    get localStorage() {
      if (denyRead) throw new Error('SecurityError: storage denied');
      return {
        getItem(key) { return values.get(key) ?? null; },
        setItem(key, value) { if (denyWrite) throw new Error('QuotaExceededError'); values.set(key, value); },
      };
    },
  };
  runInNewContext(source, { document, window });
  return { document, elements, documentEvents, windowEvents, values };
}

for (const [saved, expected] of [[undefined, 'light'], ['light', 'light'], ['dark', 'dark'], ['invalid-value', 'light']]) {
  test(`theme bootstrap resolves stored ${String(saved)} to ${expected}`, async () => {
    const app = await bootTheme({ saved });
    assert.equal(app.document.documentElement.dataset.theme, expected);
    assert.equal(app.elements.length, 1);
    assert.equal(app.elements[0].attributes['aria-label'], expected === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    assert.equal(app.elements[0].type, 'button');
  });
}

test('real toggle handler updates theme, action label and saved preference both ways', async () => {
  const app = await bootTheme();
  const button = app.elements[0];
  button.events.get('click')();
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  assert.equal(app.values.get('m3ez-theme'), 'dark');
  assert.equal(button.attributes['aria-label'], 'Switch to light mode');
  button.events.get('click')();
  assert.equal(app.document.documentElement.dataset.theme, 'light');
  assert.equal(app.values.get('m3ez-theme'), 'light');
  assert.equal(button.attributes['aria-label'], 'Switch to dark mode');
});

test('saved palette is applied during head parsing before the DOM control mounts', async () => {
  const app = await bootTheme({ saved: 'dark', readyState: 'loading' });
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  assert.equal(app.elements.length, 0);
  app.documentEvents.get('DOMContentLoaded')();
  assert.equal(app.elements.length, 1);
  assert.equal(app.elements[0].attributes['aria-label'], 'Switch to light mode');
});

test('storage read denial still allows in-page theme switching', async () => {
  const app = await bootTheme({ denyRead: true });
  assert.equal(app.document.documentElement.dataset.theme, 'light');
  assert.doesNotThrow(() => app.elements[0].events.get('click')());
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
});

test('storage write denial does not revert or break the selected theme', async () => {
  const app = await bootTheme({ denyWrite: true });
  assert.doesNotThrow(() => app.elements[0].events.get('click')());
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  assert.equal(app.values.has('m3ez-theme'), false);
});

test('storage events update this tab only for the theme key or a clear event', async () => {
  const app = await bootTheme();
  const notify = app.windowEvents.get('storage');
  notify({ key: 'other-setting', newValue: 'dark' });
  assert.equal(app.document.documentElement.dataset.theme, 'light');
  notify({ key: 'm3ez-theme', newValue: 'dark' });
  assert.equal(app.document.documentElement.dataset.theme, 'dark');
  assert.equal(app.elements[0].attributes['aria-label'], 'Switch to light mode');
  notify({ key: null, newValue: null });
  assert.equal(app.document.documentElement.dataset.theme, 'light');
});
