import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep, join } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const layer = '.m3ez-edge-network';
const screenshots = process.env.DIVIDER_NETWORK_SCREENSHOT_DIR;
const offline = process.env.DIVIDER_NETWORK_OFFLINE === '1';
let browser, server, origin;

before(async () => {
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) return response.writeHead(403).end();
    try { response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
  if (screenshots) await mkdir(screenshots, { recursive: true });
});
after(async () => { await browser?.close(); if (server) await new Promise(done => server.close(done)); });

async function load(width = 1680, theme = 'light', reducedMotion = 'reduce', hash = '') {
  const page = await browser.newPage({ viewport: { width, height: 945 }, reducedMotion });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await render(page, theme, hash);
  assert.equal(await page.locator(layer).count(), 1, 'the actual page mounts the connected network');
  return { page, errors };
}
// Offline mode renders the same HTML/modules/CSS without navigating or making
// any network requests. It does not test HTTP serving or native hash history.
async function render(page, theme, hash = '') {
  if (!offline) {
    await page.addInitScript(value => localStorage.setItem('m3ez-theme', value), theme);
    await page.goto(`${origin}/${hash}`, { waitUntil: 'networkidle' });
    return;
  }
  await page.route(`${origin}/**`, async route => {
    const pathname = new URL(route.request().url()).pathname;
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) return route.fulfill({ status: 403, body: '' });
    try { await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, contentType: types[extname(path)] ?? 'application/octet-stream', body: await readFile(path) }); }
    catch { await route.fulfill({ status: 404, body: '' }); }
  });
  await page.goto('about:blank');
  const html = (await readFile(join(root, 'index.html'), 'utf8')).replace('<head>', `<head><base href="${origin}/">`);
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.locator('.credential-carousel-card').first().waitFor({ state: 'attached' });
  if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#m3ez-theme-toggle-v1').click();
  await page.evaluate(() => document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) event.preventDefault(); // Expander's real capture handler still runs.
  }));
  await settle(page);
}
async function settle(page) {
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
}
async function paths(page) {
  return page.locator('.m3ez-edge-trunk').evaluateAll(nodes => nodes.map(n => [n.dataset.anchor, n.dataset.side, n.getAttribute('d')]));
}
async function assertJoins(page) {
  const joins = await page.locator('.m3ez-edge-trunk').evaluateAll(nodes => nodes.map(path => {
    const source = document.getElementById(path.dataset.anchor) || document.querySelector('.site-header');
    const r = source.getBoundingClientRect(), css = getComputedStyle(source);
    // Match CSS paint snapping; fractional DOM bounds are not painted edges.
    const paintLeft = Math.round(r.left), paintRight = Math.round(r.right);
    const matrix = path.getScreenCTM();
    const at = length => { const p = path.getPointAtLength(length); return new DOMPoint(p.x, p.y).matrixTransform(matrix); };
    const start = at(0), straight = at(8);
    const side = path.dataset.side, wing = path.closest('.m3ez-edge-wing').getBoundingClientRect();
    const allOutside = Array.from({ length: 41 }, (_, i) => at(path.getTotalLength() * i / 40))
      .every(p => side === 'left' ? p.x <= paintLeft + .01 : p.x >= paintRight - .01);
    return { id: path.dataset.anchor, x: start.x, y: start.y, expectedX: side === 'left' ? paintLeft : paintRight,
      expectedY: Math.round(r.bottom) - parseFloat(css.borderBottomWidth) / 2,
      tangentError: Math.abs(start.y - straight.y), color: getComputedStyle(path).stroke, expectedColor: css.borderBottomColor,
      width: getComputedStyle(path).strokeWidth, expectedWidth: css.borderBottomWidth, allOutside,
      wingOutside: side === 'left' ? wing.right <= paintLeft + .01 : wing.left >= paintRight - .01 };
  }));
  assert.ok(joins.length >= 6, 'header, hero and Method have two attached wings each');
  for (const j of joins) {
    assert.ok(Math.abs(j.x - j.expectedX) < .1, `${j.id}: horizontal join is exact`);
    assert.ok(Math.abs(j.y - j.expectedY) < .1, `${j.id}: vertical join is exact`);
    assert.ok(j.tangentError < .001, `${j.id}: the first segment continues horizontally`);
    assert.equal(j.color, j.expectedColor); assert.equal(j.width, j.expectedWidth);
    assert.ok(j.allOutside && j.wingOutside, `${j.id}: no network inside the content`);
  }
}

