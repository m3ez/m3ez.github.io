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

const phases = ['Discover', 'Test', 'Deliver'];
const numbers = ['01','02','03','04','05','06','07','08'];

async function feedbackGeometry(page, width) {
  const geometry = await page.locator(selector).evaluate(node => {
    const feedback = node.querySelector('.method-feedback');
    const svg = [...feedback.querySelectorAll('svg')].find(s => getComputedStyle(s).display !== 'none');
    const path = svg.querySelector('.method-feedback-path');
    const matrix = path.getScreenCTM();
    const from = path.getPointAtLength(0).matrixTransform(matrix);
    const to = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
    const analyze = document.getElementById(feedback.dataset.to).getBoundingClientRect();
    const verify = document.getElementById(feedback.dataset.from).getBoundingClientRect();
    const label = feedback.querySelector('p').getBoundingClientRect();
    const deliver = node.querySelector('[data-phase="deliver"]').getBoundingClientRect();
    return { from: {x:from.x,y:from.y}, to: {x:to.x,y:to.y}, analyze: analyze.toJSON(), verify: verify.toJSON(), label: label.toJSON(), deliver: deliver.toJSON() };
  });
  const {from,to,analyze,verify,label,deliver} = geometry;
  if (width > 980) {
    assert.ok(Math.abs(from.x - (verify.x + verify.width / 2)) < 2, JSON.stringify(geometry));
    assert.ok(Math.abs(to.x - (analyze.x + analyze.width / 2)) < 2, JSON.stringify(geometry));
    assert.ok(to.x < from.x && to.y >= analyze.y + analyze.height - 1);
    assert.ok(label.y >= verify.y + verify.height && label.right <= deliver.x + 1);
  } else {
    assert.ok(Math.abs(from.y - (verify.y + verify.height / 2)) < 2, JSON.stringify(geometry));
    assert.ok(Math.abs(to.y - (analyze.y + analyze.height / 2)) < 2, JSON.stringify(geometry));
    assert.ok(to.y < from.y && to.x >= analyze.x + analyze.width - 1);
    assert.ok(label.bottom <= deliver.y, 'feedback note must not overlap Deliver');
  }
}

for (const [width, javaScriptEnabled] of [[320,true],[390,true],[768,true],[980,true],[981,true],[1024,true],[1440,true],[320,false],[1440,false]]) {
  test(`Method segmented layout groups phases and fits at ${width}px (JavaScript ${javaScriptEnabled})`, async () => {
    await withPage(width, async page => {
      await showMethod(page);
      const graph = page.locator(selector);
      assert.deepEqual(await graph.locator('.method-phase-title').allTextContents(), phases);
      assert.deepEqual(await graph.locator('.method-label').allTextContents(), expected);
      assert.deepEqual(await graph.locator('.method-step').allTextContents(), numbers);
      assert.deepEqual(await graph.locator('.method-strip').evaluateAll(lists => lists.map(list => list.children.length)), [3,3,2]);
      assert.equal(await graph.locator('.method-connector, .method-arrow, .method-pulse').count(), 0);
      assert.equal(await graph.locator('button, a, [tabindex], [aria-live]').count(), 0);
      const boxes = await graph.locator('.method-node').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        const textRects = [...node.children].map(child => child.getBoundingClientRect());
        return {...rect.toJSON(), clipped: node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1, textFits: textRects.every(r => r.left >= rect.left && r.right <= rect.right + 1 && r.bottom <= rect.bottom + 1)};
      }));
      boxes.forEach(box => {
        assert.ok(box.x >= 0 && box.right <= width + 1, JSON.stringify(box));
        assert.equal(box.clipped, false, 'node content must not clip');
        assert.equal(box.textFits, true, 'titles and numbers fit inside boxes');
      });
      for (let i=1; i<boxes.length; i++) {
        if (width > 980) {
          assert.ok(Math.abs(boxes[i].y - boxes[0].y) < 1);
          assert.ok(Math.abs(boxes[i].x - boxes[i-1].right) < 1, 'desktop cells touch even between phases');
          assert.ok(Math.abs(boxes[i].height - boxes[0].height) < 1);
        } else {
          assert.ok(boxes[i].y >= boxes[i-1].bottom - 1);
          if (![3,6].includes(i)) assert.ok(Math.abs(boxes[i].y - boxes[i-1].bottom) < 1, 'mobile cells share borders within each phase');
        }
      }
      const endpoint = await graph.locator('.method-node-final').evaluate(node => ({label: node.querySelector('.method-label').textContent, bg: getComputedStyle(node).backgroundColor, fg: getComputedStyle(node).color}));
      assert.equal(endpoint.label, 'Report');
      assert.equal(endpoint.bg, 'rgb(0, 0, 0)');
      assert.equal(endpoint.fg, 'rgb(255, 255, 255)');
      await feedbackGeometry(page, width);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await graph.evaluate(node => node.getAnimations({subtree:true}).length), 0);
      if (javaScriptEnabled) {
        assert.equal(await page.locator('.credential-carousel-rotation').count(), 0);
        assert.equal(await page.locator('.research-dropdown-trigger').count(), 2);
        assert.equal(await page.locator('#contact a[href="https://x.com/Supakiad_Mee"]').count(), 1);
      }
      await screenshot(page, `${width}-method-static-js-${javaScriptEnabled}.png`);
    }, {javaScriptEnabled});
  });
}

