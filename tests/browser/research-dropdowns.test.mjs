import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { deriveClassOptions, filterAndSort, normalizeWordfenceDocument } from '../../assets/research-data.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
const data = normalizeWordfenceDocument(JSON.parse(await readFile(resolve(root, 'data/wordfence-cves.json'), 'utf8')));
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
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
});

async function withPage(width, action, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce', ...options });
  page.setDefaultTimeout(4000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('.cve-row-v2').length === 10);
    const controls = page.locator('.research-controls');
    assert.equal(await controls.getByRole('button', { name: 'Type: All', exact: true }).count(), 1);
    assert.equal(await controls.getByRole('button', { name: 'Sort: CVSS', exact: true }).count(), 1);
    await controls.scrollIntoViewIfNeeded();
    await action(page, controls);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function choose(page, label, value) {
  await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
  await page.getByRole('menuitemradio', { name: value, exact: true }).click();
  assert.equal(await page.getByRole('menu').count(), 0);
  assert.ok(await page.getByRole('button', { name: `${label}: ${value}`, exact: true }).isVisible());
}

async function assertRows(page, state, limit = 10) {
  const matched = filterAndSort([...data.items], state);
  assert.deepEqual(await page.locator('.cve-id-v2').allTextContents(), matched.slice(0, limit).map(item => item.id));
  assert.equal(await page.locator('.research-result-meta').textContent(), `Showing ${Math.min(limit, matched.length)} of ${matched.length}`);
}

for (const width of [320, 390, 768, 1440]) {
  test(`compact research controls keep severity visible and overlay options at ${width}px`, async () => {
    await withPage(width, async (page, controls) => {
      assert.deepEqual(await controls.getByRole('group', { name: 'Filter CVEs by severity' }).getByRole('button').allTextContents(), ['All', 'Critical', 'High', 'Medium']);
      assert.equal(await page.getByRole('menu').count(), 0);
      const trigger = controls.getByRole('button', { name: 'Type: All', exact: true });
      const sort = controls.getByRole('button', { name: 'Sort: CVSS', exact: true });
      assert.equal(await trigger.getAttribute('aria-haspopup'), 'menu');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      const before = await page.locator('.cve-row-list-v2').boundingBox();
      const controlBox = await controls.boundingBox();
      assert.ok(controlBox.height <= (width <= 760 ? 105 : 48), JSON.stringify(controlBox));
      if (width <= 760) {
        for (const button of [trigger, sort]) assert.ok((await button.boundingBox()).height >= 44);
      }
      if (process.env.UI_SCREENSHOTS) {
        await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: resolve(process.env.UI_SCREENSHOTS, `${width}-filters-closed.png`) });
      }
      await trigger.click();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.getByRole('menu').count(), 1);
      const menu = page.getByRole('menu', { name: 'Filter CVEs by vulnerability class', exact: true });
      assert.equal(await menu.getAttribute('id'), await trigger.getAttribute('aria-controls'));
      assert.deepEqual(await menu.getByRole('menuitemradio').allTextContents(), ['All', ...deriveClassOptions(data.items)]);
      const after = await page.locator('.cve-row-list-v2').boundingBox();
      assert.ok(Math.abs(before.y - after.y) <= 1, `opening the menu moved the CVE list: ${before.y} -> ${after.y}`);
      const box = await menu.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 900, JSON.stringify(box));
      if (width <= 760) assert.ok((await menu.getByRole('menuitemradio').first().boundingBox()).height >= 44);
      // The last category must be reachable inside the scrolling overlay.
      await menu.getByRole('menuitemradio', { name: 'Other', exact: true }).click();
      assert.equal(await page.getByRole('menu').count(), 0);
      await choose(page, 'Type', 'Privilege escalation');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await choose(page, 'Type', 'All');
      await sort.click();
      await page.getByRole('menuitemradio', { name: 'Date', exact: true }).click();
      assert.equal(await sort.textContent().then(text => text.replace('▾', '').trim()), 'Sort: Date');
    });
  });
}

