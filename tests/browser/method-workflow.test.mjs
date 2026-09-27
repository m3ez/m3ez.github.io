import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
const expected = ['Scope', 'Map', 'Trace', 'Analyze', 'Exploit', 'Verify', 'Document', 'Report'];
const selector = '#method .method-workflow';
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

async function withPage(width, action, options = {}) {
  const { init, ...contextOptions } = options;
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce', ...contextOptions });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    if (init) await page.addInitScript(init);
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(await page.locator(selector).count(), 1, 'Method must contain the approved diagram');
    await action(page);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function showMethod(page) {
  await page.locator('#method').evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center' }));
}

async function state(page, value) {
  await page.waitForFunction(value => document.querySelector('#method .method-workflow').dataset.flowState === value, value);
}

async function screenshot(page, name) {
  if (!process.env.UI_SCREENSHOTS) return;
  await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
  await page.locator('#method').screenshot({ path: resolve(process.env.UI_SCREENSHOTS, name) });
}

for (const [width, javaScriptEnabled] of [[320, true], [390, true], [768, true], [1024, true], [1440, true], [390, false]]) {
  test(`Method keeps eight readable nodes in order at ${width}px (JavaScript ${javaScriptEnabled})`, async () => {
    await withPage(width, async page => {
      await showMethod(page);
      const graph = page.locator(selector);
      assert.deepEqual(await graph.locator('.method-label').allTextContents(), expected);
      assert.equal(await graph.locator('li').count(), 8);
      assert.equal(await graph.locator('.method-connector[aria-hidden="true"]').count(), 7);
      assert.equal(await graph.locator('button, a, [tabindex], [aria-live]').count(), 0);
      const boxes = await graph.locator('.method-node').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, clipped: node.scrollWidth > node.clientWidth + 1 };
      }));
      boxes.forEach(box => {
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1, JSON.stringify(box));
        assert.equal(box.clipped, false, JSON.stringify(box));
      });
      for (let i = 1; i < boxes.length; i++) {
        if (width > 980) {
          assert.ok(Math.abs(boxes[i].y - boxes[0].y) < 1, 'desktop stays left-to-right');
          assert.ok(boxes[i].x > boxes[i - 1].x + boxes[i - 1].width);
        } else {
          assert.ok(boxes[i].y > boxes[i - 1].y + boxes[i - 1].height, 'mobile keeps top-to-bottom order');
        }
      }
      const connectorRects = await graph.locator('.method-connector').evaluateAll(nodes => nodes.map(node => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      }));
      connectorRects.forEach((edge, i) => {
        if (width > 980) {
          assert.ok(Math.abs(edge.x - (boxes[i].x + boxes[i].width)) < 2);
          assert.ok(Math.abs(edge.x + edge.width - boxes[i + 1].x) < 2);
        } else {
          assert.ok(Math.abs(edge.y - (boxes[i].y + boxes[i].height)) < 2);
          assert.ok(Math.abs(edge.y + edge.height - boxes[i + 1].y) < 2);
        }
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).length), 0, 'reduced-motion/static fallback has no animation');
      if (javaScriptEnabled) {
        assert.equal(await page.locator('.credential-carousel-rotation').count(), 0);
        assert.equal(await page.locator('.research-dropdown-trigger').count(), 2);
        assert.equal(await page.locator('#contact a[href="https://x.com/Supakiad_Mee"]').count(), 1);
      }
      await screenshot(page, `${width}-method-static-js-${javaScriptEnabled}.png`);
    }, { javaScriptEnabled });
  });
}

test('Method waits for visibility, sends a real connector pulse, and completes once without layout shift', async () => {
  await withPage(1440, async page => {
    await state(page, 'waiting');
    assert.equal(await page.locator(selector).evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    await showMethod(page);
    await state(page, 'running');
    const graph = page.locator(selector);
    const before = await graph.boundingBox();
    const travel = await graph.evaluate(node => {
      const animations = node.getAnimations({ subtree: true });
      const pulses = animations.filter(animation => animation.effect.target.matches('.method-pulse'));
      if (pulses.length !== 7) return { count: pulses.length };
      // Sample the actual CSS animation at two positions, without relying on CI frame timing.
      const first = pulses[0];
      first.pause();
      const delay = first.effect.getTiming().delay;
      first.currentTime = delay + 50;
      const start = first.effect.target.getBoundingClientRect().x;
      first.currentTime = delay + 200;
      const end = first.effect.target.getBoundingClientRect().x;
      first.play();
      return { count: pulses.length, start, end };
    });
    assert.equal(travel.count, 7);
    assert.ok(travel.end > travel.start + 1, JSON.stringify(travel));
    await screenshot(page, '1440-method-running.png');
    await state(page, 'complete');
    const after = await graph.boundingBox();
    assert.ok(Math.abs(after.height - before.height) < 1 && Math.abs(after.y - before.y) < 1);
    assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    assert.equal(await graph.locator('.method-pulse').evaluateAll(nodes => nodes.some(node => +getComputedStyle(node).opacity > 0)), false);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(100);
    await showMethod(page);
    await page.waitForTimeout(120);
    await state(page, 'complete');
    assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
  }, { reducedMotion: 'no-preference' });
});

test('live reduced-motion preference stops the flow and does not restart it', async () => {
  await withPage(1440, async page => {
    await showMethod(page);
    await state(page, 'running');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await state(page, 'complete');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(150);
    assert.equal(await page.locator(selector).getAttribute('data-flow-state'), 'complete');
    assert.equal(await page.locator(selector).evaluate(node => node.getAnimations({ subtree: true }).length), 0);
  }, { reducedMotion: 'no-preference' });
});

test('leaving Method ends the decorative animation instead of running it offscreen', async () => {
  await withPage(1440, async page => {
    await showMethod(page);
    await state(page, 'running');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await state(page, 'complete');
    await showMethod(page);
    assert.equal(await page.locator(selector).getAttribute('data-flow-state'), 'complete');
  }, { reducedMotion: 'no-preference' });
});

test('resizing a running diagram settles it and switches to the compact mobile layout', async () => {
  await withPage(1440, async page => {
    await showMethod(page);
    await state(page, 'running');
    await page.setViewportSize({ width: 390, height: 900 });
    await state(page, 'complete');
    const graph = page.locator(selector);
    assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }, { reducedMotion: 'no-preference' });
});

test('initializing Method twice does not duplicate nodes, connectors, or restart completed motion', async () => {
  await withPage(1440, async page => {
    await page.evaluate(async () => {
      const { initializeMethodWorkflow } = await import('/assets/method-workflow.js');
      initializeMethodWorkflow();
      initializeMethodWorkflow();
    });
    assert.equal(await page.locator(selector).count(), 1);
    assert.equal(await page.locator(`${selector} .method-node`).count(), 8);
    assert.equal(await page.locator(selector).getAttribute('data-flow-state'), 'complete');
  });
});

test('no IntersectionObserver still provides the completed static workflow', async () => {
  await withPage(390, async page => {
    await state(page, 'complete');
    await showMethod(page);
    assert.deepEqual(await page.locator(`${selector} .method-label`).allTextContents(), expected);
  }, { reducedMotion: 'no-preference', init: () => { delete window.IntersectionObserver; } });
});
