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

// Research is off the Method viewport both before and after the approved move.
// Do not assume the top of the page is offscreen now that Method follows the hero.
async function hideMethod(page) {
  await page.locator('#research').evaluate(node => window.scrollTo({
    top: node.getBoundingClientRect().top + window.scrollY + 100,
    behavior: 'instant',
  }));
}

async function assertMethodPlacement(page, width) {
  const layout = await page.evaluate(() => {
    const method = document.getElementById('method');
    const style = getComputedStyle(method);
    const box = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    return {
      previous: method.previousElementSibling?.id, next: method.nextElementSibling?.id,
      hero: box('#top'), method: box('#method'), research: box('#research'),
      heroTitle: box('#hero-title'), heading: box('#method-title'),
      researchHeading: box('#research-title'), workflow: box('#method .method-workflow'),
      borders: ['Top', 'Right', 'Bottom', 'Left'].map(side => style[`border${side}Width`]),
      dividerStyle: style.borderBottomStyle, dividerColor: style.borderBottomColor,
      researchBorderTop: getComputedStyle(document.getElementById('research')).borderTopWidth,
      methodPaddingBottom: parseFloat(style.paddingBottom),
      researchMarginTop: parseFloat(getComputedStyle(document.getElementById('research')).marginTop),
      researchPaddingTop: parseFloat(getComputedStyle(document.getElementById('research')).paddingTop),
      rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
      feedback: box('#method .method-feedback-label'),
      padding: [style.paddingLeft, style.paddingRight],
    };
  });
  assert.deepEqual([layout.previous, layout.next], ['top', 'research'],
    'Method must sit directly between hero and Research');
  assert.deepEqual(layout.borders, ['0px', '0px', '1px', '0px'],
    'Method has one bottom divider, not an outer card frame');
  assert.equal(layout.dividerStyle, 'solid');
  assert.equal(layout.dividerColor, (await sitePalette(page)).line);
  assert.equal(layout.researchBorderTop, '0px', 'Research must not double the divider');
  assert.ok(layout.feedback.bottom < layout.method.bottom - 1,
    'the divider must remain below the feedback path and caption');
  assert.deepEqual(layout.padding, ['0px', '0px'], 'no card-like horizontal inset');
  for (const neighbour of [layout.hero, layout.research]) {
    assert.ok(Math.abs(layout.method.x - neighbour.x) < 1);
    assert.ok(Math.abs(layout.method.right - neighbour.right) < 1);
  }
  assert.ok(Math.abs(layout.heading.x - layout.heroTitle.x) < 1);
  assert.ok(Math.abs(layout.workflow.x - layout.heroTitle.x) < 1);
  assert.ok(layout.method.y >= layout.hero.bottom - 1);
  const extraSpace = (width <= 980 ? 1.5 : 2) * layout.rootFontSize;
  const expectedBottomPadding = layout.rootFontSize + extraSpace;
  assert.ok(Math.abs(layout.methodPaddingBottom - expectedBottomPadding) < 0.1,
    'Whitespace must be above the Method divider, not below it');
  assert.ok(Math.abs(layout.method.bottom - 1 - layout.workflow.bottom - expectedBottomPadding) < 1,
    `The extra space must be inside Method before its bottom line: ${JSON.stringify(layout)}`);
  assert.equal(layout.researchMarginTop, 0, 'Research must not add a gap after the divider');
  assert.ok(Math.abs(layout.research.y - layout.method.bottom) < 1,
    `Research starts immediately after the divider: ${JSON.stringify(layout)}`);
  const expectedPadding = Math.min(2 * layout.rootFontSize, Math.max(1.5 * layout.rootFontSize, width * 0.03));
  assert.ok(Math.abs(layout.researchPaddingTop - expectedPadding) < 0.1,
    'Research internal padding remains unchanged');
  assert.ok(layout.researchHeading.y - layout.research.y <= 40,
    'Research keeps its compact internal heading spacing');
  assert.ok(layout.method.height - extraSpace <= (width <= 980 ? 650 : 340),
    `Method should not become a second hero: ${JSON.stringify(layout)}`);

  if (width <= 980) {
    const rows = await page.locator('.method-node').evaluateAll(nodes => nodes.map(node => {
      const rect = selector => node.querySelector(selector).getBoundingClientRect().toJSON();
      return { height: node.getBoundingClientRect().height, number: rect('.method-step'),
        marker: rect('.method-marker'), label: rect('.method-label'), detail: rect('.method-detail') };
    }));
    for (const row of rows) {
      assert.ok(row.height <= 56, `mobile rows remain content-sized: ${JSON.stringify(row)}`);
      assert.ok(row.number.x >= row.marker.right + 3 && row.number.right <= row.label.x);
      assert.ok(row.detail.x >= row.label.right - 1, 'description sits beside the stage title');
    }
  }
}

