import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
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

async function pageAt(path = '/') {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(5000);
  await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.m3ezProgressiveDisclosure === 'ready');
  return page;
}

test('first load shows Hero, carousel and Method while lower content stays hidden', async () => {
  const page = await pageAt('/');
  try {
    assert.equal(await page.evaluate(() => document.documentElement.dataset.portfolioExpanded), 'false');
    assert.ok(await page.locator('#top').isVisible());
    assert.ok(await page.locator('#m3ez-credential-carousel-v1').isVisible());
    assert.ok(await page.locator('#method').isVisible());
    const explore = page.locator('#m3ez-explore-more-v1');
    assert.ok(await explore.isVisible());
    assert.equal(await explore.getAttribute('href'), '#research');
    assert.equal(await page.locator('#research').isVisible(), false);
    assert.equal(await page.locator('#credentials').isVisible(), false);
    assert.equal(await page.locator('#contact').isVisible(), false);
    assert.equal(await page.locator('.site-footer').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('View Research reveals the full portfolio without disturbing the hero carousel', async () => {
  const page = await pageAt('/');
  try {
    const before = await page.locator('#m3ez-credential-carousel-v1 .credential-carousel-card[data-position="current"]').getAttribute('data-index');
    await page.locator('#top .hero-actions a[href="#research"]').click();
    await page.waitForFunction(() => location.hash === '#research' && document.documentElement.dataset.portfolioExpanded === 'true');
    assert.ok(await page.locator('#research').isVisible());
    assert.ok(await page.locator('#credentials').isVisible());
    assert.ok(await page.locator('#contact').isVisible());
    assert.equal(await page.locator('#m3ez-explore-more-v1').isVisible(), false);
    assert.ok(await page.locator('#m3ez-credential-carousel-v1').isVisible());
    assert.equal(await page.locator('#m3ez-credential-carousel-v1 .credential-carousel-card[data-position="current"]').getAttribute('data-index'), before);
  } finally {
    await page.close();
  }
});

test('Contact reveals first, and direct lower-section hashes bypass the collapsed state', async () => {
  const page = await pageAt('/');
  try {
    await page.locator('#top .hero-actions a[href="#contact"]').click();
    await page.waitForFunction(() => location.hash === '#contact');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.portfolioExpanded), 'true');
    assert.ok(await page.locator('#contact').isVisible());
  } finally {
    await page.close();
  }

  const deep = await pageAt('/#credentials');
  try {
    assert.equal(await deep.evaluate(() => document.documentElement.dataset.portfolioExpanded), 'true');
    assert.ok(await deep.locator('#credentials').isVisible());
  } finally {
    await deep.close();
  }

  const method = await pageAt('/#method');
  try {
    assert.equal(await method.evaluate(() => document.documentElement.dataset.portfolioExpanded), 'false');
    assert.ok(await method.locator('#method').isVisible());
    assert.equal(await method.locator('#research').isVisible(), false);
  } finally {
    await method.close();
  }
});

test('Explore more reveals the full portfolio and lands on Research', async () => {
  const page = await pageAt('/');
  try {
    await page.locator('#m3ez-explore-more-v1').click();
    await page.waitForFunction(() => location.hash === '#research' && document.documentElement.dataset.portfolioExpanded === 'true');
    assert.ok(await page.locator('#research').isVisible());
    assert.equal(await page.locator('#m3ez-explore-more-v1').isVisible(), false);
  } finally {
    await page.close();
  }
});