test('strip highlights move across eight nodes and loop through a third cycle without layout shift', async () => {
  await withPage(1440, async page => {
    await state(page, 'waiting');
    const graph = page.locator(selector);
    assert.equal(await graph.evaluate(n => n.getAnimations({subtree:true}).length), 0);
    await showMethod(page);
    await state(page, 'running');
    const before = await graph.boundingBox();
    const sample = await graph.evaluate(node => {
      const animations = node.getAnimations({subtree:true});
      const highlights = animations.filter(a => a.animationName === 'method-segment-flow');
      if (highlights.length !== 7) return {count:highlights.length};
      const timing = highlights[0].effect.getTiming();
      const edge = animations.find(a => a.animationName === 'method-segment-edge');
      const edgeTiming = edge.effect.getTiming();
      edge.pause();
      const frames = [0,edgeTiming.duration].map(cycle => {
        edge.currentTime = cycle + edgeTiming.delay + 60;
        const first = getComputedStyle(edge.effect.target,'::before').transform;
        edge.currentTime = cycle + edgeTiming.delay + 440;
        const second = getComputedStyle(edge.effect.target,'::before').transform;
        return {first,second,opacity:+getComputedStyle(edge.effect.target,'::before').opacity};
      });
      edge.currentTime = 0; edge.play();
      return {count:highlights.length, duration:timing.duration, infinite:animations.every(a => a.effect.getTiming().iterations === Infinity), delays:highlights.map(a => a.effect.getTiming().delay), frames};
    });
    assert.equal(sample.count, 7, 'the seven white nodes receive the fill tint');
    assert.equal(sample.infinite, true);
    assert.deepEqual(sample.delays, [0,600,1200,1800,2400,3000,3600]);
    sample.frames.forEach(frame => {assert.notEqual(frame.first,frame.second);assert.ok(frame.opacity > 0);});
    await page.waitForTimeout(sample.duration * 2 + 150);
    assert.equal(await graph.getAttribute('data-flow-state'), 'running');
    assert.ok(await graph.evaluate(n => n.getAnimations({subtree:true}).some(a => a.effect.getComputedTiming().currentIteration >= 2)));
    const after = await graph.boundingBox();
    assert.ok(Math.abs(after.height-before.height)<1 && Math.abs(after.y-before.y)<1);
    await screenshot(page, '1440-method-loop.png');
  }, {reducedMotion:'no-preference'});
});