async function screenshotOverview(page, name) {
  if (!process.env.UI_SCREENSHOTS) return;
  await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
  const original = page.viewportSize();
  const end = await page.locator('#research-title').evaluate(node =>
    Math.ceil(node.getBoundingClientRect().bottom + window.scrollY + 48));
  try {
    await page.setViewportSize({ width: original.width, height: end });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: resolve(process.env.UI_SCREENSHOTS, name) });
  } finally {
    await page.setViewportSize(original);
  }
}

async function state(page, value) {
  await page.waitForFunction(value => document.querySelector('#method .method-workflow').dataset.flowState === value, value);
}

async function screenshot(page, name) {
  if (!process.env.UI_SCREENSHOTS) return;
  await mkdir(process.env.UI_SCREENSHOTS, { recursive: true });
  const section=page.locator('#method');
  const original=page.viewportSize();
  const box=await section.boundingBox();
  try {
    await page.setViewportSize({width:original.width,height:Math.max(original.height,Math.ceil(box.height)+180)});
    await showMethod(page);
    await section.screenshot({path:resolve(process.env.UI_SCREENSHOTS,name)});
  } finally {
    await page.setViewportSize(original);
  }
}

// Resolve shared tokens outside Method so a section-local palette cannot pass.
async function sitePalette(page) {
  return page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    try {
      return Object.fromEntries(['paper', 'ink', 'muted', 'line', 'black'].map(token => {
        probe.style.color = `var(--${token})`;
        return [token, getComputedStyle(probe).color];
      }));
    } finally {
      probe.remove();
    }
  });
}

async function assertMethodPalette(page) {
  const palette = await sitePalette(page);
  const actual = await page.locator('#method').evaluate(section => {
    const color = (selector, property = 'color', pseudo = null) =>
      getComputedStyle(section.querySelector(selector), pseudo)[property];
    return {
      background: getComputedStyle(section).backgroundColor,
      text: getComputedStyle(section).color,
      label: color('.method-label'),
      detail: color('.method-detail'),
      number: color('.method-step'),
      phase: color('.method-phase-title'),
      divider: color('.method-phase-title', 'borderBottomColor'),
      rail: color('.method-track', 'backgroundColor', '::before'),
      marker: color('.method-marker', 'backgroundColor'),
      markerBorder: color('.method-marker', 'borderTopColor'),
      endpoint: color('.method-node-final .method-marker', 'backgroundColor'),
      feedback: color('.method-feedback'),
    };
  });
  assert.deepEqual(actual, {
    background: palette.paper, text: palette.ink, label: palette.ink,
    detail: palette.muted, number: palette.muted, phase: palette.ink,
    divider: palette.line, rail: palette.line, marker: palette.paper,
    markerBorder: palette.muted, endpoint: palette.ink, feedback: palette.muted,
  });
}

