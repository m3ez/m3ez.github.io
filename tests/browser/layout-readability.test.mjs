import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
const carousel = '#m3ez-credential-carousel-v1';
const currentCard = `${carousel} .credential-carousel-card[data-position="current"]`;
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
      response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path));
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
    if (options.reducedMotion === 'no-preference') await page.clock.install();
    await page.goto(origin, { waitUntil: 'networkidle' });
    if (options.javaScriptEnabled !== false) {
      await page.waitForFunction(() => document.querySelectorAll('.cve-row-v2').length === 10 && document.querySelector('.credential-grid-v2'));
    }
    await action(page);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

for (const width of [320, 390, 768, 1440]) {
  test(`modern CVE rows own their spacing and align with controls at ${width}px`, async () => {
    await withPage(width, async page => {
      const geometry = await page.evaluate(() => {
        const list = document.querySelector('.cve-row-list-v2');
        const row = list.querySelector('.cve-row-v2');
        const css = getComputedStyle(row);
        return {
          listPadding: parseFloat(getComputedStyle(list).paddingLeft),
          rowTop: parseFloat(css.paddingTop),
          rowBottom: parseFloat(css.paddingBottom),
          idLeft: row.querySelector('.cve-id-v2').getBoundingClientRect().left,
          headingLeft: document.querySelector('.research-index-heading').getBoundingClientRect().left,
          controlsLeft: document.querySelector('.research-controls').getBoundingClientRect().left,
          footerLeft: document.querySelector('.research-footer').getBoundingClientRect().left,
          contentWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
        };
      });
      assert.equal(geometry.listPadding, 0, JSON.stringify(geometry));
      assert.ok(geometry.rowTop >= 10 && geometry.rowBottom >= 10, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.idLeft - geometry.headingLeft) <= 1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.idLeft - geometry.controlsLeft) <= 1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.idLeft - geometry.footerLeft) <= 1, JSON.stringify(geometry));
      assert.ok(geometry.contentWidth <= geometry.viewport, JSON.stringify(geometry));
    });
  });
}

for (const width of [320, 390]) {
  test(`CVE text and Back to Top remain readable and touchable at ${width}px`, async () => {
    await withPage(width, async page => {
      const sizes = await page.evaluate(() => {
        const font = selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
        const button = document.querySelector('#m3ez-back-to-top-v1').getBoundingClientRect();
        return { description: font('.cve-summary-v2'), id: font('.cve-id-v2'), score: font('.cve-score-v2'), severity: font('.severity-chip'), width: button.width, height: button.height };
      });
      assert.ok(sizes.description >= 14, JSON.stringify(sizes));
      assert.ok(sizes.id >= 12 && sizes.score >= 12 && sizes.severity >= 12, JSON.stringify(sizes));
      assert.ok(sizes.width >= 44 && sizes.height >= 44, JSON.stringify(sizes));
    });
  });
}

for (const width of [390, 1440]) {
  test(`hero prioritizes Research and Contact without dropping profile links at ${width}px`, async () => {
    await withPage(width, async page => {
      const actions = page.locator('#top .hero-actions a');
      assert.equal(await actions.count(), 2);
      assert.deepEqual(await actions.allTextContents(), ['View Research', 'Contact']);
      assert.deepEqual(await actions.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), ['#research', '#contact']);
      assert.equal(await page.locator('#top .hero-profiles .proof-links a').count(), 7);
      assert.equal(await page.locator('#top .hero-profiles-label').textContent(), 'Profiles & verification');
      assert.equal(await page.locator('.credential-grid-item').count(), 13);
      assert.ok(await page.locator(carousel).isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (process.env.UI_SCREENSHOTS) {
        await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: resolve(process.env.UI_SCREENSHOTS, `${width}-hero.png`) });
        await page.locator('#research').scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(process.env.UI_SCREENSHOTS, `${width}-research.png`) });
      }
      await actions.first().click();
      await page.waitForFunction(() => location.hash === '#research');
      await actions.last().click();
      await page.waitForFunction(() => location.hash === '#contact');
    });
  });
}

