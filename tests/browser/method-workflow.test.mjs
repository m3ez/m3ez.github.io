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
      assert.equal(await graph.locator('.method-step').count(), 0, 'remove number markup, not only its visibility');
      const contents = await graph.locator('.method-node').evaluateAll(nodes => nodes.map(node => ({
        parts: [...node.children].map(child => child.className),
        text: node.textContent,
        columns: getComputedStyle(node).gridTemplateColumns.split(' ').length,
        display: getComputedStyle(node).display,
        clipped: node.scrollHeight > node.clientHeight + 1,
      })));
      for (const content of contents) {
        assert.deepEqual(content.parts, ['method-label', 'method-detail']);
        assert.doesNotMatch(content.text, /\d/);
        assert.equal(content.clipped, false, 'node text must fit vertically');
        if (width <= 980) {
          assert.equal(content.display, 'grid');
          assert.equal(content.columns, 2, 'mobile must not reserve an empty number column');
        }
      }
      assert.equal(await graph.evaluate(node => getComputedStyle(node).listStyleType), 'none');
      assert.equal(await graph.locator('.method-connector[aria-hidden="true"]').count(), 7);
      assert.equal(await graph.locator('svg.method-arrow[focusable="false"]').count(), 7);
      assert.equal(await graph.locator('.method-arrow-shaft[vector-effect="non-scaling-stroke"]').count(), 7);
      assert.equal(await graph.locator('.method-arrow-head').count(), 7);
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

test('Method loops through multiple cycles with a moving pulse and no layout shift', async () => {
  await withPage(1440, async page => {
    await state(page, 'waiting');
    const graph = page.locator(selector);
    assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    await showMethod(page);
    await state(page, 'running');
    const before = await graph.boundingBox();
    const travel = await graph.evaluate(node => {
      const pulses = node.getAnimations({ subtree: true }).filter(animation => animation.effect.target.matches('.method-pulse'));
      if (pulses.length !== 7) return { count: pulses.length };
      const first = pulses[0];
      const timing = first.effect.getTiming();
      // Sample the rendered pulse in both its first and second iterations.
      // Replacing infinite with one iteration must break the second sample.
      first.pause();
      const samples = [0, timing.duration].map(cycle => {
        first.currentTime = timing.delay + cycle + 60;
        const start = first.effect.target.getBoundingClientRect().x;
        first.currentTime = timing.delay + cycle + 240;
        const end = first.effect.target.getBoundingClientRect().x;
        return { start, end, opacity: +getComputedStyle(first.effect.target).opacity };
      });
      first.currentTime = 0;
      first.play();
      return { count: pulses.length, infinite: timing.iterations === Infinity, duration: timing.duration, samples };
    });
    assert.equal(travel.count, 7);
    assert.equal(travel.infinite, true, 'flow must repeat, not play once');
    travel.samples.forEach(sample => {
      assert.ok(sample.end > sample.start + 1, JSON.stringify(sample));
      assert.ok(sample.opacity > 0, 'pulse must remain visible in subsequent cycles');
    });
    // Use real elapsed browser time to catch the previous JS completion timer.
    // This also verifies that the third cycle runs without re-entering Method.
    await page.waitForTimeout(travel.duration * 2 + 350);
    assert.equal(await graph.getAttribute('data-flow-state'), 'running');
    assert.ok(await graph.evaluate(node => node.getAnimations({ subtree: true }).some(animation => animation.effect.target.matches('.method-pulse') && animation.effect.getComputedTiming().currentIteration >= 2)));
    const after = await graph.boundingBox();
    assert.ok(Math.abs(after.height - before.height) < 1 && Math.abs(after.y - before.y) < 1);
    await screenshot(page, '1440-method-loop.png');
  }, { reducedMotion: 'no-preference' });
});

test('Method stops offscreen and restarts the loop when it re-enters the viewport', async () => {
  await withPage(1440, async page => {
    const graph = page.locator(selector);
    await showMethod(page);
    await state(page, 'running');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await state(page, 'waiting');
    assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    assert.equal(await graph.locator('.method-pulse').evaluateAll(nodes => nodes.some(node => +getComputedStyle(node).opacity > 0)), false);
    await showMethod(page);
    await state(page, 'running');
    assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.effect.target.matches('.method-pulse')).length), 7);
  }, { reducedMotion: 'no-preference' });
});

