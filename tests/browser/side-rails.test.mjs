import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const rails = '#m3ez-side-rails-v1';
const nav = `${rails} nav`;
const quote = 'Curiosity is a feature, not a bug.';
const screenshots = process.env.SIDE_RAIL_SCREENSHOT_DIR;
const read = path => readFileSync(resolve(root, path), 'utf8');
let browser;

// Load the real static export, styles and module graph without a network server.
// Only resource delivery is replaced; page markup and behavior stay unchanged.
function moduleURL(path, cache = new Map()) {
  const absolute = resolve(root, path);
  if (cache.has(absolute)) return cache.get(absolute);
  const source = readFileSync(absolute, 'utf8').replace(/(from\s+)(['"])(\.\.?\/[^'"]+)\2/g,
    (_, prefix, quote, relative) => `${prefix}${quote}${moduleURL(resolve(dirname(absolute), relative), cache)}${quote}`);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  cache.set(absolute, url);
  return url;
}

const html = read('index.html')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '');
const css = [
  read('_next/static/chunks/03~_g8i41_-g_-base.css'),
  read('assets/research-credentials.css'),
  read('assets/portfolio-theme.css').replace(/url\("\.\/(divider-scene|stickman-walk-cycle)\.svg(?:\?[^"\)]*)?"\)/g,
    (_, name) => `url("data:image/svg+xml;base64,${Buffer.from(read(`assets/${name}.svg`)).toString('base64')}")`),
].join('\n');

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
  if (screenshots) mkdirSync(screenshots, { recursive: true });
});
after(async () => { await browser?.close(); });

async function load({ width = 1721, height = 914, hash = '', javaScriptEnabled = true, ...options } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce', javaScriptEnabled, ...options });
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.setContent(html.replace('</head>', `<style>${css}</style></head>`));
  if (javaScriptEnabled) {
    await page.evaluate(({ data, hash }) => {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, options) => input === '/data/wordfence-cves.json'
        ? Promise.resolve(new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }))
        : nativeFetch(input, options);
      if (hash) location.hash = hash;
    }, { data: JSON.parse(read('data/wordfence-cves.json')), hash });
    await page.addScriptTag({ content: read('assets/portfolio-theme.js') });
    await page.addScriptTag({ type: 'module', content: `import '${moduleURL('assets/portfolio-redesign.js')}';` });
    await page.waitForFunction(() => document.documentElement.dataset.m3ezScrollMotion === 'ready');
    if (await page.locator('html').getAttribute('data-theme') === 'dark') await page.locator('#m3ez-theme-toggle-v1').click();
  }
  return { page, errors };
}

async function active(page, id) {
  await page.waitForFunction(({ nav, id }) => document.querySelector(`${nav} a[aria-current="location"]`)?.getAttribute('href') === `#${id}`, { nav, id });
  assert.equal(await page.locator(`${nav} [aria-current]`).count(), 1);
}

for (const width of [1440, 1721, 1920]) {
  test(`wide screens at ${width}px show the exact quote and usable rails outside the content`, async () => {
    const { page, errors } = await load({ width });
    try {
      assert.equal(await page.locator(rails).count(), 1, 'approved side rails must be mounted');
      assert.ok(await page.locator(rails).isVisible());
      assert.equal(await page.locator(`${rails} .side-rail-quote`).textContent(), quote);
      assert.equal(await page.locator(nav).getAttribute('aria-label'), 'Page sections');
      assert.deepEqual(await page.locator(`${nav} a`).evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), ['#top', '#research', '#credentials', '#consulting', '#contact']);
      await active(page, 'top');
      assert.equal(await page.locator(`${rails} .side-rail-current`).textContent(), '01 — INTRO');
      const main = await page.locator('#content').boundingBox();
      const left = await page.locator(`${rails} .side-rail-left`).boundingBox();
      const right = await page.locator(`${rails} .side-rail-right`).boundingBox();
      assert.ok(left.x + left.width < main.x);
      assert.ok(right.x > main.x + main.width);
      for (const link of await page.locator(`${nav} a`).all()) {
        const box = await link.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, 'small markers retain large hit targets');
        assert.ok(await link.getAttribute('aria-label'));
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('#top').evaluate(node => node.nextElementSibling.id), 'method');
      assert.deepEqual(errors, []);
      if (screenshots && width === 1721) await page.screenshot({ path: join(screenshots, 'side-rails-light.png'), animations: 'disabled' });
    } finally { await page.close(); }
  });
}