test('selecting Type and Sort preserves combined filtering and resets pagination', async () => {
  await withPage(1440, async page => {
    await page.getByRole('button', { name: 'Show more CVEs', exact: true }).click();
    assert.equal(await page.locator('.cve-row-v2').count(), 20);
    await choose(page, 'Type', 'SQLi');
    await assertRows(page, { severity: 'All', vulnerabilityClass: 'SQLi', sort: 'cvss' });
    await page.getByRole('group', { name: 'Filter CVEs by severity' }).getByRole('button', { name: 'High', exact: true }).click();
    await choose(page, 'Sort', 'Date');
    await assertRows(page, { severity: 'High', vulnerabilityClass: 'SQLi', sort: 'date' });
    await page.getByRole('button', { name: 'Type: SQLi', exact: true }).click();
    assert.equal(await page.getByRole('menuitemradio', { name: 'SQLi', exact: true }).getAttribute('aria-checked'), 'true');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Sort: Date', exact: true }).click();
    assert.equal(await page.getByRole('menuitemradio', { name: 'Date', exact: true }).getAttribute('aria-checked'), 'true');
    await page.keyboard.press('Escape');
    await choose(page, 'Type', 'All');
    await page.getByRole('group', { name: 'Filter CVEs by severity' }).getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: 'Show more CVEs', exact: true }).click();
    assert.equal(await page.locator('.cve-row-v2').count(), 20);
    await choose(page, 'Sort', 'CVSS');
    await assertRows(page, { severity: 'All', vulnerabilityClass: 'All', sort: 'cvss' });
    assert.equal(await page.getByRole('button', { name: 'Show less', exact: true }).isVisible(), false);
  });
});

test('opening another menu or clicking outside dismisses options without changing selections', async () => {
  await withPage(1440, async page => {
    const type = page.getByRole('button', { name: 'Type: All', exact: true });
    const sort = page.getByRole('button', { name: 'Sort: CVSS', exact: true });
    await type.click();
    await sort.click();
    assert.equal(await type.getAttribute('aria-expanded'), 'false');
    assert.equal(await sort.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.getByRole('menu').count(), 1);
    await sort.click();
    assert.equal(await page.getByRole('menu').count(), 0);
    await type.click();
    await page.locator('.research-index-heading').click();
    assert.equal(await page.getByRole('menu').count(), 0);
    await assertRows(page, { severity: 'All', vulnerabilityClass: 'All', sort: 'cvss' });
  });
});

test('keyboard menus support arrows, Home/End, type-ahead, selection and Escape focus return', async () => {
  await withPage(1440, async page => {
    const type = page.getByRole('button', { name: 'Type: All', exact: true });
    await type.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'All');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Other');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'All');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Other');
    await page.keyboard.press('Home');
    await page.keyboard.press('s');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'SQLi');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('menu').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-expanded')), 'false');
    await assertRows(page, { severity: 'All', vulnerabilityClass: 'SQLi', sort: 'cvss' });
    const sort = page.getByRole('button', { name: 'Sort: CVSS', exact: true });
    await sort.focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Date');
    await page.keyboard.press('Space');
    assert.ok(await page.getByRole('button', { name: 'Sort: Date', exact: true }).isVisible());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('menu').count(), 0);
    assert.equal(await sort.evaluate(node => node === document.activeElement), true);
  });
});

test('Tab exits an open menu without trapping focus or exposing hidden options', async () => {
  await withPage(1440, async page => {
    const type = page.getByRole('button', { name: 'Type: All', exact: true });
    const sort = page.getByRole('button', { name: 'Sort: CVSS', exact: true });
    await type.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('menu').count(), 0);
    assert.equal(await sort.evaluate(node => node === document.activeElement), true);
    await sort.press('Space');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.getByRole('menu').count(), 0);
    assert.equal(await type.evaluate(node => node === document.activeElement), true);
    await type.click();
    await page.locator('.wordmark').focus();
    assert.equal(await page.getByRole('menu').count(), 0);
  });
});

test('touch users can select and dismiss dropdown options', async () => {
  await withPage(390, async page => {
    const type = page.getByRole('button', { name: 'Type: All', exact: true });
    await type.tap();
    await page.getByRole('menuitemradio', { name: 'SQLi', exact: true }).tap();
    assert.equal(await page.getByRole('menu').count(), 0);
    assert.ok(await page.getByRole('button', { name: 'Type: SQLi', exact: true }).isVisible());
    await page.getByRole('button', { name: 'Sort: CVSS', exact: true }).tap();
    await page.getByRole('menuitemradio', { name: 'Date', exact: true }).tap();
    await assertRows(page, { severity: 'All', vulnerabilityClass: 'SQLi', sort: 'date' });
    await page.getByRole('button', { name: 'Type: SQLi', exact: true }).tap();
    await page.locator('.research-index-heading').tap();
    assert.equal(await page.getByRole('menu').count(), 0);
  }, { hasTouch: true, isMobile: true });
});

test('options stay open while reading and fit a short viewport without moving results', async () => {
  await withPage(390, async page => {
    await page.setViewportSize({ width: 390, height: 400 });
    await page.locator('.research-controls').scrollIntoViewIfNeeded();
    await page.clock.install();
    await page.getByRole('button', { name: 'Type: All', exact: true }).click();
    await page.mouse.move(0, 0);
    await page.clock.fastForward(15000);
    const menu = page.getByRole('menu');
    assert.equal(await menu.count(), 1);
    const box = await menu.boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 400, JSON.stringify(box));
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('menu').count(), 0);
  });
});
