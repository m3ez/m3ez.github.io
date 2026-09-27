import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
const xUrl = 'https://x.com/Supakiad_Mee';
const linkedinUrl = 'https://www.linkedin.com/in/supakiad-satuwan';
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
      const body = await readFile(path);
      response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' }).end(body);
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

for (const [width, javaScriptEnabled] of [[320, true], [390, true], [1440, true], [390, false]]) {
  test(`Contact includes X beside LinkedIn with usable layout at ${width}px (JavaScript ${javaScriptEnabled})`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', javaScriptEnabled });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${origin}/#contact`, { waitUntil: 'networkidle' });
      const actions = page.locator('#contact .contact-actions');
      const links = actions.locator('a');
      assert.equal(await links.count(), 2, 'Contact must retain LinkedIn and add X');
      assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), [linkedinUrl, xUrl]);
      const x = actions.getByRole('link', { name: /X \(Twitter\)/ });
      assert.equal(await x.textContent(), 'X (Twitter)');
      assert.equal(await x.getAttribute('target'), '_blank');
      const rel = (await x.getAttribute('rel')).split(/\s+/);
      assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
      await actions.scrollIntoViewIfNeeded();
      assert.ok(await x.isVisible());
      const boxes = await links.evaluateAll(nodes => nodes.map(node => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      }));
      for (const box of boxes) {
        assert.ok(box.width >= 44 && box.height >= 44, JSON.stringify(box));
        assert.ok(box.x >= 0 && box.x + box.width <= width, JSON.stringify(box));
      }
      if (width > 560) {
        assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 1);
        assert.ok(boxes[1].x - (boxes[0].x + boxes[0].width) >= 8);
      } else {
        assert.ok(boxes[1].y - (boxes[0].y + boxes[0].height) >= 8);
        assert.ok(Math.abs(boxes[0].width - boxes[1].width) < 1);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (javaScriptEnabled) {
        assert.equal(await page.locator('.credential-carousel-rotation').count(), 0);
        assert.equal(await page.locator('.research-dropdown-trigger').count(), 2);
      }
      if (process.env.UI_SCREENSHOTS) {
        await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: resolve(process.env.UI_SCREENSHOTS, `${width}-contact-js-${javaScriptEnabled}.png`) });
      }
      if (width === 1440) {
        // Intercept the destination: test navigation without contacting X.
        await context.route(xUrl, route => route.fulfill({ contentType: 'text/html', body: '<title>Contact destination</title>' }));
        const originalUrl = page.url();
        const popupPromise = context.waitForEvent('page');
        await x.click();
        const popup = await popupPromise;
        await popup.waitForLoadState('domcontentloaded');
        assert.equal(popup.url(), xUrl);
        assert.equal(await popup.evaluate(() => window.opener), null);
        assert.equal(page.url(), originalUrl);
        await popup.close();
      }
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}
