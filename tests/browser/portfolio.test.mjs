import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
let browser;
let server;
let origin;

before(async () => {
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const content = await readFile(path);
      response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' }).end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
});

async function ready(page) {
  await page.waitForFunction(() =>
    document.querySelectorAll('.credential-grid-item').length === 13 &&
    document.querySelectorAll('.cve-row-v2').length === 10 &&
    document.querySelector('#m3ez-credential-carousel-v1') &&
    document.querySelector('.mobile-nav-toggle'), null, { timeout: 8000 });
}

test('cold loads preserve the redesigned content without hydration errors', async () => {
  for (const width of [1440, 375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(origin, { waitUntil: 'networkidle' });
      await ready(page);
      assert.deepEqual(errors, []);
      assert.equal(await page.locator('#top .proof-links a').count(), 6);
      assert.equal(await page.locator('.credential-grid-item').count(), 13);
    } finally {
      await page.close();
    }
  }
});

test('enhanced layout fits phones and keeps year filters scrollable', async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await ready(page);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      assert.ok(dimensions.content <= dimensions.viewport, JSON.stringify(dimensions));
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.getByRole('group', { name: 'Filter recognition by year' })
      .getByRole('button', { name: '2020', exact: true }).click();
    assert.deepEqual(await page.locator('[data-recognition-year]').evaluateAll(nodes =>
      [...new Set(nodes.map(node => node.dataset.recognitionYear))]), ['2020']);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  } finally {
    await page.close();
  }
});

test('CVE controls, carousel, mobile navigation and back-to-top remain usable', async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce' });
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await ready(page);
    await page.getByRole('button', { name: 'Show more CVEs', exact: true }).click();
    assert.equal(await page.locator('.cve-row-v2').count(), 20);
    await page.getByRole('button', { name: 'Show less', exact: true }).click();
    assert.equal(await page.locator('.cve-row-v2').count(), 10);
    await page.getByRole('group', { name: 'Filter CVEs by severity' })
      .getByRole('button', { name: 'Critical', exact: true }).click();
    const severities = await page.locator('.cve-row-v2 .severity-chip').allTextContents();
    assert.ok(severities.length > 0 && severities.every(value => value === 'CRITICAL'));
    const current = page.locator('.credential-carousel-card[data-position="current"]');
    const first = await current.getAttribute('href');
    await page.getByRole('button', { name: 'Next credential', exact: true }).click();
    assert.notEqual(await current.getAttribute('href'), first);
    await page.getByRole('button', { name: 'Previous credential', exact: true }).click();
    assert.equal(await current.getAttribute('href'), first);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.locator('#mobile-primary-navigation').getByRole('link', { name: 'Contact', exact: true }).click();
    await page.waitForFunction(() => location.hash === '#contact' && scrollY > 200);
    assert.equal(await page.locator('.mobile-nav-toggle').getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Back to top', exact: true }).click();
    await page.waitForFunction(() => scrollY === 0);
  } finally {
    await page.close();
  }
});

test('a failed CVE refresh preserves the exported research and other interactions', async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  try {
    await page.route('**/data/wordfence-cves.json', route => route.fulfill({ status: 503, body: '' }));
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.locator('.credential-grid-v2').waitFor();
    const fallback = page.locator('section[aria-labelledby="wordpress-cves-title"]');
    assert.ok(await fallback.isVisible());
    assert.ok(await fallback.locator('a').count() > 0);
    assert.equal(await page.locator('.research-index-v2').count(), 0);
    assert.equal(await page.locator('.credential-grid-item').count(), 13);
    assert.ok(await page.locator('#m3ez-credential-carousel-v1').isVisible());
  } finally {
    await page.close();
  }
});