test('Report stays black through its active pulse and every restart', async () => {
  await withPage(1440, async page => {
    await showMethod(page); await state(page,'running');
    const colors = await page.locator('.method-node-final').evaluate(node => {
      const animations = node.getAnimations({subtree:true});
      return [0,4400,5500,6000,11200].map(time => {
        animations.forEach(a => {a.pause(); a.currentTime=time;});
        return {bg:getComputedStyle(node).backgroundColor,fg:getComputedStyle(node).color};
      });
    });
    colors.forEach(c => assert.deepEqual(c,{bg:'rgb(0, 0, 0)',fg:'rgb(255, 255, 255)'}));
  }, {reducedMotion:'no-preference'});
});

test('Method stops offscreen and resumes its strip on re-entry', async () => {
  await withPage(1440, async page => {
    const graph=page.locator(selector);
    await showMethod(page); await state(page,'running');
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await state(page,'waiting');
    assert.equal(await graph.evaluate(n => n.getAnimations({subtree:true}).length),0);
    await showMethod(page); await state(page,'running');
    assert.equal(await graph.evaluate(n => n.getAnimations({subtree:true}).filter(a => a.animationName === 'method-segment-edge').length),8);
  }, {reducedMotion:'no-preference'});
});

test('live reduced motion stops all highlights without clearing the black Report', async () => {
  await withPage(1440, async page => {
    await showMethod(page); await state(page,'running');
    await page.emulateMedia({reducedMotion:'reduce'}); await state(page,'complete');
    assert.equal(await page.locator(selector).evaluate(n => n.getAnimations({subtree:true}).length),0);
    assert.equal(await page.locator('.method-node-final').evaluate(n => getComputedStyle(n).backgroundColor),'rgb(0, 0, 0)');
    await page.emulateMedia({reducedMotion:'no-preference'}); await state(page,'running');
  }, {reducedMotion:'no-preference'});
});

test('a static initial load starts later and repeat initialization keeps all groups intact', async () => {
  await withPage(390, async page => {
    await showMethod(page); await state(page,'complete');
    await page.evaluate(async () => {
      const {initializeMethodWorkflow}=await import('/assets/method-workflow.js');
      initializeMethodWorkflow(); initializeMethodWorkflow();
    });
    await page.emulateMedia({reducedMotion:'no-preference'}); await state(page,'running');
    assert.equal(await page.locator('.method-node').count(),8);
    assert.equal(await page.locator('.method-phase').count(),3);
  });
});

test('resize preserves connected mobile cells and aligns the returning feedback path', async () => {
  await withPage(1440, async page => {
    await showMethod(page); await state(page,'running');
    await page.setViewportSize({width:390,height:900}); await showMethod(page); await state(page,'running');
    await feedbackGeometry(page,390);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await screenshot(page,'390-method-loop.png');
  }, {reducedMotion:'no-preference'});
});

test('hidden-document lifecycle stops and restores the visible highlight loop', async () => {
  await withPage(1440, async page => {
    await showMethod(page); await state(page,'running');
    // Deterministic handler coverage, not an OS-level background-tab test.
    await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    await state(page,'waiting');
    assert.equal(await page.locator(selector).evaluate(n => n.getAnimations({subtree:true}).length),0);
    await page.evaluate(() => {delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await state(page,'running');
  }, {reducedMotion:'no-preference'});
});

test('running initialization is idempotent and does not add another observer or animation', async () => {
  await withPage(1440, async page => {
    await showMethod(page); await state(page,'running');
    const same=await page.evaluate(async () => {
      const graph=document.querySelector('#method .method-workflow');
      const before=graph.getAnimations({subtree:true});
      const {initializeMethodWorkflow}=await import('/assets/method-workflow.js'); initializeMethodWorkflow();
      const after=graph.getAnimations({subtree:true});
      return before.length===after.length && before.every(a=>after.includes(a));
    });
    assert.equal(same,true);
  }, {reducedMotion:'no-preference'});
});

test('unsupported IntersectionObserver keeps the grouped static workflow', async () => {
  await withPage(390, async page => {
    await state(page,'complete'); await showMethod(page);
    assert.deepEqual(await page.locator('.method-label').allTextContents(),expected);
    assert.equal(await page.locator(selector).evaluate(n => n.getAnimations({subtree:true}).length),0);
  }, {reducedMotion:'no-preference',init:()=>{delete window.IntersectionObserver;}});
});