for (const theme of ['light', 'dark']) {
  test(`real ${theme} page: exact divider attachments, smooth forks and no layout overlay`, async () => {
    const { page, errors } = await load(1680, theme);
    try {
      assert.equal(await page.locator(layer).getAttribute('data-active'), 'true');
      assert.equal(await page.locator('.m3ez-edge-cluster').count(), 6, 'collapsed sections do not get artwork');
      await assertJoins(page);
      const geometry = await paths(page);
      assert.notEqual(geometry[0][2], geometry[1][2], 'left/right shapes are not identical');
      const forks = await page.locator('.m3ez-edge-branch, .m3ez-edge-hairline').evaluateAll(nodes => nodes.map(n => {
        const parent = document.getElementById(n.dataset.parent), start = n.getPointAtLength(0);
        let nearest = Infinity;
        for (let i = 0; i <= 2000; i++) {
          const p = parent.getPointAtLength(parent.getTotalLength() * i / 2000);
          nearest = Math.min(nearest, Math.hypot(p.x - start.x, p.y - start.y));
        }
        return { nearest, cubic: n.getAttribute('d').includes(' C') };
      }));
      assert.ok(forks.every(f => f.cubic && f.nearest < .5), 'every smooth fork starts on its parent, not in empty space');
      assert.equal(await page.locator(layer).getAttribute('aria-hidden'), 'true');
      assert.equal(await page.locator(layer).evaluate(n => getComputedStyle(n).pointerEvents), 'none');
      assert.equal(await page.locator(layer).evaluate(n => getComputedStyle(n).backgroundColor), 'rgba(0, 0, 0, 0)');
      const layout = () => page.locator('.site-header, #content, .site-footer').evaluateAll(nodes => nodes.map(n => ({ x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height })));
      const before = await layout();
      await page.locator(layer).evaluate(n => n.style.display = 'none');
      assert.deepEqual(await layout(), before, 'decoration never changes content geometry');
      await page.locator(layer).evaluate(n => n.style.removeProperty('display'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (screenshots) await page.screenshot({ path: join(screenshots, `desktop-${theme}.png`), animations: 'disabled' });
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('scroll, sticky header, expand and Show more keep real joins and stable shapes', async () => {
  const { page, errors } = await load();
  try {
    const initial = await paths(page);
    await page.locator('#m3ez-explore-more-v1').click();
    await settle(page); await assertJoins(page);
    assert.ok(await page.locator('.m3ez-edge-cluster').count() > 6);
    for (const old of initial) assert.deepEqual((await paths(page)).find(p => p[0] === old[0] && p[1] === old[1]), old);
    await page.locator('.recognition-pagination button').click();
    await settle(page); await assertJoins(page);
    await page.locator('.recognition-pagination button').click();
    await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' }));
    await settle(page); await assertJoins(page);
    if (screenshots) await page.screenshot({ path: join(screenshots, 'desktop-expanded.png'), animations: 'disabled' });
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('theme changes preserve paths but update actual divider colors', async () => {
  const { page } = await load();
  try {
    const before = await paths(page);
    await page.locator('#m3ez-theme-toggle-v1').click(); await settle(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await assertJoins(page); assert.deepEqual(await paths(page), before);
    await render(page, 'dark');
    assert.notDeepEqual(await paths(page), before, 'reload randomizes the curves');
  } finally { await page.close(); }
});

for (const width of [390, 768, 1024, 1280]) {
  test(`no SVG or overflow at ${width}px; resizing to desktop remounts only once`, async () => {
    const { page, errors } = await load(width);
    try {
      assert.equal(await page.locator(layer).isVisible(), false);
      assert.equal(await page.locator('.m3ez-edge-cluster').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.setViewportSize({ width: 1680, height: 945 }); await settle(page); await assertJoins(page);
      await page.evaluate(async () => { const m = await import('/assets/divider-network.js'); m.initializeDividerNetwork(); m.initializeDividerNetwork(); });
      assert.equal(await page.locator(layer).count(), 1);
      assert.equal(await page.locator('#m3ez-edge-network-styles').count(), 1);
      await page.setViewportSize({ width, height: 945 }); await settle(page);
      assert.equal(await page.locator('.m3ez-edge-cluster').count(), 0);
      if (width === 390 && screenshots) await page.screenshot({ path: join(screenshots, 'mobile.png'), animations: 'disabled' });
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('ultrawide gutters cap the spread and resize does not reshuffle', async () => {
  const { page } = await load();
  try {
    const before = await paths(page);
    await page.setViewportSize({ width: 3440, height: 945 }); await settle(page);
    await assertJoins(page);
    assert.ok((await page.locator('.m3ez-edge-wing').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width))).every(w => w <= 380));
    await page.setViewportSize({ width: 1680, height: 945 }); await settle(page);
    assert.deepEqual(await paths(page), before);
  } finally { await page.close(); }
});

test('reduced motion, high contrast and print disable decorative animation', async () => {
  const { page } = await load();
  try {
    assert.ok((await page.locator('.m3ez-edge-pulse').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).animationName))).every(a => a === 'none'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await page.locator('.m3ez-edge-pulse').first().evaluate(n => getComputedStyle(n).animationName), 'm3ez-edge-flow');
    await page.emulateMedia({ forcedColors: 'active' }); assert.equal(await page.locator(layer).isVisible(), false);
    await page.emulateMedia({ forcedColors: 'none', media: 'print' }); assert.equal(await page.locator(layer).isVisible(), false);
    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' }); await settle(page); await assertJoins(page);
  } finally { await page.close(); }
});

test('inset and hidden dividers are not bridged across content', async () => {
  const { page } = await load();
  try {
    await page.evaluate(() => {
      const node = document.createElement('section'); node.id = 'network-inset-fixture'; node.className = 'trace-section';
      node.style.cssText = 'width:60%;border-bottom:1px solid black'; document.querySelector('#content').prepend(node);
    });
    await settle(page);
    assert.equal(await page.locator('[data-anchor="network-inset-fixture"]').count(), 0);
    await page.locator('#top').evaluate(n => n.style.borderBottomColor = 'transparent'); await settle(page);
    assert.equal(await page.locator('.m3ez-edge-trunk[data-anchor="top"]').count(), 0);
  } finally { await page.close(); }
});