test('pointer Pause survives focus, hover exit and manual slide selection until Play', async () => {
  await withPage(1200, async page => {
    const control = page.locator('.credential-carousel-rotation');
    assert.equal(await control.count(), 1);
    assert.equal(await control.textContent(), 'Pause');
    const first = await page.locator(currentCard).getAttribute('href');
    await control.click();
    assert.equal(await control.textContent(), 'Play');
    await page.mouse.move(0, 0);
    await page.clock.fastForward(15000);
    assert.equal(await page.locator(currentCard).getAttribute('href'), first);
    await page.getByRole('button', { name: 'Next credential', exact: true }).click();
    const manual = await page.locator(currentCard).getAttribute('href');
    assert.notEqual(manual, first);
    await page.mouse.move(0, 0);
    await page.clock.fastForward(15000);
    assert.equal(await page.locator(currentCard).getAttribute('href'), manual);
    await control.click();
    assert.equal(await control.textContent(), 'Pause');
    await page.mouse.move(0, 0);
    await page.clock.fastForward(5000);
    assert.notEqual(await page.locator(currentCard).getAttribute('href'), manual);
  }, { reducedMotion: 'no-preference' });
});

test('rotation control is first in tab order and keyboard focus requires explicit restart', async () => {
  await withPage(1200, async page => {
    const control = page.locator('.credential-carousel-rotation');
    assert.equal(await control.count(), 1);
    await page.locator('#top .proof-links a').last().focus();
    await page.keyboard.press('Tab');
    assert.equal(await control.evaluate(node => node === document.activeElement), true);
    assert.equal(await control.textContent(), 'Play');
    assert.match(await control.getAttribute('aria-label'), /^Play /);
    assert.equal(await control.getAttribute('aria-pressed'), null);
    const first = await page.locator(currentCard).getAttribute('href');
    await page.clock.fastForward(10000);
    assert.equal(await page.locator(currentCard).getAttribute('href'), first);
    await page.locator('.wordmark').focus();
    await page.clock.fastForward(10000);
    assert.equal(await page.locator(currentCard).getAttribute('href'), first);
    await control.focus();
    await page.keyboard.press('Space');
    await page.clock.fastForward(5000);
    assert.notEqual(await page.locator(currentCard).getAttribute('href'), first);
  }, { reducedMotion: 'no-preference' });
});

test('hover pauses temporarily without discarding enabled autoplay', async () => {
  await withPage(1200, async page => {
    assert.equal(await page.locator('.credential-carousel-rotation').count(), 1);
    await page.locator(carousel).hover();
    const first = await page.locator(currentCard).getAttribute('href');
    await page.clock.fastForward(10000);
    assert.equal(await page.locator(currentCard).getAttribute('href'), first);
    await page.mouse.move(0, 0);
    await page.clock.fastForward(5000);
    assert.notEqual(await page.locator(currentCard).getAttribute('href'), first);
  }, { reducedMotion: 'no-preference' });
});

test('reduced-motion changes stop autoplay without restarting it when the preference clears', async () => {
  await withPage(1200, async page => {
    const control = page.locator('.credential-carousel-rotation');
    assert.equal(await control.count(), 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.credential-carousel-rotation').disabled);
    const first = await page.locator(currentCard).getAttribute('href');
    await page.clock.fastForward(10000);
    assert.equal(await page.locator(currentCard).getAttribute('href'), first);
    // Desktop arrows appear on hover or focus; exercise the real pointer path.
    await page.locator(carousel).hover();
    await page.getByRole('button', { name: 'Next credential', exact: true }).click();
    const manual = await page.locator(currentCard).getAttribute('href');
    assert.notEqual(manual, first);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('.credential-carousel-rotation').disabled);
    assert.equal(await control.textContent(), 'Play');
    await page.mouse.move(0, 0);
    await page.clock.fastForward(10000);
    assert.equal(await page.locator(currentCard).getAttribute('href'), manual);
    await control.click();
    await page.mouse.move(0, 0);
    await page.clock.fastForward(5000);
    assert.notEqual(await page.locator(currentCard).getAttribute('href'), manual);
  }, { reducedMotion: 'no-preference' });
});

test('legacy research remains readable when JavaScript is unavailable', async () => {
  await withPage(390, async page => {
    const list = page.locator('section[aria-labelledby="wordpress-cves-title"] ul').first();
    assert.ok(await list.isVisible());
    assert.ok(await list.locator('li').count() > 0);
    assert.ok(await list.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft) > 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }, { javaScriptEnabled: false });
});