test('live reduced motion disables the loop and clearing the preference restores visible flow', async () => {
  await withPage(1440, async page => {
    const graph = page.locator(selector);
    await showMethod(page);
    await state(page, 'running');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await state(page, 'complete');
    assert.equal(await graph.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await state(page, 'running');
    assert.ok(await graph.evaluate(node => node.getAnimations({ subtree: true }).length > 0));
  }, { reducedMotion: 'no-preference' });
});

test('a reduced-motion initial load can start later without duplicating initialization', async () => {
  await withPage(390, async page => {
    await showMethod(page);
    await state(page, 'complete');
    await page.evaluate(async () => {
      const { initializeMethodWorkflow } = await import('/assets/method-workflow.js');
      initializeMethodWorkflow();
      initializeMethodWorkflow();
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await state(page, 'running');
    assert.equal(await page.locator(`${selector} .method-node`).count(), 8);
    assert.equal(await page.locator(`${selector} .method-pulse`).count(), 7);
  });
});

test('resizing keeps vertical arrow alignment and downward pulse movement', async () => {
  await withPage(1440, async page => {
    await showMethod(page);
    await state(page, 'running');
    await page.setViewportSize({ width: 390, height: 900 });
    await showMethod(page);
    await state(page, 'running');
    const sample = await page.locator(selector).evaluate(node => {
      const first = node.getAnimations({ subtree: true }).find(animation => animation.effect.target.matches('.method-pulse'));
      first.pause();
      const timing = first.effect.getTiming();
      first.currentTime = timing.delay + 60;
      const start = first.effect.target.getBoundingClientRect();
      first.currentTime = timing.delay + 240;
      const end = first.effect.target.getBoundingClientRect();
      first.play();
      const arrow = node.querySelector('.method-arrow').getBoundingClientRect();
      const connector = node.querySelector('.method-connector').getBoundingClientRect();
      return { startY: start.y, endY: end.y, startX: start.x, endX: end.x, arrowHeight: arrow.height, arrowWidth: arrow.width, connectorHeight: connector.height };
    });
    assert.ok(sample.endY > sample.startY + 1, JSON.stringify(sample));
    assert.ok(Math.abs(sample.endX - sample.startX) < 1);
    assert.ok(sample.arrowHeight > sample.arrowWidth, 'mobile arrow must rotate down');
    assert.ok(Math.abs(sample.arrowHeight - sample.connectorHeight) < 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await screenshot(page, '390-method-loop.png');
  }, { reducedMotion: 'no-preference' });
});

test('visibility lifecycle suspends a hidden document and resumes when visible', async () => {
  await withPage(1440, async page => {
    await showMethod(page);
    await state(page, 'running');
    // Deterministically exercise the document lifecycle handler. Headless tabs
    // do not consistently become hidden when another page is opened.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await state(page, 'waiting');
    assert.equal(await page.locator(selector).evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await state(page, 'running');
  }, { reducedMotion: 'no-preference' });
});

test('loop initialization is idempotent while animations are already running', async () => {
  await withPage(1440, async page => {
    await showMethod(page);
    await state(page, 'running');
    const result = await page.evaluate(async () => {
      const root = document.querySelector('#method .method-workflow');
      const before = root.getAnimations({ subtree: true });
      const { initializeMethodWorkflow } = await import('/assets/method-workflow.js');
      initializeMethodWorkflow();
      initializeMethodWorkflow();
      const after = root.getAnimations({ subtree: true });
      return { same: before.length === after.length && before.every(animation => after.includes(animation)), state: root.dataset.flowState };
    });
    assert.equal(result.same, true, 'repeat initialization must not restart or duplicate animations');
    assert.equal(result.state, 'running');
  }, { reducedMotion: 'no-preference' });
});

test('no IntersectionObserver still provides the completed static workflow', async () => {
  await withPage(390, async page => {
    await state(page, 'complete');
    await showMethod(page);
    assert.deepEqual(await page.locator(`${selector} .method-label`).allTextContents(), expected);
    assert.equal(await page.locator(selector).evaluate(node => node.getAnimations({ subtree: true }).length), 0);
  }, { reducedMotion: 'no-preference', init: () => { delete window.IntersectionObserver; } });
});