test('rails stay out of narrow and short viewports without changing mobile Explore more', async () => {
  const { page, errors } = await load();
  try {
    for (const [width, height] of [[320, 900], [390, 900], [760, 900], [1200, 900], [1439, 900], [1721, 600]]) {
      await page.setViewportSize({ width, height });
      assert.equal(await page.locator(rails).isVisible(), false, `${width} × ${height}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(await page.locator('#m3ez-theme-toggle-v1').isVisible());
    }
    await page.setViewportSize({ width: 390, height: 900 });
    assert.equal(await page.locator('#method').isVisible(), false);
    assert.equal(await page.locator('#m3ez-explore-more-v1').getAttribute('href'), '#method');
    if (screenshots) await page.screenshot({ path: join(screenshots, 'side-rails-mobile.png'), animations: 'disabled' });
    await page.locator('#m3ez-explore-more-v1').click();
    assert.ok(await page.locator('#method').isVisible());
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('keyboard rail navigation reveals collapsed sections using native hash links', async () => {
  const { page, errors } = await load();
  try {
    assert.equal(await page.locator('#research').isVisible(), false);
    const research = page.locator(`${nav} a[href="#research"]`);
    await research.focus();
    assert.equal(await research.evaluate(node => getComputedStyle(node).outlineStyle), 'solid');
    await page.keyboard.press('Enter');
    await active(page, 'research');
    assert.equal(new URL(page.url()).hash, '#research');
    assert.equal(await page.locator('html').getAttribute('data-portfolio-expanded'), 'true');
    assert.ok(await page.locator('#research').isVisible());
    assert.equal(await page.locator(`${rails} .side-rail-current`).textContent(), '02 — RESEARCH');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('native scrolling updates the current section, including the bottom and return to top', async () => {
  const { page, errors } = await load({ hash: '#research' });
  try {
    for (const [id, label] of [['credentials', '03 — CREDENTIALS'], ['consulting', '04 — CONSULTING'], ['contact', '05 — CONTACT'], ['top', '01 — INTRO']]) {
      await page.locator(`#${id}`).evaluate(node => node.scrollIntoView({ behavior: 'instant' }));
      await active(page, id);
      assert.equal(await page.locator(`${rails} .side-rail-current`).textContent(), label);
    }
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await active(page, 'contact');
    assert.equal(await page.locator(`${rails} .side-rail-progress`).evaluate(node => node.style.transform), 'scaleY(1)');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('deep links and resizing resynchronize the active marker', async () => {
  const { page, errors } = await load({ width: 390, hash: '#credentials' });
  try {
    assert.equal(await page.locator(rails).isVisible(), false);
    await page.setViewportSize({ width: 1721, height: 914 });
    await page.locator('#credentials').evaluate(node => node.scrollIntoView({ behavior: 'instant' }));
    await active(page, 'credentials');
    await page.evaluate(() => { location.hash = '#contact'; });
    await active(page, 'contact');
    await page.setViewportSize({ width: 1200, height: 914 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.setViewportSize({ width: 1721, height: 914 });
    await active(page, 'top');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('dark mode, reduced motion and print retain the existing controls and content', async () => {
  const { page, errors } = await load();
  try {
    const before = await page.locator('#content').boundingBox();
    await page.locator('#m3ez-theme-toggle-v1').click();
    assert.equal(await page.locator(`${rails} .side-rail-quote`).evaluate(node => getComputedStyle(node).color), 'rgb(166, 166, 166)');
    assert.deepEqual(await page.locator('#content').boundingBox(), before);
    assert.equal(await page.locator(`${rails} .side-rail-progress`).evaluate(node => getComputedStyle(node).transitionDuration), '0s');
    if (screenshots) await page.screenshot({ path: join(screenshots, 'side-rails-dark.png'), animations: 'disabled' });
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator(rails).isVisible(), false);
    assert.ok(await page.locator('#research').isVisible());
    assert.ok(await page.locator('#method').isVisible());
    await page.emulateMedia({ media: 'screen' });
    assert.ok(await page.locator(rails).isVisible());
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('reinitialization does not duplicate the rails, stylesheet or active link', async () => {
  const { page, errors } = await load();
  try {
    await page.evaluate(async url => {
      const { initializeSideRails } = await import(url);
      initializeSideRails(); initializeSideRails();
    }, moduleURL('assets/side-rails.js'));
    assert.equal(await page.locator(rails).count(), 1);
    assert.equal(await page.locator('#m3ez-side-rails-style-v1').count(), 1);
    await active(page, 'top');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('without JavaScript the original page remains available without decorative rails', async () => {
  const { page } = await load({ javaScriptEnabled: false });
  try {
    assert.equal(await page.locator(rails).count(), 0);
    assert.ok(await page.locator('#research').isVisible());
    assert.ok(await page.locator('#contact').isVisible());
  } finally { await page.close(); }
});
