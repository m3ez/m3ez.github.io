import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep, join } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const screenshotDir = process.env.THEME_SCREENSHOT_DIR;
const toggle = '#m3ez-theme-toggle-v1';
let browser, server, origin;

before(async () => {
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) return response.writeHead(403).end();
    try {
      response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
});
after(async () => { await browser?.close(); if (server) await new Promise(done => server.close(done)); });

async function load(page) {
  await page.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(await page.locator(toggle).count(), 1, 'exactly one floating theme button must be present');
}
async function colors(page) {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const root = getComputedStyle(document.documentElement);
    return { background: body.backgroundColor, color: body.color, scheme: root.colorScheme, tokens: Object.fromEntries(['paper', 'black', 'ink', 'muted', 'line', 'soft'].map(key => [key, root.getPropertyValue(`--${key}`).trim()])) };
  });
}
async function screenshot(page, name) {
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, name), animations: 'disabled' });
}

for (const width of [320, 390, 768, 1440]) {
  test(`theme toggle mirrors back-to-top, swaps the palette and preserves layout at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await load(page);
      const button = page.locator(toggle);
      assert.equal(await button.getAttribute('aria-label'), 'Switch to dark mode');
      assert.ok(await button.locator('.theme-icon-moon').isVisible());
      assert.equal(await button.locator('.theme-icon-sun').isVisible(), false);
      assert.equal((await colors(page)).background, 'rgb(255, 255, 255)', 'light is the default even on a dark OS');
      const before = await button.boundingBox();
      assert.equal(before.width, 44); assert.equal(before.height, 44);
      assert.equal(before.x, width <= 640 ? 12 : 16);
      assert.equal(900 - before.y - before.height, width <= 640 ? 12 : 16);
      await screenshot(page, `${width}-light.png`);
      await button.click();
      assert.equal(await button.getAttribute('aria-label'), 'Switch to light mode');
      assert.ok(await button.locator('.theme-icon-sun').isVisible());
      assert.equal(await button.locator('.theme-icon-moon').isVisible(), false);
      assert.deepEqual(await colors(page), { background: 'rgb(0, 0, 0)', color: 'rgb(238, 238, 238)', scheme: 'dark', tokens: { paper: '#000', black: '#fff', ink: '#eee', muted: '#a6a6a6', line: '#474747', soft: '#191919' } });
      const action = await page.locator('.hero-actions .primary-action').first().evaluate(node => ({ background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color }));
      assert.deepEqual(action, { background: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' });
      assert.equal(await page.locator('.credential-grid-item').count(), 14);
      assert.equal(await page.locator('.credential-carousel-card').count(), 14);
      assert.equal(await page.locator('.trust-statement').textContent(), 'I find broken trust boundaries.');
      assert.equal(await page.locator('.hero-copy').textContent(), 'Independent security researcher and authorized assessments.');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).filter), 'none');
      await button.blur();
      await page.mouse.move(0, 0);
      await screenshot(page, `${width}-dark.png`);
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
      await page.locator('#m3ez-back-to-top-v1.is-visible').waitFor();
      const after = await button.boundingBox();
      const back = await page.locator('#m3ez-back-to-top-v1').boundingBox();
      assert.deepEqual(after, before, 'theme button stays pinned while scrolling');
      assert.equal(after.y, back.y); assert.equal(after.width, back.width); assert.equal(after.height, back.height);
      assert.equal(after.x, width - back.x - back.width, 'opposite corners have matching offsets');
      await page.locator('#credentials').scrollIntoViewIfNeeded();
      await screenshot(page, `${width}-dark-credentials.png`);
      await page.locator('#m3ez-back-to-top-v1').click();
      await page.waitForFunction(() => scrollY === 0);
      await button.click();
      assert.equal((await colors(page)).background, 'rgb(255, 255, 255)');
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('theme choice persists across reloads, including an explicit return to light', async () => {
  const page = await browser.newPage();
  try {
    await load(page); await page.locator(toggle).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('m3ez-theme')), 'dark');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal((await colors(page)).background, 'rgb(0, 0, 0)');
    assert.equal(await page.locator(toggle).getAttribute('aria-label'), 'Switch to light mode');
    await page.locator(toggle).click(); await page.reload({ waitUntil: 'networkidle' });
    assert.equal((await colors(page)).background, 'rgb(255, 255, 255)');
    assert.equal(await page.evaluate(() => localStorage.getItem('m3ez-theme')), 'light');
  } finally { await page.close(); }
});

test('keyboard Enter and Space toggle the theme and retain visible focus', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  try {
    await load(page); const button = page.locator(toggle); await button.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await button.evaluate(node => node === document.activeElement), true);
    assert.ok(await button.evaluate(node => getComputedStyle(node).outlineStyle !== 'none'));
    await page.keyboard.press('Space');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await button.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  } finally { await page.close(); }
});

for (const fault of ['read', 'write', 'invalid']) {
  test(`theme remains usable when saved preference has a ${fault} failure`, async () => {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.addInitScript(kind => {
        if (kind === 'read') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
        if (kind === 'write') Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
        if (kind === 'invalid') localStorage.setItem('m3ez-theme', 'invalid-value');
      }, fault);
      await load(page);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.locator(toggle).click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('saved dark theme works independently when the main enhancement module cannot load', async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => localStorage.setItem('m3ez-theme', 'dark'));
    await page.route('**/assets/portfolio-redesign.js', route => route.abort());
    await load(page);
    assert.equal((await colors(page)).background, 'rgb(0, 0, 0)');
    await page.locator(toggle).click();
    assert.equal((await colors(page)).background, 'rgb(255, 255, 255)');
  } finally { await page.close(); }
});

test('theme preference synchronizes between tabs and resets to light when storage is cleared', async () => {
  const context = await browser.newContext();
  try {
    const first = await context.newPage(), second = await context.newPage();
    await load(first); await load(second);
    await first.locator(toggle).click();
    await second.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await second.locator(toggle).getAttribute('aria-label'), 'Switch to light mode');
    await first.evaluate(() => localStorage.clear());
    await second.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  } finally { await context.close(); }
});

test('CEH verification still opens its exact external URL in a new tab in dark mode', async () => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    const page = await context.newPage(); await load(page); await page.locator(toggle).click();
    await page.getByRole('button', { name: 'Show Certified Ethical Hacker (Practical) credential', exact: true }).click();
    const verify = page.locator('.credential-carousel-card[data-position="current"] .credential-carousel-verify');
    const href = await verify.getAttribute('href');
    assert.ok(href.startsWith('https://aspen.eccouncil.org/VerifyBadge?'));
    assert.equal(await verify.getAttribute('target'), '_blank');
    assert.match(await verify.getAttribute('rel'), /noopener/);
    await context.route('https://aspen.eccouncil.org/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Verification destination test</h1>' }));
    const pending = page.waitForEvent('popup'); await verify.click(); const popup = await pending;
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(), href);
    assert.equal(await popup.evaluate(() => window.opener === null), true);
  } finally { await context.close(); }
});

test('no-JavaScript fallback keeps the original light page without a dead theme button', async () => {
  const page = await browser.newPage({ javaScriptEnabled: false, colorScheme: 'dark', viewport: { width: 390, height: 900 } });
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(await page.locator(toggle).count(), 0);
    assert.equal((await colors(page)).background, 'rgb(255, 255, 255)');
    assert.ok(await page.locator('#hero-title').isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally { await page.close(); }
});
