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
      assert.equal(await page.locator('#top .proof-links a').count(), 7);
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


test('ultra-smooth motion keeps sections static and reveals only small elements', async () => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await ready(page);

    const contact = page.locator('#contact');
    const sectionStyle = await contact.evaluate(node => ({
      opacity: getComputedStyle(node).opacity,
      transform: getComputedStyle(node).transform,
      transitionDuration: getComputedStyle(node).transitionDuration,
      revealClass: node.classList.contains('scroll-reveal'),
    }));
    assert.equal(sectionStyle.opacity, '1');
    assert.equal(sectionStyle.transform, 'none');
    assert.equal(sectionStyle.revealClass, false);

    const contactHeading = page.locator('#contact > .section-heading');
    assert.ok(await contactHeading.evaluate(node => node.classList.contains('scroll-reveal-item')));
    assert.equal(await contactHeading.evaluate(node => node.classList.contains('is-visible')), false);
    const preReveal = await contactHeading.evaluate(node => ({
      opacity: Number.parseFloat(getComputedStyle(node).opacity),
      transform: getComputedStyle(node).transform,
      duration: Math.max(...getComputedStyle(node).transitionDuration.split(',').map(value => Number.parseFloat(value))),
    }));
    assert.ok(preReveal.opacity >= 0.9);
    assert.notEqual(preReveal.transform, 'none');
    assert.ok(preReveal.duration <= 0.18);

    const progress = page.locator('#m3ez-scroll-progress-v1');
    assert.equal(await progress.count(), 1);

    const credentials = page.locator('#credentials');
    await credentials.scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#credentials .credential-grid-item')]
        .some(node => node.classList.contains('is-visible')));
    const delays = await page.locator('#credentials .credential-grid-item').evaluateAll(nodes =>
      [nodes[0], nodes[1], nodes.at(-1)].map(node => Number.parseFloat(getComputedStyle(node).transitionDelay)));
    assert.notEqual(delays[0], delays[1]);
    assert.ok(Math.max(...delays) <= 0.06);

    await contact.scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      document.querySelector('#contact > .section-heading')?.classList.contains('is-visible'));
    const ratio = await progress.evaluate(node => Number(node.style.transform.match(/scaleX\(([^)]+)\)/)?.[1] || 0));
    assert.ok(ratio > 0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => scrollY === 0);
    assert.equal(await contactHeading.evaluate(node => node.classList.contains('is-visible')), true);

    await page.getByRole('button', { name: 'Show more CVEs', exact: true }).click();
    assert.equal(await page.locator('.cve-row-enter').count(), 10);
    const cveAnimation = await page.locator('.cve-row-enter').first().evaluate(node => ({
      transform: getComputedStyle(node).transform,
      duration: getComputedStyle(node).animationDuration,
    }));
    assert.equal(cveAnimation.transform, 'none');
    assert.equal(cveAnimation.duration, '0.12s');
  } finally {
    await page.close();
  }

  const reduced = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  try {
    await reduced.goto(origin, { waitUntil: 'networkidle' });
    await ready(reduced);
    const target = reduced.locator('#contact > .section-heading');
    assert.equal(await target.evaluate(node => getComputedStyle(node).opacity), '1');
    assert.equal(await target.evaluate(node => getComputedStyle(node).transform), 'none');
    assert.equal(await reduced.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  } finally {
    await reduced.close();
  }
});