const phases = ['Discover', 'Test', 'Deliver'];
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
  test(`Option 1 is borderless, grouped, and readable at ${width}px (JavaScript ${javaScriptEnabled})`, async () => {
    await withPage(width, async page => {
      await showMethod(page);
      const graph = page.locator(selector);
      assert.deepEqual(await graph.locator('.method-phase-title').allTextContents(), phases);
      assert.deepEqual(await graph.locator('.method-label').allTextContents(), expected);
      assert.deepEqual(await graph.locator('.method-step').allTextContents(), ['01','02','03','04','05','06','07','08']);
      assert.deepEqual(await graph.locator('.method-strip').evaluateAll(lists => lists.map(list => list.children.length)), [3,3,2]);
      assert.equal(await graph.locator('.method-marker').count(), 8);
      assert.equal(await graph.locator('.method-signal').count(), 7);
      assert.equal(await graph.locator('button, a, [tabindex], [aria-live]').count(), 0);
      const boxes = await graph.locator('.method-node').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        const textRects = [...node.querySelectorAll('.method-step,.method-label,.method-detail')].map(child => child.getBoundingClientRect());
        const css = getComputedStyle(node);
        const marker = node.querySelector('.method-marker').getBoundingClientRect();
        return {...rect.toJSON(), marker:marker.toJSON(), bg:css.backgroundColor, borders:[css.borderTopWidth,css.borderRightWidth,css.borderBottomWidth,css.borderLeftWidth], textFits:textRects.every(r => r.left >= rect.left && r.right <= rect.right+1 && r.bottom <= rect.bottom+1)};
      }));
      for (const box of boxes) {
        assert.ok(box.x >= 0 && box.right <= width+1, JSON.stringify(box));
        assert.deepEqual(box.borders, ['0px','0px','0px','0px']);
        assert.equal(box.bg, 'rgba(0, 0, 0, 0)');
        assert.ok(box.textFits, 'text must fit without truncation or overlap');
      }
      for (let i=1; i<boxes.length; i++) {
        if (width > 980) {
          assert.ok(Math.abs(boxes[i].marker.y-boxes[0].marker.y)<1, 'desktop markers share a baseline');
          assert.ok(boxes[i].x >= boxes[i-1].right-1);
        } else {
          assert.ok(boxes[i].y >= boxes[i-1].bottom-1);
          assert.ok(Math.abs(boxes[i].marker.x-boxes[0].marker.x)<1, 'mobile markers share a vertical axis');
        }
      }
      const endpoints = await graph.locator('.method-track').evaluateAll(tracks => tracks.map(track => {
        const rect=track.getBoundingClientRect();
        const line=getComputedStyle(track,'::before');
        return {rect:rect.toJSON(),visible:line.display!=='none',startX:rect.x+parseFloat(line.left),startY:rect.y+parseFloat(line.top),width:parseFloat(line.width),height:parseFloat(line.height)};
      }));
      for (let i=0;i<7;i++) {
        const line=endpoints[i];
        if (width<=980 && [2,5].includes(i)) { assert.equal(line.visible,false); continue; }
        assert.equal(line.visible,true);
        const next=boxes[i+1].marker;
        if (width>980) assert.ok(Math.abs(line.startX+line.width-(next.x+next.width/2))<1.5, 'rail reaches next marker');
        else assert.ok(Math.abs(line.startY+line.height-(next.y+next.height/2))<1.5, 'vertical rail reaches next marker');
      }
      assert.equal(endpoints[7].visible,false,'rail stops at Report');
      await assertMethodPlacement(page, width);
      await assertMethodPalette(page);
      assert.equal(await graph.locator('.method-node-final').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
      assert.equal(await graph.locator('.method-node-final .method-marker').evaluate(n=>getComputedStyle(n).backgroundColor),(await sitePalette(page)).ink);
      await feedbackGeometry(page,width);
      await graph.locator('.method-node-final').scrollIntoViewIfNeeded();
      assert.ok(await graph.locator('.method-node-final .method-detail').evaluate(node=>{
        const box=node.getBoundingClientRect();return node.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));
      }), 'Report text remains visible at the bottom of the workflow');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.equal(await graph.evaluate(n=>n.getAnimations({subtree:true}).length),0);
      if (javaScriptEnabled) {
        assert.equal(await page.locator('.credential-carousel-rotation').count(),0);
        assert.equal(await page.locator('.research-dropdown-trigger').count(),2);
        assert.equal(await page.locator('#contact a[href="https://x.com/Supakiad_Mee"]').count(),1);
      }
      await screenshot(page,`${width}-method-static-js-${javaScriptEnabled}.png`);
      if (javaScriptEnabled && [390,1440].includes(width)) await screenshotOverview(page, `${width}-hero-method-research.png`);
    }, {javaScriptEnabled});
  });
}

