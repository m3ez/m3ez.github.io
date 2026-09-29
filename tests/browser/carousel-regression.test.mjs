import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { certs, issuerMonogram } from '../../assets/certs.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
const active = '.credential-carousel-card[data-position="current"]';
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
  await mkdir(resolve(root, 'test-results'), { recursive: true });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
});

async function ready(page) {
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(count => document.querySelectorAll('.credential-carousel-card').length === count, certs.length);
}

async function select(page, name) {
  const index = certs.findIndex(cert => cert.name === name);
  assert.ok(index >= 0);
  await page.locator('.credential-carousel-dot').nth(index).click();
}

for (const width of [320, 375, 640, 768, 881, 1024, 1280, 1440]) {
  test(`all credential content has one visible source and fits at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    try {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await ready(page);
      await select(page, 'Certified Ethical Hacker (Practical)');
      await page.locator('#m3ez-credential-carousel-v1').screenshot({ path: resolve(root, `test-results/ceh-${width}.png`) });
      for (const cert of certs) {
        await select(page, cert.name);
        const card = page.locator(active);
        const result = await card.evaluate(node => {
          const rect = element => {
            if (!element) return null;
            const r = element.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          };
          const category = node.querySelector('.credential-carousel-kicker');
          const title = node.querySelector('.credential-carousel-title');
          const company = node.querySelector('.credential-carousel-company');
          const description = node.querySelector('.credential-carousel-description');
          const issuer = node.querySelector('.credential-carousel-issuer');
          const year = node.querySelector('.credential-carousel-issued');
          const verify = node.querySelector('.credential-carousel-verify');
          return {
            before: getComputedStyle(node, '::before').content,
            after: getComputedStyle(title, '::after').content,
            category: category.textContent,
            categorySize: parseFloat(getComputedStyle(category).fontSize),
            company: company?.textContent,
            companyCount: node.querySelectorAll('.credential-carousel-company').length,
            title: title.textContent,
            description: description?.textContent,
            box: rect(node),
            parts: [category, company, title, description, issuer, year, verify].map(rect),
            header: rect(node.querySelector('.credential-carousel-head')),
            issuer: rect(issuer),
            year: rect(year),
            companyBox: rect(company),
            scrollWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
          };
        });
        const detail = `${cert.name} at ${width}px: ${JSON.stringify(result)}`;
        assert.ok(['none', 'normal'].includes(result.before), `legacy pseudo badge remains: ${detail}`);
        assert.ok(['none', 'normal'].includes(result.after), `legacy pseudo description remains: ${detail}`);
        assert.equal(result.category, cert.category, detail);
        assert.ok(result.categorySize >= 9, `category is hidden: ${detail}`);
        assert.equal(result.company, issuerMonogram(cert.issuer), detail);
        assert.equal(result.companyCount, 1, detail);
        assert.equal(result.title, cert.name, detail);
        assert.equal(result.description, cert.description, detail);
        assert.ok(Math.abs(result.companyBox.right - result.header.right) <= 2, `issuer chip is not right aligned: ${detail}`);
        assert.ok(Math.abs(result.year.y - result.issuer.y) <= 2, `issuer/year split vertically: ${detail}`);
        assert.ok(result.year.x - result.issuer.right >= 0 && result.year.x - result.issuer.right <= 18, `issuer/year split across the card: ${detail}`);
        assert.ok(result.scrollWidth <= result.viewport, detail);
        for (const part of result.parts) {
          assert.ok(part && part.width > 0 && part.height > 0, `missing visible content: ${detail}`);
          assert.ok(part.x >= result.box.x && part.right <= result.box.right + 1 && part.y >= result.box.y && part.bottom <= result.box.bottom + 1, `content outside card: ${detail}`);
        }
        assert.deepEqual(errors, []);
      }
    } finally {
      await page.close();
    }
  });
}

for (const input of ['mouse', 'keyboard', 'touch']) {
  test(`Verified opens the unmodified issuer URL with ${input}`, async () => {
    const context = await browser.newContext({ viewport: { width: input === 'touch' ? 375 : 1280, height: 1000 }, hasTouch: input === 'touch', reducedMotion: 'reduce' });
    try {
      // Fulfill only the destination response; preserve the real href and native navigation.
      await context.route('https://**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Issuer verification destination</title>' }));
      const page = await context.newPage();
      await ready(page);
      for (const name of ['Certified Ethical Hacker (Practical)', 'PenTest+', 'OSEP']) {
        const cert = certs.find(item => item.name === name);
        await select(page, name);
        const verify = page.locator(`${active} .credential-carousel-verify`);
        assert.equal(await verify.getAttribute('href'), cert.verificationUrl);
        assert.equal(await verify.getAttribute('target'), '_blank');
        const opened = page.waitForEvent('popup', { timeout: 5000 });
        if (input === 'touch') await verify.tap();
        else if (input === 'keyboard') { await verify.focus(); await page.keyboard.press('Enter'); }
        else await verify.click();
        const popup = await opened;
        await popup.waitForLoadState('domcontentloaded');
        assert.equal(popup.url(), cert.verificationUrl);
        await popup.close();
        assert.equal(await page.locator(`${active} .credential-carousel-title`).textContent(), name);
      }
    } finally {
      await context.close();
    }
  });
}

test('clicking a visible side card selects it rather than capturing the click on the stage', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    await ready(page);
    await select(page, 'Certified Ethical Hacker (Practical)');
    const side = page.locator('.credential-carousel-card[data-position="next"]');
    const expected = await side.locator('.credential-carousel-title').textContent();
    const card = await page.locator(active).boundingBox();
    const stage = await page.locator('.credential-carousel-stage').boundingBox();
    const sideBox = await side.boundingBox();
    const x = Math.min(stage.x + stage.width - 5, (card.x + card.width + Math.min(stage.x + stage.width, sideBox.x + sideBox.width)) / 2);
    const y = sideBox.y + sideBox.height / 2;
    assert.ok(await side.evaluate((node, point) => node.contains(document.elementFromPoint(point.x, point.y)), { x, y }));
    await page.mouse.click(x, y);
    assert.equal(await page.locator(`${active} .credential-carousel-title`).textContent(), expected);
  } finally {
    await page.close();
  }
});

test('drag navigation does not open a credential or swallow the next Verified click', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  try {
    await context.route('https://**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Issuer</title>' }));
    const page = await context.newPage();
    await ready(page);
    await select(page, 'Certified Ethical Hacker (Practical)');
    let popups = 0;
    page.on('popup', () => { popups++; });
    const box = await page.locator(`${active} .credential-carousel-title`).boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 85, y, { steps: 10 });
    await page.mouse.up();
    assert.equal(await page.locator(`${active} .credential-carousel-title`).textContent(), 'PenTest+');
    assert.equal(popups, 0);
    const opened = page.waitForEvent('popup', { timeout: 5000 });
    await page.locator(`${active} .credential-carousel-verify`).click();
    const popup = await opened;
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(), certs.find(cert => cert.name === 'PenTest+').verificationUrl);
    await popup.close();
  } finally {
    await context.close();
  }
});