test('Option 1 signal moves between square markers across multiple iterations, including a live third cycle', async () => {
  await withPage(1440,async page=>{
    await hideMethod(page);
    await state(page,'waiting');
    const graph=page.locator(selector);
    assert.equal(await graph.evaluate(n=>n.getAnimations({subtree:true}).length),0);
    await showMethod(page);await state(page,'running');
    const before=await graph.boundingBox();
    const samples=await graph.evaluate(node=>{
      const animations=node.getAnimations({subtree:true});
      const signals=animations.filter(a=>a.animationName==='method-signal-travel');
      if(signals.length!==7) return {count:signals.length};
      const animation=signals[0];const timing=animation.effect.getTiming();animation.pause();
      const frames=[0,timing.duration].map(cycle=>{
        animation.currentTime=cycle+timing.delay+80;
        const first=animation.effect.target.getBoundingClientRect().x;
        animation.currentTime=cycle+timing.delay+480;
        return {first,second:animation.effect.target.getBoundingClientRect().x,opacity:+getComputedStyle(animation.effect.target).opacity};
      });
      animation.currentTime=0;animation.play();
      return {count:signals.length,duration:timing.duration,infinite:animations.every(a=>a.effect.getTiming().iterations===Infinity),delays:signals.map(a=>a.effect.getTiming().delay),frames};
    });
    assert.equal(samples.count,7);
    assert.equal(samples.infinite,true);
    assert.deepEqual(samples.delays,[0,600,1200,1800,2400,3000,3600]);
    samples.frames.forEach(f=>{assert.ok(f.second>f.first+5);assert.ok(f.opacity>0);});
    await page.waitForTimeout(samples.duration*2+200);
    assert.equal(await graph.getAttribute('data-flow-state'),'running');
    assert.ok(await graph.evaluate(n=>n.getAnimations({subtree:true}).some(a=>a.effect.getComputedTiming().currentIteration>=2)));
    const after=await graph.boundingBox();
    assert.ok(Math.abs(after.height-before.height)<1 && Math.abs(after.y-before.y)<1);
    await screenshot(page,'1440-method-loop.png');
  },{reducedMotion:'no-preference'});
});

test('Option 1 Report stays text-only rather than inverting a card during playback',async()=>{
  await withPage(1440,async page=>{
    await showMethod(page);await state(page,'running');
    const colors=await page.locator('.method-node-final').evaluate(node=>{
      const animations=document.querySelector('#method .method-workflow').getAnimations({subtree:true});
      return [0,4400,5600,11200].map(time=>{
        animations.forEach(a=>{a.pause();a.currentTime=time;});
        return {bg:getComputedStyle(node).backgroundColor,marker:getComputedStyle(node.querySelector('.method-marker')).backgroundColor};
      });
    });
    const palette = await sitePalette(page);
    colors.forEach(c=>assert.deepEqual(c,{bg:'rgba(0, 0, 0, 0)',marker:palette.ink}));
  },{reducedMotion:'no-preference'});
});

test('Method stops offscreen and resumes its signal on re-entry', async () => {
  await withPage(1440, async page => {
    const graph=page.locator(selector);
    await showMethod(page); await state(page,'running');
    await hideMethod(page);
    await state(page,'waiting');
    assert.equal(await graph.evaluate(n => n.getAnimations({subtree:true}).length),0);
    await showMethod(page); await state(page,'running');
    assert.equal(await graph.evaluate(n => n.getAnimations({subtree:true}).filter(a => a.animationName === 'method-signal-travel').length),7);
  }, {reducedMotion:'no-preference'});
});

test('live reduced motion stops all highlights without hiding the Report endpoint', async () => {
  await withPage(1440, async page => {
    await showMethod(page); await state(page,'running');
    await page.emulateMedia({reducedMotion:'reduce'}); await state(page,'complete');
    assert.equal(await page.locator(selector).evaluate(n => n.getAnimations({subtree:true}).length),0);
    assert.equal(await page.locator('.method-node-final .method-marker').evaluate(n => getComputedStyle(n).backgroundColor),(await sitePalette(page)).ink);
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

test('resize preserves vertical signal tracks and aligns the returning feedback path', async () => {
  await withPage(1440, async page => {
    await showMethod(page); await state(page,'running');
    await page.setViewportSize({width:390,height:900}); await showMethod(page); await state(page,'running');
    await feedbackGeometry(page,390);
    const travel=await page.locator(selector).evaluate(n=>{
      const a=n.getAnimations({subtree:true}).find(a=>a.animationName==='method-signal-down');
      if(!a)return null;
      a.pause();a.currentTime=a.effect.getTiming().delay+80;
      const first=a.effect.target.getBoundingClientRect().y;
      a.currentTime=a.effect.getTiming().delay+480;
      return {first,second:a.effect.target.getBoundingClientRect().y};
    });
    assert.ok(travel && travel.second>travel.first+5,'mobile signal travels downward');
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


test('Method labels and signals keep the shared dark colors across animation cycles', async () => {
  await withPage(1440, async page => {
    await showMethod(page);
    await state(page, 'running');
    const palette = await sitePalette(page);
    const samples = await page.locator(selector).evaluate(workflow => {
      const animations = workflow.getAnimations({ subtree: true });
      animations.forEach(animation => animation.pause());
      const sample = time => {
        animations.forEach(animation => { animation.currentTime = time; });
        return {
          label: getComputedStyle(workflow.querySelector('.method-label')).color,
          signal: getComputedStyle(workflow.querySelector('.method-signal')).backgroundColor,
          marker: getComputedStyle(workflow.querySelector('.method-marker')).backgroundColor,
        };
      };
      const duration = animations[0].effect.getTiming().duration;
      return [0, duration, duration * 2].map(cycle => ({
        active: sample(cycle + 80), resting: sample(cycle + 900),
      }));
    });
    for (const sample of samples) {
      assert.deepEqual(sample.active, { label: palette.black, signal: palette.ink, marker: palette.ink });
      assert.deepEqual(sample.resting, { label: palette.ink, signal: palette.ink, marker: palette.paper });
    }
  }, { reducedMotion: 'no-preference' });
});


for (const width of [390, 1440]) {
  test(`View Research bypasses Method and direct research anchors remain usable at ${width}px`, async () => {
    await withPage(width, async page => {
      const assertResearchVisible = async () => {
        await page.waitForFunction(() => {
          const heading = document.getElementById('research-title').getBoundingClientRect();
          const header = document.querySelector('.site-header').getBoundingClientRect();
          return location.hash === '#research' && heading.top >= header.bottom && heading.top < innerHeight / 2;
        });
        assert.equal(await page.locator('#method').count(), 1);
      };
      await page.locator('#top .hero-actions a[href="#research"]').click();
      await assertResearchVisible();
      await page.goto(`${origin}/#research`, {waitUntil: 'networkidle'});
      await assertResearchVisible();
    });
  });
}
